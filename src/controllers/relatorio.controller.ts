import type { Request, Response } from 'express';

import { relatorioService } from '../services/relatorio.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function dataValida(valor: unknown): string | null {
  return typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : null;
}

const DATA_SP = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function hojeSp(): string {
  return DATA_SP.format(new Date());
}

function diasAtrasSp(dias: number): string {
  return DATA_SP.format(new Date(Date.now() - dias * 86_400_000));
}

export const relatorioController = {
  paciente: asyncHandler(async (req: Request, res: Response) => {
    const ator = { uid: req.user!.uid, role: req.user!.role };

    const de = dataValida(req.query['de']) ?? diasAtrasSp(29);
    const ate = dataValida(req.query['ate']) ?? hojeSp();

    const { buffer, nome } = await relatorioService.gerar(req.params.id!, de, ate, ator);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
    res.send(buffer);
  }),
};
