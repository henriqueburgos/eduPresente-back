export type GravidadeOcorrencia = 'baixa' | 'media' | 'alta' | 'critica';

export const GRAVIDADES_OCORRENCIA: readonly GravidadeOcorrencia[] = [
  'baixa',
  'media',
  'alta',
  'critica',
] as const;

export type StatusOcorrencia = 'aberta' | 'em_acompanhamento' | 'resolvida';

export const STATUS_OCORRENCIA: readonly StatusOcorrencia[] = [
  'aberta',
  'em_acompanhamento',
  'resolvida',
] as const;

export interface Ocorrencia {
  id: string;
  escolaId?: string | undefined;
  alunoId: string;
  titulo: string;
  descricao: string;
  gravidade: GravidadeOcorrencia;
  status: StatusOcorrencia;
  resolucao?: string | undefined;
  registradoPor: string;
  registradoPorNome: string;
  criadoEm: string; // ISO
  atualizadoEm: string; // ISO
  resolvidoEm?: string | undefined;
}
