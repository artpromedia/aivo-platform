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
import { BaseConsumer } from './base-consumer.js';
// -----------------------------------------------------------------------------
// Indexing Consumer Class
// -----------------------------------------------------------------------------
export class IndexingConsumer extends BaseConsumer {
    buffer = [];
    flushTimer = null;
    writeEvent;
    batchSize;
    flushIntervalMs;
    constructor(config) {
        super(config.connection, {
            ...config.consumer,
            durableName: `${config.consumer.stream.toLowerCase()}-indexer`,
        });
        this.writeEvent = config.writeEvent;
        this.batchSize = config.batchSize ?? 100;
        this.flushIntervalMs = config.flushIntervalMs ?? 1000;
    }
    async start() {
        // Start flush timer
        this.flushTimer = setInterval(() => {
            this.flush().catch((err) => {
                console.error('[IndexingConsumer] Flush error:', err);
            });
        }, this.flushIntervalMs);
        await super.start();
    }
    async close() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
        // Final flush
        await this.flush();
        await super.close();
    }
    async handleMessage(message) {
        const event = message.event;
        const indexedEvent = {
            id: event.eventId,
            tenantId: event.tenantId,
            eventType: event.eventType,
            eventVersion: event.eventVersion,
            timestamp: new Date(event.timestamp),
            sourceService: event.source.service,
            sourceVersion: event.source.version,
            payload: event.payload ?? {},
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
    async flush() {
        if (this.buffer.length === 0) {
            return;
        }
        const batch = this.buffer.splice(0, this.batchSize);
        try {
            // Write events in parallel (within batch)
            await Promise.all(batch.map((event) => this.writeEvent(event)));
            console.log(`[IndexingConsumer:${this.consumerOptions.stream}] Indexed ${batch.length} events`);
        }
        catch (err) {
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
export function createIndexingConsumers(connection, writeEvent, options) {
    const streams = ['LEARNING', 'FOCUS', 'HOMEWORK', 'RECOMMENDATION'];
    return streams.map((stream) => {
        const config = {
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
//# sourceMappingURL=indexing-consumer.js.map