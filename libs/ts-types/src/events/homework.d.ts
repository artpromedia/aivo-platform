/**
 * Homework Event Schemas
 *
 * Events related to homework helper functionality including task creation,
 * step completion, and hint usage.
 * All events include tenantId for multi-tenant isolation.
 *
 * @module @aivo/ts-types/events/homework
 */
import { z } from 'zod';
/**
 * Source types for homework tasks
 */
export declare const HomeworkSourceTypeSchema: z.ZodEnum<["UPLOAD", "MANUAL_ENTRY", "INTEGRATION"]>;
export type HomeworkSourceType = z.infer<typeof HomeworkSourceTypeSchema>;
/**
 * Self-reported understanding levels
 */
export declare const UnderstandingLevelSchema: z.ZodEnum<["EASY", "OK", "HARD"]>;
export type UnderstandingLevel = z.infer<typeof UnderstandingLevelSchema>;
/**
 * Homework task completion status
 */
export declare const HomeworkTaskStatusSchema: z.ZodEnum<["CREATED", "IN_PROGRESS", "COMPLETED", "ABANDONED"]>;
export type HomeworkTaskStatus = z.infer<typeof HomeworkTaskStatusSchema>;
/**
 * Homework Task Created Event
 *
 * Emitted when a learner creates a new homework task for help.
 */
export declare const HomeworkTaskCreatedEventSchema: z.ZodObject<{
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
        /** Learner who created the task */
        learnerId: z.ZodString;
        /** Unique task identifier */
        taskId: z.ZodString;
        /** Subject area of the homework */
        subject: z.ZodString;
        /** How the homework was inputted */
        sourceType: z.ZodEnum<["UPLOAD", "MANUAL_ENTRY", "INTEGRATION"]>;
        /** Total number of steps/problems identified */
        totalSteps: z.ZodNumber;
        /** Optional: assignment due date */
        dueDate: z.ZodOptional<z.ZodString>;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        subject?: string;
        learnerId?: string;
        taskId?: string;
        sourceType?: "UPLOAD" | "MANUAL_ENTRY" | "INTEGRATION";
        totalSteps?: number;
        dueDate?: string;
    }, {
        subject?: string;
        learnerId?: string;
        taskId?: string;
        sourceType?: "UPLOAD" | "MANUAL_ENTRY" | "INTEGRATION";
        totalSteps?: number;
        dueDate?: string;
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
        subject?: string;
        learnerId?: string;
        taskId?: string;
        sourceType?: "UPLOAD" | "MANUAL_ENTRY" | "INTEGRATION";
        totalSteps?: number;
        dueDate?: string;
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
        subject?: string;
        learnerId?: string;
        taskId?: string;
        sourceType?: "UPLOAD" | "MANUAL_ENTRY" | "INTEGRATION";
        totalSteps?: number;
        dueDate?: string;
    };
}>;
export type HomeworkTaskCreatedEvent = z.infer<typeof HomeworkTaskCreatedEventSchema>;
/**
 * Homework Task Started Event
 *
 * Emitted when a learner begins working on a homework task.
 */
export declare const HomeworkTaskStartedEventSchema: z.ZodObject<{
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
        /** Learner who started the task */
        learnerId: z.ZodString;
        /** Task being started */
        taskId: z.ZodString;
        /** Session ID for this homework session */
        sessionId: z.ZodString;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        learnerId?: string;
        taskId?: string;
        sessionId?: string;
    }, {
        learnerId?: string;
        taskId?: string;
        sessionId?: string;
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
        taskId?: string;
        sessionId?: string;
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
        taskId?: string;
        sessionId?: string;
    };
}>;
export type HomeworkTaskStartedEvent = z.infer<typeof HomeworkTaskStartedEventSchema>;
/**
 * Homework Task Completed Event
 *
 * Emitted when a learner completes or abandons a homework task.
 */
export declare const HomeworkTaskCompletedEventSchema: z.ZodObject<{
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
        /** Learner who completed the task */
        learnerId: z.ZodString;
        /** Task that was completed */
        taskId: z.ZodString;
        /** Final status of the task */
        status: z.ZodEnum<["CREATED", "IN_PROGRESS", "COMPLETED", "ABANDONED"]>;
        /** Number of steps completed */
        stepsCompleted: z.ZodNumber;
        /** Total time spent on the task (seconds) */
        totalTimeSeconds: z.ZodNumber;
        /** Total hints used across all steps */
        totalHintsUsed: z.ZodDefault<z.ZodNumber>;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        status?: "COMPLETED" | "CREATED" | "IN_PROGRESS" | "ABANDONED";
        learnerId?: string;
        taskId?: string;
        stepsCompleted?: number;
        totalTimeSeconds?: number;
        totalHintsUsed?: number;
    }, {
        status?: "COMPLETED" | "CREATED" | "IN_PROGRESS" | "ABANDONED";
        learnerId?: string;
        taskId?: string;
        stepsCompleted?: number;
        totalTimeSeconds?: number;
        totalHintsUsed?: number;
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
        status?: "COMPLETED" | "CREATED" | "IN_PROGRESS" | "ABANDONED";
        learnerId?: string;
        taskId?: string;
        stepsCompleted?: number;
        totalTimeSeconds?: number;
        totalHintsUsed?: number;
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
        status?: "COMPLETED" | "CREATED" | "IN_PROGRESS" | "ABANDONED";
        learnerId?: string;
        taskId?: string;
        stepsCompleted?: number;
        totalTimeSeconds?: number;
        totalHintsUsed?: number;
    };
}>;
export type HomeworkTaskCompletedEvent = z.infer<typeof HomeworkTaskCompletedEventSchema>;
/**
 * Homework Step Completed Event
 *
 * Emitted when a learner completes a single step/problem in a homework task.
 */
