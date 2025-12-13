// =============================================================================
// @aivo/events - Event Publisher
// =============================================================================
//
// High-level publisher with typed methods for each event domain.
// Wraps NatsTransport with convenience methods and type safety.

import type {
  // Learning events
  LearningSessionStarted,
  LearningSessionEnded,
  ActivityStarted,
  ActivityCompleted,
  SkillMasteryUpdated,
  EngagementMetric,
  // Focus events
  FocusPing,
  FocusSample,
  FocusLoss,
  FocusSessionSummary,
  // Homework events
  HomeworkSessionStarted,
  HomeworkSessionEnded,
  HomeworkQuestionAsked,
  HomeworkHintRequested,
  HomeworkHintDelivered,
  HomeworkSolutionAttempted,
  HomeworkQuestionCompleted,
  // Recommendation events
  RecommendationCreated,
  RecommendationServed,
  RecommendationClicked,
  RecommendationDismissed,
  RecommendationFeedback,
  RecommendationOutcome,
} from '../schemas/index.js';
import {
  LEARNING_EVENT_TYPES,
  FOCUS_EVENT_TYPES,
  HOMEWORK_EVENT_TYPES,
  RECOMMENDATION_EVENT_TYPES,
} from '../schemas/index.js';

import { NatsTransport } from './nats-transport.js';
import type { NatsTransportConfig, PublishOptions, PublishResult } from './nats-transport.js';

// -----------------------------------------------------------------------------
// Publisher Configuration
// -----------------------------------------------------------------------------

export interface EventPublisherConfig extends NatsTransportConfig {
  /** Default tenant ID (can be overridden per-event) */
  defaultTenantId?: string;
}

// -----------------------------------------------------------------------------
// Event Publisher Class
// -----------------------------------------------------------------------------

export class EventPublisher {
  private readonly transport: NatsTransport;
  private readonly defaultTenantId: string | undefined;

  constructor(config: EventPublisherConfig) {
    this.transport = new NatsTransport(config);
    this.defaultTenantId = config.defaultTenantId;
  }

  // ---------------------------------------------------------------------------
  // Connection Management
  // ---------------------------------------------------------------------------

  async connect(): Promise<void> {
    return this.transport.connect();
  }

  async close(): Promise<void> {
    return this.transport.close();
  }

  isConnected(): boolean {
    return this.transport.isConnected();
  }

  // ---------------------------------------------------------------------------
  // Learning Events
  // ---------------------------------------------------------------------------

  async publishLearningSessionStarted(
    tenantId: string,
    payload: LearningSessionStarted['payload'],
    options?: PublishOptions
  ): Promise<PublishResult> {
    return this.transport.publish<LearningSessionStarted>(
      {
        tenantId,
        eventType: LEARNING_EVENT_TYPES.SESSION_STARTED,
        eventVersion: '1.0.0',
        payload,
      },
      options
    );
  }

  async publishLearningSessionEnded(
    tenantId: string,
    payload: LearningSessionEnded['payload'],
    options?: PublishOptions
  ): Promise<PublishResult> {
    return this.transport.publish<LearningSessionEnded>(
      {
        tenantId,
        eventType: LEARNING_EVENT_TYPES.SESSION_ENDED,
        eventVersion: '1.0.0',
        payload,
      },
      options
    );
  }

  async publishActivityStarted(
    tenantId: string,
    payload: ActivityStarted['payload'],
    options?: PublishOptions
  ): Promise<PublishResult> {
    return this.transport.publish<ActivityStarted>(
      {
        tenantId,
        eventType: LEARNING_EVENT_TYPES.ACTIVITY_STARTED,
        eventVersion: '1.0.0',
        payload,
      },
      options
    );
  }

  async publishActivityCompleted(
    tenantId: string,
    payload: ActivityCompleted['payload'],
    options?: PublishOptions
  ): Promise<PublishResult> {
    return this.transport.publish<ActivityCompleted>(
      {
        tenantId,
        eventType: LEARNING_EVENT_TYPES.ACTIVITY_COMPLETED,
        eventVersion: '1.0.0',
        payload,
      },
      options
    );
  }

  async publishSkillMasteryUpdated(
    tenantId: string,
    payload: SkillMasteryUpdated['payload'],
    options?: PublishOptions
  ): Promise<PublishResult> {
    return this.transport.publish<SkillMasteryUpdated>(
      {
        tenantId,
        eventType: LEARNING_EVENT_TYPES.SKILL_MASTERY_UPDATED,
        eventVersion: '1.0.0',
        payload,
      },
      options
    );
  }

