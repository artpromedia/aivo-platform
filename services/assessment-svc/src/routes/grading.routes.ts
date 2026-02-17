/**
 * Grading Routes
 *
 * API endpoints for grading functionality:
 * - Rubric management
 * - Manual grading queue
 * - Grading workflow
 * - Grade release
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';

import { autoGradingService } from '../services/grading/auto-grading.service.js';
import { manualGradingService } from '../services/grading/manual-grading.service.js';
import { rubricService } from '../services/grading/rubric.service.js';
import {
  CreateRubricInputSchema,
  GradeResponseInputSchema,
  BatchGradeInputSchema,
} from '../validators/schemas.js';

// ============================================================================
// HELPERS
// ============================================================================

function handleError(error: unknown, reply: FastifyReply): void {
  if (error instanceof ZodError) {
    reply.status(400).send({ error: 'Validation error', details: error.errors });
    return;
  }

  if (error instanceof Error) {
    if (error.message.includes('not found')) {
      reply.status(404).send({ error: error.message });
      return;
    }
    if (error.message.includes('not authorized') || error.message.includes('Not authorized')) {
      reply.status(403).send({ error: error.message });
      return;
    }
    if (error.message.includes('Cannot') || error.message.includes('Invalid')) {
      reply.status(400).send({ error: error.message });
      return;
    }
  }

  console.error('Unhandled error:', error);
  reply.status(500).send({ error: 'Internal server error' });
}

function getContext(request: FastifyRequest): { tenantId: string; userId: string } {
  const tenantId = request.headers['x-tenant-id'] as string;
  const userId = request.headers['x-user-id'] as string;

  if (!tenantId || !userId) {
    throw new Error('Missing tenant or user context');
  }

  return { tenantId, userId };
}

export default async function gradingRoutes(app: FastifyInstance): Promise<void> {
  // ============================================================================
  // RUBRIC ROUTES
  // ============================================================================

  app.get(
    '/rubrics',
    async (
      request: FastifyRequest<{
        Querystring: {
          type?: string;
          search?: string;
          includePublic?: string;
          page?: string;
          pageSize?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { tenantId, userId } = getContext(request);
        const { type, search, includePublic, page, pageSize } = request.query;

        const result = await rubricService.list(tenantId, userId, {
          type: type as any,
          search: search as string,
          includePublic: includePublic === 'true',
          page: page ? Number.parseInt(page) : undefined,
          pageSize: pageSize ? Number.parseInt(pageSize) : undefined,
        });

        return result;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  app.get('/rubrics/templates', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const templates = rubricService.getRubricTemplates();
      return { templates };
    } catch (error) {
      handleError(error, reply);
    }
  });

  app.get(
    '/rubrics/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const rubric = await rubricService.getById(id);
        if (!rubric) {
          reply.status(404);
          return { error: 'Rubric not found' };
        }
        return rubric;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  app.post('/rubrics', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tenantId, userId } = getContext(request);
      const body = CreateRubricInputSchema.parse(request.body);
      const rubric = await rubricService.create(tenantId, userId, body);
      reply.status(201);
      return rubric;
    } catch (error) {
      handleError(error, reply);
    }
  });

  app.put(
    '/rubrics/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { userId } = getContext(request);
        const { id } = request.params;
        const rubric = await rubricService.update(id, userId, request.body as any);
        return rubric;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  app.post(
    '/rubrics/:id/clone',
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: { name?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { tenantId, userId } = getContext(request);
        const { id } = request.params;
        const { name } = request.body as { name?: string };
        const rubric = await rubricService.clone(id, userId, tenantId, { name });
        reply.status(201);
        return rubric;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  app.delete(
    '/rubrics/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { userId } = getContext(request);
        const { id } = request.params;
        await rubricService.delete(id, userId);
        reply.status(204);
        return;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  // ============================================================================
  // GRADING QUEUE ROUTES
  // ============================================================================

  app.get(
    '/grading/queue',
    async (
      request: FastifyRequest<{
        Querystring: {
          assessmentId?: string;
          questionId?: string;
          status?: string;
          blindGrading?: string;
          page?: string;
          pageSize?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { tenantId, userId } = getContext(request);
        const { assessmentId, questionId, status, blindGrading, page, pageSize } = request.query;

        const queue = await manualGradingService.getGradingQueue(userId, tenantId, {
          assessmentId: assessmentId as string,
          questionId: questionId as string,
          status: status as any,
          blindGrading: blindGrading === 'true',
          page: page ? Number.parseInt(page) : undefined,
          pageSize: pageSize ? Number.parseInt(pageSize) : undefined,
        });

        return queue;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  app.get(
    '/grading/responses/:id',
    async (
      request: FastifyRequest<{ Params: { id: string }; Querystring: { blindGrading?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const blindGrading = request.query.blindGrading === 'true';
        const response = await manualGradingService.getResponseForGrading(id, {
          blindGrading,
        });

        if (!response) {
          reply.status(404);
          return { error: 'Response not found' };
        }

        return response;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  app.post(
    '/grading/responses/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { userId } = getContext(request);
        const { id } = request.params;
        const body = GradeResponseInputSchema.parse(request.body);
        const graded = await manualGradingService.gradeResponse({
          responseId: id,
          gradedBy: userId,
          ...body,
        });
        return graded;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  app.post('/grading/batch', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = getContext(request);
      const body = BatchGradeInputSchema.parse(request.body);
      const result = await manualGradingService.batchGrade({
        ...body,
        gradedBy: userId,
      });
      return result;
    } catch (error) {
      handleError(error, reply);
    }
  });

  app.post(
    '/grading/responses/:id/flag',
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: { reason?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { userId } = getContext(request);
        const { id } = request.params;
        const { reason } = request.body as { reason?: string };
        await manualGradingService.flagResponse(id, userId, reason);
        return { success: true };
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  app.post(
    '/grading/responses/:id/unflag',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        await manualGradingService.unflagResponse(id);
        return { success: true };
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  app.get(
    '/grading/summary/:assessmentId',
    async (request: FastifyRequest<{ Params: { assessmentId: string } }>, reply: FastifyReply) => {
      try {
        const { tenantId } = getContext(request);
        const { assessmentId } = request.params;
        const summary = await manualGradingService.getGradingSummary(assessmentId, tenantId);
        return summary;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  app.post('/grading/release', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = getContext(request);
      const { assessmentId, attemptIds, releaseAt } = request.body as {
        assessmentId: string;
        attemptIds?: string[];
        releaseAt?: string;
      };

      const result = await manualGradingService.releaseGrades(
        {
          assessmentId,
          attemptIds,
          releaseAt: releaseAt ? new Date(releaseAt) : undefined,
        },
        userId
      );

      return result;
    } catch (error) {
      handleError(error, reply);
    }
  });
}
