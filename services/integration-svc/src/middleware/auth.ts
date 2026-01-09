/**
 * Authentication Middleware for Integration Service
 *
 * Provides JWT authentication and role-based access control for admin endpoints.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
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
 * Admin role guard - requires admin role for admin endpoints
 * Can be used as a preHandler hook
 */
export async function requireAdminRole(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
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
        const user = request.user;
        const adminRoles = ['admin', 'super_admin', 'platform_admin', 'district_admin'];
        const userRoles = user?.roles || (user?.role ? [user.role] : []);
        if (!userRoles.some((role) => adminRoles.includes(role))) {
          return reply.code(403).send({ error: 'Admin access required' });
        }
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
  const secret = new TextEncoder().encode(JWT_SECRET);

  try {
    const { payload } = (await jwtVerify(token, secret)) as { payload: JwtPayload };

    request.user = {
      sub: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
      roles: payload.roles || [payload.role],
      permissions: payload.permissions || [],
    };

    // Check for admin role
    const adminRoles = ['admin', 'super_admin', 'platform_admin', 'district_admin'];
    const userRoles = request.user.roles || [request.user.role];

    if (!userRoles.some((role) => adminRoles.includes(role))) {
      return reply.code(403).send({ error: 'Admin access required' });
    }
  } catch {
    return reply.code(401).send({ error: 'Invalid token' });
  }
}

/**
 * Extract user ID from request
 */
export function extractUserId(request: FastifyRequest): string | null {
  return request.user?.sub || null;
}

/**
 * Extract tenant ID from request
 */
export function extractTenantId(request: FastifyRequest): string | null {
  return request.user?.tenantId || null;
}
