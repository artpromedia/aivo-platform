// =============================================================================
// @aivo/events - Indexing Consumer
// =============================================================================
//
// Consumer that writes all events to a Postgres events table for
// querying, debugging, and replay.
//
// Table schema:
//   events (
//     id UUID PRIMARY KEY,
//     tenant_id UUID NOT NULL,
//     event_type VARCHAR(100) NOT NULL,
//     event_version VARCHAR(20) NOT NULL,
//     timestamp TIMESTAMPTZ NOT NULL,
//     source_service VARCHAR(100) NOT NULL,
//     source_version VARCHAR(20) NOT NULL,
//     correlation_id UUID,
//     causation_id UUID,
//     payload JSONB NOT NULL,
//     metadata JSONB,
//     stream VARCHAR(50) NOT NULL,
//     sequence BIGINT NOT NULL,
//     indexed_at TIMESTAMPTZ DEFAULT NOW()
//   );

import type { BaseEvent } from '../schemas/index.js';

import { BaseConsumer } from './base-consumer.js';
import type {
  ConsumerConnectionConfig,
  ConsumerOptions,
  ProcessedMessage,
} from './base-consumer.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface IndexingConsumerConfig {
  connection: ConsumerConnectionConfig;
  consumer: Omit<ConsumerOptions, 'durableName'>;
  /** Database write function */
  writeEvent: (event: IndexedEvent) => Promise<void>;
  /** Batch size for writes (default: 100) */
  batchSize?: number;
  /** Flush interval in ms (default: 1000) */
  flushIntervalMs?: number;
}

export interface IndexedEvent {
  id: string;
  tenantId: string;
  eventType: string;
  eventVersion: string;
  timestamp: Date;
  sourceService: string;
  sourceVersion: string;
  correlationId?: string;
  causationId?: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  stream: string;
  sequence: number;
  indexedAt: Date;
}

// -----------------------------------------------------------------------------
// Indexing Consumer Class
// -----------------------------------------------------------------------------

export class IndexingConsumer extends BaseConsumer {
  private readonly buffer: IndexedEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private readonly writeEvent: (event: IndexedEvent) => Promise<void>;
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;

  constructor(config: IndexingConsumerConfig) {
    super(config.connection, {
      ...config.consumer,
      durableName: `${config.consumer.stream.toLowerCase()}-indexer`,
    });

    this.writeEvent = config.writeEvent;
    this.batchSize = config.batchSize ?? 100;
    this.flushIntervalMs = config.flushIntervalMs ?? 1000;
  }

  override async start(): Promise<void> {
    // Start flush timer
    this.flushTimer = setInterval(() => {
      this.flush().catch((err: unknown) => {
        console.error('[IndexingConsumer] Flush error:', err);
      });
    }, this.flushIntervalMs);

    await super.start();
  }

  override async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Final flush
    await this.flush();

    await super.close();
  }

  protected override async handleMessage(message: ProcessedMessage<BaseEvent>): Promise<void> {
    const event = message.event;

    const indexedEvent: IndexedEvent = {
      id: event.eventId,
      tenantId: event.tenantId,
      eventType: event.eventType,
      eventVersion: event.eventVersion,
      timestamp: new Date(event.timestamp),
      sourceService: event.source.service,
      sourceVersion: event.source.version,
      payload: (event as any).payload ?? {},
      stream: this.consumerOptions.stream,
      sequence: message.sequence,
      indexedAt: new Date(),
    };

    // Add optional fields only if they exist
    if (event.correlationId) {
      indexedEvent.correlationId = event.correlationId;
    }
    if (event.causationId) {
      indexedEvent.causationId = event.causationId;
    }
    if (event.metadata) {
      indexedEvent.metadata = event.metadata;
    }

    this.buffer.push(indexedEvent);

    if (this.buffer.length >= this.batchSize) {
      await this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    const batch = this.buffer.splice(0, this.batchSize);

    try {
      // Write events in parallel (within batch)
      await Promise.all(batch.map((event) => this.writeEvent(event)));

      console.log(
        `[IndexingConsumer:${this.consumerOptions.stream}] Indexed ${batch.length} events`
      );
    } catch (err) {
      // Put failed events back in buffer for retry
      this.buffer.unshift(...batch);
      throw err;
    }
  }
}

// -----------------------------------------------------------------------------
// Factory Function
// -----------------------------------------------------------------------------

/**
 * Create indexing consumers for all streams.
 */
export function createIndexingConsumers(
  connection: ConsumerConnectionConfig,
  writeEvent: (event: IndexedEvent) => Promise<void>,
  options?: {
    batchSize?: number;
    flushIntervalMs?: number;
  }
): IndexingConsumer[] {
  const streams = ['LEARNING', 'FOCUS', 'HOMEWORK', 'RECOMMENDATION'];

  return streams.map((stream) => {
    const config: IndexingConsumerConfig = {
      connection,
      consumer: { stream },
      writeEvent,
    };
    if (options?.batchSize !== undefined) {
      config.batchSize = options.batchSize;
    }
    if (options?.flushIntervalMs !== undefined) {
      config.flushIntervalMs = options.flushIntervalMs;
    }
    return new IndexingConsumer(config);
  });
}

// -----------------------------------------------------------------------------
// SQL Helpers
// -----------------------------------------------------------------------------

/**
 * SQL to create the events table.
 */
export const CREATE_EVENTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_version VARCHAR(20) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  source_service VARCHAR(100) NOT NULL,
  source_version VARCHAR(20) NOT NULL,
  correlation_id UUID,
  causation_id UUID,
  payload JSONB NOT NULL,
  metadata JSONB,
  stream VARCHAR(50) NOT NULL,
  sequence BIGINT NOT NULL,
  indexed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for common queries
  CONSTRAINT events_stream_sequence_unique UNIQUE (stream, sequence)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_tenant_id ON events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_correlation_id ON events(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_tenant_type_time ON events(tenant_id, event_type, timestamp);

-- Partitioning by month (for large deployments)
-- ALTER TABLE events SET (autovacuum_vacuum_scale_factor = 0.05);
`;

/**
 * SQL to insert an event.
 */
export const INSERT_EVENT_SQL = `
INSERT INTO events (
  id, tenant_id, event_type, event_version, timestamp,
  source_service, source_version, correlation_id, causation_id,
  payload, metadata, stream, sequence, indexed_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
)
ON CONFLICT (stream, sequence) DO NOTHING
`;
