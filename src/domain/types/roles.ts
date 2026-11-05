export type Role = 'admin' | 'cuidador' | 'responsavel' | 'familiar';

export const ROLES: readonly Role[] = ['admin', 'cuidador', 'responsavel', 'familiar'] as const;

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}