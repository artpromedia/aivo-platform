/**
 * Domain types for Goals & Session Planning
 *
 * These mirror the goal-svc types to avoid cross-service dependencies.
 */

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ══════════════════════════════════════════════════════════════════════════════

export type GoalDomain = 'ELA' | 'MATH' | 'SCIENCE' | 'SPEECH' | 'SEL' | 'OTHER';
export type GoalStatus = 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
export type ObjectiveStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'MET' | 'NOT_MET';
export type SessionPlanType = 'LEARNING' | 'THERAPY' | 'GROUP' | 'ASSESSMENT' | 'PRACTICE' | 'OTHER';
export type SessionPlanStatus = 'DRAFT' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ProgressRating = 0 | 1 | 2 | 3 | 4;

// ══════════════════════════════════════════════════════════════════════════════
// ENTITIES
// ══════════════════════════════════════════════════════════════════════════════

export interface Goal {
  id: string;
  tenantId: string;
  learnerId: string;
  createdByUserId: string;
  title: string;
  description: string | null;
  domain: GoalDomain;
  skillId: string | null;
  startDate: Date;
  targetDate: Date | null;
  status: GoalStatus;
  progressRating: ProgressRating | null;
  metadataJson: GoalMetadata | null;
  createdAt: Date;
  updatedAt: Date;
  objectives?: GoalObjective[];
  skill?: SkillInfo;
}

export interface GoalMetadata {
  standardsTag?: string;
  iepGoalNumber?: string;
  internalNotes?: string;
  [key: string]: unknown;
}

export interface GoalObjective {
  id: string;
  goalId: string;
  description: string;
  successCriteria: string | null;
  status: ObjectiveStatus;
  progressRating: ProgressRating | null;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionPlan {
  id: string;
  tenantId: string;
  learnerId: string;
  createdByUserId: string;
  sessionTemplateName: string | null;
  scheduledFor: Date | null;
  estimatedDurationMinutes: number | null;
  sessionType: SessionPlanType;
  status: SessionPlanStatus;
  sessionId: string | null;
  metadataJson: SessionPlanMetadata | null;
  createdAt: Date;
  updatedAt: Date;
  items?: SessionPlanItem[];
}

export interface SessionPlanMetadata {
  classroomId?: string;
  location?: string;
  groupMemberIds?: string[];
  recurrenceRule?: string;
  [key: string]: unknown;
}

export interface SessionPlanItem {
  id: string;
  sessionPlanId: string;
  orderIndex: number;
  goalId: string | null;
  goalObjectiveId: string | null;
  skillId: string | null;
  activityType: string;
  activityDescription: string | null;
  estimatedDurationMinutes: number | null;
  aiMetadataJson: SessionPlanItemAiMetadata | null;
  createdAt: Date;
  updatedAt: Date;
  skill?: SkillInfo;
}

export interface SessionPlanItemAiMetadata {
  learningObjectId?: string;
  promptTemplate?: string;
  difficultyLevel?: number;
  [key: string]: unknown;
}

export interface ProgressNote {
  id: string;
  tenantId: string;
  learnerId: string;
  createdByUserId: string;
  sessionId: string | null;
  sessionPlanId: string | null;
  goalId: string | null;
  goalObjectiveId: string | null;
  noteText: string;
  rating: ProgressRating | null;
  evidenceUri: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// SUPPORTING TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Skill info from learner-model-svc (subset) */
export interface SkillInfo {
  id: string;
  name: string;
  domain?: string;
}
