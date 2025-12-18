/**
 * ND-2.3: Emotional State API Routes
 *
 * REST API endpoints for emotional state detection, intervention management,
 * and threshold configuration.
 */

import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import type { Pool } from 'pg';

import {
  EmotionalStateService,
  type AnalyzeStateRequest,
  type BehavioralSignals,
  type ContextualFactors,
  type EmotionalState,
  type OverwhelmThresholds,
  createDefaultBehavioralSignals,
  createDefaultContextualFactors,
} from '../emotional-state/index.js';

interface EmotionalStateRouteOptions extends FastifyPluginOptions {
  pool: Pool;
}

/**
 * Request body for analyzing emotional state.
 */
interface AnalyzeStateBody {
  learnerId: string;
  tenantId: string;
  sessionId: string;
  signals: Partial<BehavioralSignals>;
  context: Partial<ContextualFactors>;
}

/**
 * Request body for recording intervention outcome.
 */
interface RecordInterventionOutcomeBody {
  sessionId: string;
  learnerId: string;
  tenantId: string;
  interventionId: string;
  accepted: boolean;
  stateAfter?: EmotionalState;
  feedback?: string;
}

/**
 * Request body for updating thresholds.
 */
interface UpdateThresholdsBody {
  cognitiveLoadThreshold?: number;
  sensoryLoadThreshold?: number;
  emotionalLoadThreshold?: number;
  timeOnTaskThreshold?: number;
  consecutiveErrorsThreshold?: number;
  minBreakAfterOverwhelmMin?: number;
  preferredCalmingActivities?: string[];
  autoAdjustEnabled?: boolean;
}

/**
 * Query params for session history.
 */
interface SessionHistoryParams {
  sessionId: string;
}

/**
 * Query params for threshold operations.
 */
interface ThresholdParams {
  learnerId: string;
}

/**
 * Query params for threshold operations.
 */
interface ThresholdQuery {
  tenantId: string;
}

