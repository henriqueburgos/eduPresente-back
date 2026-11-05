import { db, nowIso } from './base.js';
import type { MaterialEstoque } from '../domain/types/entidades.js';
import type { CategoriaMaterial } from '../domain/types/estoque.js';
import { MaterialEstoqueSchema } from '../domain/schemas/entidades.js';

const COL = 'estoque';

function toMaterial(id: string, data: FirebaseFirestore.DocumentData): MaterialEstoque {
  return MaterialEstoqueSchema.parse({ id, ...data });
}

function ordenarPorNome(list: MaterialEstoque[]): MaterialEstoque[] {
  return list.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export const estoqueRepo = {
  async create(data: {
    pacienteId: string;
    nome: string;
    categoria: CategoriaMaterial;
    quantidade: number;
    unidade: string;
    quantidadeMinima: number;
    validade?: string;
    observacao?: string;
  }): Promise<MaterialEstoque> {
    const ref = db.collection(COL).doc();
    const agora = nowIso();
    const material: MaterialEstoque = {
      id: ref.id,
      ...data,
      atualizadoEm: agora,
      criadoEm: agora,
    };
    await ref.set(material);
    return material;
  },

  async findById(id: string): Promise<MaterialEstoque | null> {
    const doc = await db.collection(COL).doc(id).get();
    if (!doc.exists) return null;
    return toMaterial(doc.id, doc.data()!);
  },

  async listByPaciente(pacienteId: string): Promise<MaterialEstoque[]> {
    const snap = await db.collection(COL).where('pacienteId', '==', pacienteId).get();
    return ordenarPorNome(snap.docs.map((d) => toMaterial(d.id, d.data())));
  },

  async listByPacientes(pacienteIds: string[]): Promise<MaterialEstoque[]> {
    if (pacienteIds.length === 0) return [];
    const lotes: string[][] = [];
    for (let i = 0; i < pacienteIds.length; i += 30) lotes.push(pacienteIds.slice(i, i + 30));

    const snaps = await Promise.all(
      lotes.map((lote) => db.collection(COL).where('pacienteId', 'in', lote).get()),
    );

    const map = new Map<string, MaterialEstoque>();
    for (const snap of snaps) {
      for (const d of snap.docs) map.set(d.id, toMaterial(d.id, d.data()));
    }
    return ordenarPorNome(Array.from(map.values()));
  },

  async listAll(): Promise<MaterialEstoque[]> {
    const snap = await db.collection(COL).limit(1000).get();
    return ordenarPorNome(snap.docs.map((d) => toMaterial(d.id, d.data())));
  },

  async update(id: string, patch: Record<string, unknown>): Promise<MaterialEstoque | null> {
    const ref = db.collection(COL).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    await ref.update({ ...patch, atualizadoEm: nowIso() });
    const updated = await ref.get();
    return toMaterial(updated.id, updated.data()!);
  },

  async movimentar(
    id: string,
    delta: number,
  ): Promise<{ material: MaterialEstoque | null; insuficiente: boolean }> {
    return db.runTransaction(async (tx) => {
      const ref = db.collection(COL).doc(id);
      const doc = await tx.get(ref);
      if (!doc.exists) return { material: null, insuficiente: false };

      const atual = toMaterial(doc.id, doc.data()!);
      const nova = atual.quantidade + delta;
      if (nova < 0) return { material: atual, insuficiente: true };

      const atualizado: MaterialEstoque = { ...atual, quantidade: nova, atualizadoEm: nowIso() };
      tx.set(ref, atualizado);
      return { material: atualizado, insuficiente: false };
    });
  },

  async remove(id: string): Promise<void> {
    await db.collection(COL).doc(id).delete();
  },

  async removeByPaciente(pacienteId: string): Promise<number> {
    const snap = await db.collection(COL).where('pacienteId', '==', pacienteId).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
    return snap.size;
  },
};
