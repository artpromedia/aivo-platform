/**
 * Learning Event Schemas
 *
 * Events related to learning activities, sessions, and answers.
 * All events include tenantId for multi-tenant isolation.
 *
 * @module @aivo/ts-types/events/learning
 */
import { z } from 'zod';
/**
 * Subject areas supported by the platform
 */
export declare const SubjectSchema: z.ZodEnum<["ELA", "MATH", "SEL", "SPEECH", "SCIENCE"]>;
export type Subject = z.infer<typeof SubjectSchema>;
/**
 * Types of learning sessions
 */
export declare const SessionTypeSchema: z.ZodEnum<["LESSON", "PRACTICE", "ASSESSMENT", "HOMEWORK_HELP"]>;
export type SessionType = z.infer<typeof SessionTypeSchema>;
/**
 * Reasons a session can end
 */
export declare const SessionEndReasonSchema: z.ZodEnum<["COMPLETED", "TIMEOUT", "USER_EXIT", "FOCUS_BREAK", "ERROR"]>;
export type SessionEndReason = z.infer<typeof SessionEndReasonSchema>;
/**
 * Activity Completed Event
 *
 * Emitted when a learner completes a learning activity (question, exercise, etc.)
 */
export declare const ActivityCompletedEventSchema: z.ZodObject<{
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
        /** Learner who completed the activity */
        learnerId: z.ZodString;
        /** Session in which activity was completed */
        sessionId: z.ZodString;
        /** Unique activity identifier */
        activityId: z.ZodString;
        /** Subject area */
        subject: z.ZodEnum<["ELA", "MATH", "SEL", "SPEECH", "SCIENCE"]>;
        /** Type of activity (e.g., 'multiple-choice', 'drag-drop', 'speech') */
        activityType: z.ZodString;
        /** Difficulty level (e.g., 'L1', 'L2', 'L3') */
        difficulty: z.ZodString;
        /** Whether the answer was correct (if applicable) */
        correct: z.ZodOptional<z.ZodBoolean>;
        /** Score achieved (0-100, if applicable) */
        score: z.ZodOptional<z.ZodNumber>;
        /** Time taken to complete in milliseconds */
        latencyMs: z.ZodNumber;
        /** Accommodations that were active during activity */
        accommodationsActive: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        difficulty?: string;
        subject?: "ELA" | "MATH" | "SCIENCE" | "SEL" | "SPEECH";
        learnerId?: string;
        sessionId?: string;
        activityId?: string;
        activityType?: string;
        correct?: boolean;
        score?: number;
        latencyMs?: number;
        accommodationsActive?: string[];
    }, {
        difficulty?: string;
        subject?: "ELA" | "MATH" | "SCIENCE" | "SEL" | "SPEECH";
        learnerId?: string;
        sessionId?: string;
        activityId?: string;
        activityType?: string;
        correct?: boolean;
        score?: number;
        latencyMs?: number;
        accommodationsActive?: string[];
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
        difficulty?: string;
        subject?: "ELA" | "MATH" | "SCIENCE" | "SEL" | "SPEECH";
        learnerId?: string;
        sessionId?: string;
        activityId?: string;
        activityType?: string;
        correct?: boolean;
        score?: number;
        latencyMs?: number;
        accommodationsActive?: string[];
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
        difficulty?: string;
        subject?: "ELA" | "MATH" | "SCIENCE" | "SEL" | "SPEECH";
        learnerId?: string;
        sessionId?: string;
        activityId?: string;
        activityType?: string;
        correct?: boolean;
        score?: number;
        latencyMs?: number;
        accommodationsActive?: string[];
    };
}>;
export type ActivityCompletedEvent = z.infer<typeof ActivityCompletedEventSchema>;
/**
 * Answer Submitted Event
 *
 * Emitted when a learner submits an answer to a question.
 * More granular than ActivityCompleted - tracks each attempt.
 */
