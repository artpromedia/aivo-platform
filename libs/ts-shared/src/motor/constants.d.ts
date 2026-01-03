/**
 * Motor Accommodation Constants - ND-3.3
 *
 * Default values and configuration constants for motor accommodations.
 */
/** Default motor profile values */
export declare const DEFAULT_MOTOR_PROFILE: {
    readonly fineMotorLevel: "TYPICAL";
    readonly grossMotorLevel: "TYPICAL";
    readonly hasTremor: false;
    readonly tremorSeverity: any;
    readonly hasLimitedRange: false;
    readonly limitedRangeSide: any;
    readonly hasFatigue: false;
    readonly fatigueThresholdMinutes: any;
    readonly enlargedTouchTargets: false;
    readonly touchTargetMultiplier: 1;
    readonly touchHoldDuration: 0;
    readonly accidentalTouchFilter: false;
    readonly edgeIgnoreMargin: 0;
    readonly simplifiedGestures: false;
    readonly allowSingleFingerGestures: true;
    readonly disableMultiTouch: false;
    readonly disablePinchZoom: false;
    readonly disableSwipe: false;
    readonly swipeDistanceMultiplier: 1;
    readonly dragAssistEnabled: false;
    readonly dragSnapToGrid: false;
    readonly dragGridSize: 20;
    readonly dragAutoComplete: false;
    readonly dragAutoCompleteThreshold: 30;
    readonly extendedResponseTime: false;
    readonly responseTimeMultiplier: 1;
    readonly disableTimedElements: false;
    readonly autoAdvanceDelay: 0;
    readonly voiceInputEnabled: false;
    readonly voiceInputForText: true;
    readonly voiceInputForNavigation: false;
    readonly dwellSelectionEnabled: false;
    readonly dwellTimeMs: 1000;
    readonly dwellIndicatorStyle: "circle";
    readonly switchAccessEnabled: false;
    readonly switchAccessMode: "auto_scan";
    readonly switchScanSpeed: 1500;
    readonly preferTyping: false;
    readonly preferVoiceInput: false;
    readonly preferMultipleChoice: false;
    readonly showWordPrediction: true;
    readonly enlargedKeyboard: false;
    readonly keyboardType: "standard";
    readonly enhancedTouchFeedback: false;
    readonly hapticFeedbackIntensity: "normal";
    readonly showTouchRipples: true;
    readonly highlightFocusedElement: true;
    readonly tremorFilterEnabled: false;
    readonly tremorFilterStrength: 50;
    readonly tremorFilterAlgorithm: "moving_average";
    readonly autoBreakReminders: false;
    readonly breakReminderIntervalMinutes: 15;
    readonly reduceRequirementsOnFatigue: false;
};
/** Minimum touch target sizes (in dp/pixels) */
export declare const TOUCH_TARGET_SIZES: {
    /** Standard minimum per WCAG */
    readonly STANDARD: 44;
    /** Large for mild motor difficulties */
    readonly LARGE: 56;
    /** Extra large for moderate difficulties */
    readonly EXTRA_LARGE: 72;
    /** Maximum for significant difficulties */
    readonly MAXIMUM: 96;
};
/** Touch target multipliers for each motor level */
export declare const MOTOR_LEVEL_TARGET_MULTIPLIERS: {
    readonly TYPICAL: 1;
    readonly MILD_DIFFICULTY: 1.25;
    readonly MODERATE_DIFFICULTY: 1.5;
    readonly SIGNIFICANT_DIFFICULTY: 2;
    readonly REQUIRES_FULL_SUPPORT: 2.5;
};
/** Hold duration presets (ms) */
export declare const TOUCH_HOLD_DURATIONS: {
    readonly NONE: 0;
    readonly SHORT: 100;
    readonly MEDIUM: 200;
    readonly LONG: 300;
    readonly VERY_LONG: 500;
};
/** Dwell time presets (ms) */
export declare const DWELL_TIME_PRESETS: {
    readonly FAST: 500;
    readonly NORMAL: 1000;
    readonly SLOW: 1500;
    readonly VERY_SLOW: 2000;
};
/** Switch scan speed presets (ms) */
export declare const SWITCH_SCAN_SPEEDS: {
    readonly FAST: 750;
    readonly NORMAL: 1500;
    readonly SLOW: 2500;
    readonly VERY_SLOW: 4000;
};
/** Response time multipliers */
export declare const RESPONSE_TIME_MULTIPLIERS: {
    readonly TYPICAL: 1;
    readonly MILD_DIFFICULTY: 1.25;
    readonly MODERATE_DIFFICULTY: 1.5;
    readonly SIGNIFICANT_DIFFICULTY: 2;
    readonly REQUIRES_FULL_SUPPORT: 3;
};
/** Swipe distance multipliers (higher = more forgiving) */
export declare const SWIPE_DISTANCE_MULTIPLIERS: {
    readonly TYPICAL: 1;
    readonly MILD_DIFFICULTY: 1.3;
    readonly MODERATE_DIFFICULTY: 1.5;
    readonly SIGNIFICANT_DIFFICULTY: 2;
    readonly REQUIRES_FULL_SUPPORT: 2.5;
};
/** Minimum swipe distance (pixels) */
export declare const MIN_SWIPE_DISTANCE = 20;
/** Maximum swipe velocity requirement (pixels/second) */
export declare const MAX_SWIPE_VELOCITY = 500;
/** Drag grid size presets (pixels) */
export declare const DRAG_GRID_SIZES: {
    readonly FINE: 10;
    readonly NORMAL: 20;
    readonly COARSE: 40;
    readonly VERY_COARSE: 60;
};
/** Auto-complete threshold presets (pixels) */
export declare const DRAG_AUTO_COMPLETE_THRESHOLDS: {
    readonly PRECISE: 15;
    readonly NORMAL: 30;
    readonly FORGIVING: 50;
    readonly VERY_FORGIVING: 80;
};
/** Tremor filter strength presets */
export declare const TREMOR_FILTER_STRENGTHS: {
    readonly LIGHT: 25;
    readonly MODERATE: 50;
    readonly STRONG: 75;
    readonly MAXIMUM: 100;
};
/** Tremor filter buffer sizes */
export declare const TREMOR_FILTER_BUFFER_SIZES: {
    readonly moving_average: 5;
    readonly kalman: 10;
    readonly exponential: 3;
};
/** Haptic feedback patterns */
export declare const HAPTIC_PATTERNS: {
    readonly TAP_CONFIRM: {
        readonly type: "impact";
        readonly intensity: "light";
    };
    readonly LONG_PRESS_START: {
        readonly type: "impact";
        readonly intensity: "medium";
    };
    readonly LONG_PRESS_COMPLETE: {
        readonly type: "impact";
        readonly intensity: "heavy";
    };
    readonly DRAG_START: {
        readonly type: "selection";
        readonly intensity: "light";
    };
    readonly DRAG_SNAP: {
        readonly type: "selection";
        readonly intensity: "medium";
    };
    readonly DRAG_COMPLETE: {
        readonly type: "notification";
        readonly intensity: "success";
    };
    readonly ERROR: {
        readonly type: "notification";
        readonly intensity: "error";
    };
    readonly DWELL_PROGRESS: {
        readonly type: "selection";
        readonly intensity: "light";
    };
    readonly DWELL_COMPLETE: {
        readonly type: "impact";
        readonly intensity: "heavy";
    };
};
/** Auto-configuration for mild motor difficulty */
export declare const MILD_DIFFICULTY_PRESET: {
    readonly touchTargetMultiplier: 1.25;
    readonly swipeDistanceMultiplier: 1.3;
    readonly responseTimeMultiplier: 1.25;
    readonly showWordPrediction: true;
};
/** Auto-configuration for moderate motor difficulty */
export declare const MODERATE_DIFFICULTY_PRESET: {
    readonly enlargedTouchTargets: true;
    readonly touchTargetMultiplier: 1.5;
    readonly touchHoldDuration: 100;
    readonly simplifiedGestures: true;
    readonly swipeDistanceMultiplier: 1.5;
    readonly dragAssistEnabled: true;
    readonly dragSnapToGrid: true;
    readonly responseTimeMultiplier: 1.5;
    readonly preferTyping: true;
    readonly enlargedKeyboard: true;
    readonly showWordPrediction: true;
    readonly enhancedTouchFeedback: true;
};
/** Auto-configuration for significant motor difficulty */
export declare const SIGNIFICANT_DIFFICULTY_PRESET: {
    readonly enlargedTouchTargets: true;
    readonly touchTargetMultiplier: 2;
    readonly touchHoldDuration: 200;
    readonly accidentalTouchFilter: true;
    readonly simplifiedGestures: true;
    readonly disableMultiTouch: true;
    readonly swipeDistanceMultiplier: 2;
    readonly dragAssistEnabled: true;
    readonly dragSnapToGrid: true;
    readonly dragAutoComplete: true;
    readonly extendedResponseTime: true;
    readonly responseTimeMultiplier: 2;
    readonly voiceInputEnabled: true;
    readonly preferTyping: true;
    readonly enlargedKeyboard: true;
    readonly keyboardType: "large";
    readonly showWordPrediction: true;
    readonly enhancedTouchFeedback: true;
    readonly hapticFeedbackIntensity: "strong";
};
/** Auto-configuration for full support requirement */
export declare const FULL_SUPPORT_PRESET: {
    readonly enlargedTouchTargets: true;
    readonly touchTargetMultiplier: 2.5;
    readonly touchHoldDuration: 300;
    readonly accidentalTouchFilter: true;
    readonly edgeIgnoreMargin: 20;
    readonly simplifiedGestures: true;
    readonly disableMultiTouch: true;
    readonly disablePinchZoom: true;
    readonly swipeDistanceMultiplier: 2.5;
    readonly dragAssistEnabled: true;
    readonly dragSnapToGrid: true;
    readonly dragAutoComplete: true;
    readonly dragAutoCompleteThreshold: 50;
    readonly extendedResponseTime: true;
    readonly responseTimeMultiplier: 3;
    readonly disableTimedElements: true;
    readonly voiceInputEnabled: true;
    readonly voiceInputForNavigation: true;
    readonly dwellSelectionEnabled: true;
    readonly dwellTimeMs: 1500;
    readonly preferTyping: true;
    readonly preferVoiceInput: true;
    readonly preferMultipleChoice: true;
    readonly enlargedKeyboard: true;
    readonly keyboardType: "large";
    readonly showWordPrediction: true;
    readonly enhancedTouchFeedback: true;
    readonly hapticFeedbackIntensity: "strong";
    readonly highlightFocusedElement: true;
};
/** Thresholds for accommodation adjustment suggestions */
export declare const ANALYTICS_THRESHOLDS: {
    /** Minimum tap accuracy before suggesting larger targets */
    readonly MIN_TAP_ACCURACY: 0.7;
    /** Maximum average attempts before suggesting filters */
    readonly MAX_AVG_ATTEMPTS: 2;
    /** Minimum drag success rate before suggesting assist */
    readonly MIN_DRAG_SUCCESS_RATE: 0.6;
    /** Minimum sample size for analysis */
    readonly MIN_SAMPLE_SIZE: 10;
    /** Analysis window (days) */
    readonly ANALYSIS_WINDOW_DAYS: 7;
};
/** Common words for K-5 word prediction */
export declare const COMMON_WORDS_K5: readonly ["the", "and", "is", "it", "to", "was", "for", "are", "but", "not", "you", "all", "can", "had", "her", "was", "one", "our", "out", "day", "get", "has", "him", "his", "how", "its", "may", "new", "now", "old", "see", "two", "way", "who", "boy", "did", "let", "put", "say", "she", "too", "use", "because", "before", "about", "after", "again", "could", "school", "friend", "happy", "little", "every", "people", "think", "want", "know", "like", "make", "just", "over", "time", "very", "when", "come", "made", "find", "more", "long", "look", "call", "first", "water"];
//# sourceMappingURL=constants.d.ts.map