export declare const HomeworkStepCompletedEventSchema: z.ZodObject<{
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
        /** Learner who completed the step */
        learnerId: z.ZodString;
        /** Task containing the step */
        taskId: z.ZodString;
        /** Zero-based index of the step */
        stepIndex: z.ZodNumber;
        /** Number of hints requested for this step */
        hintsRequested: z.ZodDefault<z.ZodNumber>;
        /** Time spent on this step (seconds) */
        timeSpentSeconds: z.ZodNumber;
        /** Learner's self-reported understanding (optional) */
        selfReportedUnderstanding: z.ZodOptional<z.ZodEnum<["EASY", "OK", "HARD"]>>;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        learnerId?: string;
        taskId?: string;
        stepIndex?: number;
        hintsRequested?: number;
        timeSpentSeconds?: number;
        selfReportedUnderstanding?: "OK" | "EASY" | "HARD";
    }, {
        learnerId?: string;
        taskId?: string;
        stepIndex?: number;
        hintsRequested?: number;
        timeSpentSeconds?: number;
        selfReportedUnderstanding?: "OK" | "EASY" | "HARD";
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
        taskId?: string;
        stepIndex?: number;
        hintsRequested?: number;
        timeSpentSeconds?: number;
        selfReportedUnderstanding?: "OK" | "EASY" | "HARD";
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
        taskId?: string;
        stepIndex?: number;
        hintsRequested?: number;
        timeSpentSeconds?: number;
        selfReportedUnderstanding?: "OK" | "EASY" | "HARD";
    };
}>;
export type HomeworkStepCompletedEvent = z.infer<typeof HomeworkStepCompletedEventSchema>;
/**
 * Homework Hint Requested Event
 *
 * Emitted when a learner requests a hint for a homework problem.
 */
export declare const HomeworkHintRequestedEventSchema: z.ZodObject<{
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
        /** Learner who requested the hint */
        learnerId: z.ZodString;
        /** Task containing the problem */
        taskId: z.ZodString;
        /** Step the hint is for */
        stepIndex: z.ZodNumber;
        /** Which hint number this is (1 = first hint) */
        hintNumber: z.ZodNumber;
        /** Time since step started (seconds) */
        timeBeforeHintSeconds: z.ZodNumber;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        learnerId?: string;
        taskId?: string;
        stepIndex?: number;
        hintNumber?: number;
        timeBeforeHintSeconds?: number;
    }, {
        learnerId?: string;
        taskId?: string;
        stepIndex?: number;
        hintNumber?: number;
        timeBeforeHintSeconds?: number;
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
        taskId?: string;
        stepIndex?: number;
        hintNumber?: number;
        timeBeforeHintSeconds?: number;
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
        taskId?: string;
        stepIndex?: number;
        hintNumber?: number;
        timeBeforeHintSeconds?: number;
    };
}>;
export type HomeworkHintRequestedEvent = z.infer<typeof HomeworkHintRequestedEventSchema>;
/**
 * Union of all homework event schemas for type guards
 */
