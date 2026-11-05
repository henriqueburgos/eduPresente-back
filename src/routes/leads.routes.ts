import { Router } from 'express';

import { authMiddleware, roleGuard, validate } from '../middlewares/index.js';
import { leadRateLimit } from '../middlewares/rateLimit.js';
import { leadController } from '../controllers/lead.controller.js';
import { AtualizarLeadCmdSchema, CriarLeadCmdSchema } from '../domain/schemas/leads.js';

const router = Router();

// Público: usado pelo formulário da landing page.
router.post('/', leadRateLimit, validate(CriarLeadCmdSchema), leadController.criar);

// Administração.
router.get('/', authMiddleware, roleGuard('admin'), leadController.listar);
router.patch(
  '/:id',
  authMiddleware,
  roleGuard('admin'),
  validate(AtualizarLeadCmdSchema),
  leadController.atualizar,
);
router.delete('/:id', authMiddleware, roleGuard('admin'), leadController.remover);

export default router;
