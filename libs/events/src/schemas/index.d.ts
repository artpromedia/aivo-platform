export { BaseEventSchema, EventSourceSchema, EventEnvelopeSchema, GradeBandSchema, SessionOriginSchema, SessionTypeSchema, validateEvent, type BaseEvent, type EventSource, type EventEnvelope, type GradeBand, type SessionOrigin, type SessionType, type ValidationResult, } from './base.js';
export { LearningSessionStartedSchema, LearningSessionEndedSchema, ActivityStartedSchema, ActivityCompletedSchema, SkillMasteryUpdatedSchema, EngagementMetricSchema, LearningEventSchema, LEARNING_EVENT_TYPES, type LearningSessionStarted, type LearningSessionEnded, type ActivityStarted, type ActivityCompleted, type SkillMasteryUpdated, type EngagementMetric, type LearningEvent, } from './learning.js';
export { SelfReportedMoodSchema, FocusLossReasonSchema, FocusPingSchema, FocusSampleSchema, FocusLossSchema, FocusSessionSummarySchema, FocusEventSchema, FOCUS_EVENT_TYPES, type SelfReportedMood, type FocusLossReason, type FocusPing, type FocusSample, type FocusLoss, type FocusSessionSummary, type FocusEvent, } from './focus.js';
export { HomeworkQuestionTypeSchema, HomeworkSubjectSchema, HomeworkSessionStartedSchema, HomeworkSessionEndedSchema, HomeworkQuestionAskedSchema, HomeworkHintRequestedSchema, HomeworkHintDeliveredSchema, HomeworkSolutionAttemptedSchema, HomeworkQuestionCompletedSchema, HomeworkEventSchema, HOMEWORK_EVENT_TYPES, type HomeworkQuestionType, type HomeworkSubject, type HomeworkSessionStarted, type HomeworkSessionEnded, type HomeworkQuestionAsked, type HomeworkHintRequested, type HomeworkHintDelivered, type HomeworkSolutionAttempted, type HomeworkQuestionCompleted, type HomeworkEvent, } from './homework.js';
export { RecommendationTypeSchema, RecommendationStrategySchema, RecommendationCreatedSchema, RecommendationServedSchema, RecommendationClickedSchema, RecommendationDismissedSchema, RecommendationFeedbackSchema, RecommendationOutcomeSchema, RecommendationEventSchema, RECOMMENDATION_EVENT_TYPES, type RecommendationType, type RecommendationStrategy, type RecommendationCreated, type RecommendationServed, type RecommendationClicked, type RecommendationDismissed, type RecommendationFeedback, type RecommendationOutcome, type RecommendationEvent, } from './recommendation.js';
export { ContentPublishedSchema, ContentRetiredSchema, VersionCreatedSchema, VersionSubmittedSchema, VersionApprovedSchema, VersionChangesRequestedSchema, VersionRejectedSchema, IngestionStartedSchema, IngestionCompletedSchema, IngestionFailedSchema, CONTENT_EVENT_TYPES, type ContentPublished, type ContentRetired, type VersionCreated, type VersionSubmitted, type VersionApproved, type VersionChangesRequested, type VersionRejected, type IngestionStarted, type IngestionCompleted, type IngestionFailed, type ContentEvent, } from './content.js';
export { VendorApprovedEvent, VendorSuspendedEvent, PackPublishedEvent, PackDeprecatedEvent, LicenseCreatedEvent, LicenseActivatedEvent, LicenseSuspendedEvent, LicenseExpiredEvent, LicenseCanceledEvent, LicenseRenewedEvent, EntitlementAssignedEvent, EntitlementRevokedEvent, SeatAssignedEvent, SeatReleasedEvent, PartnerContentUsageEvent, EntitlementCheckFailedEvent, InstallationCreatedEvent, InstallationApprovedEvent, InstallationRevokedEvent, MarketplaceEvent, MARKETPLACE_SUBJECTS, } from './marketplace.js';
import { z } from 'zod';
/**
 * Union of all AIVO event types.
 */
