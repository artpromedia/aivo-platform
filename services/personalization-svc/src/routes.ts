/**
 * Personalization Signals API Routes
 *
 * GET /personalization/learners/:learnerId/signals - Get signals for a learner
 * GET /personalization/learners/:learnerId/decision-log - Get decision history
 * POST /personalization/recommendation-feedback - Record recommendation feedback
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/restrict-plus-operands */

// eslint-disable-next-line import/no-unresolved
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
// eslint-disable-next-line import/no-unresolved
import { z } from 'zod';

import { getMainPool } from './db.js';
import type {
  PersonalizationSignal,
  SignalType,
  GetSignalsResponse,
  PersonalizationDecisionLog,
} from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const getSignalsQuerySchema = z.object({
  recentDays: z.coerce.number().int().min(1).max(90).default(7),
  signalTypes: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(',').filter(Boolean) : undefined)),
  minConfidence: z.coerce.number().min(0).max(1).default(0),
  includeExpired: z.coerce.boolean().default(false),
});

const getDecisionLogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  decisionType: z.string().optional(),
  agentName: z.string().optional(),
});

const recordFeedbackBodySchema = z.object({
  recommendationId: z.string().uuid(),
  recommendationType: z.string().min(1).max(64),
  recommendedItemType: z.string().min(1).max(32),
  recommendedItemId: z.string().uuid().optional(),
  wasAccepted: z.boolean(),
  wasExplicitlyRejected: z.boolean().default(false),
  sessionId: z.string().uuid().optional(),
  contextSignals: z.record(z.unknown()).optional(),
  recommendedAt: z.string().datetime(),
  respondedAt: z.string().datetime().optional(),
  responseTimeMs: z.number().int().optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

interface LearnerParams {
  learnerId: string;
}

/**
 * GET /personalization/learners/:learnerId/signals
 *
 * Returns personalization signals for a learner.
 * Used by Virtual Brain and Lesson Planner agents.
 */
async function getSignals(
  request: FastifyRequest<{ Params: LearnerParams; Querystring: z.infer<typeof getSignalsQuerySchema> }>,
  reply: FastifyReply
): Promise<void> {
  const { learnerId } = request.params;
  const tenantId = (request as unknown as { tenantId: string }).tenantId;

  // Parse and validate query params
  const queryResult = getSignalsQuerySchema.safeParse(request.query);
  if (!queryResult.success) {
    reply.code(400).send({
      error: 'Invalid query parameters',
      details: queryResult.error.errors,
    });
    return;
  }

  const { recentDays, signalTypes, minConfidence, includeExpired } = queryResult.data;

  const pool = getMainPool();

  // Build date filter
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - recentDays);

  // Build query
  let query = `
    SELECT 
      id, tenant_id, learner_id, date, signal_type, signal_key,
      signal_value, confidence, source, metadata, expires_at,
      created_at, updated_at
    FROM personalization_signals
    WHERE tenant_id = $1
      AND learner_id = $2
      AND date >= $3
      AND confidence >= $4
  `;

  const params: unknown[] = [tenantId, learnerId, fromDate.toISOString().split('T')[0], minConfidence];

  if (!includeExpired) {
    query += ` AND expires_at > NOW()`;
  }

  if (signalTypes && signalTypes.length > 0) {
    query += ` AND signal_type = ANY($${params.length + 1})`;
    params.push(signalTypes);
  }

  query += ` ORDER BY date DESC, signal_type, confidence DESC`;

  const result = await pool.query(query, params);

  // Transform rows to response format
  const signals: PersonalizationSignal[] = result.rows.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    learnerId: row.learner_id,
    date: row.date.toISOString().split('T')[0]!,
    signalType: row.signal_type as SignalType,
    signalKey: row.signal_key,
    signalValue: row.signal_value,
    confidence: parseFloat(row.confidence),
    source: row.source,
    metadata: row.metadata,
    expiresAt: row.expires_at?.toISOString(),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));

  // Group by type for response
  const signalsByType = signals.reduce(
    (acc, signal) => {
      const type = signal.signalType;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type]!.push(signal);
      return acc;
    },
    {} as Record<SignalType, PersonalizationSignal[]>
  );

  const response: GetSignalsResponse = {
    learnerId,
    fromDate: fromDate.toISOString().split('T')[0]!,
    toDate: new Date().toISOString().split('T')[0]!,
    signals,
    signalsByType,
    count: signals.length,
  };

  reply.send(response);
}

