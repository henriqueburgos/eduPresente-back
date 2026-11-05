import { db, nowIso } from './base.js';
import type { Documento } from '../domain/types/documento.js';
import { DocumentoSchema } from '../domain/schemas/entidades.js';

const COL = 'documentos';

function toDocumento(id: string, data: FirebaseFirestore.DocumentData): Documento {
  return DocumentoSchema.parse({ id, ...data });
}

function ordenar(list: Documento[]): Documento[] {
  return list.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

export const documentosRepo = {
  async create(data: Omit<Documento, 'id' | 'criadoEm'>): Promise<Documento> {
    const ref = db.collection(COL).doc();
    const documento: Documento = { id: ref.id, ...data, criadoEm: nowIso() };
    await ref.set(documento);
    return documento;
  },

  async findById(id: string): Promise<Documento | null> {
    const doc = await db.collection(COL).doc(id).get();
    if (!doc.exists) return null;
    return toDocumento(doc.id, doc.data()!);
  },

  async listByAluno(alunoId: string, escolaId?: string): Promise<Documento[]> {
    let q: FirebaseFirestore.Query = db.collection(COL).where('alunoId', '==', alunoId);
    if (escolaId) q = q.where('escolaId', '==', escolaId);
    const snap = await q.get();
    return ordenar(snap.docs.map((d) => toDocumento(d.id, d.data())));
  },

  async listByAlunos(alunoIds: string[]): Promise<Documento[]> {
    if (alunoIds.length === 0) return [];
    const lotes: string[][] = [];
    for (let i = 0; i < alunoIds.length; i += 30) lotes.push(alunoIds.slice(i, i + 30));
    const snaps = await Promise.all(
      lotes.map((lote) => db.collection(COL).where('alunoId', 'in', lote).get()),
    );
    const mapa = new Map<string, Documento>();
    for (const snap of snaps) for (const d of snap.docs) mapa.set(d.id, toDocumento(d.id, d.data()));
    return ordenar([...mapa.values()]);
  },

  async listAll(escolaId?: string): Promise<Documento[]> {
    let q: FirebaseFirestore.Query = db.collection(COL);
    if (escolaId) q = q.where('escolaId', '==', escolaId);
    const snap = await q.get();
    return ordenar(snap.docs.map((d) => toDocumento(d.id, d.data())));
  },

  async remove(id: string): Promise<void> {
    await db.collection(COL).doc(id).delete();
  },

  async removeByAluno(alunoId: string): Promise<void> {
    const snap = await db.collection(COL).where('alunoId', '==', alunoId).get();
    if (snap.empty) return;
    const lote = db.batch();
    for (const doc of snap.docs) lote.delete(doc.ref);
    await lote.commit();
  },
};
