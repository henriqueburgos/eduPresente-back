import { z } from 'zod';

import { ROLES } from '../types/roles.js';
import type { Role } from '../types/roles.js';
import { TIPOS_ATIVIDADE } from '../types/tipos-atividade.js';
import type { TipoAtividade } from '../types/tipos-atividade.js';
import { CATEGORIAS_MATERIAL, TIPOS_MOVIMENTACAO } from '../types/estoque.js';
import type { CategoriaMaterial, TipoMovimentacao } from '../types/estoque.js';
import { CATEGORIAS_AGENDA } from '../types/agenda.js';
import type { CategoriaAgenda } from '../types/agenda.js';
import { VIAS_ADMINISTRACAO, STATUS_ADMINISTRACAO } from '../types/medicacao.js';
import type { ViaAdministracao, StatusAdministracao } from '../types/medicacao.js';
import { GRAVIDADES_OCORRENCIA, STATUS_OCORRENCIA } from '../types/ocorrencia.js';
import type { GravidadeOcorrencia, StatusOcorrencia } from '../types/ocorrencia.js';
import { CATEGORIAS_DOCUMENTO } from '../types/documento.js';
import type { CategoriaDocumento } from '../types/documento.js';
import { ContatoEmergenciaSchema, MedicoResponsavelSchema } from './entidades.js';

export const ConsumoEstoqueCmdSchema = z.object({
  materialId: z.string().min(1),
  quantidade: z.number().int().positive().max(9999),
});

export const RegistrarAtividadeCmdSchema = z.object({
  pacienteId: z.string().min(1),
  tipo: z.enum(TIPOS_ATIVIDADE as unknown as [TipoAtividade, ...TipoAtividade[]]),
  descricao: z.string().min(1).max(2000),
  meta: z.record(z.unknown()).optional(),
  /** Materiais do estoque consumidos neste registro. */
  consumos: z.array(ConsumoEstoqueCmdSchema).max(20).optional(),
  clientRequestId: z.string().min(1).max(100).optional(),
});
export type RegistrarAtividadeCmd = z.infer<typeof RegistrarAtividadeCmdSchema>;
export type ConsumoEstoqueCmd = z.infer<typeof ConsumoEstoqueCmdSchema>;

export const ConviteCmdSchema = z.object({
  nome: z.string().min(1).max(120),
  email: z.string().email(),
  role: z.enum(ROLES as unknown as [Role, ...Role[]]),
  pacienteIds: z.array(z.string().min(1)).default([]),
  senha: z.string().min(6).max(128).optional(),
});
export type ConviteCmd = z.infer<typeof ConviteCmdSchema>;

export const PatchUsuarioCmdSchema = z.object({
  ativo: z.boolean(),
});
export type PatchUsuarioCmd = z.infer<typeof PatchUsuarioCmdSchema>;

export const RenovarClaimsCmdSchema = z.object({
  uid: z.string().min(1).optional(),
});

export const CriarPacienteCmdSchema = z.object({
  nome: z.string().min(1).max(120),
  idade: z.number().int().nonnegative(),
  local: z.string().max(60).optional(),
  /** @deprecated aceito de versões antigas do app. */
  quarto: z.string().max(60).optional(),
  fotoUrl: z.string().max(400000).optional(),
  condicoes: z.array(z.string()).default([]),
  cuidadorIds: z.array(z.string()).default([]),
  responsavelIds: z.array(z.string()).default([]),
  familiarIds: z.array(z.string()).default([]),
});
export type CriarPacienteCmd = z.infer<typeof CriarPacienteCmdSchema>;
export type RenovarClaimsCmd = z.infer<typeof RenovarClaimsCmdSchema>;
export const PatchPacienteCmdSchema = z.object({
  cuidadorIds: z.array(z.string().min(1)).optional(),
  responsavelIds: z.array(z.string().min(1)).optional(),
  familiarIds: z.array(z.string().min(1)).optional(),
});
export type PatchPacienteCmd = z.infer<typeof PatchPacienteCmdSchema>;

