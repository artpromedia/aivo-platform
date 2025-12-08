/**
 * AI Orchestrator client for the Learner Model Service.
 *
 * Provides integration with the LESSON_PLANNER agent for:
 * - Refining activity ordering based on learning science principles
 * - Generating personalized activity descriptions
 * - Adaptive difficulty recommendations
 *
 * Future Enhancements:
 * - Use AI to analyze learning patterns and predict optimal sequences
 * - Personalize descriptions based on learner preferences
 * - Factor in time of day, energy levels, and past performance
 * - Consider spaced repetition and interleaving principles
 */

import { config } from '../config.js';
import type { TodaysPlanActivity, SkillDomain } from '../types/plan.js';

// ── Types ────────────────────────────────────────────────────────────────────

interface LessonPlannerRequest {
  learnerId: string;
  gradeBand: string;
  activities: TodaysPlanActivity[];
  focusDomains: SkillDomain[];
  context?: {
    timeOfDay?: 'morning' | 'afternoon' | 'evening';
    sessionDurationMins?: number;
    recentPerformance?: Record<string, number>;
  };
}

interface LessonPlannerResponse {
  orderedActivities: TodaysPlanActivity[];
  aiNotes?: string;
  success: boolean;
  error?: string;
}

// ── Client ───────────────────────────────────────────────────────────────────

/**
 * Call the AI Orchestrator's LESSON_PLANNER agent to refine activity ordering.
 *
 * This is currently a stub that returns activities in their original order.
 * In production, this would call the AI Orchestrator to:
 * 1. Apply pedagogical principles (start easy, build complexity)
 * 2. Interleave subjects for better retention
 * 3. Consider learner preferences and energy patterns
 * 4. Generate personalized activity descriptions
 *
 * @param request - The lesson planning request
 * @returns Ordered activities with optional AI enhancements
 */
export async function callLessonPlanner(
  request: LessonPlannerRequest
): Promise<LessonPlannerResponse> {
  const aiOrchestratorUrl = config.aiOrchestratorUrl;
  const apiKey = config.aiOrchestratorApiKey;

  // If no API key configured, return activities as-is with deterministic ordering
  if (!apiKey) {
    console.log('[AI Orchestrator] No API key configured, using deterministic ordering');
    return {
      orderedActivities: applyDeterministicOrdering(request.activities),
      success: true,
      aiNotes: 'Using deterministic ordering (AI planner not configured)',
    };
  }

  try {
    const response = await fetch(`${aiOrchestratorUrl}/agents/lesson-planner/plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        agent: 'LESSON_PLANNER',
        payload: request,
      }),
    });

    if (!response.ok) {
      console.error('[AI Orchestrator] Error:', response.status, await response.text());
      return {
        orderedActivities: applyDeterministicOrdering(request.activities),
        success: false,
        error: `AI planner unavailable (HTTP ${response.status})`,
      };
    }

    const result = (await response.json()) as { orderedActivities?: TodaysPlanActivity[] };
    return {
      orderedActivities: result.orderedActivities ?? request.activities,
      success: true,
      aiNotes: 'Activities ordered by AI lesson planner',
    };
  } catch (error) {
    console.error('[AI Orchestrator] Network error:', error);
    return {
      orderedActivities: applyDeterministicOrdering(request.activities),
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Apply deterministic ordering rules when AI is not available.
 *
 * Rules:
 * 1. Start with medium-difficulty activities to warm up
 * 2. Place hardest activities in the middle (peak focus)
 * 3. End with easier/review activities
 * 4. Interleave domains to prevent fatigue
 */
function applyDeterministicOrdering(activities: TodaysPlanActivity[]): TodaysPlanActivity[] {
  if (activities.length <= 1) return activities;

  // Group by difficulty
  const easy = activities.filter((a) => a.difficultyLevel <= 2);
  const medium = activities.filter((a) => a.difficultyLevel === 3);
  const hard = activities.filter((a) => a.difficultyLevel >= 4);

  // Interleave: medium start, hard middle, easy end
  const ordered: TodaysPlanActivity[] = [];

  // Take one medium to start
  if (medium.length > 0) {
    ordered.push(medium.shift()!);
  } else if (easy.length > 0) {
    ordered.push(easy.shift()!);
  }

  // Add hard activities in middle
  ordered.push(...hard);

  // Add remaining medium
  ordered.push(...medium);

  // End with easy activities
  ordered.push(...easy);

  return ordered;
}
