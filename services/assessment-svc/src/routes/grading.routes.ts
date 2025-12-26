/**
 * Grading Routes
 * 
 * API endpoints for grading functionality:
 * - Rubric management
 * - Manual grading queue
 * - Grading workflow
 * - Grade release
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';

import { rubricService } from '../services/grading/rubric.service.js';
import { manualGradingService } from '../services/grading/manual-grading.service.js';
import { autoGradingService } from '../services/grading/auto-grading.service.js';
import {
  CreateRubricInputSchema,
  GradeResponseInputSchema,
  BatchGradeInputSchema,
} from '../validators/schemas.js';

const router = Router();

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}

function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      next(error);
    }
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function handleError(error: unknown, res: Response): void {
  if (error instanceof ZodError) {
    res.status(400).json({ error: 'Validation error', details: error.errors });
    return;
  }

  if (error instanceof Error) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error.message.includes('not authorized') || error.message.includes('Not authorized')) {
      res.status(403).json({ error: error.message });
      return;
    }
    if (error.message.includes('Cannot') || error.message.includes('Invalid')) {
      res.status(400).json({ error: error.message });
      return;
    }
  }

  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
}

function getContext(req: Request): { tenantId: string; userId: string } {
  const tenantId = req.headers['x-tenant-id'] as string;
  const userId = req.headers['x-user-id'] as string;

  if (!tenantId || !userId) {
    throw new Error('Missing tenant or user context');
  }

  return { tenantId, userId };
}

// ============================================================================
// RUBRIC ROUTES
// ============================================================================

/**
 * @openapi
 * /api/rubrics:
 *   get:
 *     summary: List rubrics
 *     tags: [Rubrics]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [ANALYTIC, HOLISTIC, SINGLE_POINT]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: includePublic
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of rubrics
 */
