import { auth as firebaseAuth } from '../config/firebase.js';
import { NotFoundError } from '../domain/errors.js';
import { usuariosRepo } from '../repositories/usuarios.repo.js';

export const claimsService = {
  /**
   * Regrava as claims a partir do perfil do usuário, sem derrubar a sessão.
   * É o caminho usado quando vínculos mudam: o cliente renova o token e passa
   * a enxergar os novos pacientes no Firestore.
   */
  async atualizarClaims(uid: string) {
    const usuario = await usuariosRepo.findById(uid);
    if (!usuario) throw new NotFoundError('Usuário não encontrado');

    await firebaseAuth.setCustomUserClaims(uid, {
      role: usuario.role,
      escolaId: usuario.escolaId ?? '',
      pacienteIds: usuario.pacienteIds,
    });

    return { uid, role: usuario.role, pacienteIds: usuario.pacienteIds };
  },

  /** Usado na criação de conta: além das claims, invalida tokens antigos. */
  async renovarClaims(uid: string) {
    const resultado = await this.atualizarClaims(uid);

    // força refresh do token (revoga tokens antigos)
    await firebaseAuth.revokeRefreshTokens(uid);

    return resultado;
  },
};
