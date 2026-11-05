import { db, nowIso } from './base.js';
import type { Ocorrencia } from '../domain/types/ocorrencia.js';
import { OcorrenciaSchema } from '../domain/schemas/entidades.js';

const COL = 'ocorrencias';

function toOcorrencia(id: string, data: FirebaseFirestore.DocumentData): Ocorrencia {
  return OcorrenciaSchema.parse({ id, ...data });
}

function ordenar(list: Ocorrencia[]): Ocorrencia[] {
  return list.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

export const ocorrenciasRepo = {
  async create(data: Omit<Ocorrencia, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<Ocorrencia> {
    const ref = db.collection(COL).doc();
    const agora = nowIso();
    const ocorrencia: Ocorrencia = { id: ref.id, ...data, criadoEm: agora, atualizadoEm: agora };
    await ref.set(ocorrencia);
    return ocorrencia;
  },

  async findById(id: string): Promise<Ocorrencia | null> {
    const doc = await db.collection(COL).doc(id).get();
    if (!doc.exists) return null;
    return toOcorrencia(doc.id, doc.data()!);
  },

  async listByPaciente(pacienteId: string): Promise<Ocorrencia[]> {
    const snap = await db.collection(COL).where('pacienteId', '==', pacienteId).get();
    return ordenar(snap.docs.map((d) => toOcorrencia(d.id, d.data())));
  },

  async listByPacientes(pacienteIds: string[]): Promise<Ocorrencia[]> {
    if (pacienteIds.length === 0) return [];
    const lotes: string[][] = [];
    for (let i = 0; i < pacienteIds.length; i += 30) lotes.push(pacienteIds.slice(i, i + 30));
    const snaps = await Promise.all(
      lotes.map((lote) => db.collection(COL).where('pacienteId', 'in', lote).get()),
    );
    const mapa = new Map<string, Ocorrencia>();
    for (const snap of snaps) for (const d of snap.docs) mapa.set(d.id, toOcorrencia(d.id, d.data()));
    return ordenar([...mapa.values()]);
  },

  async listAll(): Promise<Ocorrencia[]> {
    const snap = await db.collection(COL).get();
    return ordenar(snap.docs.map((d) => toOcorrencia(d.id, d.data())));
  },

  async update(id: string, patch: Record<string, unknown>): Promise<Ocorrencia | null> {
    const ref = db.collection(COL).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    await ref.update({ ...patch, atualizadoEm: nowIso() });
    const updated = await ref.get();
    return toOcorrencia(updated.id, updated.data()!);
  },

  async removeByPaciente(pacienteId: string): Promise<void> {
    const snap = await db.collection(COL).where('pacienteId', '==', pacienteId).get();
    if (snap.empty) return;
    const lote = db.batch();
    for (const doc of snap.docs) lote.delete(doc.ref);
    await lote.commit();
  },
};
