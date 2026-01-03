// =============================================================================
// @aivo/events - Event Publisher
// =============================================================================
//
// High-level publisher with typed methods for each event domain.
// Wraps NatsTransport with convenience methods and type safety.
import { LEARNING_EVENT_TYPES, FOCUS_EVENT_TYPES, HOMEWORK_EVENT_TYPES, RECOMMENDATION_EVENT_TYPES, } from '../schemas/index.js';
import { NatsTransport } from './nats-transport.js';
// -----------------------------------------------------------------------------
// Event Publisher Class
// -----------------------------------------------------------------------------
export class EventPublisher {
    transport;
    defaultTenantId;
    constructor(config) {
        this.transport = new NatsTransport(config);
        this.defaultTenantId = config.defaultTenantId;
    }
    // ---------------------------------------------------------------------------
    // Connection Management
    // ---------------------------------------------------------------------------
    async connect() {
        return this.transport.connect();
    }
    async close() {
        return this.transport.close();
    }
    isConnected() {
        return this.transport.isConnected();
    }
    // ---------------------------------------------------------------------------
    // Learning Events
    // ---------------------------------------------------------------------------
    async publishLearningSessionStarted(tenantId, payload, options) {
        return this.transport.publish({
            tenantId,
            eventType: LEARNING_EVENT_TYPES.SESSION_STARTED,
            eventVersion: '1.0.0',
            payload,
        }, options);
    }
    async publishLearningSessionEnded(tenantId, payload, options) {
        return this.transport.publish({
            tenantId,
            eventType: LEARNING_EVENT_TYPES.SESSION_ENDED,
            eventVersion: '1.0.0',
            payload,
        }, options);
    }
    async publishActivityStarted(tenantId, payload, options) {
        return this.transport.publish({
            tenantId,
            eventType: LEARNING_EVENT_TYPES.ACTIVITY_STARTED,
            eventVersion: '1.0.0',
            payload,
        }, options);
    }
    async publishActivityCompleted(tenantId, payload, options) {
        return this.transport.publish({
            tenantId,
            eventType: LEARNING_EVENT_TYPES.ACTIVITY_COMPLETED,
            eventVersion: '1.0.0',
            payload,
        }, options);
    }
    async publishSkillMasteryUpdated(tenantId, payload, options) {
        return this.transport.publish({
            tenantId,
            eventType: LEARNING_EVENT_TYPES.SKILL_MASTERY_UPDATED,
            eventVersion: '1.0.0',
            payload,
        }, options);
    }
    async publishEngagementMetric(tenantId, payload, options) {
        return this.transport.publish({
            tenantId,
            eventType: LEARNING_EVENT_TYPES.ENGAGEMENT_METRIC,
            eventVersion: '1.0.0',
            payload,
        }, options);
    }
    // ---------------------------------------------------------------------------
    // Focus Events
    // ---------------------------------------------------------------------------
    async publishFocusPing(tenantId, payload, options) {
        return this.transport.publish({
            tenantId,
            eventType: FOCUS_EVENT_TYPES.PING,
            eventVersion: '1.0.0',
            payload,
        }, options);
    }
    async publishFocusSample(tenantId, payload, options) {
        return this.transport.publish({
            tenantId,
            eventType: FOCUS_EVENT_TYPES.SAMPLE,
            eventVersion: '1.0.0',
            payload,
        }, options);
    }
    async publishFocusLoss(tenantId, payload, options) {
        return this.transport.publish({
            tenantId,
            eventType: FOCUS_EVENT_TYPES.LOSS,
            eventVersion: '1.0.0',
            payload,
        }, options);
    }
    async publishFocusSessionSummary(tenantId, payload, options) {
        return this.transport.publish({
            tenantId,
            eventType: FOCUS_EVENT_TYPES.SESSION_SUMMARY,
            eventVersion: '1.0.0',
            payload,
        }, options);
    }
    // ---------------------------------------------------------------------------
    // Homework Events
    // ---------------------------------------------------------------------------
    async publishHomeworkSessionStarted(tenantId, payload, options) {
        return this.transport.publish({
            tenantId,
            eventType: HOMEWORK_EVENT_TYPES.SESSION_STARTED,
            eventVersion: '1.0.0',
            payload,
        }, options);
    }
    async publishHomeworkSessionEnded(tenantId, payload, options) {
        return this.transport.publish({
            tenantId,
            eventType: HOMEWORK_EVENT_TYPES.SESSION_ENDED,
            eventVersion: '1.0.0',
            payload,
        }, options);
    }
    async publishHomeworkQuestionAsked(tenantId, payload, options) {
        return this.transport.publish({
            tenantId,
            eventType: HOMEWORK_EVENT_TYPES.QUESTION_ASKED,
            eventVersion: '1.0.0',
            payload,
        }, options);
    }
    async publishHomeworkHintRequested(tenantId, payload, options) {
        return this.transport.publish({
            tenantId,
            eventType: HOMEWORK_EVENT_TYPES.HINT_REQUESTED,
            eventVersion: '1.0.0',
            payload,
        }, options);
    }
    async publishHomeworkHintDelivered(tenantId, payload, options) {
        return this.transport.publish({
            tenantId,
            eventType: HOMEWORK_EVENT_TYPES.HINT_DELIVERED,
            eventVersion: '1.0.0',
            payload,
        }, options);
    }
    async publishHomeworkSolutionAttempted(tenantId, payload, options) {
        return this.transport.publish({
            tenantId,
            eventType: HOMEWORK_EVENT_TYPES.SOLUTION_ATTEMPTED,
            eventVersion: '1.0.0',
            payload,
        }, options);
    }
    async publishHomeworkQuestionCompleted(tenantId, payload, options) {
        return this.transport.publish({
            tenantId,
            eventType: HOMEWORK_EVENT_TYPES.QUESTION_COMPLETED,
            eventVersion: '1.0.0',
            payload,
        }, options);
    }
    // ---------------------------------------------------------------------------
    // Recommendation Events
    // ---------------------------------------------------------------------------
    async publishRecommendationCreated(tenantId, payload, options) {
        return this.transport.publish({
            tenantId,
            eventType: RECOMMENDATION_EVENT_TYPES.CREATED,
            eventVersion: '1.0.0',
            payload,
        }, options);
    }
    async publishRecommendationServed(tenantId, payload, options) {
        return this.transport.publish({
            tenantId,
            eventType: RECOMMENDATION_EVENT_TYPES.SERVED,
            eventVersion: '1.0.0',
            payload,
        }, options);
    }
    async publishRecommendationClicked(tenantId, payload, options) {
        return this.transport.publish({
            tenantId,
            eventType: RECOMMENDATION_EVENT_TYPES.CLICKED,
            eventVersion: '1.0.0',
            payload,
        }, options);
    }
    async publishRecommendationDismissed(tenantId, payload, options) {
        return this.transport.publish({
            tenantId,
            eventType: RECOMMENDATION_EVENT_TYPES.DISMISSED,
            eventVersion: '1.0.0',
            payload,
        }, options);
    }
    async publishRecommendationFeedback(tenantId, payload, options) {
        return this.transport.publish({
            tenantId,
            eventType: RECOMMENDATION_EVENT_TYPES.FEEDBACK,
            eventVersion: '1.0.0',
            payload,
        }, options);
    }
    async publishRecommendationOutcome(tenantId, payload, options) {
        return this.transport.publish({
            tenantId,
            eventType: RECOMMENDATION_EVENT_TYPES.OUTCOME,
            eventVersion: '1.0.0',
            payload,
        }, options);
    }
    // ---------------------------------------------------------------------------
    // Generic Publish
    // ---------------------------------------------------------------------------
    /**
     * Publish a raw event (for custom event types).
     */
    async publishRaw(event, options) {
        return this.transport.publish(event, options);
    }
    // ---------------------------------------------------------------------------
    // Utility
    // ---------------------------------------------------------------------------
    /**
     * Get stream info for monitoring.
     */
    async getStreamInfo(eventType) {
        return this.transport.getStreamInfo(eventType);
    }
}
// -----------------------------------------------------------------------------
// Factory Function
// -----------------------------------------------------------------------------
/**
 * Create an EventPublisher instance.
 */
export function createEventPublisher(config) {
    return new EventPublisher(config);
}
//# sourceMappingURL=publisher.js.map