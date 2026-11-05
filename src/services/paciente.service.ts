import { ConflictError, ForbiddenError, NotFoundError } from '../domain/errors.js';
import { FieldValue } from 'firebase-admin/firestore';
import type { Role } from '../domain/types/roles.js';
import type { AtualizarPacienteCmd, CriarPacienteCmd } from '../domain/schemas/commands.js';
import { pacientesRepo } from '../repositories/pacientes.repo.js';
import { atividadesRepo } from '../repositories/atividades.repo.js';
import { estoqueRepo } from '../repositories/estoque.repo.js';
import { prescricoesRepo } from '../repositories/prescricoes.repo.js';
import { administracoesRepo } from '../repositories/administracoes.repo.js';
import { ocorrenciasRepo } from '../repositories/ocorrencias.repo.js';
import { documentosRepo } from '../repositories/documentos.repo.js';
import { mensagensRepo } from '../repositories/mensagens.repo.js';
import { db } from '../repositories/base.js';
import { usuariosRepo } from '../repositories/usuarios.repo.js';
import { auditoriaRepo } from '../repositories/auditoria.repo.js';
import { claimsService } from './claims.service.js';

const CAMPOS_CLINICOS = new Set([
  'alergias',
  'tipoSanguineo',
  'contatoEmergencia',
  'medico',
  'convenio',
  'restricoesAlimentares',
  'grauDependencia',
  'observacoesClinicas',
]);

/** Dados pessoais que o próprio responsável/familiar pode ajustar. */
const CAMPOS_PESSOAIS = new Set(['nome', 'idade', 'local', 'quarto', 'fotoUrl', 'condicoes']);

