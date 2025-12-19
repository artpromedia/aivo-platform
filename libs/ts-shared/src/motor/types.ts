/**
 * Motor Accommodation Types - ND-3.3
 *
 * Shared type definitions for motor profile management and accommodations.
 * Used by personalization-svc, content-svc, and mobile apps.
 */

// ══════════════════════════════════════════════════════════════════════════════
// MOTOR ABILITY TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Motor ability level classification */
export type MotorAbilityLevel =
  | 'TYPICAL'
  | 'MILD_DIFFICULTY'
  | 'MODERATE_DIFFICULTY'
  | 'SIGNIFICANT_DIFFICULTY'
  | 'REQUIRES_FULL_SUPPORT';

/** Hand/side preference */
export type HandSide = 'left' | 'right' | 'both';

/** Keyboard type preference */
export type KeyboardType = 'standard' | 'large' | 'split' | 'one_handed';

/** Haptic feedback intensity */
export type HapticIntensity = 'none' | 'light' | 'normal' | 'strong';

/** Dwell indicator style */
export type DwellIndicatorStyle = 'circle' | 'shrink' | 'fill';

/** Switch access mode */
export type SwitchAccessMode = 'auto_scan' | 'manual' | 'step_scan';

/** Tremor filter algorithm */
export type TremorFilterAlgorithm = 'moving_average' | 'kalman' | 'exponential';

/** Interaction type for logging */
export type MotorInteractionType =
  | 'tap'
  | 'double_tap'
  | 'long_press'
  | 'drag'
  | 'swipe'
  | 'pinch'
  | 'type'
  | 'voice'
  | 'dwell'
  | 'switch';

// ══════════════════════════════════════════════════════════════════════════════
// MOTOR PROFILE TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Complete motor profile for a learner */
export interface MotorProfile {
  id: string;
  learnerId: string;
  tenantId: string;

  // Motor ability assessment
  fineMotorLevel: MotorAbilityLevel;
  grossMotorLevel: MotorAbilityLevel;

  // Specific challenges
  hasTremor: boolean;
  tremorSeverity?: number; // 1-10
  hasLimitedRange: boolean;
  limitedRangeSide?: HandSide;
  hasFatigue: boolean;
  fatigueThresholdMinutes?: number;

  // Touch accommodations
  enlargedTouchTargets: boolean;
  touchTargetMultiplier: number; // 1.0 = standard, 2.0 = double
  touchHoldDuration: number; // ms, 0 = standard tap
  accidentalTouchFilter: boolean;
  edgeIgnoreMargin: number; // pixels to ignore at screen edges

  // Gesture accommodations
  simplifiedGestures: boolean;
  allowSingleFingerGestures: boolean;
  disableMultiTouch: boolean;
  disablePinchZoom: boolean;
  disableSwipe: boolean;
  swipeDistanceMultiplier: number; // Higher = more forgiving

  // Drag & drop accommodations
  dragAssistEnabled: boolean;
  dragSnapToGrid: boolean;
  dragGridSize: number; // pixels
  dragAutoComplete: boolean;
  dragAutoCompleteThreshold: number; // pixels

  // Timing accommodations
  extendedResponseTime: boolean;
  responseTimeMultiplier: number;
  disableTimedElements: boolean;
  autoAdvanceDelay: number; // Extra ms before auto-advance

  // Alternative input methods
  voiceInputEnabled: boolean;
  voiceInputForText: boolean;
  voiceInputForNavigation: boolean;

  dwellSelectionEnabled: boolean;
  dwellTimeMs: number;
  dwellIndicatorStyle: DwellIndicatorStyle;

  switchAccessEnabled: boolean;
  switchAccessMode: SwitchAccessMode;
  switchScanSpeed: number; // ms per item

  // Handwriting alternatives
  preferTyping: boolean;
  preferVoiceInput: boolean;
  preferMultipleChoice: boolean;
  showWordPrediction: boolean;
  enlargedKeyboard: boolean;
  keyboardType: KeyboardType;

  // Visual feedback
  enhancedTouchFeedback: boolean;
  hapticFeedbackIntensity: HapticIntensity;
  showTouchRipples: boolean;
  highlightFocusedElement: boolean;

  // Tremor filtering
  tremorFilterEnabled: boolean;
  tremorFilterStrength: number; // 0-100
  tremorFilterAlgorithm: TremorFilterAlgorithm;

  // Fatigue management
  autoBreakReminders: boolean;
  breakReminderIntervalMinutes: number;
  reduceRequirementsOnFatigue: boolean;

  // Custom gestures
  customGestures?: Record<string, CustomGesture>;

  // Metadata
  assessedBy?: 'self' | 'parent' | 'therapist' | 'ot';
  assessedAt?: Date;
  accommodationNotes?: string;

  createdAt: Date;
  updatedAt: Date;
}

/** Custom gesture definition */
export interface CustomGesture {
  action: string;
  gesture: string;
  description?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// MOTOR ACCOMMODATIONS (subset for runtime use)
// ══════════════════════════════════════════════════════════════════════════════

/** Active accommodations to apply at runtime */
export interface MotorAccommodations {
  // Touch
  touchTargetMultiplier: number;
  touchHoldDuration: number;
  accidentalTouchFilter: boolean;
  edgeIgnoreMargin: number;

