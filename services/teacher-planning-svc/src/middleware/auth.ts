import { authMiddleware as sharedAuthMiddleware } from '@aivo/ts-rbac';
import fp from 'fastify-plugin';

import { config } from '../config.js';

const auth = sharedAuthMiddleware({ publicKey: config.jwtPublicKey });

export const authMiddleware = fp(async (fastify) => {
  fastify.addHook('preHandler', async (request, reply) => {
    // Health endpoints remain open
    const path = request.routeOptions?.url || '';
    if (path.startsWith('/health')) return;

    // Everything else requires a valid bearer token
    await auth(request as unknown as Parameters<typeof auth>[0], reply as unknown as Parameters<typeof auth>[1]);
  });
});
