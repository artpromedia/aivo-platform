import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';

import { questionService } from '../services/question.service.js';
import {
  CreateQuestionSchema,
  UpdateQuestionSchema,
  QuestionQuerySchema,
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

export async function questionRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /questions
   * List questions with filtering and pagination
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tenantId } = getContext(request);
      const query = QuestionQuerySchema.parse(request.query);
      const result = await questionService.list(tenantId, query as any);
      return result;
    } catch (error) {
      handleError(error, reply);
    }
  });

  /**
   * POST /questions
   * Create a new question
   */
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tenantId, userId } = getContext(request);
      const body = CreateQuestionSchema.parse(request.body);
      const question = await questionService.create(tenantId, userId, body);
      reply.status(201);
      return question;
    } catch (error) {
      handleError(error, reply);
    }
  });

  /**
   * POST /questions/bulk
   * Bulk create questions
   */
  app.post('/bulk', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tenantId, userId } = getContext(request);
      const { questions } = request.body as { questions: unknown[] };

      if (!Array.isArray(questions)) {
        reply.status(400);
        return { error: 'questions must be an array' };
      }

      // Validate each question
      const validatedQuestions = questions.map((q: unknown) => CreateQuestionSchema.parse(q));

      const created = await questionService.bulkCreate(tenantId, userId, validatedQuestions);
      reply.status(201);
      return { created: created.length, questions: created };
    } catch (error) {
      handleError(error, reply);
    }
  });

  /**
   * GET /questions/:id
   * Get question by ID
   */
  app.get(
    '/:id',
    async (
      request: FastifyRequest<{ Params: { id: string }; Querystring: { includeAnswer?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { tenantId } = getContext(request);
        const { id } = request.params;
        const includeAnswer = request.query.includeAnswer === 'true';

        const question = includeAnswer
          ? await questionService.getById(tenantId, id)
          : await questionService.getByIdForDisplay(tenantId, id);

        if (!question) {
          reply.status(404);
          return { error: 'Question not found' };
        }

        return question;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  /**
   * PUT /questions/:id
   * Update a question
   */
  app.put(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { tenantId } = getContext(request);
        const { id } = request.params;
        const body = UpdateQuestionSchema.parse(request.body);
        const question = await questionService.update(tenantId, id, body);
        return question;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  /**
   * DELETE /questions/:id
   * Delete a question
   */
  app.delete(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { tenantId } = getContext(request);
        const { id } = request.params;
        await questionService.delete(tenantId, id);
        reply.status(204);
        return;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  /**
   * POST /questions/:id/clone
   * Clone a question
   */
  app.post(
    '/:id/clone',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { tenantId, userId } = getContext(request);
        const { id } = request.params;
        const question = await questionService.clone(tenantId, id, userId);
        reply.status(201);
        return question;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );
}
