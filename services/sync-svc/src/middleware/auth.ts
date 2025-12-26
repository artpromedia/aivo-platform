import fp from 'fastify-plugin';
import { FastifyInstance, FastifyRequest } from 'fastify';
import * as jose from 'jose';
import { config } from '../config.js';
import { AuthContext } from '../types.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthContext;
  }
}

export const authMiddleware = fp(async (fastify: FastifyInstance) => {
  fastify.decorateRequest('user', null);

  fastify.addHook('preHandler', async (request: FastifyRequest, reply) => {
    // Skip auth for health check
    if (request.url === '/health') {
      return;
    }

    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.substring(7);

    try {
      const secret = new TextEncoder().encode(config.jwt.secret);
      const { payload } = await jose.jwtVerify(token, secret, {
        issuer: config.jwt.issuer,
      });

      request.user = {
        userId: payload.sub as string,
        tenantId: payload.tenantId as string,
        deviceId: (request.headers['x-device-id'] as string) || 'unknown',
        roles: (payload.roles as string[]) || [],
      };
    } catch (error) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }
  });
});
