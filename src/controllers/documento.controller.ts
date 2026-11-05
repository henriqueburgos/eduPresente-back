import type { Request, Response } from 'express';

import { documentoService } from '../services/documento.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const documentoController = {
  listar: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const alunoId = typeof req.query.alunoId === 'string' ? req.query.alunoId : undefined;
    const list = await documentoService.listar(ator, alunoId);
    res.json(list);
  }),

  criar: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const documento = await documentoService.criar(req.body, ator);
    res.status(201).json(documento);
  }),

  remover: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const result = await documentoService.remover(req.params.id!, ator);
    res.json(result);
  }),
};