  // Gestures
  simplifiedGestures: boolean;
  allowSingleFingerGestures: boolean;
  swipeDistanceMultiplier: number;
  disableMultiTouch: boolean;

  // Drag & drop
  dragAssistEnabled: boolean;
  dragSnapToGrid: boolean;
  dragGridSize: number;
  dragAutoComplete: boolean;
  dragAutoCompleteThreshold: number;

  // Timing
  responseTimeMultiplier: number;
  disableTimedElements: boolean;

  // Input methods
  voiceInputEnabled: boolean;
  dwellSelectionEnabled: boolean;
  dwellTimeMs: number;
  dwellIndicatorStyle: DwellIndicatorStyle;
  switchAccessEnabled: boolean;
  switchScanSpeed: number;

  // Keyboard
  preferTyping: boolean;
  enlargedKeyboard: boolean;
  keyboardType: KeyboardType;
  showWordPrediction: boolean;

  // Feedback
  enhancedTouchFeedback: boolean;
  hapticFeedbackIntensity: HapticIntensity;
  showTouchRipples: boolean;
  highlightFocusedElement: boolean;

  // Tremor
  tremorFilterEnabled: boolean;
  tremorFilterStrength: number;
  tremorSmoothingFactor: number;
  tremorWindowSize: number;
  tremorMovementThreshold: number;

  // Fatigue
  autoBreakReminders: boolean;
  breakReminderIntervalMinutes: number;
  reduceRequirementsOnFatigue: boolean;
  hasFatigue: boolean;
  fatigueThresholdMinutes?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// MOTOR INTERACTION LOGGING
// ══════════════════════════════════════════════════════════════════════════════

/** Motor interaction log entry */
export interface MotorInteractionLog {
  id: string;
  learnerId: string;
  tenantId: string;
  sessionId?: string;

  // Interaction details
  interactionType: MotorInteractionType;
  targetElement?: string;

  // Performance metrics
  attemptCount: number;
  successOnAttempt?: number;
  totalTimeMs?: number;

  // Accuracy metrics
  targetHitAccuracy?: number; // 0-1, how close to center of target
  dragPathSmoothness?: number; // For drag operations

  // Accommodations used
  accommodationsActive: string[];

  // Outcome
  successful: boolean;
  usedAlternative: boolean;
  alternativeMethod?: string;

  timestamp: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT ADAPTATIONS
// ══════════════════════════════════════════════════════════════════════════════

/** Content adaptations based on motor profile */
export interface MotorContentAdaptations {
  preferredInputTypes: string[];
  avoidInputTypes: string[];
  activityModifications: Record<string, unknown>;
}

/** Input type for motor profile updates */
export interface MotorProfileInput {
  fineMotorLevel?: MotorAbilityLevel;
  grossMotorLevel?: MotorAbilityLevel;
  hasTremor?: boolean;
  tremorSeverity?: number;
  hasLimitedRange?: boolean;
  limitedRangeSide?: HandSide;
  hasFatigue?: boolean;
  fatigueThresholdMinutes?: number;
  enlargedTouchTargets?: boolean;
  touchTargetMultiplier?: number;
  touchHoldDuration?: number;
  accidentalTouchFilter?: boolean;
  edgeIgnoreMargin?: number;
  simplifiedGestures?: boolean;
  allowSingleFingerGestures?: boolean;
  disableMultiTouch?: boolean;
  disablePinchZoom?: boolean;
  disableSwipe?: boolean;
  swipeDistanceMultiplier?: number;
  dragAssistEnabled?: boolean;
  dragSnapToGrid?: boolean;
  dragGridSize?: number;
  dragAutoComplete?: boolean;
  dragAutoCompleteThreshold?: number;
  extendedResponseTime?: boolean;
  responseTimeMultiplier?: number;
  disableTimedElements?: boolean;
  autoAdvanceDelay?: number;
  voiceInputEnabled?: boolean;
  voiceInputForText?: boolean;
  voiceInputForNavigation?: boolean;
  dwellSelectionEnabled?: boolean;
  dwellTimeMs?: number;
  dwellIndicatorStyle?: DwellIndicatorStyle;
  switchAccessEnabled?: boolean;
  switchAccessMode?: SwitchAccessMode;
  switchScanSpeed?: number;
  preferTyping?: boolean;
  preferVoiceInput?: boolean;
  preferMultipleChoice?: boolean;
  showWordPrediction?: boolean;
  enlargedKeyboard?: boolean;
  keyboardType?: KeyboardType;
  enhancedTouchFeedback?: boolean;
  hapticFeedbackIntensity?: HapticIntensity;
  showTouchRipples?: boolean;
  highlightFocusedElement?: boolean;
  tremorFilterEnabled?: boolean;
  tremorFilterStrength?: number;
  tremorFilterAlgorithm?: TremorFilterAlgorithm;
  autoBreakReminders?: boolean;
  breakReminderIntervalMinutes?: number;
  reduceRequirementsOnFatigue?: boolean;
  customGestures?: Record<string, CustomGesture>;
  assessedBy?: 'self' | 'parent' | 'therapist' | 'ot';
  assessedAt?: Date;
  accommodationNotes?: string;
}

/** Suggestion for accommodation adjustment */
export interface AccommodationSuggestion {
  suggestions: string[];
  recommendedChanges: Partial<MotorProfileInput>;
}
