import type { NextFunction, Request, Response } from 'express';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Role } from './roles';
import type { AuthContext } from './types';
export interface AuthMiddlewareOptions {
    publicKey: string;
    audience?: string | string[];
    issuer?: string | string[];
}
export declare function hasRole(userRoles: Role[] | string[] | undefined, required: Role | Role[]): boolean;
export declare function authMiddleware(options: AuthMiddlewareOptions): (req: FastifyRequest | (Request & {
    auth?: AuthContext;
    user?: AuthContext;
}), resOrReply: FastifyReply | Response, next?: NextFunction) => Promise<void>;
export declare function requireRole(requiredRoles: Role[]): (req: FastifyRequest | (Request & {
    auth?: AuthContext;
    user?: AuthContext;
}), resOrReply: FastifyReply | Response, next?: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.d.ts.map