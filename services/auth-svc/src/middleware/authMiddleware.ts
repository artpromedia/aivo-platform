import { authMiddleware as sharedAuthMiddleware } from '@aivo/ts-rbac';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

import { config } from '../config.js';

// Create the auth middleware function
const authHandler = sharedAuthMiddleware({ publicKey: config.jwtPublicKey });

// Standalone authenticate function that can be used as preHandler
async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await authHandler(request, reply);
}

// Authorize factory function
function authorize(requiredRoles: string[]) {
  return async function authorizeHandler(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const user = (request as any).user;
    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    const userRoles = user.roles || [];
    const hasRequiredRole = requiredRoles.some((role) => userRoles.includes(role));
    if (!hasRequiredRole) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
  };
}

// Augment FastifyInstance type
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: typeof authenticate;
    authorize: typeof authorize;
  }
}

export const authMiddleware: FastifyPluginAsync = fp(async (fastify) => {
  // Decorate fastify with authenticate and authorize functions
  fastify.decorate('authenticate', authenticate);
  fastify.decorate('authorize', authorize);

  fastify.addHook('preHandler', async (request, reply) => {
    // Public endpoints remain open
    const path = request.routeOptions?.url || '';
    if (path.startsWith('/auth') || path.startsWith('/health')) return;

    // Everything else requires a valid bearer token
    await authHandler(request as any, reply as any);
  });
});
