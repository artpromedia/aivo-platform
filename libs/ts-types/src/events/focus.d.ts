/**
 * Focus Event Schemas
 *
 * Events related to focus monitoring, attention signals, and interventions.
 * All events include tenantId for multi-tenant isolation.
 *
 * @module @aivo/ts-types/events/focus
 */
import { z } from 'zod';
/**
 * Signals that indicate potential focus loss
 */
export declare const FocusSignalSchema: z.ZodEnum<["RAPID_ERRORS", "IDLE_DETECTED", "ERRATIC_CLICKING", "PATTERN_SWITCH", "FRUSTRATION_CUES"]>;
export type FocusSignal = z.infer<typeof FocusSignalSchema>;
/**
 * Types of focus interventions available
 */
export declare const InterventionTypeSchema: z.ZodEnum<["BREAK_SUGGESTION", "CALMING_ACTIVITY", "DIFFICULTY_REDUCTION", "ENCOURAGEMENT", "ACTIVITY_SWITCH"]>;
export type InterventionType = z.infer<typeof InterventionTypeSchema>;
/**
 * Outcomes of a focus intervention
 */
export declare const InterventionOutcomeSchema: z.ZodEnum<["COMPLETED", "SKIPPED", "TIMEOUT"]>;
export type InterventionOutcome = z.infer<typeof InterventionOutcomeSchema>;
/**
 * Focus Loss Detected Event
 *
 * Emitted when the system detects potential loss of focus based on
 * interaction patterns, timing, or error rates.
 */
export declare const FocusLossDetectedEventSchema: z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    eventVersion: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
    }, {
        version?: string;
        service?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
} & {
    eventType: z.ZodLiteral<string>;
    payload: z.ZodObject<{
        /** Learner whose focus was lost */
        learnerId: z.ZodString;
        /** Session during which focus loss occurred */
        sessionId: z.ZodString;
        /** Type of signal that triggered detection */
        signal: z.ZodEnum<["RAPID_ERRORS", "IDLE_DETECTED", "ERRATIC_CLICKING", "PATTERN_SWITCH", "FRUSTRATION_CUES"]>;
        /** Confidence level of the detection (0.0 to 1.0) */
        confidence: z.ZodNumber;
        /** Activity being worked on when focus was lost (if applicable) */
        activityId: z.ZodOptional<z.ZodString>;
        /** Seconds since last meaningful interaction */
        secondsSinceLastInteraction: z.ZodOptional<z.ZodNumber>;
        /** Number of recent errors contributing to detection */
        recentErrorCount: z.ZodOptional<z.ZodNumber>;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        confidence?: number;
        signal?: "IDLE_DETECTED" | "RAPID_ERRORS" | "ERRATIC_CLICKING" | "PATTERN_SWITCH" | "FRUSTRATION_CUES";
        activityId?: string;
        secondsSinceLastInteraction?: number;
        recentErrorCount?: number;
    }, {
        learnerId?: string;
        sessionId?: string;
        confidence?: number;
        signal?: "IDLE_DETECTED" | "RAPID_ERRORS" | "ERRATIC_CLICKING" | "PATTERN_SWITCH" | "FRUSTRATION_CUES";
        activityId?: string;
        secondsSinceLastInteraction?: number;
        recentErrorCount?: number;
    }>;
}, "strip", z.ZodTypeAny, {
    tenantId?: string;
    source?: {
        version?: string;
        service?: string;
    };
    eventId?: string;
    eventType?: string;
    eventVersion?: string;
    timestamp?: string;
    correlationId?: string;
    causationId?: string;
    payload?: {
        learnerId?: string;
        sessionId?: string;
        confidence?: number;
        signal?: "IDLE_DETECTED" | "RAPID_ERRORS" | "ERRATIC_CLICKING" | "PATTERN_SWITCH" | "FRUSTRATION_CUES";
        activityId?: string;
        secondsSinceLastInteraction?: number;
        recentErrorCount?: number;
    };
}, {
    tenantId?: string;
    source?: {
        version?: string;
        service?: string;
    };
    eventId?: string;
    eventType?: string;
    eventVersion?: string;
    timestamp?: string;
    correlationId?: string;
    causationId?: string;
    payload?: {
        learnerId?: string;
        sessionId?: string;
        confidence?: number;
        signal?: "IDLE_DETECTED" | "RAPID_ERRORS" | "ERRATIC_CLICKING" | "PATTERN_SWITCH" | "FRUSTRATION_CUES";
        activityId?: string;
        secondsSinceLastInteraction?: number;
        recentErrorCount?: number;
    };
}>;
export type FocusLossDetectedEvent = z.infer<typeof FocusLossDetectedEventSchema>;
/**
 * Focus Intervention Triggered Event
 *
 * Emitted when the system triggers an intervention in response to focus loss.
 */
