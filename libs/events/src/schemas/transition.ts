// =============================================================================
// @aivo/events - Transition Event Schemas
// =============================================================================
//
// Events for activity transitions: transition lifecycle, warnings,
// acknowledgments, routine steps, and completion analytics.
// Supports neurodiverse learners with structured transition support.

import { z } from 'zod';

import { BaseEventSchema } from './base.js';

// -----------------------------------------------------------------------------
// Transition Event Types
// -----------------------------------------------------------------------------

export const TRANSITION_EVENT_TYPES = [
  'transition.started',
  'transition.warning',
  'transition.acknowledged',
  'transition.routine.step',
  'transition.completed',
] as const;

// -----------------------------------------------------------------------------
// Shared Schemas
// -----------------------------------------------------------------------------

const ActivityInfoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  type: z.string(),
});

const TransitionPlanInfoSchema = z.object({
  totalDuration: z.number().int().min(0),
  warningIntervals: z.array(z.number().int()),
  visualStyle: z.string(),
  colorScheme: z.string(),
  enableAudio: z.boolean(),
  enableHaptic: z.boolean(),
  hasRoutine: z.boolean(),
  hasFirstThenBoard: z.boolean(),
});

// -----------------------------------------------------------------------------
// Transition Started Event
// -----------------------------------------------------------------------------

/**
 * Emitted when a transition between activities is scheduled to begin.
 */
export const TransitionStartedSchema = BaseEventSchema.extend({
  eventType: z.literal('transition.started'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    transitionId: z.string().uuid(),
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    /** Activity being transitioned from (null for session start) */
    fromActivity: ActivityInfoSchema.optional(),
    /** Activity being transitioned to */
    toActivity: ActivityInfoSchema,
    /** Transition plan configuration */
    plan: TransitionPlanInfoSchema,
    /** When the transition was scheduled */
    scheduledAt: z.string().datetime({ offset: true }),
  }),
});

export type TransitionStarted = z.infer<typeof TransitionStartedSchema>;

// -----------------------------------------------------------------------------
// Transition Warning Event
// -----------------------------------------------------------------------------

/**
 * Emitted when a warning is delivered to the learner before transition.
 */
export const TransitionWarningSchema = BaseEventSchema.extend({
  eventType: z.literal('transition.warning'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    transitionId: z.string().uuid(),
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    /** Which warning number this is (1st, 2nd, etc.) */
    warningNumber: z.number().int().min(1),
    /** Seconds remaining until transition */
    secondsRemaining: z.number().int().min(0),
    /** Whether a visual timer is being shown */
    isTimerVisible: z.boolean(),
    /** Visual warning style */
    visualStyle: z.enum(['subtle', 'moderate', 'prominent']),
    /** Audio warning type if applicable */
    audioType: z.enum(['audio', 'spoken']).nullable(),
    /** Haptic pattern if applicable */
    hapticPattern: z.enum(['gentle', 'moderate', 'strong']).nullable(),
    /** When the warning was delivered */
    timestamp: z.string().datetime({ offset: true }),
  }),
});

export type TransitionWarning = z.infer<typeof TransitionWarningSchema>;

// -----------------------------------------------------------------------------
// Transition Acknowledged Event
// -----------------------------------------------------------------------------

/**
 * Emitted when a learner acknowledges an upcoming transition.
 */
export const TransitionAcknowledgedSchema = BaseEventSchema.extend({
  eventType: z.literal('transition.acknowledged'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    transitionId: z.string().uuid(),
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    /** When the learner acknowledged */
    acknowledgedAt: z.string().datetime({ offset: true }),
    /** Seconds before transition start when acknowledged */
    secondsBeforeStart: z.number().int().min(0),
    /** Learner's readiness state */
    readyState: z.enum(['ready', 'needs_more_time', 'skipped']),
  }),
});

export type TransitionAcknowledged = z.infer<typeof TransitionAcknowledgedSchema>;

// -----------------------------------------------------------------------------
// Transition Routine Step Event
// -----------------------------------------------------------------------------

/**
 * Emitted when a routine step is completed or skipped during transition.
 */
export const TransitionRoutineStepSchema = BaseEventSchema.extend({
  eventType: z.literal('transition.routine.step'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    transitionId: z.string().uuid(),
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    /** Index of the step in the routine */
    stepIndex: z.number().int().min(0),
    /** Type of routine step (e.g., 'breathing', 'countdown', 'visual_cue') */
    stepType: z.string(),
    /** Expected duration in seconds */
    stepDuration: z.number().int().min(0),
    /** Whether the step was completed */
    completed: z.boolean(),
    /** Whether the step was skipped */
    skipped: z.boolean(),
    /** When the step event occurred */
    timestamp: z.string().datetime({ offset: true }),
  }),
});

export type TransitionRoutineStep = z.infer<typeof TransitionRoutineStepSchema>;

// -----------------------------------------------------------------------------
// Transition Completed Event
// -----------------------------------------------------------------------------

/**
 * Emitted when a transition is completed and learner moved to next activity.
 */
export const TransitionCompletedSchema = BaseEventSchema.extend({
  eventType: z.literal('transition.completed'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    transitionId: z.string().uuid(),
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    /** ID of the activity transitioned from */
    fromActivityId: z.string().uuid(),
    /** ID of the activity transitioned to */
    toActivityId: z.string().uuid(),
    /** Transition outcome classification */
    outcome: z.enum(['smooth', 'successful', 'struggled', 'refused', 'timed_out']),
    /** Originally planned duration in seconds */
    plannedDuration: z.number().int().min(0),
    /** Actual duration in seconds */
    actualDuration: z.number().int().min(0),
    /** Number of warnings delivered */
    warningsDelivered: z.number().int().min(0),
    /** Number of warnings acknowledged by learner */
    warningsAcknowledged: z.number().int().min(0),
    /** Number of routine steps completed */
    routineStepsCompleted: z.number().int().min(0),
    /** Total routine steps in the plan */
    routineStepsTotal: z.number().int().min(0),
    /** Number of learner interactions during transition */
    learnerInteractions: z.number().int().min(0),
    /** When the transition completed */
    completedAt: z.string().datetime({ offset: true }),
  }),
});

export type TransitionCompleted = z.infer<typeof TransitionCompletedSchema>;

// -----------------------------------------------------------------------------
// Union Type for All Transition Events
// -----------------------------------------------------------------------------

export const TransitionEventSchema = z.discriminatedUnion('eventType', [
  TransitionStartedSchema,
  TransitionWarningSchema,
  TransitionAcknowledgedSchema,
  TransitionRoutineStepSchema,
  TransitionCompletedSchema,
]);

export type TransitionEvent = z.infer<typeof TransitionEventSchema>;
