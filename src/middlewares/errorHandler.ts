import type { ErrorRequestHandler } from 'express';

import { DomainError } from '../domain/errors.js';
import { logger } from '../utils/logger.js';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof DomainError) {
    res.status(err.status).json({ error: err.code, message: err.message });
    return;
  }

  // ZodError (caso não capturado pelo validate)
  if (err?.name === 'ZodError') {
    res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Dados inválidos', details: err.issues });
    return;
  }

  // Firebase Admin errors
  if (typeof err?.code === 'string' && err.code.startsWith('auth/')) {
    const map: Record<string, number> = {
      'auth/user-not-found': 404,
      'auth/email-already-exists': 409,
      'auth/invalid-email': 422,
      'auth/weak-password': 422,
      'auth/id-token-expired': 401,
      'auth/id-token-revoked': 401,
      'auth/invalid-id-token': 401,
    };
    const status = map[err.code] ?? 400;
    res.status(status).json({ error: err.code.toUpperCase().replace(/\//g, '_'), message: err.message });
    return;
  }

  logger.error({ err, path: req.path, method: req.method }, 'Erro não tratado');
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro interno do servidor' });
};