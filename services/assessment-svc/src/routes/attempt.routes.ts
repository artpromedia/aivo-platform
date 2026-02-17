import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';

import { publishEvent } from '../events/publisher.js';
import { prisma } from '../prisma.js';
import { adaptiveService } from '../services/adaptive.service.js';
import { attemptService } from '../services/attempt.service.js';
import { scoringService } from '../services/scoring.service.js';
import {
  StartAttemptSchema,
  AttemptQuerySchema,
  SubmitResponseSchema,
  BulkSubmitResponsesSchema,
  ManualGradeSchema,
  BulkManualGradeSchema,
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
    if (error.message.includes('Cannot') || error.message.includes('Maximum')) {
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

export async function attemptRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /attempts
   * List attempts with filtering and pagination
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tenantId } = getContext(request);
      const query = AttemptQuerySchema.parse(request.query);
      const result = await attemptService.list(tenantId, query as any);
      return result;
    } catch (error) {
      handleError(error, reply);
    }
  });

  /**
   * POST /attempts
   * Start a new attempt
   */
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tenantId, userId } = getContext(request);
      const body = StartAttemptSchema.parse(request.body);
      const attempt = await attemptService.start(
        tenantId,
        userId,
        body.assessmentId,
        body.metadata
      );
      reply.status(201);
      return attempt;
    } catch (error) {
      handleError(error, reply);
    }
  });

  /**
   * GET /attempts/:id
   * Get attempt by ID
   */
  app.get(
    '/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: { includeResponses?: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { tenantId } = getContext(request);
        const { id } = request.params;
        const includeResponses = request.query.includeResponses === 'true';
        const attempt = await attemptService.getById(tenantId, id, includeResponses);

        if (!attempt) {
          reply.status(404);
          return { error: 'Attempt not found' };
        }

        return attempt;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  /**
   * POST /attempts/:id/submit
   * Submit an attempt for grading
   */
  app.post(
    '/:id/submit',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { tenantId } = getContext(request);
        const { id } = request.params;
        const attempt = await attemptService.submit(tenantId, id);
        return attempt;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  /**
   * POST /attempts/:id/abandon
   * Abandon an attempt
   */
  app.post(
    '/:id/abandon',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { tenantId } = getContext(request);
        const { id } = request.params;
        const attempt = await attemptService.abandon(tenantId, id);
        return attempt;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  /**
   * GET /attempts/:id/next-question
   * Get next question for adaptive assessment
   */
  app.get(
    '/:id/next-question',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const question = await adaptiveService.getNextQuestion(id);

        if (!question) {
          return { complete: true, message: 'All questions answered' };
        }

        // Don't include correct answer
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { correctAnswer, ...questionWithoutAnswer } = question;
        return questionWithoutAnswer;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  /**
   * POST /attempts/:id/responses
   * Submit a response for a question
   */
  app.post(
    '/:id/responses',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { tenantId } = getContext(request);
        const attemptId = request.params.id;
        const body = SubmitResponseSchema.omit({ attemptId: true }).parse(request.body);

        // Verify attempt exists and is in progress
        const attempt = await attemptService.getById(tenantId, attemptId);
        if (!attempt) {
          reply.status(404);
          return { error: 'Attempt not found' };
        }
        if (attempt.status !== 'IN_PROGRESS') {
          reply.status(400);
          return { error: 'Attempt is not in progress' };
        }

        // Check if response already exists
        const existingResponse = await prisma.questionResponse.findUnique({
          where: {
            attemptId_questionId: {
              attemptId,
              questionId: body.questionId,
            },
          },
        });

        if (existingResponse) {
          // Update existing response
          const updated = await prisma.questionResponse.update({
            where: { id: existingResponse.id },
            data: {
              response: body.response,
              responseText: typeof body.response === 'string' ? body.response : null,
              answeredAt: new Date(),
              timeSpentSeconds: existingResponse.timeSpentSeconds + (body.timeSpentSeconds ?? 0),
            },
          });
          return updated;
        } else {
          // Create new response
          const response = await prisma.questionResponse.create({
            data: {
              attemptId,
              questionId: body.questionId,
              response: body.response,
              responseText: typeof body.response === 'string' ? body.response : null,
              timeSpentSeconds: body.timeSpentSeconds ?? 0,
            },
          });

          await publishEvent('response.submitted', {
            responseId: response.id,
            attemptId,
            questionId: body.questionId,
            tenantId,
          });

          reply.status(201);
          return response;
        }
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  /**
   * POST /attempts/:id/responses/bulk
   * Submit multiple responses at once
   */
  app.post(
    '/:id/responses/bulk',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { tenantId } = getContext(request);
        const attemptId = request.params.id;
        const body = BulkSubmitResponsesSchema.omit({ attemptId: true }).parse(request.body);

        // Verify attempt exists and is in progress
        const attempt = await attemptService.getById(tenantId, attemptId);
        if (!attempt) {
          reply.status(404);
          return { error: 'Attempt not found' };
        }
        if (attempt.status !== 'IN_PROGRESS') {
          reply.status(400);
          return { error: 'Attempt is not in progress' };
        }

        const responses = await prisma.$transaction(async (tx) => {
          const results = [];

          for (const responseData of body.responses) {
            const existing = await tx.questionResponse.findUnique({
              where: {
                attemptId_questionId: {
                  attemptId,
                  questionId: responseData.questionId,
                },
              },
            });

            if (existing) {
              const updated = await tx.questionResponse.update({
                where: { id: existing.id },
                data: {
                  response: responseData.response,
                  answeredAt: new Date(),
                  timeSpentSeconds:
                    existing.timeSpentSeconds + (responseData.timeSpentSeconds ?? 0),
                },
              });
              results.push(updated);
            } else {
              const created = await tx.questionResponse.create({
                data: {
                  attemptId,
                  questionId: responseData.questionId,
                  response: responseData.response,
                  timeSpentSeconds: responseData.timeSpentSeconds ?? 0,
                },
              });
              results.push(created);
            }
          }

          return results;
        });

        return { submitted: responses.length, responses };
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  /**
   * GET /attempts/:id/responses
   * Get all responses for an attempt
   */
  app.get(
    '/:id/responses',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { tenantId } = getContext(request);
        const { id } = request.params;

        // Verify attempt access
        const attempt = await attemptService.getById(tenantId, id);
        if (!attempt) {
          reply.status(404);
          return { error: 'Attempt not found' };
        }

        const responses = await prisma.questionResponse.findMany({
          where: { attemptId: id },
          include: {
            question: {
              select: {
                id: true,
                stem: true,
                type: true,
                options: true,
                // Only include correct answer if attempt is graded
                ...(attempt.status === 'GRADED' && {
                  correctAnswer: true,
                  explanation: true,
                }),
              },
            },
          },
          orderBy: { startedAt: 'asc' },
        });

        return responses;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  /**
   * POST /attempts/:id/grade
   * Manual grade an entire attempt
   */
  app.post(
    '/:id/grade',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { tenantId, userId } = getContext(request);
        const attemptId = request.params.id;
        const body = BulkManualGradeSchema.omit({ attemptId: true }).parse(request.body);

        // Verify attempt exists and needs grading
        const attempt = await attemptService.getById(tenantId, attemptId);
        if (!attempt) {
          reply.status(404);
          return { error: 'Attempt not found' };
        }
        if (attempt.status !== 'GRADING' && attempt.status !== 'SUBMITTED') {
          reply.status(400);
          return { error: 'Attempt cannot be graded' };
        }

        await scoringService.bulkManualGrade(attemptId, body.grades, body.overallFeedback, userId);

        const gradedAttempt = await attemptService.getById(tenantId, attemptId, true);

        await publishEvent('attempt.graded', {
          attemptId,
          gradedBy: userId,
          tenantId,
        });

        return gradedAttempt;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  /**
   * POST /attempts/:id/responses/:responseId/grade
   * Manual grade a single response
   */
  app.post(
    '/:id/responses/:responseId/grade',
    async (
      request: FastifyRequest<{ Params: { id: string; responseId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { tenantId, userId } = getContext(request);
        const { id, responseId } = request.params;
        const body = ManualGradeSchema.omit({ responseId: true }).parse(request.body);

        // Verify attempt access
        const attempt = await attemptService.getById(tenantId, id);
        if (!attempt) {
          reply.status(404);
          return { error: 'Attempt not found' };
        }

        await scoringService.manualGrade(
          responseId,
          body.pointsEarned,
          body.isCorrect,
          body.feedback,
          userId
        );

        await publishEvent('response.graded', {
          responseId,
          attemptId: id,
          gradedBy: userId,
          tenantId,
        });

        return { success: true };
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  /**
   * GET /attempts/user/:userId/assessment/:assessmentId
   * Get all attempts for a user on an assessment
   */
  app.get(
    '/user/:userId/assessment/:assessmentId',
    async (
      request: FastifyRequest<{ Params: { userId: string; assessmentId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { tenantId } = getContext(request);
        const { userId, assessmentId } = request.params;
        const attempts = await attemptService.getByUserAndAssessment(
          tenantId,
          userId,
          assessmentId
        );
        return attempts;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  /**
   * GET /attempts/user/:userId/assessment/:assessmentId/best
   * Get best attempt for a user on an assessment
   */
  app.get(
    '/user/:userId/assessment/:assessmentId/best',
    async (
      request: FastifyRequest<{ Params: { userId: string; assessmentId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { tenantId } = getContext(request);
        const { userId, assessmentId } = request.params;
        const attempt = await attemptService.getBestAttempt(tenantId, userId, assessmentId);

        if (!attempt) {
          reply.status(404);
          return { error: 'No completed attempts found' };
        }

        return attempt;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );
}
