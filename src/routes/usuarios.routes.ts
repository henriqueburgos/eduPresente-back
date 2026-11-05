import { Router } from 'express';

import { authMiddleware, roleGuard, validate } from '../middlewares/index.js';
import { PatchUsuarioCmdSchema } from '../domain/schemas/commands.js';
import { usuariosController } from '../controllers/usuarios.controller.js';
import { leiturasController } from '../controllers/leituras.controller.js';

const router = Router();
router.use(authMiddleware);

router.get('/', roleGuard('admin'), leiturasController.usuarios);
router.get('/totais', roleGuard('admin'), leiturasController.usuariosTotais);
router.get('/:uid', leiturasController.usuarioById);
router.patch('/:uid', roleGuard('admin'), validate(PatchUsuarioCmdSchema), usuariosController.patchAtivo);
router.delete('/:uid', roleGuard('admin'), usuariosController.deleteUsuario);
router.post('/:uid/token-fcm', usuariosController.addToken);
router.delete('/:uid/token-fcm', usuariosController.removeToken);

export default router;