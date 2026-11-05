import { ForbiddenError, NotFoundError } from '../domain/errors.js';
import type { Role } from '../domain/types/roles.js';
import type { CriarMensagemCmd } from '../domain/schemas/commands.js';
import type { Mensagem } from '../domain/types/mensagem.js';
import type { Paciente } from '../domain/types/entidades.js';
import { mensagensRepo } from '../repositories/mensagens.repo.js';
import { pacientesRepo } from '../repositories/pacientes.repo.js';
import { usuariosRepo } from '../repositories/usuarios.repo.js';
import { notificacaoService } from './notificacao.service.js';

export interface AtorMensagem {
  uid: string;
  role: Role;
}

function podeAcessar(paciente: Paciente, ator: AtorMensagem): boolean {
  if (ator.role === 'admin') return true;
  return (
    paciente.cuidadorIds.includes(ator.uid) ||
    paciente.responsavelIds.includes(ator.uid) ||
    paciente.familiarIds.includes(ator.uid)
  );
}

async function pacientePermitido(pacienteId: string, ator: AtorMensagem): Promise<Paciente> {
  const paciente = await pacientesRepo.findById(pacienteId);
  if (!paciente) throw new NotFoundError('Paciente não encontrado');
  if (!podeAcessar(paciente, ator)) {
    throw new ForbiddenError('Paciente não vinculado ao usuário');
  }
  return paciente;
}

const LIMITE_TEXTO = 2000;

export const mensagemService = {
  async listar(ator: AtorMensagem, pacienteId?: string): Promise<Mensagem[]> {
    if (pacienteId) {
      await pacientePermitido(pacienteId, ator);
      return mensagensRepo.listByPaciente(pacienteId);
    }
    if (ator.role === 'admin') return mensagensRepo.listAll();
    const meus = await pacientesRepo.listByUsuario(ator.uid);
    return mensagensRepo.listByPacientes(meus.map((p) => p.id));
  },

  async criar(cmd: CriarMensagemCmd, ator: AtorMensagem): Promise<Mensagem> {
    const paciente = await pacientePermitido(cmd.pacienteId, ator);
    const texto = cmd.texto.trim().slice(0, LIMITE_TEXTO);
    const autor = await usuariosRepo.findById(ator.uid);
    const autorNome = autor?.nome ?? ator.uid;

    const mensagem = await mensagensRepo.create({
      pacienteId: cmd.pacienteId,
      autorUid: ator.uid,
      autorNome,
      autorRole: ator.role,
      texto,
      lidaPor: [ator.uid],
    });

    const participantes = [
      ...new Set([
        ...paciente.responsavelIds,
        ...paciente.familiarIds,
        ...paciente.cuidadorIds,
      ]),
    ].filter((uid) => uid !== ator.uid);

    if (participantes.length > 0) {
      void notificacaoService
        .enviarParaUids(participantes, {
          title: `Nova mensagem de ${autorNome}`,
          body: `${paciente.nome}: ${texto}`.slice(0, 180),
          tag: `mensagem-${cmd.pacienteId}`,
          renotify: true,
          data: {
            pacienteId: cmd.pacienteId,
            mensagemId: mensagem.id,
            tipo: 'mensagem',
            url: '/mensagens',
          },
          link: '/mensagens',
        })
        .catch((erro) => console.error('[mensagem] falha ao notificar participantes.', erro));
    }

    return mensagem;
  },

  async marcarLidas(pacienteId: string, ator: AtorMensagem): Promise<{ atualizadas: number }> {
    await pacientePermitido(pacienteId, ator);
    const atualizadas = await mensagensRepo.marcarLidas(pacienteId, ator.uid);
    return { atualizadas };
  },
};
