/**
 * Focus Event Schemas
 *
 * Events related to focus monitoring, attention signals, and interventions.
 * All events include tenantId for multi-tenant isolation.
 *
 * @module @aivo/ts-types/events/focus
 */

import { z } from 'zod';
import { createEventSchema } from './base.js';

// ══════════════════════════════════════════════════════════════════════════════
// SHARED ENUMS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Signals that indicate potential focus loss
 */
export const FocusSignalSchema = z.enum([
  /** 3+ errors in 30 seconds */
  'RAPID_ERRORS',
  /** No activity for 60+ seconds */
  'IDLE_DETECTED',
  /** Unfocused clicking pattern */
  'ERRATIC_CLICKING',
  /** Sudden change in interaction pattern */
  'PATTERN_SWITCH',
  /** Repeated wrong attempts on same item */
  'FRUSTRATION_CUES',
]);

export type FocusSignal = z.infer<typeof FocusSignalSchema>;

/**
 * Types of focus interventions available
 */
export const InterventionTypeSchema = z.enum([
  /** Suggest taking a short break */
  'BREAK_SUGGESTION',
  /** Offer a calming activity (breathing, etc.) */
  'CALMING_ACTIVITY',
  /** Reduce difficulty level temporarily */
  'DIFFICULTY_REDUCTION',
  /** Provide encouragement message */
  'ENCOURAGEMENT',
  /** Switch to a different activity type */
  'ACTIVITY_SWITCH',
]);

export type InterventionType = z.infer<typeof InterventionTypeSchema>;

/**
 * Outcomes of a focus intervention
 */
export const InterventionOutcomeSchema = z.enum([
  /** Learner completed the intervention */
  'COMPLETED',
  /** Learner skipped the intervention */
  'SKIPPED',
  /** Intervention timed out without response */
  'TIMEOUT',
]);

export type InterventionOutcome = z.infer<typeof InterventionOutcomeSchema>;

// ══════════════════════════════════════════════════════════════════════════════
// FOCUS LOSS EVENTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Focus Loss Detected Event
 *
 * Emitted when the system detects potential loss of focus based on
 * interaction patterns, timing, or error rates.
 */
export const FocusLossDetectedEventSchema = createEventSchema(
  'focus.loss.detected',
  z.object({
    /** Learner whose focus was lost */
    learnerId: z.string().cuid(),

    /** Session during which focus loss occurred */
    sessionId: z.string().cuid(),

    /** Type of signal that triggered detection */
    signal: FocusSignalSchema,

    /** Confidence level of the detection (0.0 to 1.0) */
    confidence: z.number().min(0).max(1),

    /** Activity being worked on when focus was lost (if applicable) */
    activityId: z.string().cuid().optional(),

    /** Seconds since last meaningful interaction */
    secondsSinceLastInteraction: z.number().int().min(0).optional(),

    /** Number of recent errors contributing to detection */
    recentErrorCount: z.number().int().min(0).optional(),
  })
);

export type FocusLossDetectedEvent = z.infer<typeof FocusLossDetectedEventSchema>;

// ══════════════════════════════════════════════════════════════════════════════
// INTERVENTION EVENTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Focus Intervention Triggered Event
 *
 * Emitted when the system triggers an intervention in response to focus loss.
 */
export const FocusInterventionTriggeredEventSchema = createEventSchema(
  'focus.intervention.triggered',
  z.object({
    /** Learner receiving the intervention */
    learnerId: z.string().cuid(),

    /** Session during which intervention was triggered */
    sessionId: z.string().cuid(),

    /** Type of intervention being triggered */
    interventionType: InterventionTypeSchema,

    /** Signal that caused this intervention */
    triggerSignal: FocusSignalSchema,

    /** Event ID of the focus loss event that triggered this */
    triggerEventId: z.string().uuid(),
  })
);

export type FocusInterventionTriggeredEvent = z.infer<
  typeof FocusInterventionTriggeredEventSchema
>;

/**
 * Focus Intervention Completed Event
 *
 * Emitted when a focus intervention concludes (completed, skipped, or timed out).
 */
export const FocusInterventionCompletedEventSchema = createEventSchema(
  'focus.intervention.completed',
  z.object({
    /** Learner who received the intervention */
    learnerId: z.string().cuid(),

    /** Session during which intervention occurred */
    sessionId: z.string().cuid(),

    /** Event ID of the intervention that was triggered */
    interventionEventId: z.string().uuid(),

    /** How the intervention concluded */
    outcome: InterventionOutcomeSchema,

    /** How long the intervention took (if completed) */
    durationSeconds: z.number().int().positive().optional(),

    /** Whether learner resumed learning activity after intervention */
    resumedActivity: z.boolean(),
  })
);

export type FocusInterventionCompletedEvent = z.infer<
  typeof FocusInterventionCompletedEventSchema
>;

// ══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Union of all focus event schemas for type guards
 */
export const FocusEventSchemas = [
  FocusLossDetectedEventSchema,
  FocusInterventionTriggeredEventSchema,
  FocusInterventionCompletedEventSchema,
] as const;

/**
 * Focus event type literals
 */
export const FOCUS_EVENT_TYPES = [
  'focus.loss.detected',
  'focus.intervention.triggered',
  'focus.intervention.completed',
] as const;

export type FocusEventType = (typeof FOCUS_EVENT_TYPES)[number];
