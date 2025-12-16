import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

import { questionService } from '../services/question.service.js';
import {
  CreateQuestionSchema,
  UpdateQuestionSchema,
  QuestionQuerySchema,
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
    if (error.message.includes('Cannot')) {
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
 * GET /questions
 * List questions with filtering and pagination
 */
router.get('/', validateQuery(QuestionQuerySchema), async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const result = await questionService.list(tenantId, req.query as any);
    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /questions
 * Create a new question
 */
router.post('/', validateBody(CreateQuestionSchema), async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getContext(req);
    const question = await questionService.create(tenantId, userId, req.body);
    res.status(201).json(question);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /questions/bulk
 * Bulk create questions
 */
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getContext(req);
    const questions = req.body.questions;

    if (!Array.isArray(questions)) {
      res.status(400).json({ error: 'questions must be an array' });
      return;
    }

    // Validate each question
    const validatedQuestions = questions.map((q: unknown) => CreateQuestionSchema.parse(q));

    const created = await questionService.bulkCreate(tenantId, userId, validatedQuestions);
    res.status(201).json({ created: created.length, questions: created });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /questions/:id
 * Get question by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const id = getParam(req, 'id');
    const includeAnswer = req.query.includeAnswer === 'true';

    const question = includeAnswer
      ? await questionService.getById(tenantId, id)
      : await questionService.getByIdForDisplay(tenantId, id);

    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    res.json(question);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * PUT /questions/:id
 * Update a question
 */
router.put('/:id', validateBody(UpdateQuestionSchema), async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const id = getParam(req, 'id');
    const question = await questionService.update(tenantId, id, req.body);
    res.json(question);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * DELETE /questions/:id
 * Delete a question
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const id = getParam(req, 'id');
    await questionService.delete(tenantId, id);
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /questions/:id/clone
 * Clone a question
 */
router.post('/:id/clone', async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getContext(req);
    const id = getParam(req, 'id');
    const question = await questionService.clone(tenantId, id, userId);
    res.status(201).json(question);
  } catch (error) {
    handleError(error, res);
  }
});

export const questionRoutes = router;
