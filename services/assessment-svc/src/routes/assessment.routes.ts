import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

import { assessmentService } from '../services/assessment.service.js';
import {
  CreateAssessmentSchema,
  UpdateAssessmentSchema,
  AssessmentQuerySchema,
  AddQuestionToAssessmentSchema,
  ReorderQuestionsSchema,
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
 * GET /assessments
 * List assessments with filtering and pagination
 */
router.get('/', validateQuery(AssessmentQuerySchema), async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const result = await assessmentService.list(tenantId, req.query as any);
    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /assessments
 * Create a new assessment
 */
router.post('/', validateBody(CreateAssessmentSchema), async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getContext(req);
    const assessment = await assessmentService.create(tenantId, userId, req.body);
    res.status(201).json(assessment);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /assessments/:id
 * Get assessment by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const id = getParam(req, 'id');
    const includeQuestions = req.query.includeQuestions === 'true';
    const assessment = await assessmentService.getById(tenantId, id, includeQuestions);

    if (!assessment) {
      res.status(404).json({ error: 'Assessment not found' });
      return;
    }

    res.json(assessment);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * PUT /assessments/:id
 * Update an assessment
 */
router.put('/:id', validateBody(UpdateAssessmentSchema), async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const id = getParam(req, 'id');
    const assessment = await assessmentService.update(tenantId, id, req.body);
    res.json(assessment);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /assessments/:id/publish
 * Publish an assessment
 */
router.post('/:id/publish', async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const id = getParam(req, 'id');
    const assessment = await assessmentService.publish(tenantId, id);
    res.json(assessment);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /assessments/:id/archive
 * Archive an assessment
 */
router.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const id = getParam(req, 'id');
    const assessment = await assessmentService.archive(tenantId, id);
    res.json(assessment);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * DELETE /assessments/:id
 * Delete an assessment
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const id = getParam(req, 'id');
    await assessmentService.delete(tenantId, id);
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /assessments/:id/clone
 * Clone an assessment
 */
router.post('/:id/clone', async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getContext(req);
    const id = getParam(req, 'id');
    const newTitle = req.body.title as string | undefined;
    const assessment = await assessmentService.clone(tenantId, id, userId, newTitle);
    res.status(201).json(assessment);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /assessments/:id/questions
 * Get questions for an assessment
 */
router.get('/:id/questions', async (req: Request, res: Response) => {
  try {
    const id = getParam(req, 'id');
    const questions = await assessmentService.getQuestions(id);
    res.json(questions);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /assessments/:id/questions
 * Add a question to an assessment
 */
router.post(
  '/:id/questions',
  validateBody(AddQuestionToAssessmentSchema),
  async (req: Request, res: Response) => {
    try {
      const { tenantId } = getContext(req);
      const id = getParam(req, 'id');
      const assessmentQuestion = await assessmentService.addQuestion(tenantId, id, req.body);
      res.status(201).json(assessmentQuestion);
    } catch (error) {
      handleError(error, res);
    }
  }
);

/**
 * DELETE /assessments/:id/questions/:questionId
 * Remove a question from an assessment
 */
router.delete('/:id/questions/:questionId', async (req: Request, res: Response) => {
  try {
    const id = getParam(req, 'id');
    const questionId = getParam(req, 'questionId');
    await assessmentService.removeQuestion(id, questionId);
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * PUT /assessments/:id/questions/reorder
 * Reorder questions in an assessment
 */
router.put(
  '/:id/questions/reorder',
  validateBody(ReorderQuestionsSchema),
  async (req: Request, res: Response) => {
    try {
      const id = getParam(req, 'id');
      await assessmentService.reorderQuestions(id, req.body);
      res.status(204).send();
    } catch (error) {
      handleError(error, res);
    }
  }
);

export const assessmentRoutes = router;
