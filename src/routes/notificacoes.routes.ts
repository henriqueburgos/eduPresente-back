import { Router } from 'express';

import { authMiddleware, roleGuard } from '../middlewares/index.js';
import { notificacoesController } from '../controllers/notificacoes.controller.js';

const router = Router();
router.use(authMiddleware);
router.get('/', notificacoesController.listar);
router.post('/', roleGuard('admin'), notificacoesController.enviar);
router.post('/marcar-todas', notificacoesController.marcarTodas);
router.patch('/:id/lida', notificacoesController.marcarLida);
router.delete('/:id', notificacoesController.remover);
router.delete('/', notificacoesController.limpar);

export default router;