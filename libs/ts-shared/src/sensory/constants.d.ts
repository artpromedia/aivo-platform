/**
 * Sensory Constants - ND-2.1
 *
 * Constants and thresholds for sensory profile matching.
 */
/** Threshold levels for sensitivity categorization */
export declare const SENSITIVITY_THRESHOLDS: {
    readonly HYPOSENSITIVE_MAX: 3;
    readonly TYPICAL_MIN: 4;
    readonly TYPICAL_MAX: 6;
    readonly HYPERSENSITIVE_MIN: 7;
    readonly HIGH_SENSITIVITY: 6;
    readonly VERY_HIGH_SENSITIVITY: 8;
    readonly EXTREME_SENSITIVITY: 9;
};
/** Default values for new sensory profiles */
export declare const DEFAULT_SENSORY_VALUES: {
    readonly SENSITIVITY_LEVEL: 5;
    readonly PREFERRED_VOLUME: 70;
    readonly PREFERRED_BRIGHTNESS: 80;
    readonly PREFERRED_CONTRAST: "normal";
    readonly PREFERRED_ANIMATION_SPEED: "normal";
    readonly TYPICAL_ENVIRONMENT: "mixed";
};
/** Match score thresholds */
export declare const MATCH_SCORE_THRESHOLDS: {
    readonly EXCELLENT: 90;
    readonly GOOD: 75;
    readonly ACCEPTABLE: 50;
    readonly POOR: 30;
    readonly INCOMPATIBLE: 0;
};
/** Penalty values for sensory mismatches */
export declare const MISMATCH_PENALTIES: {
    readonly SUDDEN_SOUNDS_HIGH_SENSITIVITY: 25;
    readonly SUDDEN_SOUNDS_MODERATE_SENSITIVITY: 15;
    readonly HIGH_VOLUME_PEAK: 10;
    readonly BACKGROUND_MUSIC: 5;
    readonly FLASHING_AVOIDED: 50;
    readonly FLASHING_HIGH_SENSITIVITY: 30;
    readonly HIGH_VISUAL_COMPLEXITY_HIGH_SENSITIVITY: 20;
    readonly HIGH_VISUAL_COMPLEXITY_MODERATE_SENSITIVITY: 10;
    readonly VIBRANT_COLORS_HIGH_SENSITIVITY: 5;
    readonly ANIMATION_NOT_REDUCIBLE_HIGH_SENSITIVITY: 20;
    readonly ANIMATION_NOT_REDUCIBLE_MODERATE_SENSITIVITY: 10;
    readonly INTENSE_ANIMATION: 15;
    readonly QUICK_MOTION: 10;
    readonly HIGH_COGNITIVE_LOAD: 15;
    readonly FINE_MOTOR_REQUIRED: 5;
    readonly QUICK_REACTION_REQUIRED: 10;
    readonly FIXED_TIME_LIMITS: 20;
};
/** Maximum volume reduction based on sensitivity */
export declare function calculateMaxVolume(sensitivityLevel: number): number;
/** Effects volume limit for sensitive users */
export declare const EFFECTS_VOLUME_LIMIT = 50;
/** Time extension multipliers */
export declare const TIME_MULTIPLIERS: {
    readonly DEFAULT: 1;
    readonly EXTENDED: 1.5;
    readonly VERY_EXTENDED: 2;
    readonly UNLIMITED: 0;
};
/** Text scale factors */
export declare const TEXT_SCALES: {
    readonly SMALL: 0.85;
    readonly NORMAL: 1;
    readonly LARGE: 1.3;
    readonly VERY_LARGE: 1.5;
    readonly EXTRA_LARGE: 1.75;
};
/** Break prompt frequency settings */
export declare const BREAK_FREQUENCIES: {
    readonly LOW: "low";
    readonly NORMAL: "normal";
    readonly HIGH: "high";
    readonly VERY_HIGH: "very_high";
};
/** Content types and their typical sensory characteristics */
export declare const CONTENT_TYPE_SENSORY_DEFAULTS: Record<string, {
    typicalAudioLevel: number;
    typicalVisualComplexity: 'simple' | 'moderate' | 'complex';
    typicalCognitiveLoad: 'low' | 'medium' | 'high';
    typicallyHasMotion: boolean;
}>;
/** Maximum safe flash frequency for photosensitive users (Hz) */
export declare const MAX_SAFE_FLASH_FREQUENCY = 3;
/** Flash frequencies that are always blocked */
export declare const DANGEROUS_FLASH_FREQUENCY_MIN = 3;
export declare const DANGEROUS_FLASH_FREQUENCY_MAX = 60;
//# sourceMappingURL=constants.d.ts.map