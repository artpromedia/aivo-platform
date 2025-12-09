/**
 * Auth Middleware
 *
 * JWT validation and user context extraction for Fastify.
 */

import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';

import type { ContentRole } from './rbac.js';
import { hasAnyRole } from './rbac.js';

// User context extracted from JWT
export interface AuthUser {
  sub: string; // User ID
  tenantId?: string; // User's tenant (may be in tenant_id)
  tenant_id?: string; // Alternative field name
  roles: string[]; // User roles
  email?: string;
}

// Extend FastifyRequest to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

// Extract user from request (assumes JWT has been validated upstream)
export function getUserFromRequest(request: FastifyRequest): AuthUser | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawUser = (request as any).user;
  if (!rawUser || typeof rawUser.sub !== 'string') return null;

  return {
    sub: rawUser.sub,
    tenantId: rawUser.tenantId ?? rawUser.tenant_id,
    tenant_id: rawUser.tenant_id,
    roles: Array.isArray(rawUser.roles) ? rawUser.roles : [rawUser.role].filter(Boolean),
    email: rawUser.email,
  };
}

// Get user's tenant ID (handles both field names)
export function getUserTenantId(user: AuthUser): string | undefined {
  return user.tenantId ?? user.tenant_id;
}

// Middleware to require authentication
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const user = getUserFromRequest(request);
  if (!user) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Authentication required' });
  }
}

// Create a role guard middleware
export function requireRoles(allowedRoles: ContentRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Authentication required' });
    }

    if (!hasAnyRole(user.roles, allowedRoles)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: `Required roles: ${allowedRoles.join(', ')}`,
        userRoles: user.roles,
      });
    }
  };
}

// Register auth hook (simulates JWT validation for development)
export function registerAuthHook(fastify: FastifyInstance): void {
  fastify.addHook('preHandler', async (request) => {
    // In production, this would validate the JWT
    // For now, we extract from Authorization header or use test user

    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      // In a real implementation, decode and validate JWT here
      // For now, assume the token is a base64 encoded JSON user object (for testing)
      try {
        const token = authHeader.slice(7);
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (request as any).user = decoded;
      } catch {
        // Invalid token format, leave user undefined
      }
    }
  });
}
