/**
 * Personalization Signal Types
 *
 * Shared types for personalization signals consumed by agents.
 */

// ══════════════════════════════════════════════════════════════════════════════
// SIGNAL CLASSIFICATION
// ══════════════════════════════════════════════════════════════════════════════

export type PersonalizationSignalType =
  | 'ENGAGEMENT'
  | 'DIFFICULTY'
  | 'FOCUS'
  | 'HOMEWORK'
  | 'MODULE_UPTAKE'
  | 'PREFERENCE'
  | 'PROGRESSION'
  | 'RECOMMENDATION';

export type PersonalizationSignalKey =
  // Engagement signals
  | 'LOW_ENGAGEMENT'
  | 'HIGH_ENGAGEMENT'
  | 'SESSION_TOO_SHORT'
  | 'SESSION_TOO_LONG'
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
  // Focus signals
  | 'HIGH_FOCUS_BREAKS'
  | 'LOW_FOCUS_BREAKS'
  | 'NEEDS_MORE_BREAKS'
  | 'INTERVENTION_RESPONSIVE'
  | 'INTERVENTION_UNRESPONSIVE'
  // Homework signals
  | 'HOMEWORK_AVOIDANCE'
  | 'HOMEWORK_HINT_HEAVY'
  | 'HOMEWORK_SELF_SUFFICIENT'
  // Module/content signals
  | 'MODULE_HIGH_UPTAKE'
  | 'MODULE_LOW_UPTAKE'
  // Preference signals
  | 'PREFERS_MORNING'
  | 'PREFERS_AFTERNOON'
  | 'PREFERS_EVENING'
  // Progression signals
  | 'ACCELERATING'
  | 'DECELERATING'
  | 'PLATEAU'
  // Recommendation signals
  | 'REC_ACCEPTANCE_HIGH'
  | 'REC_ACCEPTANCE_LOW';

export type PersonalizationSignalSource =
  | 'ANALYTICS_ETL'
  | 'ONLINE'
  | 'TEACHER_OVERRIDE'
  | 'PARENT_INPUT'
  | 'ASSESSMENT';

// ══════════════════════════════════════════════════════════════════════════════
// SIGNAL VALUE TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface NumericSignalValue {
  value: number;
  threshold: number;
  direction: 'above' | 'below';
}

export interface DifficultySignalValue {
  domain: string;
  currentMastery: number;
  targetMastery: number;
  sessionCount: number;
  correctRate: number;
  recommendedAction: 'EASIER' | 'MAINTAIN' | 'HARDER';
}

export interface FocusSignalValue {
  breaksPerSession: number;
  avgBreakDuration: number;
  interventionCount: number;
  interventionSuccessRate: number;
  trendDirection: 'improving' | 'declining' | 'stable';
}

export interface ModuleUptakeSignalValue {
  moduleId: string;
  uptakeRate: number;
  completionRate: number;
  engagementScore: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// SIGNAL RECORD
// ══════════════════════════════════════════════════════════════════════════════

export interface PersonalizationSignal {
  id: string;
  tenantId: string;
  learnerId: string;
  date: string;
  signalType: PersonalizationSignalType;
  signalKey: PersonalizationSignalKey;
  signalValue: NumericSignalValue | DifficultySignalValue | FocusSignalValue | ModuleUptakeSignalValue | Record<string, unknown>;
  confidence: number;
  source: PersonalizationSignalSource;
  metadata?: Record<string, unknown>;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// AGENT INPUT/OUTPUT CONTRACTS
// ══════════════════════════════════════════════════════════════════════════════

export interface PersonalizationSignalSummary {
  engagementLevel: 'LOW' | 'NORMAL' | 'HIGH';
  difficultyAdjustments: Record<string, 'EASIER' | 'MAINTAIN' | 'HARDER'>;
  focusProfile: {
    needsMoreBreaks: boolean;
    avgBreakDuration: number;
  };
  hasLowEngagementRecently: boolean;
  hasHighStruggle: boolean;
  needsMoreBreaks: boolean;
}

export interface VirtualBrainSignalInput {
  learnerId: string;
  timestamp: string;
  signals: PersonalizationSignal[];
  signalSummary: PersonalizationSignalSummary;
  context: {
    sessionId?: string;
    currentSubject?: string;
    timeOfDay: 'morning' | 'afternoon' | 'evening';
    dayOfWeek: number;
  };
}

export interface LessonPlannerSignalInput {
  learnerId: string;
  targetDate: string;
  signals: PersonalizationSignal[];
  constraints: {
    availableMinutes: number;
    subjectConstraints?: string[];
    difficultyBySubject: Record<string, 'EASIER' | 'MAINTAIN' | 'HARDER'>;
    preferredModules: string[];
    avoidModules: string[];
    prioritizeEngaging: boolean;
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// API TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface GetPersonalizationSignalsRequest {
  learnerId: string;
  recentDays?: number;
  signalTypes?: PersonalizationSignalType[];
  minConfidence?: number;
  includeExpired?: boolean;
}

export interface GetPersonalizationSignalsResponse {
  learnerId: string;
  fromDate: string;
  toDate: string;
  signals: PersonalizationSignal[];
  signalsByType: Partial<Record<PersonalizationSignalType, PersonalizationSignal[]>>;
  count: number;
}
