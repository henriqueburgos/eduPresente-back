import type { Request, Response } from 'express';

import { ocorrenciaService } from '../services/ocorrencia.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const ocorrenciaController = {
  listar: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const alunoId = typeof req.query.alunoId === 'string' ? req.query.alunoId : undefined;
    const list = await ocorrenciaService.listar(ator, alunoId);
    res.json(list);
  }),

  criar: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const ocorrencia = await ocorrenciaService.criar(req.body, ator);
    res.status(201).json(ocorrencia);
  }),

  atualizar: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const ocorrencia = await ocorrenciaService.atualizar(req.params.id!, req.body, ator);
    res.json(ocorrencia);
  }),
};
