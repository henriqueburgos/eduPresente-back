import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';

import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import './config/firebase.js';
import { requestLogger, errorHandler } from './middlewares/index.js';
import { apiRateLimit } from './middlewares/rateLimit.js';
import routes from './routes/index.js';
import { agendaService } from './services/agenda.service.js';
import { medicacaoService } from './services/medicacao.service.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

const app = express();

app.use(helmet());
const origensPadrao = [
  'https://presentesempre.com.br',
  'https://www.presentesempre.com.br',
  'https://presentesempre.web.app',
  'https://lp.presentesempre.com.br',
  'https://presente-sempre-lp.web.app',
];
const allowedOrigins = [
  ...new Set([
    ...origensPadrao,
    ...env.CORS_ORIGINS.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((o) => (/^https?:\/\//i.test(o) ? o : `https://${o}`)),
  ]),
];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);
app.use(apiRateLimit);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: env.NODE_ENV, timestamp: new Date().toISOString() });
});

app.use(routes);
app.get('/openapi.json', (_req, res) => res.json(swaggerSpec));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use((_req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Rota não encontrada' });
});

app.use(errorHandler);

let server: ReturnType<typeof app.listen> | undefined;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'Servidor iniciado');
  });

  // Dispara lembretes vencidos enquanto o serviço estiver acordado.
  // Em produção com instância que hiberna, use também um cron externo
  // chamando POST /agenda/disparar com o header x-scheduler-key.
  setInterval(() => {
    void agendaService.dispararLembretes().catch((erro) => {
      logger.error({ erro }, 'Falha ao disparar lembretes da agenda');
    });
    void medicacaoService.verificarAtrasos().catch((erro) => {
      logger.error({ erro }, 'Falha ao verificar atrasos de medicação');
    });
  }, 60_000);
}

process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido, encerrando...');
  if (server) server.close(() => process.exit(0));
});

export { app };