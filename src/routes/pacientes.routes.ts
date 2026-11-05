import { Router } from 'express';

import { authMiddleware, roleGuard, validate } from '../middlewares/index.js';
import { leiturasController } from '../controllers/leituras.controller.js';
import { pacientesController } from '../controllers/pacientes.controller.js';
import { CriarPacienteCmdSchema, AtualizarPacienteCmdSchema } from '../domain/schemas/commands.js';

const router = Router();
router.use(authMiddleware);

router.get('/', leiturasController.pacientes);
router.get('/:id', leiturasController.pacienteById);
router.post('/', roleGuard('admin', 'responsavel', 'familiar'), validate(CriarPacienteCmdSchema), pacientesController.criar);
router.patch('/:id', roleGuard('admin', 'responsavel', 'familiar'), validate(AtualizarPacienteCmdSchema), pacientesController.atualizar);
router.patch('/:id/vinculos', roleGuard('admin'), pacientesController.vinculos);
router.delete('/:id/vinculos/:uid', roleGuard('admin'), pacientesController.removerVinculo);
router.delete('/:id', roleGuard('admin'), pacientesController.deletar);

export default router;