/**
 * Curriculum Content Filter
 *
 * Filters learning activities based on learner's curriculum standards and location.
 * Ensures content delivered to learners aligns with their state/district requirements.
 *
 * Supports:
 * - COMMON_CORE (CCSS) - Most US states
 * - TEKS - Texas Essential Knowledge and Skills
 * - NGSS - Next Generation Science Standards
 * - STATE_SPECIFIC - Other state-specific standards
 *
 * @author AIVO Platform Team
 */

import type { ActivityRecord, LearnerProfile } from '../models/index.js';

/**
 * Standards framework prefixes for matching content
 */
const STANDARDS_PREFIXES: Record<string, string[]> = {
  COMMON_CORE: ['CCSS', 'CC'],
  TEKS: ['TEKS', 'TX'],
  NGSS: ['NGSS'],
  C3: ['C3', 'D2'],
  STATE_SPECIFIC: [], // Matches by state code prefix
};

/**
 * State-to-standards mapping for automatic detection
 */
const STATE_STANDARDS_MAP: Record<string, string[]> = {
  TX: ['TEKS'],
  VA: ['SOL', 'STATE_SPECIFIC'],
  FL: ['B.E.S.T', 'STATE_SPECIFIC'],
  IN: ['IAS', 'STATE_SPECIFIC'],
  OK: ['OAS', 'STATE_SPECIFIC'],
  SC: ['SCCCR', 'STATE_SPECIFIC'],
  // Most states use Common Core
  DEFAULT: ['COMMON_CORE', 'NGSS', 'C3'],
};

/**
 * Filter options for curriculum-based content selection
 */
export interface CurriculumFilterOptions {
  /** Strict mode - only include activities with matching standards (default: false) */
  strictMode?: boolean;
  /** Include activities without standards (universal content) */
  includeUnaligned?: boolean;
  /** Boost score for perfectly aligned content */
  alignmentBoostFactor?: number;
}

/**
 * Result of curriculum filtering
 */
export interface CurriculumFilterResult {
  /** Activities that match the learner's curriculum */
  aligned: ActivityRecord[];
  /** Activities without standards alignment (universal) */
  universal: ActivityRecord[];
  /** Activities with mismatched standards (filtered out in strict mode) */
  misaligned: ActivityRecord[];
  /** Statistics about the filtering */
  stats: {
    totalInput: number;
    alignedCount: number;
    universalCount: number;
    misalignedCount: number;
    filterRate: number;
  };
}

/**
 * Curriculum Content Filter Service
 *
 * Filters learning content based on learner's location and curriculum standards.
 */
export class CurriculumContentFilter {
  /**
   * Filter activities based on learner's curriculum standards
   */
  filterByCurriculum(
    activities: ActivityRecord[],
    learnerProfile: LearnerProfile | null,
    options: CurriculumFilterOptions = {}
  ): CurriculumFilterResult {
    const {
      strictMode = false,
      includeUnaligned = true,
    } = options;

    // Get learner's applicable standards
    const learnerStandards = this.getLearnerStandards(learnerProfile);

    const aligned: ActivityRecord[] = [];
    const universal: ActivityRecord[] = [];
    const misaligned: ActivityRecord[] = [];

    for (const activity of activities) {
      const classification = this.classifyActivity(activity, learnerStandards);

      switch (classification) {
        case 'aligned':
          aligned.push(activity);
          break;
        case 'universal':
          universal.push(activity);
          break;
        case 'misaligned':
          misaligned.push(activity);
          break;
      }
    }

    // Build result based on mode
    const stats = {
      totalInput: activities.length,
      alignedCount: aligned.length,
      universalCount: universal.length,
      misalignedCount: misaligned.length,
      filterRate: misaligned.length / Math.max(activities.length, 1),
    };

    return { aligned, universal, misaligned, stats };
  }

  /**
   * Filter activities and return only those appropriate for the learner
   * Convenience method for simple filtering
   */
  filterActivities(
    activities: ActivityRecord[],
    learnerProfile: LearnerProfile | null,
    options: CurriculumFilterOptions = {}
  ): ActivityRecord[] {
    const { strictMode = false, includeUnaligned = true } = options;
    const result = this.filterByCurriculum(activities, learnerProfile, options);

    if (strictMode) {
      // Only return aligned content
      return result.aligned;
    }

    // Return aligned + universal (default behavior)
    if (includeUnaligned) {
      return [...result.aligned, ...result.universal];
    }

    return result.aligned;
  }

  /**
   * Get learner's applicable standards based on profile and location
   */
  private getLearnerStandards(learnerProfile: LearnerProfile | null): string[] {
    if (!learnerProfile) {
      return STATE_STANDARDS_MAP.DEFAULT;
    }

    // Use explicit curriculum standards if set
    if (learnerProfile.curriculumStandards && learnerProfile.curriculumStandards.length > 0) {
      return learnerProfile.curriculumStandards;
    }

    // Fall back to state-based standards
    if (learnerProfile.stateCode) {
      return STATE_STANDARDS_MAP[learnerProfile.stateCode] ?? STATE_STANDARDS_MAP.DEFAULT;
    }

    return STATE_STANDARDS_MAP.DEFAULT;
  }

  /**
   * Classify an activity based on its standards alignment
   */
  private classifyActivity(
    activity: ActivityRecord,
    learnerStandards: string[]
  ): 'aligned' | 'universal' | 'misaligned' {
    // No standards = universal content
    if (!activity.standardCodes || activity.standardCodes.length === 0) {
      return 'universal';
    }

    // Check if any activity standard matches learner's standards
    const isAligned = activity.standardCodes.some((code) =>
      this.standardMatchesCurriculum(code, learnerStandards)
    );

    return isAligned ? 'aligned' : 'misaligned';
  }

  /**
   * Check if a standard code matches any of the learner's curriculum standards
   */
  private standardMatchesCurriculum(standardCode: string, learnerStandards: string[]): boolean {
    const normalizedCode = standardCode.toUpperCase();

    for (const standard of learnerStandards) {
      const prefixes = STANDARDS_PREFIXES[standard] || [standard];

      // Check if the standard code starts with any of the expected prefixes
      for (const prefix of prefixes) {
        if (normalizedCode.startsWith(prefix)) {
          return true;
        }
      }

      // Also check for direct matches (e.g., custom standards)
      if (normalizedCode.includes(standard)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Score an activity's alignment with learner's curriculum
   * Returns 0-1, where 1 is perfect alignment
   */
  scoreAlignment(
    activity: ActivityRecord,
    learnerProfile: LearnerProfile | null
  ): number {
    if (!activity.standardCodes || activity.standardCodes.length === 0) {
      return 0.5; // Neutral score for universal content
    }

    const learnerStandards = this.getLearnerStandards(learnerProfile);
    const matchingCount = activity.standardCodes.filter((code) =>
      this.standardMatchesCurriculum(code, learnerStandards)
    ).length;

    // Calculate alignment ratio
    const alignmentRatio = matchingCount / activity.standardCodes.length;

    return alignmentRatio;
  }

  /**
   * Get standards framework for a state
   */
  getStateStandards(stateCode: string): string[] {
    return STATE_STANDARDS_MAP[stateCode] ?? STATE_STANDARDS_MAP.DEFAULT;
  }

  /**
   * Check if a state uses Common Core
   */
  isCommonCoreState(stateCode: string): boolean {
    const standards = this.getStateStandards(stateCode);
    return standards.includes('COMMON_CORE');
  }
}

// Export singleton instance
export const curriculumContentFilter = new CurriculumContentFilter();
