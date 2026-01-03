import type { Role } from './roles.js';
export interface AuthContext {
    userId: string;
    tenantId: string;
    roles: Role[];
}
export type AuthenticatedUser = AuthContext;
export type MaybeAuthContext = AuthContext | undefined;
export type WithAuth<T> = T & {
    auth?: AuthContext;
    user?: AuthenticatedUser;
};
declare module 'fastify' {
    interface FastifyRequest {
        auth?: AuthContext;
        user?: AuthenticatedUser;
    }
}
declare global {
    namespace Express {
        interface Request {
            auth?: AuthContext;
            user?: AuthenticatedUser;
        }
    }
}
//# sourceMappingURL=types.d.ts.map