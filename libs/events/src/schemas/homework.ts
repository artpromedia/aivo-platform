// =============================================================================
// @aivo/events - Homework Event Schemas
// =============================================================================
//
// Events for homework helper interactions: sessions, questions, hints, solutions.

import { z } from 'zod';
import { BaseEventSchema, GradeBandSchema, SessionOriginSchema } from './base';

// -----------------------------------------------------------------------------
// Homework Question Type
// -----------------------------------------------------------------------------

export const HomeworkQuestionTypeSchema = z.enum([
  'multiple_choice',
  'free_response',
  'math_expression',
  'diagram',
  'essay',
  'fill_in_blank',
  'matching',
  'ordering',
]);

export type HomeworkQuestionType = z.infer<typeof HomeworkQuestionTypeSchema>;

// -----------------------------------------------------------------------------
// Homework Subject
// -----------------------------------------------------------------------------

export const HomeworkSubjectSchema = z.enum([
  'math',
  'science',
  'english',
  'history',
  'geography',
  'language_arts',
  'social_studies',
  'other',
]);

export type HomeworkSubject = z.infer<typeof HomeworkSubjectSchema>;

// -----------------------------------------------------------------------------
// Homework Session Started
// -----------------------------------------------------------------------------

export const HomeworkSessionStartedSchema = BaseEventSchema.extend({
  eventType: z.literal('homework.session.started'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    origin: SessionOriginSchema,
    gradeBand: GradeBandSchema,
    /** Optional assignment ID if from teacher */
    assignmentId: z.string().uuid().optional(),
    /** Subject if known */
    subject: HomeworkSubjectSchema.optional(),
    /** Estimated difficulty (1-5) */
    estimatedDifficulty: z.number().int().min(1).max(5).optional(),
    startedAt: z.string().datetime({ offset: true }),
  }),
});

export type HomeworkSessionStarted = z.infer<typeof HomeworkSessionStartedSchema>;

// -----------------------------------------------------------------------------
// Homework Session Ended
// -----------------------------------------------------------------------------

export const HomeworkSessionEndedSchema = BaseEventSchema.extend({
  eventType: z.literal('homework.session.ended'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    /** Duration in milliseconds */
    durationMs: z.number().int().min(0),
    /** Session outcome */
    outcome: z.enum([
      'completed',
      'partial',
      'abandoned',
      'timeout',
    ]),
    /** Summary statistics */
    summary: z.object({
      questionsAsked: z.number().int().min(0),
      hintsRequested: z.number().int().min(0),
      solutionsViewed: z.number().int().min(0),
      questionsCompleted: z.number().int().min(0),
      avgTimePerQuestion: z.number().min(0),
    }),
    endedAt: z.string().datetime({ offset: true }),
  }),
});

export type HomeworkSessionEnded = z.infer<typeof HomeworkSessionEndedSchema>;

// -----------------------------------------------------------------------------
// Homework Question Asked
// -----------------------------------------------------------------------------

export const HomeworkQuestionAskedSchema = BaseEventSchema.extend({
  eventType: z.literal('homework.question.asked'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    questionId: z.string().uuid(),
    /** Question type */
    questionType: HomeworkQuestionTypeSchema,
    /** Subject area */
    subject: HomeworkSubjectSchema,
    /** Grade band */
    gradeBand: GradeBandSchema,
    /** Detected skill/topic IDs */
    skillIds: z.array(z.string().uuid()).optional(),
    /** Whether question included an image */
    hasImage: z.boolean(),
    /** Whether question was voice input */
    isVoiceInput: z.boolean(),
    /** Question complexity (1-5) */
    complexity: z.number().int().min(1).max(5).optional(),
    /** Sequence number in session */
    sequenceNumber: z.number().int().min(1),
    askedAt: z.string().datetime({ offset: true }),
  }),
});

export type HomeworkQuestionAsked = z.infer<typeof HomeworkQuestionAskedSchema>;

// -----------------------------------------------------------------------------
// Homework Hint Requested
// -----------------------------------------------------------------------------

export const HomeworkHintRequestedSchema = BaseEventSchema.extend({
  eventType: z.literal('homework.hint.requested'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    questionId: z.string().uuid(),
    /** Hint level (1 = subtle, 3 = explicit) */
    hintLevel: z.number().int().min(1).max(3),
    /** Time since question was asked (ms) */
    timeSinceQuestionMs: z.number().int().min(0),
    /** Number of attempts before hint */
    attemptsBefore: z.number().int().min(0),
    /** Whether this was auto-suggested */
    autoSuggested: z.boolean(),
    requestedAt: z.string().datetime({ offset: true }),
  }),
});

