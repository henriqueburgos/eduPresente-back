export type CategoriaAgenda = 'rotina' | 'lembrete';

export const CATEGORIAS_AGENDA: readonly CategoriaAgenda[] = ['rotina', 'lembrete'] as const;

export interface ItemAgenda {
  id: string;
  alunoId: string;
  categoria: CategoriaAgenda;
  rotinaId?: string | undefined;
  titulo: string;
  descricao?: string | undefined;
  horario: string; // HH:mm
  diasSemana: number[]; // 0 = domingo ... 6 = sábado
  ativo: boolean;
  ultimoEnvioEm?: string | undefined;
  criadoPor: string;
  criadoEm: string;
  atualizadoEm: string;
}
