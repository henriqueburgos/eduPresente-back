import { Router } from 'express';

import { authMiddleware, roleGuard } from '../middlewares/index.js';
import { turmasController } from '../controllers/turmas.controller.js';

const router = Router();
router.use(authMiddleware);

router.get('/', turmasController.listar);
router.get('/:id', turmasController.buscar);
router.post('/', roleGuard('admin'), turmasController.criar);
router.patch('/:id', roleGuard('admin'), turmasController.atualizar);
router.delete('/:id', roleGuard('admin'), turmasController.remover);

export default router;
