import type { Role } from './roles.js';
import type { TipoAtividade, NivelAuditoria } from './tipos-atividade.js';
import type { CategoriaMaterial } from './estoque.js';

export type GrauDependencia = 'independente' | 'parcial' | 'total';

export interface ContatoEmergencia {
  nome: string;
  parentesco?: string | undefined;
  telefone: string;
}

export interface MedicoResponsavel {
  nome: string;
  crm?: string | undefined;
  telefone?: string | undefined;
}

export interface Paciente {
  id: string;
  escolaId?: string | undefined;
  nome: string;
  idade: number;
  /** Onde o paciente está: casa, quarto, leito, instituição… */
  local: string;
  /** @deprecated campo antigo, mantido apenas para leitura de registros antigos. */
  quarto?: string | undefined;
  fotoUrl?: string | undefined;
  condicoes: string[];
  responsavelIds: string[];
  cuidadorIds: string[];
  familiarIds: string[];
  entradaEm: string; // ISO date
  alergias: string[];
  tipoSanguineo?: string | undefined;
  contatoEmergencia?: ContatoEmergencia | undefined;
  medico?: MedicoResponsavel | undefined;
  convenio?: string | undefined;
  restricoesAlimentares: string[];
  grauDependencia: GrauDependencia;
  observacoesClinicas?: string | undefined;
}

export interface Atividade {
  id: string;
  pacienteId: string;
  tipo: TipoAtividade;
  descricao: string;
  autorUid: string;
  autorNome: string;
  criadoEm: string; // ISO timestamp
  meta?: Record<string, unknown> | undefined;
  clientRequestId?: string | undefined;
}

export interface Usuario {
  uid: string;
  escolaId?: string | undefined;
  nome: string;
  email: string;
  role: Role;
  pacienteIds: string[];
  fcmTokens: string[];
  ativo: boolean;
  criadoEm: string; // ISO timestamp
}

export interface Auditoria {
  id: string;
  ator: string; // uid ou nome
  acao: string;
  alvo: string;
  nivel: NivelAuditoria;
  criadoEm: string; // ISO timestamp
}

export interface Comunicado {
  id: string;
  titulo: string;
  corpo: string;
  autor: string;
  criadoEm: string; // ISO timestamp
  fixado: boolean;
}

export interface MaterialEstoque {
  id: string;
  pacienteId: string;
  nome: string;
  categoria: CategoriaMaterial;
  quantidade: number;
  unidade: string;
  quantidadeMinima: number;
  validade?: string | undefined;
  observacao?: string | undefined;
  atualizadoEm: string; // ISO timestamp
  criadoEm: string; // ISO timestamp
}


export interface Escola {
  id: string;
  nome: string;
  slug: string;
  segmentos: string[];
  endereco?: string | undefined;
  ativo: boolean;
  branding?: Record<string, unknown> | undefined;
  criadoEm: string;
}

export interface Turma {
  id: string;
  escolaId: string;
  nome: string;
  serie: string;
  segmento: string;
  anoLetivo: string;
  turno: string;
  professorIds: string[];
  alunoIds: string[];
  criadoEm: string;
}
