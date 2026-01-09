/**
 * Authentication Middleware for Marketplace Service
 *
 * Provides JWT authentication and user extraction utilities.
 */

import type { FastifyPluginCallback, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { jwtVerify } from 'jose';

interface JwtPayload {
  sub: string;
  tenantId: string;
  role: string;
  roles?: string[];
  vendorId?: string;
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
    // Skip auth for health checks and public catalog endpoints
    if (
      request.url === '/health' ||
      request.url === '/ready' ||
      request.url.startsWith('/catalog')
    ) {
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
        vendorId: payload.vendorId,
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
 * Extract user ID from request - uses JWT subject claim
 */
export function extractUserId(request: FastifyRequest): string {
  const userId = request.user?.sub;
  if (!userId) {
    throw new Error('User ID not found in request - authentication required');
  }
  return userId;
}

/**
 * Extract user ID or return null if not authenticated
 */
export function extractUserIdOptional(request: FastifyRequest): string | null {
  return request.user?.sub || null;
}

/**
 * Extract tenant ID from request
 */
export function extractTenantId(request: FastifyRequest): string {
  const tenantId = request.user?.tenantId;
  if (!tenantId) {
    throw new Error('Tenant ID not found in request - authentication required');
  }
  return tenantId;
}

/**
 * Check if user has vendor access (either via JWT claim or vendor association)
 */
export function hasVendorAccess(request: FastifyRequest, vendorId: string): boolean {
  const user = request.user;
  if (!user) return false;

  // Check if user has vendor ID claim matching the vendor
  if (user.vendorId === vendorId) return true;

  // Admin/platform roles have access to all vendors
  const adminRoles = ['admin', 'super_admin', 'platform_admin'];
  const userRoles = user.roles || [user.role];
  if (userRoles.some((role) => adminRoles.includes(role))) return true;

  return false;
}

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

  const adminRoles = ['admin', 'super_admin', 'platform_admin'];
  const userRoles = user.roles || [user.role];

  const hasAdminRole = userRoles.some((role) => adminRoles.includes(role));

  if (!hasAdminRole) {
    reply.code(403).send({ error: 'Admin access required' });
    return done(new Error('Forbidden'));
  }

  done();
}
