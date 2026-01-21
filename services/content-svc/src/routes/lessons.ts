/**
 * Lesson Builder Routes
 *
 * TODO: These routes require LessonDraft, LessonVersion, and LessonTemplate models
 * to be added to the Prisma schema before they can be enabled.
 *
 * The original implementation is preserved in lessons.ts.bak.
 * Re-enable when Prisma schema is updated with the required models.
 */

import type { FastifyInstance } from 'fastify';

// ══════════════════════════════════════════════════════════════════════════════
// STUB ROUTES - Enable when Prisma models are added
// ══════════════════════════════════════════════════════════════════════════════

export async function lessonRoutes(fastify: FastifyInstance): Promise<void> {
  // Lesson routes temporarily disabled - missing Prisma models:
  // - LessonDraft
  // - LessonVersion
  // - LessonTemplate
  //
  // See LESSON_BUILDER_IMPLEMENTATION.md for the full design.

  fastify.get('/lessons/status', async (_request, reply) => {
    return reply.status(503).send({
      error: 'Lesson routes not yet available',
      message: 'Lesson management requires database migrations to be applied.',
      models: ['LessonDraft', 'LessonVersion', 'LessonTemplate'],
    });
  });
}
