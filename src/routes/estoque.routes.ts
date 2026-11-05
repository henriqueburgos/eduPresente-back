import { Router } from 'express';

import { authMiddleware, roleGuard, validate } from '../middlewares/index.js';
import { estoqueController } from '../controllers/estoque.controller.js';
import {
  AtualizarMaterialCmdSchema,
  CriarMaterialCmdSchema,
  MovimentarEstoqueCmdSchema,
} from '../domain/schemas/commands.js';

const router = Router();
router.use(authMiddleware);

router.get('/', estoqueController.listar);
router.get('/:id', estoqueController.buscarPorId);

router.post(
  '/',
  roleGuard('admin', 'responsavel', 'responsavel'),
  validate(CriarMaterialCmdSchema),
  estoqueController.criar,
);
router.patch(
  '/:id/movimentacao',
  roleGuard('admin', 'responsavel', 'responsavel'),
  validate(MovimentarEstoqueCmdSchema),
  estoqueController.movimentar,
);
router.patch(
  '/:id',
  roleGuard('admin', 'responsavel', 'responsavel'),
  validate(AtualizarMaterialCmdSchema),
  estoqueController.atualizar,
);
router.delete('/:id', roleGuard('admin', 'responsavel', 'responsavel'), estoqueController.remover);

export default router;
