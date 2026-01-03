/**
 * Learning Event Schemas
 *
 * Events related to learning activities, sessions, and answers.
 * All events include tenantId for multi-tenant isolation.
 *
 * @module @aivo/ts-types/events/learning
 */
import { z } from 'zod';
import { createEventSchema } from './base.js';
// ══════════════════════════════════════════════════════════════════════════════
// SHARED ENUMS
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Subject areas supported by the platform
 */
export const SubjectSchema = z.enum(['ELA', 'MATH', 'SEL', 'SPEECH', 'SCIENCE']);
/**
 * Types of learning sessions
 */
export const SessionTypeSchema = z.enum([
    'LESSON',
    'PRACTICE',
    'ASSESSMENT',
    'HOMEWORK_HELP',
]);
/**
 * Reasons a session can end
 */
export const SessionEndReasonSchema = z.enum([
    'COMPLETED',
    'TIMEOUT',
    'USER_EXIT',
    'FOCUS_BREAK',
    'ERROR',
]);
// ══════════════════════════════════════════════════════════════════════════════
// ACTIVITY EVENTS
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Activity Completed Event
 *
 * Emitted when a learner completes a learning activity (question, exercise, etc.)
 */
export const ActivityCompletedEventSchema = createEventSchema('learning.activity.completed', z.object({
    /** Learner who completed the activity */
    learnerId: z.string().cuid(),
    /** Session in which activity was completed */
    sessionId: z.string().cuid(),
    /** Unique activity identifier */
    activityId: z.string().cuid(),
    /** Subject area */
    subject: SubjectSchema,
    /** Type of activity (e.g., 'multiple-choice', 'drag-drop', 'speech') */
    activityType: z.string().min(1),
    /** Difficulty level (e.g., 'L1', 'L2', 'L3') */
    difficulty: z.string().min(1),
    /** Whether the answer was correct (if applicable) */
    correct: z.boolean().optional(),
    /** Score achieved (0-100, if applicable) */
    score: z.number().min(0).max(100).optional(),
    /** Time taken to complete in milliseconds */
    latencyMs: z.number().int().positive(),
    /** Accommodations that were active during activity */
    accommodationsActive: z.array(z.string()).default([]),
}));
// ══════════════════════════════════════════════════════════════════════════════
// ANSWER EVENTS
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Answer Submitted Event
 *
 * Emitted when a learner submits an answer to a question.
 * More granular than ActivityCompleted - tracks each attempt.
 */
export const AnswerSubmittedEventSchema = createEventSchema('learning.answer.submitted', z.object({
    /** Learner who submitted the answer */
    learnerId: z.string().cuid(),
    /** Session in which answer was submitted */
    sessionId: z.string().cuid(),
    /** Activity containing the question */
    activityId: z.string().cuid(),
    /** Specific question identifier */
    questionId: z.string().cuid(),
    /** The submitted answer value (flexible for different question types) */
    answerValue: z.unknown(),
    /** Whether the answer was correct */
    correct: z.boolean(),
    /** Time taken to submit in milliseconds */
    latencyMs: z.number().int().positive(),
    /** Which attempt this is (1 = first try) */
    attemptNumber: z.number().int().positive(),
    /** Number of hints used before submitting */
    hintsUsed: z.number().int().min(0).default(0),
    /** Level of scaffolding provided (0 = none, 3 = maximum) */
    scaffoldingLevel: z.number().int().min(0).max(3).default(0),
}));
// ══════════════════════════════════════════════════════════════════════════════
// SESSION EVENTS
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Session Started Event
 *
 * Emitted when a learner begins a learning session.
 */
export const SessionStartedEventSchema = createEventSchema('learning.session.started', z.object({
    /** Learner who started the session */
    learnerId: z.string().cuid(),
    /** Unique session identifier */
    sessionId: z.string().cuid(),
    /** Type of session */
    sessionType: SessionTypeSchema,
    /** Activities planned for this session */
    plannedActivities: z.array(z.string().cuid()),
    /** Expected duration in minutes */
    plannedDurationMinutes: z.number().int().positive(),
}));
/**
 * Session Completed Event
 *
 * Emitted when a learning session ends (for any reason).
 */
export const SessionCompletedEventSchema = createEventSchema('learning.session.completed', z.object({
    /** Learner who completed the session */
    learnerId: z.string().cuid(),
    /** Session identifier */
    sessionId: z.string().cuid(),
    /** Actual time spent in session (minutes) */
    actualDurationMinutes: z.number().positive(),
    /** Number of activities completed */
    activitiesCompleted: z.number().int().min(0),
    /** Number of activities skipped */
    activitiesSkipped: z.number().int().min(0),
    /** Average score across completed activities (if applicable) */
    averageScore: z.number().min(0).max(100).optional(),
    /** Number of focus interventions triggered during session */
    focusInterventions: z.number().int().min(0).default(0),
    /** Why the session ended */
    endReason: SessionEndReasonSchema,
}));
// ══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Union of all learning event schemas for type guards
 */
export const LearningEventSchemas = [
    ActivityCompletedEventSchema,
    AnswerSubmittedEventSchema,
    SessionStartedEventSchema,
    SessionCompletedEventSchema,
];
/**
 * Learning event type literals
 */
export const LEARNING_EVENT_TYPES = [
    'learning.activity.completed',
    'learning.answer.submitted',
    'learning.session.started',
    'learning.session.completed',
];
//# sourceMappingURL=learning.js.map