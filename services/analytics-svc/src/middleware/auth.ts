import type { FastifyPluginCallback, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { jwtVerify } from 'jose';

import { config } from '../config.js';

interface JwtPayload {
  sub: string;
  tenantId: string;
  role: string;
  learnerId?: string;
  classroomIds?: string[];
  iat?: number;
  exp?: number;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

const authPlugin: FastifyPluginCallback = (fastify, _opts, done) => {
  // For development, use symmetric secret
  // In production, use JWKS from auth service
  const secret = new TextEncoder().encode(config.jwtSecret);

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
      const { payload } = await jwtVerify(token, secret) as { payload: JwtPayload };
      
      request.user = {
        sub: payload.sub,
        tenantId: payload.tenantId,
        role: payload.role,
        learnerId: payload.learnerId,
        classroomIds: payload.classroomIds,
      };
    } catch (err) {
      return reply.code(401).send({ error: 'Invalid token' });
    }
  });

  done();
};

export const authMiddleware = fp(authPlugin);
