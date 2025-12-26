/**
 * Analytics Routes
 * 
 * API endpoints for assessment analytics:
 * - Assessment-level analytics
 * - Question-level analytics (item analysis)
 * - Standards mastery
 * - Score distributions
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';

import { analyticsService } from '../services/analytics.service.js';

const router = Router();

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
// ASSESSMENT ANALYTICS
// ============================================================================

/**
 * @openapi
 * /api/analytics/assessments/{id}:
 *   get:
 *     summary: Get comprehensive analytics for an assessment
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: persist
 *         schema:
 *           type: boolean
 *         description: Whether to save analytics to database
 *     responses:
 *       200:
 *         description: Assessment analytics
 */
router.get('/analytics/assessments/:id', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, persist } = req.query;

    const analytics = await analyticsService.generateAssessmentAnalytics(
      req.params.id,
      {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      }
    );

    // Optionally persist to database
    if (persist === 'true') {
      await analyticsService.persistAnalytics(req.params.id, analytics);
    }

    res.json(analytics);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * @openapi
 * /api/analytics/assessments/{id}/items:
 *   get:
 *     summary: Get item analysis for all questions in an assessment
 *     tags: [Analytics]
 */
router.get('/analytics/assessments/:id/items', async (req: Request, res: Response) => {
  try {
    const analytics = await analyticsService.generateAssessmentAnalytics(req.params.id);
    res.json({ items: analytics.itemAnalyses });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * @openapi
 * /api/analytics/assessments/{id}/distribution:
 *   get:
 *     summary: Get score distribution for an assessment
 *     tags: [Analytics]
 */
router.get('/analytics/assessments/:id/distribution', async (req: Request, res: Response) => {
  try {
    const analytics = await analyticsService.generateAssessmentAnalytics(req.params.id);
    res.json({ distribution: analytics.scoreDistribution });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * @openapi
 * /api/analytics/assessments/{id}/reliability:
 *   get:
 *     summary: Get reliability metrics for an assessment
 *     tags: [Analytics]
 */
router.get('/analytics/assessments/:id/reliability', async (req: Request, res: Response) => {
  try {
    const analytics = await analyticsService.generateAssessmentAnalytics(req.params.id);
    res.json({ reliability: analytics.reliability });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * @openapi
 * /api/analytics/assessments/{id}/standards:
 *   get:
 *     summary: Get standards mastery for an assessment
 *     tags: [Analytics]
 */
router.get('/analytics/assessments/:id/standards', async (req: Request, res: Response) => {
  try {
    const mastery = await analyticsService.calculateStandardsMastery(req.params.id);
    res.json({ standards: mastery });
  } catch (error) {
    handleError(error, res);
  }
});

// ============================================================================
// QUESTION ANALYTICS
// ============================================================================

/**
 * @openapi
 * /api/analytics/questions/{id}:
 *   get:
 *     summary: Get analytics for a single question
 *     tags: [Analytics]
 */
router.get('/analytics/questions/:id', async (req: Request, res: Response) => {
  try {
    const analytics = await analyticsService.generateQuestionAnalytics(req.params.id);
    res.json(analytics);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * @openapi
 * /api/analytics/refresh/{assessmentId}:
 *   post:
 *     summary: Refresh and persist analytics for an assessment
 *     tags: [Analytics]
 */
router.post('/analytics/refresh/:assessmentId', async (req: Request, res: Response) => {
  try {
    const analytics = await analyticsService.generateAssessmentAnalytics(
      req.params.assessmentId
    );
    await analyticsService.persistAnalytics(req.params.assessmentId, analytics);
    res.json({ success: true, generatedAt: analytics.generatedAt });
  } catch (error) {
    handleError(error, res);
  }
});

export default router;
