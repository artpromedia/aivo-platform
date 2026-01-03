import { z } from 'zod';
export declare const HomeworkQuestionTypeSchema: z.ZodEnum<["multiple_choice", "free_response", "math_expression", "diagram", "essay", "fill_in_blank", "matching", "ordering"]>;
export type HomeworkQuestionType = z.infer<typeof HomeworkQuestionTypeSchema>;
export declare const HomeworkSubjectSchema: z.ZodEnum<["math", "science", "english", "history", "geography", "language_arts", "social_studies", "other"]>;
export type HomeworkSubject = z.infer<typeof HomeworkSubjectSchema>;
export declare const HomeworkSessionStartedSchema: z.ZodObject<{
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
        /** Optional assignment ID if from teacher */
        assignmentId: z.ZodOptional<z.ZodString>;
        /** Subject if known */
        subject: z.ZodOptional<z.ZodEnum<["math", "science", "english", "history", "geography", "language_arts", "social_studies", "other"]>>;
        /** Estimated difficulty (1-5) */
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
}>;
export type HomeworkSessionStarted = z.infer<typeof HomeworkSessionStartedSchema>;
export declare const HomeworkSessionEndedSchema: z.ZodObject<{
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
        /** Duration in milliseconds */
        durationMs: z.ZodNumber;
        /** Session outcome */
        outcome: z.ZodEnum<["completed", "partial", "abandoned", "timeout"]>;
        /** Summary statistics */
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
}>;
export type HomeworkSessionEnded = z.infer<typeof HomeworkSessionEndedSchema>;
export declare const HomeworkQuestionAskedSchema: z.ZodObject<{
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
        /** Question type */
        questionType: z.ZodEnum<["multiple_choice", "free_response", "math_expression", "diagram", "essay", "fill_in_blank", "matching", "ordering"]>;
        /** Subject area */
        subject: z.ZodEnum<["math", "science", "english", "history", "geography", "language_arts", "social_studies", "other"]>;
        /** Grade band */
        gradeBand: z.ZodEnum<["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]>;
        /** Detected skill/topic IDs */
        skillIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Whether question included an image */
        hasImage: z.ZodBoolean;
        /** Whether question was voice input */
        isVoiceInput: z.ZodBoolean;
        /** Question complexity (1-5) */
        complexity: z.ZodOptional<z.ZodNumber>;
        /** Sequence number in session */
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
}>;
export type HomeworkQuestionAsked = z.infer<typeof HomeworkQuestionAskedSchema>;
export declare const HomeworkHintRequestedSchema: z.ZodObject<{
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
        /** Hint level (1 = subtle, 3 = explicit) */
        hintLevel: z.ZodNumber;
        /** Time since question was asked (ms) */
        timeSinceQuestionMs: z.ZodNumber;
        /** Number of attempts before hint */
        attemptsBefore: z.ZodNumber;
        /** Whether this was auto-suggested */
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
}>;
export type HomeworkHintRequested = z.infer<typeof HomeworkHintRequestedSchema>;
export declare const HomeworkHintDeliveredSchema: z.ZodObject<{
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
        /** Hint level delivered */
        hintLevel: z.ZodNumber;
        /** Hint type */
        hintType: z.ZodEnum<["conceptual", "procedural", "example", "partial_answer", "error_correction"]>;
        /** Latency to generate hint (ms) */
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
}>;
export type HomeworkHintDelivered = z.infer<typeof HomeworkHintDeliveredSchema>;
export declare const HomeworkSolutionAttemptedSchema: z.ZodObject<{
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
        /** Whether the answer was correct */
        isCorrect: z.ZodBoolean;
        /** Partial credit if applicable (0-1) */
        partialCredit: z.ZodOptional<z.ZodNumber>;
        /** Time spent on this attempt (ms) */
        timeSpentMs: z.ZodNumber;
        /** Number of hints used before this attempt */
        hintsUsed: z.ZodNumber;
        /** Error type if incorrect */
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
}>;
export type HomeworkSolutionAttempted = z.infer<typeof HomeworkSolutionAttemptedSchema>;
export declare const HomeworkQuestionCompletedSchema: z.ZodObject<{
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
        /** Total time spent on question (ms) */
        totalTimeMs: z.ZodNumber;
        /** Total attempts */
        totalAttempts: z.ZodNumber;
        /** Total hints used */
        totalHints: z.ZodNumber;
        /** Final outcome */
        outcome: z.ZodEnum<["correct", "partially_correct", "gave_up", "skipped", "timed_out"]>;
        /** Whether solution was viewed */
        solutionViewed: z.ZodBoolean;
        /** Mastery demonstrated (0-1) */
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
}>;
export type HomeworkQuestionCompleted = z.infer<typeof HomeworkQuestionCompletedSchema>;
export declare const HomeworkEventSchema: z.ZodDiscriminatedUnion<"eventType", [z.ZodObject<{
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
        /** Optional assignment ID if from teacher */
        assignmentId: z.ZodOptional<z.ZodString>;
        /** Subject if known */
        subject: z.ZodOptional<z.ZodEnum<["math", "science", "english", "history", "geography", "language_arts", "social_studies", "other"]>>;
        /** Estimated difficulty (1-5) */
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
        /** Duration in milliseconds */
        durationMs: z.ZodNumber;
        /** Session outcome */
        outcome: z.ZodEnum<["completed", "partial", "abandoned", "timeout"]>;
        /** Summary statistics */
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
        /** Question type */
        questionType: z.ZodEnum<["multiple_choice", "free_response", "math_expression", "diagram", "essay", "fill_in_blank", "matching", "ordering"]>;
        /** Subject area */
        subject: z.ZodEnum<["math", "science", "english", "history", "geography", "language_arts", "social_studies", "other"]>;
        /** Grade band */
        gradeBand: z.ZodEnum<["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]>;
        /** Detected skill/topic IDs */
        skillIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Whether question included an image */
        hasImage: z.ZodBoolean;
        /** Whether question was voice input */
        isVoiceInput: z.ZodBoolean;
        /** Question complexity (1-5) */
        complexity: z.ZodOptional<z.ZodNumber>;
        /** Sequence number in session */
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
        /** Hint level (1 = subtle, 3 = explicit) */
        hintLevel: z.ZodNumber;
        /** Time since question was asked (ms) */
        timeSinceQuestionMs: z.ZodNumber;
        /** Number of attempts before hint */
        attemptsBefore: z.ZodNumber;
        /** Whether this was auto-suggested */
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
        /** Hint level delivered */
        hintLevel: z.ZodNumber;
        /** Hint type */
        hintType: z.ZodEnum<["conceptual", "procedural", "example", "partial_answer", "error_correction"]>;
        /** Latency to generate hint (ms) */
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
        /** Whether the answer was correct */
        isCorrect: z.ZodBoolean;
        /** Partial credit if applicable (0-1) */
        partialCredit: z.ZodOptional<z.ZodNumber>;
        /** Time spent on this attempt (ms) */
        timeSpentMs: z.ZodNumber;
        /** Number of hints used before this attempt */
        hintsUsed: z.ZodNumber;
        /** Error type if incorrect */
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
        /** Total time spent on question (ms) */
        totalTimeMs: z.ZodNumber;
        /** Total attempts */
        totalAttempts: z.ZodNumber;
        /** Total hints used */
        totalHints: z.ZodNumber;
        /** Final outcome */
        outcome: z.ZodEnum<["correct", "partially_correct", "gave_up", "skipped", "timed_out"]>;
        /** Whether solution was viewed */
        solutionViewed: z.ZodBoolean;
        /** Mastery demonstrated (0-1) */
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
}>]>;
export type HomeworkEvent = z.infer<typeof HomeworkEventSchema>;
export declare const HOMEWORK_EVENT_TYPES: {
    readonly SESSION_STARTED: "homework.session.started";
    readonly SESSION_ENDED: "homework.session.ended";
    readonly QUESTION_ASKED: "homework.question.asked";
    readonly HINT_REQUESTED: "homework.hint.requested";
    readonly HINT_DELIVERED: "homework.hint.delivered";
    readonly SOLUTION_ATTEMPTED: "homework.solution.attempted";
    readonly QUESTION_COMPLETED: "homework.question.completed";
};
//# sourceMappingURL=homework.d.ts.map