/**
 * Sensory Content Filters - ND-2.1
 *
 * Database query filters for content based on sensory profiles.
 * Integrates with Prisma to filter content at the database level.
 */

import type { Prisma } from '@prisma/client';
import type { SensoryProfile, SensoryContentFilter } from '@aivo/ts-shared';
import { isHighSensitivity, isVeryHighSensitivity } from '@aivo/ts-shared';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface FilterResult {
  /** Prisma where clause for ContentSensoryMetadata */
  where: Prisma.ContentSensoryMetadataWhereInput;
  /** Description of applied filters for logging */
  appliedFilters: string[];
  /** Filters that couldn't be applied at DB level */
  postFilters: string[];
}

export interface ContentFilterOptions {
  /** Strictness level for filtering */
  strictness?: 'relaxed' | 'normal' | 'strict';
  /** Include content with missing sensory metadata */
  includeUnanalyzed?: boolean;
  /** Maximum intensity score to allow */
  maxIntensityScore?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN FILTER BUILDER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Build Prisma where clause for filtering content based on sensory profile.
 *
 * @param profile - Learner's sensory profile
 * @param options - Filter options
 * @returns Prisma where clause and filter metadata
 */
export function buildSensoryContentFilter(
  profile: SensoryProfile,
  options: ContentFilterOptions = {}
): FilterResult {
  const { strictness = 'normal', includeUnanalyzed = false, maxIntensityScore } = options;

  const conditions: Prisma.ContentSensoryMetadataWhereInput[] = [];
  const appliedFilters: string[] = [];
  const postFilters: string[] = [];

  // ────────────────────────────────────────────────────────────────────────────
  // PHOTOSENSITIVITY FILTERS (Critical - Always Applied)
  // ────────────────────────────────────────────────────────────────────────────

  if (profile.isPhotosensitive || profile.avoidsFlashing) {
    conditions.push({ suitableForPhotosensitive: true });
    appliedFilters.push('photosensitive-safe');

    // Extra strict: no flashing at all
    conditions.push({ hasFlashing: false });
    appliedFilters.push('no-flashing');
  }

  // ────────────────────────────────────────────────────────────────────────────
  // AUDIO SENSITIVITY FILTERS
  // ────────────────────────────────────────────────────────────────────────────

  if (isVeryHighSensitivity(profile.audioSensitivity)) {
    conditions.push({ suitableForAudioSensitive: true });
    appliedFilters.push('audio-sensitive-safe');

    if (strictness === 'strict') {
      conditions.push({ hasSuddenSounds: false });
      appliedFilters.push('no-sudden-sounds');
    }
  } else if (isHighSensitivity(profile.audioSensitivity) && strictness !== 'relaxed') {
    conditions.push({
      OR: [{ suitableForAudioSensitive: true }, { canMuteAudio: true }],
    });
    appliedFilters.push('audio-sensitive-or-mutable');
  }

  if (profile.prefersNoSuddenSounds) {
    conditions.push({
      OR: [{ hasSuddenSounds: false }, { canMuteAudio: true }],
    });
    appliedFilters.push('prefer-no-sudden-sounds');
  }

  // ────────────────────────────────────────────────────────────────────────────
  // VISUAL SENSITIVITY FILTERS
  // ────────────────────────────────────────────────────────────────────────────

  if (isVeryHighSensitivity(profile.visualSensitivity)) {
    conditions.push({
      OR: [{ visualComplexity: 'SIMPLE' }, { visualComplexity: 'MODERATE' }],
    });
    appliedFilters.push('visual-complexity-limited');
  }

  if (profile.prefersSimpleVisuals) {
    conditions.push({ visualComplexity: 'SIMPLE' });
    appliedFilters.push('simple-visuals-only');
  }

  // ────────────────────────────────────────────────────────────────────────────
  // MOTION SENSITIVITY FILTERS
  // ────────────────────────────────────────────────────────────────────────────

  if (isVeryHighSensitivity(profile.motionSensitivity)) {
    conditions.push({ suitableForMotionSensitive: true });
    appliedFilters.push('motion-sensitive-safe');
  }

  if (profile.prefersReducedMotion) {
    conditions.push({
      OR: [
        { hasAnimation: false },
        { animationReducible: true },
        { animationIntensity: 'NONE' },
        { animationIntensity: 'MILD' },
      ],
    });
    appliedFilters.push('reduced-motion-compatible');
  }

  if (profile.avoidsParallax) {
    conditions.push({ hasParallax: false });
    appliedFilters.push('no-parallax');
  }

  // ────────────────────────────────────────────────────────────────────────────
  // COGNITIVE FILTERS
  // ────────────────────────────────────────────────────────────────────────────

  if (profile.needsExtendedTime) {
    conditions.push({
      OR: [{ hasTimeLimits: false }, { timeLimitsAdjustable: true }],
    });
    appliedFilters.push('time-limits-adjustable');
  }

  if (profile.processingSpeed === 'slow' && strictness !== 'relaxed') {
    conditions.push({
      OR: [
        { cognitiveLoad: 'LOW' },
        { cognitiveLoad: 'MEDIUM' },
        { requiresQuickReactions: false },
      ],
    });
    appliedFilters.push('cognitive-load-limited');
    postFilters.push('post-filter-cognitive-score');
  }

  // ────────────────────────────────────────────────────────────────────────────
  // TACTILE FILTERS
  // ────────────────────────────────────────────────────────────────────────────

  if (profile.prefersNoHaptic) {
    conditions.push({
      OR: [{ hasHapticFeedback: false }, { canDisableHaptic: true }],
    });
    appliedFilters.push('haptic-disableable');
  }

  // ────────────────────────────────────────────────────────────────────────────
  // INTENSITY SCORE FILTER
  // ────────────────────────────────────────────────────────────────────────────

  if (maxIntensityScore !== undefined) {
    conditions.push({ overallIntensityScore: { lte: maxIntensityScore } });
    appliedFilters.push(`max-intensity-${maxIntensityScore}`);
  } else if (strictness === 'strict') {
    // In strict mode, limit to low-moderate intensity
    conditions.push({ overallIntensityScore: { lte: 5 } });
    appliedFilters.push('low-intensity-only');
  }

  // ────────────────────────────────────────────────────────────────────────────
  // BUILD FINAL WHERE CLAUSE
  // ────────────────────────────────────────────────────────────────────────────

  let where: Prisma.ContentSensoryMetadataWhereInput;

  if (conditions.length === 0) {
    where = {};
  } else {
    where = { AND: conditions };
  }

  // If including unanalyzed content, we need to handle it separately
  if (includeUnanalyzed) {
    postFilters.push('include-unanalyzed-content');
  }

  return {
    where,
    appliedFilters,
    postFilters,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// PROFILE-BASED INTENSITY CALCULATOR
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate maximum recommended intensity score for a profile.
 */
export function getMaxIntensityForProfile(profile: SensoryProfile): number {
  const sensitivities = [
    profile.audioSensitivity,
    profile.visualSensitivity,
    profile.motionSensitivity,
    profile.tactileSensitivity,
  ].filter((s): s is number => s !== undefined);

  if (sensitivities.length === 0) {
    return 10; // No sensitivities defined, allow all
  }

  const maxSensitivity = Math.max(...sensitivities);

  // Higher sensitivity = lower intensity tolerance
  // Sensitivity 1-3: intensity 10 (any)
  // Sensitivity 4-5: intensity 8
  // Sensitivity 6-7: intensity 6
  // Sensitivity 8-9: intensity 4
  // Sensitivity 10: intensity 2
  if (maxSensitivity <= 3) return 10;
  if (maxSensitivity <= 5) return 8;
  if (maxSensitivity <= 7) return 6;
  if (maxSensitivity <= 9) return 4;
  return 2;
}

// ══════════════════════════════════════════════════════════════════════════════
// QUICK FILTER PRESETS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get preset filter for photosensitive users.
 */
export function getPhotosensitiveFilter(): Prisma.ContentSensoryMetadataWhereInput {
  return {
    AND: [
      { suitableForPhotosensitive: true },
      { hasFlashing: false },
      { overallIntensityScore: { lte: 5 } },
    ],
  };
}

/**
 * Get preset filter for audio-sensitive users.
 */
export function getAudioSensitiveFilter(): Prisma.ContentSensoryMetadataWhereInput {
  return {
    AND: [{ suitableForAudioSensitive: true }, { hasSuddenSounds: false }],
  };
}

/**
 * Get preset filter for motion-sensitive users.
 */
export function getMotionSensitiveFilter(): Prisma.ContentSensoryMetadataWhereInput {
  return {
    AND: [
      { suitableForMotionSensitive: true },
      { hasAnimation: false },
      { hasParallax: false },
    ],
  };
}

/**
 * Get preset filter for users needing calm/low-stimulation content.
 */
export function getCalmContentFilter(): Prisma.ContentSensoryMetadataWhereInput {
  return {
    AND: [
      { suitableForPhotosensitive: true },
      { suitableForAudioSensitive: true },
      { suitableForMotionSensitive: true },
      { visualComplexity: 'SIMPLE' },
      { cognitiveLoad: 'LOW' },
      { overallIntensityScore: { lte: 3 } },
    ],
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// FILTER UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Merge multiple filter conditions with AND logic.
 */
export function combineFilters(
  ...filters: Prisma.ContentSensoryMetadataWhereInput[]
): Prisma.ContentSensoryMetadataWhereInput {
  const nonEmptyFilters = filters.filter((f) => Object.keys(f).length > 0);
  if (nonEmptyFilters.length === 0) return {};
  if (nonEmptyFilters.length === 1) return nonEmptyFilters[0];
  return { AND: nonEmptyFilters };
}

/**
 * Convert SensoryContentFilter (from shared types) to Prisma where clause.
 */
export function sensoryFilterToPrisma(
  filter: SensoryContentFilter
): Prisma.ContentSensoryMetadataWhereInput {
  const conditions: Prisma.ContentSensoryMetadataWhereInput[] = [];

  // Suitability flags
  if (filter.suitableForPhotosensitive !== undefined) {
    conditions.push({ suitableForPhotosensitive: filter.suitableForPhotosensitive });
  }
  if (filter.suitableForAudioSensitive !== undefined) {
    conditions.push({ suitableForAudioSensitive: filter.suitableForAudioSensitive });
  }
  if (filter.suitableForMotionSensitive !== undefined) {
    conditions.push({ suitableForMotionSensitive: filter.suitableForMotionSensitive });
  }

  // Intensity
  if (filter.maxIntensityScore !== undefined) {
    conditions.push({ overallIntensityScore: { lte: filter.maxIntensityScore } });
  }

  // Audio
  if (filter.excludeSuddenSounds) {
    conditions.push({ hasSuddenSounds: false });
  }
  if (filter.requireMutableAudio) {
    conditions.push({ canMuteAudio: true });
  }

  // Visual
  if (filter.excludeFlashing) {
    conditions.push({ hasFlashing: false });
  }
  if (filter.maxVisualComplexity) {
    const complexityOrder = ['SIMPLE', 'MODERATE', 'COMPLEX'];
    const maxIndex = complexityOrder.indexOf(filter.maxVisualComplexity.toUpperCase());
    const allowed = complexityOrder.slice(0, maxIndex + 1);
    conditions.push({ visualComplexity: { in: allowed as any } });
  }

  // Motion
  if (filter.excludeAnimation) {
    conditions.push({ hasAnimation: false });
  }
  if (filter.requireReducibleAnimation) {
    conditions.push({
      OR: [{ hasAnimation: false }, { animationReducible: true }],
    });
  }
  if (filter.excludeParallax) {
    conditions.push({ hasParallax: false });
  }

  // Cognitive
  if (filter.requireAdjustableTimeLimits) {
    conditions.push({
      OR: [{ hasTimeLimits: false }, { timeLimitsAdjustable: true }],
    });
  }
  if (filter.maxCognitiveLoad) {
    const loadOrder = ['LOW', 'MEDIUM', 'HIGH'];
    const maxIndex = loadOrder.indexOf(filter.maxCognitiveLoad.toUpperCase());
    const allowed = loadOrder.slice(0, maxIndex + 1);
    conditions.push({ cognitiveLoad: { in: allowed as any } });
  }

  return conditions.length === 0 ? {} : { AND: conditions };
}
