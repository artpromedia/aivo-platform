/**
 * Health Check Routes
 */

import type { FastifyPluginAsync } from 'fastify';

export const registerHealthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async () => ({
    status: 'ok',
    service: 'writing-pad-svc',
    timestamp: new Date().toISOString(),
  }));

  fastify.get('/ready', async () => ({
    status: 'ready',
    service: 'writing-pad-svc',
    timestamp: new Date().toISOString(),
  }));
};
