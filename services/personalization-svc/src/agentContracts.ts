/**
 * Agent Contracts
 *
 * Defines how agents (Virtual Brain, Lesson Planner) consume personalization signals
 * and how they report decisions back for the feedback loop.
 *
 * These are the "consumption contracts" - stable interfaces that agents depend on.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-condition */

import { getMainPool } from './db.js';
import type {
  PersonalizationSignal,
  SignalType,
  SignalKey,
  VirtualBrainSignalInput,
  VirtualBrainSignalOutput,
  LessonPlannerSignalInput,
  LessonPlannerSignalOutput,
  RecommendationFeedback,
  ThresholdAdjustment,
} from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// SIGNAL RETRIEVAL FOR AGENTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get active signals for a learner, filtered for relevance.
 */
async function getActiveSignals(
  tenantId: string,
  learnerId: string,
  signalTypes?: SignalType[]
): Promise<PersonalizationSignal[]> {
  const pool = getMainPool();

  let query = `
    SELECT 
      id, tenant_id, learner_id, date, signal_type, signal_key,
      signal_value, confidence, source, metadata, expires_at,
      created_at, updated_at
    FROM personalization_signals
    WHERE tenant_id = $1
      AND learner_id = $2
      AND expires_at > NOW()
      AND confidence >= 0.5
  `;

  const params: unknown[] = [tenantId, learnerId];

  if (signalTypes && signalTypes.length > 0) {
    query += ` AND signal_type = ANY($3)`;
    params.push(signalTypes);
  }

  query += ` ORDER BY confidence DESC, date DESC`;

  const result = await pool.query(query, params);

  return result.rows.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    learnerId: row.learner_id,
    date: row.date.toISOString().split('T')[0]!,
    signalType: row.signal_type,
    signalKey: row.signal_key,
    signalValue: row.signal_value,
    confidence: parseFloat(row.confidence),
    source: row.source,
    metadata: row.metadata,
    expiresAt: row.expires_at?.toISOString(),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));
}

// ══════════════════════════════════════════════════════════════════════════════
// VIRTUAL BRAIN CONTRACT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Prepare signal input for Virtual Brain agent.
 *
 * The Virtual Brain uses signals to:
 * - Adjust state estimations (energy, focus)
 * - Personalize Today's Plan
 * - Select appropriate interventions
 */
export async function prepareVirtualBrainInput(
  tenantId: string,
  learnerId: string,
  currentContext: {
    sessionId?: string;
    currentSubject?: string;
    timeOfDay: 'morning' | 'afternoon' | 'evening';
    dayOfWeek: number;
  }
): Promise<VirtualBrainSignalInput> {
  // Get relevant signal types for Virtual Brain
  const relevantTypes: SignalType[] = ['ENGAGEMENT', 'DIFFICULTY', 'FOCUS', 'PROGRESSION', 'PREFERENCE'];
  const signals = await getActiveSignals(tenantId, learnerId, relevantTypes);

  // Build signal map by key
  const signalMap: Record<SignalKey, PersonalizationSignal> = {};
  for (const signal of signals) {
    // Take highest confidence signal for each key
    if (!signalMap[signal.signalKey] || signal.confidence > signalMap[signal.signalKey]!.confidence) {
      signalMap[signal.signalKey] = signal;
    }
  }

  // Extract specific signals Virtual Brain cares about
  const engagementSignals = signals.filter((s) => s.signalType === 'ENGAGEMENT');
  const difficultySignals = signals.filter((s) => s.signalType === 'DIFFICULTY');
  const focusSignals = signals.filter((s) => s.signalType === 'FOCUS');

  // Build input
  return {
    learnerId,
    timestamp: new Date().toISOString(),
    signals,
    signalSummary: {
      engagementLevel: inferEngagementLevel(engagementSignals),
      difficultyAdjustments: inferDifficultyAdjustments(difficultySignals),
      focusProfile: inferFocusProfile(focusSignals),
      hasLowEngagementRecently: signals.some((s) => s.signalKey === 'LOW_ENGAGEMENT'),
      hasHighStruggle: signals.some((s) => s.signalKey.startsWith('HIGH_STRUGGLE_')),
      needsMoreBreaks: signals.some((s) => s.signalKey === 'NEEDS_MORE_BREAKS'),
    },
    context: currentContext,
  };
}

/**
 * Process Virtual Brain output and log decisions.
 */
export async function processVirtualBrainOutput(
  input: VirtualBrainSignalInput,
  output: VirtualBrainSignalOutput
): Promise<string> {
  const pool = getMainPool();

  // Extract which signals influenced the decision
  const inputSignalKeys = input.signals.map((s) => s.signalKey);

  // Log the decision
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
      input.signals[0]?.tenantId,
      input.learnerId,
      input.context.sessionId,
      mapVirtualBrainDecisionType(output),
      'VIRTUAL_BRAIN',
      output.agentVersion,
      inputSignalKeys,
      JSON.stringify({
        signalSummary: input.signalSummary,
        context: input.context,
        signalCount: input.signals.length,
      }),
      JSON.stringify(output.recommendations),
      output.reasoning,
    ]
  );

  return result.rows[0]!.id;
}

