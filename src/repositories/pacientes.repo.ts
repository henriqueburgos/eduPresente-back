import { db, nowIso } from './base.js';
import type { Paciente } from '../domain/types/entidades.js';
import { PacienteSchema } from '../domain/schemas/entidades.js';

const COL = 'pacientes';

function toPaciente(id: string, data: FirebaseFirestore.DocumentData): Paciente {
  const paciente = PacienteSchema.parse({ id, ...data });
  // Registros antigos guardavam "quarto"; assume como local até serem editados.
  return { ...paciente, local: paciente.local || paciente.quarto || '' };
}

export const pacientesRepo = {
  async listOrdenadoPorNome(): Promise<Paciente[]> {
    const snap = await db.collection(COL).orderBy('nome', 'asc').get();
    return snap.docs.map((d) => toPaciente(d.id, d.data()));
  },

  async findById(id: string): Promise<Paciente | null> {
    const doc = await db.collection(COL).doc(id).get();
    if (!doc.exists) return null;
    return toPaciente(doc.id, doc.data()!);
  },

  async listByUsuario(uid: string): Promise<Paciente[]> {
    const [a, b, c] = await Promise.all([
      db.collection(COL).where('cuidadorIds', 'array-contains', uid).get(),
      db.collection(COL).where('responsavelIds', 'array-contains', uid).get(),
      db.collection(COL).where('familiarIds', 'array-contains', uid).get(),
    ]);
    const map = new Map<string, Paciente>();
    for (const d of [...a.docs, ...b.docs, ...c.docs]) {
      map.set(d.id, toPaciente(d.id, d.data()));
    }
    return Array.from(map.values()).sort((x, y) => x.nome.localeCompare(y.nome));
  },

  async create(p: Omit<Paciente, 'id'> & { id?: string }): Promise<Paciente> {
    const id = p.id ?? db.collection(COL).doc().id;
    const data = { ...p, id, entradaEm: p.entradaEm ?? nowIso().slice(0, 10) };
    await db.collection(COL).doc(id).set(data);
    return PacienteSchema.parse(data);
  },

  async update(id: string, patch: Partial<Paciente>): Promise<Paciente | null> {
    const ref = db.collection(COL).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    await ref.update(patch);
    const updated = await ref.get();
    return toPaciente(updated.id, updated.data()!);
  },
};