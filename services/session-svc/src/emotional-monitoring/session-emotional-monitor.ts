/**
 * ND-2.3: Session Emotional Monitor
 *
 * Monitors emotional state during learning sessions by collecting behavioral
 * signals and sending them to the ai-orchestrator for analysis.
 */

import type { PrismaClient } from '@prisma/client';

import type { StateHistory, StateHistoryEntry } from './state-history.js';

/**
 * Behavioral signals collected during a session.
 */
export interface BehavioralSignals {
  responseTimeMs: number;
  averageResponseTimeMs: number;
  responseTimeVariance: number;
  timeSinceLastInteraction: number;
  timeOnCurrentActivity: number;
  timeSinceLastBreak: number;
  interactionCount: number;
  clicksPerMinute: number;
  scrollBehavior: 'none' | 'slow' | 'normal' | 'erratic' | 'rapid';
  backtrackCount: number;
  consecutiveCorrect: number;
  consecutiveErrors: number;
  errorRate: number;
  skipCount: number;
  helpRequestCount: number;
  hintUsageCount: number;
  contentCompletionRate: number;
  videoPlaybackBehavior?: 'normal' | 'pausing' | 'rewinding' | 'skipping';
  readingPace?: 'slow' | 'normal' | 'fast' | 'scanning';
  focusLossCount: number;
  idleTimeMs: number;
  explicitMoodRating?: number;
  explicitFrustrationReport?: boolean;
  requestedBreak?: boolean;
}

/**
 * Contextual factors for the current session.
 */
export interface ContextualFactors {
  activityType: string;
  activityDifficulty: string;
  isNewContent: boolean;
  isAssessment: boolean;
  hasTimeLimit: boolean;
  timeRemainingSeconds?: number;
  sessionDurationMinutes: number;
  activitiesCompleted: number;
  breaksTaken: number;
  lastBreakMinutesAgo: number;
  previousPerformanceOnTopic: number;
  typicalSessionLength: number;
  typicalBreakFrequency: number;
  estimatedCognitiveLoad: number;
  estimatedSensoryLoad: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  dayOfWeek: number;
  knownAnxietyTriggers: string[];
  knownCalmingStrategies: string[];
  environmentType?: string;
  hasLimitedMobility?: boolean;
}

/**
 * Emotional state analysis result from ai-orchestrator.
 */
export interface EmotionalStateAnalysis {
  primaryState: string;
  secondaryState?: string;
  confidence: number;
  intensity: number;
  trend: 'improving' | 'stable' | 'declining' | 'rapid_decline';
  anxietyRisk: number;
  overwhelmRisk: number;
  meltdownRisk: number;
  indicators: {
    type: string;
    signal: string;
    value: unknown;
    normalRange: { min: number; max: number };
    contribution: number;
    description: string;
  }[];
  recommendIntervention: boolean;
  suggestedInterventions: SuggestedIntervention[];
  urgency: 'none' | 'low' | 'medium' | 'high' | 'immediate';
}

/**
 * Suggested intervention from ai-orchestrator.
 */
export interface SuggestedIntervention {
  interventionId: string;
  interventionType: string;
  name: string;
  reason: string;
  estimatedEffectiveness: number;
  duration: number;
  urgency: string;
  content: {
    instructions: string;
    duration: number;
    steps?: string[];
    affirmations?: string[];
    suggestions?: string[];
    activities?: string[];
    mediaUrl?: string;
  };
}

/**
 * Configuration for SessionEmotionalMonitor.
 */
export interface SessionEmotionalMonitorConfig {
  /** AI orchestrator base URL */
  aiOrchestratorUrl: string;
  /** Minimum interval between analyses in ms (default: 30000) */
  minAnalysisIntervalMs?: number;
  /** Enable automatic analysis (default: true) */
  enableAutoAnalysis?: boolean;
  /** Callback when intervention is needed */
  onInterventionNeeded?: (analysis: EmotionalStateAnalysis) => void;
  /** Callback for state updates */
  onStateUpdate?: (analysis: EmotionalStateAnalysis) => void;
}

/**
 * Session state for tracking signals.
 */
