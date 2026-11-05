import { Router } from 'express';

import { authMiddleware, roleGuard, validate } from '../middlewares/index.js';
import { RegistrarAtividadeCmdSchema } from '../domain/schemas/commands.js';
import { atividadesController } from '../controllers/atividades.controller.js';
import { leiturasController } from '../controllers/leituras.controller.js';

const router = Router();

router.use(authMiddleware);

router.post('/', roleGuard('admin', 'professor', 'responsavel', 'responsavel'), validate(RegistrarAtividadeCmdSchema), atividadesController.registrar);

router.get('/', roleGuard('admin'), leiturasController.atividadesAll);
router.get('/hoje', leiturasController.atividadesHoje);
router.get('/resumo', leiturasController.atividadesResumo);
router.get('/paciente/:id', leiturasController.atividadesByAluno);

export default router;