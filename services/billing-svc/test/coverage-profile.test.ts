/**
 * Coverage Profile Tests
 *
 * Comprehensive tests for the hybrid billing coverage profile system.
 * Tests precedence rules, overlap detection, and reconciliation logic.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  computeFeaturePayer,
  computeEffectiveModules,
  createEmptyCoverageProfile,
  FeatureKeyValues,
  FeaturePayerValues,
  findOverlappingFeatures,
  profileToSummary,
} from '../src/types/coverage-profile.types.js';
import { gradeToGradeBand, GradeBand } from '../src/types/licensing.types.js';

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Coverage Profile Helper Functions', () => {
  describe('computeFeaturePayer', () => {
    it('should return DISTRICT when feature is in district modules only', () => {
      const districtModules = new Set(['MODULE_ELA', 'MODULE_MATH']);
      const parentModules = new Set(['ADDON_SEL']);

      expect(computeFeaturePayer('MODULE_ELA', districtModules, parentModules)).toBe(
        FeaturePayerValues.DISTRICT
      );
    });

    it('should return PARENT when feature is in parent modules only', () => {
      const districtModules = new Set(['MODULE_ELA', 'MODULE_MATH']);
      const parentModules = new Set(['ADDON_SEL']);

      expect(computeFeaturePayer('ADDON_SEL', districtModules, parentModules)).toBe(
        FeaturePayerValues.PARENT
      );
    });

    it('should return DISTRICT when feature is in both (precedence rule)', () => {
      const districtModules = new Set(['MODULE_ELA', 'ADDON_SEL']);
      const parentModules = new Set(['ADDON_SEL', 'ADDON_SPEECH']);

      // District wins for overlapping features
      expect(computeFeaturePayer('ADDON_SEL', districtModules, parentModules)).toBe(
        FeaturePayerValues.DISTRICT
      );
    });

    it('should return NONE when feature is in neither', () => {
      const districtModules = new Set(['MODULE_ELA']);
      const parentModules = new Set(['ADDON_SEL']);

      expect(computeFeaturePayer('MODULE_SCIENCE', districtModules, parentModules)).toBe(
        FeaturePayerValues.NONE
      );
    });
  });

  describe('findOverlappingFeatures', () => {
    it('should find features that exist in both sets', () => {
      const districtModules = new Set(['MODULE_ELA', 'MODULE_MATH', 'ADDON_SEL']);
      const parentModules = new Set(['ADDON_SEL', 'ADDON_SPEECH']);

      const overlapping = findOverlappingFeatures(districtModules, parentModules);

      expect(overlapping.size).toBe(1);
      expect(overlapping.has('ADDON_SEL')).toBe(true);
    });

    it('should return empty set when no overlaps', () => {
      const districtModules = new Set(['MODULE_ELA', 'MODULE_MATH']);
      const parentModules = new Set(['ADDON_SEL', 'ADDON_SPEECH']);

      const overlapping = findOverlappingFeatures(districtModules, parentModules);

      expect(overlapping.size).toBe(0);
    });

    it('should return all parent features when fully overlapping', () => {
      const districtModules = new Set(['MODULE_ELA', 'ADDON_SEL', 'ADDON_SPEECH']);
      const parentModules = new Set(['ADDON_SEL', 'ADDON_SPEECH']);

      const overlapping = findOverlappingFeatures(districtModules, parentModules);

      expect(overlapping.size).toBe(2);
      expect(overlapping.has('ADDON_SEL')).toBe(true);
      expect(overlapping.has('ADDON_SPEECH')).toBe(true);
    });
  });

  describe('computeEffectiveModules', () => {
    it('should combine district and parent modules', () => {
      const districtModules = new Set(['MODULE_ELA', 'MODULE_MATH']);
      const parentModules = new Set(['ADDON_SEL', 'ADDON_SPEECH']);

      const effective = computeEffectiveModules(districtModules, parentModules);

      expect(effective.size).toBe(4);
      expect(effective.has('MODULE_ELA')).toBe(true);
      expect(effective.has('ADDON_SEL')).toBe(true);
    });

    it('should deduplicate overlapping features', () => {
      const districtModules = new Set(['MODULE_ELA', 'ADDON_SEL']);
      const parentModules = new Set(['ADDON_SEL', 'ADDON_SPEECH']);

      const effective = computeEffectiveModules(districtModules, parentModules);

      expect(effective.size).toBe(3); // Not 4, because ADDON_SEL is duplicated
    });

    it('should handle empty sets', () => {
      const districtModules = new Set<string>();
      const parentModules = new Set<string>();

      const effective = computeEffectiveModules(districtModules, parentModules);

      expect(effective.size).toBe(0);
    });
  });

  describe('createEmptyCoverageProfile', () => {
    it('should create profile with no coverage', () => {
      const profile = createEmptyCoverageProfile(
        'learner-123',
        5,
        GradeBand.G3_5,
        'tenant-456',
        'school-789'
      );

      expect(profile.learnerId).toBe('learner-123');
      expect(profile.hasDistrictCoverage).toBe(false);
      expect(profile.hasParentCoverage).toBe(false);
      expect(profile.districtModules.size).toBe(0);
      expect(profile.parentModules.size).toBe(0);
      expect(profile.effectiveModules.size).toBe(0);
    });

    it('should include all features as upsell opportunities', () => {
      const profile = createEmptyCoverageProfile(
        'learner-123',
        5,
        GradeBand.G3_5,
        'tenant-456',
        null
      );

      expect(profile.upsellOpportunities.length).toBe(Object.values(FeatureKeyValues).length);
    });
  });

  describe('profileToSummary', () => {
    it('should convert profile to summary', () => {
      const profile = createEmptyCoverageProfile(
        'learner-123',
        5,
        GradeBand.G3_5,
        'tenant-456',
        null
      );
      // Simulate some coverage
      profile.districtModules.add('MODULE_ELA');
      profile.parentModules.add('ADDON_SEL');
      profile.effectiveModules.add('MODULE_ELA');
      profile.effectiveModules.add('ADDON_SEL');

      const summary = profileToSummary(profile);

      expect(summary.learnerId).toBe('learner-123');
      expect(summary.districtFeatureCount).toBe(1);
      expect(summary.parentFeatureCount).toBe(1);
      expect(summary.totalEffectiveFeatures).toBe(2);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GRADE BAND CONVERSION TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Grade Band Conversion', () => {
  it('should map kindergarten to K_2', () => {
    expect(gradeToGradeBand(0)).toBe(GradeBand.K_2);
  });

  it('should map grades 1-2 to K_2', () => {
    expect(gradeToGradeBand(1)).toBe(GradeBand.K_2);
    expect(gradeToGradeBand(2)).toBe(GradeBand.K_2);
  });

  it('should map grades 3-5 to G3_5', () => {
    expect(gradeToGradeBand(3)).toBe(GradeBand.G3_5);
    expect(gradeToGradeBand(4)).toBe(GradeBand.G3_5);
    expect(gradeToGradeBand(5)).toBe(GradeBand.G3_5);
  });

  it('should map grades 6-8 to G6_8', () => {
    expect(gradeToGradeBand(6)).toBe(GradeBand.G6_8);
    expect(gradeToGradeBand(7)).toBe(GradeBand.G6_8);
    expect(gradeToGradeBand(8)).toBe(GradeBand.G6_8);
  });

  it('should map grades 9-12 to G9_12', () => {
    expect(gradeToGradeBand(9)).toBe(GradeBand.G9_12);
    expect(gradeToGradeBand(10)).toBe(GradeBand.G9_12);
    expect(gradeToGradeBand(11)).toBe(GradeBand.G9_12);
    expect(gradeToGradeBand(12)).toBe(GradeBand.G9_12);
  });

  it('should handle string grades', () => {
    expect(gradeToGradeBand('5')).toBe(GradeBand.G3_5);
    expect(gradeToGradeBand('9')).toBe(GradeBand.G9_12);
  });

  it('should default negative grades to K_2', () => {
    expect(gradeToGradeBand(-1)).toBe(GradeBand.K_2);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// COVERAGE SCENARIOS TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Coverage Scenarios', () => {
  describe('District Only Coverage', () => {
    it('should correctly identify district-only coverage', () => {
      const districtModules = new Set(['MODULE_ELA', 'MODULE_MATH', 'ADDON_SEL']);
      const parentModules = new Set<string>();

      const effective = computeEffectiveModules(districtModules, parentModules);
      const overlaps = findOverlappingFeatures(districtModules, parentModules);

      expect(effective.size).toBe(3);
      expect(overlaps.size).toBe(0);

      // All features should be provided by district
      for (const feature of effective) {
        expect(computeFeaturePayer(feature, districtModules, parentModules)).toBe(
          FeaturePayerValues.DISTRICT
        );
      }
    });
  });

  describe('Parent Only Coverage', () => {
    it('should correctly identify parent-only coverage', () => {
      const districtModules = new Set<string>();
      const parentModules = new Set(['ADDON_SEL', 'FEATURE_HOMEWORK_HELPER']);

      const effective = computeEffectiveModules(districtModules, parentModules);
      const overlaps = findOverlappingFeatures(districtModules, parentModules);

      expect(effective.size).toBe(2);
      expect(overlaps.size).toBe(0);

      // All features should be provided by parent
      for (const feature of effective) {
        expect(computeFeaturePayer(feature, districtModules, parentModules)).toBe(
          FeaturePayerValues.PARENT
        );
      }
    });
  });

  describe('Hybrid Coverage with Overlaps', () => {
    it('should apply precedence rules correctly', () => {
      // District provides core + SEL
      const districtModules = new Set(['MODULE_ELA', 'MODULE_MATH', 'ADDON_SEL']);
      // Parent also purchased SEL + Speech
      const parentModules = new Set(['ADDON_SEL', 'ADDON_SPEECH']);

      const effective = computeEffectiveModules(districtModules, parentModules);
      const overlaps = findOverlappingFeatures(districtModules, parentModules);

      // Should have 4 unique features
      expect(effective.size).toBe(4);
      expect(effective.has('MODULE_ELA')).toBe(true);
      expect(effective.has('MODULE_MATH')).toBe(true);
      expect(effective.has('ADDON_SEL')).toBe(true);
      expect(effective.has('ADDON_SPEECH')).toBe(true);

      // SEL should overlap
      expect(overlaps.size).toBe(1);
      expect(overlaps.has('ADDON_SEL')).toBe(true);

      // Verify payers with precedence rules
      expect(computeFeaturePayer('MODULE_ELA', districtModules, parentModules)).toBe(
        FeaturePayerValues.DISTRICT
      );
      expect(computeFeaturePayer('MODULE_MATH', districtModules, parentModules)).toBe(
        FeaturePayerValues.DISTRICT
      );
      // SEL overlaps, district should win
      expect(computeFeaturePayer('ADDON_SEL', districtModules, parentModules)).toBe(
        FeaturePayerValues.DISTRICT
      );
      // Speech is parent-only
      expect(computeFeaturePayer('ADDON_SPEECH', districtModules, parentModules)).toBe(
        FeaturePayerValues.PARENT
      );
    });

    it('should correctly handle full overlap scenario', () => {
      // District provides everything parent has
      const districtModules = new Set([
        'MODULE_ELA',
        'MODULE_MATH',
        'ADDON_SEL',
        'ADDON_SPEECH',
        'FEATURE_HOMEWORK_HELPER',
      ]);
      const parentModules = new Set(['ADDON_SEL', 'ADDON_SPEECH']);

      const overlaps = findOverlappingFeatures(districtModules, parentModules);

      // Both parent features overlap
      expect(overlaps.size).toBe(2);
      expect(overlaps.has('ADDON_SEL')).toBe(true);
      expect(overlaps.has('ADDON_SPEECH')).toBe(true);

      // All parent features should resolve to district
      for (const feature of parentModules) {
        expect(computeFeaturePayer(feature, districtModules, parentModules)).toBe(
          FeaturePayerValues.DISTRICT
        );
      }
    });
  });

  describe('Upsell Opportunities', () => {
    it('should identify features not covered by either source', () => {
      const districtModules = new Set(['MODULE_ELA', 'MODULE_MATH']);
      const parentModules = new Set(['ADDON_SEL']);
      const effective = computeEffectiveModules(districtModules, parentModules);

      // Features that should be upsell opportunities
      const allFeatures = Object.values(FeatureKeyValues);
      const upsellOpportunities = allFeatures.filter((feature) => !effective.has(feature));

      expect(upsellOpportunities).toContain('MODULE_SCIENCE');
      expect(upsellOpportunities).toContain('ADDON_SPEECH');
      expect(upsellOpportunities).toContain('ADDON_TUTORING');

      // Each upsell should return NONE for payer
      for (const feature of upsellOpportunities) {
        expect(computeFeaturePayer(feature, districtModules, parentModules)).toBe(
          FeaturePayerValues.NONE
        );
      }
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// RECONCILIATION LOGIC TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Billing Reconciliation Logic', () => {
  describe('Overlap Detection for Billing', () => {
    it('should detect features parent is paying for that district covers', () => {
      const districtModules = new Set(['MODULE_ELA', 'ADDON_SEL']);
      const parentModules = new Set(['ADDON_SEL', 'ADDON_SPEECH']);

      const overlaps = findOverlappingFeatures(districtModules, parentModules);

      // Parent is paying for SEL, but district provides it
      expect(overlaps.has('ADDON_SEL')).toBe(true);
      // Parent is paying for Speech, district doesn't provide it
      expect(overlaps.has('ADDON_SPEECH')).toBe(false);
    });

    it('should calculate refundable feature count', () => {
      const districtModules = new Set(['MODULE_ELA', 'MODULE_MATH', 'ADDON_SEL']);
      const parentModules = new Set(['MODULE_MATH', 'ADDON_SEL', 'ADDON_SPEECH']);

      const overlaps = findOverlappingFeatures(districtModules, parentModules);

      // 2 features (MATH, SEL) are refundable
      expect(overlaps.size).toBe(2);
    });
  });

  describe('Migration Recommendations', () => {
    it('should recommend migration when significant overlap exists', () => {
      const districtModules = new Set(['MODULE_ELA', 'MODULE_MATH', 'ADDON_SEL', 'ADDON_SPEECH']);
      const parentModules = new Set(['ADDON_SEL', 'ADDON_SPEECH']);

      const overlaps = findOverlappingFeatures(districtModules, parentModules);

      // All parent features overlap - high priority for migration
      const overlapPercentage = overlaps.size / parentModules.size;
      expect(overlapPercentage).toBe(1.0); // 100% overlap

      // In this case, parent could potentially downgrade or cancel
    });

    it('should not flag for migration with no overlap', () => {
      const districtModules = new Set(['MODULE_ELA', 'MODULE_MATH']);
      const parentModules = new Set(['ADDON_SEL', 'ADDON_SPEECH']);

      const overlaps = findOverlappingFeatures(districtModules, parentModules);

      expect(overlaps.size).toBe(0);
      // No migration needed - parent features complement district
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// EDGE CASES
// ══════════════════════════════════════════════════════════════════════════════

describe('Edge Cases', () => {
  it('should handle empty district and parent modules', () => {
    const districtModules = new Set<string>();
    const parentModules = new Set<string>();

    const effective = computeEffectiveModules(districtModules, parentModules);
    const overlaps = findOverlappingFeatures(districtModules, parentModules);

    expect(effective.size).toBe(0);
    expect(overlaps.size).toBe(0);
  });

  it('should handle unknown feature keys gracefully', () => {
    const districtModules = new Set(['UNKNOWN_FEATURE_1']);
    const parentModules = new Set(['UNKNOWN_FEATURE_2']);

    const effective = computeEffectiveModules(districtModules, parentModules);

    expect(effective.has('UNKNOWN_FEATURE_1')).toBe(true);
    expect(effective.has('UNKNOWN_FEATURE_2')).toBe(true);
  });

  it('should handle case-sensitive feature keys', () => {
    const districtModules = new Set(['MODULE_ELA']);
    const parentModules = new Set(['module_ela']); // lowercase

    const overlaps = findOverlappingFeatures(districtModules, parentModules);

    // Case sensitive - should NOT overlap
    expect(overlaps.size).toBe(0);
  });
});
