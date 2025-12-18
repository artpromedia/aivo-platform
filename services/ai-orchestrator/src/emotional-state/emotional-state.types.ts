/**
 * ND-2.3: Anxiety and Overwhelm Detection Types
 *
 * Type definitions for the emotional state detection and intervention system.
 * This module provides early detection of anxiety and overwhelm patterns
 * to enable proactive intervention before learners reach crisis states.
 */

// ============================================================================
// EMOTIONAL STATE ENUMS
// ============================================================================

/**
 * All possible emotional states a learner can be in.
 * States are categorized into: positive, neutral, concerning, warning, and critical.
 */
export const EMOTIONAL_STATES = [
  // Positive states
  'CALM',
  'FOCUSED',
  'ENGAGED',
  'HAPPY',
  'EXCITED',
  'PROUD',
  'CURIOUS',
  // Neutral states
  'NEUTRAL',
  'TIRED',
  'DISTRACTED',
  // Concerning states
  'CONFUSED',
  'UNCERTAIN',
  'HESITANT',
  // Warning states
  'FRUSTRATED',
  'ANXIOUS',
  'WORRIED',
  'STRESSED',
  'OVERWHELMED',
  // Critical states
  'HIGHLY_ANXIOUS',
  'HIGHLY_FRUSTRATED',
  'MELTDOWN_RISK',
  'SHUTDOWN_RISK',
] as const;

export type EmotionalState = (typeof EMOTIONAL_STATES)[number];

/** Positive states indicating learner wellbeing */
export const POSITIVE_STATES: readonly EmotionalState[] = [
  'CALM',
  'FOCUSED',
  'ENGAGED',
  'HAPPY',
  'EXCITED',
  'PROUD',
  'CURIOUS',
  'NEUTRAL',
] as const;

/** Warning states that may require intervention */
export const WARNING_STATES: readonly EmotionalState[] = [
  'FRUSTRATED',
  'ANXIOUS',
  'WORRIED',
  'STRESSED',
  'OVERWHELMED',
] as const;

/** Critical states requiring immediate intervention */
export const CRITICAL_STATES: readonly EmotionalState[] = [
  'HIGHLY_ANXIOUS',
  'HIGHLY_FRUSTRATED',
  'MELTDOWN_RISK',
  'SHUTDOWN_RISK',
] as const;

// ============================================================================
// INTERVENTION TYPES
// ============================================================================

export const INTERVENTION_TYPES = [
  'BREATHING',
  'GROUNDING',
  'MOVEMENT',
  'SENSORY',
  'COGNITIVE',
  'DISTRACTION',
  'SOCIAL',
  'BREAK',
  'ENVIRONMENT',
  'ENCOURAGEMENT',
] as const;

export type InterventionType = (typeof INTERVENTION_TYPES)[number];

// ============================================================================
// BEHAVIORAL SIGNALS
// ============================================================================

/**
 * Real-time behavioral signals collected during a learning session.
 * These signals are analyzed to detect emotional state changes.
 */
export interface BehavioralSignals {
  // ─── Timing Signals ─────────────────────────────────────────────────────
  /** Time taken to respond to current item (ms) */
  responseTimeMs: number;
  /** Learner's average response time (ms) */
  averageResponseTimeMs: number;
  /** Standard deviation of response times */
  responseTimeVariance: number;
  /** Time since last interaction (ms) */
  timeSinceLastInteraction: number;
  /** Time spent on current activity (ms) */
  timeOnCurrentActivity: number;
  /** Time since last break (ms) */
  timeSinceLastBreak: number;

  // ─── Interaction Signals ────────────────────────────────────────────────
  /** Number of interactions in current session */
  interactionCount: number;
  /** Clicks per minute rate */
  clicksPerMinute: number;
  /** Scroll behavior pattern */
  scrollBehavior: 'none' | 'slow' | 'normal' | 'erratic' | 'rapid';
  /** Number of times learner went back to previous content */
  backtrackCount: number;

  // ─── Performance Signals ────────────────────────────────────────────────
  /** Number of consecutive correct answers */
  consecutiveCorrect: number;
  /** Number of consecutive errors */
  consecutiveErrors: number;
  /** Error rate over last 10 responses (0-1) */
  errorRate: number;
  /** Number of items skipped */
  skipCount: number;
  /** Number of help requests made */
  helpRequestCount: number;
  /** Number of hints used */
  hintUsageCount: number;

