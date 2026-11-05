import type { Request, Response } from 'express';
import { escolaService } from '../services/escola.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const escolasController = {
  listar: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await escolaService.listar());
  }),
  buscar: asyncHandler(async (req: Request, res: Response) => {
    res.json(await escolaService.buscar(req.params.id!));
  }),
  criar: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    res.status(201).json(await escolaService.criar(req.body, ator));
  }),
  atualizar: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    res.json(await escolaService.atualizar(req.params.id!, req.body, ator));
  }),
};