export const AtualizarPacienteCmdSchema = z.object({
  nome: z.string().min(1).max(120).optional(),
  idade: z.number().int().nonnegative().optional(),
  local: z.string().max(60).optional(),
  /** @deprecated aceito de versões antigas do app. */
  quarto: z.string().max(60).optional(),
  fotoUrl: z.string().max(400000).nullable().optional(),
  condicoes: z.array(z.string().min(1)).optional(),
  alergias: z.array(z.string().min(1)).optional(),
  tipoSanguineo: z.string().max(10).nullable().optional(),
  contatoEmergencia: ContatoEmergenciaSchema.nullable().optional(),
  medico: MedicoResponsavelSchema.nullable().optional(),
  convenio: z.string().max(120).nullable().optional(),
  restricoesAlimentares: z.array(z.string().min(1)).optional(),
  grauDependencia: z.enum(['independente', 'parcial', 'total']).optional(),
  observacoesClinicas: z.string().max(2000).nullable().optional(),
});
export type AtualizarPacienteCmd = z.infer<typeof AtualizarPacienteCmdSchema>;

export const CriarMaterialCmdSchema = z.object({
  pacienteId: z.string().min(1),
  nome: z.string().min(1).max(120),
  categoria: z.enum(CATEGORIAS_MATERIAL as unknown as [CategoriaMaterial, ...CategoriaMaterial[]]),
  quantidade: z.number().int().nonnegative(),
  unidade: z.string().min(1).max(20),
  quantidadeMinima: z.number().int().nonnegative().default(0),
  validade: z.string().min(1).optional(),
  observacao: z.string().max(500).optional(),
});
export type CriarMaterialCmd = z.infer<typeof CriarMaterialCmdSchema>;

export const AtualizarMaterialCmdSchema = z.object({
  pacienteId: z.string().min(1).optional(),
  nome: z.string().min(1).max(120).optional(),
  categoria: z.enum(CATEGORIAS_MATERIAL as unknown as [CategoriaMaterial, ...CategoriaMaterial[]]).optional(),
  quantidade: z.number().int().nonnegative().optional(),
  unidade: z.string().min(1).max(20).optional(),
  quantidadeMinima: z.number().int().nonnegative().optional(),
  validade: z.string().nullable().optional(),
  observacao: z.string().max(500).nullable().optional(),
});
export type AtualizarMaterialCmd = z.infer<typeof AtualizarMaterialCmdSchema>;

export const MovimentarEstoqueCmdSchema = z.object({
  tipo: z.enum(TIPOS_MOVIMENTACAO as unknown as [TipoMovimentacao, ...TipoMovimentacao[]]),
  quantidade: z.number().int().positive(),
});
export type MovimentarEstoqueCmd = z.infer<typeof MovimentarEstoqueCmdSchema>;

export const CriarAgendaCmdSchema = z.object({
  pacienteId: z.string().min(1),
  categoria: z.enum(CATEGORIAS_AGENDA as unknown as [CategoriaAgenda, ...CategoriaAgenda[]]),
  rotinaId: z.string().min(1).optional(),
  titulo: z.string().min(1).max(120),
  descricao: z.string().max(500).optional(),
  horario: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  diasSemana: z.array(z.number().int().min(0).max(6)).default([]),
  ativo: z.boolean().default(true),
});
export type CriarAgendaCmd = z.infer<typeof CriarAgendaCmdSchema>;

export const AtualizarAgendaCmdSchema = z.object({
  categoria: z
    .enum(CATEGORIAS_AGENDA as unknown as [CategoriaAgenda, ...CategoriaAgenda[]])
    .optional(),
  rotinaId: z.string().nullable().optional(),
  titulo: z.string().min(1).max(120).optional(),
  descricao: z.string().max(500).nullable().optional(),
  horario: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  diasSemana: z.array(z.number().int().min(0).max(6)).optional(),
  ativo: z.boolean().optional(),
});
export type AtualizarAgendaCmd = z.infer<typeof AtualizarAgendaCmdSchema>;

