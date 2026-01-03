import type { BaseEvent } from '../schemas/index.js';
import { BaseConsumer } from './base-consumer.js';
import type { ConsumerConnectionConfig, ConsumerOptions, ProcessedMessage } from './base-consumer.js';
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
export declare class IndexingConsumer extends BaseConsumer {
    private readonly buffer;
    private flushTimer;
    private readonly writeEvent;
    private readonly batchSize;
    private readonly flushIntervalMs;
    constructor(config: IndexingConsumerConfig);
    start(): Promise<void>;
    close(): Promise<void>;
    protected handleMessage(message: ProcessedMessage<BaseEvent>): Promise<void>;
    private flush;
}
/**
 * Create indexing consumers for all streams.
 */
export declare function createIndexingConsumers(connection: ConsumerConnectionConfig, writeEvent: (event: IndexedEvent) => Promise<void>, options?: {
    batchSize?: number;
    flushIntervalMs?: number;
}): IndexingConsumer[];
/**
 * SQL to create the events table.
 */
export declare const CREATE_EVENTS_TABLE_SQL = "\nCREATE TABLE IF NOT EXISTS events (\n  id UUID PRIMARY KEY,\n  tenant_id UUID NOT NULL,\n  event_type VARCHAR(100) NOT NULL,\n  event_version VARCHAR(20) NOT NULL,\n  timestamp TIMESTAMPTZ NOT NULL,\n  source_service VARCHAR(100) NOT NULL,\n  source_version VARCHAR(20) NOT NULL,\n  correlation_id UUID,\n  causation_id UUID,\n  payload JSONB NOT NULL,\n  metadata JSONB,\n  stream VARCHAR(50) NOT NULL,\n  sequence BIGINT NOT NULL,\n  indexed_at TIMESTAMPTZ DEFAULT NOW(),\n  \n  -- Indexes for common queries\n  CONSTRAINT events_stream_sequence_unique UNIQUE (stream, sequence)\n);\n\n-- Indexes\nCREATE INDEX IF NOT EXISTS idx_events_tenant_id ON events(tenant_id);\nCREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);\nCREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);\nCREATE INDEX IF NOT EXISTS idx_events_correlation_id ON events(correlation_id) WHERE correlation_id IS NOT NULL;\nCREATE INDEX IF NOT EXISTS idx_events_tenant_type_time ON events(tenant_id, event_type, timestamp);\n\n-- Partitioning by month (for large deployments)\n-- ALTER TABLE events SET (autovacuum_vacuum_scale_factor = 0.05);\n";
/**
 * SQL to insert an event.
 */
export declare const INSERT_EVENT_SQL = "\nINSERT INTO events (\n  id, tenant_id, event_type, event_version, timestamp,\n  source_service, source_version, correlation_id, causation_id,\n  payload, metadata, stream, sequence, indexed_at\n) VALUES (\n  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14\n)\nON CONFLICT (stream, sequence) DO NOTHING\n";
//# sourceMappingURL=indexing-consumer.d.ts.map