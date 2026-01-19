/**
 * Prompt Debugging Dashboard API Routes
 *
 * Provides real-time visibility into prompt performance, A/B tests,
 * learning patterns, and self-learning system health.
 */

import { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import type { Pool } from 'pg';
import type { Redis } from 'ioredis';
import { z } from 'zod';

// ════════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ════════════════════════════════════════════════════════════════════════════════

const dateRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const promptIdSchema = z.object({
  promptId: z.string().uuid(),
});

const experimentIdSchema = z.object({
  experimentId: z.string().uuid(),
});

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

interface PromptPerformanceMetrics {
  templateId: string;
  templateName: string;
  category: string;
  agentType: string | null;
  version: number;
  totalUses: number;
  successRate: number | null;
  avgRating: number | null;
  avgLatencyMs: number | null;
  trend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  lastUsed: string | null;
}

interface ExperimentSummary {
  id: string;
  name: string;
  status: string;
  variants: {
    id: string;
    name: string;
    isControl: boolean;
    sampleSize: number;
    successRate: number;
    avgRating: number | null;
  }[];
  winner: string | null;
  statisticalSignificance: number | null;
  startedAt: string | null;
  daysRunning: number;
}

interface LearningPatternSummary {
  id: string;
  patternType: string;
  agentType: string;
  actionType: string;
  description: string;
  confidence: number;
  supportCount: number;
  recommendations: string[];
  detectedAt: string;
  isValidated: boolean;
}

interface SignalTrend {
  timeBucket: string;
  signalType: string;
  agentType: string;
  meanValue: number;
  signalCount: number;
  trend: number | null;
}

interface SystemHealthMetrics {
  totalActionsTracked: number;
  feedbackRate: number;
  acceptanceRate: number;
  avgUserRating: number;
  activeExperiments: number;
  patternsDetected: number;
  trainingExamplesReady: number;
  signalsProcessed24h: number;
  lastLearningCycle: string | null;
  systemStatus: 'healthy' | 'degraded' | 'unhealthy';
}

interface ActionDebugInfo {
  id: string;
  learnerId: string;
  agentType: string;
  actionType: string;
  category: string;
  inputContext: Record<string, unknown>;
  recommendation: Record<string, unknown>;
  confidence: number;
  reasoning: string | null;
  wasExecuted: boolean;
  wasAccepted: boolean | null;
  userRating: number | null;
  userModification: Record<string, unknown> | null;
  feedbackText: string | null;
  promptTemplateId: string | null;
  promptTemplateName: string | null;
  experimentVariantId: string | null;
  experimentName: string | null;
  createdAt: string;
  feedbackAt: string | null;
}

interface PromptComparisonData {
  baseline: PromptPerformanceMetrics;
  variants: PromptPerformanceMetrics[];
  statisticalAnalysis: {
    bestPerformer: string;
    improvementOverBaseline: number;
    isSignificant: boolean;
    pValue: number | null;
    recommendedAction: 'promote' | 'continue' | 'stop';
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// ROUTES
// ════════════════════════════════════════════════════════════════════════════════

interface PromptDebuggingRoutesOptions {
  pool: Pool;
  redis?: Redis;
}

export const registerPromptDebuggingRoutes: FastifyPluginAsync<PromptDebuggingRoutesOptions> = async (
  fastify: FastifyInstance,
  opts
) => {
  const { pool } = opts;

  // ──────────────────────────────────────────────────────────────────────────────
  // System Health & Overview
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * GET /prompt-debugging/health
   *
   * Returns overall system health metrics for the self-learning system.
   */
  fastify.get('/prompt-debugging/health', async (_request, reply) => {
    try {
      const healthQuery = await pool.query(`
        WITH action_stats AS (
          SELECT
            COUNT(*) as total_actions,
            COUNT(*) FILTER (WHERE feedback_received) * 100.0 / NULLIF(COUNT(*), 0) as feedback_rate,
            AVG(CASE WHEN was_accepted THEN 100.0 ELSE 0.0 END) as acceptance_rate,
            AVG(user_rating) as avg_rating
          FROM tracked_ai_actions
          WHERE created_at > NOW() - INTERVAL '30 days'
        ),
        experiment_stats AS (
          SELECT COUNT(*) as active_experiments
          FROM prompt_experiments
          WHERE status = 'running'
        ),
        pattern_stats AS (
          SELECT COUNT(*) as patterns_detected
          FROM learning_patterns
          WHERE is_active = true
        ),
        training_stats AS (
          SELECT COUNT(*) as training_ready
          FROM training_examples
          WHERE status IN ('approved', 'pending')
        ),
        signal_stats AS (
          SELECT COUNT(*) as signals_24h
          FROM learning_signals
          WHERE created_at > NOW() - INTERVAL '24 hours'
        )
        SELECT
          COALESCE(a.total_actions, 0) as total_actions,
          COALESCE(a.feedback_rate, 0) as feedback_rate,
          COALESCE(a.acceptance_rate, 0) as acceptance_rate,
          COALESCE(a.avg_rating, 0) as avg_rating,
          COALESCE(e.active_experiments, 0) as active_experiments,
          COALESCE(p.patterns_detected, 0) as patterns_detected,
          COALESCE(t.training_ready, 0) as training_ready,
          COALESCE(s.signals_24h, 0) as signals_24h
        FROM action_stats a
        CROSS JOIN experiment_stats e
        CROSS JOIN pattern_stats p
        CROSS JOIN training_stats t
        CROSS JOIN signal_stats s
      `);

      const stats = healthQuery.rows[0] || {};

      // Determine system status based on metrics
      let systemStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (parseFloat(stats.feedback_rate) < 10 || parseFloat(stats.acceptance_rate) < 50) {
        systemStatus = 'degraded';
      }
      if (parseFloat(stats.feedback_rate) < 5 || parseFloat(stats.acceptance_rate) < 30) {
        systemStatus = 'unhealthy';
      }

      const health: SystemHealthMetrics = {
        totalActionsTracked: Number.parseInt(stats.total_actions) || 0,
        feedbackRate: parseFloat(stats.feedback_rate) || 0,
        acceptanceRate: parseFloat(stats.acceptance_rate) || 0,
        avgUserRating: parseFloat(stats.avg_rating) || 0,
        activeExperiments: Number.parseInt(stats.active_experiments) || 0,
        patternsDetected: Number.parseInt(stats.patterns_detected) || 0,
        trainingExamplesReady: Number.parseInt(stats.training_ready) || 0,
        signalsProcessed24h: Number.parseInt(stats.signals_24h) || 0,
        lastLearningCycle: null, // Would come from a job scheduler table
        systemStatus,
      };

      reply.code(200).send(health);
    } catch (error) {
      fastify.log.error(error, 'Failed to fetch system health');
      reply.code(500).send({ error: 'Failed to fetch system health' });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Prompt Performance
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * GET /prompt-debugging/prompts
   *
   * Returns performance metrics for all prompt templates.
   */
  fastify.get('/prompt-debugging/prompts', async (request, reply) => {
    const query = { ...dateRangeSchema.parse(request.query), ...paginationSchema.parse(request.query) };
    const { page, limit } = query;
    const offset = (page - 1) * limit;

    try {
      const promptsQuery = await pool.query(
        `
        WITH prompt_trends AS (
          SELECT
            prompt_template_id,
            AVG(CASE WHEN was_accepted THEN 1.0 ELSE 0.0 END) as recent_success,
            LAG(AVG(CASE WHEN was_accepted THEN 1.0 ELSE 0.0 END)) OVER (
              PARTITION BY prompt_template_id
              ORDER BY DATE_TRUNC('week', created_at)
            ) as prev_success
          FROM tracked_ai_actions
          WHERE prompt_template_id IS NOT NULL
            AND created_at > NOW() - INTERVAL '30 days'
          GROUP BY prompt_template_id, DATE_TRUNC('week', created_at)
        )
        SELECT
          pt.id as template_id,
          pt.name as template_name,
          pt.category,
          pt.agent_type,
          pt.version,
          pt.total_uses,
          pt.success_rate,
          pt.avg_rating,
          pt.avg_latency_ms,
          (
            SELECT MAX(created_at)
            FROM tracked_ai_actions
            WHERE prompt_template_id = pt.id
          ) as last_used,
          CASE
            WHEN pt.total_uses < 10 THEN 'insufficient_data'
            WHEN COALESCE(tr.recent_success, 0) > COALESCE(tr.prev_success, 0) + 0.05 THEN 'improving'
            WHEN COALESCE(tr.recent_success, 0) < COALESCE(tr.prev_success, 0) - 0.05 THEN 'declining'
            ELSE 'stable'
          END as trend
        FROM prompt_templates pt
        LEFT JOIN LATERAL (
          SELECT recent_success, prev_success
          FROM prompt_trends
          WHERE prompt_template_id = pt.id
          ORDER BY recent_success DESC NULLS LAST
          LIMIT 1
        ) tr ON true
        WHERE pt.is_active = true
        ORDER BY pt.total_uses DESC NULLS LAST
        LIMIT $1 OFFSET $2
      `,
        [limit, offset]
      );

      const countQuery = await pool.query(
        `SELECT COUNT(*) FROM prompt_templates WHERE is_active = true`
      );

      const prompts: PromptPerformanceMetrics[] = promptsQuery.rows.map((row) => ({
        templateId: row.template_id,
        templateName: row.template_name,
        category: row.category,
        agentType: row.agent_type,
        version: row.version,
        totalUses: Number.parseInt(row.total_uses) || 0,
        successRate: row.success_rate ? parseFloat(row.success_rate) : null,
        avgRating: row.avg_rating ? parseFloat(row.avg_rating) : null,
        avgLatencyMs: row.avg_latency_ms ? Number.parseInt(row.avg_latency_ms) : null,
        trend: row.trend || 'insufficient_data',
        lastUsed: row.last_used,
      }));

      reply.code(200).send({
        data: prompts,
        pagination: {
          page,
          limit,
          total: Number.parseInt(countQuery.rows[0].count),
          totalPages: Math.ceil(Number.parseInt(countQuery.rows[0].count) / limit),
        },
      });
    } catch (error) {
      fastify.log.error(error, 'Failed to fetch prompts');
      reply.code(500).send({ error: 'Failed to fetch prompts' });
    }
  });

  /**
   * GET /prompt-debugging/prompts/:promptId
   *
   * Returns detailed performance data for a specific prompt.
   */
  fastify.get('/prompt-debugging/prompts/:promptId', async (request, reply) => {
    const { promptId } = promptIdSchema.parse(request.params);

    try {
      const promptQuery = await pool.query(
        `
        SELECT
          pt.*,
          (
            SELECT jsonb_agg(jsonb_build_object(
              'date', DATE_TRUNC('day', created_at),
              'uses', COUNT(*),
              'successRate', AVG(CASE WHEN was_accepted THEN 1.0 ELSE 0.0 END),
              'avgRating', AVG(user_rating)
            ))
            FROM tracked_ai_actions
            WHERE prompt_template_id = pt.id
              AND created_at > NOW() - INTERVAL '30 days'
            GROUP BY DATE_TRUNC('day', created_at)
            ORDER BY DATE_TRUNC('day', created_at)
          ) as daily_metrics,
          (
            SELECT jsonb_agg(jsonb_build_object(
              'id', ps.id,
              'type', ps.suggestion_type,
              'suggested', ps.suggested_text,
              'reasoning', ps.reasoning,
              'confidence', ps.confidence,
              'status', ps.status
            ))
            FROM prompt_suggestions ps
            WHERE ps.template_id = pt.id
            ORDER BY ps.created_at DESC
            LIMIT 10
          ) as recent_suggestions
        FROM prompt_templates pt
        WHERE pt.id = $1
      `,
        [promptId]
      );

      if (promptQuery.rows.length === 0) {
        reply.code(404).send({ error: 'Prompt template not found' });
        return;
      }

      const prompt = promptQuery.rows[0];

      reply.code(200).send({
        template: {
          id: prompt.id,
          name: prompt.name,
          category: prompt.category,
          agentType: prompt.agent_type,
          template: prompt.template,
          variables: prompt.variables,
          version: prompt.version,
          isDefault: prompt.is_default,
          createdAt: prompt.created_at,
          updatedAt: prompt.updated_at,
        },
        performance: {
          totalUses: prompt.total_uses,
          successRate: prompt.success_rate,
          avgRating: prompt.avg_rating,
          avgLatencyMs: prompt.avg_latency_ms,
        },
        dailyMetrics: prompt.daily_metrics || [],
        suggestions: prompt.recent_suggestions || [],
      });
    } catch (error) {
      fastify.log.error(error, 'Failed to fetch prompt details');
      reply.code(500).send({ error: 'Failed to fetch prompt details' });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // A/B Experiments
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * GET /prompt-debugging/experiments
   *
   * Returns all A/B experiments with their current status.
   */
  fastify.get('/prompt-debugging/experiments', async (request, reply) => {
    const query = paginationSchema.parse(request.query);
    const { page, limit } = query;
    const offset = (page - 1) * limit;

    try {
      const experimentsQuery = await pool.query(
        `
        SELECT
          pe.id,
          pe.name,
          pe.description,
          pe.status,
          pe.variants,
          pe.winner_variant_id,
          pe.statistical_significance,
          pe.started_at,
          pe.ended_at,
          pe.created_at,
          EXTRACT(DAY FROM (COALESCE(pe.ended_at, NOW()) - pe.started_at)) as days_running
        FROM prompt_experiments pe
        ORDER BY
          CASE pe.status
            WHEN 'running' THEN 1
            WHEN 'paused' THEN 2
            WHEN 'completed' THEN 3
            ELSE 4
          END,
          pe.created_at DESC
        LIMIT $1 OFFSET $2
      `,
        [limit, offset]
      );

      // Get variant statistics for each experiment
      const experiments: ExperimentSummary[] = await Promise.all(
        experimentsQuery.rows.map(async (exp) => {
          const variants = exp.variants || [];

          // Get stats for each variant
          const variantStats = await Promise.all(
            variants.map(async (variant: { id: string; name: string; isControl: boolean }) => {
              const statsQuery = await pool.query(
                `
              SELECT
                COUNT(*) as sample_size,
                AVG(CASE WHEN was_accepted THEN 1.0 ELSE 0.0 END) as success_rate,
                AVG(user_rating) as avg_rating
              FROM tracked_ai_actions
              WHERE experiment_variant_id = $1
            `,
                [variant.id]
              );

              const stats = statsQuery.rows[0] || {};
              return {
                id: variant.id,
                name: variant.name,
                isControl: variant.isControl || false,
                sampleSize: Number.parseInt(stats.sample_size) || 0,
                successRate: parseFloat(stats.success_rate) || 0,
                avgRating: stats.avg_rating ? parseFloat(stats.avg_rating) : null,
              };
            })
          );

          return {
            id: exp.id,
            name: exp.name,
            status: exp.status,
            variants: variantStats,
            winner: exp.winner_variant_id,
            statisticalSignificance: exp.statistical_significance
              ? parseFloat(exp.statistical_significance)
              : null,
            startedAt: exp.started_at,
            daysRunning: Number.parseInt(exp.days_running) || 0,
          };
        })
      );

      const countQuery = await pool.query(`SELECT COUNT(*) FROM prompt_experiments`);

      reply.code(200).send({
        data: experiments,
        pagination: {
          page,
          limit,
          total: Number.parseInt(countQuery.rows[0].count),
          totalPages: Math.ceil(Number.parseInt(countQuery.rows[0].count) / limit),
        },
      });
    } catch (error) {
      fastify.log.error(error, 'Failed to fetch experiments');
      reply.code(500).send({ error: 'Failed to fetch experiments' });
    }
  });

  /**
   * GET /prompt-debugging/experiments/:experimentId/analysis
   *
   * Returns detailed statistical analysis for an experiment.
   */
  fastify.get('/prompt-debugging/experiments/:experimentId/analysis', async (request, reply) => {
    const { experimentId } = experimentIdSchema.parse(request.params);

    try {
      const expQuery = await pool.query(
        `SELECT * FROM prompt_experiments WHERE id = $1`,
        [experimentId]
      );

      if (expQuery.rows.length === 0) {
        reply.code(404).send({ error: 'Experiment not found' });
        return;
      }

      const experiment = expQuery.rows[0];
      const variants = experiment.variants || [];

      // Calculate detailed stats for each variant
      const variantData = await Promise.all(
        variants.map(async (variant: { id: string; name: string; isControl: boolean; promptTemplateId: string }) => {
          const statsQuery = await pool.query(
            `
            SELECT
              COUNT(*) as n,
              AVG(CASE WHEN was_accepted THEN 1.0 ELSE 0.0 END) as mean,
              VARIANCE(CASE WHEN was_accepted THEN 1.0 ELSE 0.0 END) as variance,
              AVG(user_rating) as avg_rating
            FROM tracked_ai_actions
            WHERE experiment_variant_id = $1
          `,
            [variant.id]
          );

          const stats = statsQuery.rows[0] || {};
          return {
            ...variant,
            n: Number.parseInt(stats.n) || 0,
            mean: parseFloat(stats.mean) || 0,
            variance: parseFloat(stats.variance) || 0,
            avgRating: stats.avg_rating ? parseFloat(stats.avg_rating) : null,
          };
        })
      );

      // Find control and best performer
      const control = variantData.find((v) => v.isControl) || variantData[0];
      const bestPerformer = variantData.reduce((best, current) =>
        current.mean > best.mean ? current : best
      );

      // Calculate statistical significance (two-proportion z-test)
      let pValue: number | null = null;
      let isSignificant = false;

      if (control && bestPerformer && control.id !== bestPerformer.id) {
        const n1 = control.n;
        const n2 = bestPerformer.n;
        const p1 = control.mean;
        const p2 = bestPerformer.mean;

        if (n1 >= 30 && n2 >= 30) {
          const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);
          const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));

          if (se > 0) {
            const z = Math.abs(p2 - p1) / se;
            // Approximate p-value from z-score
            pValue = 2 * (1 - normalCDF(z));
            isSignificant = pValue < (1 - experiment.confidence_level);
          }
        }
      }

      const improvementOverBaseline = control
        ? ((bestPerformer.mean - control.mean) / Math.max(control.mean, 0.001)) * 100
        : 0;

      // Determine recommendation
      let recommendedAction: 'promote' | 'continue' | 'stop' = 'continue';
      if (isSignificant && improvementOverBaseline > 5) {
        recommendedAction = 'promote';
      } else if (
        variantData.every((v) => v.n >= experiment.min_sample_size) &&
        !isSignificant
      ) {
        recommendedAction = 'stop';
      }

      const response: PromptComparisonData = {
        baseline: {
          templateId: control?.promptTemplateId || '',
          templateName: control?.name || 'Control',
          category: experiment.target_category || '',
          agentType: experiment.target_agent_type,
          version: 1,
          totalUses: control?.n || 0,
          successRate: control?.mean || 0,
          avgRating: control?.avgRating || null,
          avgLatencyMs: null,
          trend: 'stable',
          lastUsed: null,
        },
        variants: variantData
          .filter((v) => !v.isControl)
          .map((v) => ({
            templateId: v.promptTemplateId || '',
            templateName: v.name,
            category: experiment.target_category || '',
            agentType: experiment.target_agent_type,
            version: 1,
            totalUses: v.n,
            successRate: v.mean,
            avgRating: v.avgRating,
            avgLatencyMs: null,
            trend: 'stable' as const,
            lastUsed: null,
          })),
        statisticalAnalysis: {
          bestPerformer: bestPerformer.name,
          improvementOverBaseline,
          isSignificant,
          pValue,
          recommendedAction,
        },
      };

      reply.code(200).send(response);
    } catch (error) {
      fastify.log.error(error, 'Failed to analyze experiment');
      reply.code(500).send({ error: 'Failed to analyze experiment' });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Learning Patterns & Signals
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * GET /prompt-debugging/patterns
   *
   * Returns detected learning patterns.
   */
  fastify.get('/prompt-debugging/patterns', async (request, reply) => {
    const query = paginationSchema.parse(request.query);
    const { page, limit } = query;
    const offset = (page - 1) * limit;

    try {
      const patternsQuery = await pool.query(
        `
        SELECT
          id,
          pattern_type,
          agent_type,
          action_type,
          description,
          confidence,
          support_count,
          recommendations,
          first_detected_at,
          validated
        FROM learning_patterns
        WHERE is_active = true
        ORDER BY confidence DESC, support_count DESC
        LIMIT $1 OFFSET $2
      `,
        [limit, offset]
      );

      const patterns: LearningPatternSummary[] = patternsQuery.rows.map((row) => ({
        id: row.id,
        patternType: row.pattern_type,
        agentType: row.agent_type,
        actionType: row.action_type,
        description: row.description,
        confidence: parseFloat(row.confidence),
        supportCount: row.support_count,
        recommendations: row.recommendations || [],
        detectedAt: row.first_detected_at,
        isValidated: row.validated,
      }));

      const countQuery = await pool.query(
        `SELECT COUNT(*) FROM learning_patterns WHERE is_active = true`
      );

      reply.code(200).send({
        data: patterns,
        pagination: {
          page,
          limit,
          total: Number.parseInt(countQuery.rows[0].count),
          totalPages: Math.ceil(Number.parseInt(countQuery.rows[0].count) / limit),
        },
      });
    } catch (error) {
      fastify.log.error(error, 'Failed to fetch patterns');
      reply.code(500).send({ error: 'Failed to fetch patterns' });
    }
  });

  /**
   * GET /prompt-debugging/signals/trends
   *
   * Returns learning signal trends over time.
   */
  fastify.get('/prompt-debugging/signals/trends', async (request, reply) => {
    const query = dateRangeSchema.parse(request.query);
    const fromDate = query.from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = query.to || new Date().toISOString().split('T')[0];

    try {
      const trendsQuery = await pool.query(
        `
        SELECT
          time_bucket,
          signal_type,
          agent_type,
          mean_value,
          signal_count,
          mean_value - LAG(mean_value) OVER (
            PARTITION BY agent_type, signal_type
            ORDER BY time_bucket
          ) as trend
        FROM learning_aggregates
        WHERE time_bucket >= $1::date
          AND time_bucket <= $2::date
        ORDER BY time_bucket DESC, agent_type, signal_type
        LIMIT 500
      `,
        [fromDate, toDate]
      );

      const trends: SignalTrend[] = trendsQuery.rows.map((row) => ({
        timeBucket: row.time_bucket,
        signalType: row.signal_type,
        agentType: row.agent_type,
        meanValue: parseFloat(row.mean_value) || 0,
        signalCount: row.signal_count,
        trend: row.trend ? parseFloat(row.trend) : null,
      }));

      reply.code(200).send({ data: trends });
    } catch (error) {
      fastify.log.error(error, 'Failed to fetch signal trends');
      reply.code(500).send({ error: 'Failed to fetch signal trends' });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Action Debugging
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * GET /prompt-debugging/actions
   *
   * Returns recent AI actions for debugging.
   */
  fastify.get('/prompt-debugging/actions', async (request, reply) => {
    const paginationQuery = paginationSchema.parse(request.query);
    const filterSchema = z.object({
      agentType: z.string().optional(),
      wasAccepted: z.enum(['true', 'false']).optional(),
      minRating: z.coerce.number().min(1).max(5).optional(),
    });
    const filters = filterSchema.parse(request.query);

    const { page, limit } = paginationQuery;
    const offset = (page - 1) * limit;

    try {
      let whereClause = 'WHERE 1=1';
      const params: (string | number | boolean)[] = [];
      let paramIndex = 1;

      if (filters.agentType) {
        whereClause += ` AND a.agent_type = $${paramIndex++}`;
        params.push(filters.agentType);
      }
      if (filters.wasAccepted !== undefined) {
        whereClause += ` AND a.was_accepted = $${paramIndex++}`;
        params.push(filters.wasAccepted === 'true');
      }
      if (filters.minRating) {
        whereClause += ` AND a.user_rating >= $${paramIndex++}`;
        params.push(filters.minRating);
      }

      params.push(limit, offset);

      const actionsQuery = await pool.query(
        `
        SELECT
          a.id,
          a.learner_id,
          a.agent_type,
          a.action_type,
          a.action_category,
          a.input_context,
          a.recommendation,
          a.confidence,
          a.reasoning,
          a.was_executed,
          a.was_accepted,
          a.user_rating,
          a.user_modification,
          a.feedback_text,
          a.prompt_template_id,
          pt.name as prompt_template_name,
          a.experiment_variant_id,
          pe.name as experiment_name,
          a.created_at,
          a.feedback_at
        FROM tracked_ai_actions a
        LEFT JOIN prompt_templates pt ON a.prompt_template_id = pt.id
        LEFT JOIN prompt_experiments pe ON a.experiment_variant_id::text = ANY(
          SELECT v->>'id' FROM prompt_experiments, jsonb_array_elements(variants) v
          WHERE prompt_experiments.id = pe.id
        )
        ${whereClause}
        ORDER BY a.created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `,
        params
      );

      const actions: ActionDebugInfo[] = actionsQuery.rows.map((row) => ({
        id: row.id,
        learnerId: row.learner_id,
        agentType: row.agent_type,
        actionType: row.action_type,
        category: row.action_category,
        inputContext: row.input_context,
        recommendation: row.recommendation,
        confidence: parseFloat(row.confidence),
        reasoning: row.reasoning,
        wasExecuted: row.was_executed,
        wasAccepted: row.was_accepted,
        userRating: row.user_rating,
        userModification: row.user_modification,
        feedbackText: row.feedback_text,
        promptTemplateId: row.prompt_template_id,
        promptTemplateName: row.prompt_template_name,
        experimentVariantId: row.experiment_variant_id,
        experimentName: row.experiment_name,
        createdAt: row.created_at,
        feedbackAt: row.feedback_at,
      }));

      // Get total count with same filters
      const countQuery = await pool.query(
        `SELECT COUNT(*) FROM tracked_ai_actions a ${whereClause}`,
        params.slice(0, -2)
      );

      reply.code(200).send({
        data: actions,
        pagination: {
          page,
          limit,
          total: Number.parseInt(countQuery.rows[0].count),
          totalPages: Math.ceil(Number.parseInt(countQuery.rows[0].count) / limit),
        },
      });
    } catch (error) {
      fastify.log.error(error, 'Failed to fetch actions');
      reply.code(500).send({ error: 'Failed to fetch actions' });
    }
  });

  /**
   * GET /prompt-debugging/actions/:actionId
   *
   * Returns full details for a specific action.
   */
  fastify.get('/prompt-debugging/actions/:actionId', async (request, reply) => {
    const { actionId } = z.object({ actionId: z.string().uuid() }).parse(request.params);

    try {
      const actionQuery = await pool.query(
        `
        SELECT
          a.*,
          pt.name as prompt_template_name,
          pt.template as prompt_template_text,
          pe.name as experiment_name
        FROM tracked_ai_actions a
        LEFT JOIN prompt_templates pt ON a.prompt_template_id = pt.id
        LEFT JOIN prompt_experiments pe ON pe.id = (
          SELECT pe2.id FROM prompt_experiments pe2
          WHERE a.experiment_variant_id::text = ANY(
            SELECT v->>'id' FROM jsonb_array_elements(pe2.variants) v
          )
          LIMIT 1
        )
        WHERE a.id = $1
      `,
        [actionId]
      );

      if (actionQuery.rows.length === 0) {
        reply.code(404).send({ error: 'Action not found' });
        return;
      }

      const action = actionQuery.rows[0];

      // Get related learning signals
      const signalsQuery = await pool.query(
        `
        SELECT *
        FROM learning_signals
        WHERE source_id = $1
        ORDER BY created_at DESC
        LIMIT 10
      `,
        [actionId]
      );

      reply.code(200).send({
        action: {
          id: action.id,
          learnerId: action.learner_id,
          agentType: action.agent_type,
          actionType: action.action_type,
          category: action.action_category,
          inputContext: action.input_context,
          recommendation: action.recommendation,
          confidence: parseFloat(action.confidence),
          reasoning: action.reasoning,
          wasExecuted: action.was_executed,
          executionResult: action.execution_result,
          executionError: action.execution_error,
          wasAccepted: action.was_accepted,
          userRating: action.user_rating,
          userModification: action.user_modification,
          feedbackText: action.feedback_text,
          outcomeMeasured: action.outcome_measured,
          measuredImpact: action.measured_impact,
          sessionId: action.session_id,
          createdAt: action.created_at,
          feedbackAt: action.feedback_at,
          outcomeAt: action.outcome_at,
        },
        prompt: action.prompt_template_id
          ? {
              id: action.prompt_template_id,
              name: action.prompt_template_name,
              template: action.prompt_template_text,
            }
          : null,
        experiment: action.experiment_variant_id
          ? {
              variantId: action.experiment_variant_id,
              experimentName: action.experiment_name,
            }
          : null,
        signals: signalsQuery.rows.map((s) => ({
          id: s.id,
          type: s.signal_type,
          value: parseFloat(s.signal_value),
          confidence: parseFloat(s.confidence),
          createdAt: s.created_at,
        })),
      });
    } catch (error) {
      fastify.log.error(error, 'Failed to fetch action details');
      reply.code(500).send({ error: 'Failed to fetch action details' });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Training Data
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * GET /prompt-debugging/training-examples
   *
   * Returns training examples ready for export.
   */
  fastify.get('/prompt-debugging/training-examples', async (request, reply) => {
    const query = paginationSchema.parse(request.query);
    const filterSchema = z.object({
      status: z.enum(['pending', 'approved', 'rejected', 'exported']).optional(),
      minQuality: z.coerce.number().min(0).max(1).optional(),
    });
    const filters = filterSchema.parse(request.query);

    const { page, limit } = query;
    const offset = (page - 1) * limit;

    try {
      let whereClause = 'WHERE 1=1';
      const params: (string | number)[] = [];
      let paramIndex = 1;

      if (filters.status) {
        whereClause += ` AND status = $${paramIndex++}`;
        params.push(filters.status);
      }
      if (filters.minQuality !== undefined) {
        whereClause += ` AND quality_score >= $${paramIndex++}`;
        params.push(filters.minQuality);
      }

      params.push(limit, offset);

      const examplesQuery = await pool.query(
        `
        SELECT
          id,
          example_type,
          agent_type,
          task_category,
          input_text,
          output_text,
          system_prompt,
          quality_score,
          human_validated,
          status,
          created_at
        FROM training_examples
        ${whereClause}
        ORDER BY quality_score DESC, created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `,
        params
      );

      const countQuery = await pool.query(
        `SELECT COUNT(*) FROM training_examples ${whereClause}`,
        params.slice(0, -2)
      );

      reply.code(200).send({
        data: examplesQuery.rows.map((row) => ({
          id: row.id,
          exampleType: row.example_type,
          agentType: row.agent_type,
          taskCategory: row.task_category,
          inputPreview: row.input_text.substring(0, 200) + (row.input_text.length > 200 ? '...' : ''),
          outputPreview: row.output_text.substring(0, 200) + (row.output_text.length > 200 ? '...' : ''),
          hasSystemPrompt: !!row.system_prompt,
          qualityScore: parseFloat(row.quality_score),
          humanValidated: row.human_validated,
          status: row.status,
          createdAt: row.created_at,
        })),
        pagination: {
          page,
          limit,
          total: Number.parseInt(countQuery.rows[0].count),
          totalPages: Math.ceil(Number.parseInt(countQuery.rows[0].count) / limit),
        },
      });
    } catch (error) {
      fastify.log.error(error, 'Failed to fetch training examples');
      reply.code(500).send({ error: 'Failed to fetch training examples' });
    }
  });
};

// ════════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Standard normal cumulative distribution function
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}
