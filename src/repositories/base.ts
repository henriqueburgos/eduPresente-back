import { db } from '../config/firebase.js';

export { db };

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayPrefix(): string {
  return new Date().toISOString().slice(0, 10);
}

export function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}