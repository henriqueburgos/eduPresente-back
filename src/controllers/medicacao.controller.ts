import type { Request, Response } from 'express';

import { medicacaoService } from '../services/medicacao.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const medicacaoController = {
  listarPrescricoes: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const pacienteId = typeof req.query.pacienteId === 'string' ? req.query.pacienteId : undefined;
    const list = await medicacaoService.listarPrescricoes(ator, pacienteId);
    res.json(list);
  }),

  criarPrescricao: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const prescricao = await medicacaoService.criarPrescricao(req.body, ator);
    res.status(201).json(prescricao);
  }),

  atualizarPrescricao: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const prescricao = await medicacaoService.atualizarPrescricao(
      req.params.id!,
      req.body,
      ator,
    );
    res.json(prescricao);
  }),

  removerPrescricao: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const result = await medicacaoService.removerPrescricao(req.params.id!, ator);
    res.json(result);
  }),

  listarAdministracoes: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const pacienteId = typeof req.query.pacienteId === 'string' ? req.query.pacienteId : undefined;
    const de = typeof req.query.de === 'string' ? req.query.de : undefined;
    const ate = typeof req.query.ate === 'string' ? req.query.ate : undefined;
    const list = await medicacaoService.listarAdministracoes(ator, pacienteId, de, ate);
    res.json(list);
  }),

  registrarAdministracao: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const administracao = await medicacaoService.registrarAdministracao(req.body, ator);
    res.status(201).json(administracao);
  }),
};
