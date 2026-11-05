import { db, nowIso } from './base.js';
import type { Lead, LeadStatus } from '../domain/types/lead.js';
import { LeadSchema } from '../domain/schemas/leads.js';

const COL = 'leads';

function toLead(id: string, data: FirebaseFirestore.DocumentData): Lead {
  return LeadSchema.parse({ id, ...data });
}

export const leadsRepo = {
  async create(data: Omit<Lead, 'id' | 'criadoEm' | 'status'>): Promise<Lead> {
    const ref = db.collection(COL).doc();
    const lead: Lead = { id: ref.id, ...data, status: 'novo', criadoEm: nowIso() };
    await ref.set(lead);
    return lead;
  },

  async listAll(): Promise<Lead[]> {
    const snap = await db.collection(COL).orderBy('criadoEm', 'desc').get();
    return snap.docs.map((d) => toLead(d.id, d.data()));
  },

  async findByEmail(email: string): Promise<Lead[]> {
    const snap = await db.collection(COL).where('email', '==', email).get();
    return snap.docs
      .map((d) => toLead(d.id, d.data()))
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  },

  async atualizarStatus(id: string, status: LeadStatus): Promise<Lead | null> {
    const ref = db.collection(COL).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    await ref.update({ status });
    const atualizado = await ref.get();
    return toLead(atualizado.id, atualizado.data()!);
  },

  async remover(id: string): Promise<boolean> {
    const ref = db.collection(COL).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return false;
    await ref.delete();
    return true;
  },
};
