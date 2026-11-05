import { Router } from 'express';

import { authMiddleware, roleGuard } from '../middlewares/index.js';
import { leiturasController } from '../controllers/leituras.controller.js';

const router = Router();
router.use(authMiddleware);
router.get('/', roleGuard('admin'), leiturasController.auditoria);

export default router;