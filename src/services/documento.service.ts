import { ForbiddenError, NotFoundError } from '../domain/errors.js';
import type { Role } from '../domain/types/roles.js';
import type { CriarDocumentoCmd } from '../domain/schemas/commands.js';
import type { Documento } from '../domain/types/documento.js';
import type { Paciente } from '../domain/types/entidades.js';
import { documentosRepo } from '../repositories/documentos.repo.js';
import { pacientesRepo } from '../repositories/pacientes.repo.js';
import { usuariosRepo } from '../repositories/usuarios.repo.js';
import { auditoriaRepo } from '../repositories/auditoria.repo.js';
import { storage } from '../config/firebase.js';

export interface AtorDocumento {
  uid: string;
  role: Role;
}

function podeAcessar(paciente: Paciente, ator: AtorDocumento): boolean {
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

async function pacientePermitido(pacienteId: string, ator: AtorDocumento): Promise<Paciente> {
  const paciente = await pacientesRepo.findById(pacienteId);
  if (!paciente) throw new NotFoundError('Paciente não encontrado');
  if (!podeAcessar(paciente, ator)) {
    throw new ForbiddenError('Paciente não vinculado ao usuário');
  }
  return paciente;
}

export const documentoService = {
  async listar(ator: AtorDocumento, pacienteId?: string): Promise<Documento[]> {
    if (pacienteId) {
      await pacientePermitido(pacienteId, ator);
      return documentosRepo.listByPaciente(pacienteId);
    }
    if (ator.role === 'admin') return documentosRepo.listAll();
    const meus = await pacientesRepo.listByUsuario(ator.uid);
    return documentosRepo.listByPacientes(meus.map((p) => p.id));
  },

  async criar(cmd: CriarDocumentoCmd, ator: AtorDocumento): Promise<Documento> {
    await pacientePermitido(cmd.pacienteId, ator);
    const usuario = await usuariosRepo.findById(ator.uid);
    const documento = await documentosRepo.create({
      pacienteId: cmd.pacienteId,
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
      alvo: `${cmd.pacienteId}/${documento.id}`,
      nivel: 'info',
    });
    return documento;
  },

  async remover(id: string, ator: AtorDocumento): Promise<{ id: string; deletado: true }> {
    const documento = await documentosRepo.findById(id);
    if (!documento) throw new NotFoundError('Documento não encontrado');
    await pacientePermitido(documento.pacienteId, ator);

    await documentosRepo.remove(id);
    try {
      await storage.bucket().file(documento.path).delete({ ignoreNotFound: true });
    } catch (erro) {
      console.warn('[documento] falha ao remover arquivo do Storage.', erro);
    }

    await auditoriaRepo.create({
      ator: ator.uid,
      acao: 'remover_documento',
      alvo: `${documento.pacienteId}/${id}`,
      nivel: 'alerta',
    });
    return { id, deletado: true };
  },
};
