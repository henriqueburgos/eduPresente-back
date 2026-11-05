import { db, nowIso } from './base.js';
import type { Auditoria } from '../domain/types/entidades.js';
import type { NivelAuditoria } from '../domain/types/tipos-atividade.js';
import { AuditoriaSchema } from '../domain/schemas/entidades.js';

const COL = 'auditoria';

function toAuditoria(id: string, data: FirebaseFirestore.DocumentData): Auditoria {
  return AuditoriaSchema.parse({ id, ...data });
}

export const auditoriaRepo = {
  async list(nivel?: NivelAuditoria): Promise<Auditoria[]> {
    let q: FirebaseFirestore.Query = db.collection(COL).orderBy('criadoEm', 'desc');
    if (nivel) q = q.where('nivel', '==', nivel);
    const snap = await q.limit(500).get();
    return snap.docs.map((d) => toAuditoria(d.id, d.data()));
  },

  async create(data: Omit<Auditoria, 'id' | 'criadoEm'> & { id?: string; criadoEm?: string }): Promise<Auditoria> {
    const ref = db.collection(COL).doc();
    const item: Auditoria = {
      id: data.id ?? ref.id,
      ator: data.ator,
      acao: data.acao,
      alvo: data.alvo,
      nivel: data.nivel,
      criadoEm: data.criadoEm ?? nowIso(),
    };
    await ref.set(item);
    return item;
  },
};