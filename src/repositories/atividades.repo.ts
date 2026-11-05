import { db, nowIso, todayPrefix } from './base.js';
import type { Atividade } from '../domain/types/entidades.js';
import type { TipoAtividade } from '../domain/types/tipos-atividade.js';
import { AtividadeSchema } from '../domain/schemas/entidades.js';

const COL = 'atividades';

function toAtividade(id: string, data: FirebaseFirestore.DocumentData): Atividade {
  return AtividadeSchema.parse({ id, ...data });
}

export const atividadesRepo = {
  async listByAluno(alunoId: string): Promise<Atividade[]> {
    const snap = await db.collection(COL).where('alunoId', '==', alunoId).orderBy('criadoEm', 'desc').get();
    return snap.docs.map((d) => toAtividade(d.id, d.data()));
  },

  async listHoje(alunoId?: string): Promise<Atividade[]> {
    const prefix = todayPrefix();
    let q: FirebaseFirestore.Query = db.collection(COL).where('criadoEm', '>=', prefix);
    if (alunoId) q = q.where('alunoId', '==', alunoId);
    const snap = await q.get();
    return snap.docs.map((d) => toAtividade(d.id, d.data())).filter((a) => a.criadoEm.startsWith(prefix));
  },

  async resumoPorTipo(alunoId?: string): Promise<Record<string, number>> {
    const items = alunoId ? await this.listByAluno(alunoId) : await this.listAll();
    const out: Record<string, number> = {};
    for (const a of items) out[a.tipo] = (out[a.tipo] ?? 0) + 1;
    return out;
  },

  async listAll(): Promise<Atividade[]> {
    const snap = await db.collection(COL).orderBy('criadoEm', 'desc').limit(500).get();
    return snap.docs.map((d) => toAtividade(d.id, d.data()));
  },

  async create(data: {
    alunoId: string;
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
      alunoId: data.alunoId,
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