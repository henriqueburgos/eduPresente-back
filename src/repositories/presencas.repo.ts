import { db, nowIso } from './base.js';
import type { Presenca, StatusPresenca } from '../domain/types/entidades.js';

const COL = 'presencas';

function toPresenca(id: string, data: FirebaseFirestore.DocumentData): Presenca {
  return {
    id,
    escolaId: String(data.escolaId ?? ''),
    alunoId: String(data.alunoId ?? ''),
    turmaId: String(data.turmaId ?? ''),
    data: String(data.data ?? ''),
    status: (data.status as StatusPresenca) ?? 'presente',
    justificativa: data.justificativa ? String(data.justificativa) : undefined,
    autorUid: String(data.autorUid ?? ''),
    criadoEm: String(data.criadoEm ?? nowIso()),
  };
}

export const presencasRepo = {
  async findById(id: string): Promise<Presenca | null> {
    const doc = await db.collection(COL).doc(id).get();
    if (!doc.exists) return null;
    return toPresenca(doc.id, doc.data()!);
  },
  async listByTurmaDia(turmaId: string, data: string): Promise<Presenca[]> {
    const snap = await db.collection(COL).where('turmaId', '==', turmaId).where('data', '==', data).get();
    return snap.docs.map((d) => toPresenca(d.id, d.data()));
  },
  async listByAluno(alunoId: string): Promise<Presenca[]> {
    const snap = await db.collection(COL).where('alunoId', '==', alunoId).get();
    return snap.docs.map((d) => toPresenca(d.id, d.data())).sort((a, b) => b.data.localeCompare(a.data));
  },
  async create(data: Omit<Presenca, 'id' | 'criadoEm'> & { id?: string }): Promise<Presenca> {
    const id = data.id ?? db.collection(COL).doc().id;
    const item: Presenca = { id, ...data, criadoEm: nowIso() };
    await db.collection(COL).doc(id).set(item);
    return item;
  },
  async update(id: string, patch: Partial<Presenca>): Promise<Presenca | null> {
    const ref = db.collection(COL).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    await ref.update(patch);
    const updated = await ref.get();
    return toPresenca(updated.id, updated.data()!);
  },
};
