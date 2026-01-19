/**
 * Self-Learning: Outcome Tracker
 *
 * Tracks the effectiveness of AI decisions and recommendations by:
 * - Recording outcomes for each decision/recommendation
 * - Correlating learner progress with AI actions
 * - Computing effectiveness metrics over time
 * - Identifying patterns in successful/unsuccessful interventions
 *
 * @module ai-orchestrator/self-learning/outcome-tracker
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { Redis } from 'ioredis';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Types of AI actions that can be tracked
 */
export type TrackedActionType =
  | 'RECOMMENDATION'        // Content/activity recommendation
  | 'DIFFICULTY_ADJUSTMENT' // Difficulty level change
  | 'INTERVENTION'          // Proactive intervention
  | 'SCAFFOLD'              // Scaffolding/hint provided
  | 'FEEDBACK'              // Feedback given to learner
  | 'GOAL_SUGGESTION'       // Goal/milestone suggestion
  | 'BREAK_SUGGESTION'      // Focus break suggestion
  | 'CONTENT_SELECTION';    // Lesson/content selection

/**
 * Outcome status for a tracked action
 */
export type OutcomeStatus =
  | 'PENDING'     // Awaiting outcome
  | 'ACCEPTED'    // User accepted the recommendation
  | 'REJECTED'    // User rejected the recommendation
  | 'COMPLETED'   // Action completed successfully
  | 'ABANDONED'   // User abandoned mid-action
  | 'IMPROVED'    // Measurable improvement observed
  | 'NO_CHANGE'   // No measurable change
  | 'REGRESSED';  // Performance decreased

/**
 * A tracked AI action with its outcome
 */
