import { z } from 'zod';

import { ROLES } from '../types/roles.js';
import type { Role } from '../types/roles.js';
import { TIPOS_ATIVIDADE, NIVEIS_AUDITORIA } from '../types/tipos-atividade.js';
import type { TipoAtividade, NivelAuditoria } from '../types/tipos-atividade.js';
import { CATEGORIAS_MATERIAL } from '../types/estoque.js';
import type { CategoriaMaterial } from '../types/estoque.js';
import { CATEGORIAS_AGENDA } from '../types/agenda.js';
import type { CategoriaAgenda } from '../types/agenda.js';
import { VIAS_ADMINISTRACAO, STATUS_ADMINISTRACAO } from '../types/medicacao.js';
import type { ViaAdministracao, StatusAdministracao } from '../types/medicacao.js';
import { GRAVIDADES_OCORRENCIA, STATUS_OCORRENCIA } from '../types/ocorrencia.js';
import type { GravidadeOcorrencia, StatusOcorrencia } from '../types/ocorrencia.js';
import { CATEGORIAS_DOCUMENTO } from '../types/documento.js';
import type { CategoriaDocumento } from '../types/documento.js';

export const ContatoEmergenciaSchema = z.object({
  nome: z.string().min(1),
  parentesco: z.string().optional(),
  telefone: z.string().min(1),
});

export const MedicoResponsavelSchema = z.object({
  nome: z.string().min(1),
  crm: z.string().optional(),
  telefone: z.string().optional(),
});

export const PacienteSchema = z.object({
  id: z.string().min(1),
  nome: z.string().min(1),
  idade: z.number().int().nonnegative(),
  local: z.string().max(60).default(''),
  quarto: z.string().max(60).optional(),
  fotoUrl: z.string().max(400000).optional(),
  condicoes: z.array(z.string()).default([]),
  responsavelIds: z.array(z.string()).default([]),
  cuidadorIds: z.array(z.string()).default([]),
  familiarIds: z.array(z.string()).default([]),
  entradaEm: z.string().min(1),
  alergias: z.array(z.string()).default([]),
  tipoSanguineo: z.string().optional(),
  contatoEmergencia: ContatoEmergenciaSchema.optional(),
  medico: MedicoResponsavelSchema.optional(),
  convenio: z.string().optional(),
  restricoesAlimentares: z.array(z.string()).default([]),
  grauDependencia: z.enum(['independente', 'parcial', 'total']).default('independente'),
  observacoesClinicas: z.string().max(2000).optional(),
});
export type PacienteInput = z.infer<typeof PacienteSchema>;

export const AtividadeSchema = z.object({
  id: z.string().min(1),
  pacienteId: z.string().min(1),
  tipo: z.enum(TIPOS_ATIVIDADE as unknown as [TipoAtividade, ...TipoAtividade[]]),
  descricao: z.string().min(1),
  autorUid: z.string().min(1),
  autorNome: z.string().min(1),
  criadoEm: z.string().min(1),
  meta: z.record(z.unknown()).optional(),
  clientRequestId: z.string().optional(),
});
export type AtividadeInput = z.infer<typeof AtividadeSchema>;

export const UsuarioSchema = z.object({
  uid: z.string().min(1),
  nome: z.string().min(1),
  email: z.string().email(),
  role: z.enum(ROLES as unknown as [Role, ...Role[]]),
  pacienteIds: z.array(z.string()).default([]),
  fcmTokens: z.array(z.string()).default([]),
  ativo: z.boolean().default(true),
  criadoEm: z.string().min(1),
});
export type UsuarioInput = z.infer<typeof UsuarioSchema>;

export const AuditoriaSchema = z.object({
  id: z.string().min(1),
  ator: z.string().min(1),
  acao: z.string().min(1),
  alvo: z.string().min(1),
  nivel: z.enum(NIVEIS_AUDITORIA as unknown as [NivelAuditoria, ...NivelAuditoria[]]),
  criadoEm: z.string().min(1),
});
export type AuditoriaInput = z.infer<typeof AuditoriaSchema>;

export const ComunicadoSchema = z.object({
  id: z.string().min(1),
  titulo: z.string().min(1),
  corpo: z.string().min(1),
  autor: z.string().min(1),
  criadoEm: z.string().min(1),
  fixado: z.boolean().default(false),
});
export type ComunicadoInput = z.infer<typeof ComunicadoSchema>;

export const MaterialEstoqueSchema = z.object({
  id: z.string().min(1),
  pacienteId: z.string().min(1),
  nome: z.string().min(1),
  categoria: z.enum(CATEGORIAS_MATERIAL as unknown as [CategoriaMaterial, ...CategoriaMaterial[]]),
  quantidade: z.number().int().nonnegative(),
  unidade: z.string().min(1),
  quantidadeMinima: z.number().int().nonnegative().default(0),
  validade: z.string().optional(),
  observacao: z.string().optional(),
  atualizadoEm: z.string().min(1),
  criadoEm: z.string().min(1),
});
export type MaterialEstoqueInput = z.infer<typeof MaterialEstoqueSchema>;

