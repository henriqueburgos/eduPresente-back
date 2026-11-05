# Backend — eduPresente

Backend em Node.js + TypeScript + Firebase Admin SDK (GCP) que abastece o app "eduPresente".

## Requisitos
- Node.js >= 20
- Projeto Firebase/GCP com Auth, Firestore (e opcionalmente Storage, RTDB, Messaging)

## Setup
```bash
cp .env.example .env
# preencha .env (GOOGLE_APPLICATION_CREDENTIALS ou FIREBASE_SERVICE_ACCOUNT_JSON + FIREBASE_PROJECT_ID)
npm install
npm run dev
```

## Scripts
- `npm run dev` — servidor em watch (tsx)
- `npm run build` / `npm start` — produção
- `npm run seed` — popula dados demo
- `npm test` — testes (Vitest)
- `npm run typecheck` — tsc --noEmit

## Emuladores (dev)
Defina `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST` etc. no `.env` para usar o Firebase Emulator Suite.

## Endpoints
Leitura (requer Bearer token):
- `GET /pacientes`, `GET /pacientes/:id`
- `POST /pacientes` (admin/responsavel/familiar) — criar paciente (limite 1 para responsavel/familiar)
- `PATCH /pacientes/:id` (admin) — atualizar dados básicos `{ nome?, idade?, quarto?, condicoes? }`
- `PATCH /pacientes/:id/vinculos` (admin) — `{ cuidadorIds?, responsavelIds?, familiarIds? }` (sincroniza usuários)
- `DELETE /pacientes/:id/vinculos/:uid` (admin) — remover vínculo individual
- `DELETE /pacientes/:id` (admin) — deletar paciente (hard delete, remove atividades, estoque e vínculos)
- `GET /atividades`, `GET /atividades/hoje`, `GET /atividades/resumo`, `GET /atividades/paciente/:id`
- `GET /estoque?pacienteId=`, `GET /estoque/:id`
- `GET /usuarios`, `GET /usuarios/totais`, `GET /usuarios/:uid`
- `GET /auditoria?nivel=info|alerta|critico`
- `GET /comunicados`

Escrita (commands):
- `POST /atividades` — RegistrarAtividadeCmd
- `POST /convites` — ConviteCmd (admin)
- `PATCH /usuarios/:uid` `{ ativo: boolean }` (admin)
- `DELETE /usuarios/:uid` (admin, hard delete)
- `POST /auth/claims/renovar` - `{ uid? }`
- `POST /usuarios/:uid/token-fcm` - registrar token FCM (remove o mesmo token de outras contas do navegador)
- `DELETE /usuarios/:uid/token-fcm` - remover token FCM
- `POST /notificacoes` (admin) - enviar push `{ uid?, token?, title, body, data?, icon?, badge?, link? }`
- `POST /estoque` (admin/responsavel/familiar) - criar material
- `PATCH /estoque/:id` (admin/responsavel/familiar) - atualizar campos parciais
- `PATCH /estoque/:id/movimentacao` (admin/responsavel/familiar) - `{ tipo: 'entrada'|'saida', quantidade }`
- `DELETE /estoque/:id` (admin/responsavel/familiar) - remover material

## Seed demo
```bash
npm run seed
```
Cria contas (senha `PresenteSempre!2026`):
- cuidador@presentesempre.app (Marina Alves) — cuidador
- cuidador2@presentesempre.app (Carlos Mendes) — cuidador
- responsavel@presentesempre.app (Helena Duarte) — responsavel
- responsavel2@presentesempre.app (Roberto Ferraz) — responsavel
- responsavel3@presentesempre.app (Ana Ramos) — responsavel
- admin@presentesempre.app (Cláudia Menezes) — admin

Pacientes: pac-1, pac-2, pac-3. Atividades, comunicados e auditoria iniciais.

## Estrutura
Ver `PLAN.md`.
```