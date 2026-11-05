import { NotFoundError } from '../domain/errors.js';
import type { Lead, LeadStatus } from '../domain/types/lead.js';
import type { CriarLeadCmd } from '../domain/schemas/leads.js';
import { leadsRepo } from '../repositories/leads.repo.js';
import { usuariosRepo } from '../repositories/usuarios.repo.js';
import { notificacaoService } from './notificacao.service.js';

function notificarAdmins(lead: Lead): void {
  void (async () => {
    const usuarios = await usuariosRepo.list();
    const admins = usuarios.filter((u) => u.role === 'admin' && u.ativo).map((u) => u.uid);
    if (admins.length === 0) return;
    await notificacaoService.enviarParaUids(admins, {
      title: `Novo lead: ${lead.nome}`,
      body: [lead.email, lead.instituicao].filter(Boolean).join(' · '),
      tag: 'novo-lead',
      link: '/admin/leads',
      data: { tipo: 'lead', leadId: lead.id, url: '/admin/leads' },
    });
  })().catch((erro) => console.error('[leads] falha ao notificar administradores.', erro));
}

export const leadService = {
  async criar(cmd: CriarLeadCmd): Promise<{ ok: true; id?: string }> {
    // Honeypot preenchido: finge sucesso e descarta silenciosamente.
    if (cmd.website && cmd.website.trim().length > 0) {
      return { ok: true };
    }

    const lead = await leadsRepo.create({
      nome: cmd.nome,
      email: cmd.email,
      consentimento: cmd.consentimento,
      origem: cmd.origem ?? 'lp',
      ...(cmd.telefone ? { telefone: cmd.telefone } : {}),
      ...(cmd.instituicao ? { instituicao: cmd.instituicao } : {}),
      ...(cmd.mensagem ? { mensagem: cmd.mensagem } : {}),
      ...(cmd.utm && Object.keys(cmd.utm).length > 0 ? { utm: cmd.utm } : {}),
    });

    notificarAdmins(lead);
    return { ok: true, id: lead.id };
  },

  async listar(): Promise<Lead[]> {
    return leadsRepo.listAll();
  },

  async atualizarStatus(id: string, status: LeadStatus): Promise<Lead> {
    const lead = await leadsRepo.atualizarStatus(id, status);
    if (!lead) throw new NotFoundError('Lead não encontrado');
    return lead;
  },

  async remover(id: string): Promise<void> {
    const removido = await leadsRepo.remover(id);
    if (!removido) throw new NotFoundError('Lead não encontrado');
  },
};
