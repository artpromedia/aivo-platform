import { z } from 'zod';
/**
 * Session started event - emitted when a learner begins a learning session.
 */
export declare const LearningSessionStartedSchema: z.ZodObject<{
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
    eventType: z.ZodLiteral<"learning.session.started">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        sessionType: z.ZodEnum<["LEARNING", "HOMEWORK", "ASSESSMENT", "BASELINE", "PRACTICE", "REVIEW"]>;
        origin: z.ZodEnum<["MOBILE_LEARNER", "MOBILE_PARENT", "MOBILE_TEACHER", "WEB_LEARNER", "WEB_TEACHER", "WEB_AUTHOR", "WEB_ADMIN", "API"]>;
        gradeBand: z.ZodEnum<["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]>;
        subjectId: z.ZodOptional<z.ZodString>;
        courseId: z.ZodOptional<z.ZodString>;
        /** Device type (mobile, tablet, desktop) */
        deviceType: z.ZodOptional<z.ZodEnum<["mobile", "tablet", "desktop"]>>;
        /** Initial activity if pre-selected */
        initialActivityId: z.ZodOptional<z.ZodString>;
        /** Start time (may differ from event timestamp due to offline sync) */
        startedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        origin?: "MOBILE_LEARNER" | "MOBILE_PARENT" | "MOBILE_TEACHER" | "WEB_LEARNER" | "WEB_TEACHER" | "WEB_AUTHOR" | "WEB_ADMIN" | "API";
        sessionId?: string;
        sessionType?: "LEARNING" | "HOMEWORK" | "ASSESSMENT" | "BASELINE" | "PRACTICE" | "REVIEW";
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        subjectId?: string;
        courseId?: string;
        deviceType?: "mobile" | "tablet" | "desktop";
        initialActivityId?: string;
        startedAt?: string;
    }, {
        learnerId?: string;
        origin?: "MOBILE_LEARNER" | "MOBILE_PARENT" | "MOBILE_TEACHER" | "WEB_LEARNER" | "WEB_TEACHER" | "WEB_AUTHOR" | "WEB_ADMIN" | "API";
        sessionId?: string;
        sessionType?: "LEARNING" | "HOMEWORK" | "ASSESSMENT" | "BASELINE" | "PRACTICE" | "REVIEW";
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        subjectId?: string;
        courseId?: string;
        deviceType?: "mobile" | "tablet" | "desktop";
        initialActivityId?: string;
        startedAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        origin?: "MOBILE_LEARNER" | "MOBILE_PARENT" | "MOBILE_TEACHER" | "WEB_LEARNER" | "WEB_TEACHER" | "WEB_AUTHOR" | "WEB_ADMIN" | "API";
        sessionId?: string;
        sessionType?: "LEARNING" | "HOMEWORK" | "ASSESSMENT" | "BASELINE" | "PRACTICE" | "REVIEW";
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        subjectId?: string;
        courseId?: string;
        deviceType?: "mobile" | "tablet" | "desktop";
        initialActivityId?: string;
        startedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "learning.session.started";
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
        origin?: "MOBILE_LEARNER" | "MOBILE_PARENT" | "MOBILE_TEACHER" | "WEB_LEARNER" | "WEB_TEACHER" | "WEB_AUTHOR" | "WEB_ADMIN" | "API";
        sessionId?: string;
        sessionType?: "LEARNING" | "HOMEWORK" | "ASSESSMENT" | "BASELINE" | "PRACTICE" | "REVIEW";
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        subjectId?: string;
        courseId?: string;
        deviceType?: "mobile" | "tablet" | "desktop";
        initialActivityId?: string;
        startedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "learning.session.started";
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
export type LearningSessionStarted = z.infer<typeof LearningSessionStartedSchema>;
/**
 * Session ended event - emitted when a learning session concludes.
 */
export declare const LearningSessionEndedSchema: z.ZodObject<{
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
    eventType: z.ZodLiteral<"learning.session.ended">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        /** Duration in milliseconds */
        durationMs: z.ZodNumber;
        /** End reason */
        endReason: z.ZodEnum<["completed", "user_exit", "timeout", "app_background", "connection_lost", "error"]>;
        /** Summary statistics */
        summary: z.ZodObject<{
            activitiesStarted: z.ZodNumber;
            activitiesCompleted: z.ZodNumber;
            correctAnswers: z.ZodNumber;
            incorrectAnswers: z.ZodNumber;
            hintsUsed: z.ZodNumber;
            /** Average focus score (0-100) */
            avgFocusScore: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            activitiesStarted?: number;
            activitiesCompleted?: number;
            correctAnswers?: number;
            incorrectAnswers?: number;
            hintsUsed?: number;
            avgFocusScore?: number;
        }, {
            activitiesStarted?: number;
            activitiesCompleted?: number;
            correctAnswers?: number;
            incorrectAnswers?: number;
            hintsUsed?: number;
            avgFocusScore?: number;
        }>;
        endedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        durationMs?: number;
        endReason?: "error" | "timeout" | "completed" | "user_exit" | "app_background" | "connection_lost";
        summary?: {
            activitiesStarted?: number;
            activitiesCompleted?: number;
            correctAnswers?: number;
            incorrectAnswers?: number;
            hintsUsed?: number;
            avgFocusScore?: number;
        };
        endedAt?: string;
    }, {
        learnerId?: string;
        sessionId?: string;
        durationMs?: number;
        endReason?: "error" | "timeout" | "completed" | "user_exit" | "app_background" | "connection_lost";
        summary?: {
            activitiesStarted?: number;
            activitiesCompleted?: number;
            correctAnswers?: number;
            incorrectAnswers?: number;
            hintsUsed?: number;
            avgFocusScore?: number;
        };
        endedAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        durationMs?: number;
        endReason?: "error" | "timeout" | "completed" | "user_exit" | "app_background" | "connection_lost";
        summary?: {
            activitiesStarted?: number;
            activitiesCompleted?: number;
            correctAnswers?: number;
            incorrectAnswers?: number;
            hintsUsed?: number;
            avgFocusScore?: number;
        };
        endedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "learning.session.ended";
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
        durationMs?: number;
        endReason?: "error" | "timeout" | "completed" | "user_exit" | "app_background" | "connection_lost";
        summary?: {
            activitiesStarted?: number;
            activitiesCompleted?: number;
            correctAnswers?: number;
            incorrectAnswers?: number;
            hintsUsed?: number;
            avgFocusScore?: number;
        };
        endedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "learning.session.ended";
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
export type LearningSessionEnded = z.infer<typeof LearningSessionEndedSchema>;
/**
 * Activity started event - emitted when a learner begins an activity.
 */
export declare const ActivityStartedSchema: z.ZodObject<{
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
    eventType: z.ZodLiteral<"learning.activity.started">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        activityId: z.ZodString;
        activityType: z.ZodEnum<["lesson", "quiz", "practice", "game", "video", "reading", "interactive"]>;
        /** Content item being worked on */
        contentId: z.ZodString;
        /** Skill being practiced */
        skillId: z.ZodOptional<z.ZodString>;
        /** Difficulty level (1-5) */
        difficultyLevel: z.ZodOptional<z.ZodNumber>;
        /** Sequence number within session */
        sequenceNumber: z.ZodNumber;
        startedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        startedAt?: string;
        activityId?: string;
        activityType?: "lesson" | "quiz" | "practice" | "game" | "video" | "reading" | "interactive";
        contentId?: string;
        skillId?: string;
        difficultyLevel?: number;
        sequenceNumber?: number;
    }, {
        learnerId?: string;
        sessionId?: string;
        startedAt?: string;
        activityId?: string;
        activityType?: "lesson" | "quiz" | "practice" | "game" | "video" | "reading" | "interactive";
        contentId?: string;
        skillId?: string;
        difficultyLevel?: number;
        sequenceNumber?: number;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        startedAt?: string;
        activityId?: string;
        activityType?: "lesson" | "quiz" | "practice" | "game" | "video" | "reading" | "interactive";
        contentId?: string;
        skillId?: string;
        difficultyLevel?: number;
        sequenceNumber?: number;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "learning.activity.started";
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
        startedAt?: string;
        activityId?: string;
        activityType?: "lesson" | "quiz" | "practice" | "game" | "video" | "reading" | "interactive";
        contentId?: string;
        skillId?: string;
        difficultyLevel?: number;
        sequenceNumber?: number;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "learning.activity.started";
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
export type ActivityStarted = z.infer<typeof ActivityStartedSchema>;
/**
 * Activity completed event - emitted when a learner finishes an activity.
 */
export declare const ActivityCompletedSchema: z.ZodObject<{
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
    eventType: z.ZodLiteral<"learning.activity.completed">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        activityId: z.ZodString;
        /** Duration in milliseconds */
        durationMs: z.ZodNumber;
        /** Completion outcome */
        outcome: z.ZodEnum<["completed", "skipped", "abandoned", "timed_out"]>;
        /** Score if applicable (0-100) */
        score: z.ZodOptional<z.ZodNumber>;
        /** Number of attempts */
        attempts: z.ZodOptional<z.ZodNumber>;
        /** Mastery level achieved (0-1) */
        masteryLevel: z.ZodOptional<z.ZodNumber>;
        /** Time spent on-task vs total (ratio) */
        onTaskRatio: z.ZodOptional<z.ZodNumber>;
        completedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        durationMs?: number;
        activityId?: string;
        outcome?: "completed" | "skipped" | "abandoned" | "timed_out";
        score?: number;
        attempts?: number;
        masteryLevel?: number;
        onTaskRatio?: number;
        completedAt?: string;
    }, {
        learnerId?: string;
        sessionId?: string;
        durationMs?: number;
        activityId?: string;
        outcome?: "completed" | "skipped" | "abandoned" | "timed_out";
        score?: number;
        attempts?: number;
        masteryLevel?: number;
        onTaskRatio?: number;
        completedAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        durationMs?: number;
        activityId?: string;
        outcome?: "completed" | "skipped" | "abandoned" | "timed_out";
        score?: number;
        attempts?: number;
        masteryLevel?: number;
        onTaskRatio?: number;
        completedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "learning.activity.completed";
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
        durationMs?: number;
        activityId?: string;
        outcome?: "completed" | "skipped" | "abandoned" | "timed_out";
        score?: number;
        attempts?: number;
        masteryLevel?: number;
        onTaskRatio?: number;
        completedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "learning.activity.completed";
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
export type ActivityCompleted = z.infer<typeof ActivityCompletedSchema>;
/**
 * Skill mastery updated event - emitted when learner's skill level changes.
 */
export declare const SkillMasteryUpdatedSchema: z.ZodObject<{
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
    eventType: z.ZodLiteral<"learning.skill.mastery_updated">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        learnerId: z.ZodString;
        skillId: z.ZodString;
        skillName: z.ZodString;
        /** Previous mastery level (0-1) */
        previousLevel: z.ZodNumber;
        /** New mastery level (0-1) */
        newLevel: z.ZodNumber;
        /** Change amount (can be negative for decay) */
        delta: z.ZodNumber;
        /** Reason for change */
        reason: z.ZodEnum<["activity_completion", "assessment_result", "time_decay", "teacher_override", "baseline_update"]>;
        /** Activity that triggered the change */
        triggerActivityId: z.ZodOptional<z.ZodString>;
        /** Evidence count for this skill */
        evidenceCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        reason?: "activity_completion" | "assessment_result" | "time_decay" | "teacher_override" | "baseline_update";
        skillId?: string;
        skillName?: string;
        previousLevel?: number;
        newLevel?: number;
        delta?: number;
        triggerActivityId?: string;
        evidenceCount?: number;
    }, {
        learnerId?: string;
        reason?: "activity_completion" | "assessment_result" | "time_decay" | "teacher_override" | "baseline_update";
        skillId?: string;
        skillName?: string;
        previousLevel?: number;
        newLevel?: number;
        delta?: number;
        triggerActivityId?: string;
        evidenceCount?: number;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        reason?: "activity_completion" | "assessment_result" | "time_decay" | "teacher_override" | "baseline_update";
        skillId?: string;
        skillName?: string;
        previousLevel?: number;
        newLevel?: number;
        delta?: number;
        triggerActivityId?: string;
        evidenceCount?: number;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "learning.skill.mastery_updated";
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
        reason?: "activity_completion" | "assessment_result" | "time_decay" | "teacher_override" | "baseline_update";
        skillId?: string;
        skillName?: string;
        previousLevel?: number;
        newLevel?: number;
        delta?: number;
        triggerActivityId?: string;
        evidenceCount?: number;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "learning.skill.mastery_updated";
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
export type SkillMasteryUpdated = z.infer<typeof SkillMasteryUpdatedSchema>;
/**
 * Engagement metric event - periodic engagement snapshots.
 */
export declare const EngagementMetricSchema: z.ZodObject<{
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
    eventType: z.ZodLiteral<"learning.engagement.metric">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        /** Time window for this metric (ms) */
        windowMs: z.ZodNumber;
        /** Engagement score (0-100) */
        engagementScore: z.ZodNumber;
        /** Components of engagement */
        components: z.ZodObject<{
            /** Interaction rate (taps/clicks per minute) */
            interactionRate: z.ZodNumber;
            /** Time on task ratio */
            onTaskRatio: z.ZodNumber;
            /** Response latency factor */
            responsiveness: z.ZodNumber;
            /** Voluntary continuation factor */
            persistence: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            onTaskRatio?: number;
            interactionRate?: number;
            responsiveness?: number;
            persistence?: number;
        }, {
            onTaskRatio?: number;
            interactionRate?: number;
            responsiveness?: number;
            persistence?: number;
        }>;
        sampledAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        windowMs?: number;
        engagementScore?: number;
        components?: {
            onTaskRatio?: number;
            interactionRate?: number;
            responsiveness?: number;
            persistence?: number;
        };
        sampledAt?: string;
    }, {
        learnerId?: string;
        sessionId?: string;
        windowMs?: number;
        engagementScore?: number;
        components?: {
            onTaskRatio?: number;
            interactionRate?: number;
            responsiveness?: number;
            persistence?: number;
        };
        sampledAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        windowMs?: number;
        engagementScore?: number;
        components?: {
            onTaskRatio?: number;
            interactionRate?: number;
            responsiveness?: number;
            persistence?: number;
        };
        sampledAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "learning.engagement.metric";
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
        windowMs?: number;
        engagementScore?: number;
        components?: {
            onTaskRatio?: number;
            interactionRate?: number;
            responsiveness?: number;
            persistence?: number;
        };
        sampledAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "learning.engagement.metric";
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
export type EngagementMetric = z.infer<typeof EngagementMetricSchema>;
export declare const LearningEventSchema: z.ZodDiscriminatedUnion<"eventType", [z.ZodObject<{
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
    eventType: z.ZodLiteral<"learning.session.started">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        sessionType: z.ZodEnum<["LEARNING", "HOMEWORK", "ASSESSMENT", "BASELINE", "PRACTICE", "REVIEW"]>;
        origin: z.ZodEnum<["MOBILE_LEARNER", "MOBILE_PARENT", "MOBILE_TEACHER", "WEB_LEARNER", "WEB_TEACHER", "WEB_AUTHOR", "WEB_ADMIN", "API"]>;
        gradeBand: z.ZodEnum<["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]>;
        subjectId: z.ZodOptional<z.ZodString>;
        courseId: z.ZodOptional<z.ZodString>;
        /** Device type (mobile, tablet, desktop) */
        deviceType: z.ZodOptional<z.ZodEnum<["mobile", "tablet", "desktop"]>>;
        /** Initial activity if pre-selected */
        initialActivityId: z.ZodOptional<z.ZodString>;
        /** Start time (may differ from event timestamp due to offline sync) */
        startedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        origin?: "MOBILE_LEARNER" | "MOBILE_PARENT" | "MOBILE_TEACHER" | "WEB_LEARNER" | "WEB_TEACHER" | "WEB_AUTHOR" | "WEB_ADMIN" | "API";
        sessionId?: string;
        sessionType?: "LEARNING" | "HOMEWORK" | "ASSESSMENT" | "BASELINE" | "PRACTICE" | "REVIEW";
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        subjectId?: string;
        courseId?: string;
        deviceType?: "mobile" | "tablet" | "desktop";
        initialActivityId?: string;
        startedAt?: string;
    }, {
        learnerId?: string;
        origin?: "MOBILE_LEARNER" | "MOBILE_PARENT" | "MOBILE_TEACHER" | "WEB_LEARNER" | "WEB_TEACHER" | "WEB_AUTHOR" | "WEB_ADMIN" | "API";
        sessionId?: string;
        sessionType?: "LEARNING" | "HOMEWORK" | "ASSESSMENT" | "BASELINE" | "PRACTICE" | "REVIEW";
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        subjectId?: string;
        courseId?: string;
        deviceType?: "mobile" | "tablet" | "desktop";
        initialActivityId?: string;
        startedAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        origin?: "MOBILE_LEARNER" | "MOBILE_PARENT" | "MOBILE_TEACHER" | "WEB_LEARNER" | "WEB_TEACHER" | "WEB_AUTHOR" | "WEB_ADMIN" | "API";
        sessionId?: string;
        sessionType?: "LEARNING" | "HOMEWORK" | "ASSESSMENT" | "BASELINE" | "PRACTICE" | "REVIEW";
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        subjectId?: string;
        courseId?: string;
        deviceType?: "mobile" | "tablet" | "desktop";
        initialActivityId?: string;
        startedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "learning.session.started";
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
        origin?: "MOBILE_LEARNER" | "MOBILE_PARENT" | "MOBILE_TEACHER" | "WEB_LEARNER" | "WEB_TEACHER" | "WEB_AUTHOR" | "WEB_ADMIN" | "API";
        sessionId?: string;
        sessionType?: "LEARNING" | "HOMEWORK" | "ASSESSMENT" | "BASELINE" | "PRACTICE" | "REVIEW";
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        subjectId?: string;
        courseId?: string;
        deviceType?: "mobile" | "tablet" | "desktop";
        initialActivityId?: string;
        startedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "learning.session.started";
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
    eventType: z.ZodLiteral<"learning.session.ended">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        /** Duration in milliseconds */
        durationMs: z.ZodNumber;
        /** End reason */
        endReason: z.ZodEnum<["completed", "user_exit", "timeout", "app_background", "connection_lost", "error"]>;
        /** Summary statistics */
        summary: z.ZodObject<{
            activitiesStarted: z.ZodNumber;
            activitiesCompleted: z.ZodNumber;
            correctAnswers: z.ZodNumber;
            incorrectAnswers: z.ZodNumber;
            hintsUsed: z.ZodNumber;
            /** Average focus score (0-100) */
            avgFocusScore: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            activitiesStarted?: number;
            activitiesCompleted?: number;
            correctAnswers?: number;
            incorrectAnswers?: number;
            hintsUsed?: number;
            avgFocusScore?: number;
        }, {
            activitiesStarted?: number;
            activitiesCompleted?: number;
            correctAnswers?: number;
            incorrectAnswers?: number;
            hintsUsed?: number;
            avgFocusScore?: number;
        }>;
        endedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        durationMs?: number;
        endReason?: "error" | "timeout" | "completed" | "user_exit" | "app_background" | "connection_lost";
        summary?: {
            activitiesStarted?: number;
            activitiesCompleted?: number;
            correctAnswers?: number;
            incorrectAnswers?: number;
            hintsUsed?: number;
            avgFocusScore?: number;
        };
        endedAt?: string;
    }, {
        learnerId?: string;
        sessionId?: string;
        durationMs?: number;
        endReason?: "error" | "timeout" | "completed" | "user_exit" | "app_background" | "connection_lost";
        summary?: {
            activitiesStarted?: number;
            activitiesCompleted?: number;
            correctAnswers?: number;
            incorrectAnswers?: number;
            hintsUsed?: number;
            avgFocusScore?: number;
        };
        endedAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        durationMs?: number;
        endReason?: "error" | "timeout" | "completed" | "user_exit" | "app_background" | "connection_lost";
        summary?: {
            activitiesStarted?: number;
            activitiesCompleted?: number;
            correctAnswers?: number;
            incorrectAnswers?: number;
            hintsUsed?: number;
            avgFocusScore?: number;
        };
        endedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "learning.session.ended";
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
        durationMs?: number;
        endReason?: "error" | "timeout" | "completed" | "user_exit" | "app_background" | "connection_lost";
        summary?: {
            activitiesStarted?: number;
            activitiesCompleted?: number;
            correctAnswers?: number;
            incorrectAnswers?: number;
            hintsUsed?: number;
            avgFocusScore?: number;
        };
        endedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "learning.session.ended";
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
    eventType: z.ZodLiteral<"learning.activity.started">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        activityId: z.ZodString;
        activityType: z.ZodEnum<["lesson", "quiz", "practice", "game", "video", "reading", "interactive"]>;
        /** Content item being worked on */
        contentId: z.ZodString;
        /** Skill being practiced */
        skillId: z.ZodOptional<z.ZodString>;
        /** Difficulty level (1-5) */
        difficultyLevel: z.ZodOptional<z.ZodNumber>;
        /** Sequence number within session */
        sequenceNumber: z.ZodNumber;
        startedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        startedAt?: string;
        activityId?: string;
        activityType?: "lesson" | "quiz" | "practice" | "game" | "video" | "reading" | "interactive";
        contentId?: string;
        skillId?: string;
        difficultyLevel?: number;
        sequenceNumber?: number;
    }, {
        learnerId?: string;
        sessionId?: string;
        startedAt?: string;
        activityId?: string;
        activityType?: "lesson" | "quiz" | "practice" | "game" | "video" | "reading" | "interactive";
        contentId?: string;
        skillId?: string;
        difficultyLevel?: number;
        sequenceNumber?: number;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        startedAt?: string;
        activityId?: string;
        activityType?: "lesson" | "quiz" | "practice" | "game" | "video" | "reading" | "interactive";
        contentId?: string;
        skillId?: string;
        difficultyLevel?: number;
        sequenceNumber?: number;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "learning.activity.started";
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
        startedAt?: string;
        activityId?: string;
        activityType?: "lesson" | "quiz" | "practice" | "game" | "video" | "reading" | "interactive";
        contentId?: string;
        skillId?: string;
        difficultyLevel?: number;
        sequenceNumber?: number;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "learning.activity.started";
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
    eventType: z.ZodLiteral<"learning.activity.completed">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        activityId: z.ZodString;
        /** Duration in milliseconds */
        durationMs: z.ZodNumber;
        /** Completion outcome */
        outcome: z.ZodEnum<["completed", "skipped", "abandoned", "timed_out"]>;
        /** Score if applicable (0-100) */
        score: z.ZodOptional<z.ZodNumber>;
        /** Number of attempts */
        attempts: z.ZodOptional<z.ZodNumber>;
        /** Mastery level achieved (0-1) */
        masteryLevel: z.ZodOptional<z.ZodNumber>;
        /** Time spent on-task vs total (ratio) */
        onTaskRatio: z.ZodOptional<z.ZodNumber>;
        completedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        durationMs?: number;
        activityId?: string;
        outcome?: "completed" | "skipped" | "abandoned" | "timed_out";
        score?: number;
        attempts?: number;
        masteryLevel?: number;
        onTaskRatio?: number;
        completedAt?: string;
    }, {
        learnerId?: string;
        sessionId?: string;
        durationMs?: number;
        activityId?: string;
        outcome?: "completed" | "skipped" | "abandoned" | "timed_out";
        score?: number;
        attempts?: number;
        masteryLevel?: number;
        onTaskRatio?: number;
        completedAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        durationMs?: number;
        activityId?: string;
        outcome?: "completed" | "skipped" | "abandoned" | "timed_out";
        score?: number;
        attempts?: number;
        masteryLevel?: number;
        onTaskRatio?: number;
        completedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "learning.activity.completed";
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
        durationMs?: number;
        activityId?: string;
        outcome?: "completed" | "skipped" | "abandoned" | "timed_out";
        score?: number;
        attempts?: number;
        masteryLevel?: number;
        onTaskRatio?: number;
        completedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "learning.activity.completed";
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
    eventType: z.ZodLiteral<"learning.skill.mastery_updated">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        learnerId: z.ZodString;
        skillId: z.ZodString;
        skillName: z.ZodString;
        /** Previous mastery level (0-1) */
        previousLevel: z.ZodNumber;
        /** New mastery level (0-1) */
        newLevel: z.ZodNumber;
        /** Change amount (can be negative for decay) */
        delta: z.ZodNumber;
        /** Reason for change */
        reason: z.ZodEnum<["activity_completion", "assessment_result", "time_decay", "teacher_override", "baseline_update"]>;
        /** Activity that triggered the change */
        triggerActivityId: z.ZodOptional<z.ZodString>;
        /** Evidence count for this skill */
        evidenceCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        reason?: "activity_completion" | "assessment_result" | "time_decay" | "teacher_override" | "baseline_update";
        skillId?: string;
        skillName?: string;
        previousLevel?: number;
        newLevel?: number;
        delta?: number;
        triggerActivityId?: string;
        evidenceCount?: number;
    }, {
        learnerId?: string;
        reason?: "activity_completion" | "assessment_result" | "time_decay" | "teacher_override" | "baseline_update";
        skillId?: string;
        skillName?: string;
        previousLevel?: number;
        newLevel?: number;
        delta?: number;
        triggerActivityId?: string;
        evidenceCount?: number;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        reason?: "activity_completion" | "assessment_result" | "time_decay" | "teacher_override" | "baseline_update";
        skillId?: string;
        skillName?: string;
        previousLevel?: number;
        newLevel?: number;
        delta?: number;
        triggerActivityId?: string;
        evidenceCount?: number;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "learning.skill.mastery_updated";
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
        reason?: "activity_completion" | "assessment_result" | "time_decay" | "teacher_override" | "baseline_update";
        skillId?: string;
        skillName?: string;
        previousLevel?: number;
        newLevel?: number;
        delta?: number;
        triggerActivityId?: string;
        evidenceCount?: number;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "learning.skill.mastery_updated";
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
    eventType: z.ZodLiteral<"learning.engagement.metric">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        /** Time window for this metric (ms) */
        windowMs: z.ZodNumber;
        /** Engagement score (0-100) */
        engagementScore: z.ZodNumber;
        /** Components of engagement */
        components: z.ZodObject<{
            /** Interaction rate (taps/clicks per minute) */
            interactionRate: z.ZodNumber;
            /** Time on task ratio */
            onTaskRatio: z.ZodNumber;
            /** Response latency factor */
            responsiveness: z.ZodNumber;
            /** Voluntary continuation factor */
            persistence: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            onTaskRatio?: number;
            interactionRate?: number;
            responsiveness?: number;
            persistence?: number;
        }, {
            onTaskRatio?: number;
            interactionRate?: number;
            responsiveness?: number;
            persistence?: number;
        }>;
        sampledAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        windowMs?: number;
        engagementScore?: number;
        components?: {
            onTaskRatio?: number;
            interactionRate?: number;
            responsiveness?: number;
            persistence?: number;
        };
        sampledAt?: string;
    }, {
        learnerId?: string;
        sessionId?: string;
        windowMs?: number;
        engagementScore?: number;
        components?: {
            onTaskRatio?: number;
            interactionRate?: number;
            responsiveness?: number;
            persistence?: number;
        };
        sampledAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        windowMs?: number;
        engagementScore?: number;
        components?: {
            onTaskRatio?: number;
            interactionRate?: number;
            responsiveness?: number;
            persistence?: number;
        };
        sampledAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "learning.engagement.metric";
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
        windowMs?: number;
        engagementScore?: number;
        components?: {
            onTaskRatio?: number;
            interactionRate?: number;
            responsiveness?: number;
            persistence?: number;
        };
        sampledAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "learning.engagement.metric";
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
export type LearningEvent = z.infer<typeof LearningEventSchema>;
export declare const LEARNING_EVENT_TYPES: {
    readonly SESSION_STARTED: "learning.session.started";
    readonly SESSION_ENDED: "learning.session.ended";
    readonly ACTIVITY_STARTED: "learning.activity.started";
    readonly ACTIVITY_COMPLETED: "learning.activity.completed";
    readonly SKILL_MASTERY_UPDATED: "learning.skill.mastery_updated";
    readonly ENGAGEMENT_METRIC: "learning.engagement.metric";
};
//# sourceMappingURL=learning.d.ts.map