/**
 * RealTimeProactiveAgent
 *
 * Continuous monitoring agent ported from legacy-agentic-app.
 * Provides real-time, proactive interventions for learners:
 * - Focus state monitoring and intervention suggestions
 * - Emotional state detection and regulation support
 * - Learning pattern analysis and optimization
 * - Proactive break recommendations
 * - Engagement drop detection and re-engagement
 * - Frustration detection and scaffolding
 *
 * @module ai-orchestrator/agents/realtime-proactive-agent
 */

import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { Pool } from 'pg';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

export interface ProactiveAgentConfig {
  monitoringIntervalMs: number;
  focusCheckIntervalMs: number;
  emotionCheckIntervalMs: number;
  maxConcurrentLearners: number;
  interventionCooldownMs: number;
  enableAutomaticInterventions: boolean;
  notifyTeacherThreshold: number;
}

export interface LearnerMonitoringState {
  learnerId: string;
  tenantId: string;
  sessionId: string;
  monitoringSince: Date;
  lastActivityAt: Date;
  currentActivity: ActivityState;
  focusHistory: FocusDataPoint[];
  emotionalHistory: EmotionalDataPoint[];
  interventionHistory: InterventionRecord[];
  patterns: DetectedPattern[];
  alerts: ActiveAlert[];
}

export interface ActivityState {
  type: ActivityType;
  contentId?: string;
  contentTitle?: string;
  domain?: string;
  skill?: string;
  difficulty?: number;
  startedAt: Date;
  progressPercent: number;
  interactionCount: number;
  errorCount: number;
  successCount: number;
}

export type ActivityType =
  | 'LEARNING'
  | 'ASSESSMENT'
  | 'PRACTICE'
  | 'HOMEWORK'
  | 'AI_TUTOR'
  | 'BREAK'
  | 'IDLE';

export interface FocusDataPoint {
  timestamp: Date;
  focusScore: number; // 0-100
  focusState: FocusState;
  indicators: FocusIndicators;
}

export type FocusState =
  | 'HIGHLY_FOCUSED'
  | 'FOCUSED'
  | 'NEUTRAL'
  | 'DISTRACTED'
  | 'DISENGAGED';

export interface FocusIndicators {
  responseTime: number; // ms
  interactionFrequency: number; // per minute
  errorRate: number; // percentage
  idleTime: number; // seconds
  taskSwitching: number; // count
  scrollPattern: 'steady' | 'erratic' | 'minimal';
}

export interface EmotionalDataPoint {
  timestamp: Date;
  emotionalState: EmotionalState;
  confidence: number;
  indicators: EmotionalIndicators;
}

export type EmotionalState =
  | 'HAPPY'
  | 'ENGAGED'
  | 'NEUTRAL'
  | 'CONFUSED'
  | 'FRUSTRATED'
  | 'ANXIOUS'
  | 'BORED'
  | 'OVERWHELMED';

export interface EmotionalIndicators {
  rapidClicking: boolean;
  deletionPattern: boolean;
  longPauses: boolean;
  helpSeeking: boolean;
  repetitiveErrors: boolean;
  avoidanceBehavior: boolean;
}

export interface InterventionRecord {
  id: string;
  type: InterventionType;
  triggeredAt: Date;
  triggeredBy: TriggerReason;
  content: InterventionContent;
  response?: InterventionResponse;
  effectiveness?: number; // 0-100
}

export type InterventionType =
  | 'GENTLE_NUDGE'
  | 'BREAK_SUGGESTION'
  | 'DIFFICULTY_ADJUSTMENT'
  | 'ENCOURAGEMENT'
  | 'SCAFFOLDING'
  | 'REGULATION_ACTIVITY'
  | 'CONTENT_SWITCH'
  | 'TEACHER_ALERT';

export type TriggerReason =
  | 'FOCUS_DROP'
  | 'EXTENDED_IDLE'
  | 'FRUSTRATION_DETECTED'
  | 'ERROR_PATTERN'
  | 'TIME_LIMIT'
  | 'BREAK_NEEDED'
  | 'ENGAGEMENT_DROP'
  | 'STRUGGLE_DETECTED'
  | 'OVERWHELM_DETECTED'
  | 'SCHEDULED';

