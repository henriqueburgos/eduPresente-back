import { ForbiddenError, NotFoundError } from '../domain/errors.js';
import { FieldValue } from 'firebase-admin/firestore';
import type { Role } from '../domain/types/roles.js';
import type { AtualizarAgendaCmd, CriarAgendaCmd } from '../domain/schemas/commands.js';
import type { Aluno } from '../domain/types/entidades.js';
import type { ItemAgenda } from '../domain/types/agenda.js';
import { agendaRepo } from '../repositories/agenda.repo.js';
import { alunosRepo } from '../repositories/alunos.repo.js';
import { auditoriaRepo } from '../repositories/auditoria.repo.js';
import { notificacaoService } from './notificacao.service.js';

export interface AtorAgenda {
  uid: string;
  role: Role;
}

const TZ = 'America/Sao_Paulo';
const JANELA_MINUTOS = 30;

function podeAcessar(paciente: Aluno, ator: AtorAgenda): boolean {
  if (ator.role === 'admin') return true;
  if (ator.role === 'responsavel') {
    return (
      paciente.responsavelIds.includes(ator.uid) ||
      paciente.familiarIds.includes(ator.uid) ||
      paciente.professorIds.includes(ator.uid)
    );
  }
  if (ator.role === 'professor') return paciente.professorIds.includes(ator.uid);
  return false;
}

async function pacientePermitido(alunoId: string, ator: AtorAgenda): Promise<Aluno> {
  const paciente = await alunosRepo.findById(alunoId);
  if (!paciente) throw new NotFoundError('Aluno não encontrado');
  if (!podeAcessar(paciente, ator)) {
    throw new ForbiddenError('Aluno não vinculado ao usuário');
  }
  return paciente;
}

function dataHoraSaoPaulo(agora: Date) {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(agora);
  const get = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? 0);
  const ano = get('year');
  const mes = get('month');
  const dia = get('day');
  const hora = get('hour') % 24;
  const minuto = get('minute');
  const diaSemana = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
  const data = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  return { data, diaSemana, minutos: hora * 60 + minuto, horario: `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}` };
}

