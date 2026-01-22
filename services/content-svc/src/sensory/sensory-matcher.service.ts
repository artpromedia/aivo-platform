/**
 * Sensory Matcher Service - ND-2.1
 *
 * Core matching algorithm that evaluates content suitability
 * based on learner sensory profiles.
 */

import type {
  SensoryProfile,
  ContentSensoryMetadata,
  SensoryMatchResult,
  SensoryWarning,
  ContentAdaptation,
} from './sensory.types.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const MATCH_SCORE_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 75,
  ACCEPTABLE: 60,
  POOR: 40,
  UNSUITABLE: 0,
};

const MISMATCH_PENALTIES = {
  SUDDEN_SOUNDS_HIGH_SENSITIVITY: 25,
  SUDDEN_SOUNDS_MODERATE_SENSITIVITY: 10,
  HIGH_VOLUME_PEAK: 15,
  BACKGROUND_MUSIC: 5,
  FLASHING_AVOIDED: 50,
  FLASHING_HIGH_SENSITIVITY: 35,
  HIGH_VISUAL_COMPLEXITY_HIGH_SENSITIVITY: 20,
  HIGH_VISUAL_COMPLEXITY_MODERATE_SENSITIVITY: 10,
  VIBRANT_COLORS_HIGH_SENSITIVITY: 10,
  ANIMATION_NOT_REDUCIBLE_HIGH_SENSITIVITY: 25,
  INTENSE_ANIMATION: 20,
  QUICK_MOTION: 10,
  FINE_MOTOR_REQUIRED: 10,
  HIGH_COGNITIVE_LOAD: 20,
  FIXED_TIME_LIMITS: 25,
  QUICK_REACTION_REQUIRED: 20,
};

const TIME_MULTIPLIERS = {
  STANDARD: 1,
  EXTENDED: 1.5,
  DOUBLE: 2,
  TRIPLE: 3,
};

const TEXT_SCALES = {
  SMALL: 0.9,
  NORMAL: 1,
  LARGE: 1.25,
  VERY_LARGE: 1.5,
};

// Sensitivity thresholds
function isHighSensitivity(level: number | undefined): boolean {
  return (level ?? 5) >= 7;
}

function isVeryHighSensitivity(level: number | undefined): boolean {
  return (level ?? 5) >= 9;
}

