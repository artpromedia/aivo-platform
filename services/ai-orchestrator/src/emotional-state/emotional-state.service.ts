/**
 * ND-2.3: Emotional State Service
 *
 * Main service for detecting and analyzing emotional states from behavioral signals.
 * Provides early detection of anxiety and overwhelm patterns, recommends interventions,
 * and tracks intervention effectiveness.
 */

import type { Pool } from 'pg';

import { AnxietyDetector } from './anxiety-detector.js';
import type {
  AnxietyAnalysisResult,
  AnxietyTrigger,
  AnxietyBehavioralIndicators,
  BehavioralSignals,
  ContextualFactors,
  EmotionalState,
  EmotionalStateAnalysis,
  EmotionalStateEvent,
  EmotionalTrend,
  InterventionUrgency,
  OverwhelmAnalysisResult,
  OverwhelmThresholds,
  SessionStateHistory,
  SessionStateSummary,
  StateIndicator,
  SuggestedIntervention,
  isPositiveState,
  CRITICAL_STATES,
  WARNING_STATES,
} from './emotional-state.types.js';
import { InterventionSelector } from './intervention-selector.js';
import { OverwhelmDetector } from './overwhelm-detector.js';
import { PatternAnalyzer } from './pattern-analyzer.js';

/**
 * NATS client interface for publishing events.
 */
interface NatsLike {
  publish(subject: string, data: unknown): Promise<void>;
}

/**
 * Configuration for the EmotionalStateService.
 */
export interface EmotionalStateServiceConfig {
  /** NATS client for publishing events */
  nats?: NatsLike;
  /** Enable auto-adjustment of thresholds */
  enableAutoAdjust?: boolean;
}

export class EmotionalStateService {
  private anxietyDetector: AnxietyDetector;
  private overwhelmDetector: OverwhelmDetector;
  private patternAnalyzer: PatternAnalyzer;
  private interventionSelector: InterventionSelector;
  private nats?: NatsLike;
  private enableAutoAdjust: boolean;

  constructor(
    private pool: Pool,
    config: EmotionalStateServiceConfig = {}
  ) {
    this.anxietyDetector = new AnxietyDetector();
    this.overwhelmDetector = new OverwhelmDetector();
    this.patternAnalyzer = new PatternAnalyzer(pool);
    this.interventionSelector = new InterventionSelector(pool);
    this.nats = config.nats;
    this.enableAutoAdjust = config.enableAutoAdjust ?? true;
  }

  /**
   * Analyze current emotional state from behavioral signals.
   */
  async analyzeState(
    learnerId: string,
    tenantId: string,
    sessionId: string,
    signals: BehavioralSignals,
    context: ContextualFactors
  ): Promise<EmotionalStateAnalysis> {
    // Get learner's historical patterns and thresholds
    const [patterns, thresholds, recentStates] = await Promise.all([
      this.patternAnalyzer.getPatterns(learnerId),
      this.patternAnalyzer.getThresholds(learnerId, tenantId),
      this.getRecentStates(sessionId, 10),
    ]);

    // Detect anxiety signals
    const anxietyAnalysis = this.anxietyDetector.analyze(signals, context, patterns, thresholds);

    // Detect overwhelm signals
    const overwhelmAnalysis = this.overwhelmDetector.analyze(signals, context, thresholds);

    // Determine primary emotional state
    const stateAnalysis = this.determineState(
      signals,
      context,
      anxietyAnalysis,
      overwhelmAnalysis,
      recentStates
    );

    // Calculate trend
    const trend = this.calculateTrend(stateAnalysis, recentStates);

    // Build indicators list
    const indicators = this.buildIndicators(signals, context, anxietyAnalysis, overwhelmAnalysis);

    // Determine if intervention is needed
    const interventionAnalysis = await this.assessInterventionNeed(
      stateAnalysis,
      trend,
      anxietyAnalysis,
      overwhelmAnalysis
    );

    // Get suggested interventions if needed
    let suggestedInterventions: SuggestedIntervention[] = [];
    if (interventionAnalysis.recommend) {
      suggestedInterventions = await this.interventionSelector.selectInterventions(
        stateAnalysis.primaryState,
        stateAnalysis.intensity,
        learnerId,
        tenantId,
        context
      );
    }

    const analysis: EmotionalStateAnalysis = {
      primaryState: stateAnalysis.primaryState,
      secondaryState: stateAnalysis.secondaryState,
      confidence: stateAnalysis.confidence,
      intensity: stateAnalysis.intensity,
      trend,
      anxietyRisk: anxietyAnalysis.riskLevel,
      overwhelmRisk: overwhelmAnalysis.riskLevel,
      meltdownRisk: this.calculateMeltdownRisk(anxietyAnalysis, overwhelmAnalysis, trend),
      indicators,
      recommendIntervention: interventionAnalysis.recommend,
      suggestedInterventions,
      urgency: interventionAnalysis.urgency,
    };

    // Log state event
    await this.logStateEvent(sessionId, learnerId, tenantId, analysis, context);

    // Emit real-time event if concerning
    if (analysis.urgency !== 'none' && this.nats) {
      await this.emitStateAlert(sessionId, learnerId, tenantId, analysis);
    }

    // Learn from anxiety patterns
    if (anxietyAnalysis.riskLevel >= 5 && anxietyAnalysis.triggers.length > 0) {
      await this.learnAnxietyPattern(
        learnerId,
        tenantId,
        anxietyAnalysis,
        signals,
        context,
        stateAnalysis.intensity
      );
    }

    // Periodically auto-adjust thresholds
    if (this.enableAutoAdjust && Math.random() < 0.05) {
      // 5% chance per analysis
      this.patternAnalyzer.autoAdjustThresholds(learnerId, tenantId).catch((err: unknown) => {
        console.error('Failed to auto-adjust thresholds:', err);
      });
    }

    return analysis;
  }

