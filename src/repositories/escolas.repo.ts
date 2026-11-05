import { db, nowIso } from './base.js';
import type { Escola } from '../domain/types/entidades.js';

const COL = 'escolas';

function toEscola(id: string, data: FirebaseFirestore.DocumentData): Escola {
  return {
    id,
    nome: String(data.nome ?? ''),
    slug: String(data.slug ?? ''),
    segmentos: Array.isArray(data.segmentos) ? (data.segmentos as string[]) : [],
    endereco: data.endereco ? String(data.endereco) : undefined,
    ativo: data.ativo !== false,
    branding: (data.branding as Record<string, unknown>) ?? undefined,
    criadoEm: String(data.criadoEm ?? nowIso()),
  };
}

export const escolasRepo = {
  async findById(id: string): Promise<Escola | null> {
    const doc = await db.collection(COL).doc(id).get();
    if (!doc.exists) return null;
    return toEscola(doc.id, doc.data()!);
  },
  async findBySlug(slug: string): Promise<Escola | null> {
    const snap = await db.collection(COL).where('slug', '==', slug).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0]!;
    return toEscola(doc.id, doc.data()!);
  },
  async list(): Promise<Escola[]> {
    const snap = await db.collection(COL).orderBy('nome', 'asc').get();
    return snap.docs.map((d) => toEscola(d.id, d.data()));
  },
  async create(data: Omit<Escola, 'id' | 'criadoEm'> & { id?: string }): Promise<Escola> {
    const id = data.id ?? db.collection(COL).doc().id;
    const item: Escola = { id, ...data, criadoEm: nowIso() };
    await db.collection(COL).doc(id).set(item);
    return item;
  },
  async update(id: string, patch: Partial<Escola>): Promise<Escola | null> {
    const ref = db.collection(COL).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    await ref.update(patch);
    const updated = await ref.get();
    return toEscola(updated.id, updated.data()!);
  },
};