export declare const FocusInterventionTriggeredEventSchema: z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    eventVersion: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
    }, {
        version?: string;
        service?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
} & {
    eventType: z.ZodLiteral<string>;
    payload: z.ZodObject<{
        /** Learner receiving the intervention */
        learnerId: z.ZodString;
        /** Session during which intervention was triggered */
        sessionId: z.ZodString;
        /** Type of intervention being triggered */
        interventionType: z.ZodEnum<["BREAK_SUGGESTION", "CALMING_ACTIVITY", "DIFFICULTY_REDUCTION", "ENCOURAGEMENT", "ACTIVITY_SWITCH"]>;
        /** Signal that caused this intervention */
        triggerSignal: z.ZodEnum<["RAPID_ERRORS", "IDLE_DETECTED", "ERRATIC_CLICKING", "PATTERN_SWITCH", "FRUSTRATION_CUES"]>;
        /** Event ID of the focus loss event that triggered this */
        triggerEventId: z.ZodString;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        interventionType?: "BREAK_SUGGESTION" | "CALMING_ACTIVITY" | "DIFFICULTY_REDUCTION" | "ENCOURAGEMENT" | "ACTIVITY_SWITCH";
        triggerSignal?: "IDLE_DETECTED" | "RAPID_ERRORS" | "ERRATIC_CLICKING" | "PATTERN_SWITCH" | "FRUSTRATION_CUES";
        triggerEventId?: string;
    }, {
        learnerId?: string;
        sessionId?: string;
        interventionType?: "BREAK_SUGGESTION" | "CALMING_ACTIVITY" | "DIFFICULTY_REDUCTION" | "ENCOURAGEMENT" | "ACTIVITY_SWITCH";
        triggerSignal?: "IDLE_DETECTED" | "RAPID_ERRORS" | "ERRATIC_CLICKING" | "PATTERN_SWITCH" | "FRUSTRATION_CUES";
        triggerEventId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    tenantId?: string;
    source?: {
        version?: string;
        service?: string;
    };
    eventId?: string;
    eventType?: string;
    eventVersion?: string;
    timestamp?: string;
    correlationId?: string;
    causationId?: string;
    payload?: {
        learnerId?: string;
        sessionId?: string;
        interventionType?: "BREAK_SUGGESTION" | "CALMING_ACTIVITY" | "DIFFICULTY_REDUCTION" | "ENCOURAGEMENT" | "ACTIVITY_SWITCH";
        triggerSignal?: "IDLE_DETECTED" | "RAPID_ERRORS" | "ERRATIC_CLICKING" | "PATTERN_SWITCH" | "FRUSTRATION_CUES";
        triggerEventId?: string;
    };
}, {
    tenantId?: string;
    source?: {
        version?: string;
        service?: string;
    };
    eventId?: string;
    eventType?: string;
    eventVersion?: string;
    timestamp?: string;
    correlationId?: string;
    causationId?: string;
    payload?: {
        learnerId?: string;
        sessionId?: string;
        interventionType?: "BREAK_SUGGESTION" | "CALMING_ACTIVITY" | "DIFFICULTY_REDUCTION" | "ENCOURAGEMENT" | "ACTIVITY_SWITCH";
        triggerSignal?: "IDLE_DETECTED" | "RAPID_ERRORS" | "ERRATIC_CLICKING" | "PATTERN_SWITCH" | "FRUSTRATION_CUES";
        triggerEventId?: string;
    };
}>;
export type FocusInterventionTriggeredEvent = z.infer<typeof FocusInterventionTriggeredEventSchema>;
/**
 * Focus Intervention Completed Event
 *
 * Emitted when a focus intervention concludes (completed, skipped, or timed out).
 */
export declare const FocusInterventionCompletedEventSchema: z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    eventVersion: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
    }, {
        version?: string;
        service?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
} & {
    eventType: z.ZodLiteral<string>;
    payload: z.ZodObject<{
        /** Learner who received the intervention */
        learnerId: z.ZodString;
        /** Session during which intervention occurred */
        sessionId: z.ZodString;
        /** Event ID of the intervention that was triggered */
        interventionEventId: z.ZodString;
        /** How the intervention concluded */
        outcome: z.ZodEnum<["COMPLETED", "SKIPPED", "TIMEOUT"]>;
        /** How long the intervention took (if completed) */
        durationSeconds: z.ZodOptional<z.ZodNumber>;
        /** Whether learner resumed learning activity after intervention */
        resumedActivity: z.ZodBoolean;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        interventionEventId?: string;
        outcome?: "COMPLETED" | "SKIPPED" | "TIMEOUT";
        durationSeconds?: number;
        resumedActivity?: boolean;
    }, {
        learnerId?: string;
        sessionId?: string;
        interventionEventId?: string;
        outcome?: "COMPLETED" | "SKIPPED" | "TIMEOUT";
        durationSeconds?: number;
        resumedActivity?: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    tenantId?: string;
    source?: {
        version?: string;
        service?: string;
    };
    eventId?: string;
    eventType?: string;
    eventVersion?: string;
    timestamp?: string;
    correlationId?: string;
    causationId?: string;
    payload?: {
        learnerId?: string;
        sessionId?: string;
        interventionEventId?: string;
        outcome?: "COMPLETED" | "SKIPPED" | "TIMEOUT";
        durationSeconds?: number;
        resumedActivity?: boolean;
    };
}, {
    tenantId?: string;
    source?: {
        version?: string;
        service?: string;
    };
    eventId?: string;
    eventType?: string;
    eventVersion?: string;
    timestamp?: string;
    correlationId?: string;
    causationId?: string;
    payload?: {
        learnerId?: string;
        sessionId?: string;
        interventionEventId?: string;
        outcome?: "COMPLETED" | "SKIPPED" | "TIMEOUT";
        durationSeconds?: number;
        resumedActivity?: boolean;
    };
}>;
export type FocusInterventionCompletedEvent = z.infer<typeof FocusInterventionCompletedEventSchema>;
/**
 * Union of all focus event schemas for type guards
 */
export declare const FocusEventSchemas: readonly [z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    eventVersion: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
    }, {
        version?: string;
        service?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
} & {
    eventType: z.ZodLiteral<string>;
    payload: z.ZodObject<{
        /** Learner whose focus was lost */
        learnerId: z.ZodString;
        /** Session during which focus loss occurred */
        sessionId: z.ZodString;
        /** Type of signal that triggered detection */
        signal: z.ZodEnum<["RAPID_ERRORS", "IDLE_DETECTED", "ERRATIC_CLICKING", "PATTERN_SWITCH", "FRUSTRATION_CUES"]>;
        /** Confidence level of the detection (0.0 to 1.0) */
        confidence: z.ZodNumber;
        /** Activity being worked on when focus was lost (if applicable) */
        activityId: z.ZodOptional<z.ZodString>;
        /** Seconds since last meaningful interaction */
        secondsSinceLastInteraction: z.ZodOptional<z.ZodNumber>;
        /** Number of recent errors contributing to detection */
        recentErrorCount: z.ZodOptional<z.ZodNumber>;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        confidence?: number;
        signal?: "IDLE_DETECTED" | "RAPID_ERRORS" | "ERRATIC_CLICKING" | "PATTERN_SWITCH" | "FRUSTRATION_CUES";
        activityId?: string;
        secondsSinceLastInteraction?: number;
        recentErrorCount?: number;
    }, {
        learnerId?: string;
        sessionId?: string;
        confidence?: number;
        signal?: "IDLE_DETECTED" | "RAPID_ERRORS" | "ERRATIC_CLICKING" | "PATTERN_SWITCH" | "FRUSTRATION_CUES";
        activityId?: string;
        secondsSinceLastInteraction?: number;
        recentErrorCount?: number;
    }>;
}, "strip", z.ZodTypeAny, {
    tenantId?: string;
    source?: {
        version?: string;
        service?: string;
    };
    eventId?: string;
    eventType?: string;
    eventVersion?: string;
    timestamp?: string;
    correlationId?: string;
    causationId?: string;
    payload?: {
        learnerId?: string;
        sessionId?: string;
        confidence?: number;
        signal?: "IDLE_DETECTED" | "RAPID_ERRORS" | "ERRATIC_CLICKING" | "PATTERN_SWITCH" | "FRUSTRATION_CUES";
        activityId?: string;
        secondsSinceLastInteraction?: number;
        recentErrorCount?: number;
    };
}, {
    tenantId?: string;
    source?: {
        version?: string;
        service?: string;
    };
    eventId?: string;
    eventType?: string;
    eventVersion?: string;
    timestamp?: string;
    correlationId?: string;
    causationId?: string;
    payload?: {
        learnerId?: string;
        sessionId?: string;
        confidence?: number;
        signal?: "IDLE_DETECTED" | "RAPID_ERRORS" | "ERRATIC_CLICKING" | "PATTERN_SWITCH" | "FRUSTRATION_CUES";
        activityId?: string;
        secondsSinceLastInteraction?: number;
        recentErrorCount?: number;
    };
}>, z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    eventVersion: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
    }, {
        version?: string;
        service?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
} & {
    eventType: z.ZodLiteral<string>;
    payload: z.ZodObject<{
        /** Learner receiving the intervention */
        learnerId: z.ZodString;
        /** Session during which intervention was triggered */
        sessionId: z.ZodString;
        /** Type of intervention being triggered */
        interventionType: z.ZodEnum<["BREAK_SUGGESTION", "CALMING_ACTIVITY", "DIFFICULTY_REDUCTION", "ENCOURAGEMENT", "ACTIVITY_SWITCH"]>;
        /** Signal that caused this intervention */
        triggerSignal: z.ZodEnum<["RAPID_ERRORS", "IDLE_DETECTED", "ERRATIC_CLICKING", "PATTERN_SWITCH", "FRUSTRATION_CUES"]>;
        /** Event ID of the focus loss event that triggered this */
        triggerEventId: z.ZodString;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        interventionType?: "BREAK_SUGGESTION" | "CALMING_ACTIVITY" | "DIFFICULTY_REDUCTION" | "ENCOURAGEMENT" | "ACTIVITY_SWITCH";
        triggerSignal?: "IDLE_DETECTED" | "RAPID_ERRORS" | "ERRATIC_CLICKING" | "PATTERN_SWITCH" | "FRUSTRATION_CUES";
        triggerEventId?: string;
    }, {
        learnerId?: string;
        sessionId?: string;
        interventionType?: "BREAK_SUGGESTION" | "CALMING_ACTIVITY" | "DIFFICULTY_REDUCTION" | "ENCOURAGEMENT" | "ACTIVITY_SWITCH";
        triggerSignal?: "IDLE_DETECTED" | "RAPID_ERRORS" | "ERRATIC_CLICKING" | "PATTERN_SWITCH" | "FRUSTRATION_CUES";
        triggerEventId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    tenantId?: string;
    source?: {
        version?: string;
        service?: string;
    };
    eventId?: string;
    eventType?: string;
    eventVersion?: string;
    timestamp?: string;
    correlationId?: string;
    causationId?: string;
    payload?: {
        learnerId?: string;
        sessionId?: string;
        interventionType?: "BREAK_SUGGESTION" | "CALMING_ACTIVITY" | "DIFFICULTY_REDUCTION" | "ENCOURAGEMENT" | "ACTIVITY_SWITCH";
        triggerSignal?: "IDLE_DETECTED" | "RAPID_ERRORS" | "ERRATIC_CLICKING" | "PATTERN_SWITCH" | "FRUSTRATION_CUES";
        triggerEventId?: string;
    };
}, {
    tenantId?: string;
    source?: {
        version?: string;
        service?: string;
    };
    eventId?: string;
    eventType?: string;
    eventVersion?: string;
    timestamp?: string;
    correlationId?: string;
    causationId?: string;
    payload?: {
        learnerId?: string;
        sessionId?: string;
        interventionType?: "BREAK_SUGGESTION" | "CALMING_ACTIVITY" | "DIFFICULTY_REDUCTION" | "ENCOURAGEMENT" | "ACTIVITY_SWITCH";
        triggerSignal?: "IDLE_DETECTED" | "RAPID_ERRORS" | "ERRATIC_CLICKING" | "PATTERN_SWITCH" | "FRUSTRATION_CUES";
        triggerEventId?: string;
    };
}>, z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    eventVersion: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
    }, {
        version?: string;
        service?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
} & {
    eventType: z.ZodLiteral<string>;
    payload: z.ZodObject<{
        /** Learner who received the intervention */
        learnerId: z.ZodString;
        /** Session during which intervention occurred */
        sessionId: z.ZodString;
        /** Event ID of the intervention that was triggered */
        interventionEventId: z.ZodString;
        /** How the intervention concluded */
        outcome: z.ZodEnum<["COMPLETED", "SKIPPED", "TIMEOUT"]>;
        /** How long the intervention took (if completed) */
        durationSeconds: z.ZodOptional<z.ZodNumber>;
        /** Whether learner resumed learning activity after intervention */
        resumedActivity: z.ZodBoolean;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        interventionEventId?: string;
        outcome?: "COMPLETED" | "SKIPPED" | "TIMEOUT";
        durationSeconds?: number;
        resumedActivity?: boolean;
    }, {
        learnerId?: string;
        sessionId?: string;
        interventionEventId?: string;
        outcome?: "COMPLETED" | "SKIPPED" | "TIMEOUT";
        durationSeconds?: number;
        resumedActivity?: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    tenantId?: string;
    source?: {
        version?: string;
        service?: string;
    };
    eventId?: string;
    eventType?: string;
    eventVersion?: string;
    timestamp?: string;
    correlationId?: string;
    causationId?: string;
    payload?: {
        learnerId?: string;
        sessionId?: string;
        interventionEventId?: string;
        outcome?: "COMPLETED" | "SKIPPED" | "TIMEOUT";
        durationSeconds?: number;
        resumedActivity?: boolean;
    };
}, {
    tenantId?: string;
    source?: {
        version?: string;
        service?: string;
    };
    eventId?: string;
    eventType?: string;
    eventVersion?: string;
    timestamp?: string;
    correlationId?: string;
    causationId?: string;
    payload?: {
        learnerId?: string;
        sessionId?: string;
        interventionEventId?: string;
        outcome?: "COMPLETED" | "SKIPPED" | "TIMEOUT";
        durationSeconds?: number;
        resumedActivity?: boolean;
    };
}>];
/**
 * Focus event type literals
 */
export declare const FOCUS_EVENT_TYPES: readonly ["focus.loss.detected", "focus.intervention.triggered", "focus.intervention.completed"];
export type FocusEventType = (typeof FOCUS_EVENT_TYPES)[number];
//# sourceMappingURL=focus.d.ts.map