export declare const AivoEventSchema: z.ZodUnion<[z.ZodDiscriminatedUnion<"eventType", [z.ZodObject<{
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
        deviceType: z.ZodOptional<z.ZodEnum<["mobile", "tablet", "desktop"]>>;
        initialActivityId: z.ZodOptional<z.ZodString>;
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
        durationMs: z.ZodNumber;
        endReason: z.ZodEnum<["completed", "user_exit", "timeout", "app_background", "connection_lost", "error"]>;
        summary: z.ZodObject<{
            activitiesStarted: z.ZodNumber;
            activitiesCompleted: z.ZodNumber;
            correctAnswers: z.ZodNumber;
            incorrectAnswers: z.ZodNumber;
            hintsUsed: z.ZodNumber;
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
        contentId: z.ZodString;
        skillId: z.ZodOptional<z.ZodString>;
        difficultyLevel: z.ZodOptional<z.ZodNumber>;
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
        durationMs: z.ZodNumber;
        outcome: z.ZodEnum<["completed", "skipped", "abandoned", "timed_out"]>;
        score: z.ZodOptional<z.ZodNumber>;
        attempts: z.ZodOptional<z.ZodNumber>;
        masteryLevel: z.ZodOptional<z.ZodNumber>;
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
        previousLevel: z.ZodNumber;
        newLevel: z.ZodNumber;
        delta: z.ZodNumber;
        reason: z.ZodEnum<["activity_completion", "assessment_result", "time_decay", "teacher_override", "baseline_update"]>;
        triggerActivityId: z.ZodOptional<z.ZodString>;
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
        windowMs: z.ZodNumber;
        engagementScore: z.ZodNumber;
        components: z.ZodObject<{
            interactionRate: z.ZodNumber;
            onTaskRatio: z.ZodNumber;
            responsiveness: z.ZodNumber;
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
}>]>, z.ZodDiscriminatedUnion<"eventType", [z.ZodObject<{
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
        idleMs: z.ZodNumber;
        appInBackground: z.ZodBoolean;
        selfReportedMood: z.ZodOptional<z.ZodEnum<["great", "good", "okay", "frustrated", "tired"]>>;
        rapidExit: z.ZodOptional<z.ZodBoolean>;
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
        windowMs: z.ZodNumber;
        pingCount: z.ZodNumber;
        avgIdleMs: z.ZodNumber;
        maxIdleMs: z.ZodNumber;
        backgroundMs: z.ZodNumber;
        focusScore: z.ZodNumber;
        trend: z.ZodNumber;
        gradeBand: z.ZodOptional<z.ZodEnum<["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]>>;
        windowStart: z.ZodString;
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
        reason: z.ZodEnum<["extended_idle", "rapid_switching", "self_reported_frustrated", "self_reported_tired", "app_background", "distraction_detected", "difficulty_spike", "engagement_drop"]>;
        focusScore: z.ZodNumber;
        lowFocusDurationMs: z.ZodNumber;
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
        sessionDurationMs: z.ZodNumber;
        totalPings: z.ZodNumber;
        avgFocusScore: z.ZodNumber;
        minFocusScore: z.ZodNumber;
        maxFocusScore: z.ZodNumber;
        focusScoreStdDev: z.ZodNumber;
        focusLossCount: z.ZodNumber;
        lowFocusMs: z.ZodNumber;
        backgroundMs: z.ZodNumber;
        lossReasons: z.ZodOptional<z.ZodRecord<z.ZodEnum<["extended_idle", "rapid_switching", "self_reported_frustrated", "self_reported_tired", "app_background", "distraction_detected", "difficulty_spike", "engagement_drop"]>, z.ZodNumber>>;
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
}>]>, z.ZodDiscriminatedUnion<"eventType", [z.ZodObject<{
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
    eventType: z.ZodLiteral<"homework.session.started">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        origin: z.ZodEnum<["MOBILE_LEARNER", "MOBILE_PARENT", "MOBILE_TEACHER", "WEB_LEARNER", "WEB_TEACHER", "WEB_AUTHOR", "WEB_ADMIN", "API"]>;
        gradeBand: z.ZodEnum<["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]>;
        assignmentId: z.ZodOptional<z.ZodString>;
        subject: z.ZodOptional<z.ZodEnum<["math", "science", "english", "history", "geography", "language_arts", "social_studies", "other"]>>;
        estimatedDifficulty: z.ZodOptional<z.ZodNumber>;
        startedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        origin?: "MOBILE_LEARNER" | "MOBILE_PARENT" | "MOBILE_TEACHER" | "WEB_LEARNER" | "WEB_TEACHER" | "WEB_AUTHOR" | "WEB_ADMIN" | "API";
        subject?: "math" | "science" | "english" | "history" | "geography" | "language_arts" | "social_studies" | "other";
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        startedAt?: string;
        assignmentId?: string;
        estimatedDifficulty?: number;
    }, {
        learnerId?: string;
        origin?: "MOBILE_LEARNER" | "MOBILE_PARENT" | "MOBILE_TEACHER" | "WEB_LEARNER" | "WEB_TEACHER" | "WEB_AUTHOR" | "WEB_ADMIN" | "API";
        subject?: "math" | "science" | "english" | "history" | "geography" | "language_arts" | "social_studies" | "other";
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        startedAt?: string;
        assignmentId?: string;
        estimatedDifficulty?: number;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        origin?: "MOBILE_LEARNER" | "MOBILE_PARENT" | "MOBILE_TEACHER" | "WEB_LEARNER" | "WEB_TEACHER" | "WEB_AUTHOR" | "WEB_ADMIN" | "API";
        subject?: "math" | "science" | "english" | "history" | "geography" | "language_arts" | "social_studies" | "other";
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        startedAt?: string;
        assignmentId?: string;
        estimatedDifficulty?: number;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "homework.session.started";
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
        subject?: "math" | "science" | "english" | "history" | "geography" | "language_arts" | "social_studies" | "other";
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        startedAt?: string;
        assignmentId?: string;
        estimatedDifficulty?: number;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "homework.session.started";
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
    eventType: z.ZodLiteral<"homework.session.ended">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        durationMs: z.ZodNumber;
        outcome: z.ZodEnum<["completed", "partial", "abandoned", "timeout"]>;
        summary: z.ZodObject<{
            questionsAsked: z.ZodNumber;
            hintsRequested: z.ZodNumber;
            solutionsViewed: z.ZodNumber;
            questionsCompleted: z.ZodNumber;
            avgTimePerQuestion: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            questionsAsked?: number;
            hintsRequested?: number;
            solutionsViewed?: number;
            questionsCompleted?: number;
            avgTimePerQuestion?: number;
        }, {
            questionsAsked?: number;
            hintsRequested?: number;
            solutionsViewed?: number;
            questionsCompleted?: number;
            avgTimePerQuestion?: number;
        }>;
        endedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        durationMs?: number;
        summary?: {
            questionsAsked?: number;
            hintsRequested?: number;
            solutionsViewed?: number;
            questionsCompleted?: number;
            avgTimePerQuestion?: number;
        };
        endedAt?: string;
        outcome?: "timeout" | "completed" | "abandoned" | "partial";
    }, {
        learnerId?: string;
        sessionId?: string;
        durationMs?: number;
        summary?: {
            questionsAsked?: number;
            hintsRequested?: number;
            solutionsViewed?: number;
            questionsCompleted?: number;
            avgTimePerQuestion?: number;
        };
        endedAt?: string;
        outcome?: "timeout" | "completed" | "abandoned" | "partial";
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        durationMs?: number;
        summary?: {
            questionsAsked?: number;
            hintsRequested?: number;
            solutionsViewed?: number;
            questionsCompleted?: number;
            avgTimePerQuestion?: number;
        };
        endedAt?: string;
        outcome?: "timeout" | "completed" | "abandoned" | "partial";
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "homework.session.ended";
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
        summary?: {
            questionsAsked?: number;
            hintsRequested?: number;
            solutionsViewed?: number;
            questionsCompleted?: number;
            avgTimePerQuestion?: number;
        };
        endedAt?: string;
        outcome?: "timeout" | "completed" | "abandoned" | "partial";
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "homework.session.ended";
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
    eventType: z.ZodLiteral<"homework.question.asked">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        questionId: z.ZodString;
        questionType: z.ZodEnum<["multiple_choice", "free_response", "math_expression", "diagram", "essay", "fill_in_blank", "matching", "ordering"]>;
        subject: z.ZodEnum<["math", "science", "english", "history", "geography", "language_arts", "social_studies", "other"]>;
        gradeBand: z.ZodEnum<["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]>;
        skillIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        hasImage: z.ZodBoolean;
        isVoiceInput: z.ZodBoolean;
        complexity: z.ZodOptional<z.ZodNumber>;
        sequenceNumber: z.ZodNumber;
        askedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        subject?: "math" | "science" | "english" | "history" | "geography" | "language_arts" | "social_studies" | "other";
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        sequenceNumber?: number;
        questionId?: string;
        questionType?: "multiple_choice" | "free_response" | "math_expression" | "diagram" | "essay" | "fill_in_blank" | "matching" | "ordering";
        skillIds?: string[];
        hasImage?: boolean;
        isVoiceInput?: boolean;
        complexity?: number;
        askedAt?: string;
    }, {
        learnerId?: string;
        subject?: "math" | "science" | "english" | "history" | "geography" | "language_arts" | "social_studies" | "other";
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        sequenceNumber?: number;
        questionId?: string;
        questionType?: "multiple_choice" | "free_response" | "math_expression" | "diagram" | "essay" | "fill_in_blank" | "matching" | "ordering";
        skillIds?: string[];
        hasImage?: boolean;
        isVoiceInput?: boolean;
        complexity?: number;
        askedAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        subject?: "math" | "science" | "english" | "history" | "geography" | "language_arts" | "social_studies" | "other";
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        sequenceNumber?: number;
        questionId?: string;
        questionType?: "multiple_choice" | "free_response" | "math_expression" | "diagram" | "essay" | "fill_in_blank" | "matching" | "ordering";
        skillIds?: string[];
        hasImage?: boolean;
        isVoiceInput?: boolean;
        complexity?: number;
        askedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "homework.question.asked";
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
        subject?: "math" | "science" | "english" | "history" | "geography" | "language_arts" | "social_studies" | "other";
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        sequenceNumber?: number;
        questionId?: string;
        questionType?: "multiple_choice" | "free_response" | "math_expression" | "diagram" | "essay" | "fill_in_blank" | "matching" | "ordering";
        skillIds?: string[];
        hasImage?: boolean;
        isVoiceInput?: boolean;
        complexity?: number;
        askedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "homework.question.asked";
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
    eventType: z.ZodLiteral<"homework.hint.requested">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        questionId: z.ZodString;
        hintLevel: z.ZodNumber;
        timeSinceQuestionMs: z.ZodNumber;
        attemptsBefore: z.ZodNumber;
        autoSuggested: z.ZodBoolean;
        requestedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        questionId?: string;
        hintLevel?: number;
        timeSinceQuestionMs?: number;
        attemptsBefore?: number;
        autoSuggested?: boolean;
        requestedAt?: string;
    }, {
        learnerId?: string;
        sessionId?: string;
        questionId?: string;
        hintLevel?: number;
        timeSinceQuestionMs?: number;
        attemptsBefore?: number;
        autoSuggested?: boolean;
        requestedAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        questionId?: string;
        hintLevel?: number;
        timeSinceQuestionMs?: number;
        attemptsBefore?: number;
        autoSuggested?: boolean;
        requestedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "homework.hint.requested";
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
        questionId?: string;
        hintLevel?: number;
        timeSinceQuestionMs?: number;
        attemptsBefore?: number;
        autoSuggested?: boolean;
        requestedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "homework.hint.requested";
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
    eventType: z.ZodLiteral<"homework.hint.delivered">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        questionId: z.ZodString;
        hintId: z.ZodString;
        hintLevel: z.ZodNumber;
        hintType: z.ZodEnum<["conceptual", "procedural", "example", "partial_answer", "error_correction"]>;
        generationLatencyMs: z.ZodNumber;
        deliveredAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        questionId?: string;
        hintLevel?: number;
        hintId?: string;
        hintType?: "conceptual" | "procedural" | "example" | "partial_answer" | "error_correction";
        generationLatencyMs?: number;
        deliveredAt?: string;
    }, {
        learnerId?: string;
        sessionId?: string;
        questionId?: string;
        hintLevel?: number;
        hintId?: string;
        hintType?: "conceptual" | "procedural" | "example" | "partial_answer" | "error_correction";
        generationLatencyMs?: number;
        deliveredAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        questionId?: string;
        hintLevel?: number;
        hintId?: string;
        hintType?: "conceptual" | "procedural" | "example" | "partial_answer" | "error_correction";
        generationLatencyMs?: number;
        deliveredAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "homework.hint.delivered";
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
        questionId?: string;
        hintLevel?: number;
        hintId?: string;
        hintType?: "conceptual" | "procedural" | "example" | "partial_answer" | "error_correction";
        generationLatencyMs?: number;
        deliveredAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "homework.hint.delivered";
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
    eventType: z.ZodLiteral<"homework.solution.attempted">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        questionId: z.ZodString;
        attemptNumber: z.ZodNumber;
        isCorrect: z.ZodBoolean;
        partialCredit: z.ZodOptional<z.ZodNumber>;
        timeSpentMs: z.ZodNumber;
        hintsUsed: z.ZodNumber;
        errorType: z.ZodOptional<z.ZodEnum<["conceptual", "computational", "careless", "incomplete", "formatting", "unknown"]>>;
        attemptedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        hintsUsed?: number;
        questionId?: string;
        attemptNumber?: number;
        isCorrect?: boolean;
        partialCredit?: number;
        timeSpentMs?: number;
        errorType?: "unknown" | "conceptual" | "computational" | "careless" | "incomplete" | "formatting";
        attemptedAt?: string;
    }, {
        learnerId?: string;
        sessionId?: string;
        hintsUsed?: number;
        questionId?: string;
        attemptNumber?: number;
        isCorrect?: boolean;
        partialCredit?: number;
        timeSpentMs?: number;
        errorType?: "unknown" | "conceptual" | "computational" | "careless" | "incomplete" | "formatting";
        attemptedAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        hintsUsed?: number;
        questionId?: string;
        attemptNumber?: number;
        isCorrect?: boolean;
        partialCredit?: number;
        timeSpentMs?: number;
        errorType?: "unknown" | "conceptual" | "computational" | "careless" | "incomplete" | "formatting";
        attemptedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "homework.solution.attempted";
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
        hintsUsed?: number;
        questionId?: string;
        attemptNumber?: number;
        isCorrect?: boolean;
        partialCredit?: number;
        timeSpentMs?: number;
        errorType?: "unknown" | "conceptual" | "computational" | "careless" | "incomplete" | "formatting";
        attemptedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "homework.solution.attempted";
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
    eventType: z.ZodLiteral<"homework.question.completed">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        questionId: z.ZodString;
        totalTimeMs: z.ZodNumber;
        totalAttempts: z.ZodNumber;
        totalHints: z.ZodNumber;
        outcome: z.ZodEnum<["correct", "partially_correct", "gave_up", "skipped", "timed_out"]>;
        solutionViewed: z.ZodBoolean;
        masteryDemonstrated: z.ZodOptional<z.ZodNumber>;
        completedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        outcome?: "skipped" | "timed_out" | "correct" | "partially_correct" | "gave_up";
        completedAt?: string;
        questionId?: string;
        totalTimeMs?: number;
        totalAttempts?: number;
        totalHints?: number;
        solutionViewed?: boolean;
        masteryDemonstrated?: number;
    }, {
        learnerId?: string;
        sessionId?: string;
        outcome?: "skipped" | "timed_out" | "correct" | "partially_correct" | "gave_up";
        completedAt?: string;
        questionId?: string;
        totalTimeMs?: number;
        totalAttempts?: number;
        totalHints?: number;
        solutionViewed?: boolean;
        masteryDemonstrated?: number;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        outcome?: "skipped" | "timed_out" | "correct" | "partially_correct" | "gave_up";
        completedAt?: string;
        questionId?: string;
        totalTimeMs?: number;
        totalAttempts?: number;
        totalHints?: number;
        solutionViewed?: boolean;
        masteryDemonstrated?: number;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "homework.question.completed";
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
        outcome?: "skipped" | "timed_out" | "correct" | "partially_correct" | "gave_up";
        completedAt?: string;
        questionId?: string;
        totalTimeMs?: number;
        totalAttempts?: number;
        totalHints?: number;
        solutionViewed?: boolean;
        masteryDemonstrated?: number;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "homework.question.completed";
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
}>]>, z.ZodDiscriminatedUnion<"eventType", [z.ZodObject<{
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
    eventType: z.ZodLiteral<"recommendation.created">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        recommendationId: z.ZodString;
        learnerId: z.ZodString;
        sessionId: z.ZodOptional<z.ZodString>;
        type: z.ZodEnum<["next_activity", "skill_practice", "review_content", "challenge_content", "remediation", "enrichment", "break_suggestion", "goal_suggestion"]>;
        strategy: z.ZodEnum<["knowledge_tracing", "collaborative_filtering", "content_based", "skill_gap", "spaced_repetition", "engagement_optimized", "difficulty_adjusted", "goal_aligned", "teacher_assigned", "baseline"]>;
        contentId: z.ZodString;
        contentType: z.ZodEnum<["activity", "lesson", "quiz", "video", "game", "reading"]>;
        relevanceScore: z.ZodNumber;
        difficultyMatch: z.ZodNumber;
        engagementPrediction: z.ZodNumber;
        position: z.ZodNumber;
        batchSize: z.ZodNumber;
        experimentVariant: z.ZodOptional<z.ZodString>;
        factors: z.ZodObject<{
            skillGap: z.ZodOptional<z.ZodNumber>;
            recency: z.ZodOptional<z.ZodNumber>;
            peerSuccess: z.ZodOptional<z.ZodNumber>;
            contentQuality: z.ZodOptional<z.ZodNumber>;
            goalAlignment: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            skillGap?: number;
            recency?: number;
            peerSuccess?: number;
            contentQuality?: number;
            goalAlignment?: number;
        }, {
            skillGap?: number;
            recency?: number;
            peerSuccess?: number;
            contentQuality?: number;
            goalAlignment?: number;
        }>;
        targetSkillIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        gradeBand: z.ZodOptional<z.ZodEnum<["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]>>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type?: "next_activity" | "skill_practice" | "review_content" | "challenge_content" | "remediation" | "enrichment" | "break_suggestion" | "goal_suggestion";
        learnerId?: string;
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        contentId?: string;
        recommendationId?: string;
        strategy?: "knowledge_tracing" | "collaborative_filtering" | "content_based" | "skill_gap" | "spaced_repetition" | "engagement_optimized" | "difficulty_adjusted" | "goal_aligned" | "teacher_assigned" | "baseline";
        contentType?: "lesson" | "quiz" | "game" | "video" | "reading" | "activity";
        relevanceScore?: number;
        difficultyMatch?: number;
        engagementPrediction?: number;
        position?: number;
        batchSize?: number;
        experimentVariant?: string;
        factors?: {
            skillGap?: number;
            recency?: number;
            peerSuccess?: number;
            contentQuality?: number;
            goalAlignment?: number;
        };
        targetSkillIds?: string[];
        createdAt?: string;
    }, {
        type?: "next_activity" | "skill_practice" | "review_content" | "challenge_content" | "remediation" | "enrichment" | "break_suggestion" | "goal_suggestion";
        learnerId?: string;
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        contentId?: string;
        recommendationId?: string;
        strategy?: "knowledge_tracing" | "collaborative_filtering" | "content_based" | "skill_gap" | "spaced_repetition" | "engagement_optimized" | "difficulty_adjusted" | "goal_aligned" | "teacher_assigned" | "baseline";
        contentType?: "lesson" | "quiz" | "game" | "video" | "reading" | "activity";
        relevanceScore?: number;
        difficultyMatch?: number;
        engagementPrediction?: number;
        position?: number;
        batchSize?: number;
        experimentVariant?: string;
        factors?: {
            skillGap?: number;
            recency?: number;
            peerSuccess?: number;
            contentQuality?: number;
            goalAlignment?: number;
        };
        targetSkillIds?: string[];
        createdAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        type?: "next_activity" | "skill_practice" | "review_content" | "challenge_content" | "remediation" | "enrichment" | "break_suggestion" | "goal_suggestion";
        learnerId?: string;
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        contentId?: string;
        recommendationId?: string;
        strategy?: "knowledge_tracing" | "collaborative_filtering" | "content_based" | "skill_gap" | "spaced_repetition" | "engagement_optimized" | "difficulty_adjusted" | "goal_aligned" | "teacher_assigned" | "baseline";
        contentType?: "lesson" | "quiz" | "game" | "video" | "reading" | "activity";
        relevanceScore?: number;
        difficultyMatch?: number;
        engagementPrediction?: number;
        position?: number;
        batchSize?: number;
        experimentVariant?: string;
        factors?: {
            skillGap?: number;
            recency?: number;
            peerSuccess?: number;
            contentQuality?: number;
            goalAlignment?: number;
        };
        targetSkillIds?: string[];
        createdAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.created";
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
        type?: "next_activity" | "skill_practice" | "review_content" | "challenge_content" | "remediation" | "enrichment" | "break_suggestion" | "goal_suggestion";
        learnerId?: string;
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        contentId?: string;
        recommendationId?: string;
        strategy?: "knowledge_tracing" | "collaborative_filtering" | "content_based" | "skill_gap" | "spaced_repetition" | "engagement_optimized" | "difficulty_adjusted" | "goal_aligned" | "teacher_assigned" | "baseline";
        contentType?: "lesson" | "quiz" | "game" | "video" | "reading" | "activity";
        relevanceScore?: number;
        difficultyMatch?: number;
        engagementPrediction?: number;
        position?: number;
        batchSize?: number;
        experimentVariant?: string;
        factors?: {
            skillGap?: number;
            recency?: number;
            peerSuccess?: number;
            contentQuality?: number;
            goalAlignment?: number;
        };
        targetSkillIds?: string[];
        createdAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.created";
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
    eventType: z.ZodLiteral<"recommendation.served">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        recommendationId: z.ZodString;
        learnerId: z.ZodString;
        sessionId: z.ZodOptional<z.ZodString>;
        displayPosition: z.ZodNumber;
        displayContext: z.ZodEnum<["home_feed", "post_activity", "search_results", "skill_page", "notification", "teacher_dashboard"]>;
        latencyMs: z.ZodNumber;
        viewportType: z.ZodOptional<z.ZodEnum<["mobile", "tablet", "desktop"]>>;
        servedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        displayPosition?: number;
        displayContext?: "home_feed" | "post_activity" | "search_results" | "skill_page" | "notification" | "teacher_dashboard";
        latencyMs?: number;
        viewportType?: "mobile" | "tablet" | "desktop";
        servedAt?: string;
    }, {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        displayPosition?: number;
        displayContext?: "home_feed" | "post_activity" | "search_results" | "skill_page" | "notification" | "teacher_dashboard";
        latencyMs?: number;
        viewportType?: "mobile" | "tablet" | "desktop";
        servedAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        displayPosition?: number;
        displayContext?: "home_feed" | "post_activity" | "search_results" | "skill_page" | "notification" | "teacher_dashboard";
        latencyMs?: number;
        viewportType?: "mobile" | "tablet" | "desktop";
        servedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.served";
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
        recommendationId?: string;
        displayPosition?: number;
        displayContext?: "home_feed" | "post_activity" | "search_results" | "skill_page" | "notification" | "teacher_dashboard";
        latencyMs?: number;
        viewportType?: "mobile" | "tablet" | "desktop";
        servedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.served";
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
    eventType: z.ZodLiteral<"recommendation.clicked">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        recommendationId: z.ZodString;
        learnerId: z.ZodString;
        sessionId: z.ZodOptional<z.ZodString>;
        dwellTimeMs: z.ZodNumber;
        firstInteraction: z.ZodBoolean;
        clickSource: z.ZodEnum<["tap", "keyboard", "voice", "auto_advance"]>;
        clickedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        dwellTimeMs?: number;
        firstInteraction?: boolean;
        clickSource?: "tap" | "keyboard" | "voice" | "auto_advance";
        clickedAt?: string;
    }, {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        dwellTimeMs?: number;
        firstInteraction?: boolean;
        clickSource?: "tap" | "keyboard" | "voice" | "auto_advance";
        clickedAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        dwellTimeMs?: number;
        firstInteraction?: boolean;
        clickSource?: "tap" | "keyboard" | "voice" | "auto_advance";
        clickedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.clicked";
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
        recommendationId?: string;
        dwellTimeMs?: number;
        firstInteraction?: boolean;
        clickSource?: "tap" | "keyboard" | "voice" | "auto_advance";
        clickedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.clicked";
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
    eventType: z.ZodLiteral<"recommendation.dismissed">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        recommendationId: z.ZodString;
        learnerId: z.ZodString;
        sessionId: z.ZodOptional<z.ZodString>;
        dismissMethod: z.ZodEnum<["swipe", "skip_button", "back_navigation", "timeout", "replaced"]>;
        dwellTimeMs: z.ZodNumber;
        reason: z.ZodOptional<z.ZodEnum<["not_interested", "too_easy", "too_hard", "already_know", "wrong_subject", "not_now", "none_given"]>>;
        dismissedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        reason?: "not_interested" | "too_easy" | "too_hard" | "already_know" | "wrong_subject" | "not_now" | "none_given";
        sessionId?: string;
        recommendationId?: string;
        dwellTimeMs?: number;
        dismissMethod?: "timeout" | "swipe" | "skip_button" | "back_navigation" | "replaced";
        dismissedAt?: string;
    }, {
        learnerId?: string;
        reason?: "not_interested" | "too_easy" | "too_hard" | "already_know" | "wrong_subject" | "not_now" | "none_given";
        sessionId?: string;
        recommendationId?: string;
        dwellTimeMs?: number;
        dismissMethod?: "timeout" | "swipe" | "skip_button" | "back_navigation" | "replaced";
        dismissedAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        reason?: "not_interested" | "too_easy" | "too_hard" | "already_know" | "wrong_subject" | "not_now" | "none_given";
        sessionId?: string;
        recommendationId?: string;
        dwellTimeMs?: number;
        dismissMethod?: "timeout" | "swipe" | "skip_button" | "back_navigation" | "replaced";
        dismissedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.dismissed";
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
        reason?: "not_interested" | "too_easy" | "too_hard" | "already_know" | "wrong_subject" | "not_now" | "none_given";
        sessionId?: string;
        recommendationId?: string;
        dwellTimeMs?: number;
        dismissMethod?: "timeout" | "swipe" | "skip_button" | "back_navigation" | "replaced";
        dismissedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.dismissed";
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
    eventType: z.ZodLiteral<"recommendation.feedback">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        recommendationId: z.ZodString;
        learnerId: z.ZodString;
        sessionId: z.ZodOptional<z.ZodString>;
        feedbackType: z.ZodEnum<["thumbs_up", "thumbs_down", "star_rating", "completion_rating"]>;
        ratingValue: z.ZodNumber;
        timeSinceStartMs: z.ZodNumber;
        activityOutcome: z.ZodOptional<z.ZodEnum<["completed", "in_progress", "abandoned"]>>;
        activityScore: z.ZodOptional<z.ZodNumber>;
        feedbackAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        feedbackType?: "thumbs_up" | "thumbs_down" | "star_rating" | "completion_rating";
        ratingValue?: number;
        timeSinceStartMs?: number;
        activityOutcome?: "completed" | "abandoned" | "in_progress";
        activityScore?: number;
        feedbackAt?: string;
    }, {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        feedbackType?: "thumbs_up" | "thumbs_down" | "star_rating" | "completion_rating";
        ratingValue?: number;
        timeSinceStartMs?: number;
        activityOutcome?: "completed" | "abandoned" | "in_progress";
        activityScore?: number;
        feedbackAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        feedbackType?: "thumbs_up" | "thumbs_down" | "star_rating" | "completion_rating";
        ratingValue?: number;
        timeSinceStartMs?: number;
        activityOutcome?: "completed" | "abandoned" | "in_progress";
        activityScore?: number;
        feedbackAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.feedback";
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
        recommendationId?: string;
        feedbackType?: "thumbs_up" | "thumbs_down" | "star_rating" | "completion_rating";
        ratingValue?: number;
        timeSinceStartMs?: number;
        activityOutcome?: "completed" | "abandoned" | "in_progress";
        activityScore?: number;
        feedbackAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.feedback";
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
    eventType: z.ZodLiteral<"recommendation.outcome">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        recommendationId: z.ZodString;
        learnerId: z.ZodString;
        sessionId: z.ZodOptional<z.ZodString>;
        wasAccepted: z.ZodBoolean;
        completionStatus: z.ZodEnum<["not_started", "in_progress", "completed", "abandoned"]>;
        timeSpentMs: z.ZodOptional<z.ZodNumber>;
        score: z.ZodOptional<z.ZodNumber>;
        engagementScore: z.ZodOptional<z.ZodNumber>;
        skillImprovement: z.ZodOptional<z.ZodNumber>;
        outcomeLabel: z.ZodEnum<["positive", "neutral", "negative"]>;
        recordedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        score?: number;
        engagementScore?: number;
        timeSpentMs?: number;
        recommendationId?: string;
        wasAccepted?: boolean;
        completionStatus?: "completed" | "abandoned" | "in_progress" | "not_started";
        skillImprovement?: number;
        outcomeLabel?: "positive" | "negative" | "neutral";
        recordedAt?: string;
    }, {
        learnerId?: string;
        sessionId?: string;
        score?: number;
        engagementScore?: number;
        timeSpentMs?: number;
        recommendationId?: string;
        wasAccepted?: boolean;
        completionStatus?: "completed" | "abandoned" | "in_progress" | "not_started";
        skillImprovement?: number;
        outcomeLabel?: "positive" | "negative" | "neutral";
        recordedAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        score?: number;
        engagementScore?: number;
        timeSpentMs?: number;
        recommendationId?: string;
        wasAccepted?: boolean;
        completionStatus?: "completed" | "abandoned" | "in_progress" | "not_started";
        skillImprovement?: number;
        outcomeLabel?: "positive" | "negative" | "neutral";
        recordedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.outcome";
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
        score?: number;
        engagementScore?: number;
        timeSpentMs?: number;
        recommendationId?: string;
        wasAccepted?: boolean;
        completionStatus?: "completed" | "abandoned" | "in_progress" | "not_started";
        skillImprovement?: number;
        outcomeLabel?: "positive" | "negative" | "neutral";
        recordedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.outcome";
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
}>]>, z.ZodDiscriminatedUnion<"eventType", [z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.vendor.approved">;
    data: z.ZodObject<{
        vendorId: z.ZodString;
        vendorSlug: z.ZodString;
        vendorName: z.ZodString;
        vendorType: z.ZodEnum<["AIVO", "THIRD_PARTY"]>;
        approvedByUserId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        vendorId?: string;
        vendorSlug?: string;
        vendorName?: string;
        vendorType?: "AIVO" | "THIRD_PARTY";
        approvedByUserId?: string;
    }, {
        vendorId?: string;
        vendorSlug?: string;
        vendorName?: string;
        vendorType?: "AIVO" | "THIRD_PARTY";
        approvedByUserId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.vendor.approved";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        vendorId?: string;
        vendorSlug?: string;
        vendorName?: string;
        vendorType?: "AIVO" | "THIRD_PARTY";
        approvedByUserId?: string;
    };
}, {
    eventType?: "marketplace.vendor.approved";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        vendorId?: string;
        vendorSlug?: string;
        vendorName?: string;
        vendorType?: "AIVO" | "THIRD_PARTY";
        approvedByUserId?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.vendor.suspended">;
    data: z.ZodObject<{
        vendorId: z.ZodString;
        vendorSlug: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
        suspendedByUserId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        reason?: string;
        vendorId?: string;
        vendorSlug?: string;
        suspendedByUserId?: string;
    }, {
        reason?: string;
        vendorId?: string;
        vendorSlug?: string;
        suspendedByUserId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.vendor.suspended";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        reason?: string;
        vendorId?: string;
        vendorSlug?: string;
        suspendedByUserId?: string;
    };
}, {
    eventType?: "marketplace.vendor.suspended";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        reason?: string;
        vendorId?: string;
        vendorSlug?: string;
        suspendedByUserId?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.pack.published">;
    data: z.ZodObject<{
        marketplaceItemId: z.ZodString;
        marketplaceItemSlug: z.ZodString;
        versionId: z.ZodString;
        version: z.ZodString;
        vendorId: z.ZodString;
        vendorSlug: z.ZodString;
        itemType: z.ZodEnum<["CONTENT_PACK", "EMBEDDED_TOOL"]>;
        subjects: z.ZodArray<z.ZodString, "many">;
        gradeBands: z.ZodArray<z.ZodString, "many">;
        safetyRating: z.ZodString;
        publishedByUserId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        versionId?: string;
        publishedByUserId?: string;
        vendorId?: string;
        vendorSlug?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        itemType?: "CONTENT_PACK" | "EMBEDDED_TOOL";
        subjects?: string[];
        gradeBands?: string[];
        safetyRating?: string;
    }, {
        version?: string;
        versionId?: string;
        publishedByUserId?: string;
        vendorId?: string;
        vendorSlug?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        itemType?: "CONTENT_PACK" | "EMBEDDED_TOOL";
        subjects?: string[];
        gradeBands?: string[];
        safetyRating?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.pack.published";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        version?: string;
        versionId?: string;
        publishedByUserId?: string;
        vendorId?: string;
        vendorSlug?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        itemType?: "CONTENT_PACK" | "EMBEDDED_TOOL";
        subjects?: string[];
        gradeBands?: string[];
        safetyRating?: string;
    };
}, {
    eventType?: "marketplace.pack.published";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        version?: string;
        versionId?: string;
        publishedByUserId?: string;
        vendorId?: string;
        vendorSlug?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        itemType?: "CONTENT_PACK" | "EMBEDDED_TOOL";
        subjects?: string[];
        gradeBands?: string[];
        safetyRating?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.pack.deprecated">;
    data: z.ZodObject<{
        marketplaceItemId: z.ZodString;
        marketplaceItemSlug: z.ZodString;
        versionId: z.ZodString;
        version: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
        deprecatedByUserId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        reason?: string;
        versionId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        deprecatedByUserId?: string;
    }, {
        version?: string;
        reason?: string;
        versionId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        deprecatedByUserId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.pack.deprecated";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        version?: string;
        reason?: string;
        versionId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        deprecatedByUserId?: string;
    };
}, {
    eventType?: "marketplace.pack.deprecated";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        version?: string;
        reason?: string;
        versionId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        deprecatedByUserId?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.license.created">;
    data: z.ZodObject<{
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        marketplaceItemSlug: z.ZodString;
        status: z.ZodEnum<["PENDING", "ACTIVE", "SUSPENDED", "EXPIRED", "CANCELED"]>;
        scopeType: z.ZodEnum<["TENANT", "SCHOOL", "GRADE_BAND", "CLASSROOM"]>;
        seatLimit: z.ZodNullable<z.ZodNumber>;
        validFrom: z.ZodString;
        validUntil: z.ZodNullable<z.ZodString>;
        licenseType: z.ZodEnum<["B2B_CONTRACT", "B2B_SUBSCRIPTION", "D2C_PARENT"]>;
        purchaserParentUserId: z.ZodNullable<z.ZodString>;
        billingSubscriptionId: z.ZodNullable<z.ZodString>;
        billingContractLineId: z.ZodNullable<z.ZodString>;
        createdByUserId: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status?: "ACTIVE" | "CANCELED" | "PENDING" | "SUSPENDED" | "EXPIRED";
        tenantId?: string;
        validFrom?: string;
        createdByUserId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        licenseId?: string;
        scopeType?: "TENANT" | "SCHOOL" | "GRADE_BAND" | "CLASSROOM";
        seatLimit?: number;
        validUntil?: string;
        licenseType?: "B2B_CONTRACT" | "B2B_SUBSCRIPTION" | "D2C_PARENT";
        purchaserParentUserId?: string;
        billingSubscriptionId?: string;
        billingContractLineId?: string;
    }, {
        status?: "ACTIVE" | "CANCELED" | "PENDING" | "SUSPENDED" | "EXPIRED";
        tenantId?: string;
        validFrom?: string;
        createdByUserId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        licenseId?: string;
        scopeType?: "TENANT" | "SCHOOL" | "GRADE_BAND" | "CLASSROOM";
        seatLimit?: number;
        validUntil?: string;
        licenseType?: "B2B_CONTRACT" | "B2B_SUBSCRIPTION" | "D2C_PARENT";
        purchaserParentUserId?: string;
        billingSubscriptionId?: string;
        billingContractLineId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.license.created";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        status?: "ACTIVE" | "CANCELED" | "PENDING" | "SUSPENDED" | "EXPIRED";
        tenantId?: string;
        validFrom?: string;
        createdByUserId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        licenseId?: string;
        scopeType?: "TENANT" | "SCHOOL" | "GRADE_BAND" | "CLASSROOM";
        seatLimit?: number;
        validUntil?: string;
        licenseType?: "B2B_CONTRACT" | "B2B_SUBSCRIPTION" | "D2C_PARENT";
        purchaserParentUserId?: string;
        billingSubscriptionId?: string;
        billingContractLineId?: string;
    };
}, {
    eventType?: "marketplace.license.created";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        status?: "ACTIVE" | "CANCELED" | "PENDING" | "SUSPENDED" | "EXPIRED";
        tenantId?: string;
        validFrom?: string;
        createdByUserId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        licenseId?: string;
        scopeType?: "TENANT" | "SCHOOL" | "GRADE_BAND" | "CLASSROOM";
        seatLimit?: number;
        validUntil?: string;
        licenseType?: "B2B_CONTRACT" | "B2B_SUBSCRIPTION" | "D2C_PARENT";
        purchaserParentUserId?: string;
        billingSubscriptionId?: string;
        billingContractLineId?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.license.activated">;
    data: z.ZodObject<{
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        previousStatus: z.ZodEnum<["PENDING", "SUSPENDED"]>;
        activatedByUserId: z.ZodNullable<z.ZodString>;
        activationSource: z.ZodEnum<["billing_webhook", "admin_action", "auto_activation"]>;
    }, "strip", z.ZodTypeAny, {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        previousStatus?: "PENDING" | "SUSPENDED";
        activatedByUserId?: string;
        activationSource?: "billing_webhook" | "admin_action" | "auto_activation";
    }, {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        previousStatus?: "PENDING" | "SUSPENDED";
        activatedByUserId?: string;
        activationSource?: "billing_webhook" | "admin_action" | "auto_activation";
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.license.activated";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        previousStatus?: "PENDING" | "SUSPENDED";
        activatedByUserId?: string;
        activationSource?: "billing_webhook" | "admin_action" | "auto_activation";
    };
}, {
    eventType?: "marketplace.license.activated";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        previousStatus?: "PENDING" | "SUSPENDED";
        activatedByUserId?: string;
        activationSource?: "billing_webhook" | "admin_action" | "auto_activation";
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.license.suspended">;
    data: z.ZodObject<{
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        reason: z.ZodString;
        suspendedByUserId: z.ZodNullable<z.ZodString>;
        suspensionSource: z.ZodEnum<["billing_webhook", "admin_action", "policy_violation"]>;
    }, "strip", z.ZodTypeAny, {
        tenantId?: string;
        reason?: string;
        suspendedByUserId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        suspensionSource?: "billing_webhook" | "admin_action" | "policy_violation";
    }, {
        tenantId?: string;
        reason?: string;
        suspendedByUserId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        suspensionSource?: "billing_webhook" | "admin_action" | "policy_violation";
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.license.suspended";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        reason?: string;
        suspendedByUserId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        suspensionSource?: "billing_webhook" | "admin_action" | "policy_violation";
    };
}, {
    eventType?: "marketplace.license.suspended";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        reason?: string;
        suspendedByUserId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        suspensionSource?: "billing_webhook" | "admin_action" | "policy_violation";
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.license.expired">;
    data: z.ZodObject<{
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        expiredAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        expiredAt?: string;
    }, {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        expiredAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.license.expired";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        expiredAt?: string;
    };
}, {
    eventType?: "marketplace.license.expired";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        expiredAt?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.license.canceled">;
    data: z.ZodObject<{
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
        canceledByUserId: z.ZodNullable<z.ZodString>;
        cancellationSource: z.ZodEnum<["billing_webhook", "admin_action", "tenant_request"]>;
    }, "strip", z.ZodTypeAny, {
        tenantId?: string;
        reason?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        canceledByUserId?: string;
        cancellationSource?: "billing_webhook" | "admin_action" | "tenant_request";
    }, {
        tenantId?: string;
        reason?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        canceledByUserId?: string;
        cancellationSource?: "billing_webhook" | "admin_action" | "tenant_request";
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.license.canceled";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        reason?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        canceledByUserId?: string;
        cancellationSource?: "billing_webhook" | "admin_action" | "tenant_request";
    };
}, {
    eventType?: "marketplace.license.canceled";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        reason?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        canceledByUserId?: string;
        cancellationSource?: "billing_webhook" | "admin_action" | "tenant_request";
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.license.renewed">;
    data: z.ZodObject<{
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        previousValidUntil: z.ZodNullable<z.ZodString>;
        newValidUntil: z.ZodNullable<z.ZodString>;
        renewedByUserId: z.ZodNullable<z.ZodString>;
        renewalSource: z.ZodEnum<["billing_webhook", "admin_action", "auto_renewal"]>;
    }, "strip", z.ZodTypeAny, {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        previousValidUntil?: string;
        newValidUntil?: string;
        renewedByUserId?: string;
        renewalSource?: "billing_webhook" | "admin_action" | "auto_renewal";
    }, {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        previousValidUntil?: string;
        newValidUntil?: string;
        renewedByUserId?: string;
        renewalSource?: "billing_webhook" | "admin_action" | "auto_renewal";
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.license.renewed";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        previousValidUntil?: string;
        newValidUntil?: string;
        renewedByUserId?: string;
        renewalSource?: "billing_webhook" | "admin_action" | "auto_renewal";
    };
}, {
    eventType?: "marketplace.license.renewed";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        previousValidUntil?: string;
        newValidUntil?: string;
        renewedByUserId?: string;
        renewalSource?: "billing_webhook" | "admin_action" | "auto_renewal";
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.entitlement.assigned">;
    data: z.ZodObject<{
        entitlementId: z.ZodString;
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        loId: z.ZodString;
        marketplaceItemId: z.ZodString;
        allowedGradeBands: z.ZodArray<z.ZodString, "many">;
        allowedSchoolIds: z.ZodArray<z.ZodString, "many">;
        assignedByUserId: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tenantId?: string;
        loId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        entitlementId?: string;
        allowedGradeBands?: string[];
        allowedSchoolIds?: string[];
        assignedByUserId?: string;
    }, {
        tenantId?: string;
        loId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        entitlementId?: string;
        allowedGradeBands?: string[];
        allowedSchoolIds?: string[];
        assignedByUserId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.entitlement.assigned";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        loId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        entitlementId?: string;
        allowedGradeBands?: string[];
        allowedSchoolIds?: string[];
        assignedByUserId?: string;
    };
}, {
    eventType?: "marketplace.entitlement.assigned";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        loId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        entitlementId?: string;
        allowedGradeBands?: string[];
        allowedSchoolIds?: string[];
        assignedByUserId?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.entitlement.revoked">;
    data: z.ZodObject<{
        entitlementId: z.ZodString;
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        loId: z.ZodString;
        reason: z.ZodString;
        revokedByUserId: z.ZodNullable<z.ZodString>;
        revocationSource: z.ZodEnum<["license_expired", "license_canceled", "admin_action", "scope_changed"]>;
    }, "strip", z.ZodTypeAny, {
        tenantId?: string;
        reason?: string;
        loId?: string;
        licenseId?: string;
        entitlementId?: string;
        revokedByUserId?: string;
        revocationSource?: "admin_action" | "license_expired" | "license_canceled" | "scope_changed";
    }, {
        tenantId?: string;
        reason?: string;
        loId?: string;
        licenseId?: string;
        entitlementId?: string;
        revokedByUserId?: string;
        revocationSource?: "admin_action" | "license_expired" | "license_canceled" | "scope_changed";
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.entitlement.revoked";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        reason?: string;
        loId?: string;
        licenseId?: string;
        entitlementId?: string;
        revokedByUserId?: string;
        revocationSource?: "admin_action" | "license_expired" | "license_canceled" | "scope_changed";
    };
}, {
    eventType?: "marketplace.entitlement.revoked";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        reason?: string;
        loId?: string;
        licenseId?: string;
        entitlementId?: string;
        revokedByUserId?: string;
        revocationSource?: "admin_action" | "license_expired" | "license_canceled" | "scope_changed";
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.seat.assigned">;
    data: z.ZodObject<{
        seatAssignmentId: z.ZodString;
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        learnerId: z.ZodString;
        marketplaceItemId: z.ZodString;
        schoolId: z.ZodNullable<z.ZodString>;
        classroomId: z.ZodNullable<z.ZodString>;
        seatsUsedAfter: z.ZodNumber;
        seatLimit: z.ZodNullable<z.ZodNumber>;
        assignedByUserId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        seatLimit?: number;
        assignedByUserId?: string;
        seatAssignmentId?: string;
        schoolId?: string;
        classroomId?: string;
        seatsUsedAfter?: number;
    }, {
        learnerId?: string;
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        seatLimit?: number;
        assignedByUserId?: string;
        seatAssignmentId?: string;
        schoolId?: string;
        classroomId?: string;
        seatsUsedAfter?: number;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.seat.assigned";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        learnerId?: string;
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        seatLimit?: number;
        assignedByUserId?: string;
        seatAssignmentId?: string;
        schoolId?: string;
        classroomId?: string;
        seatsUsedAfter?: number;
    };
}, {
    eventType?: "marketplace.seat.assigned";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        learnerId?: string;
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        seatLimit?: number;
        assignedByUserId?: string;
        seatAssignmentId?: string;
        schoolId?: string;
        classroomId?: string;
        seatsUsedAfter?: number;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.seat.released">;
    data: z.ZodObject<{
        seatAssignmentId: z.ZodString;
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        learnerId: z.ZodString;
        marketplaceItemId: z.ZodString;
        seatsUsedAfter: z.ZodNumber;
        releaseReason: z.ZodString;
        releasedByUserId: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        seatAssignmentId?: string;
        seatsUsedAfter?: number;
        releaseReason?: string;
        releasedByUserId?: string;
    }, {
        learnerId?: string;
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        seatAssignmentId?: string;
        seatsUsedAfter?: number;
        releaseReason?: string;
        releasedByUserId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.seat.released";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        learnerId?: string;
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        seatAssignmentId?: string;
        seatsUsedAfter?: number;
        releaseReason?: string;
        releasedByUserId?: string;
    };
}, {
    eventType?: "marketplace.seat.released";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        learnerId?: string;
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        seatAssignmentId?: string;
        seatsUsedAfter?: number;
        releaseReason?: string;
        releasedByUserId?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.pack.usage">;
    data: z.ZodObject<{
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        vendorId: z.ZodString;
        loId: z.ZodString;
        learnerId: z.ZodString;
        sessionId: z.ZodString;
        schoolId: z.ZodNullable<z.ZodString>;
        classroomId: z.ZodNullable<z.ZodString>;
        subject: z.ZodString;
        gradeBand: z.ZodString;
        durationSeconds: z.ZodNumber;
        completedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        tenantId?: string;
        subject?: string;
        sessionId?: string;
        gradeBand?: string;
        completedAt?: string;
        loId?: string;
        vendorId?: string;
        marketplaceItemId?: string;
        schoolId?: string;
        classroomId?: string;
        durationSeconds?: number;
    }, {
        learnerId?: string;
        tenantId?: string;
        subject?: string;
        sessionId?: string;
        gradeBand?: string;
        completedAt?: string;
        loId?: string;
        vendorId?: string;
        marketplaceItemId?: string;
        schoolId?: string;
        classroomId?: string;
        durationSeconds?: number;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.pack.usage";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        learnerId?: string;
        tenantId?: string;
        subject?: string;
        sessionId?: string;
        gradeBand?: string;
        completedAt?: string;
        loId?: string;
        vendorId?: string;
        marketplaceItemId?: string;
        schoolId?: string;
        classroomId?: string;
        durationSeconds?: number;
    };
}, {
    eventType?: "marketplace.pack.usage";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        learnerId?: string;
        tenantId?: string;
        subject?: string;
        sessionId?: string;
        gradeBand?: string;
        completedAt?: string;
        loId?: string;
        vendorId?: string;
        marketplaceItemId?: string;
        schoolId?: string;
        classroomId?: string;
        durationSeconds?: number;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.entitlement.check_failed">;
    data: z.ZodObject<{
        tenantId: z.ZodString;
        loId: z.ZodNullable<z.ZodString>;
        marketplaceItemId: z.ZodNullable<z.ZodString>;
        learnerId: z.ZodNullable<z.ZodString>;
        schoolId: z.ZodNullable<z.ZodString>;
        classroomId: z.ZodNullable<z.ZodString>;
        failureReason: z.ZodEnum<["NO_LICENSE", "LICENSE_EXPIRED", "LICENSE_SUSPENDED", "SCOPE_MISMATCH", "SEAT_LIMIT_EXCEEDED", "LEARNER_NOT_COVERED"]>;
        requestedByService: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        tenantId?: string;
        loId?: string;
        marketplaceItemId?: string;
        schoolId?: string;
        classroomId?: string;
        failureReason?: "NO_LICENSE" | "LICENSE_EXPIRED" | "LICENSE_SUSPENDED" | "SCOPE_MISMATCH" | "SEAT_LIMIT_EXCEEDED" | "LEARNER_NOT_COVERED";
        requestedByService?: string;
    }, {
        learnerId?: string;
        tenantId?: string;
        loId?: string;
        marketplaceItemId?: string;
        schoolId?: string;
        classroomId?: string;
        failureReason?: "NO_LICENSE" | "LICENSE_EXPIRED" | "LICENSE_SUSPENDED" | "SCOPE_MISMATCH" | "SEAT_LIMIT_EXCEEDED" | "LEARNER_NOT_COVERED";
        requestedByService?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.entitlement.check_failed";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        learnerId?: string;
        tenantId?: string;
        loId?: string;
        marketplaceItemId?: string;
        schoolId?: string;
        classroomId?: string;
        failureReason?: "NO_LICENSE" | "LICENSE_EXPIRED" | "LICENSE_SUSPENDED" | "SCOPE_MISMATCH" | "SEAT_LIMIT_EXCEEDED" | "LEARNER_NOT_COVERED";
        requestedByService?: string;
    };
}, {
    eventType?: "marketplace.entitlement.check_failed";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        learnerId?: string;
        tenantId?: string;
        loId?: string;
        marketplaceItemId?: string;
        schoolId?: string;
        classroomId?: string;
        failureReason?: "NO_LICENSE" | "LICENSE_EXPIRED" | "LICENSE_SUSPENDED" | "SCOPE_MISMATCH" | "SEAT_LIMIT_EXCEEDED" | "LEARNER_NOT_COVERED";
        requestedByService?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.installation.created">;
    data: z.ZodObject<{
        installationId: z.ZodString;
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        marketplaceItemSlug: z.ZodString;
        versionId: z.ZodString;
        schoolId: z.ZodNullable<z.ZodString>;
        classroomId: z.ZodNullable<z.ZodString>;
        status: z.ZodEnum<["PENDING_APPROVAL", "ACTIVE", "DISABLED", "REVOKED"]>;
        installedByUserId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status?: "ACTIVE" | "PENDING_APPROVAL" | "DISABLED" | "REVOKED";
        tenantId?: string;
        versionId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        schoolId?: string;
        classroomId?: string;
        installationId?: string;
        installedByUserId?: string;
    }, {
        status?: "ACTIVE" | "PENDING_APPROVAL" | "DISABLED" | "REVOKED";
        tenantId?: string;
        versionId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        schoolId?: string;
        classroomId?: string;
        installationId?: string;
        installedByUserId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.installation.created";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        status?: "ACTIVE" | "PENDING_APPROVAL" | "DISABLED" | "REVOKED";
        tenantId?: string;
        versionId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        schoolId?: string;
        classroomId?: string;
        installationId?: string;
        installedByUserId?: string;
    };
}, {
    eventType?: "marketplace.installation.created";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        status?: "ACTIVE" | "PENDING_APPROVAL" | "DISABLED" | "REVOKED";
        tenantId?: string;
        versionId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        schoolId?: string;
        classroomId?: string;
        installationId?: string;
        installedByUserId?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.installation.approved">;
    data: z.ZodObject<{
        installationId: z.ZodString;
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        approvedByUserId: z.ZodString;
        approvalNotes: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tenantId?: string;
        approvedByUserId?: string;
        marketplaceItemId?: string;
        installationId?: string;
        approvalNotes?: string;
    }, {
        tenantId?: string;
        approvedByUserId?: string;
        marketplaceItemId?: string;
        installationId?: string;
        approvalNotes?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.installation.approved";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        approvedByUserId?: string;
        marketplaceItemId?: string;
        installationId?: string;
        approvalNotes?: string;
    };
}, {
    eventType?: "marketplace.installation.approved";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        approvedByUserId?: string;
        marketplaceItemId?: string;
        installationId?: string;
        approvalNotes?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.installation.revoked">;
    data: z.ZodObject<{
        installationId: z.ZodString;
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        reason: z.ZodString;
        revokedByUserId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        tenantId?: string;
        reason?: string;
        marketplaceItemId?: string;
        revokedByUserId?: string;
        installationId?: string;
    }, {
        tenantId?: string;
        reason?: string;
        marketplaceItemId?: string;
        revokedByUserId?: string;
        installationId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.installation.revoked";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        reason?: string;
        marketplaceItemId?: string;
        revokedByUserId?: string;
        installationId?: string;
    };
}, {
    eventType?: "marketplace.installation.revoked";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        reason?: string;
        marketplaceItemId?: string;
        revokedByUserId?: string;
        installationId?: string;
    };
}>]>]>;
export type AivoEvent = z.infer<typeof AivoEventSchema>;
/**
 * Maps event type prefixes to JetStream stream names.
 */
export declare const EVENT_STREAM_MAP: Record<string, string>;
/**
 * Gets the JetStream stream name for an event type.
 */
export declare function getStreamForEventType(eventType: string): string;
/**
 * Gets the NATS subject for an event type.
 */
export declare function getSubjectForEventType(eventType: string): string;
//# sourceMappingURL=index.d.ts.map