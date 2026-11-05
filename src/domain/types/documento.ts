export type CategoriaDocumento = 'exame' | 'receita' | 'laudo' | 'foto' | 'outro';

export const CATEGORIAS_DOCUMENTO: readonly CategoriaDocumento[] = [
  'exame',
  'receita',
  'laudo',
  'foto',
  'outro',
] as const;

export interface Documento {
  id: string;
  escolaId?: string | undefined;
  alunoId: string;
  nome: string;
  categoria: CategoriaDocumento;
  url: string;
  path: string;
  contentType: string;
  tamanho: number;
  enviadoPor: string;
  enviadoPorNome: string;
  criadoEm: string; // ISO
}
