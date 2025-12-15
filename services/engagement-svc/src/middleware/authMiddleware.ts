/**
 * Auth middleware for engagement-svc
 */

import { authMiddleware as sharedAuthMiddleware } from '@aivo/ts-rbac';
import type { FastifyPluginCallback, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

import { config } from '../config.js';

const authPlugin: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // In tests, allow bypassing JWT verification with an injected user header
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      const testUserHeader = request.headers['x-test-user'] as string | undefined;
      if (testUserHeader) {
        try {
          (request as FastifyRequest & { user?: unknown }).user = JSON.parse(testUserHeader);
        } catch {
          // Fall through to default test user
        }
      }

      // Always provide a user in test runs so routes can execute
      if (!(request as FastifyRequest & { user?: unknown }).user) {
        (request as FastifyRequest & { user?: unknown }).user = {
          sub: 'test-user',
          tenantId: '11111111-1111-1111-1111-111111111111',
          role: 'service',
        };
      }
      return;
    }

    // Health check stays public
    const path = request.routeOptions.url ?? '';
    if (path === '/health' || path === '/ready') return;

    // Internal service routes
    if (path.startsWith('/internal/')) {
      // For internal routes, accept service tokens
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Missing authorization' });
      }
      // In production, validate service-to-service token here
      (request as FastifyRequest & { user?: unknown }).user = {
        sub: 'service',
        tenantId: request.headers['x-tenant-id'] as string,
        role: 'service',
      };
      return;
    }

    // Everything else requires a valid bearer token - use JWKS in production
    const auth = sharedAuthMiddleware({ issuer: config.jwtIssuer });
    await auth(request, reply);
  });
  done();
};

export const authMiddleware = fp(authPlugin);
