import { authMiddleware as sharedAuthMiddleware, Role } from '@aivo/ts-rbac';
import type { AuthContext } from '@aivo/ts-rbac';
import type { FastifyPluginCallback, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

import { config } from '../config.js';

// Use empty string fallback for dev/test when no key is configured
const auth = sharedAuthMiddleware({ publicKey: config.jwtPublicKey ?? '' });

const authPlugin: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // In tests, allow bypassing JWT verification with an injected user header
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      const testUserHeader = request.headers['x-test-user'] as string | undefined;
      if (testUserHeader) {
        try {
          (request as FastifyRequest & { user?: AuthContext }).user = JSON.parse(
            testUserHeader
          ) as AuthContext;
        } catch {
          // Fall through to default test user
        }
      }

      // Always provide a user in test runs so routes can execute
      if (!(request as FastifyRequest & { user?: AuthContext }).user) {
        (request as FastifyRequest & { user?: AuthContext }).user = {
          userId: 'test-user',
          tenantId: '11111111-1111-1111-1111-111111111111',
          roles: [Role.LEARNER],
        };
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const authMiddleware = fp(authPlugin as any);
