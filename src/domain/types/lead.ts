export const LEAD_STATUS = ['novo', 'contatado', 'qualificado', 'descartado'] as const;

export type LeadStatus = (typeof LEAD_STATUS)[number];

export interface Lead {
  id: string;
  nome: string;
  email: string;
  telefone?: string | undefined;
  instituicao?: string | undefined;
  mensagem?: string | undefined;
  consentimento: boolean;
  origem: string;
  utm?: Record<string, string> | undefined;
  status: LeadStatus;
  criadoEm: string;
}
