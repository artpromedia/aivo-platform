// =============================================================================
// @aivo/events - Predictability Event Schemas
// =============================================================================
//
// Events for session predictability: session plans, progress tracking,
// unexpected changes, anxiety reporting, and routine management.
// Supports neurodiverse learners who benefit from structured, predictable sessions.

import { z } from 'zod';

import { BaseEventSchema } from './base.js';

// -----------------------------------------------------------------------------
// Predictability Event Types
// -----------------------------------------------------------------------------

export const PREDICTABILITY_EVENT_TYPES = [
  'predictability.session_plan.created',
  'predictability.progress.updated',
  'predictability.change.requested',
  'predictability.change.applied',
  'predictability.anxiety.reported',
  'predictability.routine.started',
  'predictability.routine.step_completed',
  'predictability.routine.completed',
  'predictability.preferences.updated',
] as const;

// -----------------------------------------------------------------------------
// Shared Schemas
// -----------------------------------------------------------------------------

const ChangeTypeSchema = z.enum(['add', 'remove', 'reorder', 'skip', 'extend']);
const SeveritySchema = z.enum(['low', 'medium', 'high']);
const RoutineOutcomeSchema = z.enum(['completed', 'partial', 'skipped', 'interrupted']);
const AnxietyLevelSchema = z.enum(['mild', 'moderate', 'severe']);

const ChangeExplanationSchema = z.object({
  severity: SeveritySchema,
  title: z.string(),
  message: z.string(),
  iconType: z.string().optional(),
});

// -----------------------------------------------------------------------------
// Session Plan Created Event
// -----------------------------------------------------------------------------

/**
 * Emitted when a new session plan is created for a learner.
 */
export const SessionPlanCreatedSchema = BaseEventSchema.extend({
  eventType: z.literal('predictability.session_plan.created'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    planId: z.string().uuid(),
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    /** Structure type used for the session */
    structureType: z.enum(['default', 'minimal', 'high_support', 'custom']),
    /** Number of items in the session outline */
    itemCount: z.number().int().min(0),
    /** Estimated total session duration in minutes */
    estimatedMinutes: z.number().int().min(0),
    /** Whether session includes welcome segment */
    hasWelcome: z.boolean(),
    /** Whether session includes check-in segment */
    hasCheckin: z.boolean(),
    /** Whether session includes goodbye segment */
    hasGoodbye: z.boolean(),
    /** Number of activities in the session */
    activityCount: z.number().int().min(0),
    /** Number of breaks in the session */
    breakCount: z.number().int().min(0),
    /** When the plan was created */
    createdAt: z.string().datetime({ offset: true }),
  }),
});

export type SessionPlanCreated = z.infer<typeof SessionPlanCreatedSchema>;

// -----------------------------------------------------------------------------
// Session Progress Updated Event
// -----------------------------------------------------------------------------

/**
 * Emitted when session progress is updated.
 */
export const SessionProgressUpdatedSchema = BaseEventSchema.extend({
  eventType: z.literal('predictability.progress.updated'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    planId: z.string().uuid(),
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    /** ID of the current item being worked on */
    currentItemId: z.string(),
    /** Current phase of the item */
    currentPhase: z.string(),
    /** Number of items completed */
    completedItems: z.number().int().min(0),
    /** Total items in the session */
    totalItems: z.number().int().min(0),
    /** Progress percentage (0-100) */
    progressPercent: z.number().min(0).max(100),
    /** Estimated remaining minutes */
    remainingMinutes: z.number().min(0),
    /** When the progress was updated */
    timestamp: z.string().datetime({ offset: true }),
  }),
});

export type SessionProgressUpdated = z.infer<typeof SessionProgressUpdatedSchema>;

// -----------------------------------------------------------------------------
// Unexpected Change Requested Event
// -----------------------------------------------------------------------------

/**
 * Emitted when an unexpected change to the session plan is requested.
 */
export const UnexpectedChangeRequestedSchema = BaseEventSchema.extend({
  eventType: z.literal('predictability.change.requested'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    planId: z.string().uuid(),
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    /** Type of change requested */
    changeType: ChangeTypeSchema,
    /** Reason for the change */
    reason: z.string(),
    /** Severity of the change */
    severity: SeveritySchema,
    /** Explanation provided to learner */
    explanation: ChangeExplanationSchema,
    /** Whether the change requires learner/guardian approval */
    requiresApproval: z.boolean(),
    /** Approval status if requires approval */
    approvalStatus: z.enum(['pending', 'approved', 'declined']).optional(),
    /** When the change was requested */
    timestamp: z.string().datetime({ offset: true }),
  }),
});

export type UnexpectedChangeRequested = z.infer<typeof UnexpectedChangeRequestedSchema>;

// -----------------------------------------------------------------------------
// Change Applied Event
// -----------------------------------------------------------------------------

/**
 * Emitted when a change is applied to the session plan.
 */
export const ChangeAppliedSchema = BaseEventSchema.extend({
  eventType: z.literal('predictability.change.applied'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    planId: z.string().uuid(),
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    /** Unique identifier for the change */
    changeId: z.string().uuid(),
    /** Type of change applied */
    changeType: ChangeTypeSchema,
    /** Whether the change was explicitly approved */
    wasApproved: z.boolean(),
    /** When the change was applied */
    appliedAt: z.string().datetime({ offset: true }),
  }),
});

export type ChangeApplied = z.infer<typeof ChangeAppliedSchema>;

