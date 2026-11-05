import { Router } from 'express';

import { authMiddleware, roleGuard, validate } from '../middlewares/index.js';
import { agendaController } from '../controllers/agenda.controller.js';
import { AtualizarAgendaCmdSchema, CriarAgendaCmdSchema } from '../domain/schemas/commands.js';

const router = Router();

// Cron externo: sem Firebase Auth, protegido por x-scheduler-key.
router.post('/disparar', agendaController.disparar);

router.use(authMiddleware);

router.get('/', agendaController.listar);
router.post(
  '/',
  roleGuard('admin', 'responsavel', 'familiar', 'cuidador'),
  validate(CriarAgendaCmdSchema),
  agendaController.criar,
);
router.patch(
  '/:id',
  roleGuard('admin', 'responsavel', 'familiar', 'cuidador'),
  validate(AtualizarAgendaCmdSchema),
  agendaController.atualizar,
);
router.delete(
  '/:id',
  roleGuard('admin', 'responsavel', 'familiar', 'cuidador'),
  agendaController.remover,
);
router.post(
  '/:id/testar',
  roleGuard('admin', 'responsavel', 'familiar', 'cuidador'),
  agendaController.testar,
);

export default router;