  // ─── Content Engagement ─────────────────────────────────────────────────
  /** Completion rate of current content (0-1) */
  contentCompletionRate: number;
  /** Video playback behavior if applicable */
  videoPlaybackBehavior?: 'normal' | 'pausing' | 'rewinding' | 'skipping';
  /** Reading pace if applicable */
  readingPace?: 'slow' | 'normal' | 'fast' | 'scanning';

  // ─── UI Behavior ────────────────────────────────────────────────────────
  /** Number of focus losses (tab switches, app minimizes) */
  focusLossCount: number;
  /** Total idle time (ms) */
  idleTimeMs: number;

  // ─── Explicit Signals ───────────────────────────────────────────────────
  /** Explicit mood rating if provided (1-5) */
  explicitMoodRating?: number;
  /** Learner explicitly reported frustration */
  explicitFrustrationReport?: boolean;
  /** Learner requested a break */
  requestedBreak?: boolean;
}

/**
 * Default values for behavioral signals.
 */
export function createDefaultBehavioralSignals(): BehavioralSignals {
  return {
    responseTimeMs: 0,
    averageResponseTimeMs: 5000,
    responseTimeVariance: 1,
    timeSinceLastInteraction: 0,
    timeOnCurrentActivity: 0,
    timeSinceLastBreak: 0,
    interactionCount: 0,
    clicksPerMinute: 0,
    scrollBehavior: 'normal',
    backtrackCount: 0,
    consecutiveCorrect: 0,
    consecutiveErrors: 0,
    errorRate: 0,
    skipCount: 0,
    helpRequestCount: 0,
    hintUsageCount: 0,
    contentCompletionRate: 0,
    focusLossCount: 0,
    idleTimeMs: 0,
  };
}

// ============================================================================
// CONTEXTUAL FACTORS
// ============================================================================

/**
 * Contextual information about the learning environment and session.
 */
export interface ContextualFactors {
  // ─── Activity Context ───────────────────────────────────────────────────
  /** Type of activity (e.g., 'quiz', 'reading', 'practice') */
  activityType: string;
  /** Difficulty level of current activity */
  activityDifficulty: string;
  /** Whether this is new content for the learner */
  isNewContent: boolean;
  /** Whether this is an assessment */
  isAssessment: boolean;
  /** Whether there is a time limit */
  hasTimeLimit: boolean;
  /** Time remaining in seconds if timed */
  timeRemainingSeconds?: number;

  // ─── Session Context ────────────────────────────────────────────────────
  /** How long the session has been running (minutes) */
  sessionDurationMinutes: number;
  /** Number of activities completed this session */
  activitiesCompleted: number;
  /** Number of breaks taken this session */
  breaksTaken: number;
  /** Minutes since last break */
  lastBreakMinutesAgo: number;

  // ─── Historical Context ─────────────────────────────────────────────────
  /** Learner's historical performance on this topic (0-100) */
  previousPerformanceOnTopic: number;
  /** Typical session length for this learner (minutes) */
  typicalSessionLength: number;
  /** Typical break frequency for this learner */
  typicalBreakFrequency: number;

  // ─── Load Estimates ─────────────────────────────────────────────────────
  /** Estimated cognitive load (0-10) */
  estimatedCognitiveLoad: number;
  /** Estimated sensory load (0-10) */
  estimatedSensoryLoad: number;

  // ─── Time Context ───────────────────────────────────────────────────────
  /** Time of day category */
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  /** Day of week (0=Sunday, 6=Saturday) */
  dayOfWeek: number;

  // ─── Learner-Specific Context ───────────────────────────────────────────
  /** Known anxiety triggers for this learner */
  knownAnxietyTriggers: string[];
  /** Known calming strategies that work for this learner */
  knownCalmingStrategies: string[];

  // ─── Environment Context ────────────────────────────────────────────────
  /** Environment type (home, classroom, etc.) */
  environmentType?: string;
  /** Whether learner has limited mobility */
  hasLimitedMobility?: boolean;
}

/**
 * Default contextual factors for when full context isn't available.
 */
