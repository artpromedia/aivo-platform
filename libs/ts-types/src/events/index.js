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
// ══════════════════════════════════════════════════════════════════════════════
// BASE EXPORTS
// ══════════════════════════════════════════════════════════════════════════════
export { 
// Schemas
BaseEventSchema, EventSourceSchema, 
// Factory
createEventSchema, } from './base.js';
// ══════════════════════════════════════════════════════════════════════════════
// LEARNING EVENTS
// ══════════════════════════════════════════════════════════════════════════════
export { 
// Schemas
ActivityCompletedEventSchema, AnswerSubmittedEventSchema, SessionStartedEventSchema, SessionCompletedEventSchema, 
// Enums
SubjectSchema, SessionTypeSchema, SessionEndReasonSchema, 
// Constants
LearningEventSchemas, LEARNING_EVENT_TYPES, } from './learning.js';
// ══════════════════════════════════════════════════════════════════════════════
// FOCUS EVENTS
// ══════════════════════════════════════════════════════════════════════════════
export { 
// Schemas
FocusLossDetectedEventSchema, FocusInterventionTriggeredEventSchema, FocusInterventionCompletedEventSchema, 
// Enums
FocusSignalSchema, InterventionTypeSchema, InterventionOutcomeSchema, 
// Constants
FocusEventSchemas, FOCUS_EVENT_TYPES, } from './focus.js';
// ══════════════════════════════════════════════════════════════════════════════
// RECOMMENDATION EVENTS
// ══════════════════════════════════════════════════════════════════════════════
export { 
// Schemas
RecommendationCreatedEventSchema, RecommendationRespondedEventSchema, RecommendationAppliedEventSchema, RecommendationPayloadSchema, 
// Enums
RecommendationTypeSchema, ApproverRoleSchema, RecommendationResponseSchema, 
// Constants
RecommendationEventSchemas, RECOMMENDATION_EVENT_TYPES, } from './recommendation.js';
// ══════════════════════════════════════════════════════════════════════════════
// HOMEWORK EVENTS
// ══════════════════════════════════════════════════════════════════════════════
export { 
// Schemas
HomeworkTaskCreatedEventSchema, HomeworkTaskStartedEventSchema, HomeworkTaskCompletedEventSchema, HomeworkStepCompletedEventSchema, HomeworkHintRequestedEventSchema, 
// Enums
HomeworkSourceTypeSchema, UnderstandingLevelSchema, HomeworkTaskStatusSchema, 
// Constants
HomeworkEventSchemas, HOMEWORK_EVENT_TYPES, } from './homework.js';
// ══════════════════════════════════════════════════════════════════════════════
// VALIDATION UTILITIES
// ══════════════════════════════════════════════════════════════════════════════
export { 
// Validation functions
validateEvent, safeValidateEvent, validateBaseEvent, 
// Creation helpers
createEvent, createEventWithSource, 
// Type guards
isTenantScopedEvent, isBaseEvent, hasCorrelationContext, 
// Assertions
requireTenantId, requireBaseEvent, MissingTenantIdError, 
// Utilities
extractTenantId, withCorrelationContext, withCausation, } from './validation.js';
// ══════════════════════════════════════════════════════════════════════════════
// AGGREGATE TYPES
// ══════════════════════════════════════════════════════════════════════════════
/**
 * All event type literals
 */
export const ALL_EVENT_TYPES = [
    // Learning
    'learning.activity.completed',
    'learning.answer.submitted',
    'learning.session.started',
    'learning.session.completed',
    // Focus
    'focus.loss.detected',
    'focus.intervention.triggered',
    'focus.intervention.completed',
    // Recommendation
    'recommendation.created',
    'recommendation.responded',
    'recommendation.applied',
    // Homework
    'homework.task.created',
    'homework.task.started',
    'homework.task.completed',
    'homework.step.completed',
    'homework.hint.requested',
];
//# sourceMappingURL=index.js.map