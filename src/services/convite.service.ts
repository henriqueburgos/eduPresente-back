import { auth as firebaseAuth } from '../config/firebase.js';
import { NotFoundError, ForbiddenError } from '../domain/errors.js';
import type { Role } from '../domain/types/roles.js';
import type { ConviteCmd } from '../domain/schemas/commands.js';
import { usuariosRepo } from '../repositories/usuarios.repo.js';
import { pacientesRepo } from '../repositories/pacientes.repo.js';
import { auditoriaRepo } from '../repositories/auditoria.repo.js';
import { claimsService } from './claims.service.js';

export const conviteService = {
  async convidar(cmd: ConviteCmd, ator: { uid: string; role: Role; escolaId?: string }) {
    if (ator.role !== 'admin') {
      throw new ForbiddenError('Apenas admin pode convidar');
    }

    // valida pacientes existem
    for (const pid of cmd.pacienteIds) {
      const p = await pacientesRepo.findById(pid);
      if (!p) throw new NotFoundError(`Paciente ${pid} não encontrado`);
    }

    // senha: usa a informada ou gera uma temporária
    const senhaTemporaria = cmd.senha
      ? undefined
      : (await import('node:crypto')).randomBytes(9).toString('base64url');
    const senha = cmd.senha ?? senhaTemporaria!;

    const userRecord = await firebaseAuth.createUser({
      email: cmd.email,
      password: senha,
      displayName: cmd.nome,
      disabled: false,
    });

    const uid = userRecord.uid;

    await usuariosRepo.create({
      uid,
      nome: cmd.nome,
      email: cmd.email,
      role: cmd.role as Role,
      escolaId: ator.escolaId,
      pacienteIds: cmd.pacienteIds,
      ativo: true,
    });

    // vincula pacientes ao usuário
    for (const pid of cmd.pacienteIds) {
      const p = await pacientesRepo.findById(pid);
      if (!p) continue;
      if (cmd.role === 'cuidador' && !p.cuidadorIds.includes(uid)) {
        await pacientesRepo.update(pid, { cuidadorIds: [...p.cuidadorIds, uid] });
      }
      if (cmd.role === 'responsavel' && !p.responsavelIds.includes(uid)) {
        await pacientesRepo.update(pid, { responsavelIds: [...p.responsavelIds, uid] });
      }
      if (cmd.role === 'familiar' && !p.familiarIds.includes(uid)) {
        await pacientesRepo.update(pid, { familiarIds: [...p.familiarIds, uid] });
      }
    }

    await claimsService.renovarClaims(uid);

    // envia email de redefinição de senha (best effort)
    try {
      await firebaseAuth.generatePasswordResetLink(cmd.email);
    } catch {
      // ignore
    }

    await auditoriaRepo.create({
      ator: ator.uid,
      acao: 'convidar_acesso',
      alvo: uid,
      nivel: 'info',
    });

    return {
      uid,
      email: cmd.email,
      role: cmd.role,
      ...(senhaTemporaria ? { senhaTemporaria } : {}),
    };
  },
};