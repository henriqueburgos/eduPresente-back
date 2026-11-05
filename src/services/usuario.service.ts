import { NotFoundError, ForbiddenError } from '../domain/errors.js';
import type { Role } from '../domain/types/roles.js';
import { usuariosRepo } from '../repositories/usuarios.repo.js';
import { alunosRepo } from '../repositories/alunos.repo.js';
import { db } from '../repositories/base.js';
import { auditoriaRepo } from '../repositories/auditoria.repo.js';

export const usuarioService = {
  async ativarDesativar(uid: string, ativo: boolean, ator: { uid: string; role: Role }) {
    const usuario = await usuariosRepo.findById(uid);
    if (!usuario) throw new NotFoundError('Usuário não encontrado');

    // apenas admin pode desativar/reativar
    if (ator.role !== 'admin') throw new ForbiddenError('Apenas admin');

    const updated = await usuariosRepo.updateAtivo(uid, ativo);
    if (!updated) throw new NotFoundError('Usuário não encontrado');

    await auditoriaRepo.create({
      ator: ator.uid,
      acao: ativo ? 'reativar_acesso' : 'desativar_acesso',
      alvo: uid,
      nivel: 'alerta',
    });

    return updated;
  },

  async deletar(uid: string, ator: { uid: string; role: Role }) {
    if (ator.role !== 'admin') throw new ForbiddenError('Apenas admin');
    const usuario = await usuariosRepo.findById(uid);
    if (!usuario) throw new NotFoundError('Usuário não encontrado');

    // remove vínculos em pacientes
    const pacientes = await alunosRepo.listOrdenadoPorNome();
    for (const p of pacientes) {
      let changed = false;
      const professorIds = p.professorIds.filter((x) => x !== uid);
      const responsavelIds = p.responsavelIds.filter((x) => x !== uid);
      const familiarIds = p.familiarIds.filter((x) => x !== uid);
      if (professorIds.length !== p.professorIds.length || responsavelIds.length !== p.responsavelIds.length || familiarIds.length !== p.familiarIds.length) {
        changed = true;
      }
      if (changed) {
        await alunosRepo.update(p.id, { professorIds, responsavelIds, familiarIds });
      }
    }

    // remove doc Firestore
    await db.collection('usuarios').doc(uid).delete();

    // remove do Firebase Auth (best effort)
    try {
      await (await import('../config/firebase.js')).auth.deleteUser(uid);
    } catch {
      // ignore se não existir
    }

    await auditoriaRepo.create({
      ator: ator.uid,
      acao: 'deletar_usuario',
      alvo: uid,
      nivel: 'critico',
    });

    return { uid, deletado: true };
  },
};