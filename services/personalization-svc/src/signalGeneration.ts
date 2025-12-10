/**
 * Signal Generation Logic
 *
 * Derives personalization signals from warehouse fact tables.
 * Runs as a batch job (daily) to update learner signals.
 *
 * Design:
 * - Uses configurable thresholds
 * - Calculates confidence based on sample size
 * - Supports per-tenant customization
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-non-null-assertion, @typescript-eslint/restrict-plus-operands */

import { config } from './config.js';
import { getMainPool, getWarehousePool, withTransaction } from './db.js';
import type {
  SignalType,
  SignalKey,
  SignalSource,
  NumericSignalValue,
  DifficultySignalValue,
  FocusSignalValue,
} from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface LearnerContext {
  tenantId: string;
  learnerId: string;
  learnerKey: number;
}

interface SignalCandidate {
  signalType: SignalType;
  signalKey: SignalKey;
  signalValue: number | Record<string, unknown>;
  confidence: number;
  source: SignalSource;
  metadata?: Record<string, unknown>;
}

interface JobResult {
  totalLearners: number;
  signalsGenerated: number;
  signalsUpdated: number;
  signalsDeleted: number;
  errors: string[];
  durationMs: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate confidence score based on sample size.
 */
function calculateConfidence(sampleSize: number, minSample: number = config.thresholds.minSampleSizeForConfidence): number {
  if (sampleSize < minSample) {
    return Math.max(0.3, sampleSize / minSample);
  }
  // Confidence increases with sample size, caps at 0.95
  return Math.min(0.95, 0.7 + 0.25 * Math.min(1, sampleSize / (minSample * 3)));
}

/**
 * Get date key for N days ago.
 */
function getDateKey(daysAgo: number): number {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const datePart = d.toISOString().split('T')[0] ?? '';
  return parseInt(datePart.replace(/-/g, ''), 10);
}

/**
 * Get signal expiration date.
 */
function getExpirationDate(signalType: SignalType): string {
  const days = config.signalExpirationDays[signalType] ?? 7;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// ══════════════════════════════════════════════════════════════════════════════
// ENGAGEMENT SIGNALS
// ══════════════════════════════════════════════════════════════════════════════

async function generateEngagementSignals(
  learner: LearnerContext,
  fromDateKey: number,
  toDateKey: number
): Promise<SignalCandidate[]> {
  const warehouse = getWarehousePool();
  const signals: SignalCandidate[] = [];

  // Query session stats for the period
  const result = await warehouse.query<{
    session_count: string;
    total_minutes: string;
    avg_duration_minutes: string;
    days_active: string;
  }>(
    `
    SELECT 
      COUNT(*) as session_count,
      COALESCE(SUM(duration_seconds) / 60.0, 0) as total_minutes,
      COALESCE(AVG(duration_seconds) / 60.0, 0) as avg_duration_minutes,
      COUNT(DISTINCT date_key) as days_active
    FROM fact_sessions
    WHERE learner_key = $1
      AND date_key >= $2
      AND date_key <= $3
    `,
    [learner.learnerKey, fromDateKey, toDateKey]
  );

  const stats = result.rows[0];
  if (!stats) return signals;

  const sessionCount = parseInt(stats.session_count, 10);
  const avgDuration = parseFloat(stats.avg_duration_minutes);
  const daysActive = parseInt(stats.days_active, 10);

  // Calculate sessions per week
  const dayRange = Math.max(1, Math.floor((toDateKey - fromDateKey) / 7));
  const sessionsPerWeek = sessionCount / Math.max(1, dayRange);

  // LOW_ENGAGEMENT
  if (sessionsPerWeek < config.thresholds.lowEngagementSessionsPerWeek) {
    const value: NumericSignalValue = {
      value: sessionsPerWeek,
      threshold: config.thresholds.lowEngagementSessionsPerWeek,
      direction: 'below',
    };
    signals.push({
      signalType: 'ENGAGEMENT',
      signalKey: 'LOW_ENGAGEMENT',
      signalValue: value,
      confidence: calculateConfidence(daysActive, 3),
      source: 'ANALYTICS_ETL',
      metadata: { sessionCount, daysActive, periodDays: dayRange * 7 },
    });
  }

  // HIGH_ENGAGEMENT
  if (sessionsPerWeek >= config.thresholds.highEngagementSessionsPerWeek) {
    const value: NumericSignalValue = {
      value: sessionsPerWeek,
      threshold: config.thresholds.highEngagementSessionsPerWeek,
      direction: 'above',
    };
    signals.push({
      signalType: 'ENGAGEMENT',
      signalKey: 'HIGH_ENGAGEMENT',
      signalValue: value,
      confidence: calculateConfidence(sessionCount),
      source: 'ANALYTICS_ETL',
      metadata: { sessionCount, daysActive },
    });
  }

  // SESSION_TOO_SHORT
  if (sessionCount >= 3 && avgDuration < config.thresholds.shortSessionMinutes) {
    signals.push({
      signalType: 'ENGAGEMENT',
      signalKey: 'SESSION_TOO_SHORT',
      signalValue: {
        value: avgDuration,
        threshold: config.thresholds.shortSessionMinutes,
        direction: 'below',
      },
      confidence: calculateConfidence(sessionCount),
      source: 'ANALYTICS_ETL',
      metadata: { avgDuration, sessionCount },
    });
  }

  // SESSION_TOO_LONG (may indicate struggle)
  if (sessionCount >= 3 && avgDuration > config.thresholds.longSessionMinutes) {
    signals.push({
      signalType: 'ENGAGEMENT',
      signalKey: 'SESSION_TOO_LONG',
      signalValue: {
        value: avgDuration,
        threshold: config.thresholds.longSessionMinutes,
        direction: 'above',
      },
      confidence: calculateConfidence(sessionCount),
      source: 'ANALYTICS_ETL',
      metadata: { avgDuration, sessionCount },
    });
  }

  return signals;
}

// ══════════════════════════════════════════════════════════════════════════════
// DIFFICULTY SIGNALS
// ══════════════════════════════════════════════════════════════════════════════

async function generateDifficultySignals(
  learner: LearnerContext,
  fromDateKey: number,
  toDateKey: number
): Promise<SignalCandidate[]> {
  const warehouse = getWarehousePool();
  const signals: SignalCandidate[] = [];

  // Query mastery and performance by subject
  const progressResult = await warehouse.query<{
    subject_code: string;
    avg_mastery: string;
    sessions: string;
  }>(
    `
    SELECT 
      ds.subject_code,
      AVG(flp.average_mastery) as avg_mastery,
      COUNT(DISTINCT fs.session_id) as sessions
    FROM fact_learning_progress flp
    JOIN dim_subject ds ON ds.subject_key = flp.subject_key
    LEFT JOIN fact_sessions fs ON fs.learner_key = flp.learner_key 
      AND fs.date_key >= $2 AND fs.date_key <= $3
    WHERE flp.learner_key = $1
      AND flp.date_key >= $2
      AND flp.date_key <= $3
    GROUP BY ds.subject_code
    `,
    [learner.learnerKey, fromDateKey, toDateKey]
  );

  // Query correct/incorrect response rates by subject
  const responseResult = await warehouse.query<{
    session_type: string;
    correct: string;
    incorrect: string;
  }>(
    `
    SELECT 
      session_type,
      SUM(correct_responses) as correct,
      SUM(incorrect_responses) as incorrect
    FROM fact_sessions
    WHERE learner_key = $1
      AND date_key >= $2
      AND date_key <= $3
    GROUP BY session_type
    `,
    [learner.learnerKey, fromDateKey, toDateKey]
  );

  // Build response rate map
  const responseRates = new Map<string, number>();
  for (const row of responseResult.rows) {
    const correct = parseInt(row.correct, 10);
    const incorrect = parseInt(row.incorrect, 10);
    const total = correct + incorrect;
    if (total > 0) {
      responseRates.set(row.session_type, correct / total);
    }
  }

  // Generate signals per subject
  const domainMap: Record<string, SignalKey> = {
    MATH: 'HIGH_STRUGGLE_MATH',
    ELA: 'HIGH_STRUGGLE_ELA',
    SCIENCE: 'HIGH_STRUGGLE_SCIENCE',
    SEL: 'HIGH_STRUGGLE_SEL',
    SPEECH: 'HIGH_STRUGGLE_SPEECH',
  };

  const challengeMap: Record<string, SignalKey> = {
    MATH: 'READY_FOR_CHALLENGE_MATH',
    ELA: 'READY_FOR_CHALLENGE_ELA',
    SCIENCE: 'READY_FOR_CHALLENGE_SCIENCE',
    SEL: 'READY_FOR_CHALLENGE_SEL',
    SPEECH: 'READY_FOR_CHALLENGE_SPEECH',
  };

  for (const row of progressResult.rows) {
    const subjectCode = row.subject_code;
    const avgMastery = parseFloat(row.avg_mastery);
    const sessions = parseInt(row.sessions, 10);
    const correctRate = responseRates.get(subjectCode) ?? 0.5;

    // Need minimum sessions for confidence
    if (sessions < config.thresholds.minSessionsForDifficultySignal) {
      continue;
    }

    const struggleKey = domainMap[subjectCode];
    const challengeKey = challengeMap[subjectCode];

    // HIGH_STRUGGLE_[DOMAIN]
    if (
      struggleKey &&
      avgMastery < config.thresholds.struggleMasteryThreshold &&
      correctRate < config.thresholds.lowCorrectRateThreshold
    ) {
      const value: DifficultySignalValue = {
        domain: subjectCode,
        currentMastery: avgMastery,
        targetMastery: config.thresholds.struggleMasteryThreshold,
        sessionCount: sessions,
        correctRate,
        recommendedAction: 'EASIER',
      };
      signals.push({
        signalType: 'DIFFICULTY',
        signalKey: struggleKey,
        signalValue: value,
        confidence: calculateConfidence(sessions),
        source: 'ANALYTICS_ETL',
        metadata: { domain: subjectCode },
      });
    }

    // READY_FOR_CHALLENGE_[DOMAIN]
    if (
      challengeKey &&
      avgMastery >= config.thresholds.readyForChallengeThreshold &&
      correctRate >= 0.7
    ) {
      const value: DifficultySignalValue = {
        domain: subjectCode,
        currentMastery: avgMastery,
        targetMastery: 1.0,
        sessionCount: sessions,
        correctRate,
        recommendedAction: 'HARDER',
      };
      signals.push({
        signalType: 'DIFFICULTY',
        signalKey: challengeKey,
        signalValue: value,
        confidence: calculateConfidence(sessions),
        source: 'ANALYTICS_ETL',
        metadata: { domain: subjectCode },
      });
    }
  }

  return signals;
}

// ══════════════════════════════════════════════════════════════════════════════
// FOCUS SIGNALS
// ══════════════════════════════════════════════════════════════════════════════

async function generateFocusSignals(
  learner: LearnerContext,
  fromDateKey: number,
  toDateKey: number
): Promise<SignalCandidate[]> {
  const warehouse = getWarehousePool();
  const signals: SignalCandidate[] = [];

  // Query focus event stats
  const result = await warehouse.query<{
    total_breaks: string;
    total_sessions: string;
    total_interventions: string;
    completed_interventions: string;
    avg_break_duration: string;
  }>(
    `
    SELECT 
      COUNT(*) FILTER (WHERE event_type = 'FOCUS_BREAK_STARTED') as total_breaks,
      COUNT(DISTINCT session_key) as total_sessions,
      COUNT(*) FILTER (WHERE event_type = 'FOCUS_INTERVENTION_SHOWN') as total_interventions,
      COUNT(*) FILTER (WHERE event_type = 'FOCUS_INTERVENTION_COMPLETED') as completed_interventions,
      COALESCE(AVG(duration_seconds) FILTER (WHERE event_type = 'FOCUS_BREAK_ENDED'), 0) as avg_break_duration
    FROM fact_focus_events
    WHERE learner_key = $1
      AND date_key >= $2
      AND date_key <= $3
    `,
    [learner.learnerKey, fromDateKey, toDateKey]
  );

  const stats = result.rows[0];
  if (!stats) return signals;

  const totalBreaks = parseInt(stats.total_breaks, 10);
  const totalSessions = parseInt(stats.total_sessions, 10);
  const totalInterventions = parseInt(stats.total_interventions, 10);
  const completedInterventions = parseInt(stats.completed_interventions, 10);
  const avgBreakDuration = parseFloat(stats.avg_break_duration);

  if (totalSessions < 2) return signals;

  const breaksPerSession = totalBreaks / totalSessions;
  const interventionSuccessRate = totalInterventions > 0 
    ? completedInterventions / totalInterventions 
    : 0;

  // HIGH_FOCUS_BREAKS
  if (breaksPerSession > config.thresholds.highFocusBreaksPerSession) {
    const value: FocusSignalValue = {
      breaksPerSession,
      avgBreakDuration,
      interventionCount: totalInterventions,
      interventionSuccessRate,
      trendDirection: 'stable', // Would need historical comparison for trend
    };
    signals.push({
      signalType: 'FOCUS',
      signalKey: 'HIGH_FOCUS_BREAKS',
      signalValue: value,
      confidence: calculateConfidence(totalSessions),
      source: 'ANALYTICS_ETL',
      metadata: { totalBreaks, totalSessions },
    });

    // Also signal NEEDS_MORE_BREAKS if interventions are frequent
    if (totalInterventions > totalSessions * 2) {
      signals.push({
        signalType: 'FOCUS',
        signalKey: 'NEEDS_MORE_BREAKS',
        signalValue: {
          breaksPerSession,
          avgBreakDuration,
          interventionCount: totalInterventions,
          interventionSuccessRate,
          trendDirection: 'stable',
        },
        confidence: calculateConfidence(totalSessions),
        source: 'ANALYTICS_ETL',
      });
    }
  }

  // LOW_FOCUS_BREAKS (may indicate over-focus)
  if (breaksPerSession < config.thresholds.lowFocusBreaksPerSession && totalSessions >= 5) {
    signals.push({
      signalType: 'FOCUS',
      signalKey: 'LOW_FOCUS_BREAKS',
      signalValue: {
        breaksPerSession,
        avgBreakDuration,
        interventionCount: totalInterventions,
        interventionSuccessRate,
        trendDirection: 'stable',
      },
      confidence: calculateConfidence(totalSessions),
      source: 'ANALYTICS_ETL',
    });
  }

  return signals;
}

// ══════════════════════════════════════════════════════════════════════════════
// HOMEWORK SIGNALS
// ══════════════════════════════════════════════════════════════════════════════

async function generateHomeworkSignals(
  learner: LearnerContext,
  fromDateKey: number,
  toDateKey: number
): Promise<SignalCandidate[]> {
  const warehouse = getWarehousePool();
  const signals: SignalCandidate[] = [];

  // Query homework stats
  const result = await warehouse.query<{
    total_submissions: string;
    completed_submissions: string;
    total_steps: string;
    hints_revealed: string;
    correct_responses: string;
    total_responses: string;
  }>(
    `
    SELECT 
      COUNT(*) as total_submissions,
      COUNT(*) FILTER (WHERE completion_rate >= 0.9) as completed_submissions,
      SUM(step_count) as total_steps,
      SUM(hints_revealed) as hints_revealed,
      SUM(correct_responses) as correct_responses,
      SUM(total_responses) as total_responses
    FROM fact_homework_events
    WHERE learner_key = $1
      AND date_key >= $2
      AND date_key <= $3
    `,
    [learner.learnerKey, fromDateKey, toDateKey]
  );

  const stats = result.rows[0];
  if (!stats) return signals;

  const totalSubmissions = parseInt(stats.total_submissions, 10);
  const completedSubmissions = parseInt(stats.completed_submissions, 10);
  const totalSteps = parseInt(stats.total_steps, 10);
  const hintsRevealed = parseInt(stats.hints_revealed, 10);
  const correctResponses = parseInt(stats.correct_responses, 10);
  const totalResponses = parseInt(stats.total_responses, 10);

  if (totalSubmissions < 2) return signals;

  const completionRate = completedSubmissions / totalSubmissions;
  const hintRate = totalSteps > 0 ? hintsRevealed / totalSteps : 0;
  const correctRate = totalResponses > 0 ? correctResponses / totalResponses : 0;

  // HOMEWORK_AVOIDANCE
  if (completionRate < config.thresholds.homeworkAvoidanceThreshold) {
    signals.push({
      signalType: 'HOMEWORK',
      signalKey: 'HOMEWORK_AVOIDANCE',
      signalValue: {
        value: completionRate,
        threshold: config.thresholds.homeworkAvoidanceThreshold,
        direction: 'below',
      },
      confidence: calculateConfidence(totalSubmissions),
      source: 'ANALYTICS_ETL',
      metadata: { totalSubmissions, completedSubmissions },
    });
  }

  // HOMEWORK_HINT_HEAVY
  if (hintRate > config.thresholds.homeworkHintHeavyThreshold) {
    signals.push({
      signalType: 'HOMEWORK',
      signalKey: 'HOMEWORK_HINT_HEAVY',
      signalValue: {
        value: hintRate,
        threshold: config.thresholds.homeworkHintHeavyThreshold,
        direction: 'above',
      },
      confidence: calculateConfidence(totalSteps, 10),
      source: 'ANALYTICS_ETL',
      metadata: { hintsRevealed, totalSteps },
    });
  }

  // HOMEWORK_SELF_SUFFICIENT
  if (hintRate < 0.1 && completionRate > 0.7 && totalSubmissions >= 5) {
    signals.push({
      signalType: 'HOMEWORK',
      signalKey: 'HOMEWORK_SELF_SUFFICIENT',
      signalValue: {
        value: hintRate,
        threshold: 0.1,
        direction: 'below',
      },
      confidence: calculateConfidence(totalSubmissions),
      source: 'ANALYTICS_ETL',
      metadata: { completionRate, correctRate },
    });
  }

  return signals;
}

// ══════════════════════════════════════════════════════════════════════════════
// RECOMMENDATION FEEDBACK SIGNALS
// ══════════════════════════════════════════════════════════════════════════════

async function generateRecommendationSignals(
  learner: LearnerContext,
  fromDateKey: number,
  toDateKey: number
): Promise<SignalCandidate[]> {
  const warehouse = getWarehousePool();
  const signals: SignalCandidate[] = [];

  // Query recommendation acceptance rates
  const result = await warehouse.query<{
    recommendation_type: string;
    total_count: string;
    accepted_count: string;
    declined_count: string;
  }>(
    `
    SELECT 
      recommendation_type,
      COUNT(*) as total_count,
      COUNT(*) FILTER (WHERE was_accepted = true) as accepted_count,
      COUNT(*) FILTER (WHERE was_declined = true) as declined_count
    FROM fact_recommendation_events
    WHERE learner_key = $1
      AND date_key >= $2
      AND date_key <= $3
    GROUP BY recommendation_type
    `,
    [learner.learnerKey, fromDateKey, toDateKey]
  );

  let totalRecs = 0;
  let totalAccepted = 0;

  for (const row of result.rows) {
    const total = parseInt(row.total_count, 10);
    const accepted = parseInt(row.accepted_count, 10);
    totalRecs += total;
    totalAccepted += accepted;
  }

  if (totalRecs < 3) return signals;

  const overallAcceptanceRate = totalAccepted / totalRecs;

  // REC_ACCEPTANCE_HIGH
  if (overallAcceptanceRate >= config.thresholds.highAcceptanceRate) {
    signals.push({
      signalType: 'RECOMMENDATION',
      signalKey: 'REC_ACCEPTANCE_HIGH',
      signalValue: {
        value: overallAcceptanceRate,
        threshold: config.thresholds.highAcceptanceRate,
        direction: 'above',
      },
      confidence: calculateConfidence(totalRecs),
      source: 'ANALYTICS_ETL',
      metadata: { totalRecs, totalAccepted },
    });
  }

  // REC_ACCEPTANCE_LOW
  if (overallAcceptanceRate <= config.thresholds.lowAcceptanceRate) {
    signals.push({
      signalType: 'RECOMMENDATION',
      signalKey: 'REC_ACCEPTANCE_LOW',
      signalValue: {
        value: overallAcceptanceRate,
        threshold: config.thresholds.lowAcceptanceRate,
        direction: 'below',
      },
      confidence: calculateConfidence(totalRecs),
      source: 'ANALYTICS_ETL',
      metadata: { totalRecs, totalAccepted },
    });
  }

  return signals;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN JOB FUNCTION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate personalization signals for all learners.
 * Runs as a daily batch job.
 */
export async function jobGeneratePersonalizationSignals(
  targetDate: Date = new Date(),
  lookbackDays: number = 7
): Promise<JobResult> {
  const startTime = Date.now();
  const mainDb = getMainPool();
  const warehouse = getWarehousePool();
  const errors: string[] = [];

  // Calculate date range
  const toDateKey = getDateKey(0);
  const fromDateKey = getDateKey(lookbackDays);
  const today = targetDate.toISOString().split('T')[0]!;

  let totalLearners = 0;
  let signalsGenerated = 0;
  let signalsUpdated = 0;
  let signalsDeleted = 0;

  try {
    // Get all active learners from warehouse dimensions
    const learnersResult = await warehouse.query<{
      learner_key: number;
      learner_id: string;
      tenant_id: string;
    }>(
      `
      SELECT learner_key, learner_id, tenant_id
      FROM dim_learner
      WHERE is_current = true AND is_active = true
      `
    );

    const learners = learnersResult.rows;
    totalLearners = learners.length;

    console.log(`[personalization] Processing ${totalLearners} learners...`);

    // Process each learner
    for (const learnerRow of learners) {
      try {
        const learner: LearnerContext = {
          tenantId: learnerRow.tenant_id,
          learnerId: learnerRow.learner_id,
          learnerKey: learnerRow.learner_key,
        };

        // Generate all signal types
        const allSignals: SignalCandidate[] = [];

        const [engagement, difficulty, focus, homework, recommendation] = await Promise.all([
          generateEngagementSignals(learner, fromDateKey, toDateKey),
          generateDifficultySignals(learner, fromDateKey, toDateKey),
          generateFocusSignals(learner, fromDateKey, toDateKey),
          generateHomeworkSignals(learner, fromDateKey, toDateKey),
          generateRecommendationSignals(learner, fromDateKey, toDateKey),
        ]);

        allSignals.push(...engagement, ...difficulty, ...focus, ...homework, ...recommendation);

        // Upsert signals to database
        await withTransaction(mainDb, async (client) => {
          // Delete old signals for this learner/date that won't be regenerated
          const existingSignalKeys = allSignals.map((s) => s.signalKey);
          
          if (existingSignalKeys.length > 0) {
            const deleteResult = await client.query(
              `
              DELETE FROM personalization_signals
              WHERE learner_id = $1
                AND date = $2
                AND signal_key NOT IN (${existingSignalKeys.map((_, i) => `$${i + 3}`).join(',')})
              `,
              [learner.learnerId, today, ...existingSignalKeys]
            );
            signalsDeleted += deleteResult.rowCount ?? 0;
          }

          // Upsert each signal
          for (const signal of allSignals) {
            const expiresAt = getExpirationDate(signal.signalType);

            const upsertResult = await client.query(
              `
              INSERT INTO personalization_signals (
                id, tenant_id, learner_id, date, signal_type, signal_key,
                signal_value, confidence, source, metadata, expires_at, created_at, updated_at
              ) VALUES (
                gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
              )
              ON CONFLICT (learner_id, date, signal_key) DO UPDATE SET
                signal_value = EXCLUDED.signal_value,
                confidence = EXCLUDED.confidence,
                metadata = EXCLUDED.metadata,
                expires_at = EXCLUDED.expires_at,
                updated_at = NOW()
              RETURNING (xmax = 0) as inserted
              `,
              [
                learner.tenantId,
                learner.learnerId,
                today,
                signal.signalType,
                signal.signalKey,
                JSON.stringify(signal.signalValue),
                signal.confidence,
                signal.source,
                signal.metadata ? JSON.stringify(signal.metadata) : null,
                expiresAt,
              ]
            );

            const wasInserted = upsertResult.rows[0]?.inserted;
            if (wasInserted) {
              signalsGenerated++;
            } else {
              signalsUpdated++;
            }
          }
        });
      } catch (learnerError) {
        const message = learnerError instanceof Error ? learnerError.message : String(learnerError);
        errors.push(`Learner ${learnerRow.learner_id}: ${message}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`Job error: ${message}`);
  }

  const durationMs = Date.now() - startTime;

  console.log(`[personalization] Completed in ${durationMs}ms: ${signalsGenerated} generated, ${signalsUpdated} updated`);

  return {
    totalLearners,
    signalsGenerated,
    signalsUpdated,
    signalsDeleted,
    errors,
    durationMs,
  };
}

/**
 * Clean up expired signals.
 */
export async function cleanupExpiredSignals(): Promise<number> {
  const mainDb = getMainPool();
  const result = await mainDb.query(
    `DELETE FROM personalization_signals WHERE expires_at < NOW()`
  );
  return result.rowCount ?? 0;
}
