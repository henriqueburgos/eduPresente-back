import { db, nowIso } from './base.js';
import type { NotificacaoUsuario } from '../domain/types/notificacao.js';
import { NotificacaoUsuarioSchema } from '../domain/schemas/entidades.js';

const COL = 'usuarios';
const SUB = 'notificacoes';

function ref(uid: string) {
  return db.collection(COL).doc(uid).collection(SUB);
}

function toNotificacao(id: string, data: FirebaseFirestore.DocumentData): NotificacaoUsuario {
  return NotificacaoUsuarioSchema.parse({ id, ...data });
}

/** Remove campos `undefined` (o Firestore Admin recusa gravar esse valor). */
function semIndefinidos<T>(valor: T): T {
  if (Array.isArray(valor)) {
    return valor.map((item) => semIndefinidos(item)) as T;
  }
  if (valor && typeof valor === 'object' && Object.getPrototypeOf(valor) === Object.prototype) {
    const saida: Record<string, unknown> = {};
    for (const [chave, item] of Object.entries(valor as Record<string, unknown>)) {
      if (item === undefined) continue;
      saida[chave] = semIndefinidos(item);
    }
    return saida as T;
  }
  return valor;
}

export const notificacoesRepo = {
  async criarParaUsuarios(
    uids: string[],
    payload: Omit<NotificacaoUsuario, 'id' | 'lida' | 'criadaEm'>,
  ): Promise<void> {
    const agora = nowIso();
    const unicos = [...new Set(uids)].filter(Boolean);
    await Promise.all(
      unicos.map((uid) =>
        ref(uid).add(semIndefinidos({ ...payload, lida: false, criadaEm: agora })),
      ),
    );
  },

  async listar(uid: string): Promise<NotificacaoUsuario[]> {
    const snap = await ref(uid).orderBy('criadaEm', 'desc').limit(100).get();
    return snap.docs.map((d) => toNotificacao(d.id, d.data()));
  },

  async marcarLida(uid: string, id: string): Promise<void> {
    await ref(uid).doc(id).update({ lida: true });
  },

  async marcarTodas(uid: string): Promise<number> {
    const snap = await ref(uid).where('lida', '==', false).get();
    if (snap.empty) return 0;
    const lote = db.batch();
    for (const doc of snap.docs) lote.update(doc.ref, { lida: true });
    await lote.commit();
    return snap.size;
  },

  async remover(uid: string, id: string): Promise<void> {
    await ref(uid).doc(id).delete();
  },

  async removerTodas(uid: string): Promise<number> {
    const snap = await ref(uid).limit(500).get();
    if (snap.empty) return 0;
    const lote = db.batch();
    for (const doc of snap.docs) lote.delete(doc.ref);
    await lote.commit();
    return snap.size;
  },
};
