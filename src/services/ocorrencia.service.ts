import { ForbiddenError, NotFoundError } from '../domain/errors.js';
import type { Role } from '../domain/types/roles.js';
import type { AtualizarOcorrenciaCmd, CriarOcorrenciaCmd } from '../domain/schemas/commands.js';
import type { Ocorrencia } from '../domain/types/ocorrencia.js';
import type { Paciente } from '../domain/types/entidades.js';
import { ocorrenciasRepo } from '../repositories/ocorrencias.repo.js';
import { pacientesRepo } from '../repositories/pacientes.repo.js';
import { usuariosRepo } from '../repositories/usuarios.repo.js';
import { auditoriaRepo } from '../repositories/auditoria.repo.js';
import { notificacaoService } from './notificacao.service.js';

export interface AtorOcorrencia {
  uid: string;
  role: Role;
  escolaId?: string;
}

const TITULO_GRAVIDADE: Record<Ocorrencia['gravidade'], string> = {
  baixa: 'Ocorrência registrada',
  media: 'Ocorrência registrada',
  alta: 'Ocorrência grave registrada',
  critica: 'Ocorrência crítica registrada',
};

function podeAcessar(paciente: Paciente, ator: AtorOcorrencia): boolean {
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

async function pacientePermitido(pacienteId: string, ator: AtorOcorrencia): Promise<Paciente> {
  const paciente = await pacientesRepo.findById(pacienteId);
  if (!paciente) throw new NotFoundError('Paciente não encontrado');
  if (!podeAcessar(paciente, ator)) {
    throw new ForbiddenError('Paciente não vinculado ao usuário');
  }
  return paciente;
}

async function nomeDoAtor(uid: string): Promise<string> {
  const u = await usuariosRepo.findById(uid);
  return u?.nome ?? uid;
}

export const ocorrenciaService = {
  async listar(ator: AtorOcorrencia, pacienteId?: string): Promise<Ocorrencia[]> {
    if (pacienteId) {
      await pacientePermitido(pacienteId, ator);
      return ocorrenciasRepo.listByPaciente(pacienteId);
    }
    if (ator.role === 'admin') return ocorrenciasRepo.listAll();
    const meus = await pacientesRepo.listByUsuario(ator.uid);
    return ocorrenciasRepo.listByPacientes(meus.map((p) => p.id));
  },

  async criar(cmd: CriarOcorrenciaCmd, ator: AtorOcorrencia): Promise<Ocorrencia> {
    const paciente = await pacientePermitido(cmd.pacienteId, ator);
    const ocorrencia = await ocorrenciasRepo.create({
      pacienteId: cmd.pacienteId,
      titulo: cmd.titulo,
      descricao: cmd.descricao,
      gravidade: cmd.gravidade,
      status: 'aberta',
      registradoPor: ator.uid,
      registradoPorNome: await nomeDoAtor(ator.uid),
    });

    await auditoriaRepo.create({
      ator: ator.uid,
      acao: 'criar_ocorrencia',
      alvo: `${cmd.pacienteId}/${ocorrencia.id}`,
      nivel: cmd.gravidade === 'critica' || cmd.gravidade === 'alta' ? 'critico' : 'alerta',
    });

    const destinatarios = [
      ...new Set([...paciente.responsavelIds, ...paciente.familiarIds]),
    ].filter((uid) => uid !== ator.uid);

    if (destinatarios.length > 0) {
      const grave = cmd.gravidade === 'alta' || cmd.gravidade === 'critica';
      void notificacaoService
        .enviarParaUids(destinatarios, {
          title: TITULO_GRAVIDADE[cmd.gravidade],
          body: `${paciente.nome}: ${cmd.titulo}`.slice(0, 180),
          tag: `ocorrencia-${ocorrencia.id}`,
          renotify: true,
          requireInteraction: grave,
          ...(grave ? { vibrate: [300, 100, 300, 100, 300] } : {}),
          data: {
            pacienteId: cmd.pacienteId,
            ocorrenciaId: ocorrencia.id,
            tipo: 'ocorrencia',
            tag: `ocorrencia-${ocorrencia.id}`,
            url: '/responsavel/ocorrencias',
          },
          link: '/responsavel/ocorrencias',
        })
        .catch((erro) => console.error('[ocorrencia] falha ao notificar família.', erro));
    }

    return ocorrencia;
  },

  async atualizar(
    id: string,
    cmd: AtualizarOcorrenciaCmd,
    ator: AtorOcorrencia,
  ): Promise<Ocorrencia> {
    const ocorrencia = await ocorrenciasRepo.findById(id);
    if (!ocorrencia) throw new NotFoundError('Ocorrência não encontrada');
    const paciente = await pacientePermitido(ocorrencia.pacienteId, ator);

    const patch: Record<string, unknown> = {};
    if (cmd.titulo !== undefined) patch['titulo'] = cmd.titulo;
    if (cmd.descricao !== undefined) patch['descricao'] = cmd.descricao;
    if (cmd.gravidade !== undefined) patch['gravidade'] = cmd.gravidade;
    if (cmd.status !== undefined) {
      patch['status'] = cmd.status;
      if (cmd.status === 'resolvida') patch['resolvidoEm'] = new Date().toISOString();
    }
    if (cmd.resolucao !== undefined) {
      patch['resolucao'] = cmd.resolucao ? cmd.resolucao : null;
    }

    const updated = await ocorrenciasRepo.update(id, patch);
    if (!updated) throw new NotFoundError('Ocorrência não encontrada');

    await auditoriaRepo.create({
      ator: ator.uid,
      acao: 'atualizar_ocorrencia',
      alvo: `${ocorrencia.pacienteId}/${id}`,
      nivel: updated.status === 'resolvida' ? 'info' : 'alerta',
    });

    if (cmd.status !== undefined && cmd.status !== ocorrencia.status) {
      const destinatarios = [
        ...new Set([...paciente.responsavelIds, ...paciente.familiarIds]),
      ].filter((uid) => uid !== ator.uid);
      if (destinatarios.length > 0) {
        void notificacaoService
          .enviarParaUids(destinatarios, {
            title: updated.status === 'resolvida' ? 'Ocorrência resolvida' : 'Ocorrência atualizada',
            body: `${paciente.nome}: ${updated.titulo}`,
            tag: `ocorrencia-${id}`,
            renotify: true,
            data: {
              pacienteId: ocorrencia.pacienteId,
              ocorrenciaId: id,
              tipo: 'ocorrencia',
              tag: `ocorrencia-${id}`,
              url: '/responsavel/ocorrencias',
            },
            link: '/responsavel/ocorrencias',
          })
          .catch((erro) => console.error('[ocorrencia] falha ao notificar atualização.', erro));
      }
    }

    return updated;
  },
};
