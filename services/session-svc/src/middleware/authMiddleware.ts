import { authMiddleware as sharedAuthMiddleware, Role } from '@aivo/ts-rbac';
import type { FastifyPluginCallback, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

import { config } from '../config.js';

const auth = sharedAuthMiddleware({ publicKey: config.jwtPublicKey });

const authPlugin: FastifyPluginCallback = (fastify, _opts, done) => {
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
      return;
    }

    // Health check stays public
    const path = request.routeOptions.url ?? '';
    if (path.startsWith('/health')) return;

    // Everything else requires a valid bearer token
    await auth(request, reply);
  });
  done();
};

export const authMiddleware = fp(authPlugin as any);
