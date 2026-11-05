import { existsSync } from 'node:fs';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getDatabase, type Database } from 'firebase-admin/database';
import { getMessaging } from 'firebase-admin/messaging';

import { env } from './env.js';
import { logger } from '../utils/logger.js';

type AppOpts = {
  credential: ReturnType<typeof applicationDefault>;
  projectId?: string;
  databaseURL?: string;
};

function baseOpts(credential: ReturnType<typeof applicationDefault>): AppOpts {
  const opts: AppOpts = { credential };
  if (env.FIREBASE_PROJECT_ID) opts.projectId = env.FIREBASE_PROJECT_ID;
  if (env.FIREBASE_DATABASE_URL) opts.databaseURL = env.FIREBASE_DATABASE_URL;
  return opts;
}

function initApp() {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  // Emuladores
  if (env.FIRESTORE_EMULATOR_HOST) process.env.FIRESTORE_EMULATOR_HOST = env.FIRESTORE_EMULATOR_HOST;
  if (env.FIREBASE_AUTH_EMULATOR_HOST) process.env.FIREBASE_AUTH_EMULATOR_HOST = env.FIREBASE_AUTH_EMULATOR_HOST;
  if (env.FIREBASE_STORAGE_EMULATOR_HOST) process.env.FIREBASE_STORAGE_EMULATOR_HOST = env.FIREBASE_STORAGE_EMULATOR_HOST;

  // Prioriza arquivo de service account (Render Secret Files / GOOGLE_APPLICATION_CREDENTIALS)
  if (env.GOOGLE_APPLICATION_CREDENTIALS) {
    if (!existsSync(env.GOOGLE_APPLICATION_CREDENTIALS)) {
      throw new Error(`Arquivo de service account não encontrado: ${env.GOOGLE_APPLICATION_CREDENTIALS}`);
    }
    logger.info('Inicializando Firebase Admin via service account (GOOGLE_APPLICATION_CREDENTIALS)');
    return initializeApp(baseOpts(applicationDefault()));
  }

  if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const raw = env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
    let json: any;
    try {
      if (raw.startsWith('{')) {
        json = JSON.parse(raw);
      } else {
        json = JSON.parse(Buffer.from(raw.replace(/\s/g, ''), 'base64').toString('utf8'));
      }
    } catch (e) {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT_JSON inválido: ${(e as Error).message}`);
    }
    const opts: { credential: ReturnType<typeof cert>; projectId?: string; databaseURL?: string } = {
      credential: cert(json),
    };
    opts.projectId = env.FIREBASE_PROJECT_ID ?? json.project_id;
    if (env.FIREBASE_DATABASE_URL) opts.databaseURL = env.FIREBASE_DATABASE_URL;
    return initializeApp(opts);
  }

  if (env.NODE_ENV === 'production') {
    throw new Error('Credenciais Firebase ausentes em produção: defina GOOGLE_APPLICATION_CREDENTIALS ou FIREBASE_SERVICE_ACCOUNT_JSON');
  }
  logger.info('Inicializando Firebase Admin via Application Default Credentials (dev)');
  return initializeApp(baseOpts(applicationDefault()));
}

const app = initApp();

export const firebaseApp = app;
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb: Database | null = env.FIREBASE_DATABASE_URL ? getDatabase(app) : null;
export const messaging = getMessaging(app);

logger.info({ projectId: env.FIREBASE_PROJECT_ID }, 'Firebase Admin inicializado');