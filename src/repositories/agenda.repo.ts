import { db, nowIso } from './base.js';
import type { ItemAgenda } from '../domain/types/agenda.js';
import { ItemAgendaSchema } from '../domain/schemas/entidades.js';

const COL = 'agenda';

function toItem(id: string, data: FirebaseFirestore.DocumentData): ItemAgenda {
  return ItemAgendaSchema.parse({ id, ...data });
}

function ordenar(list: ItemAgenda[]): ItemAgenda[] {
  return list.sort((a, b) => a.horario.localeCompare(b.horario) || a.titulo.localeCompare(b.titulo, 'pt-BR'));
}

export const agendaRepo = {
  async create(data: Omit<ItemAgenda, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<ItemAgenda> {
    const ref = db.collection(COL).doc();
    const agora = nowIso();
    const item: ItemAgenda = { id: ref.id, ...data, criadoEm: agora, atualizadoEm: agora };
    await ref.set(item);
    return item;
  },

  async findById(id: string): Promise<ItemAgenda | null> {
    const doc = await db.collection(COL).doc(id).get();
    if (!doc.exists) return null;
    return toItem(doc.id, doc.data()!);
  },

  async listByPaciente(pacienteId: string): Promise<ItemAgenda[]> {
    const snap = await db.collection(COL).where('pacienteId', '==', pacienteId).get();
    return ordenar(snap.docs.map((d) => toItem(d.id, d.data())));
  },

  async listByPacientes(pacienteIds: string[]): Promise<ItemAgenda[]> {
    if (pacienteIds.length === 0) return [];
    const lotes: string[][] = [];
    for (let i = 0; i < pacienteIds.length; i += 30) lotes.push(pacienteIds.slice(i, i + 30));
    const snaps = await Promise.all(
      lotes.map((lote) => db.collection(COL).where('pacienteId', 'in', lote).get()),
    );
    const mapa = new Map<string, ItemAgenda>();
    for (const snap of snaps) for (const d of snap.docs) mapa.set(d.id, toItem(d.id, d.data()));
    return ordenar([...mapa.values()]);
  },

  async listAll(): Promise<ItemAgenda[]> {
    const snap = await db.collection(COL).get();
    return ordenar(snap.docs.map((d) => toItem(d.id, d.data())));
  },

  async listPorDia(diaSemana: number): Promise<ItemAgenda[]> {
    const snap = await db
      .collection(COL)
      .where('diasSemana', 'array-contains', diaSemana)
      .get();
    return snap.docs
      .map((d) => toItem(d.id, d.data()))
      .filter((i) => i.categoria === 'lembrete' && i.ativo);
  },

  async update(id: string, patch: Record<string, unknown>): Promise<ItemAgenda | null> {
    const ref = db.collection(COL).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    await ref.update({ ...patch, atualizadoEm: nowIso() });
    const updated = await ref.get();
    return toItem(updated.id, updated.data()!);
  },

  async marcarEnvio(id: string, iso: string): Promise<void> {
    await db.collection(COL).doc(id).update({ ultimoEnvioEm: iso });
  },

  async remove(id: string): Promise<void> {
    await db.collection(COL).doc(id).delete();
  },
};