export interface InterventionContent {
  message: string;
  action?: string;
  options?: string[];
  suggestedActivity?: string;
  duration?: number;
}

export interface InterventionResponse {
  accepted: boolean;
  selectedOption?: string;
  respondedAt: Date;
  feedback?: string;
}

export interface DetectedPattern {
  id: string;
  type: PatternType;
  description: string;
  confidence: number;
  firstDetectedAt: Date;
  lastObservedAt: Date;
  occurrences: number;
  actionable: boolean;
  suggestedAction?: string;
}

export type PatternType =
  | 'OPTIMAL_TIME_OF_DAY'
  | 'BREAK_FREQUENCY_NEED'
  | 'DIFFICULTY_SWEET_SPOT'
  | 'CONTENT_TYPE_PREFERENCE'
  | 'FRUSTRATION_TRIGGER'
  | 'ENGAGEMENT_BOOSTER'
  | 'FOCUS_PATTERN'
  | 'LEARNING_VELOCITY';

export interface ActiveAlert {
  id: string;
  type: AlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  triggeredAt: Date;
  acknowledged: boolean;
  escalated: boolean;
  escalatedTo?: string;
}

export type AlertType =
  | 'SUSTAINED_DISENGAGEMENT'
  | 'EMOTIONAL_DISTRESS'
  | 'REPEATED_FAILURE'
  | 'EXTENDED_ABSENCE'
  | 'UNUSUAL_BEHAVIOR'
  | 'HELP_NEEDED';

// ════════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: ProactiveAgentConfig = {
  monitoringIntervalMs: 5000, // Check every 5 seconds
  focusCheckIntervalMs: 30000, // Analyze focus every 30 seconds
  emotionCheckIntervalMs: 60000, // Analyze emotion every minute
  maxConcurrentLearners: 1000,
  interventionCooldownMs: 300000, // 5 minute cooldown between interventions
  enableAutomaticInterventions: true,
  notifyTeacherThreshold: 70, // Alert teacher if issues persist at 70% severity
};

// ════════════════════════════════════════════════════════════════════════════════
// REALTIME PROACTIVE AGENT
// ════════════════════════════════════════════════════════════════════════════════

export class RealTimeProactiveAgent extends EventEmitter {
  private readonly pool: Pool;
  private readonly redis: Redis;
  private readonly config: ProactiveAgentConfig;
  private readonly monitoredLearners: Map<string, LearnerMonitoringState> = new Map();
  private monitoringInterval: ReturnType<typeof setInterval> | null = null;
  private focusInterval: ReturnType<typeof setInterval> | null = null;
  private emotionInterval: ReturnType<typeof setInterval> | null = null;
  private readonly cachePrefix = 'proactive_agent';

