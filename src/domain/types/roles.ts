export type Role = 'admin' | 'professor' | 'responsavel';

export const ROLES: readonly Role[] = ['admin', 'professor', 'responsavel'] as const;

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}
