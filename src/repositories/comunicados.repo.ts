import { db, nowIso } from './base.js';
import type { Comunicado } from '../domain/types/entidades.js';
import { ComunicadoSchema } from '../domain/schemas/entidades.js';

const COL = 'comunicados';

function toComunicado(id: string, data: FirebaseFirestore.DocumentData): Comunicado {
  return ComunicadoSchema.parse({ id, ...data });
}

export const comunicadosRepo = {
  async list(escolaId?: string): Promise<Comunicado[]> {
    let q: FirebaseFirestore.Query = db.collection(COL).orderBy('criadoEm', 'desc');
    if (escolaId) q = q.where('escolaId', '==', escolaId);
    const snap = await q.get();
    return snap.docs.map((d) => toComunicado(d.id, d.data()));
  },

  async create(data: Omit<Comunicado, 'id' | 'criadoEm'> & { id?: string; criadoEm?: string }): Promise<Comunicado> {
    const ref = db.collection(COL).doc();
    const item: Comunicado = {
      id: data.id ?? ref.id,
      titulo: data.titulo,
      corpo: data.corpo,
      autor: data.autor,
      criadoEm: data.criadoEm ?? nowIso(),
      fixado: data.fixado ?? false,
    };
    await ref.set(item);
    return item;
  },
};