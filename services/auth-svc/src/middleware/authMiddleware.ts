import { authMiddleware as sharedAuthMiddleware } from '@aivo/ts-rbac';
import fp from 'fastify-plugin';

import { config } from '../config.js';

const auth = sharedAuthMiddleware({ publicKey: config.jwtPublicKey });

export const authMiddleware = fp(async (fastify) => {
  fastify.addHook('preHandler', async (request, reply) => {
    // Public auth endpoints remain open
    const path = request.routeOptions?.url || '';
    if (path.startsWith('/auth')) return;

    // Everything else requires a valid bearer token
    await auth(request as any, reply as any);
  });
});
