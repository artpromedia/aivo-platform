// =============================================================================
// @aivo/events - Schema Index
// =============================================================================

// Base types
export {
  BaseEventSchema,
  EventSourceSchema,
  EventEnvelopeSchema,
  GradeBandSchema,
  SessionOriginSchema,
  SessionTypeSchema,
  validateEvent,
  type BaseEvent,
  type EventSource,
  type EventEnvelope,
  type GradeBand,
  type SessionOrigin,
  type SessionType,
  type ValidationResult,
} from './base.js';

// Learning events
export {
  LearningSessionStartedSchema,
  LearningSessionEndedSchema,
  ActivityStartedSchema,
  ActivityCompletedSchema,
  SkillMasteryUpdatedSchema,
  EngagementMetricSchema,
  LearningEventSchema,
  LEARNING_EVENT_TYPES,
  type LearningSessionStarted,
  type LearningSessionEnded,
  type ActivityStarted,
  type ActivityCompleted,
  type SkillMasteryUpdated,
  type EngagementMetric,
  type LearningEvent,
} from './learning.js';

// Focus events
export {
  SelfReportedMoodSchema,
  FocusLossReasonSchema,
  FocusPingSchema,
  FocusSampleSchema,
  FocusLossSchema,
  FocusSessionSummarySchema,
  FocusEventSchema,
  FOCUS_EVENT_TYPES,
  type SelfReportedMood,
  type FocusLossReason,
  type FocusPing,
  type FocusSample,
  type FocusLoss,
  type FocusSessionSummary,
  type FocusEvent,
} from './focus.js';

// Homework events
export {
  HomeworkQuestionTypeSchema,
  HomeworkSubjectSchema,
  HomeworkSessionStartedSchema,
  HomeworkSessionEndedSchema,
  HomeworkQuestionAskedSchema,
  HomeworkHintRequestedSchema,
  HomeworkHintDeliveredSchema,
  HomeworkSolutionAttemptedSchema,
  HomeworkQuestionCompletedSchema,
  HomeworkEventSchema,
  HOMEWORK_EVENT_TYPES,
  type HomeworkQuestionType,
  type HomeworkSubject,
  type HomeworkSessionStarted,
  type HomeworkSessionEnded,
  type HomeworkQuestionAsked,
  type HomeworkHintRequested,
  type HomeworkHintDelivered,
  type HomeworkSolutionAttempted,
  type HomeworkQuestionCompleted,
  type HomeworkEvent,
} from './homework.js';

// Recommendation events
export {
  RecommendationTypeSchema,
  RecommendationStrategySchema,
  RecommendationCreatedSchema,
  RecommendationServedSchema,
  RecommendationClickedSchema,
  RecommendationDismissedSchema,
  RecommendationFeedbackSchema,
  RecommendationOutcomeSchema,
  RecommendationEventSchema,
  RECOMMENDATION_EVENT_TYPES,
  type RecommendationType,
  type RecommendationStrategy,
  type RecommendationCreated,
  type RecommendationServed,
  type RecommendationClicked,
  type RecommendationDismissed,
  type RecommendationFeedback,
  type RecommendationOutcome,
  type RecommendationEvent,
} from './recommendation.js';

// -----------------------------------------------------------------------------
// All Events Union
// -----------------------------------------------------------------------------

import { z } from 'zod';

import { FocusEventSchema } from './focus.js';
import { HomeworkEventSchema } from './homework.js';
import { LearningEventSchema } from './learning.js';
import { RecommendationEventSchema } from './recommendation.js';

/**
 * Union of all AIVO event types.
 */
export const AivoEventSchema = z.union([
  LearningEventSchema,
  FocusEventSchema,
  HomeworkEventSchema,
  RecommendationEventSchema,
]);

export type AivoEvent = z.infer<typeof AivoEventSchema>;

// -----------------------------------------------------------------------------
// Stream Mapping
// -----------------------------------------------------------------------------

/**
 * Maps event type prefixes to JetStream stream names.
 */
export const EVENT_STREAM_MAP: Record<string, string> = {
  learning: 'LEARNING',
  focus: 'FOCUS',
  homework: 'HOMEWORK',
  recommendation: 'RECOMMENDATION',
};

/**
 * Gets the JetStream stream name for an event type.
 */
export function getStreamForEventType(eventType: string): string {
  const prefix = eventType.split('.')[0];
  if (!prefix) {
    throw new Error(`Invalid event type: ${eventType}`);
  }
  const stream = EVENT_STREAM_MAP[prefix];
  if (!stream) {
    throw new Error(`Unknown event type prefix: ${prefix}`);
  }
  return stream;
}

/**
 * Gets the NATS subject for an event type.
 */
export function getSubjectForEventType(eventType: string): string {
  // Event types are already in subject format: domain.entity.action
  return eventType;
}
