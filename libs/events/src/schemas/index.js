// =============================================================================
// @aivo/events - Schema Index
// =============================================================================
// Base types
export { BaseEventSchema, EventSourceSchema, EventEnvelopeSchema, GradeBandSchema, SessionOriginSchema, SessionTypeSchema, validateEvent, } from './base.js';
// Learning events
export { LearningSessionStartedSchema, LearningSessionEndedSchema, ActivityStartedSchema, ActivityCompletedSchema, SkillMasteryUpdatedSchema, EngagementMetricSchema, LearningEventSchema, LEARNING_EVENT_TYPES, } from './learning.js';
// Focus events
export { SelfReportedMoodSchema, FocusLossReasonSchema, FocusPingSchema, FocusSampleSchema, FocusLossSchema, FocusSessionSummarySchema, FocusEventSchema, FOCUS_EVENT_TYPES, } from './focus.js';
// Homework events
export { HomeworkQuestionTypeSchema, HomeworkSubjectSchema, HomeworkSessionStartedSchema, HomeworkSessionEndedSchema, HomeworkQuestionAskedSchema, HomeworkHintRequestedSchema, HomeworkHintDeliveredSchema, HomeworkSolutionAttemptedSchema, HomeworkQuestionCompletedSchema, HomeworkEventSchema, HOMEWORK_EVENT_TYPES, } from './homework.js';
// Recommendation events
export { RecommendationTypeSchema, RecommendationStrategySchema, RecommendationCreatedSchema, RecommendationServedSchema, RecommendationClickedSchema, RecommendationDismissedSchema, RecommendationFeedbackSchema, RecommendationOutcomeSchema, RecommendationEventSchema, RECOMMENDATION_EVENT_TYPES, } from './recommendation.js';
// Content events
export { ContentPublishedSchema, ContentRetiredSchema, VersionCreatedSchema, VersionSubmittedSchema, VersionApprovedSchema, VersionChangesRequestedSchema, VersionRejectedSchema, IngestionStartedSchema, IngestionCompletedSchema, IngestionFailedSchema, CONTENT_EVENT_TYPES, } from './content.js';
// Marketplace events
export { VendorApprovedEvent, VendorSuspendedEvent, PackPublishedEvent, PackDeprecatedEvent, LicenseCreatedEvent, LicenseActivatedEvent, LicenseSuspendedEvent, LicenseExpiredEvent, LicenseCanceledEvent, LicenseRenewedEvent, EntitlementAssignedEvent, EntitlementRevokedEvent, SeatAssignedEvent, SeatReleasedEvent, PartnerContentUsageEvent, EntitlementCheckFailedEvent, InstallationCreatedEvent, InstallationApprovedEvent, InstallationRevokedEvent, MarketplaceEvent, MARKETPLACE_SUBJECTS, } from './marketplace.js';
// -----------------------------------------------------------------------------
// All Events Union
// -----------------------------------------------------------------------------
import { z } from 'zod';
import { FocusEventSchema } from './focus.js';
import { HomeworkEventSchema } from './homework.js';
import { LearningEventSchema } from './learning.js';
import { MarketplaceEvent } from './marketplace.js';
import { RecommendationEventSchema } from './recommendation.js';
/**
 * Union of all AIVO event types.
 */
export const AivoEventSchema = z.union([
    LearningEventSchema,
    FocusEventSchema,
    HomeworkEventSchema,
    RecommendationEventSchema,
    MarketplaceEvent,
]);
// -----------------------------------------------------------------------------
// Stream Mapping
// -----------------------------------------------------------------------------
/**
 * Maps event type prefixes to JetStream stream names.
 */
export const EVENT_STREAM_MAP = {
    learning: 'LEARNING',
    focus: 'FOCUS',
    homework: 'HOMEWORK',
    recommendation: 'RECOMMENDATION',
    content: 'CONTENT',
    marketplace: 'MARKETPLACE',
};
/**
 * Gets the JetStream stream name for an event type.
 */
export function getStreamForEventType(eventType) {
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
export function getSubjectForEventType(eventType) {
    // Event types are already in subject format: domain.entity.action
    return eventType;
}
//# sourceMappingURL=index.js.map