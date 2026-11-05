import { messaging } from '../config/firebase.js';
import { NotFoundError } from '../domain/errors.js';
import { usuariosRepo } from '../repositories/usuarios.repo.js';
import { notificacoesRepo } from '../repositories/notificacoes.repo.js';

type AcaoNotificacao = { action: string; title: string; icon?: string };

type NotificacaoBase = {
  title: string;
  body: string;
  data?: Record<string, string>;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
  vibrate?: number[];
  actions?: AcaoNotificacao[];
  silent?: boolean;
  link?: string;
};

type EnviarNotificacaoInput = NotificacaoBase & {
  token?: string;
  uid?: string;
};

const DEFAULT_ICON = '/icons/icon-192x192.png';
const DEFAULT_BADGE = '/icons/icon-72x72.png';
const DEFAULT_IMAGE = '/icons/notificacao-banner.png';

type ResultadoEnvio = Awaited<ReturnType<typeof messaging.sendEachForMulticast>>;

function webpushDe(payload: NotificacaoBase) {
  return {
    title: payload.title,
    body: payload.body,
    icon: payload.icon ?? DEFAULT_ICON,
    badge: payload.badge ?? DEFAULT_BADGE,
    image: payload.image ?? DEFAULT_IMAGE,
    dir: 'ltr' as const,
    lang: 'pt-BR',
    ...(payload.tag ? { tag: payload.tag } : {}),
    ...(payload.renotify !== undefined ? { renotify: payload.renotify } : {}),
    ...(payload.requireInteraction !== undefined
      ? { requireInteraction: payload.requireInteraction }
      : {}),
    ...(payload.vibrate ? { vibrate: payload.vibrate } : {}),
    ...(payload.actions ? { actions: payload.actions } : {}),
    ...(payload.silent !== undefined ? { silent: payload.silent } : {}),
    ...(payload.data ? { data: payload.data } : {}),
    ...(payload.link ? { click_action: payload.link } : {}),
  };
}

async function despachar(tokens: string[], payload: NotificacaoBase) {
  const unique = [...new Set(tokens)].filter(Boolean);
  if (unique.length === 0) return null;

  const res = await messaging.sendEachForMulticast({
    tokens: unique,
    notification: { title: payload.title, body: payload.body },
    ...(payload.data ? { data: payload.data } : {}),
    webpush: {
      notification: webpushDe(payload),
      ...(payload.link ? { fcmOptions: { link: payload.link } } : {}),
      headers: { Urgency: 'high', TTL: '3600' },
    },
  });

  return { res, unique };
}

function tokensInvalidos(res: ResultadoEnvio, unique: string[]): string[] {
  const invalidos: string[] = [];
  res.responses.forEach((r, i) => {
    if (r.success) return;
    const code = r.error?.code ?? 'unknown';
    console.warn(`FCM falha para token ${unique[i]}: ${code} - ${r.error?.message}`);
    if (
      code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-registration-token' ||
      code === 'messaging/invalid-argument'
    ) {
      invalidos.push(unique[i]!);
    }
  });
  return invalidos;
}

async function removerInvalidos(uid: string, invalidos: string[]): Promise<void> {
  const u = await usuariosRepo.findById(uid);
  if (!u) return;
  const restantes = (u.fcmTokens ?? []).filter((t) => !invalidos.includes(t));
  const { db } = await import('../repositories/base.js');
  await db.collection('usuarios').doc(uid).update({ fcmTokens: restantes });
}

export const notificacaoService = {
  async enviar(payload: EnviarNotificacaoInput) {
    const tokens: string[] = [];
    if (payload.token) tokens.push(payload.token);
    if (payload.uid) {
      const u = await usuariosRepo.findById(payload.uid);
      if (!u) throw new NotFoundError('Usuário não encontrado');
      tokens.push(...(u.fcmTokens ?? []));
    }

    // Persiste a notificação no app, mesmo que o usuário não tenha token FCM.
    // A central é best-effort: uma falha aqui não pode impedir o push.
    if (payload.uid) {
      try {
        await notificacoesRepo.criarParaUsuarios([payload.uid], {
          titulo: payload.title,
          corpo: payload.body,
          tipo: payload.data?.['tipo'],
          dados: payload.data,
          link: payload.link,
        });
      } catch (erro) {
        console.error('[notificacao] falha ao persistir notificação do app.', erro);
      }
    }

    const despacho = await despachar(tokens, payload);
    if (!despacho) {
      return { enviados: 0, falhas: 0, message: 'Nenhum token FCM disponível' };
    }

    const { res, unique } = despacho;
    const invalidos = tokensInvalidos(res, unique);
    if (payload.uid && invalidos.length > 0) {
      await removerInvalidos(payload.uid, invalidos);
    }

    return {
      enviados: res.successCount,
      falhas: res.failureCount,
      total: unique.length,
      ...(invalidos.length ? { tokensRemovidos: invalidos.length } : {}),
    };
  },

  /** Envia a mesma notificação para vários usuários, agregando e limpando tokens. */
  async enviarParaUids(uids: string[], payload: NotificacaoBase) {
    const porUid = new Map<string, string[]>();
    const validos: string[] = [];
    const tokens: string[] = [];

    for (const uid of [...new Set(uids)]) {
      const u = await usuariosRepo.findById(uid);
      if (!u || !u.ativo) continue;
      validos.push(uid);
      const tks = (u.fcmTokens ?? []).filter(Boolean);
      if (tks.length === 0) continue;
      porUid.set(uid, tks);
      tokens.push(...tks);
    }

    // Persiste no app para todos os destinatários, independente de terem token.
    if (validos.length > 0) {
      try {
        await notificacoesRepo.criarParaUsuarios(validos, {
          titulo: payload.title,
          corpo: payload.body,
          tipo: payload.data?.['tipo'],
          dados: payload.data,
          link: payload.link,
        });
      } catch (erro) {
        console.error('[notificacao] falha ao persistir notificações do app.', erro);
      }
    }

    const despacho = await despachar(tokens, payload);
    if (!despacho) {
      return { enviados: 0, falhas: 0, message: 'Nenhum token FCM disponível' };
    }

    const { res, unique } = despacho;
    const invalidos = tokensInvalidos(res, unique);
    if (invalidos.length > 0) {
      for (const [uid, tks] of porUid) {
        if (tks.some((t) => invalidos.includes(t))) {
          await removerInvalidos(uid, invalidos);
        }
      }
    }

    return {
      enviados: res.successCount,
      falhas: res.failureCount,
      total: unique.length,
      ...(invalidos.length ? { tokensRemovidos: invalidos.length } : {}),
    };
  },
};