// -----------------------------------------------------------------------------
// Anxiety Reported Event
// -----------------------------------------------------------------------------

/**
 * Emitted when anxiety is reported during a session.
 */
export const AnxietyReportedSchema = BaseEventSchema.extend({
  eventType: z.literal('predictability.anxiety.reported'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    /** Severity level of reported anxiety */
    level: AnxietyLevelSchema,
    /** Category of trigger if identified */
    triggerCategory: z.string().optional(),
    /** Specific trigger ID if identified */
    triggerId: z.string().optional(),
    /** Support actions taken in response */
    supportActions: z.array(z.string()),
    /** Coping strategy used if any */
    copingStrategyUsed: z.string().optional(),
    /** Time in seconds until learner calmed down (if tracked) */
    calmedDownAfterSeconds: z.number().int().min(0).optional(),
    /** When the anxiety was reported */
    reportedAt: z.string().datetime({ offset: true }),
  }),
});

export type AnxietyReported = z.infer<typeof AnxietyReportedSchema>;

// -----------------------------------------------------------------------------
// Routine Started Event
// -----------------------------------------------------------------------------

/**
 * Emitted when a routine is started during a session.
 */
export const RoutineStartedSchema = BaseEventSchema.extend({
  eventType: z.literal('predictability.routine.started'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    /** Unique identifier for the routine instance */
    routineId: z.string().uuid(),
    /** Type of routine (e.g., 'welcome', 'transition', 'calming') */
    routineType: z.string(),
    /** Total steps in the routine */
    totalSteps: z.number().int().min(1),
    /** Estimated duration in seconds */
    estimatedSeconds: z.number().int().min(0),
    /** Whether this is a custom learner routine */
    isCustom: z.boolean(),
    /** When the routine started */
    startedAt: z.string().datetime({ offset: true }),
  }),
});

export type RoutineStarted = z.infer<typeof RoutineStartedSchema>;

// -----------------------------------------------------------------------------
// Routine Step Completed Event
// -----------------------------------------------------------------------------

/**
 * Emitted when a routine step is completed.
 */
export const RoutineStepCompletedSchema = BaseEventSchema.extend({
  eventType: z.literal('predictability.routine.step_completed'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    routineId: z.string().uuid(),
    routineType: z.string(),
    /** Index of the step (0-based) */
    stepIndex: z.number().int().min(0),
    /** Type of step (e.g., 'breathing', 'visual_cue', 'countdown') */
    stepType: z.string(),
    /** Whether the step was skipped */
    wasSkipped: z.boolean(),
    /** Actual duration of the step in seconds */
    durationSeconds: z.number().int().min(0),
    /** When the step completed */
    timestamp: z.string().datetime({ offset: true }),
  }),
});

export type RoutineStepCompleted = z.infer<typeof RoutineStepCompletedSchema>;

// -----------------------------------------------------------------------------
// Routine Completed Event
// -----------------------------------------------------------------------------

/**
 * Emitted when a routine is completed.
 */
export const RoutineCompletedSchema = BaseEventSchema.extend({
  eventType: z.literal('predictability.routine.completed'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    routineId: z.string().uuid(),
    routineType: z.string(),
    /** Outcome of the routine */
    outcome: RoutineOutcomeSchema,
    /** Number of steps completed */
    stepsCompleted: z.number().int().min(0),
    /** Total steps in the routine */
    stepsTotal: z.number().int().min(0),
    /** Actual duration in seconds */
    actualDurationSeconds: z.number().int().min(0),
    /** Planned duration in seconds */
    plannedDurationSeconds: z.number().int().min(0),
    /** When the routine completed */
    completedAt: z.string().datetime({ offset: true }),
  }),
});

export type RoutineCompleted = z.infer<typeof RoutineCompletedSchema>;

// -----------------------------------------------------------------------------
// Preferences Updated Event
// -----------------------------------------------------------------------------

/**
 * Emitted when predictability preferences are updated.
 */
export const PreferencesUpdatedSchema = BaseEventSchema.extend({
  eventType: z.literal('predictability.preferences.updated'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    learnerId: z.string().uuid(),
    /** Whether predictability features are enabled */
    enabled: z.boolean(),
    /** Minutes before session end to warn */
    warnMinutesBefore: z.number().int().min(0),
    /** Whether to show remaining time */
    showRemainingTime: z.boolean(),
    /** Whether to use visual schedule */
    useVisualSchedule: z.boolean(),
    /** Preferred routine types */
    preferredRoutines: z.array(z.string()),
    /** List of changed fields */
    changes: z.array(z.string()),
    /** When the preferences were updated */
    updatedAt: z.string().datetime({ offset: true }),
  }),
});

export type PreferencesUpdated = z.infer<typeof PreferencesUpdatedSchema>;

// -----------------------------------------------------------------------------
// Union Type for All Predictability Events
// -----------------------------------------------------------------------------

export const PredictabilityEventSchema = z.discriminatedUnion('eventType', [
  SessionPlanCreatedSchema,
  SessionProgressUpdatedSchema,
  UnexpectedChangeRequestedSchema,
  ChangeAppliedSchema,
  AnxietyReportedSchema,
  RoutineStartedSchema,
  RoutineStepCompletedSchema,
  RoutineCompletedSchema,
  PreferencesUpdatedSchema,
]);

export type PredictabilityEvent = z.infer<typeof PredictabilityEventSchema>;