// ══════════════════════════════════════════════════════════════════════════════
// LESSON PLANNER CONTRACT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Prepare signal input for Lesson Planner agent.
 *
 * The Lesson Planner uses signals to:
 * - Select content at appropriate difficulty
 * - Balance subjects based on engagement/struggle
 * - Incorporate learner preferences
 */
export async function prepareLessonPlannerInput(
  tenantId: string,
  learnerId: string,
  planningContext: {
    targetDate: string;
    availableMinutes: number;
    subjectConstraints?: string[];
  }
): Promise<LessonPlannerSignalInput> {
  // Get relevant signal types for Lesson Planner
  const relevantTypes: SignalType[] = ['DIFFICULTY', 'MODULE_UPTAKE', 'PREFERENCE', 'PROGRESSION', 'RECOMMENDATION'];
  const signals = await getActiveSignals(tenantId, learnerId, relevantTypes);

  // Build difficulty adjustments by subject
  const difficultyBySubject: Record<string, 'EASIER' | 'MAINTAIN' | 'HARDER'> = {};
  for (const signal of signals.filter((s) => s.signalType === 'DIFFICULTY')) {
    const value = signal.signalValue as { domain?: string; recommendedAction?: string };
    if (value.domain && value.recommendedAction) {
      difficultyBySubject[value.domain] = value.recommendedAction as 'EASIER' | 'MAINTAIN' | 'HARDER';
    }
  }

  // Identify preferred modules
  const preferredModules: string[] = [];
  const avoidModules: string[] = [];
  for (const signal of signals.filter((s) => s.signalType === 'MODULE_UPTAKE')) {
    const value = signal.signalValue as { moduleId?: string; uptakeRate?: number };
    if (value.moduleId) {
      if ((value.uptakeRate ?? 0) > 0.7) {
        preferredModules.push(value.moduleId);
      } else if ((value.uptakeRate ?? 0) < 0.3) {
        avoidModules.push(value.moduleId);
      }
    }
  }

  // Get recommendation acceptance context
  const recSignals = signals.filter((s) => s.signalType === 'RECOMMENDATION');
  const hasLowAcceptance = recSignals.some((s) => s.signalKey === 'REC_ACCEPTANCE_LOW');

  return {
    learnerId,
    targetDate: planningContext.targetDate,
    signals,
    constraints: {
      availableMinutes: planningContext.availableMinutes,
      subjectConstraints: planningContext.subjectConstraints,
      difficultyBySubject,
      preferredModules,
      avoidModules,
      prioritizeEngaging: hasLowAcceptance, // If they reject recommendations, try engaging content
    },
  };
}

/**
 * Process Lesson Planner output and log decisions.
 */
export async function processLessonPlannerOutput(
  input: LessonPlannerSignalInput,
  output: LessonPlannerSignalOutput
): Promise<string> {
  const pool = getMainPool();

  const inputSignalKeys = input.signals.map((s) => s.signalKey);

  const result = await pool.query<{ id: string }>(
    `
    INSERT INTO personalization_decision_logs (
      tenant_id, learner_id, session_id, decision_type, agent_name,
      agent_version, input_signal_keys, input_context, output_decision,
      reasoning, outcome, created_at
    ) VALUES (
      $1, $2, NULL, 'CONTENT_SELECTION', 'LESSON_PLANNER', $3, $4, $5, $6, $7, 'PENDING', NOW()
    )
    RETURNING id
    `,
    [
      input.signals[0]?.tenantId,
      input.learnerId,
      output.agentVersion,
      inputSignalKeys,
      JSON.stringify({
        targetDate: input.targetDate,
        constraints: input.constraints,
        signalCount: input.signals.length,
      }),
      JSON.stringify({
        plannedActivities: output.plannedActivities,
        totalMinutes: output.totalMinutes,
        subjectDistribution: output.subjectDistribution,
      }),
      output.reasoning,
    ]
  );

  return result.rows[0]!.id;
}

// ══════════════════════════════════════════════════════════════════════════════
// FEEDBACK LOOP
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Analyze recommendation feedback and suggest threshold adjustments.
 *
 * This is the "closed loop" - we look at acceptance rates and suggest
 * changes to signal generation thresholds.
 */
