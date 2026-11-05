import { Router } from 'express';

import { authMiddleware, roleGuard, validate } from '../middlewares/index.js';
import { documentoController } from '../controllers/documento.controller.js';
import { CriarDocumentoCmdSchema } from '../domain/schemas/commands.js';

const router = Router();
router.use(authMiddleware);

router.get('/', documentoController.listar);
router.post(
  '/',
  roleGuard('admin', 'professor', 'responsavel', 'responsavel'),
  validate(CriarDocumentoCmdSchema),
  documentoController.criar,
);
router.delete(
  '/:id',
  roleGuard('admin', 'professor', 'responsavel', 'responsavel'),
  documentoController.remover,
);

export default router;
