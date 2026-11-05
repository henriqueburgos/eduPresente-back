import { db, nowIso, todayPrefix } from './base.js';
import type { Atividade } from '../domain/types/entidades.js';
import type { TipoAtividade } from '../domain/types/tipos-atividade.js';
import { AtividadeSchema } from '../domain/schemas/entidades.js';

const COL = 'atividades';

function toAtividade(id: string, data: FirebaseFirestore.DocumentData): Atividade {
  return AtividadeSchema.parse({ id, ...data });
}

export const atividadesRepo = {
  async listByPaciente(pacienteId: string): Promise<Atividade[]> {
    const snap = await db.collection(COL).where('pacienteId', '==', pacienteId).orderBy('criadoEm', 'desc').get();
    return snap.docs.map((d) => toAtividade(d.id, d.data()));
  },

  async listHoje(pacienteId?: string): Promise<Atividade[]> {
    const prefix = todayPrefix();
    let q: FirebaseFirestore.Query = db.collection(COL).where('criadoEm', '>=', prefix);
    if (pacienteId) q = q.where('pacienteId', '==', pacienteId);
    const snap = await q.get();
    return snap.docs.map((d) => toAtividade(d.id, d.data())).filter((a) => a.criadoEm.startsWith(prefix));
  },

  async resumoPorTipo(pacienteId?: string): Promise<Record<string, number>> {
    const items = pacienteId ? await this.listByPaciente(pacienteId) : await this.listAll();
    const out: Record<string, number> = {};
    for (const a of items) out[a.tipo] = (out[a.tipo] ?? 0) + 1;
    return out;
  },

  async listAll(): Promise<Atividade[]> {
    const snap = await db.collection(COL).orderBy('criadoEm', 'desc').limit(500).get();
    return snap.docs.map((d) => toAtividade(d.id, d.data()));
  },

  async create(data: {
    pacienteId: string;
    tipo: TipoAtividade;
    descricao: string;
    autorUid: string;
    autorNome: string;
    meta?: Record<string, unknown>;
    clientRequestId?: string;
  }): Promise<Atividade> {
    const ref = db.collection(COL).doc();
    const atividade: Atividade = {
      id: ref.id,
      pacienteId: data.pacienteId,
      tipo: data.tipo,
      descricao: data.descricao,
      autorUid: data.autorUid,
      autorNome: data.autorNome,
      criadoEm: nowIso(),
      ...(data.meta ? { meta: data.meta } : {}),
      ...(data.clientRequestId ? { clientRequestId: data.clientRequestId } : {}),
    };
    await ref.set(atividade);
    return atividade;
  },

  async findByClientRequestId(
    autorUid: string,
    clientRequestId: string,
  ): Promise<Atividade | null> {
    const snap = await db
      .collection(COL)
      .where('clientRequestId', '==', clientRequestId)
      .limit(10)
      .get();
    const doc = snap.docs.find((d) => d.data()['autorUid'] === autorUid);
    return doc ? toAtividade(doc.id, doc.data()) : null;
  },
};