  async publishEngagementMetric(
    tenantId: string,
    payload: EngagementMetric['payload'],
    options?: PublishOptions
  ): Promise<PublishResult> {
    return this.transport.publish<EngagementMetric>(
      {
        tenantId,
        eventType: LEARNING_EVENT_TYPES.ENGAGEMENT_METRIC,
        eventVersion: '1.0.0',
        payload,
      },
      options
    );
  }

  // ---------------------------------------------------------------------------
  // Focus Events
  // ---------------------------------------------------------------------------

  async publishFocusPing(
    tenantId: string,
    payload: FocusPing['payload'],
    options?: PublishOptions
  ): Promise<PublishResult> {
    return this.transport.publish<FocusPing>(
      {
        tenantId,
        eventType: FOCUS_EVENT_TYPES.PING,
        eventVersion: '1.0.0',
        payload,
      },
      options
    );
  }

  async publishFocusSample(
    tenantId: string,
    payload: FocusSample['payload'],
    options?: PublishOptions
  ): Promise<PublishResult> {
    return this.transport.publish<FocusSample>(
      {
        tenantId,
        eventType: FOCUS_EVENT_TYPES.SAMPLE,
        eventVersion: '1.0.0',
        payload,
      },
      options
    );
  }

  async publishFocusLoss(
    tenantId: string,
    payload: FocusLoss['payload'],
    options?: PublishOptions
  ): Promise<PublishResult> {
    return this.transport.publish<FocusLoss>(
      {
        tenantId,
        eventType: FOCUS_EVENT_TYPES.LOSS,
        eventVersion: '1.0.0',
        payload,
      },
      options
    );
  }

  async publishFocusSessionSummary(
    tenantId: string,
    payload: FocusSessionSummary['payload'],
    options?: PublishOptions
  ): Promise<PublishResult> {
    return this.transport.publish<FocusSessionSummary>(
      {
        tenantId,
        eventType: FOCUS_EVENT_TYPES.SESSION_SUMMARY,
        eventVersion: '1.0.0',
        payload,
      },
      options
    );
  }

  // ---------------------------------------------------------------------------
  // Homework Events
  // ---------------------------------------------------------------------------

  async publishHomeworkSessionStarted(
    tenantId: string,
    payload: HomeworkSessionStarted['payload'],
    options?: PublishOptions
  ): Promise<PublishResult> {
    return this.transport.publish<HomeworkSessionStarted>(
      {
        tenantId,
        eventType: HOMEWORK_EVENT_TYPES.SESSION_STARTED,
        eventVersion: '1.0.0',
        payload,
      },
      options
    );
  }

  async publishHomeworkSessionEnded(
    tenantId: string,
    payload: HomeworkSessionEnded['payload'],
    options?: PublishOptions
  ): Promise<PublishResult> {
    return this.transport.publish<HomeworkSessionEnded>(
      {
        tenantId,
        eventType: HOMEWORK_EVENT_TYPES.SESSION_ENDED,
        eventVersion: '1.0.0',
        payload,
      },
      options
    );
  }

  async publishHomeworkQuestionAsked(
    tenantId: string,
    payload: HomeworkQuestionAsked['payload'],
    options?: PublishOptions
  ): Promise<PublishResult> {
    return this.transport.publish<HomeworkQuestionAsked>(
      {
        tenantId,
        eventType: HOMEWORK_EVENT_TYPES.QUESTION_ASKED,
        eventVersion: '1.0.0',
        payload,
      },
      options
    );
  }

  async publishHomeworkHintRequested(
    tenantId: string,
    payload: HomeworkHintRequested['payload'],
    options?: PublishOptions
  ): Promise<PublishResult> {
    return this.transport.publish<HomeworkHintRequested>(
      {
        tenantId,
        eventType: HOMEWORK_EVENT_TYPES.HINT_REQUESTED,
        eventVersion: '1.0.0',
        payload,
      },
      options
    );
  }

  async publishHomeworkHintDelivered(
    tenantId: string,
    payload: HomeworkHintDelivered['payload'],
    options?: PublishOptions
  ): Promise<PublishResult> {
    return this.transport.publish<HomeworkHintDelivered>(
      {
        tenantId,
        eventType: HOMEWORK_EVENT_TYPES.HINT_DELIVERED,
        eventVersion: '1.0.0',
        payload,
      },
      options
    );
  }