  /**
   * Record intervention outcome.
   */
  async recordInterventionOutcome(
    sessionId: string,
    learnerId: string,
    tenantId: string,
    interventionId: string,
    accepted: boolean,
    stateAfter?: EmotionalState,
    _feedback?: string
  ): Promise<void> {
    // Update the most recent state event with intervention outcome
    await this.pool.query(
      `UPDATE emotional_state_events
       SET
         intervention_accepted = $1,
         state_after_intervention = $2,
         state_improved = $3
       WHERE session_id = $4
       AND learner_id = $5
       AND intervention_triggered = TRUE
       AND intervention_accepted IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [
        accepted,
        stateAfter ?? null,
        stateAfter ? isPositiveState(stateAfter) : null,
        sessionId,
        learnerId,
      ]
    );

    // Get the state before intervention
    const stateBeforeResult = await this.pool.query<{ primary_state: EmotionalState }>(
      `SELECT primary_state
       FROM emotional_state_events
       WHERE session_id = $1
       AND learner_id = $2
       AND intervention_id = $3
       ORDER BY created_at DESC
       LIMIT 1`,
      [sessionId, learnerId, interventionId]
    );

    const stateBefore = stateBeforeResult.rows[0]?.primary_state ?? 'NEUTRAL';

    // Update intervention effectiveness tracking
    await this.interventionSelector.recordInterventionUsage(
      learnerId,
      tenantId,
      interventionId,
      stateBefore,
      stateAfter,
      accepted
    );

    // Update learner-specific intervention preferences
    if (accepted && stateAfter) {
      const improved = isPositiveState(stateAfter);
      await this.patternAnalyzer.updateEffectiveIntervention(learnerId, interventionId, improved);
    }

    // Publish event
    if (this.nats) {
      await this.nats.publish('emotional.intervention.outcome', {
        sessionId,
        learnerId,
        tenantId,
        interventionId,
        accepted,
        stateAfter,
        improved: stateAfter ? isPositiveState(stateAfter) : null,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get emotional state history for a session.
   */
  async getSessionStateHistory(sessionId: string): Promise<SessionStateHistory> {
    const result = await this.pool.query<{
      id: string;
      session_id: string;
      learner_id: string;
      tenant_id: string;
      primary_state: EmotionalState;
      secondary_state: EmotionalState | null;
      confidence: number;
      state_intensity: number;
      state_details: unknown;
      detection_source: string[];
      activity_id: string | null;
      activity_type: string | null;
      content_id: string | null;
      time_in_activity_seconds: number | null;
      time_since_last_break: number | null;
      consecutive_errors: number;
      intervention_triggered: boolean;
      intervention_type: string | null;
      intervention_id: string | null;
      intervention_accepted: boolean | null;
      state_after_intervention: EmotionalState | null;
      state_improved: boolean | null;
      created_at: Date;
    }>(
      `SELECT *
       FROM emotional_state_events
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [sessionId]
    );

    const states: EmotionalStateEvent[] = result.rows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      learnerId: row.learner_id,
      tenantId: row.tenant_id,
      primaryState: row.primary_state,
      secondaryState: row.secondary_state ?? undefined,
      confidence: row.confidence,
      stateIntensity: row.state_intensity,
      stateDetails: row.state_details as EmotionalStateEvent['stateDetails'],
      detectionSource: row.detection_source,
      activityId: row.activity_id ?? undefined,
      activityType: row.activity_type ?? undefined,
      contentId: row.content_id ?? undefined,
      timeInActivitySeconds: row.time_in_activity_seconds ?? undefined,
      timeSinceLastBreak: row.time_since_last_break ?? undefined,
      consecutiveErrors: row.consecutive_errors,
      interventionTriggered: row.intervention_triggered,
      interventionType: row.intervention_type as EmotionalStateEvent['interventionType'],
      interventionId: row.intervention_id ?? undefined,
      interventionAccepted: row.intervention_accepted ?? undefined,
      stateAfterIntervention: row.state_after_intervention ?? undefined,
      stateImproved: row.state_improved ?? undefined,
      createdAt: row.created_at,
    }));

    if (states.length === 0) {
      return {
        states: [],
        summary: {
          predominantState: 'NEUTRAL',
          averageIntensity: 5,
          stateTransitions: 0,
          interventionsTriggered: 0,
          interventionsAccepted: 0,
          overallTrend: 'stable',
        },
      };
    }

    const summary = this.calculateSessionSummary(states);

    return { states, summary };
  }

  /**
   * Get or update overwhelm thresholds for a learner.
   */
  async getThresholds(learnerId: string, tenantId: string): Promise<OverwhelmThresholds> {
    return this.patternAnalyzer.getThresholds(learnerId, tenantId);
  }

  /**
   * Update overwhelm thresholds for a learner.
   */
  async updateThresholds(
    learnerId: string,
    tenantId: string,
    updates: Partial<Omit<OverwhelmThresholds, 'learnerId' | 'tenantId'>>
  ): Promise<OverwhelmThresholds> {
    return this.patternAnalyzer.updateThresholds(learnerId, tenantId, updates);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get recent emotional state events for a session.
   */
  private async getRecentStates(sessionId: string, limit: number): Promise<EmotionalStateEvent[]> {
    const result = await this.pool.query<{
      id: string;
      session_id: string;
      learner_id: string;
      tenant_id: string;
      primary_state: EmotionalState;
      secondary_state: EmotionalState | null;
      confidence: number;
      state_intensity: number;
      state_details: unknown;
      detection_source: string[];
      consecutive_errors: number;
      intervention_triggered: boolean;
      intervention_type: string | null;
      created_at: Date;
    }>(
      `SELECT
        id, session_id, learner_id, tenant_id,
        primary_state, secondary_state, confidence,
        state_intensity, state_details, detection_source,
        consecutive_errors, intervention_triggered, intervention_type,
        created_at
       FROM emotional_state_events
       WHERE session_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [sessionId, limit]
    );

    return result.rows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      learnerId: row.learner_id,
      tenantId: row.tenant_id,
      primaryState: row.primary_state,
      secondaryState: row.secondary_state ?? undefined,
      confidence: row.confidence,
      stateIntensity: row.state_intensity,
      stateDetails: row.state_details as EmotionalStateEvent['stateDetails'],
      detectionSource: row.detection_source,
      consecutiveErrors: row.consecutive_errors,
      interventionTriggered: row.intervention_triggered,
      interventionType: row.intervention_type as EmotionalStateEvent['interventionType'],
      createdAt: row.created_at,
    }));
  }

  /**
   * Determine the primary emotional state from analysis results.
   */
  private determineState(
    signals: BehavioralSignals,
    context: ContextualFactors,
    anxietyAnalysis: AnxietyAnalysisResult,
    overwhelmAnalysis: OverwhelmAnalysisResult,
    _recentStates: EmotionalStateEvent[]
  ): {
    primaryState: EmotionalState;
    secondaryState?: EmotionalState;
    confidence: number;
    intensity: number;
  } {
    let primaryState: EmotionalState = 'NEUTRAL';
    let secondaryState: EmotionalState | undefined;
    let confidence = 0.5;
    let intensity = 5;

    // Check for critical states first
    if (overwhelmAnalysis.riskLevel >= 8) {
      if (anxietyAnalysis.riskLevel >= 8) {
        primaryState = 'MELTDOWN_RISK';
        intensity = 9;
        confidence = 0.9;
      } else {
        primaryState = 'SHUTDOWN_RISK';
        intensity = 8;
        confidence = 0.85;
      }
      return { primaryState, confidence, intensity };
    }

    // High anxiety
    if (anxietyAnalysis.riskLevel >= 7) {
      primaryState = 'HIGHLY_ANXIOUS';
      intensity = anxietyAnalysis.riskLevel;
      confidence = anxietyAnalysis.confidence;

      if (overwhelmAnalysis.riskLevel >= 5) {
        secondaryState = 'OVERWHELMED';
      }
      return { primaryState, secondaryState, confidence, intensity };
    }

    // Moderate anxiety
    if (anxietyAnalysis.riskLevel >= 5) {
      primaryState = 'ANXIOUS';
      intensity = anxietyAnalysis.riskLevel;
      confidence = anxietyAnalysis.confidence;
      return { primaryState, confidence, intensity };
    }

    // Overwhelm without high anxiety
    if (overwhelmAnalysis.riskLevel >= 7) {
      primaryState = 'OVERWHELMED';
      intensity = overwhelmAnalysis.riskLevel;
      confidence = overwhelmAnalysis.confidence;
      return { primaryState, confidence, intensity };
    }

    // Check for frustration
    if (
      signals.consecutiveErrors >= 3 ||
      (signals.responseTimeVariance > 2 && signals.errorRate > 0.5)
    ) {
      if (signals.consecutiveErrors >= 5) {
        primaryState = 'HIGHLY_FRUSTRATED';
        intensity = 7;
      } else {
        primaryState = 'FRUSTRATED';
        intensity = 5 + signals.consecutiveErrors;
      }
      confidence = 0.75;
      return { primaryState, confidence, intensity };
    }

    // Check for stress/worry
    if (anxietyAnalysis.riskLevel >= 3) {
      if (context.isAssessment || context.hasTimeLimit) {
        primaryState = 'STRESSED';
      } else {
        primaryState = 'WORRIED';
      }
      intensity = anxietyAnalysis.riskLevel + 2;
      confidence = 0.65;
      return { primaryState, confidence, intensity };
    }

    // Check for positive states
    if (signals.consecutiveCorrect >= 3 && signals.errorRate < 0.2) {
      if (signals.responseTimeMs < signals.averageResponseTimeMs * 0.8) {
        primaryState = 'ENGAGED';
        intensity = 3;
      } else {
        primaryState = 'FOCUSED';
        intensity = 2;
      }
      confidence = 0.7;
      return { primaryState, confidence, intensity };
    }

    // Check for confusion
    if (signals.backtrackCount >= 2 || signals.hintUsageCount >= 2) {
      primaryState = 'CONFUSED';
      intensity = 4 + signals.backtrackCount;
      confidence = 0.6;
      return { primaryState, confidence, intensity };
    }

    // Check for distraction
    if (signals.focusLossCount >= 2 || signals.idleTimeMs > 30000) {
      primaryState = 'DISTRACTED';
      intensity = 4;
      confidence = 0.65;
      return { primaryState, confidence, intensity };
    }

    // Check for tiredness
    if (context.sessionDurationMinutes > context.typicalSessionLength * 1.2) {
      primaryState = 'TIRED';
      intensity = 5;
      confidence = 0.55;
      return { primaryState, confidence, intensity };
    }

    // Explicit signals override
    if (signals.explicitMoodRating !== undefined) {
      if (signals.explicitMoodRating <= 2) {
        primaryState = 'STRESSED';
        intensity = 6;
        confidence = 0.9;
      } else if (signals.explicitMoodRating >= 4) {
        primaryState = 'HAPPY';
        intensity = 2;
        confidence = 0.9;
      }
    }

    if (signals.requestedBreak) {
      secondaryState = primaryState;
      primaryState = 'TIRED';
      intensity = 5;
      confidence = 0.85;
    }

    // Default to calm if signals are normal
    if (
      primaryState === 'NEUTRAL' &&
      signals.errorRate < 0.3 &&
      signals.responseTimeVariance < 1.5
    ) {
      primaryState = 'CALM';
      intensity = 2;
      confidence = 0.5;
    }

    return { primaryState, secondaryState, confidence, intensity };
  }

  /**
   * Calculate trend compared to recent states.
   */
  private calculateTrend(
    current: { intensity: number },
    recentStates: EmotionalStateEvent[]
  ): EmotionalTrend {
    if (recentStates.length < 3) {
      return 'stable';
    }

    const recentIntensities = recentStates.slice(0, 5).map((s) => s.stateIntensity);
    const avgRecent = recentIntensities.reduce((a, b) => a + b, 0) / recentIntensities.length;
    const diff = current.intensity - avgRecent;

    if (diff >= 3) {
      return 'rapid_decline';
    } else if (diff >= 1) {
      return 'declining';
    } else if (diff <= -1) {
      return 'improving';
    }
    return 'stable';
  }

  /**
   * Build list of indicators from analysis results.
   */
  private buildIndicators(
    signals: BehavioralSignals,
    context: ContextualFactors,
    anxietyAnalysis: AnxietyAnalysisResult,
    overwhelmAnalysis: OverwhelmAnalysisResult
  ): StateIndicator[] {
    const indicators: StateIndicator[] = [];

    // Response time indicator
    const responseTimeRatio = signals.responseTimeMs / signals.averageResponseTimeMs;
    if (responseTimeRatio > 1.5 || responseTimeRatio < 0.5) {
      indicators.push({
        type: 'timing',
        signal: 'response_time',
        value: responseTimeRatio,
        normalRange: { min: 0.7, max: 1.3 },
        contribution: responseTimeRatio > 1.5 ? 0.6 : 0.4,
        description:
          responseTimeRatio > 1.5
            ? 'Responses are slower than usual - may indicate hesitation or overthinking'
            : 'Responses are faster than usual - may indicate rushing or anxiety',
      });
    }

    // Error pattern indicator
    if (signals.consecutiveErrors >= 2) {
      indicators.push({
        type: 'performance',
        signal: 'consecutive_errors',
        value: signals.consecutiveErrors,
        normalRange: { min: 0, max: 2 },
        contribution: Math.min(0.8, signals.consecutiveErrors * 0.2),
        description: `${signals.consecutiveErrors} errors in a row - may be struggling with material`,
      });
    }

    // Time on task indicator
    if (context.sessionDurationMinutes > context.typicalSessionLength) {
      indicators.push({
        type: 'fatigue',
        signal: 'session_duration',
        value: context.sessionDurationMinutes,
        normalRange: { min: 0, max: context.typicalSessionLength },
        contribution: 0.5,
        description: 'Session is longer than typical - fatigue may be setting in',
      });
    }

    // Break indicator
    if (context.lastBreakMinutesAgo > 15) {
      indicators.push({
        type: 'regulation',
        signal: 'time_since_break',
        value: context.lastBreakMinutesAgo,
        normalRange: { min: 0, max: 15 },
        contribution: Math.min(0.6, context.lastBreakMinutesAgo * 0.03),
        description: 'Has been working without a break - may need regulation time',
      });
    }

    // Add anxiety-specific indicators
    for (const indicator of anxietyAnalysis.indicators) {
      indicators.push(indicator);
    }

    // Add overwhelm-specific indicators
    for (const indicator of overwhelmAnalysis.indicators) {
      indicators.push(indicator);
    }

    return indicators;
  }

  /**
   * Assess whether intervention is needed.
   */
  private async assessInterventionNeed(
    stateAnalysis: { primaryState: EmotionalState; intensity: number },
    trend: EmotionalTrend,
    anxietyAnalysis: AnxietyAnalysisResult,
    overwhelmAnalysis: OverwhelmAnalysisResult
  ): Promise<{ recommend: boolean; urgency: InterventionUrgency }> {
    // Immediate intervention for critical states
    if ((CRITICAL_STATES as readonly string[]).includes(stateAnalysis.primaryState)) {
      return { recommend: true, urgency: 'immediate' };
    }

    // High urgency for rapid decline
    if (trend === 'rapid_decline') {
      return { recommend: true, urgency: 'high' };
    }

    // Medium urgency for warning states with high intensity
    if (
      (WARNING_STATES as readonly string[]).includes(stateAnalysis.primaryState) &&
      stateAnalysis.intensity >= 6
    ) {
      return { recommend: true, urgency: 'medium' };
    }

    // Low urgency for warning states with declining trend
    if (
      (WARNING_STATES as readonly string[]).includes(stateAnalysis.primaryState) &&
      trend === 'declining'
    ) {
      return { recommend: true, urgency: 'low' };
    }

    // Check risk levels
    if (anxietyAnalysis.riskLevel >= 6 || overwhelmAnalysis.riskLevel >= 6) {
      return { recommend: true, urgency: 'medium' };
    }

    return { recommend: false, urgency: 'none' };
  }

  /**
   * Calculate meltdown risk from anxiety and overwhelm.
   */
  private calculateMeltdownRisk(
    anxietyAnalysis: AnxietyAnalysisResult,
    overwhelmAnalysis: OverwhelmAnalysisResult,
    trend: EmotionalTrend
  ): number {
    let risk = 0;

    // Base risk from anxiety and overwhelm
    risk += anxietyAnalysis.riskLevel * 0.4;
    risk += overwhelmAnalysis.riskLevel * 0.4;

    // Trend multiplier
    if (trend === 'rapid_decline') {
      risk *= 1.5;
    } else if (trend === 'declining') {
      risk *= 1.2;
    }

    return Math.min(10, risk);
  }

  /**
   * Log emotional state event to database.
   */
  private async logStateEvent(
    sessionId: string,
    learnerId: string,
    tenantId: string,
    analysis: EmotionalStateAnalysis,
    context: ContextualFactors
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO emotional_state_events (
        session_id,
        learner_id,
        tenant_id,
        primary_state,
        secondary_state,
        confidence,
        state_intensity,
        state_details,
        detection_source,
        activity_type,
        time_in_activity_seconds,
        time_since_last_break,
        intervention_triggered,
        intervention_type,
        intervention_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        sessionId,
        learnerId,
        tenantId,
        analysis.primaryState,
        analysis.secondaryState ?? null,
        analysis.confidence,
        analysis.intensity,
        JSON.stringify({
          trend: analysis.trend,
          anxietyRisk: analysis.anxietyRisk,
          overwhelmRisk: analysis.overwhelmRisk,
          indicators: analysis.indicators,
        }),
        analysis.indicators.map((i) => i.type),
        context.activityType,
        context.sessionDurationMinutes * 60,
        context.lastBreakMinutesAgo * 60,
        analysis.recommendIntervention,
        analysis.suggestedInterventions[0]?.interventionType ?? null,
        analysis.suggestedInterventions[0]?.interventionId ?? null,
      ]
    );
  }

  /**
   * Emit real-time alert for concerning state.
   */
  private async emitStateAlert(
    sessionId: string,
    learnerId: string,
    tenantId: string,
    analysis: EmotionalStateAnalysis
  ): Promise<void> {
    if (!this.nats) return;

    await this.nats.publish('emotional.state.alert', {
      sessionId,
      learnerId,
      tenantId,
      state: analysis.primaryState,
      intensity: analysis.intensity,
      urgency: analysis.urgency,
      suggestedInterventions: analysis.suggestedInterventions,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Learn from anxiety patterns for future detection.
   */
  private async learnAnxietyPattern(
    learnerId: string,
    tenantId: string,
    anxietyAnalysis: AnxietyAnalysisResult,
    signals: BehavioralSignals,
    context: ContextualFactors,
    intensity: number
  ): Promise<void> {
    // Build triggers from context
    const triggers: AnxietyTrigger[] = [];

    if (context.isAssessment) {
      triggers.push({ type: 'activity', value: 'assessment', weight: 0.8 });
    }
    if (context.hasTimeLimit) {
      triggers.push({ type: 'time', value: 'time_limit', weight: 0.6 });
    }
    if (context.isNewContent) {
      triggers.push({ type: 'content', value: 'new', weight: 0.5 });
    }
    if (signals.consecutiveErrors >= 3) {
      triggers.push({ type: 'performance', value: 'errors', weight: 0.7 });
    }

    // Build behavioral indicators
    const behavioralIndicators: AnxietyBehavioralIndicators = {};

    const responseRatio = signals.responseTimeMs / signals.averageResponseTimeMs;
    if (responseRatio > 1.5) {
      behavioralIndicators.responseTimeChange = 'increasing';
    } else if (responseRatio < 0.7) {
      behavioralIndicators.responseTimeChange = 'decreasing';
    } else if (signals.responseTimeVariance > 2) {
      behavioralIndicators.responseTimeChange = 'erratic';
    }

    if (signals.skipCount >= 2) {
      behavioralIndicators.contentAvoidance = true;
    }

    if (signals.helpRequestCount === 0 && signals.consecutiveErrors >= 2) {
      behavioralIndicators.helpSeekingChange = 'decreased';
    } else if (signals.helpRequestCount >= 3) {
      behavioralIndicators.helpSeekingChange = 'increased';
    }

    // Record the pattern
    await this.patternAnalyzer.recordPatternOccurrence(
      learnerId,
      tenantId,
      anxietyAnalysis.anxietyType,
      this.getPatternName(anxietyAnalysis.anxietyType),
      triggers,
      behavioralIndicators,
      intensity
    );
  }

  /**
   * Get human-readable pattern name.
   */
  private getPatternName(anxietyType: string): string {
    const names: Record<string, string> = {
      performance: 'Performance Anxiety',
      time_pressure: 'Time Pressure Anxiety',
      new_content: 'New Content Anxiety',
      social: 'Social Anxiety',
      unknown: 'General Anxiety',
    };
    return names[anxietyType] ?? 'Anxiety Pattern';
  }

  /**
   * Calculate session summary statistics.
   */
  private calculateSessionSummary(states: EmotionalStateEvent[]): SessionStateSummary {
    const stateCounts: Record<string, number> = {};
    let totalIntensity = 0;
    let transitions = 0;
    let interventions = 0;
    let acceptedInterventions = 0;

    for (let i = 0; i < states.length; i++) {
      const state = states[i];
      stateCounts[state.primaryState] = (stateCounts[state.primaryState] ?? 0) + 1;
      totalIntensity += state.stateIntensity;

      if (i > 0 && states[i - 1].primaryState !== state.primaryState) {
        transitions++;
      }

      if (state.interventionTriggered) {
        interventions++;
        if (state.interventionAccepted) {
          acceptedInterventions++;
        }
      }
    }

    const predominantState = Object.entries(stateCounts).sort(
      (a, b) => b[1] - a[1]
    )[0][0] as EmotionalState;

    // Calculate overall trend
    const firstHalfIntensity =
      states.slice(0, Math.floor(states.length / 2)).reduce((sum, s) => sum + s.stateIntensity, 0) /
      Math.floor(states.length / 2);

    const secondHalfIntensity =
      states.slice(Math.floor(states.length / 2)).reduce((sum, s) => sum + s.stateIntensity, 0) /
      (states.length - Math.floor(states.length / 2));

    let overallTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (secondHalfIntensity - firstHalfIntensity > 1) {
      overallTrend = 'declining';
    } else if (firstHalfIntensity - secondHalfIntensity > 1) {
      overallTrend = 'improving';
    }

    return {
      predominantState,
      averageIntensity: totalIntensity / states.length,
      stateTransitions: transitions,
      interventionsTriggered: interventions,
      interventionsAccepted: acceptedInterventions,
      overallTrend,
    };
  }
}
