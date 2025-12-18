/**
 * Sensory Matching Tests - ND-2.1
 *
 * Tests for sensory profile matching, content filters, and incident tracking.
 */

import { describe, it, expect } from 'vitest';

import {
  calculateSensoryMatch,
  batchCalculateSensoryMatch,
  filterSuitableContent,
  rankContentBySensoryMatch,
} from '../src/sensory/sensory-matcher.service.js';

import {
  buildSensoryContentFilter,
  getPhotosensitiveFilter,
  getAudioSensitiveFilter,
  getMotionSensitiveFilter,
  getCalmContentFilter,
  getMaxIntensityForProfile,
} from '../src/sensory/content-filters.js';

import type {
  SensoryProfile,
  ContentSensoryMetadata,
  SensoryWarning,
  ContentAdaptation,
} from '../src/sensory/sensory.types.js';

// Helper function to check warnings by code
const hasWarningWithCode = (warnings: SensoryWarning[], code: string): boolean =>
  warnings.some((w: SensoryWarning) => w.code === code);

const hasWarningWithLevel = (warnings: SensoryWarning[], level: string): boolean =>
  warnings.some((w: SensoryWarning) => w.level === level);

// Helper function to check adaptations by setting
const hasAdaptationWithSetting = (adaptations: ContentAdaptation[], setting: string): boolean =>
  adaptations.some((a: ContentAdaptation) => a.setting === setting);

const findAdaptation = (
  adaptations: ContentAdaptation[],
  setting: string
): ContentAdaptation | undefined => adaptations.find((a: ContentAdaptation) => a.setting === setting);

const findWarning = (
  warnings: SensoryWarning[],
  code: string
): SensoryWarning | undefined => warnings.find((w: SensoryWarning) => w.code === code);

// ══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ══════════════════════════════════════════════════════════════════════════════

const createDefaultProfile = (overrides: Partial<SensoryProfile> = {}): SensoryProfile => ({
  learnerId: 'test-learner-123',
  audioSensitivity: 5,
  visualSensitivity: 5,
  motionSensitivity: 5,
  tactileSensitivity: 5,
  prefersNoSuddenSounds: false,
  maxVolume: 100,
  prefersQuietEnvironment: false,
  avoidsFlashing: false,
  prefersSimpleVisuals: false,
  preferredBrightness: 80,
  preferredContrast: 'normal',
  prefersReducedMotion: false,
  preferredAnimationSpeed: 'normal',
  avoidsParallax: false,
  prefersNoHaptic: false,
  processingSpeed: 'normal',
  preferredPacing: 'normal',
  needsExtendedTime: false,
  timeExtensionFactor: 1,
  isPhotosensitive: false,
  needsFrequentBreaks: false,
  preferredBreakFrequency: 'normal',
  preferredTextSize: 'normal',
  prefersDyslexiaFont: false,
  typicalEnvironment: 'mixed',
  ...overrides,
});

const createDefaultMetadata = (
  overrides: Partial<ContentSensoryMetadata> = {}
): ContentSensoryMetadata => ({
  contentId: 'test-content-123',
  hasAudio: false,
  hasSuddenSounds: false,
  hasBackgroundMusic: false,
  audioLevel: 3,
  canMuteAudio: true,
  hasFlashing: false,
  visualComplexity: 'simple',
  hasVibrantColors: false,
  contrastLevel: 5,
  hasAnimation: false,
  animationIntensity: 'none',
  animationReducible: true,
  hasQuickMotion: false,
  requiresFineTouchInput: false,
  hasHapticFeedback: false,
  canDisableHaptic: true,
  cognitiveLoad: 'low',
  hasTimeLimits: false,
  timeLimitsAdjustable: true,
  requiresQuickReactions: false,
  hasScrolling: false,
  hasParallax: false,
  overallIntensityScore: 3,
  suitableForPhotosensitive: true,
  suitableForAudioSensitive: true,
  suitableForMotionSensitive: true,
  ...overrides,
});

