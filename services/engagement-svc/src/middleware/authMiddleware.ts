/**
 * Auth middleware for engagement-svc
 */

import { authMiddleware as sharedAuthMiddleware, Role } from '@aivo/ts-rbac';
import type { FastifyInstance, FastifyRequest, FastifyReply, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';

import { config } from '../config.js';

function authPlugin(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
  done: (err?: Error) => void
): void {
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // In tests, allow bypassing JWT verification with an injected user header
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      const testUserHeader = request.headers['x-test-user'] as string | undefined;
      if (testUserHeader) {
        try {
          (request as FastifyRequest & { user?: unknown }).user = JSON.parse(testUserHeader);
        } catch {
          // Invalid test header - let auth fail naturally
        }
      }
      return undefined;
    }

    // Health check stays public
    const path = request.routeOptions.url ?? '';
    if (path === '/health' || path === '/ready') return undefined;

    // Internal service routes
    if (path.startsWith('/internal/')) {
      // For internal routes, accept service tokens
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        reply.status(401).send({ error: 'Missing authorization' });
        return undefined;
      }
      // In production, validate service-to-service token here
      (request as FastifyRequest & { user?: unknown }).user = {
        userId: 'service',
        tenantId: request.headers['x-tenant-id'] as string,
        roles: [Role.PLATFORM_ADMIN],
      };
      return undefined;
    }

    // Everything else requires a valid bearer token - use JWKS in production
    const auth = sharedAuthMiddleware({
      publicKey: config.jwtPublicKey,
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
    });
    await auth(request, reply);
    return undefined;
  });
  done();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const authMiddleware = fp(authPlugin as any);