export function createDefaultContextualFactors(): ContextualFactors {
  return {
    activityType: 'unknown',
    activityDifficulty: 'medium',
    isNewContent: false,
    isAssessment: false,
    hasTimeLimit: false,
    sessionDurationMinutes: 0,
    activitiesCompleted: 0,
    breaksTaken: 0,
    lastBreakMinutesAgo: 0,
    previousPerformanceOnTopic: 70,
    typicalSessionLength: 30,
    typicalBreakFrequency: 3,
    estimatedCognitiveLoad: 5,
    estimatedSensoryLoad: 5,
    timeOfDay: 'afternoon',
    dayOfWeek: new Date().getDay(),
    knownAnxietyTriggers: [],
    knownCalmingStrategies: [],
  };
}

// ============================================================================
// STATE ANALYSIS
// ============================================================================

/**
 * Indicator that contributed to state detection.
 */
export interface StateIndicator {
  /** Category of the indicator */
  type: 'timing' | 'performance' | 'fatigue' | 'regulation' | 'anxiety' | 'overwhelm' | 'explicit';
  /** Specific signal name */
  signal: string;
  /** Observed value */
  value: unknown;
  /** Normal range for this signal */
  normalRange: { min: number; max: number };
  /** How much this indicator contributed to the detection (0-1) */
  contribution: number;
  /** Human-readable description */
  description: string;
}

/**
 * Trend of emotional state over time.
 */
export type EmotionalTrend = 'improving' | 'stable' | 'declining' | 'rapid_decline';

/**
 * Urgency level for intervention.
 */
export type InterventionUrgency = 'none' | 'low' | 'medium' | 'high' | 'immediate';

/**
 * Complete analysis of a learner's emotional state.
 */
export interface EmotionalStateAnalysis {
  /** Primary detected emotional state */
  primaryState: EmotionalState;
  /** Secondary state if applicable */
  secondaryState?: EmotionalState;
  /** Confidence in the detection (0-1) */
  confidence: number;
  /** Intensity of the state (0-10) */
  intensity: number;
  /** Trend compared to recent states */
  trend: EmotionalTrend;

  // ─── Risk Assessment ────────────────────────────────────────────────────
  /** Anxiety risk level (0-10) */
  anxietyRisk: number;
  /** Overwhelm risk level (0-10) */
  overwhelmRisk: number;
  /** Meltdown risk level (0-10) */
  meltdownRisk: number;

  // ─── Detection Details ──────────────────────────────────────────────────
  /** Indicators that contributed to this detection */
  indicators: StateIndicator[];

  // ─── Intervention Recommendation ────────────────────────────────────────
  /** Whether intervention is recommended */
  recommendIntervention: boolean;
  /** Suggested interventions in priority order */
  suggestedInterventions: SuggestedIntervention[];
  /** Urgency of intervention */
  urgency: InterventionUrgency;
}

// ============================================================================
// INTERVENTIONS
// ============================================================================

/**
 * A suggested intervention with context.
 */
export interface SuggestedIntervention {
  /** Intervention database ID */
  interventionId: string;
  /** Type of intervention */
  interventionType: InterventionType;
  /** Display name */
  name: string;
  /** Why this intervention is suggested */
  reason: string;
  /** Estimated effectiveness based on history (0-1) */
  estimatedEffectiveness: number;
  /** Duration in seconds */
  duration: number;
  /** Urgency level */
  urgency: InterventionUrgency;
  /** Content for rendering the intervention */
  content: InterventionContent;
}

/**
 * Content structure for an intervention.
 */
export interface InterventionContent {
  /** Main instructions */
  instructions: string;
  /** Duration in seconds */
  duration: number;
  /** Step-by-step guidance if applicable */
  steps?: string[];
  /** Affirmations for encouragement type */
  affirmations?: string[];
  /** Suggestions for break type */
  suggestions?: string[];
  /** Activities for distraction type */
  activities?: string[];
  /** Optional media URL */
  mediaUrl?: string;
}

/**
 * Database intervention record.
 */