export declare const AnswerSubmittedEventSchema: z.ZodObject<{
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
        /** Learner who submitted the answer */
        learnerId: z.ZodString;
        /** Session in which answer was submitted */
        sessionId: z.ZodString;
        /** Activity containing the question */
        activityId: z.ZodString;
        /** Specific question identifier */
        questionId: z.ZodString;
        /** The submitted answer value (flexible for different question types) */
        answerValue: z.ZodUnknown;
        /** Whether the answer was correct */
        correct: z.ZodBoolean;
        /** Time taken to submit in milliseconds */
        latencyMs: z.ZodNumber;
        /** Which attempt this is (1 = first try) */
        attemptNumber: z.ZodNumber;
        /** Number of hints used before submitting */
        hintsUsed: z.ZodDefault<z.ZodNumber>;
        /** Level of scaffolding provided (0 = none, 3 = maximum) */
        scaffoldingLevel: z.ZodDefault<z.ZodNumber>;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        activityId?: string;
        correct?: boolean;
        latencyMs?: number;
        questionId?: string;
        answerValue?: unknown;
        attemptNumber?: number;
        hintsUsed?: number;
        scaffoldingLevel?: number;
    }, {
        learnerId?: string;
        sessionId?: string;
        activityId?: string;
        correct?: boolean;
        latencyMs?: number;
        questionId?: string;
        answerValue?: unknown;
        attemptNumber?: number;
        hintsUsed?: number;
        scaffoldingLevel?: number;
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
        activityId?: string;
        correct?: boolean;
        latencyMs?: number;
        questionId?: string;
        answerValue?: unknown;
        attemptNumber?: number;
        hintsUsed?: number;
        scaffoldingLevel?: number;
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
        activityId?: string;
        correct?: boolean;
        latencyMs?: number;
        questionId?: string;
        answerValue?: unknown;
        attemptNumber?: number;
        hintsUsed?: number;
        scaffoldingLevel?: number;
    };
}>;
export type AnswerSubmittedEvent = z.infer<typeof AnswerSubmittedEventSchema>;
/**
 * Session Started Event
 *
 * Emitted when a learner begins a learning session.
 */
export declare const SessionStartedEventSchema: z.ZodObject<{
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
        /** Learner who started the session */
        learnerId: z.ZodString;
        /** Unique session identifier */
        sessionId: z.ZodString;
        /** Type of session */
        sessionType: z.ZodEnum<["LESSON", "PRACTICE", "ASSESSMENT", "HOMEWORK_HELP"]>;
        /** Activities planned for this session */
        plannedActivities: z.ZodArray<z.ZodString, "many">;
        /** Expected duration in minutes */
        plannedDurationMinutes: z.ZodNumber;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        sessionType?: "LESSON" | "ASSESSMENT" | "PRACTICE" | "HOMEWORK_HELP";
        plannedActivities?: string[];
        plannedDurationMinutes?: number;
    }, {
        learnerId?: string;
        sessionId?: string;
        sessionType?: "LESSON" | "ASSESSMENT" | "PRACTICE" | "HOMEWORK_HELP";
        plannedActivities?: string[];
        plannedDurationMinutes?: number;
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
        sessionType?: "LESSON" | "ASSESSMENT" | "PRACTICE" | "HOMEWORK_HELP";
        plannedActivities?: string[];
        plannedDurationMinutes?: number;
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
        sessionType?: "LESSON" | "ASSESSMENT" | "PRACTICE" | "HOMEWORK_HELP";
        plannedActivities?: string[];
        plannedDurationMinutes?: number;
    };
}>;
export type SessionStartedEvent = z.infer<typeof SessionStartedEventSchema>;
/**
 * Session Completed Event
 *
 * Emitted when a learning session ends (for any reason).
 */
export declare const SessionCompletedEventSchema: z.ZodObject<{
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
        /** Learner who completed the session */
        learnerId: z.ZodString;
        /** Session identifier */
        sessionId: z.ZodString;
        /** Actual time spent in session (minutes) */
        actualDurationMinutes: z.ZodNumber;
        /** Number of activities completed */
        activitiesCompleted: z.ZodNumber;
        /** Number of activities skipped */
        activitiesSkipped: z.ZodNumber;
        /** Average score across completed activities (if applicable) */
        averageScore: z.ZodOptional<z.ZodNumber>;
        /** Number of focus interventions triggered during session */
        focusInterventions: z.ZodDefault<z.ZodNumber>;
        /** Why the session ended */
        endReason: z.ZodEnum<["COMPLETED", "TIMEOUT", "USER_EXIT", "FOCUS_BREAK", "ERROR"]>;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        actualDurationMinutes?: number;
        activitiesCompleted?: number;
        activitiesSkipped?: number;
        averageScore?: number;
        focusInterventions?: number;
        endReason?: "ERROR" | "COMPLETED" | "TIMEOUT" | "USER_EXIT" | "FOCUS_BREAK";
    }, {
        learnerId?: string;
        sessionId?: string;
        actualDurationMinutes?: number;
        activitiesCompleted?: number;
        activitiesSkipped?: number;
        averageScore?: number;
        focusInterventions?: number;
        endReason?: "ERROR" | "COMPLETED" | "TIMEOUT" | "USER_EXIT" | "FOCUS_BREAK";
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
        actualDurationMinutes?: number;
        activitiesCompleted?: number;
        activitiesSkipped?: number;
        averageScore?: number;
        focusInterventions?: number;
        endReason?: "ERROR" | "COMPLETED" | "TIMEOUT" | "USER_EXIT" | "FOCUS_BREAK";
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
        actualDurationMinutes?: number;
        activitiesCompleted?: number;
        activitiesSkipped?: number;
        averageScore?: number;
        focusInterventions?: number;
        endReason?: "ERROR" | "COMPLETED" | "TIMEOUT" | "USER_EXIT" | "FOCUS_BREAK";
    };
}>;
export type SessionCompletedEvent = z.infer<typeof SessionCompletedEventSchema>;
/**
 * Union of all learning event schemas for type guards
 */
