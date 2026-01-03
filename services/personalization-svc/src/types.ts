/**
 * Personalization Signal Types
 *
 * Defines the structure of personalization signals that drive
 * adaptive learning decisions across Virtual Brain and Lesson Planner agents.
 *
 * Design Principles:
 * - Transparent: Every signal has a clear definition and source
 * - Controllable: Teachers can override or disable signals
 * - Auditable: All decisions are logged with rationale
 */

// ══════════════════════════════════════════════════════════════════════════════
// SIGNAL TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Categories of personalization signals.
 */
export type SignalType =
  | 'ENGAGEMENT'      // Session frequency, completion, time-on-task
  | 'DIFFICULTY'      // Mastery-based struggle/success signals
  | 'FOCUS'           // Focus breaks, interventions, attention patterns
  | 'HOMEWORK'        // Homework completion, hint usage
  | 'MODULE_UPTAKE'   // Which modules (SEL, Focus Mode) are being used
  | 'PREFERENCE'      // Content type preferences (games, videos, etc.)
  | 'PROGRESSION'     // Learning pace and trajectory signals
  | 'RECOMMENDATION'; // Feedback on recommendation effectiveness

/**
 * Individual signal keys within each type.
 */
export type SignalKey =
  // Engagement signals
  | 'LOW_ENGAGEMENT'           // Sessions/week below threshold
  | 'HIGH_ENGAGEMENT'          // Sessions/week above threshold
  | 'DECLINING_ENGAGEMENT'     // Engagement trending downward
  | 'SESSION_TOO_SHORT'        // Average session duration very low
  | 'SESSION_TOO_LONG'         // May indicate frustration/struggle
  // Difficulty signals
  | 'HIGH_STRUGGLE_MATH'
  | 'HIGH_STRUGGLE_ELA'
  | 'HIGH_STRUGGLE_SCIENCE'
  | 'HIGH_STRUGGLE_SEL'
  | 'HIGH_STRUGGLE_SPEECH'
  | 'READY_FOR_CHALLENGE_MATH'
  | 'READY_FOR_CHALLENGE_ELA'
  | 'READY_FOR_CHALLENGE_SCIENCE'
  | 'READY_FOR_CHALLENGE_SEL'
  | 'READY_FOR_CHALLENGE_SPEECH'
  | 'DIFFICULTY_PLATEAU'       // Stuck at same level for extended period
  // Focus signals
  | 'HIGH_FOCUS_BREAKS'        // Many breaks per session
  | 'LOW_FOCUS_BREAKS'         // Very few breaks (may indicate over-focus)
  | 'FOCUS_IMPROVING'          // Focus metrics trending better
  | 'FOCUS_DECLINING'          // Focus metrics trending worse
  | 'NEEDS_MORE_BREAKS'        // Derived from intervention patterns
  // Homework signals
  | 'HOMEWORK_AVOIDANCE'       // Low homework engagement
  | 'HOMEWORK_HINT_HEAVY'      // Uses many hints
  | 'HOMEWORK_SELF_SUFFICIENT' // Rarely needs hints
  // Module uptake signals
  | 'SEL_UNDERUTILIZED'        // SEL module available but not used
  | 'FOCUS_MODE_HELPING'       // Focus mode correlates with better outcomes
  | 'FOCUS_MODE_NOT_HELPING'   // Focus mode not improving outcomes
  // Preference signals
  | 'PREFERS_GAMES'
  | 'PREFERS_VIDEOS'
  | 'PREFERS_READING'
  | 'PREFERS_EXERCISES'
  // Progression signals
  | 'FAST_LEARNER'             // Advancing quickly
  | 'STEADY_LEARNER'           // Normal pace
  | 'NEEDS_MORE_PRACTICE'      // Slower progression
  // Recommendation feedback
  | 'REC_ACCEPTANCE_HIGH'      // Accepts most recommendations
  | 'REC_ACCEPTANCE_LOW'       // Rarely accepts recommendations
  | 'REC_TYPE_PREFERRED';      // Specific rec types work better

/**
 * Sources of signal generation.
 */
export type SignalSource =
  | 'ANALYTICS_ETL'    // Batch job from warehouse facts
  | 'ONLINE'           // Real-time calculation
  | 'TEACHER_OVERRIDE' // Manual teacher input
  | 'PARENT_INPUT'     // Parent-provided information
  | 'ASSESSMENT';      // Derived from formal assessment

/**
 * Union of all possible signal value types.
 */
export type SignalValue =
  | number
  | NumericSignalValue
  | DifficultySignalValue
  | FocusSignalValue
  | PreferenceSignalValue
  | Record<string, unknown>;

/**
 * The complete personalization signal record.
 */
