import { Router } from 'express';

import { authMiddleware, roleGuard, validate } from '../middlewares/index.js';
import { medicacaoController } from '../controllers/medicacao.controller.js';
import {
  AtualizarPrescricaoCmdSchema,
  CriarPrescricaoCmdSchema,
  RegistrarAdministracaoCmdSchema,
} from '../domain/schemas/commands.js';

const router = Router();
router.use(authMiddleware);

router.get('/prescricoes', medicacaoController.listarPrescricoes);
router.post(
  '/prescricoes',
  roleGuard('admin', 'responsavel', 'responsavel'),
  validate(CriarPrescricaoCmdSchema),
  medicacaoController.criarPrescricao,
);
router.patch(
  '/prescricoes/:id',
  roleGuard('admin', 'responsavel', 'responsavel'),
  validate(AtualizarPrescricaoCmdSchema),
  medicacaoController.atualizarPrescricao,
);
router.delete(
  '/prescricoes/:id',
  roleGuard('admin', 'responsavel', 'responsavel'),
  medicacaoController.removerPrescricao,
);

router.get('/administracoes', medicacaoController.listarAdministracoes);
router.post(
  '/administracoes',
  roleGuard('admin', 'professor', 'responsavel', 'responsavel'),
  validate(RegistrarAdministracaoCmdSchema),
  medicacaoController.registrarAdministracao,
);

export default router;
