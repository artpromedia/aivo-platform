/**
 * ND-2.3: Pattern Analyzer
 *
 * Analyzes and learns anxiety patterns specific to each learner.
 * Tracks pattern occurrences and identifies effective interventions.
 */

import type { Pool } from 'pg';

import type {
  AnxietyPattern,
  AnxietyTrigger,
  AnxietyBehavioralIndicators,
  EffectiveIntervention,
  OverwhelmThresholds,
  DEFAULT_OVERWHELM_THRESHOLDS,
} from './emotional-state.types.js';

export class PatternAnalyzer {
  constructor(private pool: Pool) {}

  /**
   * Get all learned anxiety patterns for a learner.
   */
  async getPatterns(learnerId: string): Promise<AnxietyPattern[]> {
    const result = await this.pool.query<{
      id: string;
      learner_id: string;
      tenant_id: string;
      pattern_type: string;
      pattern_name: string;
      triggers: AnxietyTrigger[];
      behavioral_indicators: AnxietyBehavioralIndicators;
      occurrence_count: number;
      last_occurrence: Date | null;
      average_intensity: number;
      effective_interventions: EffectiveIntervention[];
    }>(
      `SELECT
        id,
        learner_id,
        tenant_id,
        pattern_type,
        pattern_name,
        triggers,
        behavioral_indicators,
        occurrence_count,
        last_occurrence,
        average_intensity,
        effective_interventions
      FROM anxiety_patterns
      WHERE learner_id = $1
      ORDER BY occurrence_count DESC`,
      [learnerId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      learnerId: row.learner_id,
      tenantId: row.tenant_id,
      patternType: row.pattern_type,
      patternName: row.pattern_name,
      triggers: row.triggers,
      behavioralIndicators: row.behavioral_indicators,
      occurrenceCount: row.occurrence_count,
      lastOccurrence: row.last_occurrence ?? undefined,
      averageIntensity: row.average_intensity,
      effectiveInterventions: row.effective_interventions,
    }));
  }

  /**
   * Record an occurrence of an anxiety pattern.
   */
  async recordPatternOccurrence(
    learnerId: string,
    tenantId: string,
    patternType: string,
    patternName: string,
    triggers: AnxietyTrigger[],
    behavioralIndicators: AnxietyBehavioralIndicators,
    intensity: number
  ): Promise<void> {
    // Use upsert to create or update the pattern
    await this.pool.query(
      `INSERT INTO anxiety_patterns (
        learner_id,
        tenant_id,
        pattern_type,
        pattern_name,
        triggers,
        behavioral_indicators,
        occurrence_count,
        last_occurrence,
        average_intensity
      ) VALUES ($1, $2, $3, $4, $5, $6, 1, NOW(), $7)
      ON CONFLICT (learner_id, pattern_type)
      DO UPDATE SET
        pattern_name = EXCLUDED.pattern_name,
        triggers = CASE
          WHEN anxiety_patterns.occurrence_count > 5 THEN anxiety_patterns.triggers
          ELSE EXCLUDED.triggers
        END,
        behavioral_indicators = CASE
          WHEN anxiety_patterns.occurrence_count > 5 THEN anxiety_patterns.behavioral_indicators
          ELSE EXCLUDED.behavioral_indicators
        END,
        occurrence_count = anxiety_patterns.occurrence_count + 1,
        last_occurrence = NOW(),
        average_intensity = (
          (anxiety_patterns.average_intensity * anxiety_patterns.occurrence_count + $7) /
          (anxiety_patterns.occurrence_count + 1)
        )`,
      [
        learnerId,
        tenantId,
        patternType,
        patternName,
        JSON.stringify(triggers),
        JSON.stringify(behavioralIndicators),
        intensity,
      ]
    );
  }

  /**
   * Update effective interventions for a pattern.
   */
  async updateEffectiveIntervention(
    learnerId: string,
    interventionId: string,
    wasEffective: boolean
  ): Promise<void> {
    // Get the most recent pattern for this learner
    const patternResult = await this.pool.query<{
      id: string;
      effective_interventions: EffectiveIntervention[];
    }>(
      `SELECT id, effective_interventions
       FROM anxiety_patterns
       WHERE learner_id = $1
       ORDER BY last_occurrence DESC
       LIMIT 1`,
      [learnerId]
    );

    if (patternResult.rows.length === 0) {
      return;
    }

    const pattern = patternResult.rows[0];
    const interventions = pattern.effective_interventions || [];

    // Find existing intervention record
    const existing = interventions.find((i) => i.interventionId === interventionId);

    if (existing) {
      existing.usageCount += 1;
      const successWeight = wasEffective ? 1 : 0;
      existing.successRate =
        (existing.successRate * (existing.usageCount - 1) + successWeight) / existing.usageCount;
    } else {
      interventions.push({
        interventionId,
        successRate: wasEffective ? 1 : 0,
        usageCount: 1,
      });
    }

    // Update the pattern
    await this.pool.query(
      `UPDATE anxiety_patterns
       SET effective_interventions = $1
       WHERE id = $2`,
      [JSON.stringify(interventions), pattern.id]
    );

    // Also update global intervention effectiveness
    await this.pool.query(
      `UPDATE interventions
       SET
         usage_count = usage_count + 1,
         success_rate = (success_rate * usage_count + $1) / (usage_count + 1)
       WHERE id = $2`,
      [wasEffective ? 1 : 0, interventionId]
    );

    // Update learner-specific intervention history
    await this.pool.query(
      `INSERT INTO learner_intervention_history (
        learner_id,
        tenant_id,
        intervention_id,
        usage_count,
        success_count,
        success_rate,
        last_used_at
      )
      SELECT $1, tenant_id, $2, 1, $3, $4, NOW()
      FROM interventions
      WHERE id = $2
      ON CONFLICT (learner_id, intervention_id)
      DO UPDATE SET
        usage_count = learner_intervention_history.usage_count + 1,
        success_count = learner_intervention_history.success_count + $3,
        success_rate = (learner_intervention_history.success_count + $3)::float /
                       (learner_intervention_history.usage_count + 1)::float,
        last_used_at = NOW()`,
      [learnerId, interventionId, wasEffective ? 1 : 0, wasEffective ? 1 : 0]
    );
  }

  /**
   * Get or create overwhelm thresholds for a learner.
   */
  async getThresholds(learnerId: string, tenantId: string): Promise<OverwhelmThresholds> {
    // Try to get existing thresholds
    const result = await this.pool.query<{
      learner_id: string;
      tenant_id: string;
      cognitive_load_threshold: number;
      sensory_load_threshold: number;
      emotional_load_threshold: number;
      time_on_task_threshold: number;
      consecutive_errors_threshold: number;
      min_break_after_overwhelm_min: number;
      preferred_calming_activities: string[];
      auto_adjust_enabled: boolean;
      last_auto_adjust: Date | null;
    }>(`SELECT * FROM overwhelm_thresholds WHERE learner_id = $1`, [learnerId]);

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        learnerId: row.learner_id,
        tenantId: row.tenant_id,
        cognitiveLoadThreshold: row.cognitive_load_threshold,
        sensoryLoadThreshold: row.sensory_load_threshold,
        emotionalLoadThreshold: row.emotional_load_threshold,
        timeOnTaskThreshold: row.time_on_task_threshold,
        consecutiveErrorsThreshold: row.consecutive_errors_threshold,
        minBreakAfterOverwhelmMin: row.min_break_after_overwhelm_min,
        preferredCalmingActivities: row.preferred_calming_activities,
        autoAdjustEnabled: row.auto_adjust_enabled,
        lastAutoAdjust: row.last_auto_adjust ?? undefined,
      };
    }

    // Create default thresholds
    const insertResult = await this.pool.query<{ learner_id: string }>(
      `INSERT INTO overwhelm_thresholds (learner_id, tenant_id)
       VALUES ($1, $2)
       RETURNING *`,
      [learnerId, tenantId]
    );

    if (insertResult.rows.length > 0) {
      return {
        learnerId,
        tenantId,
        cognitiveLoadThreshold: 7,
        sensoryLoadThreshold: 7,
        emotionalLoadThreshold: 6,
        timeOnTaskThreshold: 20,
        consecutiveErrorsThreshold: 5,
        minBreakAfterOverwhelmMin: 5,
        preferredCalmingActivities: [],
        autoAdjustEnabled: true,
      };
    }

    // Fallback to defaults
    return {
      learnerId,
      tenantId,
      cognitiveLoadThreshold: 7,
      sensoryLoadThreshold: 7,
      emotionalLoadThreshold: 6,
      timeOnTaskThreshold: 20,
      consecutiveErrorsThreshold: 5,
      minBreakAfterOverwhelmMin: 5,
      preferredCalmingActivities: [],
      autoAdjustEnabled: true,
    };
  }

  /**
   * Update overwhelm thresholds for a learner.
   */
  async updateThresholds(
    learnerId: string,
    tenantId: string,
    updates: Partial<Omit<OverwhelmThresholds, 'learnerId' | 'tenantId'>>
  ): Promise<OverwhelmThresholds> {
    // Ensure thresholds exist
    await this.getThresholds(learnerId, tenantId);

    // Build update query dynamically
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMappings: Record<string, string> = {
      cognitiveLoadThreshold: 'cognitive_load_threshold',
      sensoryLoadThreshold: 'sensory_load_threshold',
      emotionalLoadThreshold: 'emotional_load_threshold',
      timeOnTaskThreshold: 'time_on_task_threshold',
      consecutiveErrorsThreshold: 'consecutive_errors_threshold',
      minBreakAfterOverwhelmMin: 'min_break_after_overwhelm_min',
      preferredCalmingActivities: 'preferred_calming_activities',
      autoAdjustEnabled: 'auto_adjust_enabled',
    };

    for (const [key, dbField] of Object.entries(fieldMappings)) {
      if (key in updates && updates[key as keyof typeof updates] !== undefined) {
        setClauses.push(`${dbField} = $${paramIndex}`);
        values.push(updates[key as keyof typeof updates]);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return this.getThresholds(learnerId, tenantId);
    }

    values.push(learnerId);

    await this.pool.query(
      `UPDATE overwhelm_thresholds
       SET ${setClauses.join(', ')}
       WHERE learner_id = $${paramIndex}`,
      values
    );

    return this.getThresholds(learnerId, tenantId);
  }

  /**
   * Auto-adjust thresholds based on recent history.
   * Called periodically to personalize thresholds.
   */
  async autoAdjustThresholds(learnerId: string, tenantId: string): Promise<void> {
    const thresholds = await this.getThresholds(learnerId, tenantId);

    if (!thresholds.autoAdjustEnabled) {
      return;
    }

    // Check if recently adjusted
    if (thresholds.lastAutoAdjust) {
      const daysSinceAdjust =
        (Date.now() - thresholds.lastAutoAdjust.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceAdjust < 7) {
        return; // Don't adjust more than once a week
      }
    }

    // Get recent emotional state events
    const recentEvents = await this.pool.query<{
      primary_state: string;
      state_intensity: number;
      time_since_last_break: number;
      consecutive_errors: number;
      intervention_triggered: boolean;
      state_improved: boolean | null;
    }>(
      `SELECT
        primary_state,
        state_intensity,
        time_since_last_break,
        consecutive_errors,
        intervention_triggered,
        state_improved
       FROM emotional_state_events
       WHERE learner_id = $1
       AND created_at > NOW() - INTERVAL '7 days'
       ORDER BY created_at DESC
       LIMIT 50`,
      [learnerId]
    );

    if (recentEvents.rows.length < 10) {
      return; // Not enough data
    }

    // Analyze patterns
    const criticalStates = [
      'HIGHLY_ANXIOUS',
      'HIGHLY_FRUSTRATED',
      'MELTDOWN_RISK',
      'SHUTDOWN_RISK',
    ];
    const criticalEvents = recentEvents.rows.filter((e) =>
      criticalStates.includes(e.primary_state)
    );

    // If too many critical events, lower thresholds (make more sensitive)
    if (criticalEvents.length >= 5) {
      const updates: Partial<OverwhelmThresholds> = {};

      // Lower emotional threshold
      if (thresholds.emotionalLoadThreshold > 4) {
        updates.emotionalLoadThreshold = thresholds.emotionalLoadThreshold - 0.5;
      }

      // Check if errors are a pattern
      const avgErrors =
        criticalEvents.reduce((sum, e) => sum + e.consecutive_errors, 0) / criticalEvents.length;
      if (avgErrors >= 3 && thresholds.consecutiveErrorsThreshold > 3) {
        updates.consecutiveErrorsThreshold = thresholds.consecutiveErrorsThreshold - 1;
      }

      // Check if time is a pattern
      const avgTimeSinceBreak =
        criticalEvents.reduce((sum, e) => sum + (e.time_since_last_break ?? 0), 0) /
        criticalEvents.length;
      if (avgTimeSinceBreak >= 900 && thresholds.timeOnTaskThreshold > 10) {
        // 15+ minutes
        updates.timeOnTaskThreshold = thresholds.timeOnTaskThreshold - 2;
      }

      if (Object.keys(updates).length > 0) {
        await this.updateThresholds(learnerId, tenantId, updates);
        await this.pool.query(
          `UPDATE overwhelm_thresholds
           SET last_auto_adjust = NOW()
           WHERE learner_id = $1`,
          [learnerId]
        );
      }
    }

    // If interventions are very successful, could slightly raise thresholds
    const successfulInterventions = recentEvents.rows.filter(
      (e) => e.intervention_triggered && e.state_improved === true
    );
    const unsuccessfulInterventions = recentEvents.rows.filter(
      (e) => e.intervention_triggered && e.state_improved === false
    );

    if (
      successfulInterventions.length >= 5 &&
      unsuccessfulInterventions.length === 0 &&
      criticalEvents.length <= 1
    ) {
      // Very stable learner, could slightly raise thresholds
      const updates: Partial<OverwhelmThresholds> = {};

      if (thresholds.emotionalLoadThreshold < 8) {
        updates.emotionalLoadThreshold = thresholds.emotionalLoadThreshold + 0.5;
      }
      if (thresholds.timeOnTaskThreshold < 25) {
        updates.timeOnTaskThreshold = thresholds.timeOnTaskThreshold + 2;
      }

      if (Object.keys(updates).length > 0) {
        await this.updateThresholds(learnerId, tenantId, updates);
        await this.pool.query(
          `UPDATE overwhelm_thresholds
           SET last_auto_adjust = NOW()
           WHERE learner_id = $1`,
          [learnerId]
        );
      }
    }
  }

  /**
   * Get learner's intervention history for personalized selection.
   */
  async getLearnerInterventionHistory(
    learnerId: string
  ): Promise<
    Record<string, { uses: number; successes: number; successRate: number }> & {
      lastUsed: string | null;
    }
  > {
    const result = await this.pool.query<{
      intervention_id: string;
      usage_count: number;
      success_count: number;
      success_rate: number;
      last_used_at: Date | null;
    }>(
      `SELECT
        intervention_id,
        usage_count,
        success_count,
        success_rate,
        last_used_at
       FROM learner_intervention_history
       WHERE learner_id = $1
       ORDER BY last_used_at DESC`,
      [learnerId]
    );

    const history: Record<string, { uses: number; successes: number; successRate: number }> = {};
    let lastUsed: string | null = null;

    for (const row of result.rows) {
      history[row.intervention_id] = {
        uses: row.usage_count,
        successes: row.success_count,
        successRate: row.success_rate,
      };

      if (!lastUsed && row.last_used_at) {
        lastUsed = row.intervention_id;
      }
    }

    return { ...history, lastUsed };
  }
}
