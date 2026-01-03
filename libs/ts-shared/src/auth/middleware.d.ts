/**
 * Authentication Middleware for Express/Fastify
 * @module @aivo/ts-shared/auth/middleware
 */
import type { Request, Response, NextFunction } from 'express';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Redis } from 'ioredis';
import { JWTService } from './jwt.js';
import type { TokenPayload } from './types.js';
/**
 * Extended Express request with auth context
 */
export interface AuthenticatedRequest extends Request {
    user: TokenPayload;
    token: string;
}
/**
 * Extended Fastify request with auth context
 */
export interface AuthenticatedFastifyRequest extends FastifyRequest {
    user: TokenPayload;
    token: string;
}
/**
 * Auth middleware configuration
 */
export interface AuthMiddlewareConfig {
    /** JWT service instance */
    jwtService: JWTService;
    /** Redis client for token blacklist checking (optional) */
    redis?: Redis;
    /** Paths to skip authentication */
    skipPaths?: string[];
    /** Whether to require tenant context */
    requireTenant?: boolean;
}
/**
 * Create Express authentication middleware
 */
export declare function createAuthMiddleware(config: AuthMiddlewareConfig): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Create Fastify authentication hook
 */
export declare function createFastifyAuthHook(config: AuthMiddlewareConfig): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
/**
 * Permission checking middleware for Express
 */
export declare function requirePermission(...permissions: string[]): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Role checking middleware for Express
 */
export declare function requireRole(...roles: string[]): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Tenant isolation middleware for Express
 */
export declare function requireTenantMatch(tenantIdParam?: string): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Service-to-service authentication middleware for Express
 */
export declare function createServiceAuthMiddleware(jwtService: JWTService, serviceName: string): (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=middleware.d.ts.map