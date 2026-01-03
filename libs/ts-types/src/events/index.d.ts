/**
 * Events Module
 *
 * Tenant-scoped event schemas for the AIVO learning platform.
 * All events require tenantId for multi-tenant isolation.
 *
 * @module @aivo/ts-types/events
 *
 * @example
 * ```typescript
 * import {
 *   ActivityCompletedEventSchema,
 *   createEvent,
 *   requireTenantId,
 * } from '@aivo/ts-types/events';
 *
 * // Create an event with auto-generated metadata
 * const event = createEvent(ActivityCompletedEventSchema, {
 *   tenantId: 'clg123...',
 *   eventType: 'learning.activity.completed',
 *   payload: {
 *     learnerId: 'clg456...',
 *     sessionId: 'clg789...',
 *     activityId: 'clgabc...',
 *     subject: 'MATH',
 *     activityType: 'multiple-choice',
 *     difficulty: 'L2',
 *     correct: true,
 *     latencyMs: 5000,
 *   }
 * });
 * ```
 */
export { BaseEventSchema, EventSourceSchema, type BaseEvent, type EventSource, type InferEventType, createEventSchema, } from './base.js';
export { ActivityCompletedEventSchema, AnswerSubmittedEventSchema, SessionStartedEventSchema, SessionCompletedEventSchema, SubjectSchema, SessionTypeSchema, SessionEndReasonSchema, LearningEventSchemas, LEARNING_EVENT_TYPES, type ActivityCompletedEvent, type AnswerSubmittedEvent, type SessionStartedEvent, type SessionCompletedEvent, type Subject, type SessionType, type SessionEndReason, type LearningEventType, } from './learning.js';
export { FocusLossDetectedEventSchema, FocusInterventionTriggeredEventSchema, FocusInterventionCompletedEventSchema, FocusSignalSchema, InterventionTypeSchema, InterventionOutcomeSchema, FocusEventSchemas, FOCUS_EVENT_TYPES, type FocusLossDetectedEvent, type FocusInterventionTriggeredEvent, type FocusInterventionCompletedEvent, type FocusSignal, type InterventionType, type InterventionOutcome, type FocusEventType, } from './focus.js';
export { RecommendationCreatedEventSchema, RecommendationRespondedEventSchema, RecommendationAppliedEventSchema, RecommendationPayloadSchema, RecommendationTypeSchema, ApproverRoleSchema, RecommendationResponseSchema, RecommendationEventSchemas, RECOMMENDATION_EVENT_TYPES, type RecommendationCreatedEvent, type RecommendationRespondedEvent, type RecommendationAppliedEvent, type RecommendationPayload, type RecommendationType, type ApproverRole, type RecommendationResponse, type RecommendationEventType, } from './recommendation.js';
export { HomeworkTaskCreatedEventSchema, HomeworkTaskStartedEventSchema, HomeworkTaskCompletedEventSchema, HomeworkStepCompletedEventSchema, HomeworkHintRequestedEventSchema, HomeworkSourceTypeSchema, UnderstandingLevelSchema, HomeworkTaskStatusSchema, HomeworkEventSchemas, HOMEWORK_EVENT_TYPES, type HomeworkTaskCreatedEvent, type HomeworkTaskStartedEvent, type HomeworkTaskCompletedEvent, type HomeworkStepCompletedEvent, type HomeworkHintRequestedEvent, type HomeworkSourceType, type UnderstandingLevel, type HomeworkTaskStatus, type HomeworkEventType, } from './homework.js';
export { validateEvent, safeValidateEvent, validateBaseEvent, createEvent, createEventWithSource, isTenantScopedEvent, isBaseEvent, hasCorrelationContext, requireTenantId, requireBaseEvent, MissingTenantIdError, extractTenantId, withCorrelationContext, withCausation, } from './validation.js';
/**
 * All event type literals
 */
export declare const ALL_EVENT_TYPES: readonly ["learning.activity.completed", "learning.answer.submitted", "learning.session.started", "learning.session.completed", "focus.loss.detected", "focus.intervention.triggered", "focus.intervention.completed", "recommendation.created", "recommendation.responded", "recommendation.applied", "homework.task.created", "homework.task.started", "homework.task.completed", "homework.step.completed", "homework.hint.requested"];
export type AllEventType = (typeof ALL_EVENT_TYPES)[number];
//# sourceMappingURL=index.d.ts.map