import { Router } from 'express';

import { authMiddleware, validate } from '../middlewares/index.js';
import { RenovarClaimsCmdSchema } from '../domain/schemas/commands.js';
import { authController } from '../controllers/auth.controller.js';

const router = Router();
router.use(authMiddleware);
router.post('/claims/renovar', validate(RenovarClaimsCmdSchema), authController.renovarClaims);

export default router;