export type HomeworkHintRequested = z.infer<typeof HomeworkHintRequestedSchema>;

// -----------------------------------------------------------------------------
// Homework Hint Delivered
// -----------------------------------------------------------------------------

export const HomeworkHintDeliveredSchema = BaseEventSchema.extend({
  eventType: z.literal('homework.hint.delivered'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    questionId: z.string().uuid(),
    hintId: z.string().uuid(),
    /** Hint level delivered */
    hintLevel: z.number().int().min(1).max(3),
    /** Hint type */
    hintType: z.enum([
      'conceptual',
      'procedural',
      'example',
      'partial_answer',
      'error_correction',
    ]),
    /** Latency to generate hint (ms) */
    generationLatencyMs: z.number().int().min(0),
    deliveredAt: z.string().datetime({ offset: true }),
  }),
});

export type HomeworkHintDelivered = z.infer<typeof HomeworkHintDeliveredSchema>;

// -----------------------------------------------------------------------------
// Homework Solution Attempted
// -----------------------------------------------------------------------------

export const HomeworkSolutionAttemptedSchema = BaseEventSchema.extend({
  eventType: z.literal('homework.solution.attempted'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    questionId: z.string().uuid(),
    attemptNumber: z.number().int().min(1),
    /** Whether the answer was correct */
    isCorrect: z.boolean(),
    /** Partial credit if applicable (0-1) */
    partialCredit: z.number().min(0).max(1).optional(),
    /** Time spent on this attempt (ms) */
    timeSpentMs: z.number().int().min(0),
    /** Number of hints used before this attempt */
    hintsUsed: z.number().int().min(0),
    /** Error type if incorrect */
    errorType: z.enum([
      'conceptual',
      'computational',
      'careless',
      'incomplete',
      'formatting',
      'unknown',
    ]).optional(),
    attemptedAt: z.string().datetime({ offset: true }),
  }),
});

export type HomeworkSolutionAttempted = z.infer<typeof HomeworkSolutionAttemptedSchema>;

// -----------------------------------------------------------------------------
// Homework Question Completed
// -----------------------------------------------------------------------------

export const HomeworkQuestionCompletedSchema = BaseEventSchema.extend({
  eventType: z.literal('homework.question.completed'),
  eventVersion: z.literal('1.0.0'),
  payload: z.object({
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    questionId: z.string().uuid(),
    /** Total time spent on question (ms) */
    totalTimeMs: z.number().int().min(0),
    /** Total attempts */
    totalAttempts: z.number().int().min(0),
    /** Total hints used */
    totalHints: z.number().int().min(0),
    /** Final outcome */
    outcome: z.enum([
      'correct',
      'partially_correct',
      'gave_up',
      'skipped',
      'timed_out',
    ]),
    /** Whether solution was viewed */
    solutionViewed: z.boolean(),
    /** Mastery demonstrated (0-1) */
    masteryDemonstrated: z.number().min(0).max(1).optional(),
    completedAt: z.string().datetime({ offset: true }),
  }),
});

export type HomeworkQuestionCompleted = z.infer<typeof HomeworkQuestionCompletedSchema>;

// -----------------------------------------------------------------------------
// Union Types
// -----------------------------------------------------------------------------

export const HomeworkEventSchema = z.discriminatedUnion('eventType', [
  HomeworkSessionStartedSchema,
  HomeworkSessionEndedSchema,
  HomeworkQuestionAskedSchema,
  HomeworkHintRequestedSchema,
  HomeworkHintDeliveredSchema,
  HomeworkSolutionAttemptedSchema,
  HomeworkQuestionCompletedSchema,
]);

export type HomeworkEvent = z.infer<typeof HomeworkEventSchema>;

// -----------------------------------------------------------------------------
// Event Type Mapping
// -----------------------------------------------------------------------------

export const HOMEWORK_EVENT_TYPES = {
  SESSION_STARTED: 'homework.session.started',
  SESSION_ENDED: 'homework.session.ended',
  QUESTION_ASKED: 'homework.question.asked',
  HINT_REQUESTED: 'homework.hint.requested',
  HINT_DELIVERED: 'homework.hint.delivered',
  SOLUTION_ATTEMPTED: 'homework.solution.attempted',
  QUESTION_COMPLETED: 'homework.question.completed',
} as const;
