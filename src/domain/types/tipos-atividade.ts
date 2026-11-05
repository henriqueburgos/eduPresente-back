export type TipoAtividade = 'alimentacao' | 'medicacao' | 'higiene' | 'humor' | 'ocorrencia';

export const TIPOS_ATIVIDADE: readonly TipoAtividade[] = [
  'alimentacao',
  'medicacao',
  'higiene',
  'humor',
  'ocorrencia',
] as const;

export type NivelAuditoria = 'info' | 'alerta' | 'critico';

export const NIVEIS_AUDITORIA: readonly NivelAuditoria[] = ['info', 'alerta', 'critico'] as const;