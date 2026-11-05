import { db, nowIso } from './base.js';
import type { Aluno } from '../domain/types/entidades.js';
import { AlunoSchema } from '../domain/schemas/entidades.js';

const COL = 'alunos';

function toAluno(id: string, data: FirebaseFirestore.DocumentData): Aluno {
  const paciente = AlunoSchema.parse({ id, ...data });
  // Registros antigos guardavam "quarto"; assume como local até serem editados.
  return { ...paciente, local: paciente.local || paciente.quarto || '' };
}

export const alunosRepo = {
  async listOrdenadoPorNome(escolaId?: string): Promise<Aluno[]> {
    let q: FirebaseFirestore.Query = db.collection(COL).orderBy('nome', 'asc');
    if (escolaId) q = q.where('escolaId', '==', escolaId);
    const snap = await q.get();
    return snap.docs.map((d) => toAluno(d.id, d.data()));
  },

  async findById(id: string): Promise<Aluno | null> {
    const doc = await db.collection(COL).doc(id).get();
    if (!doc.exists) return null;
    return toAluno(doc.id, doc.data()!);
  },

  async listByUsuario(uid: string, escolaId?: string): Promise<Aluno[]> {
    const [a, b, c] = await Promise.all([
      db.collection(COL).where('professorIds', 'array-contains', uid).get(),
      db.collection(COL).where('responsavelIds', 'array-contains', uid).get(),
      db.collection(COL).where('familiarIds', 'array-contains', uid).get(),
    ]);
    const map = new Map<string, Aluno>();
    for (const d of [...a.docs, ...b.docs, ...c.docs]) {
      map.set(d.id, toAluno(d.id, d.data()));
    }
    let lista = Array.from(map.values());
    if (escolaId) lista = lista.filter((a) => a.escolaId === escolaId);
    return lista.sort((x, y) => x.nome.localeCompare(y.nome));
  },

  async create(p: Omit<Aluno, 'id'> & { id?: string }): Promise<Aluno> {
    const id = p.id ?? db.collection(COL).doc().id;
    const data = { ...p, id, entradaEm: p.entradaEm ?? nowIso().slice(0, 10) };
    await db.collection(COL).doc(id).set(data);
    return AlunoSchema.parse(data);
  },

  async update(id: string, patch: Partial<Aluno>): Promise<Aluno | null> {
    const ref = db.collection(COL).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    await ref.update(patch);
    const updated = await ref.get();
    return toAluno(updated.id, updated.data()!);
  },
};