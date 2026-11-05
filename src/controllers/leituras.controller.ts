import type { Request, Response } from 'express';

import { pacientesRepo } from '../repositories/pacientes.repo.js';
import { atividadesRepo } from '../repositories/atividades.repo.js';
import { usuariosRepo } from '../repositories/usuarios.repo.js';
import { auditoriaRepo } from '../repositories/auditoria.repo.js';
import { comunicadosRepo } from '../repositories/comunicados.repo.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError, ForbiddenError } from '../domain/errors.js';

export const leiturasController = {
  pacientes: asyncHandler(async (_req: Request, res: Response) => {
    const user = _req.user!;
    let list;
    if (user.role === 'admin') list = await pacientesRepo.listOrdenadoPorNome();
    else list = await pacientesRepo.listByUsuario(user.uid);
    res.json(list);
  }),

  pacienteById: asyncHandler(async (req: Request, res: Response) => {
    const p = await pacientesRepo.findById(req.params.id!);
    if (!p) throw new NotFoundError('Paciente não encontrado');
    const user = req.user!;
    if (user.role !== 'admin') {
      let vinculado = false;
      if (user.role === 'cuidador') vinculado = p.cuidadorIds.includes(user.uid);
      else if (user.role === 'responsavel') vinculado = p.responsavelIds.includes(user.uid);
      else if (user.role === 'familiar') {
        vinculado = p.familiarIds.includes(user.uid) || p.cuidadorIds.includes(user.uid) || p.responsavelIds.includes(user.uid);
      }
      if (!vinculado) throw new ForbiddenError('Paciente não vinculado ao usuário');
    }
    res.json(p);
  }),

  atividadesByPaciente: asyncHandler(async (req: Request, res: Response) => {
    const p = await pacientesRepo.findById(req.params.id!);
    if (!p) throw new NotFoundError('Paciente não encontrado');
    const user = req.user!;
    if (user.role !== 'admin') {
      let vinculado = false;
      if (user.role === 'cuidador') vinculado = p.cuidadorIds.includes(user.uid);
      else if (user.role === 'responsavel') vinculado = p.responsavelIds.includes(user.uid);
      else if (user.role === 'familiar') {
        vinculado = p.familiarIds.includes(user.uid) || p.cuidadorIds.includes(user.uid) || p.responsavelIds.includes(user.uid);
      }
      if (!vinculado) throw new ForbiddenError('Paciente não vinculado ao usuário');
    }
    const list = await atividadesRepo.listByPaciente(req.params.id!);
    res.json(list);
  }),

  atividadesHoje: asyncHandler(async (req: Request, res: Response) => {
    const pacienteId = req.query.pacienteId as string | undefined;
    const list = await atividadesRepo.listHoje(pacienteId);
    res.json(list);
  }),

  atividadesResumo: asyncHandler(async (req: Request, res: Response) => {
    const pacienteId = req.query.pacienteId as string | undefined;
    const resumo = await atividadesRepo.resumoPorTipo(pacienteId);
    res.json(resumo);
  }),

  atividadesAll: asyncHandler(async (_req: Request, res: Response) => {
    const list = await atividadesRepo.listAll();
    res.json(list);
  }),

  usuarios: asyncHandler(async (_req: Request, res: Response) => {
    const list = await usuariosRepo.list();
    res.json(list);
  }),

  usuariosTotais: asyncHandler(async (_req: Request, res: Response) => {
    const t = await usuariosRepo.totals();
    res.json(t);
  }),

  usuarioById: asyncHandler(async (req: Request, res: Response) => {
    const u = await usuariosRepo.findById(req.params.uid!);
    if (!u) throw new NotFoundError('Usuário não encontrado');
    res.json(u);
  }),

  auditoria: asyncHandler(async (req: Request, res: Response) => {
    const nivel = req.query.nivel as 'info' | 'alerta' | 'critico' | undefined;
    const list = await auditoriaRepo.list(nivel);
    res.json(list);
  }),

  comunicados: asyncHandler(async (_req: Request, res: Response) => {
    const list = await comunicadosRepo.list();
    res.json(list);
  }),
};