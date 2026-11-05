import { ConflictError } from './errors.js';
import type { Paciente } from './types/entidades.js';
import type { Role } from './types/roles.js';
import type { TipoMovimentacao } from './types/estoque.js';

export interface AtorEstoque {
  uid: string;
  role: Role;
}

export function podeAcessarPaciente(paciente: Paciente, ator: AtorEstoque): boolean {
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
  // Cuidador não administra o estoque, mas precisa consumir materiais ao
  // registrar o cuidado do dia.
  if (ator.role === 'cuidador') {
    return paciente.cuidadorIds.includes(ator.uid);
  }
  return false;
}

export function calcularNovaQuantidade(
  quantidadeAtual: number,
  tipo: TipoMovimentacao,
  quantidade: number,
): number {
  const nova = tipo === 'entrada' ? quantidadeAtual + quantidade : quantidadeAtual - quantidade;
  if (nova < 0) throw new ConflictError('Estoque insuficiente para a saída');
  return nova;
}
