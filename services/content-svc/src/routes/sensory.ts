/**
 * Sensory Routes - STUB
 *
 * Original file backed up to sensory.ts.bak
 * Stubbed due to type mismatches between ts-shared SensoryProfile and local sensory-compat-types.
 * TODO: Align types between ts-shared and content-svc sensory types.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function sensoryRoutes(fastify: FastifyInstance) {
  // Stub - return 503 for all routes
  fastify.all('/sensory/*', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(503).send({
      error: 'Service temporarily unavailable',
      message: 'Sensory routes are temporarily disabled due to type alignment work in progress.',
      status: 503,
    });
  });

  fastify.all('/learner/*/sensory/*', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(503).send({
      error: 'Service temporarily unavailable',
      message: 'Sensory routes are temporarily disabled due to type alignment work in progress.',
      status: 503,
    });
  });
}
