import { authMiddleware as sharedAuthMiddleware } from '@aivo/ts-rbac';
import fp from 'fastify-plugin';

import { config } from '../config.js';

const auth = sharedAuthMiddleware({ publicKey: config.jwtPublicKey });

export const authMiddleware = fp(async (fastify) => {
  fastify.addHook('preHandler', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader) return; // optional for public auth routes
    await auth(request as any, reply as any);
  });
});