interface SessionState {
  sessionId: string;
  learnerId: string;
  tenantId: string;
  startTime: Date;
  lastAnalysisTime?: Date;
  lastInteractionTime?: Date;
  responseTimes: number[];
  interactionCount: number;
  consecutiveCorrect: number;
  consecutiveErrors: number;
  errorCount: number;
  totalResponses: number;
  skipCount: number;
  helpRequestCount: number;
  hintUsageCount: number;
  backtrackCount: number;
  focusLossCount: number;
  breaksTaken: number;
  lastBreakTime?: Date;
  currentActivityStartTime?: Date;
  activitiesCompleted: number;
}

export class SessionEmotionalMonitor {
  private sessions = new Map<string, SessionState>();
  private stateHistory: StateHistory;
  private config: Required<SessionEmotionalMonitorConfig>;

  constructor(
    private prisma: PrismaClient,
    config: SessionEmotionalMonitorConfig,
    stateHistory: StateHistory
  ) {
    this.stateHistory = stateHistory;
    this.config = {
      aiOrchestratorUrl: config.aiOrchestratorUrl,
      minAnalysisIntervalMs: config.minAnalysisIntervalMs ?? 30000,
      enableAutoAnalysis: config.enableAutoAnalysis ?? true,
      onInterventionNeeded:
        config.onInterventionNeeded ??
        ((_analysis: EmotionalStateAnalysis) => {
          /* no-op */
        }),
      onStateUpdate:
        config.onStateUpdate ??
        ((_analysis: EmotionalStateAnalysis) => {
          /* no-op */
        }),
    };
  }

  /**
   * Start monitoring a session.
   */
  startSession(sessionId: string, learnerId: string, tenantId: string): void {
    this.sessions.set(sessionId, {
      sessionId,
      learnerId,
      tenantId,
      startTime: new Date(),
      responseTimes: [],
      interactionCount: 0,
      consecutiveCorrect: 0,
      consecutiveErrors: 0,
      errorCount: 0,
      totalResponses: 0,
      skipCount: 0,
      helpRequestCount: 0,
      hintUsageCount: 0,
      backtrackCount: 0,
      focusLossCount: 0,
      breaksTaken: 0,
      activitiesCompleted: 0,
    });
  }

  /**
   * End monitoring a session.
   */
  endSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Record a response (correct or incorrect).
   */
  async recordResponse(
    sessionId: string,
    isCorrect: boolean,
    responseTimeMs: number
  ): Promise<EmotionalStateAnalysis | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.responseTimes.push(responseTimeMs);
    session.totalResponses++;
    session.interactionCount++;
    session.lastInteractionTime = new Date();

    if (isCorrect) {
      session.consecutiveCorrect++;
      session.consecutiveErrors = 0;
    } else {
      session.consecutiveErrors++;
      session.consecutiveCorrect = 0;
      session.errorCount++;
    }

    // Auto-analyze if enabled and enough time has passed
    if (this.shouldAnalyze(session)) {
      return this.analyzeState(sessionId);
    }

