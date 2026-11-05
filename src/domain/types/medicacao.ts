export type ViaAdministracao = 'oral' | 'topica' | 'inalatoria' | 'injetavel' | 'outra';

export const VIAS_ADMINISTRACAO: readonly ViaAdministracao[] = [
  'oral',
  'topica',
  'inalatoria',
  'injetavel',
  'outra',
] as const;

export type StatusAdministracao =
  | 'administrado'
  | 'recusado'
  | 'atrasado'
  | 'nao_administrado';

export const STATUS_ADMINISTRACAO: readonly StatusAdministracao[] = [
  'administrado',
  'recusado',
  'atrasado',
  'nao_administrado',
] as const;

export interface Prescricao {
  id: string;
  escolaId?: string | undefined;
  alunoId: string;
  medicamento: string;
  dose: string;
  via: ViaAdministracao;
  horarios: string[]; // HH:mm
  diasSemana: number[]; // 0 = domingo
  inicio: string; // YYYY-MM-DD
  fim?: string | undefined; // YYYY-MM-DD
  ativo: boolean;
  prescritoPor: string;
  observacoes?: string | undefined;
  materialId?: string | undefined;
  quantidadePorDose: number;
  criadoPor: string;
  criadoEm: string; // ISO
  atualizadoEm: string; // ISO
}

export interface Administracao {
  id: string;
  prescricaoId: string;
  alunoId: string;
  data: string; // YYYY-MM-DD
  horario: string; // HH:mm
  status: StatusAdministracao;
  registradoPor: string;
  registradoPorNome: string;
  observacao?: string | undefined;
  criadoEm: string; // ISO
}
