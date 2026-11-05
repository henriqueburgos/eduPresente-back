import { Router } from 'express';

import { authMiddleware, roleGuard, validate } from '../middlewares/index.js';
import { ConviteCmdSchema } from '../domain/schemas/commands.js';
import { convitesController } from '../controllers/convites.controller.js';

const router = Router();
router.use(authMiddleware);
router.post('/', roleGuard('admin'), validate(ConviteCmdSchema), convitesController.convidar);

export default router;