import type { NextFunction, Request, Response } from 'express';

import { auth as firebaseAuth } from '../config/firebase.js';
import { UnauthorizedError } from '../domain/errors.js';
import type { Role } from '../domain/types/roles.js';
import { isRole } from '../domain/types/roles.js';
import { logger } from '../utils/logger.js';

export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Token Bearer ausente'));
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    const role: Role = isRole(decoded.role) ? decoded.role : 'responsavel';
    const escolaId = typeof decoded.escolaId === 'string' ? decoded.escolaId : '';
    const alunoIds = Array.isArray(decoded.alunoIds)
      ? (decoded.alunoIds as unknown[]).filter((v): v is string => typeof v === 'string')
      : [];
    const user: NonNullable<Request['user']> = {
      uid: decoded.uid,
      role,
      escolaId,
      alunoIds,
    };
    if (decoded.email) user.email = decoded.email;
    req.user = user;
    next();
  } catch (err) {
    logger.warn({ err }, 'Falha ao verificar token');
    next(new UnauthorizedError('Token inválido ou expirado'));
  }
}