/**
 * GET /personalization/learners/:learnerId/decision-log
 *
 * Returns decision history for transparency/debugging.
 */
async function getDecisionLog(
  request: FastifyRequest<{ Params: LearnerParams; Querystring: z.infer<typeof getDecisionLogQuerySchema> }>,
  reply: FastifyReply
): Promise<void> {
  const { learnerId } = request.params;
  const tenantId = (request as unknown as { tenantId: string }).tenantId;

  const queryResult = getDecisionLogQuerySchema.safeParse(request.query);
  if (!queryResult.success) {
    reply.code(400).send({
      error: 'Invalid query parameters',
      details: queryResult.error.errors,
    });
    return;
  }

  const { limit, offset, decisionType, agentName } = queryResult.data;

  const pool = getMainPool();

  let query = `
    SELECT 
      id, tenant_id, learner_id, session_id, decision_type, agent_name,
      agent_version, input_signal_keys, input_context, output_decision,
      reasoning, outcome, outcome_recorded_at, feedback_rating, feedback_comment,
      created_at
    FROM personalization_decision_logs
    WHERE tenant_id = $1 AND learner_id = $2
  `;

  const params: unknown[] = [tenantId, learnerId];

  if (decisionType) {
    query += ` AND decision_type = $${params.length + 1}`;
    params.push(decisionType);
  }

  if (agentName) {
    query += ` AND agent_name = $${params.length + 1}`;
    params.push(agentName);
  }

  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  // Get total count
  let countQuery = `
    SELECT COUNT(*) as total
    FROM personalization_decision_logs
    WHERE tenant_id = $1 AND learner_id = $2
  `;
  const countParams: unknown[] = [tenantId, learnerId];

  if (decisionType) {
    countQuery += ` AND decision_type = $${countParams.length + 1}`;
    countParams.push(decisionType);
  }

  if (agentName) {
    countQuery += ` AND agent_name = $${countParams.length + 1}`;
    countParams.push(agentName);
  }

  const countResult = await pool.query<{ total: string }>(countQuery, countParams);
  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const decisions: PersonalizationDecisionLog[] = result.rows.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    learnerId: row.learner_id,
    sessionId: row.session_id,
    decisionType: row.decision_type,
    agentName: row.agent_name,
    agentVersion: row.agent_version,
    inputSignalKeys: row.input_signal_keys,
    inputContext: row.input_context,
    outputDecision: row.output_decision,
    reasoning: row.reasoning,
    outcome: row.outcome,
    outcomeRecordedAt: row.outcome_recorded_at?.toISOString(),
    feedbackRating: row.feedback_rating,
    feedbackComment: row.feedback_comment,
    createdAt: row.created_at.toISOString(),
  }));

  reply.send({
    decisions,
    total,
    limit,
    offset,
    hasMore: offset + decisions.length < total,
  });
}

/**
 * POST /personalization/recommendation-feedback
 *
 * Records feedback on a recommendation (accepted/declined).
 * Used for feedback loop optimization.
 */
