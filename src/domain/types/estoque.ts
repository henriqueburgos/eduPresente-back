export type CategoriaMaterial = 'remedio' | 'alimento' | 'higiene' | 'descartavel' | 'roupa' | 'outro';

export const CATEGORIAS_MATERIAL: readonly CategoriaMaterial[] = [
  'remedio',
  'alimento',
  'higiene',
  'descartavel',
  'roupa',
  'outro',
] as const;

export type TipoMovimentacao = 'entrada' | 'saida';

export const TIPOS_MOVIMENTACAO: readonly TipoMovimentacao[] = ['entrada', 'saida'] as const;
