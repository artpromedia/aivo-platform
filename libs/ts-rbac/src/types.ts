import type { Role } from './roles.js';

export interface AuthContext {
  userId: string;
  tenantId: string;
  roles: Role[];
}

export type AuthenticatedUser = AuthContext;
export type MaybeAuthContext = AuthContext | undefined;

export type WithAuth<T> = T & { auth?: AuthContext; user?: AuthenticatedUser };

// Fastify augmentation
declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
    user?: AuthenticatedUser;
  }
}

// Express augmentation
declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
      user?: AuthenticatedUser;
    }
  }
}
