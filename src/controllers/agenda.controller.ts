import type { Request, Response } from 'express';

import { agendaService } from '../services/agenda.service.js';
import { ForbiddenError } from '../domain/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const agendaController = {
  listar: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const alunoId = typeof req.query.alunoId === 'string' ? req.query.alunoId : undefined;
    const itens = await agendaService.listar(ator, alunoId);
    res.json(itens);
  }),

  criar: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const item = await agendaService.criar(req.body, ator);
    res.status(201).json(item);
  }),

  atualizar: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const item = await agendaService.atualizar(req.params.id!, req.body, ator);
    res.json(item);
  }),

  remover: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const result = await agendaService.remover(req.params.id!, ator);
    res.json(result);
  }),

  testar: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const result = await agendaService.testar(req.params.id!, ator);
    res.json(result);
  }),

  /** Chamado por um cron externo. Protegido por segredo, sem Firebase Auth. */
  disparar: asyncHandler(async (req: Request, res: Response) => {
    const esperado = process.env.SCHEDULER_KEY ?? '';
    const recebido = req.header('x-scheduler-key') ?? '';
    if (!esperado || recebido !== esperado) {
      throw new ForbiddenError('Agendador não autorizado');
    }
    const result = await agendaService.dispararLembretes();
    res.json(result);
  }),
};