async function recordRecommendationFeedback(
  request: FastifyRequest<{ Body: z.infer<typeof recordFeedbackBodySchema> }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = (request as unknown as { tenantId: string }).tenantId;
  const learnerId = (request as unknown as { learnerId?: string }).learnerId;

  if (!learnerId) {
    reply.code(400).send({ error: 'Learner ID required' });
    return;
  }

  const bodyResult = recordFeedbackBodySchema.safeParse(request.body);
  if (!bodyResult.success) {
    reply.code(400).send({
      error: 'Invalid request body',
      details: bodyResult.error.errors,
    });
    return;
  }

  const data = bodyResult.data;
  const pool = getMainPool();

  const result = await pool.query<{ id: string }>(
    `
    INSERT INTO recommendation_feedback (
      tenant_id, learner_id, recommendation_id, recommendation_type,
      recommended_item_type, recommended_item_id, was_accepted,
      was_explicitly_rejected, session_id, context_signals,
      recommended_at, responded_at, response_time_ms, created_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
    )
    RETURNING id
    `,
    [
      tenantId,
      learnerId,
      data.recommendationId,
      data.recommendationType,
      data.recommendedItemType,
      data.recommendedItemId,
      data.wasAccepted,
      data.wasExplicitlyRejected,
      data.sessionId,
      data.contextSignals ? JSON.stringify(data.contextSignals) : null,
      data.recommendedAt,
      data.respondedAt,
      data.responseTimeMs,
    ]
  );

  reply.code(201).send({
    id: result.rows[0]!.id,
    recorded: true,
  });
}

/**
 * PATCH /personalization/decisions/:decisionId/outcome
 *
 * Updates the outcome of a decision (accepted/declined/ignored).
 */
async function updateDecisionOutcome(
  request: FastifyRequest<{
    Params: { decisionId: string };
    Body: { outcome: string; feedbackRating?: number; feedbackComment?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const { decisionId } = request.params;
  const tenantId = (request as unknown as { tenantId: string }).tenantId;
  const { outcome, feedbackRating, feedbackComment } = request.body;

  const validOutcomes = ['ACCEPTED', 'DECLINED', 'IGNORED', 'EXPIRED'];
  if (!validOutcomes.includes(outcome)) {
    reply.code(400).send({ error: `Invalid outcome. Must be one of: ${validOutcomes.join(', ')}` });
    return;
  }

  const pool = getMainPool();

  const result = await pool.query(
    `
    UPDATE personalization_decision_logs
    SET outcome = $1,
        outcome_recorded_at = NOW(),
        feedback_rating = COALESCE($2, feedback_rating),
        feedback_comment = COALESCE($3, feedback_comment)
    WHERE id = $4 AND tenant_id = $5
    RETURNING id
    `,
    [outcome, feedbackRating, feedbackComment, decisionId, tenantId]
  );

  if (result.rowCount === 0) {
    reply.code(404).send({ error: 'Decision not found' });
    return;
  }

  reply.send({ updated: true });
}

// ══════════════════════════════════════════════════════════════════════════════
// INTERNAL API (for agents)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /personalization/internal/log-decision
 *
 * Internal endpoint for agents to log their decisions.
 * Called by Virtual Brain, Lesson Planner, etc.
 */
async function logDecision(
  request: FastifyRequest<{
    Body: {
      tenantId: string;
      learnerId: string;
      sessionId?: string;
      decisionType: string;
      agentName: string;
      agentVersion?: string;
      inputSignalKeys: string[];
      inputContext: Record<string, unknown>;
      outputDecision: Record<string, unknown>;
      reasoning: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const data = request.body;
  const pool = getMainPool();

  const result = await pool.query<{ id: string }>(
    `
    INSERT INTO personalization_decision_logs (
      tenant_id, learner_id, session_id, decision_type, agent_name,
      agent_version, input_signal_keys, input_context, output_decision,
      reasoning, outcome, created_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING', NOW()
    )
    RETURNING id
    `,
    [
      data.tenantId,
      data.learnerId,
      data.sessionId,
      data.decisionType,
      data.agentName,
      data.agentVersion,
      data.inputSignalKeys,
      JSON.stringify(data.inputContext),
      JSON.stringify(data.outputDecision),
      data.reasoning,
    ]
  );

  reply.code(201).send({ decisionId: result.rows[0]!.id });
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE REGISTRATION
// ══════════════════════════════════════════════════════════════════════════════

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // Public API (requires auth)
  app.get('/personalization/learners/:learnerId/signals', getSignals);
  app.get('/personalization/learners/:learnerId/decision-log', getDecisionLog);
  app.post('/personalization/recommendation-feedback', recordRecommendationFeedback);
  app.patch('/personalization/decisions/:decisionId/outcome', updateDecisionOutcome);

  // Internal API (service-to-service)
  app.post('/personalization/internal/log-decision', logDecision);
}
