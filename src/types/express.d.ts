import type { Role } from '../domain/types/roles.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
        role: Role;
        pacienteIds: string[];
      };
    }
  }
}

export {};