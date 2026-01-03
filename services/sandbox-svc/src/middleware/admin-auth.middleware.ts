/**
 * Admin Authentication Middleware
 *
 * Validates admin session tokens and attaches admin context to requests.
 * Supports both cookie-based and Bearer token authentication.
 *
 * @module @aivo/sandbox-svc/middleware/admin-auth
 */

import type { FastifyRequest, FastifyReply, FastifyPluginAsync, FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

import {
  getAdminAuthService,
  type AdminSession,
  UnauthorizedException,
} from '../services/admin-auth.service.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

declare module 'fastify' {
  interface FastifyRequest {
    adminSession?: AdminSession;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Token Extraction
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract authentication token from request
 */
function extractToken(request: FastifyRequest): string | null {
  // 1. Check Authorization header (Bearer token)
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 2. Check cookie (admin_session)
  const cookies = parseCookies(request.headers.cookie ?? '');
  const sessionCookie = cookies.admin_session;
  if (sessionCookie) {
    return sessionCookie;
  }

  // 3. Check query parameter (for download links, etc.)
  // Only allowed for GET requests
  if (request.method === 'GET') {
    const query = request.query as { admin_token?: string };
    if (query.admin_token) {
      return query.admin_token;
    }
  }

  return null;
}

/**
 * Simple cookie parser
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  if (!cookieHeader) {
    return cookies;
  }

  for (const cookie of cookieHeader.split(';')) {
    const [name, ...valueParts] = cookie.trim().split('=');
    if (name) {
      cookies[name] = valueParts.join('=');
    }
  }

  return cookies;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Middleware Hook
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Admin authentication hook
 *
 * Use this as a preHandler hook on protected routes.
 */
export async function adminAuthHook(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = extractToken(request);

  if (!token) {
    reply.status(401).send({
      error: 'unauthorized',
      message: 'Authentication required',
      code: 'NO_TOKEN',
    });
    return;
  }

  const prisma = (request.server as FastifyInstance & { prisma: any }).prisma;
  const authService = getAdminAuthService(prisma);

  try {
    const session = await authService.validateSession(token);

    if (!session) {
      reply.status(401).send({
        error: 'unauthorized',
        message: 'Invalid or expired session',
        code: 'INVALID_SESSION',
      });
      return;
    }

    // Attach session to request
    request.adminSession = session;
  } catch (error) {
    request.log.error({ error }, 'Admin auth validation error');
    reply.status(401).send({
      error: 'unauthorized',
      message: 'Authentication failed',
      code: 'AUTH_ERROR',
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Permission Check Hook Factory
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a permission check hook
 */
export function requirePermissions(...permissions: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // First ensure admin is authenticated
    if (!request.adminSession) {
      reply.status(401).send({
        error: 'unauthorized',
        message: 'Authentication required',
        code: 'NO_SESSION',
      });
      return;
    }

    const session = request.adminSession;

    // Super admin has all permissions
    if (session.permissions.includes('*')) {
      return;
    }

    // Check required permissions
    const hasAllPermissions = permissions.every((permission) =>
      session.permissions.includes(permission as any)
    );

    if (!hasAllPermissions) {
      reply.status(403).send({
        error: 'forbidden',
        message: 'Insufficient permissions',
        code: 'PERMISSION_DENIED',
        required: permissions,
        available: session.permissions,
      });
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Fastify Plugin
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Admin auth plugin that adds decorators and hooks
 */
const adminAuthPluginAsync: FastifyPluginAsync = async (fastify) => {
  // Add request decorator for admin session
  fastify.decorateRequest('adminSession', null);

  // Add hook factory for protected routes
  fastify.decorate('adminAuthHook', adminAuthHook);
  fastify.decorate('requirePermissions', requirePermissions);
};

export const adminAuthPlugin = fp(adminAuthPluginAsync as any, {
  name: 'admin-auth',
  dependencies: [],
}) as any;

// ═══════════════════════════════════════════════════════════════════════════════
// Route Protection Helper
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Helper to protect a route with admin auth
 */
export function protectedRoute(permissions?: string[]) {
  const hooks: (typeof adminAuthHook)[] = [adminAuthHook];

  if (permissions && permissions.length > 0) {
    hooks.push(requirePermissions(...permissions));
  }

  return {
    preHandler: hooks,
  };
}

/**
 * Get admin session from request (throws if not authenticated)
 */
export function getAdminSession(request: FastifyRequest): AdminSession {
  if (!request.adminSession) {
    throw new UnauthorizedException('Not authenticated');
  }
  return request.adminSession;
}

/**
 * Get request context for audit logging
 */
export function getRequestContext(request: FastifyRequest): {
  ipAddress: string;
  userAgent: string;
} {
  return {
    ipAddress: request.ip ?? 'unknown',
    userAgent: request.headers['user-agent'] ?? 'unknown',
  };
}