export declare const LearningEventSchemas: readonly [z.ZodObject<{
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
        /** Learner who completed the activity */
        learnerId: z.ZodString;
        /** Session in which activity was completed */
        sessionId: z.ZodString;
        /** Unique activity identifier */
        activityId: z.ZodString;
        /** Subject area */
        subject: z.ZodEnum<["ELA", "MATH", "SEL", "SPEECH", "SCIENCE"]>;
        /** Type of activity (e.g., 'multiple-choice', 'drag-drop', 'speech') */
        activityType: z.ZodString;
        /** Difficulty level (e.g., 'L1', 'L2', 'L3') */
        difficulty: z.ZodString;
        /** Whether the answer was correct (if applicable) */
        correct: z.ZodOptional<z.ZodBoolean>;
        /** Score achieved (0-100, if applicable) */
        score: z.ZodOptional<z.ZodNumber>;
        /** Time taken to complete in milliseconds */
        latencyMs: z.ZodNumber;
        /** Accommodations that were active during activity */
        accommodationsActive: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        difficulty?: string;
        subject?: "ELA" | "MATH" | "SCIENCE" | "SEL" | "SPEECH";
        learnerId?: string;
        sessionId?: string;
        activityId?: string;
        activityType?: string;
        correct?: boolean;
        score?: number;
        latencyMs?: number;
        accommodationsActive?: string[];
    }, {
        difficulty?: string;
        subject?: "ELA" | "MATH" | "SCIENCE" | "SEL" | "SPEECH";
        learnerId?: string;
        sessionId?: string;
        activityId?: string;
        activityType?: string;
        correct?: boolean;
        score?: number;
        latencyMs?: number;
        accommodationsActive?: string[];
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
        difficulty?: string;
        subject?: "ELA" | "MATH" | "SCIENCE" | "SEL" | "SPEECH";
        learnerId?: string;
        sessionId?: string;
        activityId?: string;
        activityType?: string;
        correct?: boolean;
        score?: number;
        latencyMs?: number;
        accommodationsActive?: string[];
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
        difficulty?: string;
        subject?: "ELA" | "MATH" | "SCIENCE" | "SEL" | "SPEECH";
        learnerId?: string;
        sessionId?: string;
        activityId?: string;
        activityType?: string;
        correct?: boolean;
        score?: number;
        latencyMs?: number;
        accommodationsActive?: string[];
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
        /** Learner who submitted the answer */
        learnerId: z.ZodString;
        /** Session in which answer was submitted */
        sessionId: z.ZodString;
        /** Activity containing the question */
        activityId: z.ZodString;
        /** Specific question identifier */
        questionId: z.ZodString;
        /** The submitted answer value (flexible for different question types) */
        answerValue: z.ZodUnknown;
        /** Whether the answer was correct */
        correct: z.ZodBoolean;
        /** Time taken to submit in milliseconds */
        latencyMs: z.ZodNumber;
        /** Which attempt this is (1 = first try) */
        attemptNumber: z.ZodNumber;
        /** Number of hints used before submitting */
        hintsUsed: z.ZodDefault<z.ZodNumber>;
        /** Level of scaffolding provided (0 = none, 3 = maximum) */
        scaffoldingLevel: z.ZodDefault<z.ZodNumber>;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        activityId?: string;
        correct?: boolean;
        latencyMs?: number;
        questionId?: string;
        answerValue?: unknown;
        attemptNumber?: number;
        hintsUsed?: number;
        scaffoldingLevel?: number;
    }, {
        learnerId?: string;
        sessionId?: string;
        activityId?: string;
        correct?: boolean;
        latencyMs?: number;
        questionId?: string;
        answerValue?: unknown;
        attemptNumber?: number;
        hintsUsed?: number;
        scaffoldingLevel?: number;
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
        activityId?: string;
        correct?: boolean;
        latencyMs?: number;
        questionId?: string;
        answerValue?: unknown;
        attemptNumber?: number;
        hintsUsed?: number;
        scaffoldingLevel?: number;
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
        activityId?: string;
        correct?: boolean;
        latencyMs?: number;
        questionId?: string;
        answerValue?: unknown;
        attemptNumber?: number;
        hintsUsed?: number;
        scaffoldingLevel?: number;
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
        /** Learner who started the session */
        learnerId: z.ZodString;
        /** Unique session identifier */
        sessionId: z.ZodString;
        /** Type of session */
        sessionType: z.ZodEnum<["LESSON", "PRACTICE", "ASSESSMENT", "HOMEWORK_HELP"]>;
        /** Activities planned for this session */
        plannedActivities: z.ZodArray<z.ZodString, "many">;
        /** Expected duration in minutes */
        plannedDurationMinutes: z.ZodNumber;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        sessionType?: "LESSON" | "ASSESSMENT" | "PRACTICE" | "HOMEWORK_HELP";
        plannedActivities?: string[];
        plannedDurationMinutes?: number;
    }, {
        learnerId?: string;
        sessionId?: string;
        sessionType?: "LESSON" | "ASSESSMENT" | "PRACTICE" | "HOMEWORK_HELP";
        plannedActivities?: string[];
        plannedDurationMinutes?: number;
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
        sessionType?: "LESSON" | "ASSESSMENT" | "PRACTICE" | "HOMEWORK_HELP";
        plannedActivities?: string[];
        plannedDurationMinutes?: number;
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
        sessionType?: "LESSON" | "ASSESSMENT" | "PRACTICE" | "HOMEWORK_HELP";
        plannedActivities?: string[];
        plannedDurationMinutes?: number;
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
        /** Learner who completed the session */
        learnerId: z.ZodString;
        /** Session identifier */
        sessionId: z.ZodString;
        /** Actual time spent in session (minutes) */
        actualDurationMinutes: z.ZodNumber;
        /** Number of activities completed */
        activitiesCompleted: z.ZodNumber;
        /** Number of activities skipped */
        activitiesSkipped: z.ZodNumber;
        /** Average score across completed activities (if applicable) */
        averageScore: z.ZodOptional<z.ZodNumber>;
        /** Number of focus interventions triggered during session */
        focusInterventions: z.ZodDefault<z.ZodNumber>;
        /** Why the session ended */
        endReason: z.ZodEnum<["COMPLETED", "TIMEOUT", "USER_EXIT", "FOCUS_BREAK", "ERROR"]>;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        actualDurationMinutes?: number;
        activitiesCompleted?: number;
        activitiesSkipped?: number;
        averageScore?: number;
        focusInterventions?: number;
        endReason?: "ERROR" | "COMPLETED" | "TIMEOUT" | "USER_EXIT" | "FOCUS_BREAK";
    }, {
        learnerId?: string;
        sessionId?: string;
        actualDurationMinutes?: number;
        activitiesCompleted?: number;
        activitiesSkipped?: number;
        averageScore?: number;
        focusInterventions?: number;
        endReason?: "ERROR" | "COMPLETED" | "TIMEOUT" | "USER_EXIT" | "FOCUS_BREAK";
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
        actualDurationMinutes?: number;
        activitiesCompleted?: number;
        activitiesSkipped?: number;
        averageScore?: number;
        focusInterventions?: number;
        endReason?: "ERROR" | "COMPLETED" | "TIMEOUT" | "USER_EXIT" | "FOCUS_BREAK";
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
        actualDurationMinutes?: number;
        activitiesCompleted?: number;
        activitiesSkipped?: number;
        averageScore?: number;
        focusInterventions?: number;
        endReason?: "ERROR" | "COMPLETED" | "TIMEOUT" | "USER_EXIT" | "FOCUS_BREAK";
    };
}>];
/**
 * Learning event type literals
 */
export declare const LEARNING_EVENT_TYPES: readonly ["learning.activity.completed", "learning.answer.submitted", "learning.session.started", "learning.session.completed"];
export type LearningEventType = (typeof LEARNING_EVENT_TYPES)[number];
//# sourceMappingURL=learning.d.ts.map