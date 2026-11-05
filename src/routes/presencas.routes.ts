import { Router } from 'express';

import { authMiddleware, roleGuard } from '../middlewares/index.js';
import { presencasController } from '../controllers/presencas.controller.js';

const router = Router();
router.use(authMiddleware);

router.get('/turma/:turmaId', presencasController.listarTurmaDia);
router.get('/aluno/:alunoId', presencasController.listarAluno);
router.post('/', roleGuard('admin', 'professor'), presencasController.registrar);

export default router;
