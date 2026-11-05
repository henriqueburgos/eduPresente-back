import type { Request, Response } from 'express';

import { atividadeService } from '../services/atividade.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const atividadesController = {
  registrar: asyncHandler(async (req: Request, res: Response) => {
    const ator = {
      uid: req.user!.uid,
      nome: req.user!.email ?? req.user!.uid,
      role: req.user!.role,
    };
    // busca nome real do usuário
    const { usuariosRepo } = await import('../repositories/usuarios.repo.js');
    const u = await usuariosRepo.findById(ator.uid);
    if (u) ator.nome = u.nome;
    const atividade = await atividadeService.registrar(req.body, ator);
    res.status(201).json(atividade);
  }),
};