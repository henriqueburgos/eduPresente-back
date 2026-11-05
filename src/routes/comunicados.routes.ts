import { Router } from 'express';

import { authMiddleware } from '../middlewares/index.js';
import { leiturasController } from '../controllers/leituras.controller.js';

const router = Router();
router.use(authMiddleware);
router.get('/', leiturasController.comunicados);

export default router;