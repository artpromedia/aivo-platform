// =============================================================================
// @aivo/events - Main Entry Point
// =============================================================================
//
// AIVO Event Streaming Library
//
// Features:
// - Typed event schemas with Zod validation
// - NATS JetStream transport with retry/DLQ
// - High-level publisher with convenience methods
// - Consumer utilities for indexing and aggregation
//
// Usage:
//   import { EventPublisher, createEventPublisher } from '@aivo/events';
//   import { LearningSessionStartedSchema } from '@aivo/events/schemas';
//
//   const publisher = createEventPublisher({
//     servers: 'nats://localhost:4222',
//     serviceName: 'session-svc',
//     serviceVersion: '1.0.0',
//   });
//
//   await publisher.connect();
//   await publisher.publishLearningSessionStarted(tenantId, { ... });
//   await publisher.close();

// Schemas
export * from './schemas';

// Transport
export * from './transport';

// Consumer utilities
export * from './consumer';