export interface Intervention {
  id: string;
  tenantId: string;
  name: string;
  type: InterventionType;
  description: string;
  content: InterventionContent;
  targetStates: EmotionalState[];
  targetIntensityMin: number;
  targetIntensityMax: number;
  requiresAudio: boolean;
  requiresMotion: boolean;
  requiresPrivacy: boolean;
  usageCount: number;
  successRate: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// THRESHOLDS AND PATTERNS
// ============================================================================

/**
 * Personalized overwhelm thresholds for a learner.
 */
export interface OverwhelmThresholds {
  learnerId: string;
  tenantId: string;
  /** Cognitive load threshold (0-10, lower = more sensitive) */
  cognitiveLoadThreshold: number;
  /** Sensory load threshold (0-10) */
  sensoryLoadThreshold: number;
  /** Emotional load threshold (0-10) */
  emotionalLoadThreshold: number;
  /** Time on task threshold in minutes */
  timeOnTaskThreshold: number;
  /** Consecutive errors threshold */
  consecutiveErrorsThreshold: number;
  /** Minimum break after overwhelm in minutes */
  minBreakAfterOverwhelmMin: number;
  /** Preferred calming activities */
  preferredCalmingActivities: string[];
  /** Whether auto-adjustment is enabled */
  autoAdjustEnabled: boolean;
  /** Last auto-adjustment timestamp */
  lastAutoAdjust?: Date;
}

/**
 * Default thresholds for new learners.
 */
export const DEFAULT_OVERWHELM_THRESHOLDS: Omit<OverwhelmThresholds, 'learnerId' | 'tenantId'> = {
  cognitiveLoadThreshold: 7,
  sensoryLoadThreshold: 7,
  emotionalLoadThreshold: 6,
  timeOnTaskThreshold: 20,
  consecutiveErrorsThreshold: 5,
  minBreakAfterOverwhelmMin: 5,
  preferredCalmingActivities: [],
  autoAdjustEnabled: true,
};

/**
 * Trigger definition for anxiety patterns.
 */
export interface AnxietyTrigger {
  /** Type of trigger */
  type: 'activity' | 'content' | 'time' | 'performance' | 'social';
  /** Trigger value/condition */
  value: string;
  /** Weight of this trigger (0-1) */
  weight: number;
}

/**
 * Behavioral indicators for anxiety patterns.
 */
export interface AnxietyBehavioralIndicators {
  /** How response time changes */
  responseTimeChange?: 'increasing' | 'decreasing' | 'erratic';
  /** Interaction pattern */
  interactionPattern?: 'normal' | 'erratic' | 'withdrawn';
  /** Whether learner avoids certain content */
  contentAvoidance?: boolean;
  /** How help-seeking behavior changes */
  helpSeekingChange?: 'increased' | 'decreased' | 'unchanged';
}

/**
 * Effective intervention record.
 */
export interface EffectiveIntervention {
  /** Intervention ID */
  interventionId: string;
  /** Success rate for this learner (0-1) */
  successRate: number;
  /** Number of times used */
  usageCount: number;
}

/**
 * Learned anxiety pattern for a learner.
 */
export interface AnxietyPattern {
  id: string;
  learnerId: string;
  tenantId: string;
  /** Pattern category */
  patternType: string;
  /** Display name */
  patternName: string;
  /** Triggers that activate this pattern */
  triggers: AnxietyTrigger[];
  /** Behavioral indicators when pattern is active */
  behavioralIndicators: AnxietyBehavioralIndicators;
  /** Number of times this pattern has been observed */
  occurrenceCount: number;
  /** Last time this pattern was detected */
  lastOccurrence?: Date;
  /** Average intensity when this pattern occurs */
  averageIntensity: number;
  /** Interventions that have worked for this pattern */
  effectiveInterventions: EffectiveIntervention[];
}

// ============================================================================
// STATE EVENT
// ============================================================================

/**
 * Logged emotional state event.
 */
export interface EmotionalStateEvent {
  id: string;
  sessionId: string;
  learnerId: string;
  tenantId: string;
  primaryState: EmotionalState;
  secondaryState?: EmotionalState;
  confidence: number;
  stateIntensity: number;
  stateDetails: {
    trend: EmotionalTrend;
    anxietyRisk: number;
    overwhelmRisk: number;
    indicators: StateIndicator[];
  };
  detectionSource: string[];
  activityId?: string;
  activityType?: string;
  contentId?: string;
  timeInActivitySeconds?: number;
  timeSinceLastBreak?: number;
  consecutiveErrors: number;
  interventionTriggered: boolean;
  interventionType?: InterventionType;
  interventionId?: string;
  interventionAccepted?: boolean;
  stateAfterIntervention?: EmotionalState;
  stateImproved?: boolean;
  createdAt: Date;
}

// ============================================================================
// ANALYSIS RESULTS (Internal Types)
// ============================================================================

/**
 * Result from anxiety detection.
 */
export interface AnxietyAnalysisResult {
  /** Risk level 0-10 */
  riskLevel: number;
  /** Detection confidence 0-1 */
  confidence: number;
  /** Type of anxiety detected */
  anxietyType: 'performance' | 'social' | 'new_content' | 'time_pressure' | 'unknown';
  /** Contributing indicators */
  indicators: StateIndicator[];
  /** Detected triggers */
  triggers: string[];
}

/**
 * Breakdown of load types contributing to overwhelm.
 */
export interface LoadBreakdown {
  /** Cognitive load (0-10) */
  cognitive: number;
  /** Sensory load (0-10) */
  sensory: number;
  /** Emotional load (0-10) */
  emotional: number;
  /** Fatigue load (0-10) */
  fatigue: number;
}

/**
 * Result from overwhelm detection.
 */
export interface OverwhelmAnalysisResult {
  /** Risk level 0-10 */
  riskLevel: number;
  /** Detection confidence 0-1 */
  confidence: number;
  /** Primary type of overwhelm */
  overwhelmType: 'cognitive' | 'sensory' | 'emotional' | 'fatigue' | 'combined';
  /** Contributing indicators */
  indicators: StateIndicator[];
  /** Breakdown by load type */
  loadBreakdown: LoadBreakdown;
}

// ============================================================================
// SESSION STATE HISTORY
// ============================================================================

/**
 * Summary of emotional states during a session.
 */
export interface SessionStateSummary {
  /** Most common state during session */
  predominantState: EmotionalState;
  /** Average intensity across session */
  averageIntensity: number;
  /** Number of state transitions */
  stateTransitions: number;
  /** Number of interventions triggered */
  interventionsTriggered: number;
  /** Number of interventions accepted */
  interventionsAccepted: number;
  /** Overall emotional trend */
  overallTrend: 'improving' | 'stable' | 'declining';
}

/**
 * Complete session emotional state history.
 */
export interface SessionStateHistory {
  /** All state events during session */
  states: EmotionalStateEvent[];
  /** Summary statistics */
  summary: SessionStateSummary;
}

// ============================================================================
// API TYPES
// ============================================================================

/**
 * Request to analyze emotional state.
 */
export interface AnalyzeStateRequest {
  learnerId: string;
  tenantId: string;
  sessionId: string;
  signals: BehavioralSignals;
  context: ContextualFactors;
}

/**
 * Request to record intervention outcome.
 */
export interface RecordInterventionOutcomeRequest {
  sessionId: string;
  learnerId: string;
  tenantId: string;
  interventionId: string;
  accepted: boolean;
  stateAfter?: EmotionalState;
  feedback?: string;
}

/**
 * Request to get thresholds.
 */
export interface GetThresholdsRequest {
  learnerId: string;
  tenantId: string;
}

/**
 * Request to update thresholds.
 */
export interface UpdateThresholdsRequest {
  learnerId: string;
  tenantId: string;
  thresholds: Partial<Omit<OverwhelmThresholds, 'learnerId' | 'tenantId'>>;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a state is a positive state.
 */
export function isPositiveState(state: EmotionalState): boolean {
  return (POSITIVE_STATES as readonly string[]).includes(state);
}

/**
 * Check if a state is a warning state.
 */
export function isWarningState(state: EmotionalState): boolean {
  return (WARNING_STATES as readonly string[]).includes(state);
}

/**
 * Check if a state is a critical state.
 */
export function isCriticalState(state: EmotionalState): boolean {
  return (CRITICAL_STATES as readonly string[]).includes(state);
}

/**
 * Check if a state indicates improvement (positive or neutral).
 */
export function isStateImproved(state: EmotionalState): boolean {
  return isPositiveState(state);
}

/**
 * Get the severity level of a state (0=positive, 1=neutral, 2=concerning, 3=warning, 4=critical).
 */
export function getStateSeverity(state: EmotionalState): number {
  if (isCriticalState(state)) return 4;
  if (isWarningState(state)) return 3;
  if (['CONFUSED', 'UNCERTAIN', 'HESITANT'].includes(state)) return 2;
  if (['NEUTRAL', 'TIRED', 'DISTRACTED'].includes(state)) return 1;
  return 0;
}
