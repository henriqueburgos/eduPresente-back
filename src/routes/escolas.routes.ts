import { Router } from 'express';

import { authMiddleware, roleGuard } from '../middlewares/index.js';
import { escolasController } from '../controllers/escolas.controller.js';

const router = Router();
router.use(authMiddleware);

router.get('/', escolasController.listar);
router.get('/:id', escolasController.buscar);
router.post('/', roleGuard('admin'), escolasController.criar);
router.patch('/:id', roleGuard('admin'), escolasController.atualizar);

export default router;
