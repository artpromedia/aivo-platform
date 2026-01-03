import type { LearningSessionStarted, LearningSessionEnded, ActivityStarted, ActivityCompleted, SkillMasteryUpdated, EngagementMetric, FocusPing, FocusSample, FocusLoss, FocusSessionSummary, HomeworkSessionStarted, HomeworkSessionEnded, HomeworkQuestionAsked, HomeworkHintRequested, HomeworkHintDelivered, HomeworkSolutionAttempted, HomeworkQuestionCompleted, RecommendationCreated, RecommendationServed, RecommendationClicked, RecommendationDismissed, RecommendationFeedback, RecommendationOutcome } from '../schemas/index.js';
import type { NatsTransportConfig, PublishOptions, PublishResult } from './nats-transport.js';
export interface EventPublisherConfig extends NatsTransportConfig {
    /** Default tenant ID (can be overridden per-event) */
    defaultTenantId?: string;
}
export declare class EventPublisher {
    private readonly transport;
    private readonly defaultTenantId;
    constructor(config: EventPublisherConfig);
    connect(): Promise<void>;
    close(): Promise<void>;
    isConnected(): boolean;
    publishLearningSessionStarted(tenantId: string, payload: LearningSessionStarted['payload'], options?: PublishOptions): Promise<PublishResult>;
    publishLearningSessionEnded(tenantId: string, payload: LearningSessionEnded['payload'], options?: PublishOptions): Promise<PublishResult>;
    publishActivityStarted(tenantId: string, payload: ActivityStarted['payload'], options?: PublishOptions): Promise<PublishResult>;
    publishActivityCompleted(tenantId: string, payload: ActivityCompleted['payload'], options?: PublishOptions): Promise<PublishResult>;
    publishSkillMasteryUpdated(tenantId: string, payload: SkillMasteryUpdated['payload'], options?: PublishOptions): Promise<PublishResult>;
    publishEngagementMetric(tenantId: string, payload: EngagementMetric['payload'], options?: PublishOptions): Promise<PublishResult>;
    publishFocusPing(tenantId: string, payload: FocusPing['payload'], options?: PublishOptions): Promise<PublishResult>;
    publishFocusSample(tenantId: string, payload: FocusSample['payload'], options?: PublishOptions): Promise<PublishResult>;
    publishFocusLoss(tenantId: string, payload: FocusLoss['payload'], options?: PublishOptions): Promise<PublishResult>;
    publishFocusSessionSummary(tenantId: string, payload: FocusSessionSummary['payload'], options?: PublishOptions): Promise<PublishResult>;
    publishHomeworkSessionStarted(tenantId: string, payload: HomeworkSessionStarted['payload'], options?: PublishOptions): Promise<PublishResult>;
    publishHomeworkSessionEnded(tenantId: string, payload: HomeworkSessionEnded['payload'], options?: PublishOptions): Promise<PublishResult>;
    publishHomeworkQuestionAsked(tenantId: string, payload: HomeworkQuestionAsked['payload'], options?: PublishOptions): Promise<PublishResult>;
    publishHomeworkHintRequested(tenantId: string, payload: HomeworkHintRequested['payload'], options?: PublishOptions): Promise<PublishResult>;
    publishHomeworkHintDelivered(tenantId: string, payload: HomeworkHintDelivered['payload'], options?: PublishOptions): Promise<PublishResult>;
    publishHomeworkSolutionAttempted(tenantId: string, payload: HomeworkSolutionAttempted['payload'], options?: PublishOptions): Promise<PublishResult>;
    publishHomeworkQuestionCompleted(tenantId: string, payload: HomeworkQuestionCompleted['payload'], options?: PublishOptions): Promise<PublishResult>;
    publishRecommendationCreated(tenantId: string, payload: RecommendationCreated['payload'], options?: PublishOptions): Promise<PublishResult>;
    publishRecommendationServed(tenantId: string, payload: RecommendationServed['payload'], options?: PublishOptions): Promise<PublishResult>;
    publishRecommendationClicked(tenantId: string, payload: RecommendationClicked['payload'], options?: PublishOptions): Promise<PublishResult>;
    publishRecommendationDismissed(tenantId: string, payload: RecommendationDismissed['payload'], options?: PublishOptions): Promise<PublishResult>;
    publishRecommendationFeedback(tenantId: string, payload: RecommendationFeedback['payload'], options?: PublishOptions): Promise<PublishResult>;
    publishRecommendationOutcome(tenantId: string, payload: RecommendationOutcome['payload'], options?: PublishOptions): Promise<PublishResult>;
    /**
     * Publish a raw event (for custom event types).
     */
    publishRaw(event: Omit<{
        eventId: string;
        tenantId: string;
        eventType: string;
        eventVersion: string;
        timestamp: string;
        source: {
            service: string;
            version: string;
        };
        payload: Record<string, unknown>;
    }, 'eventId' | 'timestamp' | 'source'>, options?: PublishOptions): Promise<PublishResult>;
    /**
     * Get stream info for monitoring.
     */
    getStreamInfo(eventType: string): Promise<{
        name: string;
        messages: number;
        bytes: number;
        firstSeq: number;
        lastSeq: number;
    }>;
}
/**
 * Create an EventPublisher instance.
 */
export declare function createEventPublisher(config: EventPublisherConfig): EventPublisher;
//# sourceMappingURL=publisher.d.ts.map