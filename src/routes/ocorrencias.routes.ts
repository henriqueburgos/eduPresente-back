import { Router } from 'express';

import { authMiddleware, roleGuard, validate } from '../middlewares/index.js';
import { ocorrenciaController } from '../controllers/ocorrencia.controller.js';
import {
  AtualizarOcorrenciaCmdSchema,
  CriarOcorrenciaCmdSchema,
} from '../domain/schemas/commands.js';

const router = Router();
router.use(authMiddleware);

router.get('/', ocorrenciaController.listar);
router.post(
  '/',
  roleGuard('admin', 'cuidador', 'responsavel', 'familiar'),
  validate(CriarOcorrenciaCmdSchema),
  ocorrenciaController.criar,
);
router.patch(
  '/:id',
  roleGuard('admin', 'cuidador', 'responsavel', 'familiar'),
  validate(AtualizarOcorrenciaCmdSchema),
  ocorrenciaController.atualizar,
);

export default router;