export interface TrackedAction {
  id: string;
  tenantId: string;
  learnerId: string;
  sessionId: string;
  agentType: string;
  actionType: TrackedActionType;
  actionDetails: {
    description: string;
    parameters: Record<string, unknown>;
    confidence: number;
    rationale?: string;
  };
  context: {
    subject?: string;
    topic?: string;
    skillLevel?: number;
    emotionalState?: string;
    focusLevel?: number;
    priorPerformance?: number;
  };
  outcome: {
    status: OutcomeStatus;
    acceptedAt?: Date;
    completedAt?: Date;
    timeToDecisionMs?: number;
    timeToCompletionMs?: number;
    userFeedback?: {
      rating?: number; // 1-5
      comment?: string;
      helpful?: boolean;
    };
    measuredImpact?: {
      performanceDelta?: number;    // -1 to 1
      engagementDelta?: number;     // -1 to 1
      masteryDelta?: number;        // -1 to 1
      frustrationDelta?: number;    // -1 to 1
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Effectiveness metrics for an action type
 */
export interface ActionEffectiveness {
  actionType: TrackedActionType;
  agentType: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalActions: number;
    acceptanceRate: number;
    completionRate: number;
    avgTimeToDecision: number;
    avgTimeToCompletion: number;
    avgUserRating: number;
    positiveImpactRate: number;
    avgPerformanceDelta: number;
    avgEngagementDelta: number;
  };
  breakdown: {
    bySubject?: Record<string, { acceptanceRate: number; impactRate: number }>;
    bySkillLevel?: Record<string, { acceptanceRate: number; impactRate: number }>;
    byEmotionalState?: Record<string, { acceptanceRate: number; impactRate: number }>;
  };
}

/**
 * Configuration for outcome tracking
 */
export interface OutcomeTrackerConfig {
  /** How long to wait for outcome before marking as ABANDONED (ms) */
  abandonmentTimeoutMs: number;

  /** Minimum actions needed for reliable metrics */
  minActionsForMetrics: number;

  /** How often to compute aggregate metrics (ms) */
  aggregationIntervalMs: number;

  /** Cache TTL for effectiveness metrics (seconds) */
  metricsCacheTtl: number;
}

export const DEFAULT_TRACKER_CONFIG: OutcomeTrackerConfig = {
  abandonmentTimeoutMs: 30 * 60 * 1000, // 30 minutes
  minActionsForMetrics: 50,
  aggregationIntervalMs: 60 * 60 * 1000, // 1 hour
  metricsCacheTtl: 300, // 5 minutes
};

// ════════════════════════════════════════════════════════════════════════════════
// OUTCOME TRACKER
// ════════════════════════════════════════════════════════════════════════════════

export class OutcomeTracker extends EventEmitter {
  private readonly pool: Pool;
  private readonly redis: Redis;
  private readonly config: OutcomeTrackerConfig;
  private readonly cachePrefix = 'outcome_tracker';

  constructor(
    pool: Pool,
    redis: Redis,
    config: Partial<OutcomeTrackerConfig> = {}
  ) {
    super();
    this.pool = pool;
    this.redis = redis;
    this.config = { ...DEFAULT_TRACKER_CONFIG, ...config };
  }

  /**
   * Track a new AI action
   */
  async trackAction(input: {
    tenantId: string;
    learnerId: string;
    sessionId: string;
    agentType: string;
    actionType: TrackedActionType;
    actionDetails: TrackedAction['actionDetails'];
    context: TrackedAction['context'];
  }): Promise<TrackedAction> {
    const id = randomUUID();
    const now = new Date();

    const action: TrackedAction = {
      id,
      tenantId: input.tenantId,
      learnerId: input.learnerId,
      sessionId: input.sessionId,
      agentType: input.agentType,
      actionType: input.actionType,
      actionDetails: input.actionDetails,
      context: input.context,
      outcome: {
        status: 'PENDING',
      },
      createdAt: now,
      updatedAt: now,
    };

    await this.pool.query(
      `INSERT INTO tracked_ai_actions (
        id, tenant_id, learner_id, session_id, agent_type, action_type,
        action_details, context, outcome, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        action.id,
        action.tenantId,
        action.learnerId,
        action.sessionId,
        action.agentType,
        action.actionType,
        JSON.stringify(action.actionDetails),
        JSON.stringify(action.context),
        JSON.stringify(action.outcome),
        action.createdAt,
        action.updatedAt,
      ]
    );

    this.emit('action:tracked', action);
    return action;
  }

  /**
   * Record that an action was accepted by the user
   */
  async recordAcceptance(actionId: string): Promise<void> {
    const now = new Date();

    const { rows } = await this.pool.query(
      `UPDATE tracked_ai_actions
       SET outcome = jsonb_set(
         jsonb_set(
           jsonb_set(outcome, '{status}', '"ACCEPTED"'),
           '{acceptedAt}', to_jsonb($2::text)
         ),
         '{timeToDecisionMs}', to_jsonb(EXTRACT(EPOCH FROM ($2 - created_at)) * 1000)
       ),
       updated_at = $2
       WHERE id = $1
       RETURNING *`,
      [actionId, now]
    );

    if (rows.length > 0) {
      this.emit('action:accepted', this.rowToAction(rows[0]));
    }
  }

  /**
   * Record that an action was rejected by the user
   */
  async recordRejection(actionId: string, reason?: string): Promise<void> {
    const now = new Date();

    const { rows } = await this.pool.query(
      `UPDATE tracked_ai_actions
       SET outcome = jsonb_set(
         jsonb_set(
           jsonb_set(outcome, '{status}', '"REJECTED"'),
           '{timeToDecisionMs}', to_jsonb(EXTRACT(EPOCH FROM ($2 - created_at)) * 1000)
         ),
         '{userFeedback}', COALESCE(outcome->'userFeedback', '{}') || $3::jsonb
       ),
       updated_at = $2
       WHERE id = $1
       RETURNING *`,
      [actionId, now, JSON.stringify({ rejectionReason: reason })]
    );

    if (rows.length > 0) {
      this.emit('action:rejected', this.rowToAction(rows[0]));
    }
  }

  /**
   * Record completion of an action
   */
  async recordCompletion(
    actionId: string,
    measuredImpact?: TrackedAction['outcome']['measuredImpact']
  ): Promise<void> {
    const now = new Date();

    const outcomeUpdate: Record<string, unknown> = {
      status: 'COMPLETED',
      completedAt: now.toISOString(),
    };

    if (measuredImpact) {
      outcomeUpdate.measuredImpact = measuredImpact;

      // Determine if the impact was positive
      const avgDelta = this.calculateAverageImpact(measuredImpact);
      if (avgDelta > 0.1) {
        outcomeUpdate.status = 'IMPROVED';
      } else if (avgDelta < -0.1) {
        outcomeUpdate.status = 'REGRESSED';
      } else {
        outcomeUpdate.status = 'NO_CHANGE';
      }
    }

    const { rows } = await this.pool.query(
      `UPDATE tracked_ai_actions
       SET outcome = outcome || $2::jsonb,
           updated_at = $3
       WHERE id = $1
       RETURNING *`,
      [actionId, JSON.stringify(outcomeUpdate), now]
    );

    if (rows.length > 0) {
      const action = this.rowToAction(rows[0]);
      this.emit('action:completed', action);

      // Emit learning signal for positive/negative outcomes
      if (outcomeUpdate.status === 'IMPROVED') {
        this.emit('learning:positive_signal', action);
      } else if (outcomeUpdate.status === 'REGRESSED') {
        this.emit('learning:negative_signal', action);
      }
    }
  }

  /**
   * Record user feedback for an action
   */
  async recordFeedback(
    actionId: string,
    feedback: {
      rating?: number;
      comment?: string;
      helpful?: boolean;
    }
  ): Promise<void> {
    const now = new Date();

    await this.pool.query(
      `UPDATE tracked_ai_actions
       SET outcome = jsonb_set(
         outcome,
         '{userFeedback}',
         COALESCE(outcome->'userFeedback', '{}') || $2::jsonb
       ),
       updated_at = $3
       WHERE id = $1`,
      [actionId, JSON.stringify(feedback), now]
    );

    this.emit('action:feedback_received', { actionId, feedback });
  }

  /**
   * Get effectiveness metrics for an action type
   */
  async getEffectiveness(
    tenantId: string,
    actionType: TrackedActionType,
    agentType: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      learnerId?: string;
    } = {}
  ): Promise<ActionEffectiveness | null> {
    const cacheKey = `${this.cachePrefix}:effectiveness:${tenantId}:${actionType}:${agentType}`;
    const cached = await this.redis.get(cacheKey);

    if (cached && !options.learnerId) {
      return JSON.parse(cached);
    }

    const startDate = options.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = options.endDate ?? new Date();

    const conditions = [
      'tenant_id = $1',
      'action_type = $2',
      'agent_type = $3',
      'created_at >= $4',
      'created_at <= $5',
    ];
    const params: unknown[] = [tenantId, actionType, agentType, startDate, endDate];

    if (options.learnerId) {
      conditions.push('learner_id = $6');
      params.push(options.learnerId);
    }

    const { rows } = await this.pool.query(
      `SELECT
        COUNT(*) as total_actions,
        AVG(CASE WHEN outcome->>'status' IN ('ACCEPTED', 'COMPLETED', 'IMPROVED') THEN 1 ELSE 0 END) as acceptance_rate,
        AVG(CASE WHEN outcome->>'status' IN ('COMPLETED', 'IMPROVED', 'NO_CHANGE') THEN 1 ELSE 0 END) as completion_rate,
        AVG((outcome->>'timeToDecisionMs')::numeric) as avg_time_to_decision,
        AVG((outcome->>'timeToCompletionMs')::numeric) as avg_time_to_completion,
        AVG((outcome->'userFeedback'->>'rating')::numeric) as avg_user_rating,
        AVG(CASE WHEN outcome->>'status' = 'IMPROVED' THEN 1 ELSE 0 END) as positive_impact_rate,
        AVG((outcome->'measuredImpact'->>'performanceDelta')::numeric) as avg_performance_delta,
        AVG((outcome->'measuredImpact'->>'engagementDelta')::numeric) as avg_engagement_delta
      FROM tracked_ai_actions
      WHERE ${conditions.join(' AND ')}`,
      params
    );

    if (rows.length === 0 || Number.parseInt(rows[0].total_actions) < this.config.minActionsForMetrics) {
      return null;
    }

    const row = rows[0];
    const effectiveness: ActionEffectiveness = {
      actionType,
      agentType,
      period: { start: startDate, end: endDate },
      metrics: {
        totalActions: Number.parseInt(row.total_actions) || 0,
        acceptanceRate: parseFloat(row.acceptance_rate) || 0,
        completionRate: parseFloat(row.completion_rate) || 0,
        avgTimeToDecision: parseFloat(row.avg_time_to_decision) || 0,
        avgTimeToCompletion: parseFloat(row.avg_time_to_completion) || 0,
        avgUserRating: parseFloat(row.avg_user_rating) || 0,
        positiveImpactRate: parseFloat(row.positive_impact_rate) || 0,
        avgPerformanceDelta: parseFloat(row.avg_performance_delta) || 0,
        avgEngagementDelta: parseFloat(row.avg_engagement_delta) || 0,
      },
      breakdown: {},
    };

    // Get breakdown by subject
    effectiveness.breakdown = await this.getEffectivenessBreakdown(
      tenantId,
      actionType,
      agentType,
      startDate,
      endDate
    );

    // Cache the result (only for tenant-wide queries)
    if (!options.learnerId) {
      await this.redis.setex(
        cacheKey,
        this.config.metricsCacheTtl,
        JSON.stringify(effectiveness)
      );
    }

    return effectiveness;
  }

  /**
   * Get recent actions for a learner
   */
  async getRecentActions(
    tenantId: string,
    learnerId: string,
    options: {
      limit?: number;
      actionTypes?: TrackedActionType[];
      status?: OutcomeStatus[];
    } = {}
  ): Promise<TrackedAction[]> {
    const conditions = ['tenant_id = $1', 'learner_id = $2'];
    const params: unknown[] = [tenantId, learnerId];
    let paramIndex = 3;

    if (options.actionTypes && options.actionTypes.length > 0) {
      conditions.push(`action_type = ANY($${paramIndex})`);
      params.push(options.actionTypes);
      paramIndex++;
    }

    if (options.status && options.status.length > 0) {
      conditions.push(`outcome->>'status' = ANY($${paramIndex})`);
      params.push(options.status);
      paramIndex++;
    }

    const { rows } = await this.pool.query(
      `SELECT * FROM tracked_ai_actions
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${paramIndex}`,
      [...params, options.limit ?? 50]
    );

    return rows.map(row => this.rowToAction(row));
  }

  /**
   * Mark abandoned actions (cleanup job)
   */
  async markAbandonedActions(): Promise<number> {
    const cutoffTime = new Date(Date.now() - this.config.abandonmentTimeoutMs);

    const { rowCount } = await this.pool.query(
      `UPDATE tracked_ai_actions
       SET outcome = jsonb_set(outcome, '{status}', '"ABANDONED"'),
           updated_at = NOW()
       WHERE outcome->>'status' = 'PENDING'
         AND created_at < $1`,
      [cutoffTime]
    );

    if (rowCount && rowCount > 0) {
      this.emit('actions:abandoned_marked', { count: rowCount });
    }

    return rowCount ?? 0;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ──────────────────────────────────────────────────────────────────────────────

  private calculateAverageImpact(
    impact: TrackedAction['outcome']['measuredImpact']
  ): number {
    if (!impact) return 0;

    const values = [
      impact.performanceDelta,
      impact.engagementDelta,
      impact.masteryDelta,
      impact.frustrationDelta ? -impact.frustrationDelta : undefined, // Negative is good for frustration
    ].filter((v): v is number => v !== undefined);

    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private async getEffectivenessBreakdown(
    tenantId: string,
    actionType: TrackedActionType,
    agentType: string,
    startDate: Date,
    endDate: Date
  ): Promise<ActionEffectiveness['breakdown']> {
    const breakdown: ActionEffectiveness['breakdown'] = {};

    // By subject
    const { rows: subjectRows } = await this.pool.query(
      `SELECT
        context->>'subject' as subject,
        AVG(CASE WHEN outcome->>'status' IN ('ACCEPTED', 'COMPLETED', 'IMPROVED') THEN 1 ELSE 0 END) as acceptance_rate,
        AVG(CASE WHEN outcome->>'status' = 'IMPROVED' THEN 1 ELSE 0 END) as impact_rate
      FROM tracked_ai_actions
      WHERE tenant_id = $1 AND action_type = $2 AND agent_type = $3
        AND created_at >= $4 AND created_at <= $5
        AND context->>'subject' IS NOT NULL
      GROUP BY context->>'subject'`,
      [tenantId, actionType, agentType, startDate, endDate]
    );

    if (subjectRows.length > 0) {
      breakdown.bySubject = {};
      for (const row of subjectRows) {
        breakdown.bySubject[row.subject] = {
          acceptanceRate: parseFloat(row.acceptance_rate) || 0,
          impactRate: parseFloat(row.impact_rate) || 0,
        };
      }
    }

    return breakdown;
  }

  private rowToAction(row: Record<string, unknown>): TrackedAction {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      learnerId: row.learner_id as string,
      sessionId: row.session_id as string,
      agentType: row.agent_type as string,
      actionType: row.action_type as TrackedActionType,
      actionDetails: typeof row.action_details === 'string'
        ? JSON.parse(row.action_details)
        : row.action_details as TrackedAction['actionDetails'],
      context: typeof row.context === 'string'
        ? JSON.parse(row.context)
        : row.context as TrackedAction['context'],
      outcome: typeof row.outcome === 'string'
        ? JSON.parse(row.outcome)
        : row.outcome as TrackedAction['outcome'],
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════════

export default OutcomeTracker;
