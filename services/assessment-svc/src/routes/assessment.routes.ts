import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';

import { assessmentService } from '../services/assessment.service.js';
import {
  CreateAssessmentSchema,
  UpdateAssessmentSchema,
  AssessmentQuerySchema,
  AddQuestionToAssessmentSchema,
  ReorderQuestionsSchema,
} from '../validators/assessment.validator.js';

// Error handler
function handleError(error: unknown, reply: FastifyReply): void {
  if (error instanceof ZodError) {
    reply.status(400).send({
      error: 'Validation error',
      details: error.errors,
    });
    return;
  }

  if (error instanceof Error) {
    if (error.message.includes('not found')) {
      reply.status(404).send({ error: error.message });
      return;
    }
    if (error.message.includes('Cannot')) {
      reply.status(400).send({ error: error.message });
      return;
    }
  }

  console.error('Unhandled error:', error);
  reply.status(500).send({ error: 'Internal server error' });
}

// Get tenant and user from request (set by auth middleware)
function getContext(request: FastifyRequest): { tenantId: string; userId: string } {
  const tenantId = request.headers['x-tenant-id'] as string;
  const userId = request.headers['x-user-id'] as string;

  if (!tenantId || !userId) {
    throw new Error('Missing tenant or user context');
  }

  return { tenantId, userId };
}

export async function assessmentRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /assessments
   * List assessments with filtering and pagination
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tenantId } = getContext(request);
      const query = AssessmentQuerySchema.parse(request.query);
      const result = await assessmentService.list(tenantId, query as any);
      return result;
    } catch (error) {
      handleError(error, reply);
    }
  });

  /**
   * POST /assessments
   * Create a new assessment
   */
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tenantId, userId } = getContext(request);
      const body = CreateAssessmentSchema.parse(request.body);
      const assessment = await assessmentService.create(tenantId, userId, body);
      reply.status(201);
      return assessment;
    } catch (error) {
      handleError(error, reply);
    }
  });

  /**
   * GET /assessments/:id
   * Get assessment by ID
   */
  app.get(
    '/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: { includeQuestions?: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { tenantId } = getContext(request);
        const { id } = request.params;
        const includeQuestions = request.query.includeQuestions === 'true';
        const assessment = await assessmentService.getById(tenantId, id, includeQuestions);

        if (!assessment) {
          reply.status(404);
          return { error: 'Assessment not found' };
        }

        return assessment;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  /**
   * PUT /assessments/:id
   * Update an assessment
   */
  app.put(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { tenantId } = getContext(request);
        const { id } = request.params;
        const body = UpdateAssessmentSchema.parse(request.body);
        const assessment = await assessmentService.update(tenantId, id, body);
        return assessment;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  /**
   * POST /assessments/:id/publish
   * Publish an assessment
   */
  app.post(
    '/:id/publish',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { tenantId } = getContext(request);
        const { id } = request.params;
        const assessment = await assessmentService.publish(tenantId, id);
        return assessment;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  /**
   * POST /assessments/:id/archive
   * Archive an assessment
   */
  app.post(
    '/:id/archive',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { tenantId } = getContext(request);
        const { id } = request.params;
        const assessment = await assessmentService.archive(tenantId, id);
        return assessment;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  /**
   * DELETE /assessments/:id
   * Delete an assessment
   */
  app.delete(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { tenantId } = getContext(request);
        const { id } = request.params;
        await assessmentService.delete(tenantId, id);
        reply.status(204);
        return;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  /**
   * POST /assessments/:id/clone
   * Clone an assessment
   */
  app.post(
    '/:id/clone',
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: { title?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { tenantId, userId } = getContext(request);
        const { id } = request.params;
        const newTitle = (request.body as { title?: string })?.title;
        const assessment = await assessmentService.clone(tenantId, id, userId, newTitle);
        reply.status(201);
        return assessment;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  /**
   * GET /assessments/:id/questions
   * Get questions for an assessment
   */
  app.get(
    '/:id/questions',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const questions = await assessmentService.getQuestions(id);
        return questions;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  /**
   * POST /assessments/:id/questions
   * Add a question to an assessment
   */
  app.post(
    '/:id/questions',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { tenantId } = getContext(request);
        const { id } = request.params;
        const body = AddQuestionToAssessmentSchema.parse(request.body);
        const assessmentQuestion = await assessmentService.addQuestion(tenantId, id, body);
        reply.status(201);
        return assessmentQuestion;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  /**
   * DELETE /assessments/:id/questions/:questionId
   * Remove a question from an assessment
   */
  app.delete(
    '/:id/questions/:questionId',
    async (
      request: FastifyRequest<{ Params: { id: string; questionId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { id, questionId } = request.params;
        await assessmentService.removeQuestion(id, questionId);
        reply.status(204);
        return;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  /**
   * PUT /assessments/:id/questions/reorder
   * Reorder questions in an assessment
   */
  app.put(
    '/:id/questions/reorder',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const body = ReorderQuestionsSchema.parse(request.body);
        await assessmentService.reorderQuestions(id, body);
        reply.status(204);
        return;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );
}