function minutosDe(horario: string): number {
  const [h, m] = horario.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function dataDeIsoSaoPaulo(iso: string): string {
  return dataHoraSaoPaulo(new Date(iso)).data;
}

function payloadLembrete(paciente: Aluno, item: ItemAgenda) {
  return {
    title: `Lembrete: ${item.titulo}`,
    body: `${paciente.nome}: ${item.descricao || item.titulo}`.slice(0, 180),
    tag: `lembrete-${item.id}`,
    renotify: true,
    icon: '/icons/icon-192x192.png',
    data: {
      alunoId: item.alunoId,
      lembreteId: item.id,
      url: '/responsavel/lembretes',
    },
    link: '/responsavel/lembretes',
  };
}

export const agendaService = {
  async listar(ator: AtorAgenda, alunoId?: string): Promise<ItemAgenda[]> {
    if (ator.role === 'admin') {
      return alunoId ? agendaRepo.listByAluno(alunoId) : agendaRepo.listAll();
    }
    if (alunoId) {
      await pacientePermitido(alunoId, ator);
      return agendaRepo.listByAluno(alunoId);
    }
    const meus = await alunosRepo.listByUsuario(ator.uid);
    return agendaRepo.listByAlunos(meus.map((p) => p.id));
  },

  async criar(cmd: CriarAgendaCmd, ator: AtorAgenda): Promise<ItemAgenda> {
    await pacientePermitido(cmd.alunoId, ator);
    const item = await agendaRepo.create({
      alunoId: cmd.alunoId,
      categoria: cmd.categoria,
      ...(cmd.rotinaId ? { rotinaId: cmd.rotinaId } : {}),
      titulo: cmd.titulo,
      ...(cmd.descricao ? { descricao: cmd.descricao } : {}),
      horario: cmd.horario,
      diasSemana: cmd.diasSemana,
      ativo: cmd.ativo,
      criadoPor: ator.uid,
    });
    await auditoriaRepo.create({
      ator: ator.uid,
      acao: cmd.categoria === 'lembrete' ? 'criar_lembrete' : 'criar_rotina',
      alvo: `${cmd.alunoId}/${item.id}`,
      nivel: 'info',
    });
    return item;
  },

  async atualizar(id: string, cmd: AtualizarAgendaCmd, ator: AtorAgenda): Promise<ItemAgenda> {
    const item = await agendaRepo.findById(id);
    if (!item) throw new NotFoundError('Item da agenda não encontrado');
    await pacientePermitido(item.alunoId, ator);

    const patch: Record<string, unknown> = {};
    if (cmd.categoria !== undefined) patch['categoria'] = cmd.categoria;
    if (cmd.rotinaId !== undefined) {
      patch['rotinaId'] = cmd.rotinaId ? cmd.rotinaId : FieldValue.delete();
    }
    if (cmd.titulo !== undefined) patch['titulo'] = cmd.titulo;
    if (cmd.descricao !== undefined) {
      patch['descricao'] = cmd.descricao ? cmd.descricao : FieldValue.delete();
    }
    if (cmd.horario !== undefined) patch['horario'] = cmd.horario;
    if (cmd.diasSemana !== undefined) patch['diasSemana'] = cmd.diasSemana;
    if (cmd.ativo !== undefined) patch['ativo'] = cmd.ativo;

    const updated = await agendaRepo.update(id, patch);
    if (!updated) throw new NotFoundError('Item da agenda não encontrado');
    return updated;
  },

  async remover(id: string, ator: AtorAgenda): Promise<{ id: string; deletado: true }> {
    const item = await agendaRepo.findById(id);
    if (!item) throw new NotFoundError('Item da agenda não encontrado');
    await pacientePermitido(item.alunoId, ator);
    await agendaRepo.remove(id);
    return { id, deletado: true };
  },

  /** Dispara lembretes vencidos. Idempotente por dia. */
  async dispararLembretes(agora = new Date()): Promise<{ disparados: number; verificados: number }> {
    const { data, diaSemana, minutos } = dataHoraSaoPaulo(agora);
    const itens = await agendaRepo.listPorDia(diaSemana);
    let disparados = 0;

    for (const item of itens) {
      const alvo = minutosDe(item.horario);
      const atraso = minutos - alvo;
      if (atraso < 0 || atraso > JANELA_MINUTOS) continue;
      if (item.ultimoEnvioEm && dataDeIsoSaoPaulo(item.ultimoEnvioEm) === data) continue;

      const paciente = await alunosRepo.findById(item.alunoId);
      if (!paciente) continue;

      // Marca antes de enviar para evitar disparo duplicado entre execuções.
      await agendaRepo.marcarEnvio(item.id, new Date().toISOString());

      const destinatarios = [
        ...new Set([
          ...paciente.responsavelIds,
          ...paciente.familiarIds,
          ...paciente.professorIds,
        ]),
      ];
      if (destinatarios.length === 0) continue;

      void notificacaoService
        .enviarParaUids(destinatarios, payloadLembrete(paciente, item))
        .catch((erro) => {
          console.error('[agenda] falha ao enviar lembrete.', erro);
        });

      disparados++;
    }

    return { disparados, verificados: itens.length };
  },

  /** Envia um lembrete imediatamente (teste manual), sem alterar o agendamento. */
  async testar(id: string, ator: AtorAgenda) {
    const item = await agendaRepo.findById(id);
    if (!item) throw new NotFoundError('Lembrete não encontrado');
    const paciente = await pacientePermitido(item.alunoId, ator);

    const destinatarios = [
      ...new Set([
        ...paciente.responsavelIds,
        ...paciente.familiarIds,
        ...paciente.professorIds,
        ator.uid,
      ]),
    ];

    return notificacaoService.enviarParaUids(destinatarios, payloadLembrete(paciente, item));
  },
};
