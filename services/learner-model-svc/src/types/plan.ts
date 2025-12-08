/**
 * Internal type definitions for plan-related APIs.
 * These mirror the shared @aivo/ts-types definitions but are used locally
 * to avoid circular dependencies during development.
 */

// ── Enums ────────────────────────────────────────────────────────────────────

export type SkillDomain = 'ELA' | 'MATH' | 'SCIENCE' | 'SPEECH' | 'SEL';

export type GradeBand = 'K5' | 'G6_8' | 'G9_12';

export type LearningObjectType =
  | 'LESSON'
  | 'EXERCISE'
  | 'GAME'
  | 'VIDEO'
  | 'READING'
  | 'ASSESSMENT';

export type DifficultyRecommendationValue = 'EASIER' | 'SAME' | 'HARDER';

// ── Today's Plan ─────────────────────────────────────────────────────────────

export interface TodaysPlanActivity {
  activityId: string;
  skillCode: string;
  skillDisplayName: string;
  domain: SkillDomain;
  difficultyLevel: number;
  objectType: LearningObjectType;
  title: string;
  description: string | null;
  estimatedMinutes: number;
  contentUrl: string | null;
  currentMastery: number;
  reason: 'focus_area' | 'practice' | 'challenge' | 'ai_recommended';
}

export interface TodaysPlanRequest {
  maxActivities?: number;
  includeDomains?: SkillDomain[];
  useAiPlanner?: boolean;
}

export interface TodaysPlanResponse {
  learnerId: string;
  planDate: string;
  totalMinutes: number;
  activities: TodaysPlanActivity[];
  focusAreas: {
    domain: SkillDomain;
    skillCount: number;
    avgMastery: number;
  }[];
  aiPlannerUsed: boolean;
}

// ── Difficulty Recommendation ────────────────────────────────────────────────

export interface DifficultyRecommendationQuery {
  domain?: SkillDomain;
  skillCode?: string;
}

export interface DifficultyRecommendationResponse {
  learnerId: string;
  recommendation: DifficultyRecommendationValue;
  reason: string;
  currentMastery: number;
  recentPerformance?: {
    totalAttempts: number;
    correctCount: number;
    correctRate: number;
  };
  suggestedDifficultyLevel: number;
  scope: {
    domain?: SkillDomain;
    skillCode?: string;
  };
}

// ── Internal Types ───────────────────────────────────────────────────────────

export interface SkillStateForPlan {
  skillId: string;
  skillCode: string;
  domain: SkillDomain;
  displayName: string;
  masteryLevel: number;
  confidence: number;
  practiceCount: number;
}

export interface LearningObjectRecord {
  id: string;
  skillCode: string;
  domain: SkillDomain;
  gradeBand: GradeBand;
  difficultyLevel: number;
  objectType: LearningObjectType;
  title: string;
  description: string | null;
  estimatedMinutes: number;
  contentUrl: string | null;
}