  constructor(pool: Pool, redis: Redis, config?: Partial<ProactiveAgentConfig>) {
    super();
    this.pool = pool;
    this.redis = redis;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the proactive monitoring agent
   */
  start(): void {
    // Start main monitoring loop
    this.monitoringInterval = setInterval(() => {
      this.runMonitoringCycle();
    }, this.config.monitoringIntervalMs);

    // Start focus analysis loop
    this.focusInterval = setInterval(() => {
      this.runFocusAnalysis();
    }, this.config.focusCheckIntervalMs);

    // Start emotion analysis loop
    this.emotionInterval = setInterval(() => {
      this.runEmotionAnalysis();
    }, this.config.emotionCheckIntervalMs);

    console.log('RealTimeProactiveAgent started');
    this.emit('agent:started');
  }

  /**
   * Stop the proactive monitoring agent
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    if (this.focusInterval) {
      clearInterval(this.focusInterval);
      this.focusInterval = null;
    }
    if (this.emotionInterval) {
      clearInterval(this.emotionInterval);
      this.emotionInterval = null;
    }

    this.monitoredLearners.clear();
    console.log('RealTimeProactiveAgent stopped');
    this.emit('agent:stopped');
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // LEARNER SESSION MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Start monitoring a learner's session
   */
  async startMonitoring(params: {
    learnerId: string;
    tenantId: string;
    sessionId: string;
    initialActivity?: ActivityState;
  }): Promise<LearnerMonitoringState> {
    const key = this.getLearnerKey(params.tenantId, params.learnerId);

    if (this.monitoredLearners.size >= this.config.maxConcurrentLearners) {
      throw new Error('Maximum concurrent learners reached');
    }

    const state: LearnerMonitoringState = {
      learnerId: params.learnerId,
      tenantId: params.tenantId,
      sessionId: params.sessionId,
      monitoringSince: new Date(),
      lastActivityAt: new Date(),
      currentActivity: params.initialActivity ?? {
        type: 'IDLE',
        startedAt: new Date(),
        progressPercent: 0,
        interactionCount: 0,
        errorCount: 0,
        successCount: 0,
      },
      focusHistory: [],
      emotionalHistory: [],
      interventionHistory: [],
      patterns: [],
      alerts: [],
    };

    this.monitoredLearners.set(key, state);

    // Cache state
    await this.cacheState(state);

    this.emit('monitoring:started', { learnerId: params.learnerId, sessionId: params.sessionId });

    return state;
  }

  /**
   * Stop monitoring a learner's session
   */
  async stopMonitoring(tenantId: string, learnerId: string): Promise<void> {
    const key = this.getLearnerKey(tenantId, learnerId);
    const state = this.monitoredLearners.get(key);

    if (state) {
      // Persist final state and patterns
      await this.persistSessionData(state);
      this.monitoredLearners.delete(key);
      await this.redis.del(`${this.cachePrefix}:state:${key}`);

      this.emit('monitoring:stopped', { learnerId, sessionId: state.sessionId });
    }
  }

  /**
   * Record an activity event
   */
  async recordActivity(params: {
    tenantId: string;
    learnerId: string;
    eventType: string;
    data: Record<string, unknown>;
  }): Promise<void> {
    const key = this.getLearnerKey(params.tenantId, params.learnerId);
    const state = this.monitoredLearners.get(key);

    if (!state) return;

    state.lastActivityAt = new Date();

    // Update activity state based on event
    switch (params.eventType) {
      case 'CONTENT_STARTED':
        state.currentActivity = {
          type: 'LEARNING',
          contentId: params.data.contentId as string,
          contentTitle: params.data.contentTitle as string,
          domain: params.data.domain as string,
          skill: params.data.skill as string,
          difficulty: params.data.difficulty as number,
          startedAt: new Date(),
          progressPercent: 0,
          interactionCount: 0,
          errorCount: 0,
          successCount: 0,
        };
        break;

      case 'INTERACTION':
        state.currentActivity.interactionCount++;
        break;

      case 'CORRECT_ANSWER':
        state.currentActivity.successCount++;
        break;

      case 'INCORRECT_ANSWER':
        state.currentActivity.errorCount++;
        break;

      case 'PROGRESS_UPDATE':
        state.currentActivity.progressPercent = params.data.progress as number;
        break;

      case 'CONTENT_COMPLETED':
        state.currentActivity.progressPercent = 100;
        break;

      case 'BREAK_STARTED':
        state.currentActivity = {
          type: 'BREAK',
          startedAt: new Date(),
          progressPercent: 0,
          interactionCount: 0,
          errorCount: 0,
          successCount: 0,
        };
        break;
    }

    await this.cacheState(state);
  }

  /**
   * Record focus indicators
   */
  async recordFocusIndicators(params: {
    tenantId: string;
    learnerId: string;
    indicators: FocusIndicators;
  }): Promise<void> {
    const key = this.getLearnerKey(params.tenantId, params.learnerId);
    const state = this.monitoredLearners.get(key);

    if (!state) return;

    const focusScore = this.calculateFocusScore(params.indicators);
    const focusState = this.determineFocusState(focusScore);

    const dataPoint: FocusDataPoint = {
      timestamp: new Date(),
      focusScore,
      focusState,
      indicators: params.indicators,
    };

    state.focusHistory.push(dataPoint);

    // Keep only last 100 data points
    if (state.focusHistory.length > 100) {
      state.focusHistory = state.focusHistory.slice(-100);
    }

    await this.cacheState(state);

    // Emit focus update event
    this.emit('focus:updated', {
      learnerId: params.learnerId,
      focusScore,
      focusState,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // MONITORING CYCLES
  // ──────────────────────────────────────────────────────────────────────────────

  private async runMonitoringCycle(): Promise<void> {
    for (const [key, state] of this.monitoredLearners) {
      try {
        await this.checkLearnerState(state);
      } catch (error) {
        console.error(`Error monitoring learner ${key}:`, error);
      }
    }
  }

  private async runFocusAnalysis(): Promise<void> {
    for (const [_key, state] of this.monitoredLearners) {
      try {
        await this.analyzeFocusPatterns(state);
      } catch (error) {
        console.error(`Error analyzing focus:`, error);
      }
    }
  }

  private async runEmotionAnalysis(): Promise<void> {
    for (const [_key, state] of this.monitoredLearners) {
      try {
        await this.analyzeEmotionalState(state);
      } catch (error) {
        console.error(`Error analyzing emotion:`, error);
      }
    }
  }

  private async checkLearnerState(state: LearnerMonitoringState): Promise<void> {
    const now = new Date();
    const idleTime = (now.getTime() - state.lastActivityAt.getTime()) / 1000;

    // Check for extended idle
    if (idleTime > 300) { // 5 minutes
      await this.triggerIntervention(state, {
        type: 'GENTLE_NUDGE',
        triggeredBy: 'EXTENDED_IDLE',
        content: {
          message: 'Hey there! Need any help?',
          options: ['I\'m thinking', 'I need help', 'Taking a break'],
        },
      });
    }

    // Check focus trend
    const recentFocus = state.focusHistory.slice(-6); // Last 30 seconds
    if (recentFocus.length >= 3) {
      const avgFocus = recentFocus.reduce((sum, p) => sum + p.focusScore, 0) / recentFocus.length;

      if (avgFocus < 30) {
        await this.triggerIntervention(state, {
          type: 'BREAK_SUGGESTION',
          triggeredBy: 'FOCUS_DROP',
          content: {
            message: 'You seem a bit distracted. How about a quick brain break?',
            suggestedActivity: 'breathing_exercise',
            duration: 2,
          },
        });
      }
    }

    // Check error pattern
    if (state.currentActivity.errorCount > 3 &&
        state.currentActivity.successCount < state.currentActivity.errorCount) {
      await this.triggerIntervention(state, {
        type: 'SCAFFOLDING',
        triggeredBy: 'ERROR_PATTERN',
        content: {
          message: 'This topic seems tricky. Let me help break it down.',
          action: 'show_hint',
        },
      });
    }
  }

  private async analyzeFocusPatterns(state: LearnerMonitoringState): Promise<void> {
    if (state.focusHistory.length < 10) return;

    // Detect time-of-day pattern
    const timeGroups = new Map<string, number[]>();
    for (const point of state.focusHistory) {
      const hour = point.timestamp.getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

      if (!timeGroups.has(timeOfDay)) {
        timeGroups.set(timeOfDay, []);
      }
      timeGroups.get(timeOfDay)!.push(point.focusScore);
    }

    // Find optimal time
    let bestTime = '';
    let bestAvg = 0;
    for (const [time, scores] of timeGroups) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestTime = time;
      }
    }

    if (bestTime && bestAvg > 70) {
      this.addOrUpdatePattern(state, {
        type: 'OPTIMAL_TIME_OF_DAY',
        description: `Learner focuses best in the ${bestTime}`,
        confidence: Math.min(100, bestAvg),
        suggestedAction: `Schedule challenging content for ${bestTime}`,
      });
    }

    // Detect break frequency need
    const focusDrops = state.focusHistory.filter((p, i) =>
      i > 0 && p.focusScore < 40 && state.focusHistory[i - 1].focusScore >= 60
    );

    if (focusDrops.length >= 3) {
      // Calculate average time between drops
      const intervals: number[] = [];
      for (let i = 1; i < focusDrops.length; i++) {
        intervals.push(
          (focusDrops[i].timestamp.getTime() - focusDrops[i - 1].timestamp.getTime()) / 60000
        );
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

      this.addOrUpdatePattern(state, {
        type: 'BREAK_FREQUENCY_NEED',
        description: `Learner needs breaks every ${Math.round(avgInterval)} minutes`,
        confidence: 75,
        suggestedAction: `Schedule breaks every ${Math.round(avgInterval - 5)} minutes`,
      });
    }
  }

  private async analyzeEmotionalState(state: LearnerMonitoringState): Promise<void> {
    // Infer emotional state from behavioral indicators
    const activity = state.currentActivity;
    const recentFocus = state.focusHistory.slice(-12);

    const indicators: EmotionalIndicators = {
      rapidClicking: activity.interactionCount > 30,
      deletionPattern: false, // Would be tracked separately
      longPauses: recentFocus.some(p => p.indicators.idleTime > 30),
      helpSeeking: false, // Would be tracked separately
      repetitiveErrors: activity.errorCount > 5,
      avoidanceBehavior: activity.progressPercent < 10 && activity.interactionCount > 20,
    };

    const emotionalState = this.inferEmotionalState(indicators, recentFocus);

    const dataPoint: EmotionalDataPoint = {
      timestamp: new Date(),
      emotionalState: emotionalState.state,
      confidence: emotionalState.confidence,
      indicators,
    };

    state.emotionalHistory.push(dataPoint);

    // Keep only last 50 data points
    if (state.emotionalHistory.length > 50) {
      state.emotionalHistory = state.emotionalHistory.slice(-50);
    }

    // Trigger interventions based on emotional state
    if (emotionalState.state === 'FRUSTRATED' && emotionalState.confidence > 70) {
      await this.triggerIntervention(state, {
        type: 'REGULATION_ACTIVITY',
        triggeredBy: 'FRUSTRATION_DETECTED',
        content: {
          message: 'Let\'s take a moment to reset. Deep breaths can help!',
          suggestedActivity: 'grounding_exercise',
          duration: 3,
        },
      });
    }

    if (emotionalState.state === 'OVERWHELMED' && emotionalState.confidence > 60) {
      await this.triggerIntervention(state, {
        type: 'DIFFICULTY_ADJUSTMENT',
        triggeredBy: 'OVERWHELM_DETECTED',
        content: {
          message: 'This might be a bit much right now. Let\'s try something easier.',
          action: 'reduce_difficulty',
        },
      });
    }

    // Create alert for sustained negative states
    const recentEmotions = state.emotionalHistory.slice(-5);
    const negativeCount = recentEmotions.filter(e =>
      ['FRUSTRATED', 'ANXIOUS', 'OVERWHELMED'].includes(e.emotionalState)
    ).length;

    if (negativeCount >= 4) {
      await this.createAlert(state, {
        type: 'EMOTIONAL_DISTRESS',
        severity: 'high',
        message: `Learner showing sustained signs of ${recentEmotions[recentEmotions.length - 1].emotionalState.toLowerCase()}`,
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // INTERVENTIONS
  // ──────────────────────────────────────────────────────────────────────────────

  private async triggerIntervention(
    state: LearnerMonitoringState,
    intervention: {
      type: InterventionType;
      triggeredBy: TriggerReason;
      content: InterventionContent;
    }
  ): Promise<void> {
    // Check cooldown
    const lastIntervention = state.interventionHistory[state.interventionHistory.length - 1];
    if (lastIntervention) {
      const timeSince = Date.now() - lastIntervention.triggeredAt.getTime();
      if (timeSince < this.config.interventionCooldownMs) {
        return; // Still in cooldown
      }
    }

    // Check if similar intervention was recently rejected
    const recentSimilar = state.interventionHistory
      .slice(-5)
      .find(i => i.type === intervention.type && !i.response?.accepted);

    if (recentSimilar) {
      return; // Don't repeat rejected intervention types
    }

    const record: InterventionRecord = {
      id: this.generateId('int'),
      type: intervention.type,
      triggeredAt: new Date(),
      triggeredBy: intervention.triggeredBy,
      content: intervention.content,
    };

    state.interventionHistory.push(record);

    // Keep only last 50 interventions
    if (state.interventionHistory.length > 50) {
      state.interventionHistory = state.interventionHistory.slice(-50);
    }

    await this.cacheState(state);

    // Emit intervention event
    if (this.config.enableAutomaticInterventions) {
      this.emit('intervention:triggered', {
        learnerId: state.learnerId,
        tenantId: state.tenantId,
        sessionId: state.sessionId,
        intervention: record,
      });
    }
  }

  /**
   * Record response to an intervention
   */
  async recordInterventionResponse(params: {
    tenantId: string;
    learnerId: string;
    interventionId: string;
    accepted: boolean;
    selectedOption?: string;
    feedback?: string;
  }): Promise<void> {
    const key = this.getLearnerKey(params.tenantId, params.learnerId);
    const state = this.monitoredLearners.get(key);

    if (!state) return;

    const intervention = state.interventionHistory.find(i => i.id === params.interventionId);
    if (intervention) {
      intervention.response = {
        accepted: params.accepted,
        selectedOption: params.selectedOption,
        respondedAt: new Date(),
        feedback: params.feedback,
      };

      // Calculate effectiveness based on subsequent focus/emotion
      setTimeout(async () => {
        intervention.effectiveness = await this.calculateEffectiveness(state, intervention);
      }, 60000); // Check after 1 minute

      await this.cacheState(state);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // ALERTS
  // ──────────────────────────────────────────────────────────────────────────────

  private async createAlert(
    state: LearnerMonitoringState,
    alert: {
      type: AlertType;
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
    }
  ): Promise<void> {
    // Check if similar alert already exists
    const existing = state.alerts.find(
      a => a.type === alert.type && !a.acknowledged
    );

    if (existing) return;

    const newAlert: ActiveAlert = {
      id: this.generateId('alert'),
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      triggeredAt: new Date(),
      acknowledged: false,
      escalated: false,
    };

    state.alerts.push(newAlert);

    // Auto-escalate high/critical alerts
    if (['high', 'critical'].includes(alert.severity)) {
      newAlert.escalated = true;
      newAlert.escalatedTo = 'teacher';

      this.emit('alert:escalated', {
        learnerId: state.learnerId,
        tenantId: state.tenantId,
        alert: newAlert,
      });
    }

    await this.cacheState(state);

    this.emit('alert:created', {
      learnerId: state.learnerId,
      tenantId: state.tenantId,
      alert: newAlert,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────────────────────────

  private calculateFocusScore(indicators: FocusIndicators): number {
    let score = 100;

    // Response time penalty
    if (indicators.responseTime > 5000) score -= 20;
    else if (indicators.responseTime > 3000) score -= 10;

    // Low interaction frequency penalty
    if (indicators.interactionFrequency < 1) score -= 30;
    else if (indicators.interactionFrequency < 3) score -= 15;

    // High error rate penalty
    if (indicators.errorRate > 50) score -= 25;
    else if (indicators.errorRate > 30) score -= 15;

    // Idle time penalty
    if (indicators.idleTime > 60) score -= 30;
    else if (indicators.idleTime > 30) score -= 15;

    // Task switching penalty
    if (indicators.taskSwitching > 5) score -= 15;

    // Scroll pattern
    if (indicators.scrollPattern === 'erratic') score -= 10;
    if (indicators.scrollPattern === 'minimal') score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  private determineFocusState(score: number): FocusState {
    if (score >= 85) return 'HIGHLY_FOCUSED';
    if (score >= 65) return 'FOCUSED';
    if (score >= 45) return 'NEUTRAL';
    if (score >= 25) return 'DISTRACTED';
    return 'DISENGAGED';
  }

  private inferEmotionalState(
    indicators: EmotionalIndicators,
    focusHistory: FocusDataPoint[]
  ): { state: EmotionalState; confidence: number } {
    let state: EmotionalState = 'NEUTRAL';
    let confidence = 50;

    // Frustration indicators
    if (indicators.repetitiveErrors && indicators.rapidClicking) {
      state = 'FRUSTRATED';
      confidence = 85;
    } else if (indicators.repetitiveErrors) {
      state = 'FRUSTRATED';
      confidence = 70;
    }

    // Overwhelmed indicators
    if (indicators.avoidanceBehavior && indicators.longPauses) {
      state = 'OVERWHELMED';
      confidence = 75;
    }

    // Boredom indicators
    const avgFocus = focusHistory.length > 0
      ? focusHistory.reduce((sum, p) => sum + p.focusScore, 0) / focusHistory.length
      : 50;

    if (avgFocus < 30 && !indicators.repetitiveErrors) {
      state = 'BORED';
      confidence = 65;
    }

    // Engaged state
    if (avgFocus > 70 && !indicators.repetitiveErrors) {
      state = 'ENGAGED';
      confidence = 80;
    }

    return { state, confidence };
  }

  private addOrUpdatePattern(
    state: LearnerMonitoringState,
    pattern: {
      type: PatternType;
      description: string;
      confidence: number;
      suggestedAction?: string;
    }
  ): void {
    const existing = state.patterns.find(p => p.type === pattern.type);

    if (existing) {
      existing.lastObservedAt = new Date();
      existing.occurrences++;
      existing.confidence = Math.min(100, (existing.confidence + pattern.confidence) / 2);
      existing.description = pattern.description;
      existing.suggestedAction = pattern.suggestedAction;
    } else {
      state.patterns.push({
        id: this.generateId('pat'),
        type: pattern.type,
        description: pattern.description,
        confidence: pattern.confidence,
        firstDetectedAt: new Date(),
        lastObservedAt: new Date(),
        occurrences: 1,
        actionable: pattern.suggestedAction !== undefined,
        suggestedAction: pattern.suggestedAction,
      });
    }
  }

  private async calculateEffectiveness(
    state: LearnerMonitoringState,
    intervention: InterventionRecord
  ): Promise<number> {
    // Compare focus/emotion before and after intervention
    const beforeTimestamp = intervention.triggeredAt.getTime();
    const afterTimestamp = beforeTimestamp + 60000; // 1 minute after

    const focusBefore = state.focusHistory.filter(
      p => p.timestamp.getTime() < beforeTimestamp &&
           p.timestamp.getTime() > beforeTimestamp - 60000
    );

    const focusAfter = state.focusHistory.filter(
      p => p.timestamp.getTime() >= afterTimestamp &&
           p.timestamp.getTime() < afterTimestamp + 60000
    );

    if (focusBefore.length === 0 || focusAfter.length === 0) {
      return 50; // Default if not enough data
    }

    const avgBefore = focusBefore.reduce((sum, p) => sum + p.focusScore, 0) / focusBefore.length;
    const avgAfter = focusAfter.reduce((sum, p) => sum + p.focusScore, 0) / focusAfter.length;

    // Effectiveness is improvement normalized to 0-100
    const improvement = avgAfter - avgBefore;
    return Math.min(100, Math.max(0, 50 + improvement));
  }

  private getLearnerKey(tenantId: string, learnerId: string): string {
    return `${tenantId}:${learnerId}`;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async cacheState(state: LearnerMonitoringState): Promise<void> {
    const key = `${this.cachePrefix}:state:${this.getLearnerKey(state.tenantId, state.learnerId)}`;
    await this.redis.setex(key, 3600, JSON.stringify(state));
  }

  private async persistSessionData(state: LearnerMonitoringState): Promise<void> {
    // Persist patterns and important data to database
    await this.pool.query(
      `INSERT INTO learner_monitoring_sessions (
        id, tenant_id, learner_id, session_id, started_at, ended_at,
        patterns, intervention_count, avg_focus_score, alerts_count,
        metadata, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9, NOW()
      )`,
      [
        state.tenantId,
        state.learnerId,
        state.sessionId,
        state.monitoringSince,
        JSON.stringify(state.patterns),
        state.interventionHistory.length,
        state.focusHistory.length > 0
          ? state.focusHistory.reduce((sum, p) => sum + p.focusScore, 0) / state.focusHistory.length
          : null,
        state.alerts.length,
        JSON.stringify({
          totalInterventions: state.interventionHistory.length,
          acceptedInterventions: state.interventionHistory.filter(i => i.response?.accepted).length,
        }),
      ]
    );
  }
}

export default RealTimeProactiveAgent;
