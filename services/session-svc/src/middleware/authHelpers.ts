/**
 * Authentication Helpers
 *
 * Shared authentication utilities for route handlers.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

/** Unauthorized error message */
export const ERROR_UNAUTHORIZED = 'Unauthorized';

/** Forbidden error message */
export const ERROR_FORBIDDEN = 'Forbidden';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface JwtUser {
  sub: string;
  tenantId: string;
  role: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Extract JWT user from request
 */
export function getUserFromRequest(request: FastifyRequest): JwtUser | null {
  const user = (request as FastifyRequest & { user?: JwtUser }).user;
  if (!user || typeof user.sub !== 'string' || typeof user.tenantId !== 'string') {
    return null;
  }
  return user;
}

/**
 * Check if user can access a specific tenant
 */
export function canAccessTenant(user: JwtUser, tenantId: string): boolean {
  if (user.role === 'service') return true;
  return user.tenantId === tenantId;
}

/**
 * Send 401 Unauthorized response
 */
export function sendUnauthorized(reply: FastifyReply): FastifyReply {
  return reply.status(401).send({ error: ERROR_UNAUTHORIZED });
}

/**
 * Send 403 Forbidden response
 */
export function sendForbidden(reply: FastifyReply, message?: string): FastifyReply {
  return reply.status(403).send({
    error: ERROR_FORBIDDEN,
    message: message ?? 'Access denied',
  });
}

/**
 * Require authentication for a route handler
 * Returns the user if authenticated, or sends 401 and returns null
 */
export function requireAuth(request: FastifyRequest, reply: FastifyReply): JwtUser | null {
  const user = getUserFromRequest(request);
  if (!user) {
    sendUnauthorized(reply);
    return null;
  }
  return user;
}

/**
 * Require authentication and tenant access
 * Returns the user if authenticated and has access, or sends error and returns null
 */
export function requireTenantAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  tenantId: string
): JwtUser | null {
  const user = requireAuth(request, reply);
  if (!user) return null;

  if (!canAccessTenant(user, tenantId)) {
    sendForbidden(reply, 'Cannot access this tenant');
    return null;
  }
  return user;
}
