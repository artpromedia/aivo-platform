/**
 * Learner Model Types
 *
 * Type definitions for the unified learner model that integrates:
 * - Bayesian Knowledge Tracing (BKT)
 * - Performance Factor Analysis (PFA)
 * - Learning curve analysis
 * - Engagement detection
 */

import type { EngagementAnalysis } from './analytics/engagement-detector.js';
import type { LearningCurveAnalysis } from './analytics/types.js';
import type { KnowledgeState, PracticeOutcome, NeurodiverseProfile } from './bkt/types.js';

/**
 * Learner profile containing personal information and accommodations
 */
export interface LearnerProfile {
  /** Learner identifier */
  learnerId: string;

  /** Tenant identifier */
  tenantId: string;

  /** Grade level */
  gradeLevel: number;

  /** Neurodiversity profile */
  neurodiversityProfile?: NeurodiverseProfile | undefined;

  /** Preferred learning style */
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading' | undefined;

  /** Active accommodations */
  accommodations: string[];

  /** Curriculum standards applicable to this learner (e.g., ['COMMON_CORE'], ['TEKS']) */
  curriculumStandards?: string[];

  /** State code for location-based curriculum (e.g., 'TX', 'CA') */
  stateCode?: string;

  /** ZIP code for district-level curriculum */
  zipCode?: string;
}

/**
 * Skill mastery information
 */
export interface SkillMastery {
  /** Skill identifier */
  skillId: string;

  /** Human-readable skill name */
  skillName: string;

  /** Skill domain */
  domain: string;

  /** Knowledge state from BKT */
  knowledgeState: KnowledgeState;

  /** Prerequisite skill IDs */
  prerequisites: string[];

  /** Whether prerequisites are met */
  isPrerequisiteMet: boolean;

  /** Recommended activities for this skill */
  recommendedActivities: string[];

  /** When this skill was last practiced */
  lastPracticed?: Date | undefined;

  /** Recent practice history */
  practiceHistory: PracticeOutcome[];
}

/**
 * Zone of Proximal Development (ZPD) classification
 */
export interface ZoneOfProximalDevelopment {
  /** Skills that are too easy (mastered) */
  tooEasy: string[];

  /** Skills in the ZPD (optimal for learning) */
  justRight: string[];

  /** Skills that are too hard (need prerequisites) */
  tooHard: string[];
}

/**
 * Complete learner model state
 */
export interface LearnerModelState {
  /** Learner identifier */
  learnerId: string;

  /** Map of skill ID to mastery */
  skills: Map<string, SkillMastery>;

  /** Overall mastery across all skills */
  overallMastery: number;

  /** Skills mastered per hour of practice */
  learningVelocity: number;

  /** Current engagement level */
  engagementLevel: 'high' | 'medium' | 'low' | 'disengaged';

  /** Current frustration level (0-1) */
  frustrationLevel: number;

  /** Zone of Proximal Development */
  estimatedZPD: ZoneOfProximalDevelopment;

  /** Areas where learner excels */
  strengthAreas: string[];

  /** Areas where learner struggles */
  challengeAreas: string[];

  /** Last update timestamp */
  lastUpdated: Date;
}

/**
 * Activity recommendation
 */
export interface ActivityRecommendation {
  /** Activity identifier */
  activityId: string;

  /** Target skill identifier */
  skillId: string;

  /** Human-readable skill name */
  skillName: string;

  /** Priority score (1-10, higher = more recommended) */
  priority: number;

  /** Reason for recommendation */
  reason: string;

  /** Estimated duration in minutes */
  estimatedDuration: number;

  /** Difficulty level */
  difficulty: 'easy' | 'medium' | 'hard';

  /** Activity type */
  type: 'practice' | 'review' | 'challenge' | 'remediation';

  /** Adaptations to apply */
  adaptations?: string[] | undefined;
}

/**
 * Learning insights generated from model updates
 */
export interface LearningInsights {
  /** Summary message */
  summary: string;

  /** Per-skill progress information */
  skillProgress: Record<
    string,
    {
      currentMastery: number;
      trend: string;
      estimatedToMastery: number;
    }
  >;

  /** Active alerts */
  alerts: {
    type: string;
    skillId?: string | undefined;
    message: string;
  }[];

  /** General recommendations */
  recommendations: string[];
}

/**
 * Result of updating the learner model with an outcome
 */
export interface UpdateOutcomeResult {
  /** Updated learner model state */
  updatedState: LearnerModelState;

  /** Generated insights */
  insights: LearningInsights;

  /** Activity recommendations */
  recommendations: ActivityRecommendation[];

  /** Engagement analysis */
  engagementAnalysis?: EngagementAnalysis | undefined;

  /** Learning curve analysis */
  learningCurveAnalysis?: LearningCurveAnalysis | undefined;
}

/**
 * Activity record from database
 */
export interface ActivityRecord {
  id: string;
  title: string;
  type: 'lesson' | 'practice' | 'assessment' | 'game' | 'video';
  skillIds: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedMinutes: number;
  isInteractive: boolean;
  prerequisites: string[];
  metadata: Record<string, unknown>;
  /** Standards codes aligned to this activity (e.g., CCSS.MATH.3.NF.A.1, TEKS.M.3.1) */
  standardCodes?: string[];
}

/**
 * Skill record from database
 */
export interface SkillRecord {
  id: string;
  name: string;
  domain: string;
  prerequisites: string[];
}

/**
 * IEP Goal progress tracking
 */
export interface IepGoalProgress {
  goalId: string;
  goalDescription: string;
  targetCriteria: string;
  currentProgress: number;
  estimatedMastery: number;
  status: 'on_track' | 'at_risk' | 'behind' | 'completed' | 'in_progress';
  relatedSkills: { skillId: string; mastery: number }[];
  projectedCompletionDate: Date | null;
}

/**
 * Learning analytics summary
 */
export interface LearningAnalytics {
  overallMastery: number;
  learningVelocity: number;
  engagementLevel: string;
  frustrationLevel: number;

  skillsSummary: {
    total: number;
    mastered: number;
    inProgress: number;
    struggling: number;
  };

  strengthAreas: string[];
  challengeAreas: string[];

  practiceStats: {
    totalMinutes: number;
    totalProblems: number;
    accuracy: number;
  };

  zoneOfProximalDevelopment: {
    ready: number;
    needsSupport: number;
    mastered: number;
  };

  lastUpdated: Date;
}

/**
 * Performance prediction for a skill
 */
export interface PerformancePrediction {
  skillId: string;
  skillName?: string | undefined;
  predictedAccuracy: number;
  confidence: number;
  currentMastery?: number | undefined;
  recommendation: string;
}
