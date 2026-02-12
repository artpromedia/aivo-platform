import type { NextFunction, Request, Response } from 'express';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { importSPKI, jwtVerify, type JWTPayload, type KeyLike, type JWTVerifyOptions } from 'jose';

import type { Role } from './roles';
import { isRole } from './roles';
import type { AuthContext } from './types';

export interface AuthMiddlewareOptions {
  publicKey: string;
  audience?: string | string[];
  issuer?: string | string[];
}

function normalizeRoles(input: unknown): Role[] {
  if (!Array.isArray(input)) return [];
  return input.filter((r) => isRole(r));
}

function toAuthContext(payload: JWTPayload): AuthContext {
  if (typeof payload.sub !== 'string' || typeof payload.tenant_id !== 'string') {
    throw new Error('Invalid token payload');
  }
  const roles = normalizeRoles(payload.roles);
  return {
    userId: payload.sub,
    tenantId: payload.tenant_id,
    roles,
  };
}

function sendUnauthorized(target: FastifyReply | Response | undefined, next?: NextFunction) {
  if (
    target &&
    typeof (target as Response).status === 'function' &&
    typeof (target as Response).send === 'function'
  ) {
    (target as Response).status(401).send({ error: 'Unauthorized' });
    return;
  }
  if (
    target &&
    typeof (target as FastifyReply).code === 'function' &&
    typeof (target as FastifyReply).send === 'function'
  ) {
    (target as FastifyReply).code(401).send({ error: 'Unauthorized' });
    return;
  }
  if (next) next(Object.assign(new Error('Unauthorized'), { statusCode: 401 }));
}

function sendForbidden(target: FastifyReply | Response | undefined, next?: NextFunction) {
  if (
    target &&
    typeof (target as Response).status === 'function' &&
    typeof (target as Response).send === 'function'
  ) {
    (target as Response).status(403).send({ error: 'Forbidden' });
    return;
  }
  if (
    target &&
    typeof (target as FastifyReply).code === 'function' &&
    typeof (target as FastifyReply).send === 'function'
  ) {
    (target as FastifyReply).code(403).send({ error: 'Forbidden' });
    return;
  }
  if (next) next(Object.assign(new Error('Forbidden'), { statusCode: 403 }));
}

export function hasRole(
  userRoles: Role[] | string[] | undefined,
  required: Role | Role[]
): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  const requiredList = Array.isArray(required) ? required : [required];
  return requiredList.some((role) => (userRoles as (Role | string)[]).includes(role));
}

export function authMiddleware(options: AuthMiddlewareOptions) {
  const { publicKey, audience, issuer } = options;
  let keyPromise: Promise<KeyLike> | null = null;

  const getKey = () => {
    if (!keyPromise) {
      keyPromise = importSPKI(publicKey, 'RS256');
    }
    return keyPromise;
  };

  return async function middleware(
    req: FastifyRequest | (Request & { auth?: AuthContext; user?: AuthContext }),
    resOrReply: FastifyReply | Response,
    next?: NextFunction
  ) {
    const header = (req.headers as any)?.authorization || (req as any)?.headers?.Authorization;
    if (!header || typeof header !== 'string' || !header.startsWith('Bearer ')) {
      sendUnauthorized(resOrReply, next);
      return;
    }
    const token = header.slice('Bearer '.length);
    try {
      const verifyOptions: JWTVerifyOptions = {};
      if (audience !== undefined) verifyOptions.audience = audience;
      if (issuer !== undefined) verifyOptions.issuer = issuer;

      const { payload } = await jwtVerify(token, await getKey(), verifyOptions);
      const auth = toAuthContext(payload);
      (req as any).auth = auth;
      (req as any).user = auth;
      if (next) {
        next();
        return;
      }
      return;
    } catch (err) {
      sendUnauthorized(resOrReply, next);
      return;
    }
  };
}

export function requireRole(requiredRoles: Role[]) {
  return async function middleware(
    req: FastifyRequest | (Request & { auth?: AuthContext; user?: AuthContext }),
    resOrReply: FastifyReply | Response,
    next?: NextFunction
  ) {
    const roles = (req as any).auth?.roles || (req as any).user?.roles;
    if (!hasRole(roles as Role[] | undefined, requiredRoles)) {
      sendForbidden(resOrReply, next);
      return;
    }
    if (next) {
      next();
      return;
    }
  };
}
