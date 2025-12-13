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
import { createEventSchema } from './base.js';

// ══════════════════════════════════════════════════════════════════════════════
// SHARED ENUMS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Source types for homework tasks
 */
export const HomeworkSourceTypeSchema = z.enum([
  /** Uploaded image or PDF */
  'UPLOAD',
  /** Manually entered by user */
  'MANUAL_ENTRY',
  /** Imported from LMS integration */
  'INTEGRATION',
]);

export type HomeworkSourceType = z.infer<typeof HomeworkSourceTypeSchema>;

/**
 * Self-reported understanding levels
 */
export const UnderstandingLevelSchema = z.enum([
  /** Found it easy */
  'EASY',
  /** Understood okay */
  'OK',
  /** Found it difficult */
  'HARD',
]);

export type UnderstandingLevel = z.infer<typeof UnderstandingLevelSchema>;

/**
 * Homework task completion status
 */
export const HomeworkTaskStatusSchema = z.enum([
  /** Task just created */
  'CREATED',
  /** Currently working on it */
  'IN_PROGRESS',
  /** All steps completed */
  'COMPLETED',
  /** Abandoned without completing */
  'ABANDONED',
]);

export type HomeworkTaskStatus = z.infer<typeof HomeworkTaskStatusSchema>;

// ══════════════════════════════════════════════════════════════════════════════
// TASK EVENTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Homework Task Created Event
 *
 * Emitted when a learner creates a new homework task for help.
 */
export const HomeworkTaskCreatedEventSchema = createEventSchema(
  'homework.task.created',
  z.object({
    /** Learner who created the task */
    learnerId: z.string().cuid(),

    /** Unique task identifier */
    taskId: z.string().cuid(),

    /** Subject area of the homework */
    subject: z.string().min(1),

    /** How the homework was inputted */
    sourceType: HomeworkSourceTypeSchema,

    /** Total number of steps/problems identified */
    totalSteps: z.number().int().positive(),

    /** Optional: assignment due date */
    dueDate: z.string().datetime().optional(),
  })
);

export type HomeworkTaskCreatedEvent = z.infer<typeof HomeworkTaskCreatedEventSchema>;

/**
 * Homework Task Started Event
 *
 * Emitted when a learner begins working on a homework task.
 */
export const HomeworkTaskStartedEventSchema = createEventSchema(
  'homework.task.started',
  z.object({
    /** Learner who started the task */
    learnerId: z.string().cuid(),

    /** Task being started */
    taskId: z.string().cuid(),

    /** Session ID for this homework session */
    sessionId: z.string().cuid(),
  })
);

export type HomeworkTaskStartedEvent = z.infer<typeof HomeworkTaskStartedEventSchema>;

/**
 * Homework Task Completed Event
 *
 * Emitted when a learner completes or abandons a homework task.
 */
export const HomeworkTaskCompletedEventSchema = createEventSchema(
  'homework.task.completed',
  z.object({
    /** Learner who completed the task */
    learnerId: z.string().cuid(),

    /** Task that was completed */
    taskId: z.string().cuid(),

    /** Final status of the task */
    status: HomeworkTaskStatusSchema,

    /** Number of steps completed */
    stepsCompleted: z.number().int().min(0),

    /** Total time spent on the task (seconds) */
    totalTimeSeconds: z.number().int().min(0),

    /** Total hints used across all steps */
    totalHintsUsed: z.number().int().min(0).default(0),
  })
);

export type HomeworkTaskCompletedEvent = z.infer<typeof HomeworkTaskCompletedEventSchema>;

// ══════════════════════════════════════════════════════════════════════════════
// STEP EVENTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Homework Step Completed Event
 *
 * Emitted when a learner completes a single step/problem in a homework task.
 */
export const HomeworkStepCompletedEventSchema = createEventSchema(
  'homework.step.completed',
  z.object({
    /** Learner who completed the step */
    learnerId: z.string().cuid(),

    /** Task containing the step */
    taskId: z.string().cuid(),

    /** Zero-based index of the step */
    stepIndex: z.number().int().min(0),

    /** Number of hints requested for this step */
    hintsRequested: z.number().int().min(0).default(0),

    /** Time spent on this step (seconds) */
    timeSpentSeconds: z.number().int().positive(),

    /** Learner's self-reported understanding (optional) */
    selfReportedUnderstanding: UnderstandingLevelSchema.optional(),
  })
);

export type HomeworkStepCompletedEvent = z.infer<typeof HomeworkStepCompletedEventSchema>;

/**
 * Homework Hint Requested Event
 *
 * Emitted when a learner requests a hint for a homework problem.
 */
export const HomeworkHintRequestedEventSchema = createEventSchema(
  'homework.hint.requested',
  z.object({
    /** Learner who requested the hint */
    learnerId: z.string().cuid(),

    /** Task containing the problem */
    taskId: z.string().cuid(),

    /** Step the hint is for */
    stepIndex: z.number().int().min(0),

    /** Which hint number this is (1 = first hint) */
    hintNumber: z.number().int().positive(),

    /** Time since step started (seconds) */
    timeBeforeHintSeconds: z.number().int().min(0),
  })
);

export type HomeworkHintRequestedEvent = z.infer<typeof HomeworkHintRequestedEventSchema>;

// ══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Union of all homework event schemas for type guards
 */
export const HomeworkEventSchemas = [
  HomeworkTaskCreatedEventSchema,
  HomeworkTaskStartedEventSchema,
  HomeworkTaskCompletedEventSchema,
  HomeworkStepCompletedEventSchema,
  HomeworkHintRequestedEventSchema,
] as const;

/**
 * Homework event type literals
 */
export const HOMEWORK_EVENT_TYPES = [
  'homework.task.created',
  'homework.task.started',
  'homework.task.completed',
  'homework.step.completed',
  'homework.hint.requested',
] as const;

export type HomeworkEventType = (typeof HOMEWORK_EVENT_TYPES)[number];
