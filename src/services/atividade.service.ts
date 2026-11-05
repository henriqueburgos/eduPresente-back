import { NotFoundError, ForbiddenError } from '../domain/errors.js';
import type { Role } from '../domain/types/roles.js';
import type { ConsumoEstoqueCmd, RegistrarAtividadeCmd } from '../domain/schemas/commands.js';
import type { Atividade } from '../domain/types/entidades.js';
import type { TipoAtividade } from '../domain/types/tipos-atividade.js';
import { atividadesRepo } from '../repositories/atividades.repo.js';
import { alunosRepo } from '../repositories/alunos.repo.js';
import { auditoriaRepo } from '../repositories/auditoria.repo.js';
import { estoqueService } from './estoque.service.js';
import { notificacaoService } from './notificacao.service.js';

export interface AtorInfo {
  uid: string;
  nome: string;
  role: Role;
  escolaId?: string;
}

const TITULO_POR_TIPO: Record<TipoAtividade, string> = {
  alimentacao: 'Nova atualização de alimentação',
  medicacao: 'Nova atualização de medicação',
  higiene: 'Nova atualização de higiene',
  humor: 'Nova atualização de humor',
  ocorrencia: 'Ocorrência registrada',
};

export const atividadeService = {
  async registrar(cmd: RegistrarAtividadeCmd, ator: AtorInfo) {
    const paciente = await alunosRepo.findById(cmd.alunoId);
    if (!paciente) throw new NotFoundError('Aluno não encontrado');

    // Idempotência para registros enviados pela fila offline.
    if (cmd.clientRequestId) {
      const existente = await atividadesRepo.findByClientRequestId(ator.uid, cmd.clientRequestId);
      if (existente) return existente;
    }

    // guard: cuidador/responsavel só registra para pacientes vinculados
    if (ator.role !== 'admin') {
      let vinculado = false;
      if (ator.role === 'professor') vinculado = paciente.professorIds.includes(ator.uid);
      else if (ator.role === 'responsavel') vinculado = paciente.responsavelIds.includes(ator.uid);
      else if (ator.role === 'responsavel') {
        vinculado =
          paciente.familiarIds.includes(ator.uid) ||
          paciente.professorIds.includes(ator.uid) ||
          paciente.responsavelIds.includes(ator.uid);
      }
      if (!vinculado) throw new ForbiddenError('Aluno não vinculado ao usuário');
    }

    // Consome os materiais do estoque antes de gravar o registro. Se algo
    // falhar (saldo, vínculo ou gravação), devolve ao estoque o que já saiu.
    const consumidos: Array<{
      materialId: string;
      nome: string;
      quantidade: number;
      unidade: string;
    }> = [];
    const aplicados: ConsumoEstoqueCmd[] = [];

    const reverterEstoque = async (): Promise<void> => {
      await Promise.allSettled(
        aplicados.map((consumo) =>
          estoqueService.movimentar(
            consumo.materialId,
            { tipo: 'entrada', quantidade: consumo.quantidade },
            ator,
          ),
        ),
      );
    };

    let atividade: Atividade;

    try {
      for (const consumo of cmd.consumos ?? []) {
        const material = await estoqueService.buscarPorId(consumo.materialId, ator);
        if (material.alunoId !== cmd.alunoId) {
          throw new ForbiddenError('Material de estoque de outro paciente');
        }

        await estoqueService.movimentar(
          consumo.materialId,
          { tipo: 'saida', quantidade: consumo.quantidade },
          ator,
        );

        aplicados.push(consumo);
        consumidos.push({
          materialId: material.id,
          nome: material.nome,
          quantidade: consumo.quantidade,
          unidade: material.unidade,
        });
      }

      atividade = await atividadesRepo.create({
        ...(ator.escolaId ? { escolaId: ator.escolaId } : {}),
        alunoId: cmd.alunoId,
        tipo: cmd.tipo,
        descricao: cmd.descricao,
        autorUid: ator.uid,
        autorNome: ator.nome,
        ...(cmd.meta || consumidos.length > 0
          ? {
              meta: {
                ...cmd.meta,
                ...(consumidos.length > 0 ? { estoque: consumidos } : {}),
              },
            }
          : {}),
        ...(cmd.clientRequestId ? { clientRequestId: cmd.clientRequestId } : {}),
      });
    } catch (erro) {
      await reverterEstoque();
      throw erro;
    }

    await auditoriaRepo.create({
      ator: ator.uid,
      acao: 'registrar_atividade',
      alvo: `${cmd.alunoId}/${atividade.id}`,
      nivel: cmd.tipo === 'ocorrencia' ? 'alerta' : 'info',
    });

    // Notifica responsáveis e familiares vinculados ao paciente (exceto o autor).
    const destinatarios = [
      ...new Set([...paciente.responsavelIds, ...paciente.familiarIds]),
    ].filter((uid) => uid !== ator.uid);

    if (destinatarios.length > 0) {
      const ocorrencia = cmd.tipo === 'ocorrencia';
      void notificacaoService
        .enviarParaUids(destinatarios, {
          title: TITULO_POR_TIPO[cmd.tipo],
          body: `${paciente.nome}: ${atividade.descricao}`.slice(0, 180),
          image: `/icons/notif-${cmd.tipo}.png`,
          // Tag única por registro: cada novo cuidado aparece como uma
          // notificação separada, em vez de substituir a anterior do mesmo tipo.
          tag: `atividade-${atividade.id}`,
          renotify: true,
          requireInteraction: ocorrencia,
          ...(ocorrencia
            ? {
                vibrate: [300, 100, 300, 100, 300],
                actions: [
                  { action: 'abrir', title: 'Ver ocorrência' },
                  { action: 'fechar', title: 'Dispensar' },
                ],
              }
            : { actions: [{ action: 'abrir', title: 'Ver registros' }] }),
          data: {
            alunoId: cmd.alunoId,
            atividadeId: atividade.id,
            tipo: cmd.tipo,
            tag: `atividade-${atividade.id}`,
            url: '/responsavel/registros',
          },
          link: '/responsavel/registros',
        })
        .catch((erro) => {
          console.error('[notificacao] falha ao notificar familiares/responsáveis.', erro);
        });
    }

    return atividade;
  },
};