import { ConflictError, ForbiddenError, NotFoundError } from '../domain/errors.js';
import { FieldValue } from 'firebase-admin/firestore';
import type { Role } from '../domain/types/roles.js';
import type {
  AtualizarPrescricaoCmd,
  CriarPrescricaoCmd,
  RegistrarAdministracaoCmd,
} from '../domain/schemas/commands.js';
import type { Administracao, Prescricao } from '../domain/types/medicacao.js';
import type { Paciente } from '../domain/types/entidades.js';
import { prescricoesRepo } from '../repositories/prescricoes.repo.js';
import { administracoesRepo } from '../repositories/administracoes.repo.js';
import { pacientesRepo } from '../repositories/pacientes.repo.js';
import { usuariosRepo } from '../repositories/usuarios.repo.js';
import { estoqueRepo } from '../repositories/estoque.repo.js';
import { auditoriaRepo } from '../repositories/auditoria.repo.js';
import { notificacaoService } from './notificacao.service.js';
import { db } from '../repositories/base.js';

export interface AtorMedicacao {
  uid: string;
  role: Role;
  nome?: string;
}

const TZ = 'America/Sao_Paulo';
const JANELA_ATRASO = 30;

function podeAcessar(paciente: Paciente, ator: AtorMedicacao): boolean {
  if (ator.role === 'admin') return true;
  if (ator.role === 'responsavel') {
    return paciente.responsavelIds.includes(ator.uid) || paciente.familiarIds.includes(ator.uid);
  }
  if (ator.role === 'familiar') {
    return (
      paciente.familiarIds.includes(ator.uid) ||
      paciente.responsavelIds.includes(ator.uid) ||
      paciente.cuidadorIds.includes(ator.uid)
    );
  }
  if (ator.role === 'cuidador') return paciente.cuidadorIds.includes(ator.uid);
  return false;
}

