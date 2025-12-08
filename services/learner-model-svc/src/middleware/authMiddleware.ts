import { authMiddleware as sharedAuthMiddleware } from '@aivo/ts-rbac';
import type { FastifyPluginCallback, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

import { config } from '../config.js';

const auth = sharedAuthMiddleware({ publicKey: config.jwtPublicKey });

const authPlugin: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Health check stays public
    const path = request.routeOptions.url ?? '';
    if (path === '/health') return;

    // Everything else requires a valid bearer token
    await auth(request, reply);
  });
  done();
};

export const authMiddleware = fp(authPlugin);
