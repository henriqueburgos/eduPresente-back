import rateLimit from 'express-rate-limit';

export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'RATE_LIMITED', message: 'Muitas requisições, tente novamente mais tarde' },
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'RATE_LIMITED', message: 'Muitas tentativas de autenticação' },
});

/** Landing page: limita envios de lead por IP sem atrapalhar navegação normal. */
export const leadRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'RATE_LIMITED',
    message: 'Muitos envios em pouco tempo. Tente novamente em alguns minutos.',
  },
});