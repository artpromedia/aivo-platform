/**
 * Motor Accommodation Constants - ND-3.3
 *
 * Default values and configuration constants for motor accommodations.
 */
// ══════════════════════════════════════════════════════════════════════════════
// DEFAULT VALUES
// ══════════════════════════════════════════════════════════════════════════════
/** Default motor profile values */
export const DEFAULT_MOTOR_PROFILE = {
    fineMotorLevel: 'TYPICAL',
    grossMotorLevel: 'TYPICAL',
    // Tremor defaults
    hasTremor: false,
    tremorSeverity: undefined,
    // Range of motion defaults
    hasLimitedRange: false,
    limitedRangeSide: undefined,
    // Fatigue defaults
    hasFatigue: false,
    fatigueThresholdMinutes: undefined,
    // Touch defaults
    enlargedTouchTargets: false,
    touchTargetMultiplier: 1.0,
    touchHoldDuration: 0,
    accidentalTouchFilter: false,
    edgeIgnoreMargin: 0,
    // Gesture defaults
    simplifiedGestures: false,
    allowSingleFingerGestures: true,
    disableMultiTouch: false,
    disablePinchZoom: false,
    disableSwipe: false,
    swipeDistanceMultiplier: 1.0,
    // Drag defaults
    dragAssistEnabled: false,
    dragSnapToGrid: false,
    dragGridSize: 20,
    dragAutoComplete: false,
    dragAutoCompleteThreshold: 30,
    // Timing defaults
    extendedResponseTime: false,
    responseTimeMultiplier: 1.0,
    disableTimedElements: false,
    autoAdvanceDelay: 0,
    // Voice defaults
    voiceInputEnabled: false,
    voiceInputForText: true,
    voiceInputForNavigation: false,
    // Dwell defaults
    dwellSelectionEnabled: false,
    dwellTimeMs: 1000,
    dwellIndicatorStyle: 'circle',
    // Switch access defaults
    switchAccessEnabled: false,
    switchAccessMode: 'auto_scan',
    switchScanSpeed: 1500,
    // Keyboard defaults
    preferTyping: false,
    preferVoiceInput: false,
    preferMultipleChoice: false,
    showWordPrediction: true,
    enlargedKeyboard: false,
    keyboardType: 'standard',
    // Feedback defaults
    enhancedTouchFeedback: false,
    hapticFeedbackIntensity: 'normal',
    showTouchRipples: true,
    highlightFocusedElement: true,
    // Tremor filter defaults
    tremorFilterEnabled: false,
    tremorFilterStrength: 50,
    tremorFilterAlgorithm: 'moving_average',
    // Fatigue management defaults
    autoBreakReminders: false,
    breakReminderIntervalMinutes: 15,
    reduceRequirementsOnFatigue: false,
};
// ══════════════════════════════════════════════════════════════════════════════
// TOUCH TARGET SIZES
// ══════════════════════════════════════════════════════════════════════════════
/** Minimum touch target sizes (in dp/pixels) */
export const TOUCH_TARGET_SIZES = {
    /** Standard minimum per WCAG */
    STANDARD: 44,
    /** Large for mild motor difficulties */
    LARGE: 56,
    /** Extra large for moderate difficulties */
    EXTRA_LARGE: 72,
    /** Maximum for significant difficulties */
    MAXIMUM: 96,
};
/** Touch target multipliers for each motor level */
export const MOTOR_LEVEL_TARGET_MULTIPLIERS = {
    TYPICAL: 1.0,
    MILD_DIFFICULTY: 1.25,
    MODERATE_DIFFICULTY: 1.5,
    SIGNIFICANT_DIFFICULTY: 2.0,
    REQUIRES_FULL_SUPPORT: 2.5,
};
// ══════════════════════════════════════════════════════════════════════════════
// TIMING CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════
/** Hold duration presets (ms) */
export const TOUCH_HOLD_DURATIONS = {
    NONE: 0,
    SHORT: 100,
    MEDIUM: 200,
    LONG: 300,
    VERY_LONG: 500,
};
/** Dwell time presets (ms) */
export const DWELL_TIME_PRESETS = {
    FAST: 500,
    NORMAL: 1000,
    SLOW: 1500,
    VERY_SLOW: 2000,
};
/** Switch scan speed presets (ms) */
export const SWITCH_SCAN_SPEEDS = {
    FAST: 750,
    NORMAL: 1500,
    SLOW: 2500,
    VERY_SLOW: 4000,
};
/** Response time multipliers */
export const RESPONSE_TIME_MULTIPLIERS = {
    TYPICAL: 1.0,
    MILD_DIFFICULTY: 1.25,
    MODERATE_DIFFICULTY: 1.5,
    SIGNIFICANT_DIFFICULTY: 2.0,
    REQUIRES_FULL_SUPPORT: 3.0,
};
// ══════════════════════════════════════════════════════════════════════════════
// GESTURE CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════
/** Swipe distance multipliers (higher = more forgiving) */
export const SWIPE_DISTANCE_MULTIPLIERS = {
    TYPICAL: 1.0,
    MILD_DIFFICULTY: 1.3,
    MODERATE_DIFFICULTY: 1.5,
    SIGNIFICANT_DIFFICULTY: 2.0,
    REQUIRES_FULL_SUPPORT: 2.5,
};
/** Minimum swipe distance (pixels) */
export const MIN_SWIPE_DISTANCE = 20;
/** Maximum swipe velocity requirement (pixels/second) */
export const MAX_SWIPE_VELOCITY = 500;
// ══════════════════════════════════════════════════════════════════════════════
// DRAG & DROP CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════
/** Drag grid size presets (pixels) */
export const DRAG_GRID_SIZES = {
    FINE: 10,
    NORMAL: 20,
    COARSE: 40,
    VERY_COARSE: 60,
};
/** Auto-complete threshold presets (pixels) */
export const DRAG_AUTO_COMPLETE_THRESHOLDS = {
    PRECISE: 15,
    NORMAL: 30,
    FORGIVING: 50,
    VERY_FORGIVING: 80,
};
// ══════════════════════════════════════════════════════════════════════════════
// TREMOR FILTER CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════
/** Tremor filter strength presets */
export const TREMOR_FILTER_STRENGTHS = {
    LIGHT: 25,
    MODERATE: 50,
    STRONG: 75,
    MAXIMUM: 100,
};
/** Tremor filter buffer sizes */
export const TREMOR_FILTER_BUFFER_SIZES = {
    moving_average: 5,
    kalman: 10,
    exponential: 3,
};
// ══════════════════════════════════════════════════════════════════════════════
// HAPTIC PATTERNS
// ══════════════════════════════════════════════════════════════════════════════
/** Haptic feedback patterns */
export const HAPTIC_PATTERNS = {
    TAP_CONFIRM: { type: 'impact', intensity: 'light' },
    LONG_PRESS_START: { type: 'impact', intensity: 'medium' },
    LONG_PRESS_COMPLETE: { type: 'impact', intensity: 'heavy' },
    DRAG_START: { type: 'selection', intensity: 'light' },
    DRAG_SNAP: { type: 'selection', intensity: 'medium' },
    DRAG_COMPLETE: { type: 'notification', intensity: 'success' },
    ERROR: { type: 'notification', intensity: 'error' },
    DWELL_PROGRESS: { type: 'selection', intensity: 'light' },
    DWELL_COMPLETE: { type: 'impact', intensity: 'heavy' },
};
// ══════════════════════════════════════════════════════════════════════════════
// AUTO-CONFIGURATION PRESETS
// ══════════════════════════════════════════════════════════════════════════════
/** Auto-configuration for mild motor difficulty */
export const MILD_DIFFICULTY_PRESET = {
    touchTargetMultiplier: 1.25,
    swipeDistanceMultiplier: 1.3,
    responseTimeMultiplier: 1.25,
    showWordPrediction: true,
};
/** Auto-configuration for moderate motor difficulty */
export const MODERATE_DIFFICULTY_PRESET = {
    enlargedTouchTargets: true,
    touchTargetMultiplier: 1.5,
    touchHoldDuration: 100,
    simplifiedGestures: true,
    swipeDistanceMultiplier: 1.5,
    dragAssistEnabled: true,
    dragSnapToGrid: true,
    responseTimeMultiplier: 1.5,
    preferTyping: true,
    enlargedKeyboard: true,
    showWordPrediction: true,
    enhancedTouchFeedback: true,
};
/** Auto-configuration for significant motor difficulty */
export const SIGNIFICANT_DIFFICULTY_PRESET = {
    enlargedTouchTargets: true,
    touchTargetMultiplier: 2.0,
    touchHoldDuration: 200,
    accidentalTouchFilter: true,
    simplifiedGestures: true,
    disableMultiTouch: true,
    swipeDistanceMultiplier: 2.0,
    dragAssistEnabled: true,
    dragSnapToGrid: true,
    dragAutoComplete: true,
    extendedResponseTime: true,
    responseTimeMultiplier: 2.0,
    voiceInputEnabled: true,
    preferTyping: true,
    enlargedKeyboard: true,
    keyboardType: 'large',
    showWordPrediction: true,
    enhancedTouchFeedback: true,
    hapticFeedbackIntensity: 'strong',
};
/** Auto-configuration for full support requirement */
export const FULL_SUPPORT_PRESET = {
    enlargedTouchTargets: true,
    touchTargetMultiplier: 2.5,
    touchHoldDuration: 300,
    accidentalTouchFilter: true,
    edgeIgnoreMargin: 20,
    simplifiedGestures: true,
    disableMultiTouch: true,
    disablePinchZoom: true,
    swipeDistanceMultiplier: 2.5,
    dragAssistEnabled: true,
    dragSnapToGrid: true,
    dragAutoComplete: true,
    dragAutoCompleteThreshold: 50,
    extendedResponseTime: true,
    responseTimeMultiplier: 3.0,
    disableTimedElements: true,
    voiceInputEnabled: true,
    voiceInputForNavigation: true,
    dwellSelectionEnabled: true,
    dwellTimeMs: 1500,
    preferTyping: true,
    preferVoiceInput: true,
    preferMultipleChoice: true,
    enlargedKeyboard: true,
    keyboardType: 'large',
    showWordPrediction: true,
    enhancedTouchFeedback: true,
    hapticFeedbackIntensity: 'strong',
    highlightFocusedElement: true,
};
// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS THRESHOLDS
// ══════════════════════════════════════════════════════════════════════════════
/** Thresholds for accommodation adjustment suggestions */
export const ANALYTICS_THRESHOLDS = {
    /** Minimum tap accuracy before suggesting larger targets */
    MIN_TAP_ACCURACY: 0.7,
    /** Maximum average attempts before suggesting filters */
    MAX_AVG_ATTEMPTS: 2,
    /** Minimum drag success rate before suggesting assist */
    MIN_DRAG_SUCCESS_RATE: 0.6,
    /** Minimum sample size for analysis */
    MIN_SAMPLE_SIZE: 10,
    /** Analysis window (days) */
    ANALYSIS_WINDOW_DAYS: 7,
};
// ══════════════════════════════════════════════════════════════════════════════
// WORD PREDICTION
// ══════════════════════════════════════════════════════════════════════════════
/** Common words for K-5 word prediction */
export const COMMON_WORDS_K5 = [
    'the', 'and', 'is', 'it', 'to', 'was', 'for', 'are', 'but', 'not',
    'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day',
    'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old',
    'see', 'two', 'way', 'who', 'boy', 'did', 'let', 'put', 'say', 'she',
    'too', 'use', 'because', 'before', 'about', 'after', 'again', 'could',
    'school', 'friend', 'happy', 'little', 'every', 'people', 'think',
    'want', 'know', 'like', 'make', 'just', 'over', 'time', 'very', 'when',
    'come', 'made', 'find', 'more', 'long', 'look', 'call', 'first', 'water',
];
//# sourceMappingURL=constants.js.map