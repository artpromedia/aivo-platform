import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
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

const router = Router();

// Middleware for validating request body
function validateBody(schema: { parse: (data: unknown) => unknown }) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Middleware for validating query params
function validateQuery(schema: { parse: (data: unknown) => unknown }) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as Record<string, string>;
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Error handler
function handleError(error: unknown, res: Response): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: error.errors,
    });
    return;
  }

  if (error instanceof Error) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error.message.includes('Cannot') || error.message.includes('Maximum')) {
      res.status(400).json({ error: error.message });
      return;
    }
  }

  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
}

// Get tenant and user from request (set by auth middleware)
function getContext(req: Request): { tenantId: string; userId: string } {
  const tenantId = req.headers['x-tenant-id'] as string;
  const userId = req.headers['x-user-id'] as string;

  if (!tenantId || !userId) {
    throw new Error('Missing tenant or user context');
  }

  return { tenantId, userId };
}

// Get required URL parameter
function getParam(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) {
    throw new Error(`Missing required parameter: ${name}`);
  }
  return value;
}

/**
 * GET /attempts
 * List attempts with filtering and pagination
 */
router.get('/', validateQuery(AttemptQuerySchema), async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const result = await attemptService.list(tenantId, req.query as any);
    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /attempts
 * Start a new attempt
 */
router.post('/', validateBody(StartAttemptSchema), async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getContext(req);
    const attempt = await attemptService.start(
      tenantId,
      userId,
      req.body.assessmentId,
      req.body.metadata
    );
    res.status(201).json(attempt);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /attempts/:id
 * Get attempt by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const id = getParam(req, 'id');
    const includeResponses = req.query.includeResponses === 'true';
    const attempt = await attemptService.getById(tenantId, id, includeResponses);

    if (!attempt) {
      res.status(404).json({ error: 'Attempt not found' });
      return;
    }

    res.json(attempt);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /attempts/:id/submit
 * Submit an attempt for grading
 */
router.post('/:id/submit', async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const id = getParam(req, 'id');
    const attempt = await attemptService.submit(tenantId, id);
    res.json(attempt);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /attempts/:id/abandon
 * Abandon an attempt
 */
router.post('/:id/abandon', async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const id = getParam(req, 'id');
    const attempt = await attemptService.abandon(tenantId, id);
    res.json(attempt);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /attempts/:id/next-question
 * Get next question for adaptive assessment
 */
router.get('/:id/next-question', async (req: Request, res: Response) => {
  try {
    const id = getParam(req, 'id');
    const question = await adaptiveService.getNextQuestion(id);

    if (!question) {
      res.json({ complete: true, message: 'All questions answered' });
      return;
    }

    // Don't include correct answer
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { correctAnswer, ...questionWithoutAnswer } = question;
    res.json(questionWithoutAnswer);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /attempts/:id/responses
 * Submit a response for a question
 */
router.post(
  '/:id/responses',
  validateBody(SubmitResponseSchema.omit({ attemptId: true })),
  async (req: Request, res: Response) => {
    try {
      const { tenantId } = getContext(req);
      const attemptId = getParam(req, 'id');

      // Verify attempt exists and is in progress
      const attempt = await attemptService.getById(tenantId, attemptId);
      if (!attempt) {
        res.status(404).json({ error: 'Attempt not found' });
        return;
      }
      if (attempt.status !== 'IN_PROGRESS') {
        res.status(400).json({ error: 'Attempt is not in progress' });
        return;
      }

      // Check if response already exists
      const existingResponse = await prisma.questionResponse.findUnique({
        where: {
          attemptId_questionId: {
            attemptId,
            questionId: req.body.questionId,
          },
        },
      });

      if (existingResponse) {
        // Update existing response
        const updated = await prisma.questionResponse.update({
          where: { id: existingResponse.id },
          data: {
            response: req.body.response,
            responseText: typeof req.body.response === 'string' ? req.body.response : null,
            answeredAt: new Date(),
            timeSpentSeconds: existingResponse.timeSpentSeconds + (req.body.timeSpentSeconds ?? 0),
          },
        });
        res.json(updated);
      } else {
        // Create new response
        const response = await prisma.questionResponse.create({
          data: {
            attemptId,
            questionId: req.body.questionId,
            response: req.body.response,
            responseText: typeof req.body.response === 'string' ? req.body.response : null,
            timeSpentSeconds: req.body.timeSpentSeconds ?? 0,
          },
        });

        await publishEvent('response.submitted', {
          responseId: response.id,
          attemptId,
          questionId: req.body.questionId,
          tenantId,
        });

        res.status(201).json(response);
      }
    } catch (error) {
      handleError(error, res);
    }
  }
);

/**
 * POST /attempts/:id/responses/bulk
 * Submit multiple responses at once
 */
router.post(
  '/:id/responses/bulk',
  validateBody(BulkSubmitResponsesSchema.omit({ attemptId: true })),
  async (req: Request, res: Response) => {
    try {
      const { tenantId } = getContext(req);
      const attemptId = getParam(req, 'id');

      // Verify attempt exists and is in progress
      const attempt = await attemptService.getById(tenantId, attemptId);
      if (!attempt) {
        res.status(404).json({ error: 'Attempt not found' });
        return;
      }
      if (attempt.status !== 'IN_PROGRESS') {
        res.status(400).json({ error: 'Attempt is not in progress' });
        return;
      }

      const responses = await prisma.$transaction(async (tx) => {
        const results = [];

        for (const responseData of req.body.responses) {
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
                timeSpentSeconds: existing.timeSpentSeconds + (responseData.timeSpentSeconds ?? 0),
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

      res.json({ submitted: responses.length, responses });
    } catch (error) {
      handleError(error, res);
    }
  }
);

/**\n * GET /attempts/:id/responses\n * Get all responses for an attempt\n */
router.get('/:id/responses', async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const id = getParam(req, 'id');

    // Verify attempt access
    const attempt = await attemptService.getById(tenantId, id);
    if (!attempt) {
      res.status(404).json({ error: 'Attempt not found' });
      return;
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

    res.json(responses);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /attempts/:id/grade
 * Manual grade an entire attempt
 */
router.post(
  '/:id/grade',
  validateBody(BulkManualGradeSchema.omit({ attemptId: true })),
  async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getContext(req);
      const attemptId = getParam(req, 'id');

      // Verify attempt exists and needs grading
      const attempt = await attemptService.getById(tenantId, attemptId);
      if (!attempt) {
        res.status(404).json({ error: 'Attempt not found' });
        return;
      }
      if (attempt.status !== 'GRADING' && attempt.status !== 'SUBMITTED') {
        res.status(400).json({ error: 'Attempt cannot be graded' });
        return;
      }

      await scoringService.bulkManualGrade(
        attemptId,
        req.body.grades,
        req.body.overallFeedback,
        userId
      );

      const gradedAttempt = await attemptService.getById(tenantId, attemptId, true);

      await publishEvent('attempt.graded', {
        attemptId,
        gradedBy: userId,
        tenantId,
      });

      res.json(gradedAttempt);
    } catch (error) {
      handleError(error, res);
    }
  }
);

/**
 * POST /attempts/:id/responses/:responseId/grade
 * Manual grade a single response
 */
router.post(
  '/:id/responses/:responseId/grade',
  validateBody(ManualGradeSchema.omit({ responseId: true })),
  async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getContext(req);
      const id = getParam(req, 'id');
      const responseId = getParam(req, 'responseId');

      // Verify attempt access
      const attempt = await attemptService.getById(tenantId, id);
      if (!attempt) {
        res.status(404).json({ error: 'Attempt not found' });
        return;
      }

      await scoringService.manualGrade(
        responseId,
        req.body.pointsEarned,
        req.body.isCorrect,
        req.body.feedback,
        userId
      );

      await publishEvent('response.graded', {
        responseId,
        attemptId: id,
        gradedBy: userId,
        tenantId,
      });

      res.json({ success: true });
    } catch (error) {
      handleError(error, res);
    }
  }
);

/**
 * GET /attempts/user/:userId/assessment/:assessmentId
 * Get all attempts for a user on an assessment
 */
router.get('/user/:userId/assessment/:assessmentId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const userId = getParam(req, 'userId');
    const assessmentId = getParam(req, 'assessmentId');
    const attempts = await attemptService.getByUserAndAssessment(tenantId, userId, assessmentId);
    res.json(attempts);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /attempts/user/:userId/assessment/:assessmentId/best
 * Get best attempt for a user on an assessment
 */
router.get('/user/:userId/assessment/:assessmentId/best', async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const userId = getParam(req, 'userId');
    const assessmentId = getParam(req, 'assessmentId');
    const attempt = await attemptService.getBestAttempt(tenantId, userId, assessmentId);

    if (!attempt) {
      res.status(404).json({ error: 'No completed attempts found' });
      return;
    }

    res.json(attempt);
  } catch (error) {
    handleError(error, res);
  }
});

export const attemptRoutes = router;
