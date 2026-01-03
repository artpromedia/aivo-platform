/**
 * Content Selection Service
 *
 * Selects appropriate Learning Objects for learner plans.
 * Used by AI orchestrator (Lesson Planner agent) and teacher planning tools.
 */

import type { LearningObjectSubject, LearningObjectGradeBand } from './prisma-types.js';

import { searchContent, getRecentlyUsedLOIds, type SearchResult } from './search.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ContentSelectionInput {
  tenantId: string;
  learnerId: string;
  subject: LearningObjectSubject;
  gradeBand: LearningObjectGradeBand;
  targetSkills: string[];
  minutesAvailable: number;
  difficultyAdjustment?: 'easier' | 'standard' | 'harder';
  accessibilityProfile?: {
    dyslexiaFriendly?: boolean;
    reducedStimuli?: boolean;
    screenReader?: boolean;
    maxCognitiveLoad?: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  excludeLOIds?: string[];
  preferredContentTypes?: string[];
}

export interface SelectedContent {
  versionId: string;
  learningObjectId: string;
  title: string;
  estimatedDuration: number;
  primarySkillId: string | null;
  matchedSkills: string[];
  selectionScore: number;
  selectionReason: string;
}

export interface ContentSelectionResult {
  items: SelectedContent[];
  totalDurationMinutes: number;
  skillsCovered: string[];
  selectionNotes: string[];
  metadata: {
    candidatesConsidered: number;
    recentlyUsedFiltered: number;
    durationFiltered: number;
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// SCORING WEIGHTS
// ══════════════════════════════════════════════════════════════════════════════

const SCORE_WEIGHTS = {
  SKILL_MATCH_PRIMARY: 100, // LO's primary skill matches target
  SKILL_MATCH_SECONDARY: 50, // LO has target skill but not primary
  SKILL_COVERAGE_BONUS: 20, // Bonus for covering more target skills
  RECENTLY_USED_PENALTY: -200, // Penalty for recently used content
  DIFFICULTY_MATCH: 30, // Matches requested difficulty
  ACCESSIBILITY_MATCH: 25, // Matches accessibility needs
  DURATION_FIT: 15, // Duration fits well in available time
};

// ══════════════════════════════════════════════════════════════════════════════
// SELECTION IMPLEMENTATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Select Learning Objects for a learner's plan.
 * Used by Lesson Planner agent and teacher planning tools.
 *
 * Algorithm:
 * 1. Search for PUBLISHED LOs matching subject, grade, and skills
 * 2. Filter out recently used content
 * 3. Score candidates based on skill match, accessibility, duration fit
 * 4. Select top candidates that fit in available time
 * 5. Return ordered list with selection rationale
 */
export async function selectContentForPlan(
  input: ContentSelectionInput
): Promise<ContentSelectionResult> {
  const {
    tenantId,
    learnerId,
    subject,
    gradeBand,
    targetSkills,
    minutesAvailable,
    difficultyAdjustment = 'standard',
    accessibilityProfile,
    excludeLOIds = [],
    preferredContentTypes,
  } = input;

  const notes: string[] = [];
  let candidatesConsidered = 0;
  let recentlyUsedFiltered = 0;
  let durationFiltered = 0;

  // 1. Search for matching content
  const searchResults = await searchContent({
    tenantId,
    subject,
    gradeBand,
    skillIds: targetSkills,
    limit: 100, // Get more candidates for selection
  });

  candidatesConsidered = searchResults.total;

  if (searchResults.items.length === 0) {
    notes.push(`No published content found for ${subject} ${gradeBand} with target skills`);
    return {
      items: [],
      totalDurationMinutes: 0,
      skillsCovered: [],
      selectionNotes: notes,
      metadata: { candidatesConsidered, recentlyUsedFiltered, durationFiltered },
    };
  }

  // 2. Get recently used LO IDs for this learner
  const recentlyUsedIds = await getRecentlyUsedLOIds(tenantId, learnerId, 7);
  const excludeSet = new Set([...excludeLOIds, ...recentlyUsedIds]);

  // 3. Filter and score candidates
  const scoredCandidates: (SearchResult & { score: number; matchedSkills: string[] })[] = [];

  for (const lo of searchResults.items) {
    // Skip excluded content
    if (excludeSet.has(lo.learningObjectId)) {
      recentlyUsedFiltered++;
      continue;
    }

    // Skip if duration exceeds available time
    const duration = lo.estimatedDuration ?? 10; // Default 10 min
    if (duration > minutesAvailable) {
      durationFiltered++;
      continue;
    }

    // Calculate score
    let score = 0;
    const matchedSkills: string[] = [];

    // Skill matching
    for (const targetSkill of targetSkills) {
      const skillMatch = lo.skills.find((s) => s.skillId === targetSkill);
      if (skillMatch) {
        matchedSkills.push(targetSkill);
        if (skillMatch.isPrimary || lo.primarySkillId === targetSkill) {
          score += SCORE_WEIGHTS.SKILL_MATCH_PRIMARY;
        } else {
          score += SCORE_WEIGHTS.SKILL_MATCH_SECONDARY;
        }
      }
    }

    // Bonus for covering multiple skills
    if (matchedSkills.length > 1) {
      score += SCORE_WEIGHTS.SKILL_COVERAGE_BONUS * (matchedSkills.length - 1);
    }

    // Difficulty adjustment
    const difficulty = lo.difficulty?.toUpperCase();
    if (difficultyAdjustment === 'easier' && difficulty === 'EASY') {
      score += SCORE_WEIGHTS.DIFFICULTY_MATCH;
    } else if (difficultyAdjustment === 'harder' && difficulty === 'HARD') {
      score += SCORE_WEIGHTS.DIFFICULTY_MATCH;
    } else if (difficultyAdjustment === 'standard' && difficulty === 'MEDIUM') {
      score += SCORE_WEIGHTS.DIFFICULTY_MATCH;
    }

    // Accessibility matching
    if (accessibilityProfile) {
      if (
        accessibilityProfile.dyslexiaFriendly &&
        lo.accessibilityFlags.supportsDyslexiaFriendlyFont
      ) {
        score += SCORE_WEIGHTS.ACCESSIBILITY_MATCH;
      }
      if (accessibilityProfile.reducedStimuli && lo.accessibilityFlags.supportsReducedStimuli) {
        score += SCORE_WEIGHTS.ACCESSIBILITY_MATCH;
      }
      if (
        accessibilityProfile.screenReader &&
        lo.accessibilityFlags.hasScreenReaderOptimizedStructure
      ) {
        score += SCORE_WEIGHTS.ACCESSIBILITY_MATCH;
      }
      if (accessibilityProfile.maxCognitiveLoad) {
        const loadMap = { LOW: 1, MEDIUM: 2, HIGH: 3 };
        const contentLoad = lo.accessibilityFlags.estimatedCognitiveLoad;
        if (
          contentLoad &&
          loadMap[contentLoad as keyof typeof loadMap] <=
            loadMap[accessibilityProfile.maxCognitiveLoad]
        ) {
          score += SCORE_WEIGHTS.ACCESSIBILITY_MATCH;
        }
      }
    }

    // Duration fit bonus (prefer content that uses time efficiently)
    const durationRatio = duration / minutesAvailable;
    if (durationRatio >= 0.3 && durationRatio <= 0.5) {
      score += SCORE_WEIGHTS.DURATION_FIT; // Sweet spot: 30-50% of available time
    }

    // Content type preference
    if (preferredContentTypes && lo.contentType) {
      if (preferredContentTypes.includes(lo.contentType)) {
        score += 10;
      }
    }

    scoredCandidates.push({ ...lo, score, matchedSkills });
  }

  // 4. Sort by score and select to fit time budget
  scoredCandidates.sort((a, b) => b.score - a.score);

  const selectedItems: SelectedContent[] = [];
  let totalDuration = 0;
  const coveredSkills = new Set<string>();

  for (const candidate of scoredCandidates) {
    const duration = candidate.estimatedDuration ?? 10;

    if (totalDuration + duration <= minutesAvailable) {
      selectedItems.push({
        versionId: candidate.id,
        learningObjectId: candidate.learningObjectId,
        title: candidate.title,
        estimatedDuration: duration,
        primarySkillId: candidate.primarySkillId,
        matchedSkills: candidate.matchedSkills,
        selectionScore: candidate.score,
        selectionReason: buildSelectionReason(candidate, candidate.matchedSkills),
      });

      totalDuration += duration;
      candidate.matchedSkills.forEach((s) => coveredSkills.add(s));

      // Check if we've covered all target skills
      const uncoveredSkills = targetSkills.filter((s) => !coveredSkills.has(s));
      if (uncoveredSkills.length === 0 && totalDuration >= minutesAvailable * 0.7) {
        // We've covered all skills and used at least 70% of time
        break;
      }
    }
  }

  // 5. Build notes
  const uncoveredSkills = targetSkills.filter((s) => !coveredSkills.has(s));
  if (uncoveredSkills.length > 0) {
    notes.push(`Could not find content for skills: ${uncoveredSkills.join(', ')}`);
  }
  if (totalDuration < minutesAvailable * 0.5) {
    notes.push(
      `Only filled ${Math.round((totalDuration / minutesAvailable) * 100)}% of available time`
    );
  }
  if (recentlyUsedFiltered > 0) {
    notes.push(`Filtered ${recentlyUsedFiltered} recently used items`);
  }

  return {
    items: selectedItems,
    totalDurationMinutes: totalDuration,
    skillsCovered: Array.from(coveredSkills),
    selectionNotes: notes,
    metadata: {
      candidatesConsidered,
      recentlyUsedFiltered,
      durationFiltered,
    },
  };
}

/**
 * Build a human-readable selection reason.
 */
function buildSelectionReason(lo: SearchResult, matchedSkills: string[]): string {
  const reasons: string[] = [];

  if (matchedSkills.length > 0) {
    reasons.push(`Covers ${matchedSkills.length} target skill(s)`);
  }

  if (lo.accessibilityFlags.supportsDyslexiaFriendlyFont) {
    reasons.push('Dyslexia-friendly');
  }

  if (lo.estimatedDuration) {
    reasons.push(`${lo.estimatedDuration} min`);
  }

  return reasons.join(' • ');
}

/**
 * Quick selection for a single skill (used by Tutor agent).
 */
export async function selectSingleActivityForSkill(
  tenantId: string,
  learnerId: string,
  skillId: string,
  gradeBand: LearningObjectGradeBand,
  accessibilityProfile?: ContentSelectionInput['accessibilityProfile']
): Promise<SelectedContent | null> {
  const result = await selectContentForPlan({
    tenantId,
    learnerId,
    subject: 'MATH', // Will be overridden by skill lookup
    gradeBand,
    targetSkills: [skillId],
    minutesAvailable: 15,
    accessibilityProfile,
  });

  return result.items[0] ?? null;
}

/**
 * Get content statistics for a skill (for UI display).
 */
export async function getContentStatsForSkill(
  tenantId: string,
  skillId: string
): Promise<{ totalCount: number; avgDuration: number; contentTypes: string[] }> {
  const results = await searchContent({
    tenantId,
    skillId,
    limit: 100,
  });

  const durations = results.items
    .map((i) => i.estimatedDuration)
    .filter((d): d is number => d !== null);

  const avgDuration =
    durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  const contentTypes = [
    ...new Set(results.items.map((i) => i.contentType).filter(Boolean)),
  ] as string[];

  return {
    totalCount: results.total,
    avgDuration: Math.round(avgDuration),
    contentTypes,
  };
}
