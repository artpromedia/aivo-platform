/**
 * Transition Support System - Type Definitions
 *
 * Types for the transition warning system that helps neurodiverse
 * learners prepare for activity changes.
 */

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS (mirrored from Prisma)
// Using const + type pattern for type safety with runtime values
// ══════════════════════════════════════════════════════════════════════════════

export const VisualWarningStyle = {
  COUNTDOWN_CIRCLE: 'COUNTDOWN_CIRCLE',
  PROGRESS_BAR: 'PROGRESS_BAR',
  SAND_TIMER: 'SAND_TIMER',
  NUMBER_COUNTDOWN: 'NUMBER_COUNTDOWN',
  CHARACTER_ANIMATION: 'CHARACTER_ANIMATION',
} as const;
// eslint-disable-next-line no-redeclare
export type VisualWarningStyle = (typeof VisualWarningStyle)[keyof typeof VisualWarningStyle];

export const TransitionColorScheme = {
  TRAFFIC_LIGHT: 'TRAFFIC_LIGHT',
  BLUE_GRADIENT: 'BLUE_GRADIENT',
  NATURE: 'NATURE',
  MONOCHROME: 'MONOCHROME',
  CUSTOM: 'CUSTOM',
} as const;
// eslint-disable-next-line no-redeclare
export type TransitionColorScheme =
  (typeof TransitionColorScheme)[keyof typeof TransitionColorScheme];

export const AudioWarningType = {
  GENTLE_CHIME: 'GENTLE_CHIME',
  NATURE_SOUND: 'NATURE_SOUND',
  MUSICAL_TONE: 'MUSICAL_TONE',
  SPOKEN_COUNTDOWN: 'SPOKEN_COUNTDOWN',
  VIBRATION_ONLY: 'VIBRATION_ONLY',
  SILENT: 'SILENT',
} as const;
// eslint-disable-next-line no-redeclare
export type AudioWarningType = (typeof AudioWarningType)[keyof typeof AudioWarningType];

export const TransitionOutcome = {
  SMOOTH: 'SMOOTH',
  NEEDED_EXTRA_TIME: 'NEEDED_EXTRA_TIME',
  USED_ROUTINE: 'USED_ROUTINE',
  SKIPPED: 'SKIPPED',
  INTERRUPTED: 'INTERRUPTED',
  STRUGGLED: 'STRUGGLED',
} as const;
// eslint-disable-next-line no-redeclare
export type TransitionOutcome = (typeof TransitionOutcome)[keyof typeof TransitionOutcome];

export const RoutineStepType = {
  BREATHING: 'breathing',
  MOVEMENT: 'movement',
  PREVIEW: 'preview',
  READY_CHECK: 'ready_check',
  SENSORY: 'sensory',
  SOCIAL_STORY: 'social_story',
  COUNTDOWN: 'countdown',
} as const;
// eslint-disable-next-line no-redeclare
export type RoutineStepType = (typeof RoutineStepType)[keyof typeof RoutineStepType];

// ══════════════════════════════════════════════════════════════════════════════
// CORE TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Activity information for transition context */
export interface ActivityInfo {
  id: string;
  type: string;
  title: string;
  estimatedDuration?: number;
  thumbnail?: string;
  difficulty?: string;
}

/** Context for planning a transition */
export interface TransitionContext {
  sessionId: string;
  learnerId: string;
  tenantId: string;
  fromActivity: ActivityInfo | null;
  toActivity: ActivityInfo;
  currentFocusState?: string;
  currentMood?: string;
  gradeBand?: string;
}

/** Warning configuration */
export interface TransitionWarning {
  secondsBefore: number;
  type: 'visual' | 'audio' | 'haptic' | 'spoken';
  message?: string;
  intensity: 'low' | 'medium' | 'high';
}

/** A step in a transition routine */
export interface TransitionRoutineStep {
  id: string;
  type: RoutineStepType;
  duration: number;
  instruction: string;
  mediaUrl?: string;
  requiresCompletion: boolean;
}

/** First/Then visual board */
export interface FirstThenBoard {
  currentActivity: {
    title: string;
    image?: string;
    description: string;
    status: 'current' | 'completed';
  };
  nextActivity: {
    title: string;
    image?: string;
    description: string;
    status: 'upcoming';
  };
}

/** Visual settings for transition UI */
export interface VisualSettings {
  style: VisualWarningStyle;
  colorScheme: TransitionColorScheme;
  colors: {
    warning: string;
    caution: string;
    ready: string;
    background: string;
  };
  showProgressBar: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast';
}

