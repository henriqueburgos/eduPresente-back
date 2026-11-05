import type { Request, Response } from 'express';

import { pacientesRepo } from '../repositories/pacientes.repo.js';
import { usuariosRepo } from '../repositories/usuarios.repo.js';
import { auditoriaRepo } from '../repositories/auditoria.repo.js';
import { pacienteService } from '../services/paciente.service.js';
import { claimsService } from '../services/claims.service.js';
import { NotFoundError, ForbiddenError } from '../domain/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const pacientesController = {
  criar: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const paciente = await pacienteService.criar(req.body, ator);
    res.status(201).json(paciente);
  }),

  atualizar: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const paciente = await pacienteService.atualizar(req.params.id!, req.body, ator);
    res.json(paciente);
  }),

  removerVinculo: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const paciente = await pacienteService.removerVinculo(req.params.id!, req.params.uid!, ator);
    res.json(paciente);
  }),

  deletar: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const result = await pacienteService.deletar(req.params.id!, ator);
    res.json(result);
  }),

  vinculos: asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'admin') throw new ForbiddenError('Apenas admin');
    const id = req.params.id!;
    const paciente = await pacientesRepo.findById(id);
    if (!paciente) throw new NotFoundError('Paciente nao encontrado');

    const novoCuid = req.body.cuidadorIds ?? paciente.cuidadorIds;
    const novoResp = req.body.responsavelIds ?? paciente.responsavelIds;
    const novoFam = req.body.familiarIds ?? paciente.familiarIds;

    const alterados = new Set<string>();

    const sync = async (oldIds: string[], newIds: string[]) => {
      const removed = oldIds.filter((u) => !newIds.includes(u));
      const added = newIds.filter((u) => !oldIds.includes(u));
      for (const uid of removed) {
        const u = await usuariosRepo.findById(uid);
        if (u) {
          await usuariosRepo.updatePacienteIds(uid, u.pacienteIds.filter((p) => p !== id));
          alterados.add(uid);
        }
      }
      for (const uid of added) {
        const u = await usuariosRepo.findById(uid);
        if (u && !u.pacienteIds.includes(id)) {
          await usuariosRepo.updatePacienteIds(uid, [...u.pacienteIds, id]);
          alterados.add(uid);
        }
      }
    };

    await sync(paciente.cuidadorIds, novoCuid);
    await sync(paciente.responsavelIds, novoResp);
    await sync(paciente.familiarIds, novoFam);

    // Sem isso o Firestore continua negando a leitura dos registros do paciente
    // para o usuário recém-vinculado (as claims ficam no token). Falhas aqui não
    // devem desfazer o vínculo: o app também se corrige ao abrir.
    await Promise.allSettled([...alterados].map((uid) => claimsService.atualizarClaims(uid)));

    const updated = await pacientesRepo.update(id, {
      cuidadorIds: novoCuid,
      responsavelIds: novoResp,
      familiarIds: novoFam,
    });

    await auditoriaRepo.create({
      ator: req.user!.uid,
      acao: 'vincular_paciente',
      alvo: id,
      nivel: 'info',
    });

    res.json(updated);
  }),
};