export const ItemAgendaSchema = z.object({
  id: z.string().min(1),
  pacienteId: z.string().min(1),
  categoria: z.enum(CATEGORIAS_AGENDA as unknown as [CategoriaAgenda, ...CategoriaAgenda[]]),
  rotinaId: z.string().optional(),
  titulo: z.string().min(1).max(120),
  descricao: z.string().max(500).optional(),
  horario: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  diasSemana: z.array(z.number().int().min(0).max(6)).default([]),
  ativo: z.boolean().default(true),
  ultimoEnvioEm: z.string().optional(),
  criadoPor: z.string().min(1),
  criadoEm: z.string().min(1),
  atualizadoEm: z.string().min(1),
});
export type ItemAgendaInput = z.infer<typeof ItemAgendaSchema>;

export const NotificacaoUsuarioSchema = z.object({
  id: z.string().min(1),
  titulo: z.string().min(1),
  corpo: z.string().default(''),
  tipo: z.string().optional(),
  lida: z.boolean().default(false),
  criadaEm: z.string().min(1),
  dados: z.record(z.string()).optional(),
  link: z.string().optional(),
});
export type NotificacaoUsuarioInput = z.infer<typeof NotificacaoUsuarioSchema>;

export const PrescricaoSchema = z.object({
  id: z.string().min(1),
  pacienteId: z.string().min(1),
  medicamento: z.string().min(1).max(120),
  dose: z.string().min(1).max(80),
  via: z.enum(VIAS_ADMINISTRACAO as unknown as [ViaAdministracao, ...ViaAdministracao[]]),
  horarios: z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)).min(1),
  diasSemana: z.array(z.number().int().min(0).max(6)).default([]),
  inicio: z.string().min(1),
  fim: z.string().optional(),
  ativo: z.boolean().default(true),
  prescritoPor: z.string().min(1).max(120),
  observacoes: z.string().max(1000).optional(),
  materialId: z.string().optional(),
  quantidadePorDose: z.number().int().positive().default(1),
  criadoPor: z.string().min(1),
  criadoEm: z.string().min(1),
  atualizadoEm: z.string().min(1),
});
export type PrescricaoInput = z.infer<typeof PrescricaoSchema>;

export const AdministracaoSchema = z.object({
  id: z.string().min(1),
  prescricaoId: z.string().min(1),
  pacienteId: z.string().min(1),
  data: z.string().min(1),
  horario: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  status: z.enum(
    STATUS_ADMINISTRACAO as unknown as [StatusAdministracao, ...StatusAdministracao[]],
  ),
  registradoPor: z.string().min(1),
  registradoPorNome: z.string().min(1),
  observacao: z.string().max(500).optional(),
  criadoEm: z.string().min(1),
});
export type AdministracaoInput = z.infer<typeof AdministracaoSchema>;

export const OcorrenciaSchema = z.object({
  id: z.string().min(1),
  pacienteId: z.string().min(1),
  titulo: z.string().min(1).max(160),
  descricao: z.string().min(1).max(2000),
  gravidade: z.enum(
    GRAVIDADES_OCORRENCIA as unknown as [GravidadeOcorrencia, ...GravidadeOcorrencia[]],
  ),
  status: z.enum(STATUS_OCORRENCIA as unknown as [StatusOcorrencia, ...StatusOcorrencia[]]),
  resolucao: z.string().max(2000).optional(),
  registradoPor: z.string().min(1),
  registradoPorNome: z.string().min(1),
  criadoEm: z.string().min(1),
  atualizadoEm: z.string().min(1),
  resolvidoEm: z.string().optional(),
});
export type OcorrenciaInput = z.infer<typeof OcorrenciaSchema>;

export const DocumentoSchema = z.object({
  id: z.string().min(1),
  pacienteId: z.string().min(1),
  nome: z.string().min(1).max(200),
  categoria: z.enum(CATEGORIAS_DOCUMENTO as unknown as [CategoriaDocumento, ...CategoriaDocumento[]]),
  url: z.string().url(),
  path: z.string().min(1),
  contentType: z.string().min(1),
  tamanho: z.number().int().nonnegative(),
  enviadoPor: z.string().min(1),
  enviadoPorNome: z.string().min(1),
  criadoEm: z.string().min(1),
});
export type DocumentoInput = z.infer<typeof DocumentoSchema>;

export const MensagemSchema = z.object({
  id: z.string().min(1),
  pacienteId: z.string().min(1),
  autorUid: z.string().min(1),
  autorNome: z.string().min(1),
  autorRole: z.enum(ROLES as unknown as [Role, ...Role[]]),
  texto: z.string().min(1).max(2000),
  criadoEm: z.string().min(1),
  lidaPor: z.array(z.string()).default([]),
});
export type MensagemInput = z.infer<typeof MensagemSchema>;