import { ForbiddenError, NotFoundError } from '../domain/errors.js';
import type { Role } from '../domain/types/roles.js';
import { presencasRepo } from '../repositories/presencas.repo.js';
import { alunosRepo } from '../repositories/alunos.repo.js';
import { auditoriaRepo } from '../repositories/auditoria.repo.js';

export interface AtorPresenca {
  uid: string;
  role: Role;
  escolaId?: string;
}

export const presencaService = {
  async listarPorTurmaDia(turmaId: string, data: string, ator: AtorPresenca) {
    if (ator.role !== 'admin' && ator.role !== 'professor') throw new ForbiddenError('Sem permissao');
    return presencasRepo.listByTurmaDia(turmaId, data);
  },
  async listarPorAluno(alunoId: string, ator: AtorPresenca) {
    if (ator.role !== 'admin' && ator.role !== 'professor' && ator.role !== 'responsavel') throw new ForbiddenError('Sem permissao');
    return presencasRepo.listByAluno(alunoId);
  },
  async registrar(cmd: { escolaId: string; alunoId: string; turmaId: string; data: string; status: 'presente' | 'falta' | 'atraso' | 'saida_antecipada'; justificativa?: string }, ator: AtorPresenca) {
    if (ator.role !== 'admin' && ator.role !== 'professor') throw new ForbiddenError('Sem permissao');
    const aluno = await alunosRepo.findById(cmd.alunoId);
    if (!aluno) throw new NotFoundError('Aluno nao encontrado');
    const p = await presencasRepo.create({
      escolaId: cmd.escolaId,
      alunoId: cmd.alunoId,
      turmaId: cmd.turmaId,
      data: cmd.data,
      status: cmd.status,
      justificativa: cmd.justificativa,
      autorUid: ator.uid,
    });
    await auditoriaRepo.create({ ator: ator.uid, acao: 'registrar_presenca', alvo: `${cmd.alunoId}/${cmd.data}`, nivel: 'info' });
    return p;
  },
};
