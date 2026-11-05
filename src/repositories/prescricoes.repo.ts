import { db, nowIso } from './base.js';
import type { Prescricao } from '../domain/types/medicacao.js';
import { PrescricaoSchema } from '../domain/schemas/entidades.js';

const COL = 'prescricoes';

function toPrescricao(id: string, data: FirebaseFirestore.DocumentData): Prescricao {
  return PrescricaoSchema.parse({ id, ...data });
}

function ordenar(list: Prescricao[]): Prescricao[] {
  return list.sort((a, b) => a.medicamento.localeCompare(b.medicamento, 'pt-BR'));
}

export const prescricoesRepo = {
  async create(data: Omit<Prescricao, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<Prescricao> {
    const ref = db.collection(COL).doc();
    const agora = nowIso();
    const prescricao: Prescricao = { id: ref.id, ...data, criadoEm: agora, atualizadoEm: agora };
    await ref.set(prescricao);
    return prescricao;
  },

  async findById(id: string): Promise<Prescricao | null> {
    const doc = await db.collection(COL).doc(id).get();
    if (!doc.exists) return null;
    return toPrescricao(doc.id, doc.data()!);
  },

  async listByPaciente(pacienteId: string): Promise<Prescricao[]> {
    const snap = await db.collection(COL).where('pacienteId', '==', pacienteId).get();
    return ordenar(snap.docs.map((d) => toPrescricao(d.id, d.data())));
  },

  async listByPacientes(pacienteIds: string[]): Promise<Prescricao[]> {
    if (pacienteIds.length === 0) return [];
    const lotes: string[][] = [];
    for (let i = 0; i < pacienteIds.length; i += 30) lotes.push(pacienteIds.slice(i, i + 30));
    const snaps = await Promise.all(
      lotes.map((lote) => db.collection(COL).where('pacienteId', 'in', lote).get()),
    );
    const mapa = new Map<string, Prescricao>();
    for (const snap of snaps) for (const d of snap.docs) mapa.set(d.id, toPrescricao(d.id, d.data()));
    return ordenar([...mapa.values()]);
  },

  async listAtivas(): Promise<Prescricao[]> {
    const snap = await db.collection(COL).where('ativo', '==', true).get();
    return ordenar(snap.docs.map((d) => toPrescricao(d.id, d.data())));
  },

  async update(id: string, patch: Record<string, unknown>): Promise<Prescricao | null> {
    const ref = db.collection(COL).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    await ref.update({ ...patch, atualizadoEm: nowIso() });
    const updated = await ref.get();
    return toPrescricao(updated.id, updated.data()!);
  },

  async remove(id: string): Promise<void> {
    await db.collection(COL).doc(id).delete();
  },

  async removeByPaciente(pacienteId: string): Promise<void> {
    const snap = await db.collection(COL).where('pacienteId', '==', pacienteId).get();
    if (snap.empty) return;
    const lote = db.batch();
    for (const doc of snap.docs) lote.delete(doc.ref);
    await lote.commit();
  },
};