// ══════════════════════════════════════════════════════════════════════════════
// SENSORY MATCHER SERVICE TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('SensoryMatcherService', () => {
  describe('calculateSensoryMatch', () => {
    describe('Basic Matching', () => {
      it('should return high score for neutral content with typical profile', () => {
        const profile = createDefaultProfile();
        const content = createDefaultMetadata();

        const result = calculateSensoryMatch(profile, content);

        expect(result.overallScore).toBeGreaterThanOrEqual(90);
        expect(result.isSuitable).toBe(true);
        expect(result.warnings.length).toBe(0);
      });

      it('should return category scores for all categories', () => {
        const profile = createDefaultProfile();
        const content = createDefaultMetadata();

        const result = calculateSensoryMatch(profile, content);

        expect(result.categoryScores).toHaveProperty('audio');
        expect(result.categoryScores).toHaveProperty('visual');
        expect(result.categoryScores).toHaveProperty('motion');
        expect(result.categoryScores).toHaveProperty('tactile');
        expect(result.categoryScores).toHaveProperty('cognitive');
      });

      it('should include matchedAt timestamp', () => {
        const profile = createDefaultProfile();
        const content = createDefaultMetadata();

        const result = calculateSensoryMatch(profile, content);

        expect(result.matchedAt).toBeInstanceOf(Date);
      });
    });

    describe('Audio Sensitivity', () => {
      it('should penalize sudden sounds for audio-sensitive users', () => {
        const profile = createDefaultProfile({ audioSensitivity: 8 });
        const content = createDefaultMetadata({
          hasAudio: true,
          hasSuddenSounds: true,
          audioLevel: 7,
        });

        const result = calculateSensoryMatch(profile, content);

        expect(result.overallScore).toBeLessThan(90);
        expect(hasWarningWithCode(result.warnings, 'SUDDEN_SOUNDS_HIGH_SENSITIVITY')).toBe(true);
      });

      it('should not penalize muted audio content', () => {
        const profile = createDefaultProfile({ audioSensitivity: 9 });
        const content = createDefaultMetadata({ hasAudio: false });

        const result = calculateSensoryMatch(profile, content);

        expect(result.categoryScores.audio).toBe(100);
      });

      it('should warn about background music for quiet environment preference', () => {
        const profile = createDefaultProfile({ prefersQuietEnvironment: true });
        const content = createDefaultMetadata({
          hasAudio: true,
          hasBackgroundMusic: true,
        });

        const result = calculateSensoryMatch(profile, content);

        expect(hasWarningWithCode(result.warnings, 'HAS_BACKGROUND_MUSIC')).toBe(true);
      });
    });

    describe('Visual Sensitivity', () => {
      it('should block flashing content for photosensitive users', () => {
        const profile = createDefaultProfile({ isPhotosensitive: true });
        const content = createDefaultMetadata({ hasFlashing: true });

        const result = calculateSensoryMatch(profile, content);

        expect(result.isSuitable).toBe(false);
        expect(hasWarningWithLevel(result.warnings, 'critical')).toBe(true);
        expect(hasWarningWithCode(result.warnings, 'FLASHING_PHOTOSENSITIVE')).toBe(true);
      });

      it('should block flashing for users who avoid flashing', () => {
        const profile = createDefaultProfile({ avoidsFlashing: true });
        const content = createDefaultMetadata({ hasFlashing: true });

        const result = calculateSensoryMatch(profile, content);

        expect(result.isSuitable).toBe(false);
      });

      it('should penalize complex visuals for users preferring simple', () => {
        const profile = createDefaultProfile({ prefersSimpleVisuals: true });
        const content = createDefaultMetadata({ visualComplexity: 'complex' });

        const result = calculateSensoryMatch(profile, content);

        expect(hasWarningWithCode(result.warnings, 'COMPLEX_VISUALS')).toBe(true);
      });

      it('should warn about vibrant colors for high visual sensitivity', () => {
        const profile = createDefaultProfile({ visualSensitivity: 8 });
        const content = createDefaultMetadata({ hasVibrantColors: true });

        const result = calculateSensoryMatch(profile, content);

        expect(hasWarningWithCode(result.warnings, 'VIBRANT_COLORS')).toBe(true);
      });
    });

    describe('Motion Sensitivity', () => {
      it('should penalize non-reducible animation for reduced motion preference', () => {
        const profile = createDefaultProfile({ prefersReducedMotion: true });
        const content = createDefaultMetadata({
          hasAnimation: true,
          animationReducible: false,
        });

        const result = calculateSensoryMatch(profile, content);

        expect(hasWarningWithCode(result.warnings, 'ANIMATION_NOT_REDUCIBLE')).toBe(true);
      });

      it('should accept reducible animation with reduced motion preference', () => {
        const profile = createDefaultProfile({ prefersReducedMotion: true });
        const content = createDefaultMetadata({
          hasAnimation: true,
          animationReducible: true,
        });

        const result = calculateSensoryMatch(profile, content);

        expect(result.isSuitable).toBe(true);
        expect(hasWarningWithCode(result.warnings, 'ANIMATION_REDUCIBLE')).toBe(true);
      });

      it('should warn about parallax for users who avoid it', () => {
        const profile = createDefaultProfile({ avoidsParallax: true });
        const content = createDefaultMetadata({ hasParallax: true });

        const result = calculateSensoryMatch(profile, content);

        expect(hasWarningWithCode(result.warnings, 'HAS_PARALLAX')).toBe(true);
      });

      it('should penalize intense animation for high motion sensitivity', () => {
        const profile = createDefaultProfile({ motionSensitivity: 9 });
        const content = createDefaultMetadata({
          hasAnimation: true,
          animationIntensity: 'intense',
        });

        const result = calculateSensoryMatch(profile, content);

        expect(hasWarningWithCode(result.warnings, 'INTENSE_ANIMATION')).toBe(true);
      });
    });

    describe('Tactile Sensitivity', () => {
      it('should penalize non-disableable haptic for haptic-avoiding users', () => {
        const profile = createDefaultProfile({ prefersNoHaptic: true });
        const content = createDefaultMetadata({
          hasHapticFeedback: true,
          canDisableHaptic: false,
        });

        const result = calculateSensoryMatch(profile, content);

        expect(hasWarningWithCode(result.warnings, 'HAPTIC_NOT_DISABLEABLE')).toBe(true);
      });

      it('should warn but accept disableable haptic for haptic-avoiding users', () => {
        const profile = createDefaultProfile({ prefersNoHaptic: true });
        const content = createDefaultMetadata({
          hasHapticFeedback: true,
          canDisableHaptic: true,
        });

        const result = calculateSensoryMatch(profile, content);

        expect(result.isSuitable).toBe(true);
        expect(hasWarningWithCode(result.warnings, 'HAPTIC_DISABLEABLE')).toBe(true);
      });

      it('should note fine motor requirements', () => {
        const profile = createDefaultProfile();
        const content = createDefaultMetadata({ requiresFineTouchInput: true });

        const result = calculateSensoryMatch(profile, content);

        expect(hasWarningWithCode(result.warnings, 'REQUIRES_FINE_MOTOR')).toBe(true);
      });
    });

    describe('Cognitive Load', () => {
      it('should penalize high cognitive load for slow processing users', () => {
        const profile = createDefaultProfile({ processingSpeed: 'slow' });
        const content = createDefaultMetadata({ cognitiveLoad: 'high' });

        const result = calculateSensoryMatch(profile, content);

        expect(hasWarningWithCode(result.warnings, 'HIGH_COGNITIVE_LOAD')).toBe(true);
      });

      it('should penalize fixed time limits for extended time users', () => {
        const profile = createDefaultProfile({ needsExtendedTime: true });
        const content = createDefaultMetadata({
          hasTimeLimits: true,
          timeLimitsAdjustable: false,
        });

        const result = calculateSensoryMatch(profile, content);

        expect(hasWarningWithCode(result.warnings, 'FIXED_TIME_LIMITS')).toBe(true);
      });

      it('should accept adjustable time limits for extended time users', () => {
        const profile = createDefaultProfile({
          needsExtendedTime: true,
          timeExtensionFactor: 1.5,
        });
        const content = createDefaultMetadata({
          hasTimeLimits: true,
          timeLimitsAdjustable: true,
        });

        const result = calculateSensoryMatch(profile, content);

        expect(result.isSuitable).toBe(true);
        expect(hasWarningWithCode(result.warnings, 'ADJUSTABLE_TIME_LIMITS')).toBe(true);
      });

      it('should warn about quick reactions for slow processing users', () => {
        const profile = createDefaultProfile({ processingSpeed: 'slow' });
        const content = createDefaultMetadata({ requiresQuickReactions: true });

        const result = calculateSensoryMatch(profile, content);

        expect(hasWarningWithCode(result.warnings, 'REQUIRES_QUICK_REACTIONS')).toBe(true);
      });
    });

    describe('Adaptations', () => {
      it('should generate volume adaptation for audio-sensitive users', () => {
        const profile = createDefaultProfile({ audioSensitivity: 8 });
        const content = createDefaultMetadata({ hasAudio: true, audioLevel: 7 });

        const result = calculateSensoryMatch(profile, content, {
          generateAdaptations: true,
        });

        expect(hasAdaptationWithSetting(result.adaptations, 'volume')).toBe(true);
      });

      it('should generate reduced motion adaptation when preferred', () => {
        const profile = createDefaultProfile({ prefersReducedMotion: true });
        const content = createDefaultMetadata({
          hasAnimation: true,
          animationReducible: true,
        });

        const result = calculateSensoryMatch(profile, content, {
          generateAdaptations: true,
        });

        expect(hasAdaptationWithSetting(result.adaptations, 'reducedMotion')).toBe(true);
      });

      it('should generate time extension adaptation when needed', () => {
        const profile = createDefaultProfile({
          needsExtendedTime: true,
          timeExtensionFactor: 1.5,
        });
        const content = createDefaultMetadata({
          hasTimeLimits: true,
          timeLimitsAdjustable: true,
        });

        const result = calculateSensoryMatch(profile, content, {
          generateAdaptations: true,
        });

        expect(hasAdaptationWithSetting(result.adaptations, 'timeMultiplier')).toBe(true);
        const timeAdaptation = findAdaptation(result.adaptations, 'timeMultiplier');
        expect(timeAdaptation?.value).toBe(1.5);
      });

      it('should generate text adaptations for dyslexia font preference', () => {
        const profile = createDefaultProfile({ prefersDyslexiaFont: true });
        const content = createDefaultMetadata();

        const result = calculateSensoryMatch(profile, content, {
          generateAdaptations: true,
        });

        expect(hasAdaptationWithSetting(result.adaptations, 'dyslexiaFont')).toBe(true);
      });

      it('should generate break reminder adaptation when needed', () => {
        const profile = createDefaultProfile({
          needsFrequentBreaks: true,
          preferredBreakFrequency: 'high',
        });
        const content = createDefaultMetadata();

        const result = calculateSensoryMatch(profile, content, {
          generateAdaptations: true,
        });

        expect(hasAdaptationWithSetting(result.adaptations, 'breakReminders')).toBe(true);
      });
    });

    describe('Options', () => {
      it('should respect minimum score option', () => {
        const profile = createDefaultProfile({ audioSensitivity: 8 });
        const content = createDefaultMetadata({
          hasAudio: true,
          hasSuddenSounds: true,
          audioLevel: 8,
        });

        const relaxedResult = calculateSensoryMatch(profile, content, {
          minimumScore: 30,
        });
        const strictResult = calculateSensoryMatch(profile, content, {
          minimumScore: 90,
        });

        expect(relaxedResult.isSuitable).toBe(true);
        expect(strictResult.isSuitable).toBe(false);
      });

      it('should include explanations when requested', () => {
        const profile = createDefaultProfile({ isPhotosensitive: true });
        const content = createDefaultMetadata({ hasFlashing: true });

        const result = calculateSensoryMatch(profile, content, {
          includeExplanations: true,
        });

        const flashWarning = findWarning(result.warnings, 'FLASHING_PHOTOSENSITIVE');
        expect(flashWarning?.explanation).toBeDefined();
      });
    });
  });

  describe('batchCalculateSensoryMatch', () => {
    it('should match multiple content items', () => {
      const profile = createDefaultProfile();
      const contentItems = [
        { id: 'content-1', metadata: createDefaultMetadata() },
        { id: 'content-2', metadata: createDefaultMetadata({ hasFlashing: true }) },
        { id: 'content-3', metadata: createDefaultMetadata({ cognitiveLoad: 'high' }) },
      ];

      const results = batchCalculateSensoryMatch(profile, contentItems);

      expect(results.length).toBe(3);
      expect(results[0].contentId).toBe('content-1');
      expect(results[1].contentId).toBe('content-2');
      expect(results[2].contentId).toBe('content-3');
    });

    it('should return individual match results', () => {
      const profile = createDefaultProfile({ isPhotosensitive: true });
      const contentItems = [
        { id: 'safe', metadata: createDefaultMetadata() },
        { id: 'unsafe', metadata: createDefaultMetadata({ hasFlashing: true }) },
      ];

      const results = batchCalculateSensoryMatch(profile, contentItems);

      const safeResult = results.find((r) => r.contentId === 'safe');
      const unsafeResult = results.find((r) => r.contentId === 'unsafe');

      expect(safeResult?.matchResult.isSuitable).toBe(true);
      expect(unsafeResult?.matchResult.isSuitable).toBe(false);
    });
  });

  describe('filterSuitableContent', () => {
    it('should filter out unsuitable content', () => {
      const profile = createDefaultProfile({ isPhotosensitive: true });
      const contentItems = [
        { id: 'safe-1', metadata: createDefaultMetadata() },
        { id: 'unsafe', metadata: createDefaultMetadata({ hasFlashing: true }) },
        { id: 'safe-2', metadata: createDefaultMetadata() },
      ];

      const filtered = filterSuitableContent(profile, contentItems);

      expect(filtered.length).toBe(2);
      expect(filtered.map((c) => c.id)).toContain('safe-1');
      expect(filtered.map((c) => c.id)).toContain('safe-2');
      expect(filtered.map((c) => c.id)).not.toContain('unsafe');
    });
  });

  describe('rankContentBySensoryMatch', () => {
    it('should rank content by match score', () => {
      const profile = createDefaultProfile({ audioSensitivity: 8 });
      const contentItems = [
        {
          id: 'loud',
          metadata: createDefaultMetadata({ hasAudio: true, audioLevel: 8 }),
        },
        { id: 'quiet', metadata: createDefaultMetadata({ hasAudio: false }) },
        {
          id: 'moderate',
          metadata: createDefaultMetadata({ hasAudio: true, audioLevel: 4 }),
        },
      ];

      const ranked = rankContentBySensoryMatch(profile, contentItems);

      expect(ranked[0].id).toBe('quiet');
      expect(ranked[0].matchScore).toBeGreaterThan(ranked[1].matchScore);
      expect(ranked[ranked.length - 1].id).toBe('loud');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT FILTERS TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('ContentFilters', () => {
  describe('buildSensoryContentFilter', () => {
    it('should build empty filter for typical profile', () => {
      const profile = createDefaultProfile();
      const result = buildSensoryContentFilter(profile);

      expect(result.appliedFilters.length).toBe(0);
    });

    it('should add photosensitive filter for photosensitive users', () => {
      const profile = createDefaultProfile({ isPhotosensitive: true });
      const result = buildSensoryContentFilter(profile);

      expect(result.appliedFilters).toContain('photosensitive-safe');
      expect(result.appliedFilters).toContain('no-flashing');
    });

    it('should add audio filter for audio-sensitive users', () => {
      const profile = createDefaultProfile({ audioSensitivity: 9 });
      const result = buildSensoryContentFilter(profile);

      expect(result.appliedFilters).toContain('audio-sensitive-safe');
    });

    it('should add motion filter for motion-sensitive users', () => {
      const profile = createDefaultProfile({ motionSensitivity: 9 });
      const result = buildSensoryContentFilter(profile);

      expect(result.appliedFilters).toContain('motion-sensitive-safe');
    });

    it('should add reduced motion filter for reduced motion preference', () => {
      const profile = createDefaultProfile({ prefersReducedMotion: true });
      const result = buildSensoryContentFilter(profile);

      expect(result.appliedFilters).toContain('reduced-motion-compatible');
    });

    it('should add time adjustment filter for extended time users', () => {
      const profile = createDefaultProfile({ needsExtendedTime: true });
      const result = buildSensoryContentFilter(profile);

      expect(result.appliedFilters).toContain('time-limits-adjustable');
    });

    it('should add intensity filter in strict mode', () => {
      const profile = createDefaultProfile();
      const result = buildSensoryContentFilter(profile, { strictness: 'strict' });

      expect(result.appliedFilters).toContain('low-intensity-only');
    });
  });

  describe('getMaxIntensityForProfile', () => {
    it('should return 10 for low sensitivity profiles', () => {
      const profile = createDefaultProfile({ audioSensitivity: 2, visualSensitivity: 3 });
      expect(getMaxIntensityForProfile(profile)).toBe(10);
    });

    it('should return lower intensity for high sensitivity profiles', () => {
      const profile = createDefaultProfile({ visualSensitivity: 8 });
      expect(getMaxIntensityForProfile(profile)).toBeLessThanOrEqual(4);
    });

    it('should return very low intensity for maximum sensitivity', () => {
      const profile = createDefaultProfile({ audioSensitivity: 10 });
      expect(getMaxIntensityForProfile(profile)).toBe(2);
    });
  });

  describe('Preset Filters', () => {
    it('should return photosensitive filter', () => {
      const filter = getPhotosensitiveFilter();
      expect(filter).toBeDefined();
      expect(filter.AND).toBeDefined();
    });

    it('should return audio sensitive filter', () => {
      const filter = getAudioSensitiveFilter();
      expect(filter).toBeDefined();
      expect(filter.AND).toBeDefined();
    });

    it('should return motion sensitive filter', () => {
      const filter = getMotionSensitiveFilter();
      expect(filter).toBeDefined();
      expect(filter.AND).toBeDefined();
    });

    it('should return calm content filter', () => {
      const filter = getCalmContentFilter();
      expect(filter).toBeDefined();
      expect(filter.AND).toBeDefined();
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// EDGE CASES
// ══════════════════════════════════════════════════════════════════════════════

describe('Edge Cases', () => {
  it('should handle profile with all maximum sensitivities', () => {
    const profile = createDefaultProfile({
      audioSensitivity: 10,
      visualSensitivity: 10,
      motionSensitivity: 10,
      tactileSensitivity: 10,
      isPhotosensitive: true,
      avoidsFlashing: true,
      prefersReducedMotion: true,
      prefersNoHaptic: true,
      needsExtendedTime: true,
      processingSpeed: 'slow',
    });
    const content = createDefaultMetadata();

    const result = calculateSensoryMatch(profile, content);

    expect(result).toBeDefined();
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.isSuitable).toBe(true);
  });

  it('should handle content with all problematic features', () => {
    const profile = createDefaultProfile();
    const content = createDefaultMetadata({
      hasAudio: true,
      hasSuddenSounds: true,
      hasFlashing: true,
      visualComplexity: 'complex',
      hasVibrantColors: true,
      hasAnimation: true,
      animationIntensity: 'intense',
      hasQuickMotion: true,
      requiresFineTouchInput: true,
      hasHapticFeedback: true,
      cognitiveLoad: 'high',
      hasTimeLimits: true,
      requiresQuickReactions: true,
      hasParallax: true,
      overallIntensityScore: 10,
    });

    const result = calculateSensoryMatch(profile, content);

    expect(result).toBeDefined();
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
  });

  it('should handle empty arrays in batch operations', () => {
    const profile = createDefaultProfile();
    const results = batchCalculateSensoryMatch(profile, []);

    expect(results).toEqual([]);
  });

  it('should handle undefined optional profile fields', () => {
    const minimalProfile: SensoryProfile = {
      learnerId: 'minimal-learner',
    } as SensoryProfile;
    const content = createDefaultMetadata();

    // Should not throw
    const result = calculateSensoryMatch(minimalProfile, content);
    expect(result).toBeDefined();
  });
});