export declare const HomeworkEventSchemas: readonly [z.ZodObject<{
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
        /** Learner who created the task */
        learnerId: z.ZodString;
        /** Unique task identifier */
        taskId: z.ZodString;
        /** Subject area of the homework */
        subject: z.ZodString;
        /** How the homework was inputted */
        sourceType: z.ZodEnum<["UPLOAD", "MANUAL_ENTRY", "INTEGRATION"]>;
        /** Total number of steps/problems identified */
        totalSteps: z.ZodNumber;
        /** Optional: assignment due date */
        dueDate: z.ZodOptional<z.ZodString>;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        subject?: string;
        learnerId?: string;
        taskId?: string;
        sourceType?: "UPLOAD" | "MANUAL_ENTRY" | "INTEGRATION";
        totalSteps?: number;
        dueDate?: string;
    }, {
        subject?: string;
        learnerId?: string;
        taskId?: string;
        sourceType?: "UPLOAD" | "MANUAL_ENTRY" | "INTEGRATION";
        totalSteps?: number;
        dueDate?: string;
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
        subject?: string;
        learnerId?: string;
        taskId?: string;
        sourceType?: "UPLOAD" | "MANUAL_ENTRY" | "INTEGRATION";
        totalSteps?: number;
        dueDate?: string;
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
        subject?: string;
        learnerId?: string;
        taskId?: string;
        sourceType?: "UPLOAD" | "MANUAL_ENTRY" | "INTEGRATION";
        totalSteps?: number;
        dueDate?: string;
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
        /** Learner who started the task */
        learnerId: z.ZodString;
        /** Task being started */
        taskId: z.ZodString;
        /** Session ID for this homework session */
        sessionId: z.ZodString;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        learnerId?: string;
        taskId?: string;
        sessionId?: string;
    }, {
        learnerId?: string;
        taskId?: string;
        sessionId?: string;
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
        taskId?: string;
        sessionId?: string;
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
        taskId?: string;
        sessionId?: string;
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
        /** Learner who completed the task */
        learnerId: z.ZodString;
        /** Task that was completed */
        taskId: z.ZodString;
        /** Final status of the task */
        status: z.ZodEnum<["CREATED", "IN_PROGRESS", "COMPLETED", "ABANDONED"]>;
        /** Number of steps completed */
        stepsCompleted: z.ZodNumber;
        /** Total time spent on the task (seconds) */
        totalTimeSeconds: z.ZodNumber;
        /** Total hints used across all steps */
        totalHintsUsed: z.ZodDefault<z.ZodNumber>;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        status?: "COMPLETED" | "CREATED" | "IN_PROGRESS" | "ABANDONED";
        learnerId?: string;
        taskId?: string;
        stepsCompleted?: number;
        totalTimeSeconds?: number;
        totalHintsUsed?: number;
    }, {
        status?: "COMPLETED" | "CREATED" | "IN_PROGRESS" | "ABANDONED";
        learnerId?: string;
        taskId?: string;
        stepsCompleted?: number;
        totalTimeSeconds?: number;
        totalHintsUsed?: number;
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
        status?: "COMPLETED" | "CREATED" | "IN_PROGRESS" | "ABANDONED";
        learnerId?: string;
        taskId?: string;
        stepsCompleted?: number;
        totalTimeSeconds?: number;
        totalHintsUsed?: number;
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
        status?: "COMPLETED" | "CREATED" | "IN_PROGRESS" | "ABANDONED";
        learnerId?: string;
        taskId?: string;
        stepsCompleted?: number;
        totalTimeSeconds?: number;
        totalHintsUsed?: number;
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
        /** Learner who completed the step */
        learnerId: z.ZodString;
        /** Task containing the step */
        taskId: z.ZodString;
        /** Zero-based index of the step */
        stepIndex: z.ZodNumber;
        /** Number of hints requested for this step */
        hintsRequested: z.ZodDefault<z.ZodNumber>;
        /** Time spent on this step (seconds) */
        timeSpentSeconds: z.ZodNumber;
        /** Learner's self-reported understanding (optional) */
        selfReportedUnderstanding: z.ZodOptional<z.ZodEnum<["EASY", "OK", "HARD"]>>;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        learnerId?: string;
        taskId?: string;
        stepIndex?: number;
        hintsRequested?: number;
        timeSpentSeconds?: number;
        selfReportedUnderstanding?: "OK" | "EASY" | "HARD";
    }, {
        learnerId?: string;
        taskId?: string;
        stepIndex?: number;
        hintsRequested?: number;
        timeSpentSeconds?: number;
        selfReportedUnderstanding?: "OK" | "EASY" | "HARD";
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
        taskId?: string;
        stepIndex?: number;
        hintsRequested?: number;
        timeSpentSeconds?: number;
        selfReportedUnderstanding?: "OK" | "EASY" | "HARD";
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
        taskId?: string;
        stepIndex?: number;
        hintsRequested?: number;
        timeSpentSeconds?: number;
        selfReportedUnderstanding?: "OK" | "EASY" | "HARD";
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
        /** Learner who requested the hint */
        learnerId: z.ZodString;
        /** Task containing the problem */
        taskId: z.ZodString;
        /** Step the hint is for */
        stepIndex: z.ZodNumber;
        /** Which hint number this is (1 = first hint) */
        hintNumber: z.ZodNumber;
        /** Time since step started (seconds) */
        timeBeforeHintSeconds: z.ZodNumber;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        learnerId?: string;
        taskId?: string;
        stepIndex?: number;
        hintNumber?: number;
        timeBeforeHintSeconds?: number;
    }, {
        learnerId?: string;
        taskId?: string;
        stepIndex?: number;
        hintNumber?: number;
        timeBeforeHintSeconds?: number;
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
        taskId?: string;
        stepIndex?: number;
        hintNumber?: number;
        timeBeforeHintSeconds?: number;
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
        taskId?: string;
        stepIndex?: number;
        hintNumber?: number;
        timeBeforeHintSeconds?: number;
    };
}>];
/**
 * Homework event type literals
 */
export declare const HOMEWORK_EVENT_TYPES: readonly ["homework.task.created", "homework.task.started", "homework.task.completed", "homework.step.completed", "homework.hint.requested"];
export type HomeworkEventType = (typeof HOMEWORK_EVENT_TYPES)[number];
//# sourceMappingURL=homework.d.ts.map