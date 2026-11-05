import { db } from './base.js';
import type { Administracao } from '../domain/types/medicacao.js';
import { AdministracaoSchema } from '../domain/schemas/entidades.js';

const COL = 'administracoes';

function toAdministracao(id: string, data: FirebaseFirestore.DocumentData): Administracao {
  return AdministracaoSchema.parse({ id, ...data });
}

export const administracoesRepo = {
  async create(data: Omit<Administracao, 'id'>): Promise<Administracao> {
    const ref = db.collection(COL).doc();
    const administracao: Administracao = { id: ref.id, ...data };
    await ref.set(administracao);
    return administracao;
  },

  async findBySlot(
    prescricaoId: string,
    data: string,
    horario: string,
  ): Promise<Administracao | null> {
    const snap = await db
      .collection(COL)
      .where('prescricaoId', '==', prescricaoId)
      .where('data', '==', data)
      .where('horario', '==', horario)
      .limit(1)
      .get();
    const doc = snap.docs[0];
    return doc ? toAdministracao(doc.id, doc.data()) : null;
  },

  async findById(id: string): Promise<Administracao | null> {
    const doc = await db.collection(COL).doc(id).get();
    if (!doc.exists) return null;
    return toAdministracao(doc.id, doc.data()!);
  },

  async update(id: string, patch: Record<string, unknown>): Promise<Administracao | null> {
    const ref = db.collection(COL).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    await ref.update(patch);
    const updated = await ref.get();
    return toAdministracao(updated.id, updated.data()!);
  },

  async listByPaciente(
    pacienteId: string,
    de?: string,
    ate?: string,
  ): Promise<Administracao[]> {
    const snap = await db.collection(COL).where('pacienteId', '==', pacienteId).get();
    return snap.docs
      .map((d) => toAdministracao(d.id, d.data()))
      .filter((a) => (de ? a.data >= de : true) && (ate ? a.data <= ate : true))
      .sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario));
  },

  async listByPrescricao(prescricaoId: string): Promise<Administracao[]> {
    const snap = await db.collection(COL).where('prescricaoId', '==', prescricaoId).get();
    return snap.docs.map((d) => toAdministracao(d.id, d.data()));
  },

  async removeByPaciente(pacienteId: string): Promise<void> {
    const snap = await db.collection(COL).where('pacienteId', '==', pacienteId).get();
    if (snap.empty) return;
    const lote = db.batch();
    for (const doc of snap.docs) lote.delete(doc.ref);
    await lote.commit();
  },
};
