import { FieldValue } from 'firebase-admin/firestore';

import { ConflictError, ForbiddenError, NotFoundError } from '../domain/errors.js';
import { calcularNovaQuantidade, podeAcessarAluno } from '../domain/regras-estoque.js';
import type { AtorEstoque } from '../domain/regras-estoque.js';
import type { AtualizarMaterialCmd, CriarMaterialCmd, MovimentarEstoqueCmd } from '../domain/schemas/commands.js';
import type { MaterialEstoque, Aluno } from '../domain/types/entidades.js';
import { auditoriaRepo } from '../repositories/auditoria.repo.js';
import { estoqueRepo } from '../repositories/estoque.repo.js';
import { alunosRepo } from '../repositories/alunos.repo.js';
import { notificacaoService } from './notificacao.service.js';

function notificarMinimo(paciente: Aluno, material: MaterialEstoque): void {
  const uids = [
    ...new Set([...paciente.responsavelIds, ...paciente.familiarIds, ...paciente.professorIds]),
  ];
  if (uids.length === 0) return;

  void Promise.allSettled(
    uids.map((uid) =>
      notificacaoService.enviar({
        uid,
        title: 'Estoque no mínimo',
        body: `${material.nome}: ${material.quantidade} ${material.unidade} (mínimo ${material.quantidadeMinima}).`,
        data: { alunoId: material.alunoId, materialId: material.id },
      }),
    ),
  );
}

export const estoqueService = {
  async criar(cmd: CriarMaterialCmd, ator: AtorEstoque): Promise<MaterialEstoque> {
    const paciente = await alunosRepo.findById(cmd.alunoId);
    if (!paciente) throw new NotFoundError('Aluno não encontrado');
    if (!podeAcessarAluno(paciente, ator)) {
      throw new ForbiddenError('Aluno não vinculado ao usuário');
    }

    const material = await estoqueRepo.create({
      alunoId: cmd.alunoId,
      nome: cmd.nome,
      categoria: cmd.categoria,
      quantidade: cmd.quantidade,
      unidade: cmd.unidade,
      quantidadeMinima: cmd.quantidadeMinima,
      ...(cmd.validade ? { validade: cmd.validade } : {}),
      ...(cmd.observacao ? { observacao: cmd.observacao } : {}),
    });

    await auditoriaRepo.create({
      ator: ator.uid,
      acao: 'criar_material',
      alvo: `${material.alunoId}/${material.id}`,
      nivel: 'info',
    });

    return material;
  },

  async listar(ator: AtorEstoque, alunoId?: string): Promise<MaterialEstoque[]> {
    if (ator.role !== 'admin' && ator.role !== 'responsavel') {
      throw new ForbiddenError('Perfil sem permissão para acessar o estoque');
    }

    if (ator.role === 'admin') {
      return alunoId ? estoqueRepo.listByAluno(alunoId) : estoqueRepo.listAll();
    }

    if (alunoId) {
      const paciente = await alunosRepo.findById(alunoId);
      if (!paciente) throw new NotFoundError('Aluno não encontrado');
      if (!podeAcessarAluno(paciente, ator)) {
        throw new ForbiddenError('Aluno não vinculado ao usuário');
      }
      return estoqueRepo.listByAluno(alunoId);
    }

    const meus = await alunosRepo.listByUsuario(ator.uid);
    const permitidos = meus.filter((p) => podeAcessarAluno(p, ator));
    return estoqueRepo.listByAlunos(permitidos.map((p) => p.id));
  },

  async buscarPorId(id: string, ator: AtorEstoque): Promise<MaterialEstoque> {
    const material = await estoqueRepo.findById(id);
    if (!material) throw new NotFoundError('Material não encontrado');

    if (ator.role !== 'admin') {
      const paciente = await alunosRepo.findById(material.alunoId);
      if (!paciente) throw new NotFoundError('Aluno não encontrado');
      if (!podeAcessarAluno(paciente, ator)) {
        throw new ForbiddenError('Aluno não vinculado ao usuário');
      }
    }

    return material;
  },

  async atualizar(id: string, cmd: AtualizarMaterialCmd, ator: AtorEstoque): Promise<MaterialEstoque> {
    const material = await this.buscarPorId(id, ator);

    if (cmd.alunoId !== undefined && cmd.alunoId !== material.alunoId) {
      const novoAluno = await alunosRepo.findById(cmd.alunoId);
      if (!novoAluno) throw new NotFoundError('Aluno não encontrado');
      if (!podeAcessarAluno(novoAluno, ator)) {
        throw new ForbiddenError('Aluno não vinculado ao usuário');
      }
    }

    const patch: Record<string, unknown> = {};
    if (cmd.alunoId !== undefined) patch.alunoId = cmd.alunoId;
    if (cmd.nome !== undefined) patch.nome = cmd.nome;
    if (cmd.categoria !== undefined) patch.categoria = cmd.categoria;
    if (cmd.quantidade !== undefined) patch.quantidade = cmd.quantidade;
    if (cmd.unidade !== undefined) patch.unidade = cmd.unidade;
    if (cmd.quantidadeMinima !== undefined) patch.quantidadeMinima = cmd.quantidadeMinima;
    if (cmd.validade !== undefined) {
      patch.validade = cmd.validade === null || cmd.validade === '' ? FieldValue.delete() : cmd.validade;
    }
    if (cmd.observacao !== undefined) {
      patch.observacao =
        cmd.observacao === null || cmd.observacao === '' ? FieldValue.delete() : cmd.observacao;
    }

    const updated = await estoqueRepo.update(id, patch);
    if (!updated) throw new NotFoundError('Material não encontrado');

    await auditoriaRepo.create({
      ator: ator.uid,
      acao: 'atualizar_material',
      alvo: `${updated.alunoId}/${id}`,
      nivel: 'info',
    });

    return updated;
  },

  async movimentar(id: string, cmd: MovimentarEstoqueCmd, ator: AtorEstoque): Promise<MaterialEstoque> {
    const material = await this.buscarPorId(id, ator);

    // valida saldo antes da transação (a transação revalida para evitar corrida)
    calcularNovaQuantidade(material.quantidade, cmd.tipo, cmd.quantidade);

    const delta = cmd.tipo === 'entrada' ? cmd.quantidade : -cmd.quantidade;
    const resultado = await estoqueRepo.movimentar(id, delta);
    if (!resultado.material) throw new NotFoundError('Material não encontrado');
    if (resultado.insuficiente) throw new ConflictError('Estoque insuficiente para a saída');

    const atualizado = resultado.material;
    const paciente = await alunosRepo.findById(atualizado.alunoId);
    const cruzouMinimo =
      material.quantidade > material.quantidadeMinima &&
      atualizado.quantidade <= atualizado.quantidadeMinima;
    if (paciente && cruzouMinimo) notificarMinimo(paciente, atualizado);

    await auditoriaRepo.create({
      ator: ator.uid,
      acao: 'movimentar_estoque',
      alvo: `${atualizado.alunoId}/${id}`,
      nivel: atualizado.quantidade <= atualizado.quantidadeMinima ? 'alerta' : 'info',
    });

    return atualizado;
  },

  async remover(id: string, ator: AtorEstoque): Promise<{ id: string; deletado: true }> {
    const material = await this.buscarPorId(id, ator);
    await estoqueRepo.remove(id);

    await auditoriaRepo.create({
      ator: ator.uid,
      acao: 'remover_material',
      alvo: `${material.alunoId}/${id}`,
      nivel: 'alerta',
    });

    return { id, deletado: true };
  },
};
