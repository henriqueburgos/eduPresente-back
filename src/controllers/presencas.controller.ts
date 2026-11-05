import type { Request, Response } from 'express';
import { presencaService } from '../services/presenca.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const presencasController = {
  listarTurmaDia: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role, escolaId: req.user!.escolaId };
    res.json(await presencaService.listarPorTurmaDia(req.params.turmaId!, String(req.query.data ?? new Date().toISOString().slice(0, 10)), ator));
  }),
  listarAluno: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role, escolaId: req.user!.escolaId };
    res.json(await presencaService.listarPorAluno(req.params.alunoId!, ator));
  }),
  registrar: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role, escolaId: req.user!.escolaId };
    res.status(201).json(await presencaService.registrar(req.body, ator));
  }),
};
