import type { Role } from './roles.js';

export interface Mensagem {
  id: string;
  escolaId?: string | undefined;
  alunoId: string;
  autorUid: string;
  autorNome: string;
  autorRole: Role;
  texto: string;
  criadoEm: string; // ISO
  lidaPor: string[];
}
