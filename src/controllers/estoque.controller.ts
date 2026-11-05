import type { Request, Response } from 'express';

import { estoqueService } from '../services/estoque.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const estoqueController = {
  criar: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const material = await estoqueService.criar(req.body, ator);
    res.status(201).json(material);
  }),

  listar: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const alunoId = typeof req.query.alunoId === 'string' ? req.query.alunoId : undefined;
    const list = await estoqueService.listar(ator, alunoId);
    res.json(list);
  }),

  buscarPorId: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const material = await estoqueService.buscarPorId(req.params.id!, ator);
    res.json(material);
  }),

  atualizar: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const material = await estoqueService.atualizar(req.params.id!, req.body, ator);
    res.json(material);
  }),

  movimentar: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const material = await estoqueService.movimentar(req.params.id!, req.body, ator);
    res.json(material);
  }),

  remover: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const result = await estoqueService.remover(req.params.id!, ator);
    res.json(result);
  }),
};
