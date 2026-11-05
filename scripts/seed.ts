import 'dotenv/config';

import { auth as firebaseAuth } from '../src/config/firebase.js';
import { db } from '../src/repositories/base.js';
import { pacientesRepo } from '../src/repositories/pacientes.repo.js';
import { usuariosRepo } from '../src/repositories/usuarios.repo.js';
import { atividadesRepo } from '../src/repositories/atividades.repo.js';
import { comunicadosRepo } from '../src/repositories/comunicados.repo.js';
import { auditoriaRepo } from '../src/repositories/auditoria.repo.js';

const DEMO_PASSWORD = 'PresenteSempre!2026';

interface SeedUser {
  uid: string;
  email: string;
  nome: string;
  role: 'admin' | 'cuidador' | 'responsavel' | 'familiar';
  pacienteIds: string[];
}

const USERS: SeedUser[] = [
  { uid: 'usr-cuid-1', email: 'cuidador@presentesempre.app', nome: 'Marina Alves', role: 'cuidador', pacienteIds: ['pac-1', 'pac-2'] },
  { uid: 'usr-cuid-2', email: 'cuidador2@presentesempre.app', nome: 'Carlos Mendes', role: 'cuidador', pacienteIds: ['pac-2', 'pac-3'] },
  { uid: 'usr-resp-1', email: 'responsavel@presentesempre.app', nome: 'Helena Duarte', role: 'responsavel', pacienteIds: ['pac-1'] },
  { uid: 'usr-resp-2', email: 'responsavel2@presentesempre.app', nome: 'Roberto Ferraz', role: 'responsavel', pacienteIds: ['pac-2'] },
  { uid: 'usr-resp-3', email: 'responsavel3@presentesempre.app', nome: 'Ana Ramos', role: 'responsavel', pacienteIds: ['pac-3'] },
  { uid: 'usr-fam-1', email: 'familiar@presentesempre.app', nome: 'João Duarte', role: 'familiar', pacienteIds: ['pac-1'] },
  { uid: 'usr-admin-1', email: 'admin@presentesempre.app', nome: 'Cláudia Menezes', role: 'admin', pacienteIds: [] },
];

async function upsertAuthUser(u: SeedUser) {
  try {
    await firebaseAuth.getUser(u.uid);
    await firebaseAuth.updateUser(u.uid, { email: u.email, displayName: u.nome, disabled: false });
  } catch {
    await firebaseAuth.createUser({ uid: u.uid, email: u.email, password: DEMO_PASSWORD, displayName: u.nome, disabled: false });
  }
  await firebaseAuth.setCustomUserClaims(u.uid, { role: u.role, pacienteIds: u.pacienteIds });
}

async function run() {
  console.log('🌱 Seed iniciando...');

  // Usuários
  for (const u of USERS) {
    await upsertAuthUser(u);
    await usuariosRepo.create({
      uid: u.uid,
      nome: u.nome,
      email: u.email,
      role: u.role,
      pacienteIds: u.pacienteIds,
      ativo: true,
    }).catch(async () => {
      await db.collection('usuarios').doc(u.uid).set(
        { nome: u.nome, email: u.email, role: u.role, pacienteIds: u.pacienteIds, ativo: true },
        { merge: true },
      );
    });
    console.log(`  ✓ usuário ${u.uid} (${u.role})`);
  }

  // Pacientes
  const pacientes = [
    { id: 'pac-1', nome: 'Alzira Nogueira', idade: 84, quarto: '102-A', condicoes: ['Hipertensão', 'Diabetes'], responsavelIds: ['usr-resp-1'], cuidadorIds: ['usr-cuid-1'], familiarIds: ['usr-fam-1'], entradaEm: '2024-01-15' },
    { id: 'pac-2', nome: 'Osvaldo Ferraz', idade: 78, quarto: '105-B', condicoes: ['Alzheimer leve'], responsavelIds: ['usr-resp-2'], cuidadorIds: ['usr-cuid-1', 'usr-cuid-2'], familiarIds: [], entradaEm: '2024-02-03' },
    { id: 'pac-3', nome: 'Maria Aparecida Ramos', idade: 91, quarto: '201-A', condicoes: ['Mobilidade reduzida'], responsavelIds: ['usr-resp-3'], cuidadorIds: ['usr-cuid-2'], familiarIds: [], entradaEm: '2024-03-10' },
  ];
  for (const p of pacientes) {
    await db.collection('pacientes').doc(p.id).set(p, { merge: true });
    console.log(`  ✓ paciente ${p.id}`);
  }

  // Atividades iniciais
  const atividades = [
    { id: 'ativ-1', pacienteId: 'pac-1', tipo: 'alimentacao', descricao: 'Café da manhã completo', autorUid: 'usr-cuid-1', autorNome: 'Marina Alves', criadoEm: new Date().toISOString() },
    { id: 'ativ-2', pacienteId: 'pac-1', tipo: 'medicacao', descricao: 'Losartana 50mg', autorUid: 'usr-cuid-1', autorNome: 'Marina Alves', criadoEm: new Date(Date.now() - 3600_000).toISOString() },
    { id: 'ativ-3', pacienteId: 'pac-2', tipo: 'higiene', descricao: 'Banho completo', autorUid: 'usr-cuid-2', autorNome: 'Carlos Mendes', criadoEm: new Date(Date.now() - 7200_000).toISOString() },
    { id: 'ativ-4', pacienteId: 'pac-3', tipo: 'ocorrencia', descricao: 'Queda leve sem ferimentos', autorUid: 'usr-cuid-2', autorNome: 'Carlos Mendes', criadoEm: new Date(Date.now() - 10800_000).toISOString() },
  ];
  for (const a of atividades) {
    await db.collection('atividades').doc(a.id).set(a, { merge: true });
  }
  console.log(`  ✓ ${atividades.length} atividades`);

  // Comunicados
  const comunicados = [
    { id: 'com-1', titulo: 'Aviso: visita restrita', corpo: 'Visitas suspensas até sexta-feira.', autor: 'Cláudia Menezes', criadoEm: new Date().toISOString(), fixado: true },
    { id: 'com-2', titulo: 'Campanha de vacinação', corpo: 'Vacinação de gripe disponível para todos os pacientes.', autor: 'Cláudia Menezes', criadoEm: new Date(Date.now() - 86400_000).toISOString(), fixado: false },
  ];
  for (const c of comunicados) {
    await db.collection('comunicados').doc(c.id).set(c, { merge: true });
  }
  console.log(`  ✓ ${comunicados.length} comunicados`);

  // Auditoria
  await auditoriaRepo.create({ ator: 'usr-admin-1', acao: 'seed_inicial', alvo: 'sistema', nivel: 'info' });

  console.log('✅ Seed concluído.');
  console.log(`   Senha demo para todas as contas: ${DEMO_PASSWORD}`);
}

run().then(() => process.exit(0)).catch((err) => {
  console.error('Seed falhou:', err);
  process.exit(1);
});