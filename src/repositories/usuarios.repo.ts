import { db, nowIso } from './base.js';
import type { Usuario } from '../domain/types/entidades.js';
import { UsuarioSchema } from '../domain/schemas/entidades.js';

const COL = 'usuarios';

function toUsuario(id: string, data: FirebaseFirestore.DocumentData): Usuario {
  return UsuarioSchema.parse({ uid: id, ...data });
}

export const usuariosRepo = {
  async list(): Promise<Usuario[]> {
    const snap = await db.collection(COL).orderBy('nome', 'asc').get();
    return snap.docs.map((d) => toUsuario(d.id, d.data()));
  },

  async findById(uid: string): Promise<Usuario | null> {
    const doc = await db.collection(COL).doc(uid).get();
    if (!doc.exists) return null;
    return toUsuario(doc.id, doc.data()!);
  },

  async totals(): Promise<{ total: number; ativos: number }> {
    const snap = await db.collection(COL).get();
    const total = snap.size;
    const ativos = snap.docs.filter((d) => d.data().ativo !== false).length;
    return { total, ativos };
  },

  async create(data: Omit<Usuario, 'criadoEm' | 'fcmTokens'> & { criadoEm?: string; fcmTokens?: string[] }): Promise<Usuario> {
    const usuario: Usuario = {
      ...data,
      fcmTokens: data.fcmTokens ?? [],
      criadoEm: data.criadoEm ?? nowIso(),
    };
    await db.collection(COL).doc(data.uid).set(usuario);
    return usuario;
  },

  async updateAtivo(uid: string, ativo: boolean): Promise<Usuario | null> {
    const ref = db.collection(COL).doc(uid);
    const doc = await ref.get();
    if (!doc.exists) return null;
    await ref.update({ ativo });
    const updated = await ref.get();
    return toUsuario(updated.id, updated.data()!);
  },

  async updatePacienteIds(uid: string, pacienteIds: string[]): Promise<Usuario | null> {
    const ref = db.collection(COL).doc(uid);
    const doc = await ref.get();
    if (!doc.exists) return null;
    await ref.update({ pacienteIds });
    const updated = await ref.get();
    return toUsuario(updated.id, updated.data()!);
  },

  async addFcmToken(uid: string, token: string): Promise<Usuario | null> {
    const ref = db.collection(COL).doc(uid);
    const doc = await ref.get();
    if (!doc.exists) return null;

    // Um token pertence a um único usuário: remove de outras contas
    // usadas no mesmo navegador para evitar push cruzado.
    const vinculados = await db.collection(COL).where('fcmTokens', 'array-contains', token).get();
    await Promise.all(
      vinculados.docs
        .filter((d) => d.id !== uid)
        .map((d) => {
          const atuais = d.data().fcmTokens;
          const tokens = Array.isArray(atuais) ? (atuais as string[]) : [];
          return d.ref.update({ fcmTokens: tokens.filter((t) => t !== token) });
        }),
    );

    const data = doc.data()!;
    const tokens = Array.isArray(data.fcmTokens) ? (data.fcmTokens as string[]) : [];
    if (!tokens.includes(token)) tokens.push(token);
    await ref.update({ fcmTokens: tokens });
    const updated = await ref.get();
    return toUsuario(updated.id, updated.data()!);
  },

  async removeFcmToken(uid: string, token: string): Promise<Usuario | null> {
    const ref = db.collection(COL).doc(uid);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    const tokens = Array.isArray(data.fcmTokens) ? (data.fcmTokens as string[]) : [];
    await ref.update({ fcmTokens: tokens.filter((t) => t !== token) });
    const updated = await ref.get();
    return toUsuario(updated.id, updated.data()!);
  },
};