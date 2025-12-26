import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3080', 10),
    host: process.env.HOST || '0.0.0.0',
  },

  database: {
    url: process.env.DATABASE_URL || '',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || '',
    issuer: process.env.JWT_ISSUER || 'aivo',
  },

  sync: {
    batchSize: parseInt(process.env.SYNC_BATCH_SIZE || '100', 10),
    maxConflicts: parseInt(process.env.SYNC_MAX_CONFLICTS || '50', 10),
    conflictTtlDays: parseInt(process.env.SYNC_CONFLICT_TTL_DAYS || '30', 10),
    historyRetentionDays: parseInt(
      process.env.SYNC_HISTORY_RETENTION_DAYS || '90',
      10
    ),
  },

  websocket: {
    heartbeatIntervalMs: parseInt(
      process.env.WS_HEARTBEAT_INTERVAL_MS || '30000',
      10
    ),
    clientTimeoutMs: parseInt(process.env.WS_CLIENT_TIMEOUT_MS || '90000', 10),
  },

  jobs: {
    cleanupCron: process.env.JOB_CLEANUP_CRON || '0 0 3 * * *',
    conflictResolveCron: process.env.JOB_CONFLICT_RESOLVE_CRON || '0 */5 * * * *',
  },

  features: {
    deltaSync: process.env.ENABLE_DELTA_SYNC === 'true',
    autoConflictResolution: process.env.ENABLE_AUTO_CONFLICT_RESOLUTION === 'true',
    websocketSync: process.env.ENABLE_WEBSOCKET_SYNC === 'true',
  },
};
