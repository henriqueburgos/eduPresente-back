import type { Request, Response } from 'express';

import { claimsService } from '../services/claims.service.js';
import { ForbiddenError } from '../domain/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authController = {
  renovarClaims: asyncHandler(async (req: Request, res: Response) => {
    const uid = (req.body?.uid as string | undefined) ?? req.user!.uid;
    // apenas admin pode renovar de outro usuário
    if (uid !== req.user!.uid && req.user!.role !== 'admin') {
      throw new ForbiddenError('Apenas admin pode renovar claims de terceiros');
    }
    const result = await claimsService.atualizarClaims(uid);
    res.json(result);
  }),
};