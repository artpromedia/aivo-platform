// =============================================================================
// @aivo/events - Consumer Index
// =============================================================================

export {
  BaseConsumer,
  type ConsumerConnectionConfig,
  type ConsumerOptions,
  type ProcessedMessage,
  type MessageHandler,
} from './base-consumer';

export {
  IndexingConsumer,
  createIndexingConsumers,
  CREATE_EVENTS_TABLE_SQL,
  INSERT_EVENT_SQL,
  type IndexingConsumerConfig,
  type IndexedEvent,
} from './indexing-consumer';

export {
  AnalyticsConsumer,
  createAnalyticsConsumers,
  CREATE_ANALYTICS_TABLES_SQL,
  type AnalyticsConsumerConfig,
  type EventCountAggregation,
  type SessionMetricsAggregation,
  type EngagementMetricsAggregation,
  type FocusMetricsAggregation,
} from './analytics-consumer';

export {
  EventReplayService,
  createEventReplayService,
  type ReplayServiceConfig,
  type ReplayOptions,
  type ReplayResult,
  type StreamInfo,
  type MessageInfo,
} from './replay-service';

export {
  DLQService,
  createDLQService,
  type DLQServiceConfig,
  type DLQMessage,
  type DLQStats,
  type RetryResult,
} from './dlq-service';
