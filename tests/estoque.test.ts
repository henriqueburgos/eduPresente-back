import { describe, expect, it } from 'vitest';

import {
  AtualizarMaterialCmdSchema,
  CriarMaterialCmdSchema,
  MovimentarEstoqueCmdSchema,
} from '../src/domain/schemas/commands.js';
import { calcularNovaQuantidade, podeAcessarAluno } from '../src/domain/regras-estoque.js';
import type { Aluno } from '../src/domain/types/entidades.js';

const paciente: Aluno = {
  id: 'pac-1',
  nome: 'Alzira',
  idade: 84,
  local: '102-A',
  condicoes: [],
  responsavelIds: ['resp-1'],
  professorIds: ['cuid-1'],
  familiarIds: ['fam-1'],
  entradaEm: '2026-01-01',
  alergias: [],
  restricoesAlimentares: [],
  grauDependencia: 'independente',
};

describe('estoque schemas', () => {
  it('aceita o payload enviado pelo front', () => {
    const r = CriarMaterialCmdSchema.safeParse({
      alunoId: 'pac-1',
      nome: 'Dipirona',
      categoria: 'remedio',
      quantidade: 2,
      unidade: 'cx',
      quantidadeMinima: 1,
    });
    expect(r.success).toBe(true);
  });

  it('rejeita categoria desconhecida', () => {
    const r = CriarMaterialCmdSchema.safeParse({
      alunoId: 'pac-1',
      nome: 'X',
      categoria: 'invalida',
      quantidade: 0,
      unidade: 'un',
    });
    expect(r.success).toBe(false);
  });

  it('rejeita quantidade negativa', () => {
    const r = CriarMaterialCmdSchema.safeParse({
      alunoId: 'pac-1',
      nome: 'X',
      categoria: 'outro',
      quantidade: -1,
      unidade: 'un',
    });
    expect(r.success).toBe(false);
  });

  it('atualização aceita campos parciais', () => {
    expect(AtualizarMaterialCmdSchema.safeParse({ quantidade: 3 }).success).toBe(true);
    expect(AtualizarMaterialCmdSchema.safeParse({}).success).toBe(true);
  });

  it('movimentação exige quantidade inteira positiva', () => {
    expect(MovimentarEstoqueCmdSchema.safeParse({ tipo: 'entrada', quantidade: 1 }).success).toBe(true);
    expect(MovimentarEstoqueCmdSchema.safeParse({ tipo: 'saida', quantidade: 0 }).success).toBe(false);
    expect(MovimentarEstoqueCmdSchema.safeParse({ tipo: 'saida', quantidade: 1.5 }).success).toBe(false);
  });
});

describe('estoque permissões', () => {
  it('admin acessa qualquer paciente', () => {
    expect(podeAcessarAluno(paciente, { uid: 'qualquer', role: 'admin' })).toBe(true);
  });

  it('responsável vinculado acessa', () => {
    expect(podeAcessarAluno(paciente, { uid: 'resp-1', role: 'responsavel' })).toBe(true);
  });

  it('familiar vinculado acessa', () => {
    expect(podeAcessarAluno(paciente, { uid: 'fam-1', role: 'responsavel' })).toBe(true);
  });

  it('familiar com vínculo de cuidador acessa', () => {
    expect(podeAcessarAluno(paciente, { uid: 'cuid-1', role: 'responsavel' })).toBe(true);
  });

  it('responsável não vinculado é bloqueado', () => {
    expect(podeAcessarAluno(paciente, { uid: 'resp-2', role: 'responsavel' })).toBe(false);
  });

  it('cuidador vinculado acessa (consumo no registro do cuidado)', () => {
    expect(podeAcessarAluno(paciente, { uid: 'cuid-1', role: 'professor' })).toBe(true);
  });

  it('cuidador não vinculado é bloqueado', () => {
    expect(podeAcessarAluno(paciente, { uid: 'cuid-2', role: 'professor' })).toBe(false);
  });
});

describe('estoque movimentação', () => {
  it('entrada soma', () => {
    expect(calcularNovaQuantidade(2, 'entrada', 3)).toBe(5);
  });

  it('saída subtrai', () => {
    expect(calcularNovaQuantidade(5, 'saida', 3)).toBe(2);
  });

  it('saída não permite saldo negativo', () => {
    expect(() => calcularNovaQuantidade(2, 'saida', 3)).toThrow('Estoque insuficiente');
  });

  it('saída que zera é permitida', () => {
    expect(calcularNovaQuantidade(3, 'saida', 3)).toBe(0);
  });
});
