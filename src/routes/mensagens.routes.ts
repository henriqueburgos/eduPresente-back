import { Router } from 'express';

import { authMiddleware, roleGuard, validate } from '../middlewares/index.js';
import { mensagemController } from '../controllers/mensagem.controller.js';
import {
  CriarMensagemCmdSchema,
  MarcarMensagensLidasCmdSchema,
} from '../domain/schemas/commands.js';

const router = Router();
router.use(authMiddleware);

router.get('/', mensagemController.listar);
router.post(
  '/',
  roleGuard('admin', 'professor', 'responsavel', 'responsavel'),
  validate(CriarMensagemCmdSchema),
  mensagemController.criar,
);
router.post(
  '/marcar-lidas',
  roleGuard('admin', 'professor', 'responsavel', 'responsavel'),
  validate(MarcarMensagensLidasCmdSchema),
  mensagemController.marcarLidas,
);

export default router;
