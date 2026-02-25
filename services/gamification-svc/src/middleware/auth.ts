/**
 * Authentication middleware for the gamification service.
 * Validates JWT tokens and extracts user context.
 */

import type { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { jwtVerify } from 'jose';

import { config } from '../config.js';

export interface AuthenticatedUser {
  sub: string;
  tenantId: string;
  role: string;
  classroomIds?: string[];
  learnerId?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

/**
 * JWT authentication plugin for Fastify
 * Requires JWT_SECRET environment variable in production
 */
const authMiddleware: FastifyPluginAsync = fp(
  async function authMiddleware(app: FastifyInstance) {
    app.decorateRequest('user', undefined);

    app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
      // Skip auth for health checks
      if (request.url.startsWith('/health') || request.url === '/ready') {
        return;
      }

      // In tests, allow bypassing JWT verification
      if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
        const testUserHeader = request.headers['x-test-user'] as string | undefined;
        if (testUserHeader) {
          try {
            request.user = JSON.parse(testUserHeader) as AuthenticatedUser;
            return;
          } catch {
            // Fall through to JWT verification
          }
        }
      }

      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        reply.status(401);
        throw new Error('Missing authorization header');
      }

      const token = authHeader.slice(7);
      const secret = new TextEncoder().encode(config.jwtSecret);

      try {
        const { payload } = await jwtVerify(token, secret);
        request.user = {
          sub: payload.sub as string,
          tenantId: payload.tenantId as string,
          role: payload.role as string,
          classroomIds: payload.classroomIds as string[] | undefined,
          learnerId: payload.learnerId as string | undefined,
        };
      } catch {
        reply.status(401);
        throw new Error('Invalid token');
      }
    });
  },
  { name: 'gamification-auth' }
);

export { authMiddleware };

/**
 * Require specific roles for access
 */
export function requireRoles(...allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      reply.status(401);
      throw new Error('Authentication required');
    }

    if (!allowedRoles.includes(request.user.role)) {
      reply.status(403);
      throw new Error('Insufficient permissions');
    }
  };
}
