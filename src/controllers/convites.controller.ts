import type { Request, Response } from 'express';

import { conviteService } from '../services/convite.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const convitesController = {
  convidar: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };
    const result = await conviteService.convidar(req.body, ator);
    res.status(201).json(result);
  }),
};