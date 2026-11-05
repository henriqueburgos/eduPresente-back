import { ForbiddenError, NotFoundError } from '../domain/errors.js';
import type { Role } from '../domain/types/roles.js';
import type { CriarDocumentoCmd } from '../domain/schemas/commands.js';
import type { Documento } from '../domain/types/documento.js';
import type { Aluno } from '../domain/types/entidades.js';
import { documentosRepo } from '../repositories/documentos.repo.js';
import { alunosRepo } from '../repositories/alunos.repo.js';
import { usuariosRepo } from '../repositories/usuarios.repo.js';
import { auditoriaRepo } from '../repositories/auditoria.repo.js';
import { storage } from '../config/firebase.js';

export interface AtorDocumento {
  uid: string;
  role: Role;
}

function podeAcessar(paciente: Aluno, ator: AtorDocumento): boolean {
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

async function pacientePermitido(alunoId: string, ator: AtorDocumento): Promise<Aluno> {
  const paciente = await alunosRepo.findById(alunoId);
  if (!paciente) throw new NotFoundError('Aluno não encontrado');
  if (!podeAcessar(paciente, ator)) {
    throw new ForbiddenError('Aluno não vinculado ao usuário');
  }
  return paciente;
}

export const documentoService = {
  async listar(ator: AtorDocumento, alunoId?: string): Promise<Documento[]> {
    if (alunoId) {
      await pacientePermitido(alunoId, ator);
      return documentosRepo.listByAluno(alunoId);
    }
    if (ator.role === 'admin') return documentosRepo.listAll();
    const meus = await alunosRepo.listByUsuario(ator.uid);
    return documentosRepo.listByAlunos(meus.map((p) => p.id));
  },

  async criar(cmd: CriarDocumentoCmd, ator: AtorDocumento): Promise<Documento> {
    await pacientePermitido(cmd.alunoId, ator);
    const usuario = await usuariosRepo.findById(ator.uid);
    const documento = await documentosRepo.create({
      alunoId: cmd.alunoId,
      nome: cmd.nome,
      categoria: cmd.categoria,
      url: cmd.url,
      path: cmd.path,
      contentType: cmd.contentType,
      tamanho: cmd.tamanho,
      enviadoPor: ator.uid,
      enviadoPorNome: usuario?.nome ?? ator.uid,
    });
    await auditoriaRepo.create({
      ator: ator.uid,
      acao: 'enviar_documento',
      alvo: `${cmd.alunoId}/${documento.id}`,
      nivel: 'info',
    });
    return documento;
  },

  async remover(id: string, ator: AtorDocumento): Promise<{ id: string; deletado: true }> {
    const documento = await documentosRepo.findById(id);
    if (!documento) throw new NotFoundError('Documento não encontrado');
    await pacientePermitido(documento.alunoId, ator);

    await documentosRepo.remove(id);
    try {
      await storage.bucket().file(documento.path).delete({ ignoreNotFound: true });
    } catch (erro) {
      console.warn('[documento] falha ao remover arquivo do Storage.', erro);
    }

    await auditoriaRepo.create({
      ator: ator.uid,
      acao: 'remover_documento',
      alvo: `${documento.alunoId}/${id}`,
      nivel: 'alerta',
    });
    return { id, deletado: true };
  },
};
