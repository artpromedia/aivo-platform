/**
 * Templates Routes - STUB
 *
 * Original file backed up to templates.ts.bak
 * Stubbed due to missing Prisma model 'lessonTemplate'.
 * TODO: Add LessonTemplate model to Prisma schema.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function templateRoutes(fastify: FastifyInstance) {
  // Stub - return 503 for all routes
  fastify.all('/templates/*', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(503).send({
      error: 'Service temporarily unavailable',
      message: 'Template routes are temporarily disabled - LessonTemplate Prisma model pending.',
      status: 503,
    });
  });
}