function calculateMaxVolume(sensitivity: number | undefined): number {
  const level = sensitivity ?? 5;
  if (level >= 9) return 30;
  if (level >= 7) return 50;
  if (level >= 5) return 70;
  return 100;
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface MatchOptions {
  includeExplanations?: boolean;
  generateAdaptations?: boolean;
  minimumScore?: number;
  categoryWeights?: Partial<CategoryWeights>;
}

export interface CategoryWeights {
  audio: number;
  visual: number;
  motion: number;
  tactile: number;
  cognitive: number;
}

interface CategoryResult {
  score: number;
  warnings: SensoryWarning[];
}

const DEFAULT_WEIGHTS: CategoryWeights = {
  audio: 1,
  visual: 1.2,
  motion: 1,
  tactile: 0.8,
  cognitive: 1,
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN MATCHING FUNCTION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate match score between a learner's sensory profile and content metadata.
 */
export function calculateSensoryMatch(
  profile: SensoryProfile,
  content: ContentSensoryMetadata,
  options: MatchOptions = {}
): SensoryMatchResult {
  const {
    includeExplanations = true,
    generateAdaptations = true,
    minimumScore = MATCH_SCORE_THRESHOLDS.POOR,
    categoryWeights = {},
  } = options;

  const weights = { ...DEFAULT_WEIGHTS, ...categoryWeights };
  const adaptations: ContentAdaptation[] = [];

  // Calculate category scores
  const audioResult = calculateAudioScore(profile, content);
  const visualResult = calculateVisualScore(profile, content);
  const motionResult = calculateMotionScore(profile, content);
  const tactileResult = calculateTactileScore(profile, content);
  const cognitiveResult = calculateCognitiveScore(profile, content);

  // Collect warnings from all categories
  const warnings: SensoryWarning[] = [
    ...audioResult.warnings,
    ...visualResult.warnings,
    ...motionResult.warnings,
    ...tactileResult.warnings,
    ...cognitiveResult.warnings,
  ];

  // Calculate weighted average score
  const totalWeight =
    weights.audio + weights.visual + weights.motion + weights.tactile + weights.cognitive;

  const weightedScore =
    (audioResult.score * weights.audio +
      visualResult.score * weights.visual +
      motionResult.score * weights.motion +
      tactileResult.score * weights.tactile +
      cognitiveResult.score * weights.cognitive) /
    totalWeight;

  const overallScore = Math.max(0, Math.min(100, Math.round(weightedScore)));
  const isCompatible = overallScore >= minimumScore && !hasBlockingWarnings(warnings);

  if (generateAdaptations) {
    adaptations.push(...generateContentAdaptations(profile, content, warnings));
  }

  if (includeExplanations) {
    addExplanationsToWarnings(warnings);
  }

  return {
    isCompatible,
    overallScore,
    warnings: sortWarningsBySeverity(warnings),
    adaptations,
    categoryScores: {
      audio: audioResult.score,
      visual: visualResult.score,
      motion: motionResult.score,
      tactile: tactileResult.score,
      cognitive: cognitiveResult.score,
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// AUDIO SCORING
// ══════════════════════════════════════════════════════════════════════════════

function calculateAudioScore(
  profile: SensoryProfile,
  content: ContentSensoryMetadata
): CategoryResult {
  let score = 100;
  const warnings: SensoryWarning[] = [];
  const sensitivity = profile.audioSensitivity;

  if (!content.hasAudio) {
    return { score: 100, warnings: [] };
  }

  if (content.hasSuddenSounds) {
    if (isVeryHighSensitivity(sensitivity)) {
      score -= MISMATCH_PENALTIES.SUDDEN_SOUNDS_HIGH_SENSITIVITY;
      warnings.push({
        category: 'audio',
        level: 'warning',
        code: 'SUDDEN_SOUNDS_HIGH_SENSITIVITY',
        message: 'Content has sudden sounds that may startle audio-sensitive learners',
        recommendation: 'Enable sound preview or provide visual sound indicators',
      });
    } else if (isHighSensitivity(sensitivity)) {
      score -= MISMATCH_PENALTIES.SUDDEN_SOUNDS_MODERATE_SENSITIVITY;
      warnings.push({
        category: 'audio',
        level: 'info',
        code: 'SUDDEN_SOUNDS_MODERATE',
        message: 'Content has sudden sounds',
        recommendation: 'Consider lowering volume',
      });
    }
  }

  if (content.audioLevel !== undefined) {
    const profileMaxVolume = profile.maxVolume ?? 100;
    const contentVolumeEstimate = (content.audioLevel / 10) * 100;

    if (contentVolumeEstimate > profileMaxVolume) {
      score -= MISMATCH_PENALTIES.HIGH_VOLUME_PEAK;
      warnings.push({
        category: 'audio',
        level: 'info',
        code: 'VOLUME_EXCEEDS_PREFERENCE',
        message: 'Content audio may exceed preferred volume levels',
        recommendation: `Reduce volume to ${profileMaxVolume}%`,
      });
    }
  }

  if (content.hasBackgroundMusic && profile.prefersQuietEnvironment) {
    score -= MISMATCH_PENALTIES.BACKGROUND_MUSIC;
    warnings.push({
      category: 'audio',
      level: 'info',
      code: 'HAS_BACKGROUND_MUSIC',
      message: 'Content has background music',
      recommendation: 'Mute background music for quiet environment preference',
    });
  }

  if (isHighSensitivity(sensitivity) && content.canMuteAudio) {
    score = Math.min(100, score + 5);
  }

  return { score: Math.max(0, score), warnings };
}

// ══════════════════════════════════════════════════════════════════════════════
// VISUAL SCORING
// ══════════════════════════════════════════════════════════════════════════════

function calculateVisualScore(
  profile: SensoryProfile,
  content: ContentSensoryMetadata
): CategoryResult {
  let score = 100;
  const warnings: SensoryWarning[] = [];
  const sensitivity = profile.visualSensitivity;

  if (content.hasFlashing) {
    if (profile.avoidsFlashing || profile.isPhotosensitive) {
      score -= MISMATCH_PENALTIES.FLASHING_AVOIDED;
      warnings.push({
        category: 'visual',
        level: 'critical',
        code: 'FLASHING_PHOTOSENSITIVE',
        message: 'Content contains flashing that may be harmful for photosensitive learners',
        recommendation: 'Do not present this content without removing flashing elements',
      });
    } else if (isVeryHighSensitivity(sensitivity)) {
      score -= MISMATCH_PENALTIES.FLASHING_HIGH_SENSITIVITY;
      warnings.push({
        category: 'visual',
        level: 'warning',
        code: 'FLASHING_HIGH_SENSITIVITY',
        message: 'Content contains flashing elements',
        recommendation: 'Consider alternative content or disable animations',
      });
    }
  }

  if (content.visualComplexity === 'COMPLEX') {
    if (profile.prefersSimpleVisuals || isVeryHighSensitivity(sensitivity)) {
      score -= MISMATCH_PENALTIES.HIGH_VISUAL_COMPLEXITY_HIGH_SENSITIVITY;
      warnings.push({
        category: 'visual',
        level: 'warning',
        code: 'COMPLEX_VISUALS',
        message: 'Content has complex visuals that may be overwhelming',
        recommendation: 'Enable simplified visual mode if available',
      });
    } else if (isHighSensitivity(sensitivity)) {
      score -= MISMATCH_PENALTIES.HIGH_VISUAL_COMPLEXITY_MODERATE_SENSITIVITY;
      warnings.push({
        category: 'visual',
        level: 'info',
        code: 'COMPLEX_VISUALS_MODERATE',
        message: 'Content has moderately complex visuals',
      });
    }
  }

  if (content.hasVibrantColors && isHighSensitivity(sensitivity)) {
    score -= MISMATCH_PENALTIES.VIBRANT_COLORS_HIGH_SENSITIVITY;
    warnings.push({
      category: 'visual',
      level: 'info',
      code: 'VIBRANT_COLORS',
      message: 'Content uses vibrant colors',
      recommendation: 'Consider reducing screen brightness',
    });
  }

  return { score: Math.max(0, score), warnings };
}

// ══════════════════════════════════════════════════════════════════════════════
// MOTION SCORING
// ══════════════════════════════════════════════════════════════════════════════

function calculateMotionScore(
  profile: SensoryProfile,
  content: ContentSensoryMetadata
): CategoryResult {
  let score = 100;
  const warnings: SensoryWarning[] = [];
  const sensitivity = profile.motionSensitivity;

  if (!content.hasAnimation) {
    return { score: 100, warnings: [] };
  }

  if (profile.prefersReducedMotion) {
    if (content.animationReducible) {
      score -= 5;
      warnings.push({
        category: 'motion',
        level: 'info',
        code: 'ANIMATION_REDUCIBLE',
        message: 'Content has animations (reducible)',
        recommendation: 'Enable reduced motion mode',
      });
    } else {
      score -= MISMATCH_PENALTIES.ANIMATION_NOT_REDUCIBLE_HIGH_SENSITIVITY;
      warnings.push({
        category: 'motion',
        level: 'warning',
        code: 'ANIMATION_NOT_REDUCIBLE',
        message: 'Content has animations that cannot be reduced',
        recommendation: 'Consider alternative content without animations',
      });
    }
  }

  if (content.animationIntensity === 'INTENSE') {
    if (isVeryHighSensitivity(sensitivity)) {
      score -= MISMATCH_PENALTIES.INTENSE_ANIMATION;
      warnings.push({
        category: 'motion',
        level: 'warning',
        code: 'INTENSE_ANIMATION',
        message: 'Content has intense animations',
        recommendation: 'Slow down or disable animations',
      });
    }
  }

  if (content.hasQuickMotion && isHighSensitivity(sensitivity)) {
    score -= MISMATCH_PENALTIES.QUICK_MOTION;
    warnings.push({
      category: 'motion',
      level: 'info',
      code: 'QUICK_MOTION',
      message: 'Content has quick motion elements',
    });
  }

  if (content.hasParallax && profile.avoidsParallax) {
    score -= 10;
    warnings.push({
      category: 'motion',
      level: 'info',
      code: 'HAS_PARALLAX',
      message: 'Content uses parallax scrolling effects',
      recommendation: 'Disable parallax effects',
    });
  }

  return { score: Math.max(0, score), warnings };
}

// ══════════════════════════════════════════════════════════════════════════════
// TACTILE SCORING
// ══════════════════════════════════════════════════════════════════════════════

function calculateTactileScore(
  profile: SensoryProfile,
  content: ContentSensoryMetadata
): CategoryResult {
  let score = 100;
  const warnings: SensoryWarning[] = [];

  if (content.hasHapticFeedback && profile.prefersNoHaptic) {
    if (content.canDisableHaptic) {
      score -= 5;
      warnings.push({
        category: 'tactile',
        level: 'info',
        code: 'HAPTIC_DISABLEABLE',
        message: 'Content has haptic feedback (can be disabled)',
        recommendation: 'Disable haptic feedback in settings',
      });
    } else {
      score -= 15;
      warnings.push({
        category: 'tactile',
        level: 'warning',
        code: 'HAPTIC_NOT_DISABLEABLE',
        message: 'Content has haptic feedback that cannot be disabled',
      });
    }
  }

  if (content.requiresFineTouchInput) {
    score -= MISMATCH_PENALTIES.FINE_MOTOR_REQUIRED;
    warnings.push({
      category: 'tactile',
      level: 'info',
      code: 'REQUIRES_FINE_MOTOR',
      message: 'Content requires precise touch input',
      recommendation: 'Consider enabling larger touch targets',
    });
  }

  return { score: Math.max(0, score), warnings };
}

// ══════════════════════════════════════════════════════════════════════════════
// COGNITIVE SCORING
// ══════════════════════════════════════════════════════════════════════════════

function calculateCognitiveScore(
  profile: SensoryProfile,
  content: ContentSensoryMetadata
): CategoryResult {
  let score = 100;
  const warnings: SensoryWarning[] = [];

  if (content.cognitiveLoad === 'HIGH') {
    if (profile.processingSpeed === 'slow') {
      score -= MISMATCH_PENALTIES.HIGH_COGNITIVE_LOAD;
      warnings.push({
        category: 'cognitive',
        level: 'warning',
        code: 'HIGH_COGNITIVE_LOAD',
        message: 'Content has high cognitive load',
        recommendation: 'Break content into smaller sections',
      });
    }
  }

  if (content.hasTimeLimits) {
    if (profile.needsExtendedTime) {
      if (content.timeLimitsAdjustable) {
        score -= 5;
        warnings.push({
          category: 'cognitive',
          level: 'info',
          code: 'ADJUSTABLE_TIME_LIMITS',
          message: 'Content has time limits (adjustable)',
          recommendation: `Extend time limits by ${profile.timeExtensionFactor}x`,
        });
      } else {
        score -= MISMATCH_PENALTIES.FIXED_TIME_LIMITS;
        warnings.push({
          category: 'cognitive',
          level: 'warning',
          code: 'FIXED_TIME_LIMITS',
          message: 'Content has fixed time limits that cannot be extended',
          recommendation: 'Consider alternative content without time limits',
        });
      }
    }
  }

  if (content.requiresQuickReactions && profile.processingSpeed === 'slow') {
    score -= MISMATCH_PENALTIES.QUICK_REACTION_REQUIRED;
    warnings.push({
      category: 'cognitive',
      level: 'warning',
      code: 'REQUIRES_QUICK_REACTIONS',
      message: 'Content requires quick reaction times',
      recommendation: 'Slow down interaction pace if possible',
    });
  }

  return { score: Math.max(0, score), warnings };
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function hasBlockingWarnings(warnings: SensoryWarning[]): boolean {
  return warnings.some((w) => w.level === 'critical');
}

function sortWarningsBySeverity(warnings: SensoryWarning[]): SensoryWarning[] {
  const severityOrder: Record<string, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  return [...warnings].sort(
    (a, b) => (severityOrder[a.level] ?? 2) - (severityOrder[b.level] ?? 2)
  );
}

function addExplanationsToWarnings(warnings: SensoryWarning[]): void {
  const explanations: Record<string, string> = {
    SUDDEN_SOUNDS_HIGH_SENSITIVITY:
      'Unexpected loud sounds can cause distress for learners with audio sensitivities.',
    FLASHING_PHOTOSENSITIVE:
      'Flashing content can trigger seizures or migraines in photosensitive individuals.',
    COMPLEX_VISUALS:
      'Busy or cluttered screens can make it hard to focus and may cause visual overwhelm.',
    ANIMATION_NOT_REDUCIBLE: 'Motion on screen can cause discomfort for motion-sensitive learners.',
    HIGH_COGNITIVE_LOAD:
      'Content with many concepts at once may be challenging for learners who need more processing time.',
    FIXED_TIME_LIMITS:
      'Time pressure can increase anxiety and reduce performance for learners who need extended time.',
  };

  for (const warning of warnings) {
    if (explanations[warning.code]) {
      (warning as SensoryWarning & { explanation?: string }).explanation =
        explanations[warning.code];
    }
  }
}

function generateContentAdaptations(
  profile: SensoryProfile,
  content: ContentSensoryMetadata,
  _warnings: SensoryWarning[]
): ContentAdaptation[] {
  const adaptations: ContentAdaptation[] = [];

  // Audio adaptations
  if (content.hasAudio && isHighSensitivity(profile.audioSensitivity)) {
    const maxVolume = calculateMaxVolume(profile.audioSensitivity);
    adaptations.push({
      type: 'audio',
      setting: 'volume',
      recommendedValue: maxVolume,
      reason: 'Adjusted for audio sensitivity',
    });

    if (content.hasSuddenSounds && content.canMuteAudio) {
      adaptations.push({
        type: 'audio',
        setting: 'muteEffects',
        recommendedValue: true,
        reason: 'Muted sound effects due to sensitivity to sudden sounds',
      });
    }
  }

  // Visual adaptations
  if (profile.prefersSimpleVisuals || isHighSensitivity(profile.visualSensitivity)) {
    adaptations.push({
      type: 'visual',
      setting: 'simplifiedMode',
      recommendedValue: true,
      reason: 'Enabled simplified visuals for visual sensitivity',
    });
  }

  if (profile.preferredBrightness && profile.preferredBrightness < 80) {
    adaptations.push({
      type: 'visual',
      setting: 'brightness',
      recommendedValue: profile.preferredBrightness,
      reason: 'Adjusted brightness to preference',
    });
  }

  if (profile.preferredContrast && profile.preferredContrast !== 'normal') {
    adaptations.push({
      type: 'visual',
      setting: 'contrast',
      recommendedValue: profile.preferredContrast,
      reason: 'Adjusted contrast to preference',
    });
  }

  // Motion adaptations
  if (profile.prefersReducedMotion && content.animationReducible) {
    adaptations.push({
      type: 'motion',
      setting: 'reducedMotion',
      recommendedValue: true,
      reason: 'Enabled reduced motion mode',
    });
  }

  if (profile.preferredAnimationSpeed && profile.preferredAnimationSpeed !== 'normal') {
    adaptations.push({
      type: 'motion',
      setting: 'animationSpeed',
      recommendedValue: profile.preferredAnimationSpeed,
      reason: 'Adjusted animation speed to preference',
    });
  }

  // Timing adaptations
  if (profile.needsExtendedTime && content.timeLimitsAdjustable) {
    adaptations.push({
      type: 'timing',
      setting: 'timeMultiplier',
      recommendedValue: profile.timeExtensionFactor || TIME_MULTIPLIERS.EXTENDED,
      reason: 'Extended time limits',
    });
  }

  // Tactile adaptations
  if (profile.prefersNoHaptic && content.canDisableHaptic) {
    adaptations.push({
      type: 'tactile',
      setting: 'hapticEnabled',
      recommendedValue: false,
      reason: 'Disabled haptic feedback',
    });
  }

  // Text adaptations
  if (profile.preferredTextSize && profile.preferredTextSize !== 'normal') {
    const scale =
      TEXT_SCALES[profile.preferredTextSize.toUpperCase() as keyof typeof TEXT_SCALES] ||
      TEXT_SCALES.NORMAL;
    adaptations.push({
      type: 'visual',
      setting: 'textScale',
      recommendedValue: scale,
      reason: 'Adjusted text size to preference',
    });
  }

  if (profile.prefersDyslexiaFont) {
    adaptations.push({
      type: 'visual',
      setting: 'dyslexiaFont',
      recommendedValue: true,
      reason: 'Enabled dyslexia-friendly font',
    });
  }

  // Break reminders
  if (profile.needsFrequentBreaks) {
    adaptations.push({
      type: 'timing',
      setting: 'breakReminders',
      recommendedValue: profile.preferredBreakFrequency || 'normal',
      reason: 'Enabled break reminders',
    });
  }

  return adaptations;
}

// ══════════════════════════════════════════════════════════════════════════════
// BATCH MATCHING
// ══════════════════════════════════════════════════════════════════════════════

export interface BatchMatchResult {
  contentId: string;
  matchResult: SensoryMatchResult;
}

/**
 * Match multiple content items against a profile.
 */
export function batchCalculateSensoryMatch(
  profile: SensoryProfile,
  contentItems: { id: string; metadata: ContentSensoryMetadata }[],
  options: MatchOptions = {}
): BatchMatchResult[] {
  return contentItems.map((item) => ({
    contentId: item.id,
    matchResult: calculateSensoryMatch(profile, item.metadata, options),
  }));
}

/**
 * Filter content items to only those suitable for a profile.
 */
export function filterSuitableContent<T extends { id: string; metadata: ContentSensoryMetadata }>(
  profile: SensoryProfile,
  contentItems: T[],
  options: MatchOptions = {}
): T[] {
  const results = batchCalculateSensoryMatch(profile, contentItems, options);
  const suitableIds = new Set(
    results.filter((r) => r.matchResult.isCompatible).map((r) => r.contentId)
  );
  return contentItems.filter((item) => suitableIds.has(item.id));
}

/**
 * Rank content items by sensory match score.
 */
export function rankContentBySensoryMatch<
  T extends { id: string; metadata: ContentSensoryMetadata },
>(
  profile: SensoryProfile,
  contentItems: T[],
  options: MatchOptions = {}
): (T & { matchScore: number })[] {
  const results = batchCalculateSensoryMatch(profile, contentItems, options);
  const scoreMap = new Map(results.map((r) => [r.contentId, r.matchResult.overallScore]));

  return contentItems
    .map((item) => ({
      ...item,
      matchScore: scoreMap.get(item.id) || 0,
    }))
    .sort((a, b) => b.matchScore - a.matchScore);
}

// ══════════════════════════════════════════════════════════════════════════════
// CLASS WRAPPER
// ══════════════════════════════════════════════════════════════════════════════

export class SensoryMatcherService {
  calculateMatch = calculateSensoryMatch;
  batchCalculateMatch = batchCalculateSensoryMatch;
  filterSuitable = filterSuitableContent;
  rankByMatch = rankContentBySensoryMatch;
}

export const sensoryMatcherService = new SensoryMatcherService();
