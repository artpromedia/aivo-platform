import { authMiddleware as sharedAuthMiddleware } from '@aivo/ts-rbac';
import type { FastifyPluginCallback, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

import { config } from '../config.js';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
const auth = sharedAuthMiddleware({ publicKey: config.jwtPublicKey });

const authPlugin: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // In tests, allow bypassing JWT verification with an injected user header
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      const testUserHeader = request.headers['x-test-user'] as string | undefined;
      if (testUserHeader) {
        try {
          (request as FastifyRequest & { user?: unknown }).user = JSON.parse(
            testUserHeader
          ) as unknown;
        } catch {
          // Fall through to default test user
        }
      }

      // Always provide a user in test runs so routes can execute
      if (!(request as FastifyRequest & { user?: unknown }).user) {
        (request as FastifyRequest & { user?: unknown }).user = {
          sub: 'test-user',
          tenantId: '11111111-1111-1111-1111-111111111111',
          learnerId: '22222222-2222-2222-2222-222222222222',
          role: 'learner',
        };
      }
      return;
    }

    // Health check stays public
    const path = request.routeOptions.url ?? '';
    if (path === '/health') return;

    // Everything else requires a valid bearer token
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await auth(request, reply);
  });
  done();
};

export const authMiddleware = fp(authPlugin);