export async function analyzeRecommendationFeedback(
  tenantId: string,
  lookbackDays: number = 30
): Promise<ThresholdAdjustment[]> {
  const pool = getMainPool();
  const adjustments: ThresholdAdjustment[] = [];

  // Get acceptance rates by recommendation type
  const result = await pool.query<{
    recommendation_type: string;
    total_count: string;
    accepted_count: string;
    acceptance_rate: string;
  }>(
    `
    SELECT 
      recommendation_type,
      COUNT(*) as total_count,
      COUNT(*) FILTER (WHERE was_accepted) as accepted_count,
      ROUND(COUNT(*) FILTER (WHERE was_accepted)::DECIMAL / NULLIF(COUNT(*), 0), 3) as acceptance_rate
    FROM recommendation_feedback
    WHERE tenant_id = $1
      AND recommended_at >= NOW() - INTERVAL '1 day' * $2
    GROUP BY recommendation_type
    HAVING COUNT(*) >= 10
    ORDER BY acceptance_rate ASC
    `,
    [tenantId, lookbackDays]
  );

  for (const row of result.rows) {
    const acceptanceRate = parseFloat(row.acceptance_rate);
    const recType = row.recommendation_type;

    // If acceptance rate is very low, suggest making criteria stricter
    if (acceptanceRate < 0.3) {
      adjustments.push({
        thresholdKey: `${recType.toLowerCase()}_confidence_threshold`,
        currentValue: 0.5, // Would need to look up actual current value
        suggestedValue: 0.7,
        reason: `Low acceptance rate (${(acceptanceRate * 100).toFixed(1)}%) for ${recType} recommendations`,
        impact: 'Fewer but higher-quality recommendations',
      });
    }

    // If acceptance is high, consider relaxing
    if (acceptanceRate > 0.85 && parseInt(row.total_count, 10) > 50) {
      adjustments.push({
        thresholdKey: `${recType.toLowerCase()}_confidence_threshold`,
        currentValue: 0.7,
        suggestedValue: 0.5,
        reason: `High acceptance rate (${(acceptanceRate * 100).toFixed(1)}%) for ${recType} recommendations`,
        impact: 'More recommendations, potentially more personalization',
      });
    }
  }

  return adjustments;
}

/**
 * Get acceptance rates for display in dashboards.
 */
export async function getAcceptanceRates(
  tenantId: string,
  learnerId?: string,
  lookbackDays: number = 30
): Promise<RecommendationFeedback[]> {
  const pool = getMainPool();

  let query = `
    SELECT 
      recommendation_type,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE was_accepted) as accepted,
      COUNT(*) FILTER (WHERE was_explicitly_rejected) as rejected
    FROM recommendation_feedback
    WHERE tenant_id = $1
      AND recommended_at >= NOW() - INTERVAL '1 day' * $2
  `;

  const params: unknown[] = [tenantId, lookbackDays];

  if (learnerId) {
    query += ` AND learner_id = $3`;
    params.push(learnerId);
  }

  query += ` GROUP BY recommendation_type ORDER BY recommendation_type`;

  const result = await pool.query(query, params);

  return result.rows.map((row) => ({
    recommendationType: row.recommendation_type,
    totalCount: parseInt(row.total, 10),
    acceptedCount: parseInt(row.accepted, 10),
    declinedCount: parseInt(row.rejected, 10),
    acceptanceRate: parseInt(row.total, 10) > 0 
      ? parseInt(row.accepted, 10) / parseInt(row.total, 10) 
      : 0,
    windowDays: lookbackDays,
  }));
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

function inferEngagementLevel(signals: PersonalizationSignal[]): 'LOW' | 'NORMAL' | 'HIGH' {
  const lowEngagement = signals.find((s) => s.signalKey === 'LOW_ENGAGEMENT');
  const highEngagement = signals.find((s) => s.signalKey === 'HIGH_ENGAGEMENT');

  if (lowEngagement && lowEngagement.confidence > 0.6) return 'LOW';
  if (highEngagement && highEngagement.confidence > 0.6) return 'HIGH';
  return 'NORMAL';
}

function inferDifficultyAdjustments(
  signals: PersonalizationSignal[]
): Record<string, 'EASIER' | 'MAINTAIN' | 'HARDER'> {
  const adjustments: Record<string, 'EASIER' | 'MAINTAIN' | 'HARDER'> = {};

  for (const signal of signals) {
    const value = signal.signalValue as { domain?: string; recommendedAction?: string };
    if (value.domain && value.recommendedAction) {
      adjustments[value.domain] = value.recommendedAction as 'EASIER' | 'MAINTAIN' | 'HARDER';
    }
  }

  return adjustments;
}

function inferFocusProfile(
  signals: PersonalizationSignal[]
): { needsMoreBreaks: boolean; avgBreakDuration: number } {
  const needsMoreBreaks = signals.some(
    (s) => s.signalKey === 'HIGH_FOCUS_BREAKS' || s.signalKey === 'NEEDS_MORE_BREAKS'
  );

  let avgBreakDuration = 5; // default
  for (const signal of signals) {
    const value = signal.signalValue as { avgBreakDuration?: number };
    if (value.avgBreakDuration) {
      avgBreakDuration = value.avgBreakDuration;
      break;
    }
  }

  return { needsMoreBreaks, avgBreakDuration };
}

function mapVirtualBrainDecisionType(
  output: VirtualBrainSignalOutput
): 'DIFFICULTY_ADJUSTMENT' | 'FOCUS_INTERVENTION' | 'SESSION_LENGTH_ADJUSTMENT' | 'BREAK_RECOMMENDATION' {
  // Determine primary decision type from output
  const recs = output.recommendations;

  if (recs.adjustDifficulty) return 'DIFFICULTY_ADJUSTMENT';
  if (recs.suggestBreak) return 'BREAK_RECOMMENDATION';
  if (recs.focusIntervention) return 'FOCUS_INTERVENTION';
  return 'SESSION_LENGTH_ADJUSTMENT';
}
