import { Router } from 'express';

import atividadesRoutes from './atividades.routes.js';
import convitesRoutes from './convites.routes.js';
import usuariosRoutes from './usuarios.routes.js';
import alunosRoutes from './alunos.routes.js';
import auditoriaRoutes from './auditoria.routes.js';
import comunicadosRoutes from './comunicados.routes.js';
import authRoutes from './auth.routes.js';
import notificacoesRoutes from './notificacoes.routes.js';
import estoqueRoutes from './estoque.routes.js';
import agendaRoutes from './agenda.routes.js';
import medicacaoRoutes from './medicacao.routes.js';
import ocorrenciasRoutes from './ocorrencias.routes.js';
import documentosRoutes from './documentos.routes.js';
import mensagensRoutes from './mensagens.routes.js';
import relatoriosRoutes from './relatorios.routes.js';
import leadsRoutes from './leads.routes.js';

const router = Router();

router.use('/atividades', atividadesRoutes);
router.use('/convites', convitesRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/alunos', alunosRoutes);
router.use('/auditoria', auditoriaRoutes);
router.use('/comunicados', comunicadosRoutes);
router.use('/auth', authRoutes);
router.use('/notificacoes', notificacoesRoutes);
router.use('/estoque', estoqueRoutes);
router.use('/agenda', agendaRoutes);
router.use('/medicacao', medicacaoRoutes);
router.use('/ocorrencias', ocorrenciasRoutes);
router.use('/documentos', documentosRoutes);
router.use('/mensagens', mensagensRoutes);
router.use('/relatorios', relatoriosRoutes);
router.use('/leads', leadsRoutes);

export default router;