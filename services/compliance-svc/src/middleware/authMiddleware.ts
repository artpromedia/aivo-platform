/**
 * AIVO Compliance Service - Authentication Middleware
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import * as jose from 'jose';

import { config } from '../config.js';
import type { JwtPayload } from '../types/index.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
    tenantId: string | null;
  }
}

async function authMiddlewarePlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('user', null);
  fastify.decorateRequest('tenantId', null);

  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (request.url === '/health') {
      return;
    }

    const apiKey = request.headers['x-api-key'];
    if (apiKey === config.internalApiKey) {
      const tenantId = request.headers['x-tenant-id'] as string;
      if (tenantId) {
        request.tenantId = tenantId;
        request.user = {
          sub: 'internal-service',
          tenantId,
          roles: ['SYSTEM'],
        };
        return;
      }
    }

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.slice(7);

    try {
      if (!config.jwtPublicKey) {
        if (config.nodeEnv !== 'production') {
          const parts = token.split('.');
          if (parts.length === 3) {
            try {
              const payload = JSON.parse(
                Buffer.from(parts[1]!, 'base64').toString()
              ) as JwtPayload;
              request.user = payload;
              request.tenantId = payload.tenantId;
              return;
            } catch {
              // Fall through
            }
          }
        }
        return reply.status(500).send({
          error: 'Configuration Error',
          message: 'JWT public key not configured',
        });
      }

      const publicKey = await jose.importSPKI(config.jwtPublicKey, 'RS256');
      const { payload } = await jose.jwtVerify(token, publicKey);

      request.user = payload as unknown as JwtPayload;
      request.tenantId = (payload as unknown as JwtPayload).tenantId;
    } catch (err) {
      request.log.warn({ err }, 'JWT verification failed');
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }
  });
}

export const authMiddleware = (fp as any)(authMiddlewarePlugin, {
  name: 'auth-middleware',
});