export const pacienteService = {
  async criar(cmd: CriarPacienteCmd, ator: { uid: string; role: Role }) {
    if (ator.role !== 'admin' && ator.role !== 'responsavel' && ator.role !== 'familiar') {
      throw new ForbiddenError('Perfil sem permissão para criar paciente');
    }

    // limite: responsavel/familiar só podem criar 1 paciente
    if (ator.role === 'responsavel' || ator.role === 'familiar') {
      const existentes = await pacientesRepo.listByUsuario(ator.uid);
      const meus = existentes.filter((p) =>
        ator.role === 'responsavel'
          ? p.responsavelIds.includes(ator.uid)
          : p.familiarIds.includes(ator.uid),
      );
      if (meus.length >= 1) {
        throw new ConflictError('Limite de 1 paciente por responsável/familiar atingido');
      }
    }

    const cuidadorIds = [...cmd.cuidadorIds];
    const responsavelIds = [...cmd.responsavelIds];
    const familiarIds = [...cmd.familiarIds];

    // auto-vincula o criador
    if (ator.role === 'responsavel' && !responsavelIds.includes(ator.uid)) responsavelIds.push(ator.uid);
    if (ator.role === 'familiar' && !familiarIds.includes(ator.uid)) familiarIds.push(ator.uid);

    const paciente = await pacientesRepo.create({
      nome: cmd.nome,
      idade: cmd.idade,
      local: cmd.local ?? cmd.quarto ?? '',
      ...(cmd.fotoUrl ? { fotoUrl: cmd.fotoUrl } : {}),
      condicoes: cmd.condicoes,
      cuidadorIds,
      responsavelIds,
      familiarIds,
      entradaEm: new Date().toISOString().slice(0, 10),
      alergias: [],
      restricoesAlimentares: [],
      grauDependencia: 'independente',
    });

    // sincroniza pacienteIds do criador
    if (ator.role === 'responsavel' || ator.role === 'familiar') {
      const u = await usuariosRepo.findById(ator.uid);
      if (u && !u.pacienteIds.includes(paciente.id)) {
        await usuariosRepo.updatePacienteIds(ator.uid, [...u.pacienteIds, paciente.id]);
        await claimsService.atualizarClaims(ator.uid).catch(() => undefined);
      }
    }

    await auditoriaRepo.create({
      ator: ator.uid,
      acao: 'criar_paciente',
      alvo: paciente.id,
      nivel: 'info',
    });

    return paciente;
  },

  async atualizar(id: string, cmd: AtualizarPacienteCmd, ator: { uid: string; role: Role }) {
    if (ator.role !== 'admin' && ator.role !== 'responsavel' && ator.role !== 'familiar') {
      throw new ForbiddenError('Perfil sem permissão para atualizar o paciente');
    }
    const paciente = await pacientesRepo.findById(id);
    if (!paciente) throw new NotFoundError('Paciente não encontrado');

    // Admin organiza o SaaS e pode editar tudo. Responsável/familiar só
    // abastecem o perfil clínico do próprio paciente.
    if (ator.role !== 'admin') {
      const vinculado =
        paciente.responsavelIds.includes(ator.uid) ||
        paciente.familiarIds.includes(ator.uid);
      if (!vinculado) throw new ForbiddenError('Paciente não vinculado ao usuário');

      const camposInvalidos = Object.keys(cmd).filter(
        (campo) => !CAMPOS_CLINICOS.has(campo) && !CAMPOS_PESSOAIS.has(campo),
      );
      if (camposInvalidos.length > 0) {
        throw new ForbiddenError('Perfil pode alterar apenas os dados do paciente');
      }
    }

    const patch: Record<string, unknown> = {};
    if (cmd.nome !== undefined) patch['nome'] = cmd.nome;
    if (cmd.idade !== undefined) patch['idade'] = cmd.idade;
    if (cmd.local !== undefined || cmd.quarto !== undefined) {
      patch['local'] = cmd.local ?? cmd.quarto ?? '';
      patch['quarto'] = FieldValue.delete();
    }
    if (cmd.fotoUrl !== undefined) {
      patch['fotoUrl'] = cmd.fotoUrl ? cmd.fotoUrl : FieldValue.delete();
    }
    if (cmd.condicoes !== undefined) patch['condicoes'] = cmd.condicoes;
    if (cmd.alergias !== undefined) patch['alergias'] = cmd.alergias;
    if (cmd.restricoesAlimentares !== undefined) patch['restricoesAlimentares'] = cmd.restricoesAlimentares;
    if (cmd.grauDependencia !== undefined) patch['grauDependencia'] = cmd.grauDependencia;
    if (cmd.tipoSanguineo !== undefined) {
      patch['tipoSanguineo'] = cmd.tipoSanguineo || FieldValue.delete();
    }
    if (cmd.convenio !== undefined) {
      patch['convenio'] = cmd.convenio || FieldValue.delete();
    }
    if (cmd.contatoEmergencia !== undefined) {
      patch['contatoEmergencia'] = cmd.contatoEmergencia ?? FieldValue.delete();
    }
    if (cmd.medico !== undefined) {
      patch['medico'] = cmd.medico ?? FieldValue.delete();
    }
    if (cmd.observacoesClinicas !== undefined) {
      patch['observacoesClinicas'] = cmd.observacoesClinicas || FieldValue.delete();
    }

    const updated = await pacientesRepo.update(id, patch as Partial<typeof paciente>);
    await auditoriaRepo.create({ ator: ator.uid, acao: 'atualizar_paciente', alvo: id, nivel: 'info' });
    return updated;
  },

  async removerVinculo(id: string, uid: string, ator: { uid: string; role: Role }) {
    if (ator.role !== 'admin') throw new ForbiddenError('Apenas admin');
    const paciente = await pacientesRepo.findById(id);
    if (!paciente) throw new NotFoundError('Paciente não encontrado');

    const cuidadorIds = paciente.cuidadorIds.filter((x) => x !== uid);
    const responsavelIds = paciente.responsavelIds.filter((x) => x !== uid);
    const familiarIds = paciente.familiarIds.filter((x) => x !== uid);

    const updated = await pacientesRepo.update(id, { cuidadorIds, responsavelIds, familiarIds });

    const u = await usuariosRepo.findById(uid);
    if (u) {
      await usuariosRepo.updatePacienteIds(uid, u.pacienteIds.filter((p) => p !== id));
      await claimsService.atualizarClaims(uid).catch(() => undefined);
    }

    await auditoriaRepo.create({ ator: ator.uid, acao: 'desvincular_paciente', alvo: `${id}/${uid}`, nivel: 'info' });
    return updated;
  },

  async deletar(id: string, ator: { uid: string; role: Role }) {
    if (ator.role !== 'admin') throw new ForbiddenError('Apenas admin');
    const paciente = await pacientesRepo.findById(id);
    if (!paciente) throw new NotFoundError('Paciente não encontrado');

    // remove vínculos em usuarios
    const uids = [...paciente.cuidadorIds, ...paciente.responsavelIds, ...paciente.familiarIds];
    for (const uid of [...new Set(uids)]) {
      const u = await usuariosRepo.findById(uid);
      if (u) {
        await usuariosRepo.updatePacienteIds(uid, u.pacienteIds.filter((p) => p !== id));
        await claimsService.atualizarClaims(uid).catch(() => undefined);
      }
    }

    // remove atividades do paciente
    const atividades = await atividadesRepo.listByPaciente(id);
    for (const a of atividades) {
      await db.collection('atividades').doc(a.id).delete();
    }

    // remove estoque do paciente
    await estoqueRepo.removeByPaciente(id);

    // remove prescrições e administrações
    await administracoesRepo.removeByPaciente(id);
    await prescricoesRepo.removeByPaciente(id);

    // remove ocorrências
    await ocorrenciasRepo.removeByPaciente(id);

    // remove documentos (metadados)
    await documentosRepo.removeByPaciente(id);

    // remove mensagens
    await mensagensRepo.removeByPaciente(id);

    // remove paciente
    await db.collection('pacientes').doc(id).delete();

    await auditoriaRepo.create({ ator: ator.uid, acao: 'deletar_paciente', alvo: id, nivel: 'critico' });
    return { id, deletado: true };
  },
};