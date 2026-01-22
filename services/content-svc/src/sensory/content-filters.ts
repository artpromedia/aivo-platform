/**
 * Sensory Content Filters - ND-2.1
 *
 * Database query filters for content based on sensory profiles.
 * Integrates with Prisma to filter content at the database level.
 */

import type { Prisma } from '../prisma-types.js';

import type { SensoryProfile } from './sensory.types.js';

// Inline helpers (avoids external dependency)
function isHighSensitivity(level: number | undefined): boolean {
  return (level ?? 5) >= 7;
}

function isVeryHighSensitivity(level: number | undefined): boolean {
  return (level ?? 5) >= 9;
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface FilterResult {
  where: Prisma.ContentSensoryMetadataWhereInput;
  appliedFilters: string[];
  postFilters: string[];
}

export interface ContentFilterOptions {
  strictness?: 'relaxed' | 'normal' | 'strict';
  includeUnanalyzed?: boolean;
  maxIntensityScore?: number;
}

export interface SensoryContentFilter {
  suitableForPhotosensitive?: boolean;
  suitableForAudioSensitive?: boolean;
  suitableForMotionSensitive?: boolean;
  maxIntensityScore?: number;
  excludeSuddenSounds?: boolean;
  requireMutableAudio?: boolean;
  excludeFlashing?: boolean;
  maxVisualComplexity?: string;
  excludeAnimation?: boolean;
  requireReducibleAnimation?: boolean;
  excludeParallax?: boolean;
  requireAdjustableTimeLimits?: boolean;
  maxCognitiveLoad?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN FILTER BUILDER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Build Prisma where clause for filtering content based on sensory profile.
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
    return 10;
  }

  const maxSensitivity = Math.max(...sensitivities);

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
    AND: [{ suitableForMotionSensitive: true }, { hasAnimation: false }, { hasParallax: false }],
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
 * Convert SensoryContentFilter to Prisma where clause.
 */
export function sensoryFilterToPrisma(
  filter: SensoryContentFilter
): Prisma.ContentSensoryMetadataWhereInput {
  const conditions: Prisma.ContentSensoryMetadataWhereInput[] = [];

  if (filter.suitableForPhotosensitive !== undefined) {
    conditions.push({ suitableForPhotosensitive: filter.suitableForPhotosensitive });
  }
  if (filter.suitableForAudioSensitive !== undefined) {
    conditions.push({ suitableForAudioSensitive: filter.suitableForAudioSensitive });
  }
  if (filter.suitableForMotionSensitive !== undefined) {
    conditions.push({ suitableForMotionSensitive: filter.suitableForMotionSensitive });
  }

  if (filter.maxIntensityScore !== undefined) {
    conditions.push({ overallIntensityScore: { lte: filter.maxIntensityScore } });
  }

  if (filter.excludeSuddenSounds) {
    conditions.push({ hasSuddenSounds: false });
  }
  if (filter.requireMutableAudio) {
    conditions.push({ canMuteAudio: true });
  }

  if (filter.excludeFlashing) {
    conditions.push({ hasFlashing: false });
  }
  if (filter.maxVisualComplexity) {
    const complexityOrder = ['SIMPLE', 'MODERATE', 'COMPLEX'];
    const maxIndex = complexityOrder.indexOf(filter.maxVisualComplexity.toUpperCase());
    const allowed = complexityOrder.slice(0, maxIndex + 1) as ('SIMPLE' | 'MODERATE' | 'COMPLEX')[];
    conditions.push({ visualComplexity: { in: allowed } });
  }

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

  if (filter.requireAdjustableTimeLimits) {
    conditions.push({
      OR: [{ hasTimeLimits: false }, { timeLimitsAdjustable: true }],
    });
  }
  if (filter.maxCognitiveLoad) {
    const loadOrder = ['LOW', 'MEDIUM', 'HIGH'];
    const maxIndex = loadOrder.indexOf(filter.maxCognitiveLoad.toUpperCase());
    const allowed = loadOrder.slice(0, maxIndex + 1) as ('LOW' | 'MEDIUM' | 'HIGH')[];
    conditions.push({ cognitiveLoad: { in: allowed } });
  }

  return conditions.length === 0 ? {} : { AND: conditions };
}
