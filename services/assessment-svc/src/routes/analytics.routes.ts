/**
 * Analytics Routes
 *
 * API endpoints for assessment analytics:
 * - Assessment-level analytics
 * - Question-level analytics (item analysis)
 * - Standards mastery
 * - Score distributions
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';

import { analyticsService } from '../services/analytics.service.js';

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

// ============================================================================
// ASSESSMENT ANALYTICS
// ============================================================================

export default async function analyticsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/analytics/assessments/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: { startDate?: string; endDate?: string; persist?: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { startDate, endDate, persist } = request.query;
        const { id } = request.params;

        const analytics = await analyticsService.generateAssessmentAnalytics(id, {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        });

        // Optionally persist to database
        if (persist === 'true') {
          await analyticsService.persistAnalytics(id, analytics);
        }

        return analytics;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  app.get(
    '/analytics/assessments/:id/items',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const analytics = await analyticsService.generateAssessmentAnalytics(id);
        return { items: analytics.itemAnalyses };
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  app.get(
    '/analytics/assessments/:id/distribution',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const analytics = await analyticsService.generateAssessmentAnalytics(id);
        return { distribution: analytics.scoreDistribution };
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  app.get(
    '/analytics/assessments/:id/reliability',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const analytics = await analyticsService.generateAssessmentAnalytics(id);
        return { reliability: analytics.reliability };
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  app.get(
    '/analytics/assessments/:id/standards',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const mastery = await analyticsService.calculateStandardsMastery(id);
        return { standards: mastery };
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  // ============================================================================
  // QUESTION ANALYTICS
  // ============================================================================

  app.get(
    '/analytics/questions/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const analytics = await analyticsService.generateQuestionAnalytics(id);
        return analytics;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  app.post(
    '/analytics/refresh/:assessmentId',
    async (request: FastifyRequest<{ Params: { assessmentId: string } }>, reply: FastifyReply) => {
      try {
        const { assessmentId } = request.params;
        const analytics = await analyticsService.generateAssessmentAnalytics(assessmentId);
        await analyticsService.persistAnalytics(assessmentId, analytics);
        return { success: true, generatedAt: analytics.generatedAt };
      } catch (error) {
        handleError(error, reply);
      }
    }
  );
}
