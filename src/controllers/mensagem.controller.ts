import type { Request, Response } from 'express';

import { mensagemService } from '../services/mensagem.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const mensagemController = {
  listar: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const pacienteId = typeof req.query.pacienteId === 'string' ? req.query.pacienteId : undefined;
    const list = await mensagemService.listar(ator, pacienteId);
    res.json(list);
  }),

  criar: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const mensagem = await mensagemService.criar(req.body, ator);
    res.status(201).json(mensagem);
  }),

  marcarLidas: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const result = await mensagemService.marcarLidas(req.body.pacienteId, ator);
    res.json(result);
  }),
};
