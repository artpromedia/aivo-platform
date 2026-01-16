/**
 * AIVO Event Collector Service - Configuration
 */

import fs from 'fs';

function requireEnvInProduction(name: string, devDefault: string): string {
  const value = process.env[name];
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return devDefault;
  }
  return value;
}

function loadJwtPublicKey(): string | null {
  const keyPath = process.env.JWT_PUBLIC_KEY_PATH;
  if (keyPath && fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, 'utf8');
  }
  return process.env.JWT_PUBLIC_KEY || null;
}

export const config = {
  // Server
  port: Number(process.env.PORT || 4053),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  instanceId: process.env.INSTANCE_ID || `collector-${process.pid}`,

  // Database
  databaseUrl: requireEnvInProduction(
    'DATABASE_URL',
    'postgresql://localhost:5432/aivo_event_collector'
  ),

  // Auth
  jwtPublicKey: loadJwtPublicKey(),
  internalApiKey: process.env.INTERNAL_API_KEY || 'dev-internal-key',

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    keyPrefix: 'event-collector:',
  },

  // NATS
  nats: {
    url: process.env.NATS_URL || 'nats://localhost:4222',
    enabled: process.env.NATS_ENABLED !== 'false',
  },

  // AWS (optional)
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    kinesisStream: process.env.KINESIS_STREAM,
    sqsQueueUrl: process.env.SQS_QUEUE_URL,
  },

  // Ingestion settings
  ingestion: {
    maxEventsPerRequest: Number(process.env.MAX_EVENTS_PER_REQUEST || 1000),
    maxEventSizeBytes: Number(process.env.MAX_EVENT_SIZE_BYTES || 1048576), // 1MB
    maxRequestSizeBytes: Number(process.env.MAX_REQUEST_SIZE_BYTES || 10485760), // 10MB
  },

  // Batching
  batch: {
    maxEvents: Number(process.env.BATCH_MAX_EVENTS || 1000),
    maxSizeBytes: Number(process.env.BATCH_MAX_SIZE_BYTES || 5242880), // 5MB
    maxAgeMs: Number(process.env.BATCH_MAX_AGE_MS || 5000), // 5 seconds
    sealCheckIntervalMs: Number(process.env.BATCH_SEAL_CHECK_INTERVAL_MS || 1000),
  },

  // Processing
  processing: {
    workerConcurrency: Number(process.env.WORKER_CONCURRENCY || 10),
    batchConcurrency: Number(process.env.BATCH_CONCURRENCY || 5),
    maxRetries: Number(process.env.MAX_RETRIES || 3),
    retryDelayMs: Number(process.env.RETRY_DELAY_MS || 1000),
    retryBackoffMultiplier: Number(process.env.RETRY_BACKOFF_MULTIPLIER || 2),
  },

  // Deduplication
  deduplication: {
    enabled: process.env.DEDUPLICATION_ENABLED !== 'false',
    windowSeconds: Number(process.env.DEDUPLICATION_WINDOW_SEC || 300), // 5 minutes
  },

  // Metrics
  metrics: {
    enabled: process.env.METRICS_ENABLED !== 'false',
    aggregationIntervalMs: Number(process.env.METRICS_AGGREGATION_INTERVAL_MS || 60000), // 1 minute
  },

  // Health check
  health: {
    heartbeatIntervalMs: Number(process.env.HEARTBEAT_INTERVAL_MS || 30000), // 30 seconds
  },
} as const;
