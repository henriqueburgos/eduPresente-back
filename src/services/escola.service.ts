import { ForbiddenError, NotFoundError } from '../domain/errors.js';
import type { Role } from '../domain/types/roles.js';
import { escolasRepo } from '../repositories/escolas.repo.js';
import { auditoriaRepo } from '../repositories/auditoria.repo.js';

export interface AtorEscola {
  uid: string;
  role: Role;
}

export const escolaService = {
  async listar() {
    return escolasRepo.list();
  },
  async buscar(idOrSlug: string) {
    const byId = await escolasRepo.findById(idOrSlug);
    if (byId) return byId;
    const bySlug = await escolasRepo.findBySlug(idOrSlug);
    if (bySlug) return bySlug;
    throw new NotFoundError('Escola nao encontrada');
  },
  async criar(cmd: { nome: string; slug: string; segmentos?: string[]; endereco?: string }, ator: AtorEscola) {
    if (ator.role !== 'admin') throw new ForbiddenError('Apenas admin pode criar escola');
    const e = await escolasRepo.create({ nome: cmd.nome, slug: cmd.slug, segmentos: cmd.segmentos ?? [], endereco: cmd.endereco, ativo: true });
    await auditoriaRepo.create({ ator: ator.uid, acao: 'criar_escola', alvo: e.id, nivel: 'info' });
    return e;
  },
  async atualizar(id: string, patch: Partial<{ nome: string; slug: string; segmentos: string[]; endereco: string; ativo: boolean; branding: Record<string, unknown> }>, ator: AtorEscola) {
    if (ator.role !== 'admin') throw new ForbiddenError('Apenas admin pode editar escola');
    const e = await escolasRepo.update(id, patch);
    if (!e) throw new NotFoundError('Escola nao encontrada');
    return e;
  },
};
