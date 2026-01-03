/**
 * Sensory Constants - ND-2.1
 *
 * Constants and thresholds for sensory profile matching.
 */
// ══════════════════════════════════════════════════════════════════════════════
// SENSITIVITY THRESHOLDS
// ══════════════════════════════════════════════════════════════════════════════
/** Threshold levels for sensitivity categorization */
export const SENSITIVITY_THRESHOLDS = {
    HYPOSENSITIVE_MAX: 3,
    TYPICAL_MIN: 4,
    TYPICAL_MAX: 6,
    HYPERSENSITIVE_MIN: 7,
    HIGH_SENSITIVITY: 6,
    VERY_HIGH_SENSITIVITY: 8,
    EXTREME_SENSITIVITY: 9,
};
/** Default values for new sensory profiles */
export const DEFAULT_SENSORY_VALUES = {
    SENSITIVITY_LEVEL: 5,
    PREFERRED_VOLUME: 70,
    PREFERRED_BRIGHTNESS: 80,
    PREFERRED_CONTRAST: 'normal',
    PREFERRED_ANIMATION_SPEED: 'normal',
    TYPICAL_ENVIRONMENT: 'mixed',
};
// ══════════════════════════════════════════════════════════════════════════════
// MATCHING THRESHOLDS
// ══════════════════════════════════════════════════════════════════════════════
/** Match score thresholds */
export const MATCH_SCORE_THRESHOLDS = {
    EXCELLENT: 90,
    GOOD: 75,
    ACCEPTABLE: 50,
    POOR: 30,
    INCOMPATIBLE: 0,
};
/** Penalty values for sensory mismatches */
export const MISMATCH_PENALTIES = {
    // Audio penalties
    SUDDEN_SOUNDS_HIGH_SENSITIVITY: 25,
    SUDDEN_SOUNDS_MODERATE_SENSITIVITY: 15,
    HIGH_VOLUME_PEAK: 10,
    BACKGROUND_MUSIC: 5,
    // Visual penalties
    FLASHING_AVOIDED: 50,
    FLASHING_HIGH_SENSITIVITY: 30,
    HIGH_VISUAL_COMPLEXITY_HIGH_SENSITIVITY: 20,
    HIGH_VISUAL_COMPLEXITY_MODERATE_SENSITIVITY: 10,
    VIBRANT_COLORS_HIGH_SENSITIVITY: 5,
    // Motion penalties
    ANIMATION_NOT_REDUCIBLE_HIGH_SENSITIVITY: 20,
    ANIMATION_NOT_REDUCIBLE_MODERATE_SENSITIVITY: 10,
    INTENSE_ANIMATION: 15,
    QUICK_MOTION: 10,
    // Cognitive penalties
    HIGH_COGNITIVE_LOAD: 15,
    FINE_MOTOR_REQUIRED: 5,
    QUICK_REACTION_REQUIRED: 10,
    // Timing penalties
    FIXED_TIME_LIMITS: 20,
};
// ══════════════════════════════════════════════════════════════════════════════
// VOLUME CALCULATIONS
// ══════════════════════════════════════════════════════════════════════════════
/** Maximum volume reduction based on sensitivity */
export function calculateMaxVolume(sensitivityLevel) {
    return Math.max(30, 100 - sensitivityLevel * 7);
}
/** Effects volume limit for sensitive users */
export const EFFECTS_VOLUME_LIMIT = 50;
// ══════════════════════════════════════════════════════════════════════════════
// TIMING MULTIPLIERS
// ══════════════════════════════════════════════════════════════════════════════
/** Time extension multipliers */
export const TIME_MULTIPLIERS = {
    DEFAULT: 1.0,
    EXTENDED: 1.5,
    VERY_EXTENDED: 2.0,
    UNLIMITED: 0, // 0 = no time limit
};
// ══════════════════════════════════════════════════════════════════════════════
// TEXT SIZE SCALES
// ══════════════════════════════════════════════════════════════════════════════
/** Text scale factors */
export const TEXT_SCALES = {
    SMALL: 0.85,
    NORMAL: 1.0,
    LARGE: 1.3,
    VERY_LARGE: 1.5,
    EXTRA_LARGE: 1.75,
};
// ══════════════════════════════════════════════════════════════════════════════
// BREAK FREQUENCIES
// ══════════════════════════════════════════════════════════════════════════════
/** Break prompt frequency settings */
export const BREAK_FREQUENCIES = {
    LOW: 'low', // Every 30 minutes
    NORMAL: 'normal', // Every 20 minutes
    HIGH: 'high', // Every 10 minutes
    VERY_HIGH: 'very_high', // Every 5 minutes
};
// ══════════════════════════════════════════════════════════════════════════════
// CONTENT TYPE MAPPINGS
// ══════════════════════════════════════════════════════════════════════════════
/** Content types and their typical sensory characteristics */
export const CONTENT_TYPE_SENSORY_DEFAULTS = {
    reading: {
        typicalAudioLevel: 2,
        typicalVisualComplexity: 'simple',
        typicalCognitiveLoad: 'medium',
        typicallyHasMotion: false,
    },
    video: {
        typicalAudioLevel: 7,
        typicalVisualComplexity: 'complex',
        typicalCognitiveLoad: 'medium',
        typicallyHasMotion: true,
    },
    interactive: {
        typicalAudioLevel: 5,
        typicalVisualComplexity: 'moderate',
        typicalCognitiveLoad: 'high',
        typicallyHasMotion: true,
    },
    quiz: {
        typicalAudioLevel: 3,
        typicalVisualComplexity: 'simple',
        typicalCognitiveLoad: 'high',
        typicallyHasMotion: false,
    },
    game: {
        typicalAudioLevel: 8,
        typicalVisualComplexity: 'complex',
        typicalCognitiveLoad: 'high',
        typicallyHasMotion: true,
    },
    social_story: {
        typicalAudioLevel: 4,
        typicalVisualComplexity: 'simple',
        typicalCognitiveLoad: 'low',
        typicallyHasMotion: false,
    },
    practice: {
        typicalAudioLevel: 3,
        typicalVisualComplexity: 'simple',
        typicalCognitiveLoad: 'medium',
        typicallyHasMotion: false,
    },
};
// ══════════════════════════════════════════════════════════════════════════════
// PHOTOSENSITIVITY
// ══════════════════════════════════════════════════════════════════════════════
/** Maximum safe flash frequency for photosensitive users (Hz) */
export const MAX_SAFE_FLASH_FREQUENCY = 3;
/** Flash frequencies that are always blocked */
export const DANGEROUS_FLASH_FREQUENCY_MIN = 3;
export const DANGEROUS_FLASH_FREQUENCY_MAX = 60;
//# sourceMappingURL=constants.js.map