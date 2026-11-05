import type { Request, Response } from 'express';
import { turmaService } from '../services/turma.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const turmasController = {
  listar: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role, escolaId: req.user!.escolaId };
    res.json(await turmaService.listar(ator));
  }),
  buscar: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role, escolaId: req.user!.escolaId };
    res.json(await turmaService.buscar(req.params.id!, ator));
  }),
  criar: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role, escolaId: req.user!.escolaId };
    res.status(201).json(await turmaService.criar(req.body, ator));
  }),
  atualizar: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role, escolaId: req.user!.escolaId };
    res.json(await turmaService.atualizar(req.params.id!, req.body, ator));
  }),
  remover: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role, escolaId: req.user!.escolaId };
    res.json(await turmaService.remover(req.params.id!, ator));
  }),
};
