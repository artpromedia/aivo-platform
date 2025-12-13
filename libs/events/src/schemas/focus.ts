// =============================================================================
// @aivo/events - Focus Event Schemas
// =============================================================================
//
// Events for focus/attention telemetry from learner devices.
// High-volume events with strict size constraints.

import { z } from 'zod';

import { BaseEventSchema, GradeBandSchema } from './base.js';

// -----------------------------------------------------------------------------
// Self-Reported Mood
// -----------------------------------------------------------------------------

export const SelfReportedMoodSchema = z.enum(['great', 'good', 'okay', 'frustrated', 'tired']);

export type SelfReportedMood = z.infer<typeof SelfReportedMoodSchema>;

// -----------------------------------------------------------------------------
// Focus Loss Reason
// -----------------------------------------------------------------------------

export const FocusLossReasonSchema = z.enum([
  'extended_idle',
  'rapid_switching',
  'self_reported_frustrated',
  'self_reported_tired',
  'app_background',
  'distraction_detected',
  'difficulty_spike',
  'engagement_drop',
]);

export type FocusLossReason = z.infer<typeof FocusLossReasonSchema>;

// -----------------------------------------------------------------------------
// Focus Ping Event
// -----------------------------------------------------------------------------

/**
 * Focus ping event - high-frequency telemetry from client devices.
 * Kept minimal for bandwidth efficiency.
 */
export const FocusPingSchema = BaseEventSchema.extend({
  eventType: z.literal('focus.ping'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    activityId: z.string().uuid().optional(),
    /** Milliseconds idle since last interaction */
    idleMs: z.number().int().min(0),
    /** Whether app is in background */
    appInBackground: z.boolean(),
    /** Self-reported mood (optional) */
    selfReportedMood: SelfReportedMoodSchema.optional(),
    /** Rapid exit indicator (user trying to leave) */
    rapidExit: z.boolean().optional(),
    /** Ping sequence number for ordering */
    sequence: z.number().int().min(0),
  }),
});

export type FocusPing = z.infer<typeof FocusPingSchema>;

// -----------------------------------------------------------------------------
// Focus Sample Event
// -----------------------------------------------------------------------------

/**
 * Focus sample event - aggregated focus data over a time window.
 * Server-side aggregation of focus pings.
 */
export const FocusSampleSchema = BaseEventSchema.extend({
  eventType: z.literal('focus.sample'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    /** Sample window duration in ms */
    windowMs: z.number().int().min(0),
    /** Number of pings in this window */
    pingCount: z.number().int().min(0),
    /** Average idle time in ms */
    avgIdleMs: z.number().min(0),
    /** Max idle time in ms */
    maxIdleMs: z.number().min(0),
    /** Time spent with app in background (ms) */
    backgroundMs: z.number().int().min(0),
    /** Computed focus score (0-100) */
    focusScore: z.number().min(0).max(100),
    /** Focus trend (-1 to 1, negative = declining) */
    trend: z.number().min(-1).max(1),
    /** Grade band for cohort comparison */
    gradeBand: GradeBandSchema.optional(),
    /** Sample period start */
    windowStart: z.string().datetime({ offset: true }),
    /** Sample period end */
    windowEnd: z.string().datetime({ offset: true }),
  }),
});

export type FocusSample = z.infer<typeof FocusSampleSchema>;

// -----------------------------------------------------------------------------
// Focus Loss Event
// -----------------------------------------------------------------------------

/**
 * Focus loss event - triggered when focus drops below threshold.
 */
export const FocusLossSchema = BaseEventSchema.extend({
  eventType: z.literal('focus.loss'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    activityId: z.string().uuid().optional(),
    /** Primary reason for focus loss */
    reason: FocusLossReasonSchema,
    /** Focus score when loss detected (0-100) */
    focusScore: z.number().min(0).max(100),
    /** How long focus has been low (ms) */
    lowFocusDurationMs: z.number().int().min(0),
    /** Intervention recommended */
    interventionSuggested: z
      .enum(['break_prompt', 'activity_switch', 'difficulty_adjust', 'encouragement', 'none'])
      .optional(),
    detectedAt: z.string().datetime({ offset: true }),
  }),
});

export type FocusLoss = z.infer<typeof FocusLossSchema>;

// -----------------------------------------------------------------------------
// Focus Session Summary Event
// -----------------------------------------------------------------------------

/**
 * Focus session summary - emitted at session end with focus analytics.
 */
export const FocusSessionSummarySchema = BaseEventSchema.extend({
  eventType: z.literal('focus.session.summary'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    /** Session duration (ms) */
    sessionDurationMs: z.number().int().min(0),
    /** Total pings received */
    totalPings: z.number().int().min(0),
    /** Average focus score (0-100) */
    avgFocusScore: z.number().min(0).max(100),
    /** Min focus score (0-100) */
    minFocusScore: z.number().min(0).max(100),
    /** Max focus score (0-100) */
    maxFocusScore: z.number().min(0).max(100),
    /** Standard deviation */
    focusScoreStdDev: z.number().min(0),
    /** Number of focus loss events */
    focusLossCount: z.number().int().min(0),
    /** Total time in low-focus state (ms) */
    lowFocusMs: z.number().int().min(0),
    /** Time with app in background (ms) */
    backgroundMs: z.number().int().min(0),
    /** Focus loss reasons histogram */
    lossReasons: z.record(FocusLossReasonSchema, z.number().int().min(0)).optional(),
    /** Grade band for cohort comparison */
    gradeBand: GradeBandSchema.optional(),
  }),
});

export type FocusSessionSummary = z.infer<typeof FocusSessionSummarySchema>;

// -----------------------------------------------------------------------------
// Union Types
// -----------------------------------------------------------------------------

export const FocusEventSchema = z.discriminatedUnion('eventType', [
  FocusPingSchema,
  FocusSampleSchema,
  FocusLossSchema,
  FocusSessionSummarySchema,
]);

export type FocusEvent = z.infer<typeof FocusEventSchema>;

// -----------------------------------------------------------------------------
// Event Type Mapping
// -----------------------------------------------------------------------------

export const FOCUS_EVENT_TYPES = {
  PING: 'focus.ping',
  SAMPLE: 'focus.sample',
  LOSS: 'focus.loss',
  SESSION_SUMMARY: 'focus.session.summary',
} as const;