    return null;
  }

  /**
   * Record a skip action.
   */
  recordSkip(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.skipCount++;
      session.interactionCount++;
      session.lastInteractionTime = new Date();
    }
  }

  /**
   * Record a help request.
   */
  recordHelpRequest(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.helpRequestCount++;
      session.interactionCount++;
      session.lastInteractionTime = new Date();
    }
  }

  /**
   * Record hint usage.
   */
  recordHintUsage(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.hintUsageCount++;
      session.interactionCount++;
      session.lastInteractionTime = new Date();
    }
  }

  /**
   * Record backtracking (going to previous content).
   */
  recordBacktrack(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.backtrackCount++;
      session.interactionCount++;
      session.lastInteractionTime = new Date();
    }
  }

  /**
   * Record focus loss (tab switch, app minimize).
   */
  recordFocusLoss(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.focusLossCount++;
    }
  }

  /**
   * Record a break taken.
   */
  recordBreak(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.breaksTaken++;
      session.lastBreakTime = new Date();
    }
  }

  /**
   * Record activity completed.
   */
  recordActivityCompleted(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.activitiesCompleted++;
      session.currentActivityStartTime = new Date();
    }
  }

  /**
   * Record explicit mood rating.
   */
  async recordMoodRating(
    sessionId: string,
    rating: number
  ): Promise<EmotionalStateAnalysis | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Force analysis when explicit mood is reported
    return this.analyzeState(sessionId, { explicitMoodRating: rating });
  }

  /**
   * Record explicit frustration report.
   */
  async recordFrustration(sessionId: string): Promise<EmotionalStateAnalysis | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Force analysis when frustration is reported
    return this.analyzeState(sessionId, { explicitFrustrationReport: true });
  }

  /**
   * Record break request.
   */
  async recordBreakRequest(sessionId: string): Promise<EmotionalStateAnalysis | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Force analysis when break is requested
    return this.analyzeState(sessionId, { requestedBreak: true });
  }

  /**
   * Analyze the current emotional state.
   */
  async analyzeState(
    sessionId: string,
    overrides: Partial<BehavioralSignals> = {}
  ): Promise<EmotionalStateAnalysis | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const signals = this.buildSignals(session, overrides);
    const context = await this.buildContext(session);

    try {
      const response = await fetch(`${this.config.aiOrchestratorUrl}/emotional-state/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learnerId: session.learnerId,
          tenantId: session.tenantId,
          sessionId: session.sessionId,
          signals,
          context,
        }),
      });

      if (!response.ok) {
        console.error('Failed to analyze emotional state:', response.statusText);
        return null;
      }

      const analysis = (await response.json()) as EmotionalStateAnalysis;

      session.lastAnalysisTime = new Date();

      // Store in history
      this.stateHistory.addEntry(sessionId, {
        timestamp: new Date(),
        state: analysis.primaryState,
        intensity: analysis.intensity,
        interventionTriggered: analysis.recommendIntervention,
      });

      // Notify callbacks
      this.config.onStateUpdate(analysis);

      if (analysis.recommendIntervention) {
        this.config.onInterventionNeeded(analysis);
      }

      return analysis;
    } catch (error) {
      console.error('Error analyzing emotional state:', error);
      return null;
    }
  }

  /**
   * Record intervention outcome.
   */
  async recordInterventionOutcome(
    sessionId: string,
    interventionId: string,
    accepted: boolean,
    stateAfter?: string
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      await fetch(`${this.config.aiOrchestratorUrl}/emotional-state/interventions/outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          learnerId: session.learnerId,
          tenantId: session.tenantId,
          interventionId,
          accepted,
          stateAfter,
        }),
      });
    } catch (error) {
      console.error('Error recording intervention outcome:', error);
    }
  }

  /**
   * Get current emotional state without triggering analysis.
   */
  getCurrentState(sessionId: string): StateHistoryEntry | null {
    return this.stateHistory.getLatestEntry(sessionId);
  }

  /**
   * Get state history for a session.
   */
  getStateHistory(sessionId: string): StateHistoryEntry[] {
    return this.stateHistory.getHistory(sessionId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check if we should run analysis.
   */
  private shouldAnalyze(session: SessionState): boolean {
    if (!this.config.enableAutoAnalysis) return false;

    // Check minimum interval
    if (session.lastAnalysisTime) {
      const elapsed = Date.now() - session.lastAnalysisTime.getTime();
      if (elapsed < this.config.minAnalysisIntervalMs) return false;
    }

    // Always analyze after 3+ consecutive errors
    if (session.consecutiveErrors >= 3) return true;

    // Analyze after significant time with no analysis
    if (!session.lastAnalysisTime) {
      const elapsed = Date.now() - session.startTime.getTime();
      if (elapsed > 60000) return true; // First minute
    }

    return false;
  }

  /**
   * Build behavioral signals from session state.
   */
  private buildSignals(
    session: SessionState,
    overrides: Partial<BehavioralSignals>
  ): BehavioralSignals {
    const now = Date.now();
    const recentTimes = session.responseTimes.slice(-10);
    const avgResponseTime =
      recentTimes.length > 0 ? recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length : 5000;

    // Calculate variance
    let variance = 1;
    if (recentTimes.length > 1) {
      const squaredDiffs = recentTimes.map((t) => Math.pow(t - avgResponseTime, 2));
      variance =
        Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / recentTimes.length) / avgResponseTime;
    }

    const lastResponseTime = recentTimes[recentTimes.length - 1] ?? 0;
    const timeSinceLastInteraction = session.lastInteractionTime
      ? now - session.lastInteractionTime.getTime()
      : 0;

    const timeSinceLastBreak = session.lastBreakTime
      ? now - session.lastBreakTime.getTime()
      : now - session.startTime.getTime();

    const timeOnCurrentActivity = session.currentActivityStartTime
      ? now - session.currentActivityStartTime.getTime()
      : now - session.startTime.getTime();

    const sessionDurationMs = now - session.startTime.getTime();

    return {
      responseTimeMs: lastResponseTime,
      averageResponseTimeMs: avgResponseTime,
      responseTimeVariance: variance,
      timeSinceLastInteraction,
      timeOnCurrentActivity,
      timeSinceLastBreak,
      interactionCount: session.interactionCount,
      clicksPerMinute: (session.interactionCount / sessionDurationMs) * 60000,
      scrollBehavior: 'normal',
      backtrackCount: session.backtrackCount,
      consecutiveCorrect: session.consecutiveCorrect,
      consecutiveErrors: session.consecutiveErrors,
      errorRate: session.totalResponses > 0 ? session.errorCount / session.totalResponses : 0,
      skipCount: session.skipCount,
      helpRequestCount: session.helpRequestCount,
      hintUsageCount: session.hintUsageCount,
      contentCompletionRate: 0,
      focusLossCount: session.focusLossCount,
      idleTimeMs: timeSinceLastInteraction,
      ...overrides,
    };
  }

  /**
   * Build contextual factors for the session.
   */
  private async buildContext(session: SessionState): Promise<ContextualFactors> {
    const now = new Date();
    const sessionDurationMinutes = (now.getTime() - session.startTime.getTime()) / 60000;

    const lastBreakMinutesAgo = session.lastBreakTime
      ? (now.getTime() - session.lastBreakTime.getTime()) / 60000
      : sessionDurationMinutes;

    // Get learner preferences if available
    let knownAnxietyTriggers: string[] = [];
    let knownCalmingStrategies: string[] = [];
    let typicalSessionLength = 30;

    try {
      // Try to get learner preferences from predictability preferences
      const prefs = await this.prisma.$queryRaw<
        {
          known_anxiety_triggers: string[] | null;
          preferred_calming_activities: string[] | null;
          preferred_session_length_minutes: number | null;
        }[]
      >`
        SELECT 
          COALESCE(known_anxiety_triggers, '{}') as known_anxiety_triggers,
          COALESCE(preferred_calming_activities, '{}') as preferred_calming_activities,
          COALESCE(preferred_session_length_minutes, 30) as preferred_session_length_minutes
        FROM predictability_preferences
        WHERE learner_id = ${session.learnerId}
        LIMIT 1
      `;

      if (prefs.length > 0) {
        knownAnxietyTriggers = prefs[0].known_anxiety_triggers ?? [];
        knownCalmingStrategies = prefs[0].preferred_calming_activities ?? [];
        typicalSessionLength = prefs[0].preferred_session_length_minutes ?? 30;
      }
    } catch {
      // Ignore - table may not exist
    }

    const hour = now.getHours();
    let timeOfDay: 'morning' | 'afternoon' | 'evening' = 'afternoon';
    if (hour < 12) timeOfDay = 'morning';
    else if (hour >= 18) timeOfDay = 'evening';

    return {
      activityType: 'learning',
      activityDifficulty: 'medium',
      isNewContent: false,
      isAssessment: false,
      hasTimeLimit: false,
      sessionDurationMinutes,
      activitiesCompleted: session.activitiesCompleted,
      breaksTaken: session.breaksTaken,
      lastBreakMinutesAgo,
      previousPerformanceOnTopic: 70,
      typicalSessionLength,
      typicalBreakFrequency: 3,
      estimatedCognitiveLoad: 5,
      estimatedSensoryLoad: 5,
      timeOfDay,
      dayOfWeek: now.getDay(),
      knownAnxietyTriggers,
      knownCalmingStrategies,
    };
  }
}
