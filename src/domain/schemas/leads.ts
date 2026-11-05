import { z } from 'zod';

import { LEAD_STATUS, type LeadStatus } from '../types/lead.js';

export const LeadStatusSchema = z.enum(LEAD_STATUS as unknown as [LeadStatus, ...LeadStatus[]]);

export const LeadSchema = z.object({
  id: z.string().min(1),
  nome: z.string().min(1),
  email: z.string().email(),
  telefone: z.string().optional(),
  instituicao: z.string().optional(),
  mensagem: z.string().optional(),
  consentimento: z.boolean(),
  origem: z.string().min(1),
  utm: z.record(z.string()).optional(),
  status: LeadStatusSchema,
  criadoEm: z.string().min(1),
});

export const CriarLeadCmdSchema = z.object({
  nome: z.string().trim().min(2, 'Informe seu nome').max(120),
  email: z.string().trim().email('Informe um e-mail válido').max(200),
  telefone: z.string().trim().max(40).optional(),
  instituicao: z.string().trim().max(160).optional(),
  mensagem: z.string().trim().max(2000).optional(),
  consentimento: z.literal(true, {
    errorMap: () => ({ message: 'É necessário aceitar o contato para enviar.' }),
  }),
  origem: z.string().trim().max(80).optional(),
  utm: z.record(z.string().max(120)).optional(),
  /** Honeypot: bots preenchem; humanos deixam vazio. */
  website: z.string().max(200).optional(),
});

export type CriarLeadCmd = z.infer<typeof CriarLeadCmdSchema>;

export const AtualizarLeadCmdSchema = z.object({
  status: LeadStatusSchema,
});

export type AtualizarLeadCmd = z.infer<typeof AtualizarLeadCmdSchema>;
