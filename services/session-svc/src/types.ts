/**
 * Session & Event Type Definitions
 *
 * This module provides TypeScript types that mirror the Prisma schema
 * and add domain-specific type safety for metadata fields.
 */

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS (mirrored from Prisma for type safety in application code)
// ══════════════════════════════════════════════════════════════════════════════

export const SessionType = {
  LEARNING: 'LEARNING',
  HOMEWORK: 'HOMEWORK',
  BASELINE: 'BASELINE',
  PRACTICE: 'PRACTICE',
  SEL: 'SEL',
  ASSESSMENT: 'ASSESSMENT',
} as const;
// eslint-disable-next-line no-redeclare
export type SessionType = (typeof SessionType)[keyof typeof SessionType];

export const SessionOrigin = {
  MOBILE_LEARNER: 'MOBILE_LEARNER',
  WEB_LEARNER: 'WEB_LEARNER',
  TEACHER_LED: 'TEACHER_LED',
  HOMEWORK_HELPER: 'HOMEWORK_HELPER',
  PARENT_APP: 'PARENT_APP',
  SYSTEM: 'SYSTEM',
} as const;
// eslint-disable-next-line no-redeclare
export type SessionOrigin = (typeof SessionOrigin)[keyof typeof SessionOrigin];

export const SessionEventType = {
  // Session Lifecycle
  SESSION_STARTED: 'SESSION_STARTED',
  SESSION_PAUSED: 'SESSION_PAUSED',
  SESSION_RESUMED: 'SESSION_RESUMED',
  SESSION_ENDED: 'SESSION_ENDED',
  SESSION_ABANDONED: 'SESSION_ABANDONED',

  // Activity Events
  ACTIVITY_STARTED: 'ACTIVITY_STARTED',
  ACTIVITY_COMPLETED: 'ACTIVITY_COMPLETED',
  ACTIVITY_SKIPPED: 'ACTIVITY_SKIPPED',
  ACTIVITY_RESPONSE_SUBMITTED: 'ACTIVITY_RESPONSE_SUBMITTED',

  // Homework Helper Events
  HOMEWORK_CAPTURED: 'HOMEWORK_CAPTURED',
  HOMEWORK_PARSED: 'HOMEWORK_PARSED',
  HOMEWORK_STEP_STARTED: 'HOMEWORK_STEP_STARTED',
  HOMEWORK_STEP_COMPLETED: 'HOMEWORK_STEP_COMPLETED',
  HOMEWORK_HINT_REQUESTED: 'HOMEWORK_HINT_REQUESTED',
  HOMEWORK_SOLUTION_SHOWN: 'HOMEWORK_SOLUTION_SHOWN',

  // Focus & Regulation Events
  FOCUS_LOSS_DETECTED: 'FOCUS_LOSS_DETECTED',
  FOCUS_BREAK_STARTED: 'FOCUS_BREAK_STARTED',
  FOCUS_BREAK_ENDED: 'FOCUS_BREAK_ENDED',
  FOCUS_INTERVENTION_SHOWN: 'FOCUS_INTERVENTION_SHOWN',
  FOCUS_INTERVENTION_COMPLETED: 'FOCUS_INTERVENTION_COMPLETED',

  // Skill & Mastery Events
  SKILL_MASTERY_UPDATED: 'SKILL_MASTERY_UPDATED',
  SKILL_UNLOCKED: 'SKILL_UNLOCKED',

  // Engagement Events
  REWARD_EARNED: 'REWARD_EARNED',
  STREAK_MILESTONE: 'STREAK_MILESTONE',
  ACHIEVEMENT_UNLOCKED: 'ACHIEVEMENT_UNLOCKED',
} as const;
// eslint-disable-next-line no-redeclare
export type SessionEventType = (typeof SessionEventType)[keyof typeof SessionEventType];

// ══════════════════════════════════════════════════════════════════════════════
// METADATA SCHEMAS
// Type-safe metadata definitions for each event type
// ══════════════════════════════════════════════════════════════════════════════

// ─── Session Metadata ──────────────────────────────────────────────────────────

export interface LearningSessionMetadata {
  planId?: string;
  targetSkills?: string[];
  classroomId?: string;
  assignedByTeacherId?: string;
}

export interface HomeworkSessionMetadata {
  homeworkSubject?: string;
  grade?: number;
  problemCount?: number;
  sourceImageUrl?: string;
}

export interface BaselineSessionMetadata {
  baselineProfileId: string;
  baselineAttemptId: string;
  gradeBand: 'K5' | 'G6_8' | 'G9_12';
}

export type SessionMetadata =
  | LearningSessionMetadata
  | HomeworkSessionMetadata
  | BaselineSessionMetadata
  | Record<string, unknown>;

// ─── Event Metadata ────────────────────────────────────────────────────────────

export interface ActivityCompletedMetadata {
  activityId: string;
  skillCode?: string;
  score?: number;
  durationMs?: number;
  correctResponses?: number;
  totalResponses?: number;
}

export interface ActivityStartedMetadata {
  activityId: string;
  activityType?: string;
  skillCode?: string;
}

export interface HomeworkStepCompletedMetadata {
  stepIndex: number;
  correct: boolean;
  hintUsed?: boolean;
  durationMs?: number;
}

export interface HomeworkCapturedMetadata {
  imageUrl?: string;
  documentType?: 'photo' | 'pdf' | 'scan';
  problemCount?: number;
}

export interface FocusLossDetectedMetadata {
  focusScore: number;
  idleSeconds?: number;
  trigger?: 'gaze_away' | 'inactivity' | 'rapid_errors' | 'other';
}

export interface FocusBreakMetadata {
  reason?: 'user_requested' | 'system_suggested' | 'scheduled';
  durationMs?: number;
}

export interface SkillMasteryUpdatedMetadata {
  skillCode: string;
  previousMastery: number;
  newMastery: number;
  delta: number;
  source?: 'activity' | 'baseline' | 'homework' | 'assessment';
}

export interface RewardEarnedMetadata {
  rewardType: string;
  rewardId?: string;
  xpEarned?: number;
}

export type SessionEventMetadata =
  | ActivityCompletedMetadata
  | ActivityStartedMetadata
  | HomeworkStepCompletedMetadata
  | HomeworkCapturedMetadata
  | FocusLossDetectedMetadata
  | FocusBreakMetadata
  | SkillMasteryUpdatedMetadata
  | RewardEarnedMetadata
  | Record<string, unknown>;

// ══════════════════════════════════════════════════════════════════════════════
// API TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateSessionInput {
  tenantId: string;
  learnerId: string;
  sessionType: SessionType;
  origin: SessionOrigin;
  metadata?: SessionMetadata;
}

export interface CreateEventInput {
  eventType: SessionEventType;
  eventTime?: Date;
  metadata?: SessionEventMetadata;
}

export interface CompleteSessionInput {
  endedAt?: Date;
  metadata?: Partial<SessionMetadata>;
}

export interface SessionSummary {
  id: string;
  tenantId: string;
  learnerId: string;
  sessionType: SessionType;
  origin: SessionOrigin;
  startedAt: Date;
  endedAt: Date | null;
  durationMs: number | null;
  eventCount: number;
  metadata: SessionMetadata | null;
}

export interface SessionWithEvents {
  id: string;
  tenantId: string;
  learnerId: string;
  sessionType: SessionType;
  origin: SessionOrigin;
  startedAt: Date;
  endedAt: Date | null;
  durationMs: number | null;
  metadata: SessionMetadata | null;
  events: {
    id: string;
    eventType: SessionEventType;
    eventTime: Date;
    metadata: SessionEventMetadata | null;
  }[];
}
