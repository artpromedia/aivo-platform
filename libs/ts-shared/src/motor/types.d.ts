/**
 * Motor Accommodation Types - ND-3.3
 *
 * Shared type definitions for motor profile management and accommodations.
 * Used by personalization-svc, content-svc, and mobile apps.
 */
/** Motor ability level classification */
export type MotorAbilityLevel = 'TYPICAL' | 'MILD_DIFFICULTY' | 'MODERATE_DIFFICULTY' | 'SIGNIFICANT_DIFFICULTY' | 'REQUIRES_FULL_SUPPORT';
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
export type MotorInteractionType = 'tap' | 'double_tap' | 'long_press' | 'drag' | 'swipe' | 'pinch' | 'type' | 'voice' | 'dwell' | 'switch';
/** Complete motor profile for a learner */
export interface MotorProfile {
    id: string;
    learnerId: string;
    tenantId: string;
    fineMotorLevel: MotorAbilityLevel;
    grossMotorLevel: MotorAbilityLevel;
    hasTremor: boolean;
    tremorSeverity?: number;
    hasLimitedRange: boolean;
    limitedRangeSide?: HandSide;
    hasFatigue: boolean;
    fatigueThresholdMinutes?: number;
    enlargedTouchTargets: boolean;
    touchTargetMultiplier: number;
    touchHoldDuration: number;
    accidentalTouchFilter: boolean;
    edgeIgnoreMargin: number;
    simplifiedGestures: boolean;
    allowSingleFingerGestures: boolean;
    disableMultiTouch: boolean;
    disablePinchZoom: boolean;
    disableSwipe: boolean;
    swipeDistanceMultiplier: number;
    dragAssistEnabled: boolean;
    dragSnapToGrid: boolean;
    dragGridSize: number;
    dragAutoComplete: boolean;
    dragAutoCompleteThreshold: number;
    extendedResponseTime: boolean;
    responseTimeMultiplier: number;
    disableTimedElements: boolean;
    autoAdvanceDelay: number;
    voiceInputEnabled: boolean;
    voiceInputForText: boolean;
    voiceInputForNavigation: boolean;
    dwellSelectionEnabled: boolean;
    dwellTimeMs: number;
    dwellIndicatorStyle: DwellIndicatorStyle;
    switchAccessEnabled: boolean;
    switchAccessMode: SwitchAccessMode;
    switchScanSpeed: number;
    preferTyping: boolean;
    preferVoiceInput: boolean;
    preferMultipleChoice: boolean;
    showWordPrediction: boolean;
    enlargedKeyboard: boolean;
    keyboardType: KeyboardType;
    enhancedTouchFeedback: boolean;
    hapticFeedbackIntensity: HapticIntensity;
    showTouchRipples: boolean;
    highlightFocusedElement: boolean;
    tremorFilterEnabled: boolean;
    tremorFilterStrength: number;
    tremorFilterAlgorithm: TremorFilterAlgorithm;
    autoBreakReminders: boolean;
    breakReminderIntervalMinutes: number;
    reduceRequirementsOnFatigue: boolean;
    customGestures?: Record<string, CustomGesture>;
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
/** Active accommodations to apply at runtime */
export interface MotorAccommodations {
    touchTargetMultiplier: number;
    touchHoldDuration: number;
    accidentalTouchFilter: boolean;
    edgeIgnoreMargin: number;
    simplifiedGestures: boolean;
    allowSingleFingerGestures: boolean;
    swipeDistanceMultiplier: number;
    disableMultiTouch: boolean;
    dragAssistEnabled: boolean;
    dragSnapToGrid: boolean;
    dragGridSize: number;
    dragAutoComplete: boolean;
    dragAutoCompleteThreshold: number;
    responseTimeMultiplier: number;
    disableTimedElements: boolean;
    voiceInputEnabled: boolean;
    dwellSelectionEnabled: boolean;
    dwellTimeMs: number;
    dwellIndicatorStyle: DwellIndicatorStyle;
    switchAccessEnabled: boolean;
    switchScanSpeed: number;
    preferTyping: boolean;
    enlargedKeyboard: boolean;
    keyboardType: KeyboardType;
    showWordPrediction: boolean;
    enhancedTouchFeedback: boolean;
    hapticFeedbackIntensity: HapticIntensity;
    showTouchRipples: boolean;
    highlightFocusedElement: boolean;
    tremorFilterEnabled: boolean;
    tremorFilterStrength: number;
    tremorSmoothingFactor: number;
    tremorWindowSize: number;
    tremorMovementThreshold: number;
    autoBreakReminders: boolean;
    breakReminderIntervalMinutes: number;
    reduceRequirementsOnFatigue: boolean;
    hasFatigue: boolean;
    fatigueThresholdMinutes?: number;
}
/** Motor interaction log entry */
export interface MotorInteractionLog {
    id: string;
    learnerId: string;
    tenantId: string;
    sessionId?: string;
    interactionType: MotorInteractionType;
    targetElement?: string;
    attemptCount: number;
    successOnAttempt?: number;
    totalTimeMs?: number;
    targetHitAccuracy?: number;
    dragPathSmoothness?: number;
    accommodationsActive: string[];
    successful: boolean;
    usedAlternative: boolean;
    alternativeMethod?: string;
    timestamp: Date;
}
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
//# sourceMappingURL=types.d.ts.map