export async function emotionalStateRoutes(
  fastify: FastifyInstance,
  options: EmotionalStateRouteOptions
): Promise<void> {
  const { pool } = options;
  const emotionalStateService = new EmotionalStateService(pool, {
    enableAutoAdjust: true,
  });

  /**
   * Analyze emotional state from behavioral signals.
   * POST /emotional-state/analyze
   */
  fastify.post<{
    Body: AnalyzeStateBody;
  }>('/analyze', async (request, reply) => {
    const { learnerId, tenantId, sessionId, signals, context } = request.body;

    if (!learnerId || !tenantId || !sessionId) {
      return reply.status(400).send({
        error: 'Missing required fields: learnerId, tenantId, sessionId',
      });
    }

    // Merge with defaults
    const fullSignals: BehavioralSignals = {
      ...createDefaultBehavioralSignals(),
      ...signals,
    };

    const fullContext: ContextualFactors = {
      ...createDefaultContextualFactors(),
      ...context,
    };

    try {
      const analysis = await emotionalStateService.analyzeState(
        learnerId,
        tenantId,
        sessionId,
        fullSignals,
        fullContext
      );

      return reply.send(analysis);
    } catch (error) {
      fastify.log.error(error, 'Failed to analyze emotional state');
      return reply.status(500).send({ error: 'Failed to analyze emotional state' });
    }
  });

  /**
   * Record intervention outcome.
   * POST /emotional-state/interventions/outcome
   */
  fastify.post<{
    Body: RecordInterventionOutcomeBody;
  }>('/interventions/outcome', async (request, reply) => {
    const { sessionId, learnerId, tenantId, interventionId, accepted, stateAfter, feedback } =
      request.body;

    if (!sessionId || !learnerId || !tenantId || !interventionId || accepted === undefined) {
      return reply.status(400).send({
        error: 'Missing required fields: sessionId, learnerId, tenantId, interventionId, accepted',
      });
    }

    try {
      await emotionalStateService.recordInterventionOutcome(
        sessionId,
        learnerId,
        tenantId,
        interventionId,
        accepted,
        stateAfter,
        feedback
      );

      return reply.send({ success: true });
    } catch (error) {
      fastify.log.error(error, 'Failed to record intervention outcome');
      return reply.status(500).send({ error: 'Failed to record intervention outcome' });
    }
  });

  /**
   * Get session emotional state history.
   * GET /emotional-state/sessions/:sessionId/history
   */
  fastify.get<{
    Params: SessionHistoryParams;
  }>('/sessions/:sessionId/history', async (request, reply) => {
    const { sessionId } = request.params;

    if (!sessionId) {
      return reply.status(400).send({ error: 'Missing sessionId' });
    }

    try {
      const history = await emotionalStateService.getSessionStateHistory(sessionId);
      return reply.send(history);
    } catch (error) {
      fastify.log.error(error, 'Failed to get session history');
      return reply.status(500).send({ error: 'Failed to get session history' });
    }
  });

  /**
   * Get learner's overwhelm thresholds.
   * GET /emotional-state/thresholds/:learnerId
   */
  fastify.get<{
    Params: ThresholdParams;
    Querystring: ThresholdQuery;
  }>('/thresholds/:learnerId', async (request, reply) => {
    const { learnerId } = request.params;
    const { tenantId } = request.query;

    if (!learnerId || !tenantId) {
      return reply.status(400).send({ error: 'Missing learnerId or tenantId' });
    }

    try {
      const thresholds = await emotionalStateService.getThresholds(learnerId, tenantId);
      return reply.send(thresholds);
    } catch (error) {
      fastify.log.error(error, 'Failed to get thresholds');
      return reply.status(500).send({ error: 'Failed to get thresholds' });
    }
  });

  /**
   * Update learner's overwhelm thresholds.
   * PUT /emotional-state/thresholds/:learnerId
   */
  fastify.put<{
    Params: ThresholdParams;
    Querystring: ThresholdQuery;
    Body: UpdateThresholdsBody;
  }>('/thresholds/:learnerId', async (request, reply) => {
    const { learnerId } = request.params;
    const { tenantId } = request.query;
    const updates = request.body;

    if (!learnerId || !tenantId) {
      return reply.status(400).send({ error: 'Missing learnerId or tenantId' });
    }

    try {
      const thresholds = await emotionalStateService.updateThresholds(learnerId, tenantId, updates);
      return reply.send(thresholds);
    } catch (error) {
      fastify.log.error(error, 'Failed to update thresholds');
      return reply.status(500).send({ error: 'Failed to update thresholds' });
    }
  });

  /**
   * Get available interventions for a state.
   * GET /emotional-state/interventions
   */
  fastify.get<{
    Querystring: {
      tenantId: string;
      state?: EmotionalState;
      active?: string;
    };
  }>('/interventions', async (request, reply) => {
    const { tenantId, state, active } = request.query;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing tenantId' });
    }

    try {
      let query = `
        SELECT *
        FROM interventions
        WHERE (tenant_id = $1 OR tenant_id = '__default__')
      `;
      const params: unknown[] = [tenantId];
      let paramIndex = 2;

      if (state) {
        query += ` AND $${paramIndex} = ANY(target_states)`;
        params.push(state);
        paramIndex++;
      }

      if (active === 'true') {
        query += ` AND is_active = TRUE`;
      }

      query += ` ORDER BY success_rate DESC, usage_count DESC`;

      const result = await pool.query(query, params);

      return reply.send({
        interventions: result.rows.map((row) => ({
          id: row.id,
          tenantId: row.tenant_id,
          name: row.name,
          type: row.type,
          description: row.description,
          content: row.content,
          targetStates: row.target_states,
          targetIntensityMin: row.target_intensity_min,
          targetIntensityMax: row.target_intensity_max,
          requiresAudio: row.requires_audio,
          requiresMotion: row.requires_motion,
          requiresPrivacy: row.requires_privacy,
          usageCount: row.usage_count,
          successRate: row.success_rate,
          isDefault: row.is_default,
          isActive: row.is_active,
        })),
      });
    } catch (error) {
      fastify.log.error(error, 'Failed to get interventions');
      return reply.status(500).send({ error: 'Failed to get interventions' });
    }
  });

  /**
   * Health check endpoint.
   * GET /emotional-state/health
   */
  fastify.get('/health', async (_request, reply) => {
    try {
      await pool.query('SELECT 1');
      return reply.send({ status: 'healthy' });
    } catch (error) {
      return reply.status(503).send({ status: 'unhealthy' });
    }
  });
}

export default emotionalStateRoutes;