router.get('/rubrics', async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getContext(req);
    const { type, search, includePublic, page, pageSize } = req.query;

    const result = await rubricService.list(tenantId, userId, {
      type: type as any,
      search: search as string,
      includePublic: includePublic === 'true',
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * @openapi
 * /api/rubrics/templates:
 *   get:
 *     summary: Get rubric templates
 *     tags: [Rubrics]
 *     responses:
 *       200:
 *         description: List of rubric templates
 */
router.get('/rubrics/templates', async (_req: Request, res: Response) => {
  try {
    const templates = rubricService.getRubricTemplates();
    res.json({ templates });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * @openapi
 * /api/rubrics/{id}:
 *   get:
 *     summary: Get rubric by ID
 *     tags: [Rubrics]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rubric details
 *       404:
 *         description: Rubric not found
 */
router.get('/rubrics/:id', async (req: Request, res: Response) => {
  try {
    const rubric = await rubricService.getById(req.params.id);
    if (!rubric) {
      res.status(404).json({ error: 'Rubric not found' });
      return;
    }
    res.json(rubric);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * @openapi
 * /api/rubrics:
 *   post:
 *     summary: Create a rubric
 *     tags: [Rubrics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRubricInput'
 *     responses:
 *       201:
 *         description: Created rubric
 */
router.post(
  '/rubrics',
  validateBody(CreateRubricInputSchema),
  async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getContext(req);
      const rubric = await rubricService.create(tenantId, userId, req.body);
      res.status(201).json(rubric);
    } catch (error) {
      handleError(error, res);
    }
  }
);

/**
 * @openapi
 * /api/rubrics/{id}:
 *   put:
 *     summary: Update a rubric
 *     tags: [Rubrics]
 */
router.put(
  '/rubrics/:id',
  async (req: Request, res: Response) => {
    try {
      const { userId } = getContext(req);
      const rubric = await rubricService.update(req.params.id, userId, req.body);
      res.json(rubric);
    } catch (error) {
      handleError(error, res);
    }
  }
);

/**
 * @openapi
 * /api/rubrics/{id}/clone:
 *   post:
 *     summary: Clone a rubric
 *     tags: [Rubrics]
 */
router.post('/rubrics/:id/clone', async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getContext(req);
    const { name } = req.body;
    const rubric = await rubricService.clone(req.params.id, userId, tenantId, { name });
    res.status(201).json(rubric);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * @openapi
 * /api/rubrics/{id}:
 *   delete:
 *     summary: Delete a rubric
 *     tags: [Rubrics]
 */
router.delete('/rubrics/:id', async (req: Request, res: Response) => {
  try {
    const { userId } = getContext(req);
    await rubricService.delete(req.params.id, userId);
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
});

// ============================================================================
// GRADING QUEUE ROUTES
// ============================================================================

/**
 * @openapi
 * /api/grading/queue:
 *   get:
 *     summary: Get grading queue
 *     tags: [Grading]
 *     parameters:
 *       - in: query
 *         name: assessmentId
 *         schema:
 *           type: string
 *       - in: query
 *         name: questionId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, GRADED, SKIPPED]
 *       - in: query
 *         name: blindGrading
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Grading queue
 */
router.get('/grading/queue', async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getContext(req);
    const { assessmentId, questionId, status, blindGrading, page, pageSize } = req.query;

    const queue = await manualGradingService.getGradingQueue(userId, tenantId, {
      assessmentId: assessmentId as string,
      questionId: questionId as string,
      status: status as any,
      blindGrading: blindGrading === 'true',
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });

    res.json(queue);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * @openapi
 * /api/grading/responses/{id}:
 *   get:
 *     summary: Get response for grading
 *     tags: [Grading]
 */
router.get('/grading/responses/:id', async (req: Request, res: Response) => {
  try {
    const blindGrading = req.query.blindGrading === 'true';
    const response = await manualGradingService.getResponseForGrading(req.params.id, {
      blindGrading,
    });

    if (!response) {
      res.status(404).json({ error: 'Response not found' });
      return;
    }

    res.json(response);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * @openapi
 * /api/grading/responses/{id}:
 *   post:
 *     summary: Grade a response
 *     tags: [Grading]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GradeResponseInput'
 */
router.post(
  '/grading/responses/:id',
  validateBody(GradeResponseInputSchema),
  async (req: Request, res: Response) => {
    try {
      const { userId } = getContext(req);
      const graded = await manualGradingService.gradeResponse({
        responseId: req.params.id,
        gradedBy: userId,
        ...req.body,
      });
      res.json(graded);
    } catch (error) {
      handleError(error, res);
    }
  }
);

/**
 * @openapi
 * /api/grading/batch:
 *   post:
 *     summary: Batch grade responses
 *     tags: [Grading]
 */
router.post(
  '/grading/batch',
  validateBody(BatchGradeInputSchema),
  async (req: Request, res: Response) => {
    try {
      const { userId } = getContext(req);
      const result = await manualGradingService.batchGrade({
        ...req.body,
        gradedBy: userId,
      });
      res.json(result);
    } catch (error) {
      handleError(error, res);
    }
  }
);

/**
 * @openapi
 * /api/grading/responses/{id}/flag:
 *   post:
 *     summary: Flag a response for review
 *     tags: [Grading]
 */
router.post('/grading/responses/:id/flag', async (req: Request, res: Response) => {
  try {
    const { userId } = getContext(req);
    const { reason } = req.body;
    await manualGradingService.flagResponse(req.params.id, userId, reason);
    res.json({ success: true });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * @openapi
 * /api/grading/responses/{id}/unflag:
 *   post:
 *     summary: Unflag a response
 *     tags: [Grading]
 */
router.post('/grading/responses/:id/unflag', async (req: Request, res: Response) => {
  try {
    await manualGradingService.unflagResponse(req.params.id);
    res.json({ success: true });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * @openapi
 * /api/grading/summary/{assessmentId}:
 *   get:
 *     summary: Get grading summary for assessment
 *     tags: [Grading]
 */
router.get('/grading/summary/:assessmentId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const summary = await manualGradingService.getGradingSummary(
      req.params.assessmentId,
      tenantId
    );
    res.json(summary);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * @openapi
 * /api/grading/release:
 *   post:
 *     summary: Release grades
 *     tags: [Grading]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assessmentId:
 *                 type: string
 *               attemptIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               releaseAt:
 *                 type: string
 *                 format: date-time
 */
router.post('/grading/release', async (req: Request, res: Response) => {
  try {
    const { userId } = getContext(req);
    const { assessmentId, attemptIds, releaseAt } = req.body;

    const result = await manualGradingService.releaseGrades(
      {
        assessmentId,
        attemptIds,
        releaseAt: releaseAt ? new Date(releaseAt) : undefined,
      },
      userId
    );

    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
});

export default router;
