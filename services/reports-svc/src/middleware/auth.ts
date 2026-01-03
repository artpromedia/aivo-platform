/**
 * Authentication middleware for the reports service.
 * Validates JWT tokens and extracts user context.
 */

import type { FastifyPluginCallback, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { jwtVerify } from 'jose';

import type { AuthenticatedUser } from '../types.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

const authPlugin: FastifyPluginCallback = (fastify, _opts, done) => {
  // Require JWT_SECRET in production
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }
  const secret = new TextEncoder().encode(
    jwtSecret || 'dev-secret-key-change-in-production'
  );

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
          request.user = JSON.parse(testUserHeader) as AuthenticatedUser;
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
      const { payload } = (await jwtVerify(token, secret)) as { payload: AuthenticatedUser };

      const user: AuthenticatedUser = {
        sub: payload.sub,
        tenantId: payload.tenantId,
        role: payload.role,
      };
      if (payload.childrenIds) {
        user.childrenIds = payload.childrenIds;
      }
      if (payload.classroomIds) {
        user.classroomIds = payload.classroomIds;
      }
      request.user = user;
    } catch {
      return reply.code(401).send({ error: 'Invalid token' });
    }
  });

  done();
};

export const authMiddleware = fp(authPlugin);