/** Audio settings for transition warnings */
export interface AudioSettings {
  enabled: boolean;
  type: AudioWarningType;
  volume: number;
  useSpokenWarnings: boolean;
  spokenVoice?: string;
}

/** Complete transition plan sent to client */
export interface TransitionPlan {
  transitionId: string;
  totalDuration: number;
  warnings: TransitionWarning[];
  routine?: TransitionRoutineStep[];
  firstThenBoard?: FirstThenBoard;
  requiresAcknowledgment: boolean;
  visualSettings: VisualSettings;
  audioSettings: AudioSettings;
  fromActivity?: ActivityInfo;
  toActivity: ActivityInfo;
}

// ══════════════════════════════════════════════════════════════════════════════
// PREFERENCES TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Activity-specific transition configuration */
export interface ActivityTransitionConfig {
  extraTime?: number;
  routineId?: string;
  requireAcknowledgment?: boolean;
}

/** Learner's transition preferences */
export interface TransitionPreferencesInput {
  warningIntervals?: number[];
  minimumTransitionTime?: number;
  enableVisualWarnings?: boolean;
  enableAudioWarnings?: boolean;
  enableHapticWarnings?: boolean;
  visualWarningStyle?: VisualWarningStyle;
  colorScheme?: TransitionColorScheme;
  showProgressBar?: boolean;
  audioWarningType?: AudioWarningType;
  audioVolume?: number;
  useSpokenWarnings?: boolean;
  transitionRoutineId?: string | null;
  showFirstThenBoard?: boolean;
  requireAcknowledgment?: boolean;
  activityTransitions?: Record<string, ActivityTransitionConfig>;
  customColors?: {
    warning: string;
    caution: string;
    ready: string;
    background?: string;
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTINE TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Routine creation input */
export interface CreateRoutineInput {
  tenantId: string;
  learnerId?: string;
  name: string;
  description?: string;
  steps: Omit<TransitionRoutineStep, 'id'>[];
  targetActivityTypes?: string[];
  targetAgeRange?: { min: number; max: number };
  targetGradeBands?: string[];
  isDefault?: boolean;
  isSystemRoutine?: boolean;
}

/** Routine stored in database */
export interface TransitionRoutineData {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  steps: TransitionRoutineStep[];
  totalDuration: number;
  isDefault: boolean;
  isSystemRoutine: boolean;
  targetActivityTypes: string[];
  targetAgeRange: { min: number; max: number } | null;
  targetGradeBands: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// EVENT TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Input for completing a transition */
export interface TransitionCompletionInput {
  outcome: 'smooth' | 'successful' | 'struggled' | 'refused' | 'timed_out';
  actualDuration: number;
  warningsAcknowledged: number;
  routineStepsCompleted: number;
  learnerInteractions: number;
  metadata?: Record<string, unknown>;
}

/** Result of completing a transition */
export interface TransitionCompletionResult {
  success: boolean;
  fromActivityId?: string;
  toActivityId?: string;
  outcome?: string;
  plannedDuration?: number;
  actualDuration?: number;
  warningsDelivered?: number;
  warningsAcknowledged?: number;
  routineStepsCompleted?: number;
  routineStepsTotal?: number;
  learnerInteractions?: number;
}

/** Metrics for transition completion */
export interface TransitionCompletionMetrics {
  totalSeconds?: number;
  usedRoutine?: boolean;
  skippedWarning?: boolean;
  acknowledgedAt?: Date;
}

/** Transition event data for analytics */
export interface TransitionEventData {
  transitionId: string;
  sessionId: string;
  learnerId: string;
  tenantId: string;
  fromActivity: ActivityInfo | null;
  toActivity: ActivityInfo;
  focusState?: string;
  mood?: string;
  plannedDuration: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Analytics for transition effectiveness */
export interface TransitionAnalytics {
  totalTransitions: number;
  smoothTransitions: number;
  smoothRate: number;
  usedRoutineRate: number;
  struggledRate: number;
  averageDurationSeconds: number;
  byActivityType: Record<string, { total: number; smooth: number }>;
  recommendations: string[];
  periodDays: number;
}

/** Learner profile relevant to transitions */
export interface LearnerTransitionProfile {
  requiresPredictableFlow?: boolean;
  sensoryProfile?: {
    noiseSensitivity?: 'LOW' | 'MEDIUM' | 'HIGH';
    lightSensitivity?: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  avoidTimers?: boolean;
  avoidFlashingContent?: boolean;
  avoidLoudSounds?: boolean;
  gradeBand?: string;
}
