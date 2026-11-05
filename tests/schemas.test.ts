import { describe, it, expect } from 'vitest';

import { RegistrarAtividadeCmdSchema, ConviteCmdSchema, PatchUsuarioCmdSchema } from '../src/domain/schemas/commands.js';

describe('schemas', () => {
  it('RegistrarAtividadeCmd válido', () => {
    const r = RegistrarAtividadeCmdSchema.safeParse({ alunoId: 'p1', tipo: 'alimentacao', descricao: 'ok' });
    expect(r.success).toBe(true);
  });

  it('RegistrarAtividadeCmd inválido (tipo)', () => {
    const r = RegistrarAtividadeCmdSchema.safeParse({ alunoId: 'p1', tipo: 'foo', descricao: 'ok' });
    expect(r.success).toBe(false);
  });

  it('RegistrarAtividadeCmd aceita clientRequestId da fila offline', () => {
    const r = RegistrarAtividadeCmdSchema.safeParse({
      alunoId: 'p1',
      tipo: 'alimentacao',
      descricao: 'ok',
      clientRequestId: 'req-abc-123',
    });
    expect(r.success).toBe(true);
  });

  it('RegistrarAtividadeCmd aceita consumo de estoque', () => {
    const r = RegistrarAtividadeCmdSchema.safeParse({
      alunoId: 'p1',
      tipo: 'higiene',
      descricao: 'Banho com sabonete',
      consumos: [{ materialId: 'est-1', quantidade: 2 }],
    });
    expect(r.success).toBe(true);
  });

  it('RegistrarAtividadeCmd rejeita consumo inválido', () => {
    const base = { alunoId: 'p1', tipo: 'higiene', descricao: 'ok' };
    expect(
      RegistrarAtividadeCmdSchema.safeParse({
        ...base,
        consumos: [{ materialId: 'est-1', quantidade: 0 }],
      }).success,
    ).toBe(false);
    expect(
      RegistrarAtividadeCmdSchema.safeParse({
        ...base,
        consumos: [{ materialId: '', quantidade: 1 }],
      }).success,
    ).toBe(false);
  });

  it('ConviteCmd válido', () => {
    const r = ConviteCmdSchema.safeParse({ nome: 'X', email: 'x@y.com', role: 'admin', alunoIds: [] });
    expect(r.success).toBe(true);
  });

  it('PatchUsuarioCmd válido', () => {
    const r = PatchUsuarioCmdSchema.safeParse({ ativo: false });
    expect(r.success).toBe(true);
  });
});