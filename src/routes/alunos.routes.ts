import { Router } from 'express';

import { authMiddleware, roleGuard, validate } from '../middlewares/index.js';
import { leiturasController } from '../controllers/leituras.controller.js';
import { alunosController } from '../controllers/alunos.controller.js';
import { CriarAlunoCmdSchema, AtualizarAlunoCmdSchema } from '../domain/schemas/commands.js';

const router = Router();
router.use(authMiddleware);

router.get('/', leiturasController.pacientes);
router.get('/:id', leiturasController.pacienteById);
router.post('/', roleGuard('admin', 'responsavel', 'responsavel'), validate(CriarAlunoCmdSchema), alunosController.criar);
router.patch('/:id', roleGuard('admin', 'responsavel', 'responsavel'), validate(AtualizarAlunoCmdSchema), alunosController.atualizar);
router.patch('/:id/vinculos', roleGuard('admin'), alunosController.vinculos);
router.delete('/:id/vinculos/:uid', roleGuard('admin'), alunosController.removerVinculo);
router.delete('/:id', roleGuard('admin'), alunosController.deletar);

export default router;