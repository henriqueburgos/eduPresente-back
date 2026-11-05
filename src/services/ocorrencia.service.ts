import { ForbiddenError, NotFoundError } from '../domain/errors.js';
import type { Role } from '../domain/types/roles.js';
import type { AtualizarOcorrenciaCmd, CriarOcorrenciaCmd } from '../domain/schemas/commands.js';
import type { Ocorrencia } from '../domain/types/ocorrencia.js';
import type { Aluno } from '../domain/types/entidades.js';
import { ocorrenciasRepo } from '../repositories/ocorrencias.repo.js';
import { alunosRepo } from '../repositories/alunos.repo.js';
import { usuariosRepo } from '../repositories/usuarios.repo.js';
import { auditoriaRepo } from '../repositories/auditoria.repo.js';
import { notificacaoService } from './notificacao.service.js';

export interface AtorOcorrencia {
  uid: string;
  role: Role;
  escolaId?: string;
}

const TITULO_GRAVIDADE: Record<Ocorrencia['gravidade'], string> = {
  baixa: 'Ocorrência registrada',
  media: 'Ocorrência registrada',
  alta: 'Ocorrência grave registrada',
  critica: 'Ocorrência crítica registrada',
};

function podeAcessar(paciente: Aluno, ator: AtorOcorrencia): boolean {
  if (ator.role === 'admin') return true;
  if (ator.role === 'responsavel') {
    return (
      paciente.responsavelIds.includes(ator.uid) ||
      paciente.familiarIds.includes(ator.uid) ||
      paciente.professorIds.includes(ator.uid)
    );
  }
  if (ator.role === 'professor') return paciente.professorIds.includes(ator.uid);
  return false;
}

async function pacientePermitido(alunoId: string, ator: AtorOcorrencia): Promise<Aluno> {
  const paciente = await alunosRepo.findById(alunoId);
  if (!paciente) throw new NotFoundError('Aluno não encontrado');
  if (!podeAcessar(paciente, ator)) {
    throw new ForbiddenError('Aluno não vinculado ao usuário');
  }
  return paciente;
}

async function nomeDoAtor(uid: string): Promise<string> {
  const u = await usuariosRepo.findById(uid);
  return u?.nome ?? uid;
}

export const ocorrenciaService = {
  async listar(ator: AtorOcorrencia, alunoId?: string): Promise<Ocorrencia[]> {
    if (alunoId) {
      await pacientePermitido(alunoId, ator);
      return ocorrenciasRepo.listByAluno(alunoId);
    }
    if (ator.role === 'admin') return ocorrenciasRepo.listAll();
    const meus = await alunosRepo.listByUsuario(ator.uid);
    return ocorrenciasRepo.listByAlunos(meus.map((p) => p.id));
  },

  async criar(cmd: CriarOcorrenciaCmd, ator: AtorOcorrencia): Promise<Ocorrencia> {
    const paciente = await pacientePermitido(cmd.alunoId, ator);
    const ocorrencia = await ocorrenciasRepo.create({
      alunoId: cmd.alunoId,
      titulo: cmd.titulo,
      descricao: cmd.descricao,
      gravidade: cmd.gravidade,
      status: 'aberta',
      registradoPor: ator.uid,
      registradoPorNome: await nomeDoAtor(ator.uid),
    });

    await auditoriaRepo.create({
      ator: ator.uid,
      acao: 'criar_ocorrencia',
      alvo: `${cmd.alunoId}/${ocorrencia.id}`,
      nivel: cmd.gravidade === 'critica' || cmd.gravidade === 'alta' ? 'critico' : 'alerta',
    });

    const destinatarios = [
      ...new Set([...paciente.responsavelIds, ...paciente.familiarIds]),
    ].filter((uid) => uid !== ator.uid);

    if (destinatarios.length > 0) {
      const grave = cmd.gravidade === 'alta' || cmd.gravidade === 'critica';
      void notificacaoService
        .enviarParaUids(destinatarios, {
          title: TITULO_GRAVIDADE[cmd.gravidade],
          body: `${paciente.nome}: ${cmd.titulo}`.slice(0, 180),
          tag: `ocorrencia-${ocorrencia.id}`,
          renotify: true,
          requireInteraction: grave,
          ...(grave ? { vibrate: [300, 100, 300, 100, 300] } : {}),
          data: {
            alunoId: cmd.alunoId,
            ocorrenciaId: ocorrencia.id,
            tipo: 'ocorrencia',
            tag: `ocorrencia-${ocorrencia.id}`,
            url: '/responsavel/ocorrencias',
          },
          link: '/responsavel/ocorrencias',
        })
        .catch((erro) => console.error('[ocorrencia] falha ao notificar família.', erro));
    }

    return ocorrencia;
  },

  async atualizar(
    id: string,
    cmd: AtualizarOcorrenciaCmd,
    ator: AtorOcorrencia,
  ): Promise<Ocorrencia> {
    const ocorrencia = await ocorrenciasRepo.findById(id);
    if (!ocorrencia) throw new NotFoundError('Ocorrência não encontrada');
    const paciente = await pacientePermitido(ocorrencia.alunoId, ator);

    const patch: Record<string, unknown> = {};
    if (cmd.titulo !== undefined) patch['titulo'] = cmd.titulo;
    if (cmd.descricao !== undefined) patch['descricao'] = cmd.descricao;
    if (cmd.gravidade !== undefined) patch['gravidade'] = cmd.gravidade;
    if (cmd.status !== undefined) {
      patch['status'] = cmd.status;
      if (cmd.status === 'resolvida') patch['resolvidoEm'] = new Date().toISOString();
    }
    if (cmd.resolucao !== undefined) {
      patch['resolucao'] = cmd.resolucao ? cmd.resolucao : null;
    }

    const updated = await ocorrenciasRepo.update(id, patch);
    if (!updated) throw new NotFoundError('Ocorrência não encontrada');

    await auditoriaRepo.create({
      ator: ator.uid,
      acao: 'atualizar_ocorrencia',
      alvo: `${ocorrencia.alunoId}/${id}`,
      nivel: updated.status === 'resolvida' ? 'info' : 'alerta',
    });

    if (cmd.status !== undefined && cmd.status !== ocorrencia.status) {
      const destinatarios = [
        ...new Set([...paciente.responsavelIds, ...paciente.familiarIds]),
      ].filter((uid) => uid !== ator.uid);
      if (destinatarios.length > 0) {
        void notificacaoService
          .enviarParaUids(destinatarios, {
            title: updated.status === 'resolvida' ? 'Ocorrência resolvida' : 'Ocorrência atualizada',
            body: `${paciente.nome}: ${updated.titulo}`,
            tag: `ocorrencia-${id}`,
            renotify: true,
            data: {
              alunoId: ocorrencia.alunoId,
              ocorrenciaId: id,
              tipo: 'ocorrencia',
              tag: `ocorrencia-${id}`,
              url: '/responsavel/ocorrencias',
            },
            link: '/responsavel/ocorrencias',
          })
          .catch((erro) => console.error('[ocorrencia] falha ao notificar atualização.', erro));
      }
    }

    return updated;
  },
};
