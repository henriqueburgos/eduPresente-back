import { ForbiddenError, NotFoundError } from '../domain/errors.js';
import type { Role } from '../domain/types/roles.js';
import { turmasRepo } from '../repositories/turmas.repo.js';
import { auditoriaRepo } from '../repositories/auditoria.repo.js';

export interface AtorTurma {
  uid: string;
  role: Role;
  escolaId?: string;
}

export const turmaService = {
  async listar(ator: AtorTurma): Promise<ReturnType<typeof turmasRepo.listByEscola> extends Promise<infer T> ? T : never> {
    if (ator.role === 'admin') {
      if (!ator.escolaId) return [];
      return turmasRepo.listByEscola(ator.escolaId);
    }
    if (ator.role === 'professor') return turmasRepo.listByProfessor(ator.uid);
    throw new ForbiddenError('Perfil sem permissao para listar turmas');
  },
  async buscar(id: string, ator: AtorTurma) {
    const t = await turmasRepo.findById(id);
    if (!t) throw new NotFoundError('Turma nao encontrada');
    if (ator.role !== 'admin' && !t.professorIds.includes(ator.uid)) throw new ForbiddenError('Turma nao vinculada');
    return t;
  },
  async criar(cmd: { escolaId: string; nome: string; serie: string; segmento: string; anoLetivo: string; turno: string; professorIds?: string[] }, ator: AtorTurma) {
    if (ator.role !== 'admin') throw new ForbiddenError('Apenas admin pode criar turma');
    const t = await turmasRepo.create({
      escolaId: cmd.escolaId,
      nome: cmd.nome,
      serie: cmd.serie,
      segmento: cmd.segmento,
      anoLetivo: cmd.anoLetivo,
      turno: cmd.turno,
      professorIds: cmd.professorIds ?? [],
      alunoIds: [],
    });
    await auditoriaRepo.create({ ator: ator.uid, acao: 'criar_turma', alvo: t.id, nivel: 'info' });
    return t;
  },
  async atualizar(id: string, patch: Partial<{ nome: string; serie: string; segmento: string; anoLetivo: string; turno: string; professorIds: string[] }>, ator: AtorTurma) {
    if (ator.role !== 'admin') throw new ForbiddenError('Apenas admin pode editar turma');
    const t = await turmasRepo.update(id, patch);
    if (!t) throw new NotFoundError('Turma nao encontrada');
    return t;
  },
  async remover(id: string, ator: AtorTurma) {
    if (ator.role !== 'admin') throw new ForbiddenError('Apenas admin pode remover turma');
    const ok = await turmasRepo.delete(id);
    if (!ok) throw new NotFoundError('Turma nao encontrada');
    return { ok: true };
  },
};