async function pacientePermitido(pacienteId: string, ator: AtorMedicacao): Promise<Paciente> {
  const paciente = await pacientesRepo.findById(pacienteId);
  if (!paciente) throw new NotFoundError('Paciente não encontrado');
  if (!podeAcessar(paciente, ator)) {
    throw new ForbiddenError('Paciente não vinculado ao usuário');
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
  return {
    data,
    diaSemana,
    minutos: hora * 60 + minuto,
    horario: `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`,
  };
}

function minutosDe(horario: string): number {
  const [h, m] = horario.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function aplicaNoDia(p: Prescricao, data: string, diaSemana: number): boolean {
  if (!p.ativo) return false;
  if (p.inicio && data < p.inicio) return false;
  if (p.fim && data > p.fim) return false;
  return p.diasSemana.length === 0 || p.diasSemana.includes(diaSemana);
}

export const medicacaoService = {
  async listarPrescricoes(ator: AtorMedicacao, pacienteId?: string): Promise<Prescricao[]> {
    if (ator.role === 'admin') {
      if (pacienteId) return prescricoesRepo.listByPaciente(pacienteId);
      const pacientes = await pacientesRepo.listOrdenadoPorNome();
      return prescricoesRepo.listByPacientes(pacientes.map((p) => p.id));
    }
    if (pacienteId) {
      await pacientePermitido(pacienteId, ator);
      return prescricoesRepo.listByPaciente(pacienteId);
    }
    const meus = await pacientesRepo.listByUsuario(ator.uid);
    return prescricoesRepo.listByPacientes(meus.map((p) => p.id));
  },

  async criarPrescricao(cmd: CriarPrescricaoCmd, ator: AtorMedicacao): Promise<Prescricao> {
    await pacientePermitido(cmd.pacienteId, ator);
    const prescricao = await prescricoesRepo.create({
      pacienteId: cmd.pacienteId,
      medicamento: cmd.medicamento,
      dose: cmd.dose,
      via: cmd.via,
      horarios: cmd.horarios,
      diasSemana: cmd.diasSemana,
      inicio: cmd.inicio,
      ...(cmd.fim ? { fim: cmd.fim } : {}),
      ativo: cmd.ativo,
      prescritoPor: cmd.prescritoPor,
      ...(cmd.observacoes ? { observacoes: cmd.observacoes } : {}),
      ...(cmd.materialId ? { materialId: cmd.materialId } : {}),
      quantidadePorDose: cmd.quantidadePorDose,
      criadoPor: ator.uid,
    });
    await auditoriaRepo.create({
      ator: ator.uid,
      acao: 'criar_prescricao',
      alvo: `${cmd.pacienteId}/${prescricao.id}`,
      nivel: 'info',
    });
    return prescricao;
  },

  async atualizarPrescricao(
    id: string,
    cmd: AtualizarPrescricaoCmd,
    ator: AtorMedicacao,
  ): Promise<Prescricao> {
    const prescricao = await prescricoesRepo.findById(id);
    if (!prescricao) throw new NotFoundError('Prescrição não encontrada');
    await pacientePermitido(prescricao.pacienteId, ator);

    const patch: Record<string, unknown> = {};
    if (cmd.medicamento !== undefined) patch['medicamento'] = cmd.medicamento;
    if (cmd.dose !== undefined) patch['dose'] = cmd.dose;
    if (cmd.via !== undefined) patch['via'] = cmd.via;
    if (cmd.horarios !== undefined) patch['horarios'] = cmd.horarios;
    if (cmd.diasSemana !== undefined) patch['diasSemana'] = cmd.diasSemana;
    if (cmd.inicio !== undefined) patch['inicio'] = cmd.inicio;
    if (cmd.fim !== undefined) patch['fim'] = cmd.fim ? cmd.fim : FieldValue.delete();
    if (cmd.ativo !== undefined) patch['ativo'] = cmd.ativo;
    if (cmd.prescritoPor !== undefined) patch['prescritoPor'] = cmd.prescritoPor;
    if (cmd.observacoes !== undefined) {
      patch['observacoes'] = cmd.observacoes ? cmd.observacoes : FieldValue.delete();
    }
    if (cmd.materialId !== undefined) {
      patch['materialId'] = cmd.materialId ? cmd.materialId : FieldValue.delete();
    }
    if (cmd.quantidadePorDose !== undefined) patch['quantidadePorDose'] = cmd.quantidadePorDose;

    const updated = await prescricoesRepo.update(id, patch);
    if (!updated) throw new NotFoundError('Prescrição não encontrada');
    return updated;
  },

  async removerPrescricao(id: string, ator: AtorMedicacao): Promise<{ id: string; deletado: true }> {
    const prescricao = await prescricoesRepo.findById(id);
    if (!prescricao) throw new NotFoundError('Prescrição não encontrada');
    await pacientePermitido(prescricao.pacienteId, ator);
    await prescricoesRepo.remove(id);
    await auditoriaRepo.create({
      ator: ator.uid,
      acao: 'remover_prescricao',
      alvo: `${prescricao.pacienteId}/${id}`,
      nivel: 'alerta',
    });
    return { id, deletado: true };
  },

  async listarAdministracoes(
    ator: AtorMedicacao,
    pacienteId?: string,
    de?: string,
    ate?: string,
  ): Promise<Administracao[]> {
    if (pacienteId) {
      await pacientePermitido(pacienteId, ator);
      return administracoesRepo.listByPaciente(pacienteId, de, ate);
    }
    const meus =
      ator.role === 'admin'
        ? await pacientesRepo.listOrdenadoPorNome()
        : await pacientesRepo.listByUsuario(ator.uid);
    const listas = await Promise.all(
      meus.map((p) => administracoesRepo.listByPaciente(p.id, de, ate)),
    );
    return listas.flat();
  },

  async registrarAdministracao(
    cmd: RegistrarAdministracaoCmd,
    ator: AtorMedicacao,
  ): Promise<Administracao> {
    const prescricao = await prescricoesRepo.findById(cmd.prescricaoId);
    if (!prescricao) throw new NotFoundError('Prescrição não encontrada');
    const paciente = await pacientePermitido(prescricao.pacienteId, ator);

    const existente = await administracoesRepo.findBySlot(
      cmd.prescricaoId,
      cmd.data,
      cmd.horario,
    );

    const registradoPorNome =
      ator.nome ?? (await usuariosRepo.findById(ator.uid))?.nome ?? ator.uid;
    const administracao = existente
      ? await administracoesRepo.update(existente.id, {
          status: cmd.status,
          registradoPor: ator.uid,
          registradoPorNome,
          ...(cmd.observacao !== undefined ? { observacao: cmd.observacao } : {}),
          criadoEm: new Date().toISOString(),
        })
      : await administracoesRepo.create({
          prescricaoId: cmd.prescricaoId,
          pacienteId: prescricao.pacienteId,
          data: cmd.data,
          horario: cmd.horario,
          status: cmd.status,
          registradoPor: ator.uid,
          registradoPorNome,
          ...(cmd.observacao ? { observacao: cmd.observacao } : {}),
          criadoEm: new Date().toISOString(),
        });

    if (!administracao) throw new ConflictError('Não foi possível registrar a administração');

    // Baixa no estoque somente na primeira vez que a dose é administrada,
    // para que o reenvio da fila offline não desconte em duplicidade.
    const baixarEstoque =
      cmd.status === 'administrado' && existente?.status !== 'administrado' && prescricao.materialId;
    if (baixarEstoque && prescricao.materialId) {
      const resultado = await estoqueRepo.movimentar(
        prescricao.materialId,
        -prescricao.quantidadePorDose,
      );
      if (resultado.insuficiente) {
        console.warn(
          `[medicacao] estoque insuficiente para ${prescricao.medicamento} (${prescricao.materialId})`,
        );
      }
    }

    await auditoriaRepo.create({
      ator: ator.uid,
      acao: 'administrar_medicacao',
      alvo: `${prescricao.pacienteId}/${prescricao.id}/${cmd.data} ${cmd.horario}`,
      nivel: cmd.status === 'recusado' ? 'alerta' : 'info',
    });

    void notificacaoService
      .enviarParaUids(
        [...new Set([...paciente.responsavelIds, ...paciente.familiarIds])].filter(
          (uid) => uid !== ator.uid,
        ),
        {
          title: `Medicação ${cmd.status === 'administrado' ? 'administrada' : 'não administrada'}`,
          body: `${paciente.nome}: ${prescricao.medicamento} ${prescricao.dose} (${cmd.horario})`,
          tag: `medicacao-${prescricao.id}-${cmd.data}-${cmd.horario}`,
          renotify: true,
          data: {
            pacienteId: prescricao.pacienteId,
            prescricaoId: prescricao.id,
            tipo: 'medicacao',
            tag: `medicacao-${prescricao.id}-${cmd.data}-${cmd.horario}`,
            url: '/responsavel/medicacao',
          },
          link: '/responsavel/medicacao',
        },
      )
      .catch((erro) => console.error('[medicacao] falha ao notificar família.', erro));

    return administracao;
  },

  /** Alerta a família quando uma dose passa da janela sem registro. */
  async verificarAtrasos(agora = new Date()): Promise<{ alertas: number; verificadas: number }> {
    const { data, diaSemana, minutos } = dataHoraSaoPaulo(agora);
    const prescricoes = await prescricoesRepo.listAtivas();
    let alertas = 0;

    for (const prescricao of prescricoes) {
      if (!aplicaNoDia(prescricao, data, diaSemana)) continue;

      for (const horario of prescricao.horarios) {
        const alvo = minutosDe(horario);
        const atraso = minutos - alvo;
        if (atraso <= JANELA_ATRASO) continue;

        const criado = dataHoraSaoPaulo(new Date(prescricao.criadoEm));
        if (criado.data === data && criado.minutos > alvo) continue;

        const administracao = await administracoesRepo.findBySlot(prescricao.id, data, horario);
        if (administracao) continue;

        const marcador = db
          .collection('alertas_medicacao')
          .doc(`${prescricao.id}_${data}_${horario}`);
        const existente = await marcador.get();
        if (existente.exists) continue;
        await marcador.set({ criadoEm: new Date().toISOString() });

        const paciente = await pacientesRepo.findById(prescricao.pacienteId);
        if (!paciente) continue;

        void notificacaoService
          .enviarParaUids(
            [...new Set([...paciente.responsavelIds, ...paciente.familiarIds])],
            {
              title: 'Medicação atrasada',
              body: `${paciente.nome}: ${prescricao.medicamento} das ${horario} sem registro.`,
              tag: `medicacao-atraso-${prescricao.id}-${data}-${horario}`,
              renotify: true,
              requireInteraction: true,
              data: {
                pacienteId: prescricao.pacienteId,
                prescricaoId: prescricao.id,
                tipo: 'medicacao',
                tag: `medicacao-atraso-${prescricao.id}-${data}-${horario}`,
                url: '/responsavel/medicacao',
              },
              link: '/responsavel/medicacao',
            },
          )
          .catch((erro) => console.error('[medicacao] falha ao alertar atraso.', erro));

        alertas++;
      }
    }

    return { alertas, verificadas: prescricoes.length };
  },
};
