import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

import { ValidationError } from '../domain/errors.js';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return next(new ValidationError(`Dados inválidos: ${JSON.stringify(details)}`));
    }
    req.body = result.data;
    next();
  };
}