const HORARIO = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const DATA = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const CriarPrescricaoCmdSchema = z.object({
  pacienteId: z.string().min(1),
  medicamento: z.string().min(1).max(120),
  dose: z.string().min(1).max(80),
  via: z.enum(VIAS_ADMINISTRACAO as unknown as [ViaAdministracao, ...ViaAdministracao[]]),
  horarios: z.array(HORARIO).min(1),
  diasSemana: z.array(z.number().int().min(0).max(6)).default([]),
  inicio: DATA,
  fim: DATA.optional(),
  ativo: z.boolean().default(true),
  prescritoPor: z.string().min(1).max(120),
  observacoes: z.string().max(1000).optional(),
  materialId: z.string().min(1).optional(),
  quantidadePorDose: z.number().int().positive().default(1),
});
export type CriarPrescricaoCmd = z.infer<typeof CriarPrescricaoCmdSchema>;

export const AtualizarPrescricaoCmdSchema = z.object({
  medicamento: z.string().min(1).max(120).optional(),
  dose: z.string().min(1).max(80).optional(),
  via: z
    .enum(VIAS_ADMINISTRACAO as unknown as [ViaAdministracao, ...ViaAdministracao[]])
    .optional(),
  horarios: z.array(HORARIO).min(1).optional(),
  diasSemana: z.array(z.number().int().min(0).max(6)).optional(),
  inicio: DATA.optional(),
  fim: DATA.nullable().optional(),
  ativo: z.boolean().optional(),
  prescritoPor: z.string().min(1).max(120).optional(),
  observacoes: z.string().max(1000).nullable().optional(),
  materialId: z.string().nullable().optional(),
  quantidadePorDose: z.number().int().positive().optional(),
});
export type AtualizarPrescricaoCmd = z.infer<typeof AtualizarPrescricaoCmdSchema>;

export const RegistrarAdministracaoCmdSchema = z.object({
  prescricaoId: z.string().min(1),
  data: DATA,
  horario: HORARIO,
  status: z.enum(
    STATUS_ADMINISTRACAO as unknown as [StatusAdministracao, ...StatusAdministracao[]],
  ),
  observacao: z.string().max(500).optional(),
});
export type RegistrarAdministracaoCmd = z.infer<typeof RegistrarAdministracaoCmdSchema>;

export const CriarOcorrenciaCmdSchema = z.object({
  pacienteId: z.string().min(1),
  titulo: z.string().min(1).max(160),
  descricao: z.string().min(1).max(2000),
  gravidade: z.enum(
    GRAVIDADES_OCORRENCIA as unknown as [GravidadeOcorrencia, ...GravidadeOcorrencia[]],
  ),
});
export type CriarOcorrenciaCmd = z.infer<typeof CriarOcorrenciaCmdSchema>;

export const AtualizarOcorrenciaCmdSchema = z.object({
  titulo: z.string().min(1).max(160).optional(),
  descricao: z.string().min(1).max(2000).optional(),
  gravidade: z
    .enum(GRAVIDADES_OCORRENCIA as unknown as [GravidadeOcorrencia, ...GravidadeOcorrencia[]])
    .optional(),
  status: z
    .enum(STATUS_OCORRENCIA as unknown as [StatusOcorrencia, ...StatusOcorrencia[]])
    .optional(),
  resolucao: z.string().max(2000).nullable().optional(),
});
export type AtualizarOcorrenciaCmd = z.infer<typeof AtualizarOcorrenciaCmdSchema>;

export const CriarDocumentoCmdSchema = z.object({
  pacienteId: z.string().min(1),
  nome: z.string().min(1).max(200),
  categoria: z.enum(CATEGORIAS_DOCUMENTO as unknown as [CategoriaDocumento, ...CategoriaDocumento[]]),
  url: z.string().url(),
  path: z.string().min(1),
  contentType: z.string().min(1),
  tamanho: z.number().int().nonnegative(),
});
export type CriarDocumentoCmd = z.infer<typeof CriarDocumentoCmdSchema>;

export const CriarMensagemCmdSchema = z.object({
  pacienteId: z.string().min(1),
  texto: z.string().min(1).max(2000),
});
export type CriarMensagemCmd = z.infer<typeof CriarMensagemCmdSchema>;

export const MarcarMensagensLidasCmdSchema = z.object({
  pacienteId: z.string().min(1),
});
export type MarcarMensagensLidasCmd = z.infer<typeof MarcarMensagensLidasCmdSchema>;


