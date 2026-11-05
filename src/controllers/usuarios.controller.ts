import type { Request, Response } from 'express';

import { usuarioService } from '../services/usuario.service.js';
import { usuariosRepo } from '../repositories/usuarios.repo.js';
import { ForbiddenError } from '../domain/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const usuariosController = {
  patchAtivo: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const updated = await usuarioService.ativarDesativar(req.params.uid!, req.body.ativo, ator);
    res.json(updated);
  }),

  deleteUsuario: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const result = await usuarioService.deletar(req.params.uid!, ator);
    res.json(result);
  }),

  addToken: asyncHandler(async (req: Request, res: Response) => {
    // usuário pode registrar próprio token; admin pode de terceiros
    const uid = req.params.uid!;
    if (uid !== req.user!.uid && req.user!.role !== 'admin') {
      throw new ForbiddenError('Sem permissão');
    }
    const updated = await usuariosRepo.addFcmToken(uid, req.body.token);
    res.json(updated);
  }),

  removeToken: asyncHandler(async (req: Request, res: Response) => {
    const uid = req.params.uid!;
    if (uid !== req.user!.uid && req.user!.role !== 'admin') {
      throw new ForbiddenError('Sem permissão');
    }
    const updated = await usuariosRepo.removeFcmToken(uid, req.body.token);
    res.json(updated);
  }),
};