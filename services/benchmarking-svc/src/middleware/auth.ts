/**
 * Authentication Middleware for Benchmarking Service
 *
 * Provides JWT authentication and role-based access control.
 */

import type { FastifyPluginCallback, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { jwtVerify } from 'jose';

interface JwtPayload {
  sub: string;
  tenantId: string;
  role: string;
  roles?: string[];
  permissions?: string[];
  iat?: number;
  exp?: number;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

/**
 * Authentication plugin - verifies JWT tokens
 */
const authPlugin: FastifyPluginCallback = (fastify, _opts, done) => {
  const secret = new TextEncoder().encode(JWT_SECRET);

  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for health checks
    if (request.url === '/health' || request.url === '/ready') {
      return;
    }

    // In tests, allow bypassing JWT verification
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      const testUserHeader = request.headers['x-test-user'] as string | undefined;
      if (testUserHeader) {
        try {
          request.user = JSON.parse(testUserHeader);
          return;
        } catch {
          // Fall through to JWT verification
        }
      }
    }

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Missing authorization header' });
    }

    const token = authHeader.slice(7);

    try {
      const { payload } = (await jwtVerify(token, secret)) as { payload: JwtPayload };

      request.user = {
        sub: payload.sub,
        tenantId: payload.tenantId,
        role: payload.role,
        roles: payload.roles || [payload.role],
        permissions: payload.permissions || [],
      };
    } catch {
      return reply.code(401).send({ error: 'Invalid token' });
    }
  });

  done();
};

export const authMiddleware = fp(authPlugin);

/**
 * Admin role guard - requires admin, super_admin, or platform_admin role
 */
export function requireAdminRole(
  request: FastifyRequest,
  reply: FastifyReply,
  done: (err?: Error) => void
): void {
  const user = request.user;

  if (!user) {
    reply.code(401).send({ error: 'Authentication required' });
    return done(new Error('Unauthorized'));
  }

  const adminRoles = ['admin', 'super_admin', 'platform_admin', 'district_admin'];
  const userRoles = user.roles || [user.role];

  const hasAdminRole = userRoles.some((role) => adminRoles.includes(role));

  if (!hasAdminRole) {
    reply.code(403).send({ error: 'Admin access required' });
    return done(new Error('Forbidden'));
  }

  done();
}

/**
 * Extract user ID from JWT - returns the subject claim
 */
export function extractUserId(request: FastifyRequest): string | null {
  return request.user?.sub || null;
}

/**
 * Extract tenant ID from JWT
 */
export function extractTenantId(request: FastifyRequest): string | null {
  return request.user?.tenantId || null;
}
