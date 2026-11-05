import type { Request, Response } from 'express';

import { notificacaoService } from '../services/notificacao.service.js';
import { notificacoesRepo } from '../repositories/notificacoes.repo.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const notificacoesController = {
  enviar: asyncHandler(async (req: Request, res: Response) => {
    const result = await notificacaoService.enviar(req.body);
    res.json(result);
  }),

  listar: asyncHandler(async (req: Request, res: Response) => {
    const itens = await notificacoesRepo.listar(req.user!.uid);
    res.json(itens);
  }),

  marcarLida: asyncHandler(async (req: Request, res: Response) => {
    await notificacoesRepo.marcarLida(req.user!.uid, req.params.id!);
    res.json({ ok: true });
  }),

  marcarTodas: asyncHandler(async (req: Request, res: Response) => {
    const atualizadas = await notificacoesRepo.marcarTodas(req.user!.uid);
    res.json({ atualizadas });
  }),

  remover: asyncHandler(async (req: Request, res: Response) => {
    await notificacoesRepo.remover(req.user!.uid, req.params.id!);
    res.json({ id: req.params.id, deletado: true });
  }),

  limpar: asyncHandler(async (req: Request, res: Response) => {
    const removidas = await notificacoesRepo.removerTodas(req.user!.uid);
    res.json({ removidas });
  }),
};