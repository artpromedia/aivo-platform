/**
 * ND-2.3: Intervention Selector
 *
 * Selects appropriate interventions based on emotional state,
 * learner history, and contextual factors.
 */

import type { Pool } from 'pg';

import type {
  ContextualFactors,
  EmotionalState,
  Intervention,
  InterventionContent,
  InterventionType,
  InterventionUrgency,
  SuggestedIntervention,
} from './emotional-state.types.js';

/**
 * Database row type for interventions.
 */
interface InterventionRow {
  id: string;
  tenant_id: string;
  name: string;
  type: InterventionType;
  description: string;
  content: InterventionContent;
  target_states: EmotionalState[];
  target_intensity_min: number;
  target_intensity_max: number;
  requires_audio: boolean;
  requires_motion: boolean;
  requires_privacy: boolean;
  usage_count: number;
  success_rate: number;
  is_default: boolean;
  is_active: boolean;
}

/**
 * Learner intervention history entry.
 */
interface LearnerInterventionEntry {
  uses: number;
  successes: number;
  successRate: number;
}

/**
 * Type for learner history lookup.
 */
type LearnerHistory = Record<string, LearnerInterventionEntry> & {
  lastUsed: string | null;
};

export class InterventionSelector {
  constructor(private pool: Pool) {}

  /**
   * Select appropriate interventions for the current state.
   */
  async selectInterventions(
    primaryState: EmotionalState,
    intensity: number,
    learnerId: string,
    tenantId: string,
    context: ContextualFactors
  ): Promise<SuggestedIntervention[]> {
    // Get learner's intervention history
    const learnerHistory = await this.getLearnerInterventionHistory(learnerId);

    // Get available interventions for this state
    const interventions = await this.getAvailableInterventions(primaryState, intensity, tenantId);

    // Score and rank interventions
    const scored = interventions.map((intervention) => {
      const score = this.scoreIntervention(
        intervention,
        primaryState,
        intensity,
        context,
        learnerHistory
      );

      return {
        intervention,
        score,
      };
    });

    // Sort by score and take top 3
    scored.sort((a, b) => b.score.total - a.score.total);

    return scored.slice(0, 3).map(({ intervention, score }) => ({
      interventionId: intervention.id,
      interventionType: intervention.type,
      name: intervention.name,
      reason: score.reason,
      estimatedEffectiveness: score.effectiveness,
      duration: intervention.content?.duration ?? 60,
      urgency: this.getUrgency(intensity),
      content: intervention.content,
    }));
  }

