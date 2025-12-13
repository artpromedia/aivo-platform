// =============================================================================
// @aivo/events - Learning Event Schemas
// =============================================================================
//
// Events for learning sessions: session lifecycle, activity completion,
// skill mastery, and engagement metrics.

import { z } from 'zod';
import {
  BaseEventSchema,
  GradeBandSchema,
  SessionOriginSchema,
  SessionTypeSchema,
} from './base';

// -----------------------------------------------------------------------------
// Learning Session Events
// -----------------------------------------------------------------------------

/**
 * Session started event - emitted when a learner begins a learning session.
 */
export const LearningSessionStartedSchema = BaseEventSchema.extend({
  eventType: z.literal('learning.session.started'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    sessionType: SessionTypeSchema,
    origin: SessionOriginSchema,
    gradeBand: GradeBandSchema,
    subjectId: z.string().uuid().optional(),
    courseId: z.string().uuid().optional(),
    /** Device type (mobile, tablet, desktop) */
    deviceType: z.enum(['mobile', 'tablet', 'desktop']).optional(),
    /** Initial activity if pre-selected */
    initialActivityId: z.string().uuid().optional(),
    /** Start time (may differ from event timestamp due to offline sync) */
    startedAt: z.string().datetime({ offset: true }),
  }),
});

export type LearningSessionStarted = z.infer<typeof LearningSessionStartedSchema>;

/**
 * Session ended event - emitted when a learning session concludes.
 */
export const LearningSessionEndedSchema = BaseEventSchema.extend({
  eventType: z.literal('learning.session.ended'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    /** Duration in milliseconds */
    durationMs: z.number().int().min(0),
    /** End reason */
    endReason: z.enum([
      'completed',
      'user_exit',
      'timeout',
      'app_background',
      'connection_lost',
      'error',
    ]),
    /** Summary statistics */
    summary: z.object({
      activitiesStarted: z.number().int().min(0),
      activitiesCompleted: z.number().int().min(0),
      correctAnswers: z.number().int().min(0),
      incorrectAnswers: z.number().int().min(0),
      hintsUsed: z.number().int().min(0),
      /** Average focus score (0-100) */
      avgFocusScore: z.number().min(0).max(100).optional(),
    }),
    endedAt: z.string().datetime({ offset: true }),
  }),
});

export type LearningSessionEnded = z.infer<typeof LearningSessionEndedSchema>;

// -----------------------------------------------------------------------------
// Activity Events
// -----------------------------------------------------------------------------

/**
 * Activity started event - emitted when a learner begins an activity.
 */
export const ActivityStartedSchema = BaseEventSchema.extend({
  eventType: z.literal('learning.activity.started'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    activityId: z.string().uuid(),
    activityType: z.enum([
      'lesson',
      'quiz',
      'practice',
      'game',
      'video',
      'reading',
      'interactive',
    ]),
    /** Content item being worked on */
    contentId: z.string().uuid(),
    /** Skill being practiced */
    skillId: z.string().uuid().optional(),
    /** Difficulty level (1-5) */
    difficultyLevel: z.number().int().min(1).max(5).optional(),
    /** Sequence number within session */
    sequenceNumber: z.number().int().min(1),
    startedAt: z.string().datetime({ offset: true }),
  }),
});

export type ActivityStarted = z.infer<typeof ActivityStartedSchema>;

/**
 * Activity completed event - emitted when a learner finishes an activity.
 */
export const ActivityCompletedSchema = BaseEventSchema.extend({
  eventType: z.literal('learning.activity.completed'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    activityId: z.string().uuid(),
    /** Duration in milliseconds */
    durationMs: z.number().int().min(0),
    /** Completion outcome */
    outcome: z.enum(['completed', 'skipped', 'abandoned', 'timed_out']),
    /** Score if applicable (0-100) */
    score: z.number().min(0).max(100).optional(),
    /** Number of attempts */
    attempts: z.number().int().min(1).optional(),
    /** Mastery level achieved (0-1) */
    masteryLevel: z.number().min(0).max(1).optional(),
    /** Time spent on-task vs total (ratio) */
    onTaskRatio: z.number().min(0).max(1).optional(),
    completedAt: z.string().datetime({ offset: true }),
  }),
});

export type ActivityCompleted = z.infer<typeof ActivityCompletedSchema>;

// -----------------------------------------------------------------------------
// Skill Events
// -----------------------------------------------------------------------------

/**
 * Skill mastery updated event - emitted when learner's skill level changes.
 */
export const SkillMasteryUpdatedSchema = BaseEventSchema.extend({
  eventType: z.literal('learning.skill.mastery_updated'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    learnerId: z.string().uuid(),
    skillId: z.string().uuid(),
    skillName: z.string(),
    /** Previous mastery level (0-1) */
    previousLevel: z.number().min(0).max(1),
    /** New mastery level (0-1) */
    newLevel: z.number().min(0).max(1),
    /** Change amount (can be negative for decay) */
    delta: z.number(),
    /** Reason for change */
    reason: z.enum([
      'activity_completion',
      'assessment_result',
      'time_decay',
      'teacher_override',
      'baseline_update',
    ]),
    /** Activity that triggered the change */
    triggerActivityId: z.string().uuid().optional(),
    /** Evidence count for this skill */
    evidenceCount: z.number().int().min(0),
  }),
});

export type SkillMasteryUpdated = z.infer<typeof SkillMasteryUpdatedSchema>;

// -----------------------------------------------------------------------------
// Engagement Events
// -----------------------------------------------------------------------------

/**
 * Engagement metric event - periodic engagement snapshots.
 */
export const EngagementMetricSchema = BaseEventSchema.extend({
  eventType: z.literal('learning.engagement.metric'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    /** Time window for this metric (ms) */
    windowMs: z.number().int().min(0),
    /** Engagement score (0-100) */
    engagementScore: z.number().min(0).max(100),
    /** Components of engagement */
    components: z.object({
      /** Interaction rate (taps/clicks per minute) */
      interactionRate: z.number().min(0),
      /** Time on task ratio */
      onTaskRatio: z.number().min(0).max(1),
      /** Response latency factor */
      responsiveness: z.number().min(0).max(1),
      /** Voluntary continuation factor */
      persistence: z.number().min(0).max(1),
    }),
    sampledAt: z.string().datetime({ offset: true }),
  }),
});

export type EngagementMetric = z.infer<typeof EngagementMetricSchema>;

// -----------------------------------------------------------------------------
// Union Types
// -----------------------------------------------------------------------------

export const LearningEventSchema = z.discriminatedUnion('eventType', [
  LearningSessionStartedSchema,
  LearningSessionEndedSchema,
  ActivityStartedSchema,
  ActivityCompletedSchema,
  SkillMasteryUpdatedSchema,
  EngagementMetricSchema,
]);

export type LearningEvent = z.infer<typeof LearningEventSchema>;

// -----------------------------------------------------------------------------
// Event Type Mapping
// -----------------------------------------------------------------------------

export const LEARNING_EVENT_TYPES = {
  SESSION_STARTED: 'learning.session.started',
  SESSION_ENDED: 'learning.session.ended',
  ACTIVITY_STARTED: 'learning.activity.started',
  ACTIVITY_COMPLETED: 'learning.activity.completed',
  SKILL_MASTERY_UPDATED: 'learning.skill.mastery_updated',
  ENGAGEMENT_METRIC: 'learning.engagement.metric',
} as const;
