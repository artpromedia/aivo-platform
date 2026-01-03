import { z } from 'zod';
export declare const SelfReportedMoodSchema: z.ZodEnum<["great", "good", "okay", "frustrated", "tired"]>;
export type SelfReportedMood = z.infer<typeof SelfReportedMoodSchema>;
export declare const FocusLossReasonSchema: z.ZodEnum<["extended_idle", "rapid_switching", "self_reported_frustrated", "self_reported_tired", "app_background", "distraction_detected", "difficulty_spike", "engagement_drop"]>;
export type FocusLossReason = z.infer<typeof FocusLossReasonSchema>;
/**
 * Focus ping event - high-frequency telemetry from client devices.
 * Kept minimal for bandwidth efficiency.
 */
export declare const FocusPingSchema: z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"focus.ping">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        activityId: z.ZodOptional<z.ZodString>;
        /** Milliseconds idle since last interaction */
        idleMs: z.ZodNumber;
        /** Whether app is in background */
        appInBackground: z.ZodBoolean;
        /** Self-reported mood (optional) */
        selfReportedMood: z.ZodOptional<z.ZodEnum<["great", "good", "okay", "frustrated", "tired"]>>;
        /** Rapid exit indicator (user trying to leave) */
        rapidExit: z.ZodOptional<z.ZodBoolean>;
        /** Ping sequence number for ordering */
        sequence: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        activityId?: string;
        idleMs?: number;
        appInBackground?: boolean;
        selfReportedMood?: "great" | "good" | "okay" | "frustrated" | "tired";
        rapidExit?: boolean;
        sequence?: number;
    }, {
        learnerId?: string;
        sessionId?: string;
        activityId?: string;
        idleMs?: number;
        appInBackground?: boolean;
        selfReportedMood?: "great" | "good" | "okay" | "frustrated" | "tired";
        rapidExit?: boolean;
        sequence?: number;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        activityId?: string;
        idleMs?: number;
        appInBackground?: boolean;
        selfReportedMood?: "great" | "good" | "okay" | "frustrated" | "tired";
        rapidExit?: boolean;
        sequence?: number;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "focus.ping";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        activityId?: string;
        idleMs?: number;
        appInBackground?: boolean;
        selfReportedMood?: "great" | "good" | "okay" | "frustrated" | "tired";
        rapidExit?: boolean;
        sequence?: number;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "focus.ping";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>;
export type FocusPing = z.infer<typeof FocusPingSchema>;
/**
 * Focus sample event - aggregated focus data over a time window.
 * Server-side aggregation of focus pings.
 */
export declare const FocusSampleSchema: z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"focus.sample">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        /** Sample window duration in ms */
        windowMs: z.ZodNumber;
        /** Number of pings in this window */
        pingCount: z.ZodNumber;
        /** Average idle time in ms */
        avgIdleMs: z.ZodNumber;
        /** Max idle time in ms */
        maxIdleMs: z.ZodNumber;
        /** Time spent with app in background (ms) */
        backgroundMs: z.ZodNumber;
        /** Computed focus score (0-100) */
        focusScore: z.ZodNumber;
        /** Focus trend (-1 to 1, negative = declining) */
        trend: z.ZodNumber;
        /** Grade band for cohort comparison */
        gradeBand: z.ZodOptional<z.ZodEnum<["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]>>;
        /** Sample period start */
        windowStart: z.ZodString;
        /** Sample period end */
        windowEnd: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        windowMs?: number;
        pingCount?: number;
        avgIdleMs?: number;
        maxIdleMs?: number;
        backgroundMs?: number;
        focusScore?: number;
        trend?: number;
        windowStart?: string;
        windowEnd?: string;
    }, {
        learnerId?: string;
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        windowMs?: number;
        pingCount?: number;
        avgIdleMs?: number;
        maxIdleMs?: number;
        backgroundMs?: number;
        focusScore?: number;
        trend?: number;
        windowStart?: string;
        windowEnd?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        windowMs?: number;
        pingCount?: number;
        avgIdleMs?: number;
        maxIdleMs?: number;
        backgroundMs?: number;
        focusScore?: number;
        trend?: number;
        windowStart?: string;
        windowEnd?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "focus.sample";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        windowMs?: number;
        pingCount?: number;
        avgIdleMs?: number;
        maxIdleMs?: number;
        backgroundMs?: number;
        focusScore?: number;
        trend?: number;
        windowStart?: string;
        windowEnd?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "focus.sample";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>;
export type FocusSample = z.infer<typeof FocusSampleSchema>;
/**
 * Focus loss event - triggered when focus drops below threshold.
 */
export declare const FocusLossSchema: z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"focus.loss">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        activityId: z.ZodOptional<z.ZodString>;
        /** Primary reason for focus loss */
        reason: z.ZodEnum<["extended_idle", "rapid_switching", "self_reported_frustrated", "self_reported_tired", "app_background", "distraction_detected", "difficulty_spike", "engagement_drop"]>;
        /** Focus score when loss detected (0-100) */
        focusScore: z.ZodNumber;
        /** How long focus has been low (ms) */
        lowFocusDurationMs: z.ZodNumber;
        /** Intervention recommended */
        interventionSuggested: z.ZodOptional<z.ZodEnum<["break_prompt", "activity_switch", "difficulty_adjust", "encouragement", "none"]>>;
        detectedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        reason?: "app_background" | "extended_idle" | "rapid_switching" | "self_reported_frustrated" | "self_reported_tired" | "distraction_detected" | "difficulty_spike" | "engagement_drop";
        sessionId?: string;
        activityId?: string;
        focusScore?: number;
        lowFocusDurationMs?: number;
        interventionSuggested?: "none" | "break_prompt" | "activity_switch" | "difficulty_adjust" | "encouragement";
        detectedAt?: string;
    }, {
        learnerId?: string;
        reason?: "app_background" | "extended_idle" | "rapid_switching" | "self_reported_frustrated" | "self_reported_tired" | "distraction_detected" | "difficulty_spike" | "engagement_drop";
        sessionId?: string;
        activityId?: string;
        focusScore?: number;
        lowFocusDurationMs?: number;
        interventionSuggested?: "none" | "break_prompt" | "activity_switch" | "difficulty_adjust" | "encouragement";
        detectedAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        reason?: "app_background" | "extended_idle" | "rapid_switching" | "self_reported_frustrated" | "self_reported_tired" | "distraction_detected" | "difficulty_spike" | "engagement_drop";
        sessionId?: string;
        activityId?: string;
        focusScore?: number;
        lowFocusDurationMs?: number;
        interventionSuggested?: "none" | "break_prompt" | "activity_switch" | "difficulty_adjust" | "encouragement";
        detectedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "focus.loss";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        learnerId?: string;
        reason?: "app_background" | "extended_idle" | "rapid_switching" | "self_reported_frustrated" | "self_reported_tired" | "distraction_detected" | "difficulty_spike" | "engagement_drop";
        sessionId?: string;
        activityId?: string;
        focusScore?: number;
        lowFocusDurationMs?: number;
        interventionSuggested?: "none" | "break_prompt" | "activity_switch" | "difficulty_adjust" | "encouragement";
        detectedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "focus.loss";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>;
export type FocusLoss = z.infer<typeof FocusLossSchema>;
/**
 * Focus session summary - emitted at session end with focus analytics.
 */
export declare const FocusSessionSummarySchema: z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"focus.session.summary">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        /** Session duration (ms) */
        sessionDurationMs: z.ZodNumber;
        /** Total pings received */
        totalPings: z.ZodNumber;
        /** Average focus score (0-100) */
        avgFocusScore: z.ZodNumber;
        /** Min focus score (0-100) */
        minFocusScore: z.ZodNumber;
        /** Max focus score (0-100) */
        maxFocusScore: z.ZodNumber;
        /** Standard deviation */
        focusScoreStdDev: z.ZodNumber;
        /** Number of focus loss events */
        focusLossCount: z.ZodNumber;
        /** Total time in low-focus state (ms) */
        lowFocusMs: z.ZodNumber;
        /** Time with app in background (ms) */
        backgroundMs: z.ZodNumber;
        /** Focus loss reasons histogram */
        lossReasons: z.ZodOptional<z.ZodRecord<z.ZodEnum<["extended_idle", "rapid_switching", "self_reported_frustrated", "self_reported_tired", "app_background", "distraction_detected", "difficulty_spike", "engagement_drop"]>, z.ZodNumber>>;
        /** Grade band for cohort comparison */
        gradeBand: z.ZodOptional<z.ZodEnum<["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]>>;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        avgFocusScore?: number;
        backgroundMs?: number;
        sessionDurationMs?: number;
        totalPings?: number;
        minFocusScore?: number;
        maxFocusScore?: number;
        focusScoreStdDev?: number;
        focusLossCount?: number;
        lowFocusMs?: number;
        lossReasons?: Partial<Record<"app_background" | "extended_idle" | "rapid_switching" | "self_reported_frustrated" | "self_reported_tired" | "distraction_detected" | "difficulty_spike" | "engagement_drop", number>>;
    }, {
        learnerId?: string;
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        avgFocusScore?: number;
        backgroundMs?: number;
        sessionDurationMs?: number;
        totalPings?: number;
        minFocusScore?: number;
        maxFocusScore?: number;
        focusScoreStdDev?: number;
        focusLossCount?: number;
        lowFocusMs?: number;
        lossReasons?: Partial<Record<"app_background" | "extended_idle" | "rapid_switching" | "self_reported_frustrated" | "self_reported_tired" | "distraction_detected" | "difficulty_spike" | "engagement_drop", number>>;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        avgFocusScore?: number;
        backgroundMs?: number;
        sessionDurationMs?: number;
        totalPings?: number;
        minFocusScore?: number;
        maxFocusScore?: number;
        focusScoreStdDev?: number;
        focusLossCount?: number;
        lowFocusMs?: number;
        lossReasons?: Partial<Record<"app_background" | "extended_idle" | "rapid_switching" | "self_reported_frustrated" | "self_reported_tired" | "distraction_detected" | "difficulty_spike" | "engagement_drop", number>>;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "focus.session.summary";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        avgFocusScore?: number;
        backgroundMs?: number;
        sessionDurationMs?: number;
        totalPings?: number;
        minFocusScore?: number;
        maxFocusScore?: number;
        focusScoreStdDev?: number;
        focusLossCount?: number;
        lowFocusMs?: number;
        lossReasons?: Partial<Record<"app_background" | "extended_idle" | "rapid_switching" | "self_reported_frustrated" | "self_reported_tired" | "distraction_detected" | "difficulty_spike" | "engagement_drop", number>>;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "focus.session.summary";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>;
export type FocusSessionSummary = z.infer<typeof FocusSessionSummarySchema>;
export declare const FocusEventSchema: z.ZodDiscriminatedUnion<"eventType", [z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"focus.ping">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        activityId: z.ZodOptional<z.ZodString>;
        /** Milliseconds idle since last interaction */
        idleMs: z.ZodNumber;
        /** Whether app is in background */
        appInBackground: z.ZodBoolean;
        /** Self-reported mood (optional) */
        selfReportedMood: z.ZodOptional<z.ZodEnum<["great", "good", "okay", "frustrated", "tired"]>>;
        /** Rapid exit indicator (user trying to leave) */
        rapidExit: z.ZodOptional<z.ZodBoolean>;
        /** Ping sequence number for ordering */
        sequence: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        activityId?: string;
        idleMs?: number;
        appInBackground?: boolean;
        selfReportedMood?: "great" | "good" | "okay" | "frustrated" | "tired";
        rapidExit?: boolean;
        sequence?: number;
    }, {
        learnerId?: string;
        sessionId?: string;
        activityId?: string;
        idleMs?: number;
        appInBackground?: boolean;
        selfReportedMood?: "great" | "good" | "okay" | "frustrated" | "tired";
        rapidExit?: boolean;
        sequence?: number;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        activityId?: string;
        idleMs?: number;
        appInBackground?: boolean;
        selfReportedMood?: "great" | "good" | "okay" | "frustrated" | "tired";
        rapidExit?: boolean;
        sequence?: number;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "focus.ping";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        activityId?: string;
        idleMs?: number;
        appInBackground?: boolean;
        selfReportedMood?: "great" | "good" | "okay" | "frustrated" | "tired";
        rapidExit?: boolean;
        sequence?: number;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "focus.ping";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>, z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"focus.sample">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        /** Sample window duration in ms */
        windowMs: z.ZodNumber;
        /** Number of pings in this window */
        pingCount: z.ZodNumber;
        /** Average idle time in ms */
        avgIdleMs: z.ZodNumber;
        /** Max idle time in ms */
        maxIdleMs: z.ZodNumber;
        /** Time spent with app in background (ms) */
        backgroundMs: z.ZodNumber;
        /** Computed focus score (0-100) */
        focusScore: z.ZodNumber;
        /** Focus trend (-1 to 1, negative = declining) */
        trend: z.ZodNumber;
        /** Grade band for cohort comparison */
        gradeBand: z.ZodOptional<z.ZodEnum<["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]>>;
        /** Sample period start */
        windowStart: z.ZodString;
        /** Sample period end */
        windowEnd: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        windowMs?: number;
        pingCount?: number;
        avgIdleMs?: number;
        maxIdleMs?: number;
        backgroundMs?: number;
        focusScore?: number;
        trend?: number;
        windowStart?: string;
        windowEnd?: string;
    }, {
        learnerId?: string;
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        windowMs?: number;
        pingCount?: number;
        avgIdleMs?: number;
        maxIdleMs?: number;
        backgroundMs?: number;
        focusScore?: number;
        trend?: number;
        windowStart?: string;
        windowEnd?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        windowMs?: number;
        pingCount?: number;
        avgIdleMs?: number;
        maxIdleMs?: number;
        backgroundMs?: number;
        focusScore?: number;
        trend?: number;
        windowStart?: string;
        windowEnd?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "focus.sample";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        windowMs?: number;
        pingCount?: number;
        avgIdleMs?: number;
        maxIdleMs?: number;
        backgroundMs?: number;
        focusScore?: number;
        trend?: number;
        windowStart?: string;
        windowEnd?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "focus.sample";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>, z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"focus.loss">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        activityId: z.ZodOptional<z.ZodString>;
        /** Primary reason for focus loss */
        reason: z.ZodEnum<["extended_idle", "rapid_switching", "self_reported_frustrated", "self_reported_tired", "app_background", "distraction_detected", "difficulty_spike", "engagement_drop"]>;
        /** Focus score when loss detected (0-100) */
        focusScore: z.ZodNumber;
        /** How long focus has been low (ms) */
        lowFocusDurationMs: z.ZodNumber;
        /** Intervention recommended */
        interventionSuggested: z.ZodOptional<z.ZodEnum<["break_prompt", "activity_switch", "difficulty_adjust", "encouragement", "none"]>>;
        detectedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        reason?: "app_background" | "extended_idle" | "rapid_switching" | "self_reported_frustrated" | "self_reported_tired" | "distraction_detected" | "difficulty_spike" | "engagement_drop";
        sessionId?: string;
        activityId?: string;
        focusScore?: number;
        lowFocusDurationMs?: number;
        interventionSuggested?: "none" | "break_prompt" | "activity_switch" | "difficulty_adjust" | "encouragement";
        detectedAt?: string;
    }, {
        learnerId?: string;
        reason?: "app_background" | "extended_idle" | "rapid_switching" | "self_reported_frustrated" | "self_reported_tired" | "distraction_detected" | "difficulty_spike" | "engagement_drop";
        sessionId?: string;
        activityId?: string;
        focusScore?: number;
        lowFocusDurationMs?: number;
        interventionSuggested?: "none" | "break_prompt" | "activity_switch" | "difficulty_adjust" | "encouragement";
        detectedAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        reason?: "app_background" | "extended_idle" | "rapid_switching" | "self_reported_frustrated" | "self_reported_tired" | "distraction_detected" | "difficulty_spike" | "engagement_drop";
        sessionId?: string;
        activityId?: string;
        focusScore?: number;
        lowFocusDurationMs?: number;
        interventionSuggested?: "none" | "break_prompt" | "activity_switch" | "difficulty_adjust" | "encouragement";
        detectedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "focus.loss";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        learnerId?: string;
        reason?: "app_background" | "extended_idle" | "rapid_switching" | "self_reported_frustrated" | "self_reported_tired" | "distraction_detected" | "difficulty_spike" | "engagement_drop";
        sessionId?: string;
        activityId?: string;
        focusScore?: number;
        lowFocusDurationMs?: number;
        interventionSuggested?: "none" | "break_prompt" | "activity_switch" | "difficulty_adjust" | "encouragement";
        detectedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "focus.loss";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>, z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"focus.session.summary">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        /** Session duration (ms) */
        sessionDurationMs: z.ZodNumber;
        /** Total pings received */
        totalPings: z.ZodNumber;
        /** Average focus score (0-100) */
        avgFocusScore: z.ZodNumber;
        /** Min focus score (0-100) */
        minFocusScore: z.ZodNumber;
        /** Max focus score (0-100) */
        maxFocusScore: z.ZodNumber;
        /** Standard deviation */
        focusScoreStdDev: z.ZodNumber;
        /** Number of focus loss events */
        focusLossCount: z.ZodNumber;
        /** Total time in low-focus state (ms) */
        lowFocusMs: z.ZodNumber;
        /** Time with app in background (ms) */
        backgroundMs: z.ZodNumber;
        /** Focus loss reasons histogram */
        lossReasons: z.ZodOptional<z.ZodRecord<z.ZodEnum<["extended_idle", "rapid_switching", "self_reported_frustrated", "self_reported_tired", "app_background", "distraction_detected", "difficulty_spike", "engagement_drop"]>, z.ZodNumber>>;
        /** Grade band for cohort comparison */
        gradeBand: z.ZodOptional<z.ZodEnum<["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]>>;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        avgFocusScore?: number;
        backgroundMs?: number;
        sessionDurationMs?: number;
        totalPings?: number;
        minFocusScore?: number;
        maxFocusScore?: number;
        focusScoreStdDev?: number;
        focusLossCount?: number;
        lowFocusMs?: number;
        lossReasons?: Partial<Record<"app_background" | "extended_idle" | "rapid_switching" | "self_reported_frustrated" | "self_reported_tired" | "distraction_detected" | "difficulty_spike" | "engagement_drop", number>>;
    }, {
        learnerId?: string;
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        avgFocusScore?: number;
        backgroundMs?: number;
        sessionDurationMs?: number;
        totalPings?: number;
        minFocusScore?: number;
        maxFocusScore?: number;
        focusScoreStdDev?: number;
        focusLossCount?: number;
        lowFocusMs?: number;
        lossReasons?: Partial<Record<"app_background" | "extended_idle" | "rapid_switching" | "self_reported_frustrated" | "self_reported_tired" | "distraction_detected" | "difficulty_spike" | "engagement_drop", number>>;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        avgFocusScore?: number;
        backgroundMs?: number;
        sessionDurationMs?: number;
        totalPings?: number;
        minFocusScore?: number;
        maxFocusScore?: number;
        focusScoreStdDev?: number;
        focusLossCount?: number;
        lowFocusMs?: number;
        lossReasons?: Partial<Record<"app_background" | "extended_idle" | "rapid_switching" | "self_reported_frustrated" | "self_reported_tired" | "distraction_detected" | "difficulty_spike" | "engagement_drop", number>>;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "focus.session.summary";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        avgFocusScore?: number;
        backgroundMs?: number;
        sessionDurationMs?: number;
        totalPings?: number;
        minFocusScore?: number;
        maxFocusScore?: number;
        focusScoreStdDev?: number;
        focusLossCount?: number;
        lowFocusMs?: number;
        lossReasons?: Partial<Record<"app_background" | "extended_idle" | "rapid_switching" | "self_reported_frustrated" | "self_reported_tired" | "distraction_detected" | "difficulty_spike" | "engagement_drop", number>>;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "focus.session.summary";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>]>;
export type FocusEvent = z.infer<typeof FocusEventSchema>;
export declare const FOCUS_EVENT_TYPES: {
    readonly PING: "focus.ping";
    readonly SAMPLE: "focus.sample";
    readonly LOSS: "focus.loss";
    readonly SESSION_SUMMARY: "focus.session.summary";
};
//# sourceMappingURL=focus.d.ts.map