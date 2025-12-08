/**
 * Shared types for Virtual Brain APIs.
 * Used by learner-model-svc and consuming apps.
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

export type DifficultyRecommendation = 'EASIER' | 'SAME' | 'HARDER';

// ── Today's Plan ─────────────────────────────────────────────────────────────

/**
 * A single activity in the learner's daily plan.
 */
export interface TodaysPlanActivity {
  /** Unique activity ID (learning object ID) */
  activityId: string;
  /** Skill code this activity targets */
  skillCode: string;
  /** Display name of the skill */
  skillDisplayName: string;
  /** Domain (subject area) */
  domain: SkillDomain;
  /** Difficulty level (1-5) */
  difficultyLevel: number;
  /** Activity type */
  objectType: LearningObjectType;
  /** Activity title */
  title: string;
  /** Activity description */
  description: string | null;
  /** Estimated duration in minutes */
  estimatedMinutes: number;
  /** Optional content URL */
  contentUrl: string | null;
  /** Current mastery level for this skill (0-10) */
  currentMastery: number;
  /** Why this activity was recommended */
  reason: 'focus_area' | 'practice' | 'challenge' | 'ai_recommended';
}

/**
 * Request body for generating today's plan.
 */
export interface TodaysPlanRequest {
  /** Maximum number of activities (default: 4) */
  maxActivities?: number;
  /** Filter to specific domains (default: all) */
  includeDomains?: SkillDomain[];
  /** Whether to call AI orchestrator for refined ordering */
  useAiPlanner?: boolean;
}

/**
 * Response from today's plan endpoint.
 */
export interface TodaysPlanResponse {
  /** Learner ID */
  learnerId: string;
  /** Generated plan date (ISO string) */
  planDate: string;
  /** Estimated total duration in minutes */
  totalMinutes: number;
  /** List of planned activities */
  activities: TodaysPlanActivity[];
  /** Summary of focus areas */
  focusAreas: {
    domain: SkillDomain;
    skillCount: number;
    avgMastery: number;
  }[];
  /** AI planner metadata (if used) */
  aiPlannerUsed: boolean;
}

// ── Difficulty Recommendation ────────────────────────────────────────────────

/**
 * Query params for difficulty recommendation.
 */
export interface DifficultyRecommendationQuery {
  /** Filter by domain */
  domain?: SkillDomain;
  /** Filter by specific skill */
  skillCode?: string;
}

/**
 * Response from difficulty recommendation endpoint.
 */
export interface DifficultyRecommendationResponse {
  /** Learner ID */
  learnerId: string;
  /** The recommendation */
  recommendation: DifficultyRecommendation;
  /** Human-readable explanation */
  reason: string;
  /** Current average mastery level */
  currentMastery: number;
  /** Recent performance metrics (if available) */
  recentPerformance?: {
    totalAttempts: number;
    correctCount: number;
    correctRate: number;
  };
  /** Recommended difficulty level (1-5) */
  suggestedDifficultyLevel: number;
  /** Scope of recommendation */
  scope: {
    domain?: SkillDomain;
    skillCode?: string;
  };
}

// ── Learning Object ──────────────────────────────────────────────────────────

/**
 * Learning object from the content catalog.
 */
export interface LearningObject {
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

// ── Virtual Brain Summary ────────────────────────────────────────────────────

/**
 * Skill state for a learner.
 */
export interface SkillState {
  skillId: string;
  skillCode: string;
  domain: SkillDomain;
  displayName: string;
  masteryLevel: number;
  confidence: number;
  practiceCount: number;
  correctStreak: number;
  lastAssessedAt: string;
}

/**
 * Virtual Brain summary for display.
 */
export interface VirtualBrainSummary {
  id: string;
  learnerId: string;
  gradeBand: GradeBand;
  totalSkills: number;
  avgMastery: number;
  byDomain: Record<
    SkillDomain,
    {
      count: number;
      avgMastery: number;
    }
  >;
}
