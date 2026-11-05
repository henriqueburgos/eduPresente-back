import { db, nowIso } from './base.js';
import type { Turma } from '../domain/types/entidades.js';
import { z } from 'zod';

const COL = 'turmas';

function toTurma(id: string, data: FirebaseFirestore.DocumentData): Turma {
  return {
    id,
    escolaId: String(data.escolaId ?? ''),
    nome: String(data.nome ?? ''),
    serie: String(data.serie ?? ''),
    segmento: String(data.segmento ?? ''),
    anoLetivo: String(data.anoLetivo ?? ''),
    turno: String(data.turno ?? ''),
    professorIds: Array.isArray(data.professorIds) ? (data.professorIds as string[]) : [],
    alunoIds: Array.isArray(data.alunoIds) ? (data.alunoIds as string[]) : [],
    criadoEm: String(data.criadoEm ?? nowIso()),
  };
}

export const turmasRepo = {
  async findById(id: string): Promise<Turma | null> {
    const doc = await db.collection(COL).doc(id).get();
    if (!doc.exists) return null;
    return toTurma(doc.id, doc.data()!);
  },
  async listByEscola(escolaId: string): Promise<Turma[]> {
    const snap = await db.collection(COL).where('escolaId', '==', escolaId).get();
    return snap.docs.map((d) => toTurma(d.id, d.data())).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  },
  async listByProfessor(uid: string): Promise<Turma[]> {
    const snap = await db.collection(COL).where('professorIds', 'array-contains', uid).get();
    return snap.docs.map((d) => toTurma(d.id, d.data())).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  },
  async create(data: Omit<Turma, 'id' | 'criadoEm'> & { id?: string }): Promise<Turma> {
    const id = data.id ?? db.collection(COL).doc().id;
    const item: Turma = { id, ...data, criadoEm: nowIso() };
    await db.collection(COL).doc(id).set(item);
    return item;
  },
  async update(id: string, patch: Partial<Turma>): Promise<Turma | null> {
    const ref = db.collection(COL).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    await ref.update(patch);
    const updated = await ref.get();
    return toTurma(updated.id, updated.data()!);
  },
  async delete(id: string): Promise<boolean> {
    const ref = db.collection(COL).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return false;
    await ref.delete();
    return true;
  },
};
