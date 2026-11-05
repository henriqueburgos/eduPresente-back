import { FieldValue } from 'firebase-admin/firestore';
import { db, nowIso } from './base.js';
import type { Mensagem } from '../domain/types/mensagem.js';
import { MensagemSchema } from '../domain/schemas/entidades.js';

const COL = 'mensagens';

function toMensagem(id: string, data: FirebaseFirestore.DocumentData): Mensagem {
  return MensagemSchema.parse({ id, ...data });
}

function ordenar(list: Mensagem[]): Mensagem[] {
  return list.sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
}

export const mensagensRepo = {
  async create(data: Omit<Mensagem, 'id' | 'criadoEm'>): Promise<Mensagem> {
    const ref = db.collection(COL).doc();
    const mensagem: Mensagem = { id: ref.id, ...data, criadoEm: nowIso() };
    await ref.set(mensagem);
    return mensagem;
  },

  async listByPaciente(pacienteId: string): Promise<Mensagem[]> {
    const snap = await db.collection(COL).where('pacienteId', '==', pacienteId).get();
    return ordenar(snap.docs.map((d) => toMensagem(d.id, d.data())));
  },

  async listByPacientes(pacienteIds: string[]): Promise<Mensagem[]> {
    if (pacienteIds.length === 0) return [];
    const lotes: string[][] = [];
    for (let i = 0; i < pacienteIds.length; i += 30) lotes.push(pacienteIds.slice(i, i + 30));
    const snaps = await Promise.all(
      lotes.map((lote) => db.collection(COL).where('pacienteId', 'in', lote).get()),
    );
    const mapa = new Map<string, Mensagem>();
    for (const snap of snaps) for (const d of snap.docs) mapa.set(d.id, toMensagem(d.id, d.data()));
    return ordenar([...mapa.values()]);
  },

  async listAll(): Promise<Mensagem[]> {
    const snap = await db.collection(COL).get();
    return ordenar(snap.docs.map((d) => toMensagem(d.id, d.data())));
  },

  async marcarLidas(pacienteId: string, uid: string): Promise<number> {
    const snap = await db.collection(COL).where('pacienteId', '==', pacienteId).get();
    const naoLidas = snap.docs.filter((d) => {
      const lidaPor = d.data()['lidaPor'];
      return !Array.isArray(lidaPor) || !lidaPor.includes(uid);
    });
    if (naoLidas.length === 0) return 0;
    const lote = db.batch();
    for (const doc of naoLidas) {
      lote.update(doc.ref, { lidaPor: FieldValue.arrayUnion(uid) });
    }
    await lote.commit();
    return naoLidas.length;
  },

  async removeByPaciente(pacienteId: string): Promise<void> {
    const snap = await db.collection(COL).where('pacienteId', '==', pacienteId).get();
    if (snap.empty) return;
    const lote = db.batch();
    for (const doc of snap.docs) lote.delete(doc.ref);
    await lote.commit();
  },
};