export interface PersonalizationSignal {
  id: string;
  tenantId: string;
  learnerId: string;
  date: string; // YYYY-MM-DD
  signalType: SignalType;
  signalKey: SignalKey;
  signalValue: SignalValue;
  confidence: number; // 0-1, how confident we are in this signal
  source: SignalSource;
  metadata?: Record<string, unknown>;
  expiresAt?: string; // ISO timestamp when signal becomes stale
  createdAt: string;
  updatedAt: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// SIGNAL VALUE SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Numeric signal value with optional context.
 */
export interface NumericSignalValue {
  value: number;
  threshold: number;
  direction: 'above' | 'below' | 'at';
  percentile?: number;
}

/**
 * Domain-specific struggle/success signal.
 */
export interface DifficultySignalValue {
  domain: string;
  currentMastery: number;
  targetMastery: number;
  sessionCount: number;
  correctRate: number;
  recommendedAction: 'EASIER' | 'SAME' | 'HARDER';
}

/**
 * Focus pattern signal.
 */
export interface FocusSignalValue {
  breaksPerSession: number;
  avgBreakDuration: number;
  interventionCount: number;
  interventionSuccessRate: number;
  trendDirection: 'improving' | 'stable' | 'declining';
}

/**
 * Preference signal indicating content type affinity.
 */
export interface PreferenceSignalValue {
  contentType: string;
  engagementScore: number;
  completionRate: number;
  sampleSize: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// API CONTRACTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Request to fetch signals for a learner.
 */
export interface GetSignalsRequest {
  learnerId: string;
  recentDays?: number;          // Default 7
  signalTypes?: SignalType[];   // Filter by type
  signalKeys?: SignalKey[];     // Filter by specific keys
  includeExpired?: boolean;     // Include expired signals
}

/**
 * Response containing learner signals.
 */
export interface GetSignalsResponse {
  learnerId: string;
  tenantId?: string;
  signals: PersonalizationSignal[];
  summary?: SignalSummary;
  asOf?: string; // ISO timestamp
  fromDate?: string; // Query range start
  toDate?: string; // Query range end
  signalsByType?: Record<SignalType, PersonalizationSignal[]>;
  count?: number; // Total count of signals
}

/**
 * Summary of active signals for quick decision-making.
 */
export interface SignalSummary {
  engagementLevel: 'low' | 'normal' | 'high';
  difficultyAdjustments: {
    domain: string;
    recommendation: 'EASIER' | 'SAME' | 'HARDER';
    confidence: number;
  }[];
  focusNeeds: {
    needsMoreBreaks: boolean;
    focusTrend: 'improving' | 'stable' | 'declining';
  };
  contentPreferences: {
    contentType: string;
    score: number;
  }[];
  activeFlags: SignalKey[];
}

// ══════════════════════════════════════════════════════════════════════════════
// DECISION LOG
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Log entry for personalization decisions.
 * Provides transparency and auditability.
 */
export interface PersonalizationDecisionLog {
  id: string;
  tenantId: string;
  learnerId: string;
  timestamp: string;
  decisionType: 'DIFFICULTY_ADJUSTMENT' | 'ACTIVITY_SELECTION' | 'FOCUS_STRATEGY' | 'MODULE_RECOMMENDATION';
  inputSignals: {
    signalKey: SignalKey;
    signalValue: SignalValue;
  }[];
  decision: {
    action: string;
    before?: string | number;
    after?: string | number;
  };
  rationale: string;
  confidence: number;
  source: 'VIRTUAL_BRAIN' | 'LESSON_PLANNER' | 'FOCUS_AGENT' | 'RECOMMENDATION_ENGINE';
  wasOverridden?: boolean;
  overriddenBy?: string;
  overrideReason?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// AGENT CONTRACTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Contract for Virtual Brain to consume signals.
 */
export interface VirtualBrainSignalInput {
  learnerId: string;
  currentDifficultyLevel: number;
  domain: string;
  signals: {
    engagementLevel: 'low' | 'normal' | 'high';
    struggleSignal: boolean;
    readyForChallengeSignal: boolean;
    recentCorrectRate: number;
    sessionTrend: 'increasing' | 'stable' | 'decreasing';
  };
}

/**
 * Response from Virtual Brain after processing signals.
 */
export interface VirtualBrainSignalOutput {
  recommendedDifficultyLevel: number;
  paceAdjustment: 'slower' | 'normal' | 'faster';
  rationale: string;
  confidenceScore: number;
}

/**
 * Contract for Lesson Planner to consume signals.
 */
export interface LessonPlannerSignalInput {
  learnerId: string;
  planDurationMinutes: number;
  signals: {
    focusBreaksPerSession: number;
    preferredContentTypes: string[];
    engagementLevel: 'low' | 'normal' | 'high';
    needsRegulationBreaks: boolean;
    attentionSpanMinutes?: number;
  };
}

/**
 * Response from Lesson Planner after processing signals.
 */
export interface LessonPlannerSignalOutput {
  activityDurationRecommendation: number; // Minutes per activity
  breakFrequency: number; // Suggested breaks per hour
  contentTypeBias: Record<string, number>; // Weight for each content type
  includeRegulationActivities: boolean;
  rationale: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// FEEDBACK LOOP
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Recommendation effectiveness tracking.
 */
export interface RecommendationFeedback {
  recommendationType: string;
  totalRecommendations: number;
  acceptedCount: number;
  declinedCount: number;
  ignoredCount: number;
  acceptanceRate: number;
  outcomeAfterAcceptance: {
    improvedCount: number;
    noChangeCount: number;
    declinedCount: number;
  };
  effectivenessScore: number; // 0-1
}

/**
 * Threshold adjustment suggestion from feedback loop.
 */
export interface ThresholdAdjustment {
  signalKey: SignalKey;
  currentThreshold: number;
  suggestedThreshold: number;
  reason: string;
  sampleSize: number;
  confidenceLevel: number;
}
