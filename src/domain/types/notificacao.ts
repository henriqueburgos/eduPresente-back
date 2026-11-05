export interface NotificacaoUsuario {
  id: string;
  titulo: string;
  corpo: string;
  tipo?: string | undefined;
  lida: boolean;
  criadaEm: string; // ISO timestamp
  dados?: Record<string, string> | undefined;
  link?: string | undefined;
}
