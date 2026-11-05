import { Router } from 'express';

import { authMiddleware, roleGuard } from '../middlewares/index.js';
import { relatorioController } from '../controllers/relatorio.controller.js';

const router = Router();
router.use(authMiddleware);

router.get(
  '/paciente/:id.pdf',
  roleGuard('admin', 'professor', 'responsavel', 'responsavel'),
  relatorioController.paciente,
);

export default router;
