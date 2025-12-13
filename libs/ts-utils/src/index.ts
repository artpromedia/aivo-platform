/**
 * @aivo/ts-utils
 *
 * Shared TypeScript utilities for the AIVO platform.
 *
 * @module @aivo/ts-utils
 */

export {
  EventPublisher,
  createEventPublisher,
  InMemoryTransport,
  EventValidationError,
  MissingTenantIdError,
  type EventTransport,
  type EventPublisherConfig,
  type EventLogger,
  type PublishResult,
  type BatchPublishResult,
} from './event-publisher.js';

export {
  correlationIdMiddleware,
  createCorrelatedHeaders,
  createCorrelatedLogger,
  type CorrelationIdOptions,
} from './correlation-id.js';
