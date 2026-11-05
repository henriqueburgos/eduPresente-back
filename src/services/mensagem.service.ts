import { ForbiddenError, NotFoundError } from '../domain/errors.js';
import type { Role } from '../domain/types/roles.js';
import type { CriarMensagemCmd } from '../domain/schemas/commands.js';
import type { Mensagem } from '../domain/types/mensagem.js';
import type { Aluno } from '../domain/types/entidades.js';
import { mensagensRepo } from '../repositories/mensagens.repo.js';
import { alunosRepo } from '../repositories/alunos.repo.js';
import { usuariosRepo } from '../repositories/usuarios.repo.js';
import { notificacaoService } from './notificacao.service.js';

export interface AtorMensagem {
  uid: string;
  role: Role;
}

function podeAcessar(paciente: Aluno, ator: AtorMensagem): boolean {
  if (ator.role === 'admin') return true;
  return (
    paciente.professorIds.includes(ator.uid) ||
    paciente.responsavelIds.includes(ator.uid) ||
    paciente.familiarIds.includes(ator.uid)
  );
}

async function pacientePermitido(alunoId: string, ator: AtorMensagem): Promise<Aluno> {
  const paciente = await alunosRepo.findById(alunoId);
  if (!paciente) throw new NotFoundError('Aluno não encontrado');
  if (!podeAcessar(paciente, ator)) {
    throw new ForbiddenError('Aluno não vinculado ao usuário');
  }
  return paciente;
}

const LIMITE_TEXTO = 2000;

export const mensagemService = {
  async listar(ator: AtorMensagem, alunoId?: string): Promise<Mensagem[]> {
    if (alunoId) {
      await pacientePermitido(alunoId, ator);
      return mensagensRepo.listByAluno(alunoId);
    }
    if (ator.role === 'admin') return mensagensRepo.listAll();
    const meus = await alunosRepo.listByUsuario(ator.uid);
    return mensagensRepo.listByAlunos(meus.map((p) => p.id));
  },

  async criar(cmd: CriarMensagemCmd, ator: AtorMensagem): Promise<Mensagem> {
    const paciente = await pacientePermitido(cmd.alunoId, ator);
    const texto = cmd.texto.trim().slice(0, LIMITE_TEXTO);
    const autor = await usuariosRepo.findById(ator.uid);
    const autorNome = autor?.nome ?? ator.uid;

    const mensagem = await mensagensRepo.create({
      alunoId: cmd.alunoId,
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
        ...paciente.professorIds,
      ]),
    ].filter((uid) => uid !== ator.uid);

    if (participantes.length > 0) {
      void notificacaoService
        .enviarParaUids(participantes, {
          title: `Nova mensagem de ${autorNome}`,
          body: `${paciente.nome}: ${texto}`.slice(0, 180),
          tag: `mensagem-${cmd.alunoId}`,
          renotify: true,
          data: {
            alunoId: cmd.alunoId,
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

  async marcarLidas(alunoId: string, ator: AtorMensagem): Promise<{ atualizadas: number }> {
    await pacientePermitido(alunoId, ator);
    const atualizadas = await mensagensRepo.marcarLidas(alunoId, ator.uid);
    return { atualizadas };
  },
};
