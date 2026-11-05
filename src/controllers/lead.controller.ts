import type { Request, Response } from 'express';

import { leadService } from '../services/lead.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const leadController = {
  criar: asyncHandler(async (req: Request, res: Response) => {
    const resultado = await leadService.criar(req.body);
    res.status(201).json(resultado);
  }),

  listar: asyncHandler(async (_req: Request, res: Response) => {
    const leads = await leadService.listar();
    res.json(leads);
  }),

  atualizar: asyncHandler(async (req: Request, res: Response) => {
    const lead = await leadService.atualizarStatus(req.params.id!, req.body.status);
    res.json(lead);
  }),

  remover: asyncHandler(async (req: Request, res: Response) => {
    await leadService.remover(req.params.id!);
    res.json({ id: req.params.id, deletado: true });
  }),
};