  async publishHomeworkSolutionAttempted(
    tenantId: string,
    payload: HomeworkSolutionAttempted['payload'],
    options?: PublishOptions
  ): Promise<PublishResult> {
    return this.transport.publish<HomeworkSolutionAttempted>(
      {
        tenantId,
        eventType: HOMEWORK_EVENT_TYPES.SOLUTION_ATTEMPTED,
        eventVersion: '1.0.0',
        payload,
      },
      options
    );
  }

  async publishHomeworkQuestionCompleted(
    tenantId: string,
    payload: HomeworkQuestionCompleted['payload'],
    options?: PublishOptions
  ): Promise<PublishResult> {
    return this.transport.publish<HomeworkQuestionCompleted>(
      {
        tenantId,
        eventType: HOMEWORK_EVENT_TYPES.QUESTION_COMPLETED,
        eventVersion: '1.0.0',
        payload,
      },
      options
    );
  }

  // ---------------------------------------------------------------------------
  // Recommendation Events
  // ---------------------------------------------------------------------------

  async publishRecommendationCreated(
    tenantId: string,
    payload: RecommendationCreated['payload'],
    options?: PublishOptions
  ): Promise<PublishResult> {
    return this.transport.publish<RecommendationCreated>(
      {
        tenantId,
        eventType: RECOMMENDATION_EVENT_TYPES.CREATED,
        eventVersion: '1.0.0',
        payload,
      },
      options
    );
  }

  async publishRecommendationServed(
    tenantId: string,
    payload: RecommendationServed['payload'],
    options?: PublishOptions
  ): Promise<PublishResult> {
    return this.transport.publish<RecommendationServed>(
      {
        tenantId,
        eventType: RECOMMENDATION_EVENT_TYPES.SERVED,
        eventVersion: '1.0.0',
        payload,
      },
      options
    );
  }

  async publishRecommendationClicked(
    tenantId: string,
    payload: RecommendationClicked['payload'],
    options?: PublishOptions
  ): Promise<PublishResult> {
    return this.transport.publish<RecommendationClicked>(
      {
        tenantId,
        eventType: RECOMMENDATION_EVENT_TYPES.CLICKED,
        eventVersion: '1.0.0',
        payload,
      },
      options
    );
  }

  async publishRecommendationDismissed(
    tenantId: string,
    payload: RecommendationDismissed['payload'],
    options?: PublishOptions
  ): Promise<PublishResult> {
    return this.transport.publish<RecommendationDismissed>(
      {
        tenantId,
        eventType: RECOMMENDATION_EVENT_TYPES.DISMISSED,
        eventVersion: '1.0.0',
        payload,
      },
      options
    );
  }

  async publishRecommendationFeedback(
    tenantId: string,
    payload: RecommendationFeedback['payload'],
    options?: PublishOptions
  ): Promise<PublishResult> {
    return this.transport.publish<RecommendationFeedback>(
      {
        tenantId,
        eventType: RECOMMENDATION_EVENT_TYPES.FEEDBACK,
        eventVersion: '1.0.0',
        payload,
      },
      options
    );
  }

  async publishRecommendationOutcome(
    tenantId: string,
    payload: RecommendationOutcome['payload'],
    options?: PublishOptions
  ): Promise<PublishResult> {
    return this.transport.publish<RecommendationOutcome>(
      {
        tenantId,
        eventType: RECOMMENDATION_EVENT_TYPES.OUTCOME,
        eventVersion: '1.0.0',
        payload,
      },
      options
    );
  }

  // ---------------------------------------------------------------------------
  // Generic Publish
  // ---------------------------------------------------------------------------

  /**
   * Publish a raw event (for custom event types).
   */
  async publishRaw(
    event: Omit<
      {
        eventId: string;
        tenantId: string;
        eventType: string;
        eventVersion: string;
        timestamp: string;
        source: { service: string; version: string };
        payload: Record<string, unknown>;
      },
      'eventId' | 'timestamp' | 'source'
    >,
    options?: PublishOptions
  ): Promise<PublishResult> {
    return this.transport.publish(event, options);
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  /**
   * Get stream info for monitoring.
   */
  async getStreamInfo(eventType: string) {
    return this.transport.getStreamInfo(eventType);
  }
}

// -----------------------------------------------------------------------------
// Factory Function
// -----------------------------------------------------------------------------

/**
 * Create an EventPublisher instance.
 */
export function createEventPublisher(config: EventPublisherConfig): EventPublisher {
  return new EventPublisher(config);
}