  /**
   * Get available interventions for the given state and intensity.
   */
  private async getAvailableInterventions(
    state: EmotionalState,
    intensity: number,
    tenantId: string
  ): Promise<Intervention[]> {
    // Query for tenant-specific and default interventions
    const result = await this.pool.query<InterventionRow>(
      `SELECT *
       FROM interventions
       WHERE is_active = TRUE
       AND $1 = ANY(target_states)
       AND target_intensity_min <= $2
       AND target_intensity_max >= $2
       AND (tenant_id = $3 OR tenant_id = '__default__')
       ORDER BY
         CASE WHEN tenant_id = $3 THEN 0 ELSE 1 END,
         success_rate DESC,
         usage_count DESC`,
      [state, intensity, tenantId]
    );

    return result.rows.map((row) => ({
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
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  /**
   * Get learner's intervention history.
   */
  private async getLearnerInterventionHistory(learnerId: string): Promise<LearnerHistory> {
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

    const history: Record<string, LearnerInterventionEntry> = {};
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

  /**
   * Score an intervention for the current situation.
   */
  private scoreIntervention(
    intervention: Intervention,
    state: EmotionalState,
    intensity: number,
    context: ContextualFactors,
    learnerHistory: LearnerHistory
  ): { total: number; effectiveness: number; reason: string } {
    let score = 0;
    let reason = '';

    // Base score from historical success rate
    score += intervention.successRate * 30;

    // Learner-specific effectiveness
    const learnerSuccess = learnerHistory[intervention.id];
    if (learnerSuccess) {
      score += learnerSuccess.successRate * 40;
      if (learnerSuccess.successRate > 0.7) {
        reason = 'This has helped you before';
      }
    }

    // Match intervention type to state
    const stateTypeMatch = this.getStateTypeMatch(state, intervention.type);
    score += stateTypeMatch * 20;

    // Context-based adjustments
    if (context.sessionDurationMinutes > 15 && intervention.type === 'MOVEMENT') {
      score += 10;
      reason = reason || 'A movement break could help after sitting';
    }

    if (intensity >= 7 && intervention.type === 'BREATHING') {
      score += 15;
      reason = reason || 'Breathing helps calm strong feelings';
    }

    if (intensity >= 8 && intervention.type === 'GROUNDING') {
      score += 12;
      reason = reason || 'Grounding can help when things feel overwhelming';
    }

    // Penalize if requirements cannot be met
    if (intervention.requiresAudio && context.environmentType === 'classroom') {
      score -= 20;
    }

    if (intervention.requiresMotion && context.hasLimitedMobility) {
      score -= 30;
    }

    // Variety bonus (avoid repeating same intervention)
    if (learnerHistory.lastUsed !== intervention.id) {
      score += 5;
    }

    // Duration appropriateness
    const duration = intervention.content?.duration ?? 60;
    if (intensity >= 7 && duration >= 60) {
      score += 5; // Longer intervention for higher intensity
    } else if (intensity < 5 && duration <= 30) {
      score += 5; // Quick intervention for lower intensity
    }

    // Preferred calming activities bonus
    if (context.knownCalmingStrategies?.includes(intervention.type.toLowerCase())) {
      score += 15;
      reason = reason || 'This is one of your preferred calming strategies';
    }

    // Time of day considerations
    if (context.timeOfDay === 'afternoon' && intervention.type === 'MOVEMENT') {
      score += 5; // Movement good for afternoon slump
    }

    const effectiveness = Math.min(1, score / 100);

    return {
      total: score,
      effectiveness,
      reason: reason || this.getDefaultReason(intervention.type),
    };
  }

  /**
   * Get match score between state and intervention type.
   */
  private getStateTypeMatch(state: EmotionalState, type: InterventionType): number {
    const matches: Record<string, InterventionType[]> = {
      ANXIOUS: ['BREATHING', 'GROUNDING', 'ENCOURAGEMENT'],
      HIGHLY_ANXIOUS: ['BREATHING', 'GROUNDING', 'SENSORY'],
      OVERWHELMED: ['BREAK', 'GROUNDING', 'SENSORY', 'BREATHING'],
      FRUSTRATED: ['MOVEMENT', 'BREAK', 'ENCOURAGEMENT'],
      HIGHLY_FRUSTRATED: ['BREAK', 'MOVEMENT', 'DISTRACTION'],
      STRESSED: ['BREATHING', 'MOVEMENT', 'ENCOURAGEMENT'],
      WORRIED: ['ENCOURAGEMENT', 'BREATHING', 'COGNITIVE'],
      MELTDOWN_RISK: ['BREAK', 'SENSORY', 'ENVIRONMENT'],
      SHUTDOWN_RISK: ['BREAK', 'SENSORY', 'SOCIAL'],
      TIRED: ['BREAK', 'MOVEMENT', 'ENCOURAGEMENT'],
      CONFUSED: ['ENCOURAGEMENT', 'BREAK', 'COGNITIVE'],
      DISTRACTED: ['MOVEMENT', 'GROUNDING', 'BREAK'],
    };

    const preferredTypes = matches[state] ?? [];
    const index = preferredTypes.indexOf(type);

    if (index === 0) return 1.0;
    if (index === 1) return 0.8;
    if (index === 2) return 0.6;
    if (index >= 0) return 0.4;
    return 0.2;
  }

  /**
   * Get urgency level based on intensity.
   */
  private getUrgency(intensity: number): InterventionUrgency {
    if (intensity >= 8) return 'immediate';
    if (intensity >= 6) return 'high';
    if (intensity >= 4) return 'medium';
    return 'low';
  }

  /**
   * Get default reason for an intervention type.
   */
  private getDefaultReason(type: InterventionType): string {
    const reasons: Record<InterventionType, string> = {
      BREATHING: 'Deep breaths help calm your body',
      GROUNDING: 'Helps you feel present and centered',
      MOVEMENT: 'Moving your body releases tension',
      SENSORY: 'Gives your senses something calming to focus on',
      COGNITIVE: 'Helps shift your thoughts',
      DISTRACTION: 'A quick mental reset',
      SOCIAL: 'Connecting with someone who cares',
      BREAK: 'Time away to recharge',
      ENVIRONMENT: 'Adjusting your surroundings',
      ENCOURAGEMENT: 'A reminder of how great you are',
    };
    return reasons[type] ?? 'This might help you feel better';
  }

  /**
   * Record that an intervention was used and its outcome.
   */
  async recordInterventionUsage(
    learnerId: string,
    tenantId: string,
    interventionId: string,
    stateBefore: EmotionalState,
    stateAfter: EmotionalState | undefined,
    accepted: boolean
  ): Promise<void> {
    const improved = stateAfter ? this.isStateImproved(stateAfter) : null;

    // Update global intervention stats
    await this.pool.query(
      `UPDATE interventions
       SET
         usage_count = usage_count + 1,
         success_rate = CASE
           WHEN $1 THEN (success_rate * usage_count + 1) / (usage_count + 1)
           ELSE (success_rate * usage_count) / (usage_count + 1)
         END
       WHERE id = $2`,
      [improved === true, interventionId]
    );

    // Update learner-specific history
    await this.pool.query(
      `INSERT INTO learner_intervention_history (
        learner_id,
        tenant_id,
        intervention_id,
        usage_count,
        success_count,
        success_rate,
        last_used_at,
        last_state_before,
        last_state_after
      ) VALUES ($1, $2, $3, 1, $4, $5, NOW(), $6, $7)
      ON CONFLICT (learner_id, intervention_id)
      DO UPDATE SET
        usage_count = learner_intervention_history.usage_count + 1,
        success_count = learner_intervention_history.success_count + $4,
        success_rate = (learner_intervention_history.success_count + $4)::float /
                       (learner_intervention_history.usage_count + 1)::float,
        last_used_at = NOW(),
        last_state_before = $6,
        last_state_after = $7`,
      [
        learnerId,
        tenantId,
        interventionId,
        improved === true ? 1 : 0,
        improved === true ? 1 : 0,
        stateBefore,
        stateAfter ?? null,
      ]
    );
  }

  /**
   * Check if a state is an improvement (positive or neutral).
   */
  private isStateImproved(state: EmotionalState): boolean {
    const positiveStates: EmotionalState[] = [
      'CALM',
      'FOCUSED',
      'ENGAGED',
      'HAPPY',
      'EXCITED',
      'PROUD',
      'CURIOUS',
      'NEUTRAL',
    ];
    return positiveStates.includes(state);
  }
}
