import type { NextFunction, Request, Response } from 'express';

import { ForbiddenError } from '../domain/errors.js';
import type { Role } from '../domain/types/roles.js';

export function roleGuard(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ForbiddenError('Usuário não autenticado'));
    }
    if (!allowed.includes(req.user.role)) {
      return next(new ForbiddenError('Perfil sem permissão para esta ação'));
    }
    next();
  };
}