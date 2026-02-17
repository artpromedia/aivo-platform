/**
 * Device Sync Configuration
 *
 * Serves default configuration values for the device sync module.
 * Uses environment variables with sensible defaults.
 */

export const deviceSyncConfig = {
  sync: {
    batchSize: Number.parseInt(process.env.DEVICE_SYNC_BATCH_SIZE || '100', 10),
    maxConflicts: Number.parseInt(process.env.DEVICE_SYNC_MAX_CONFLICTS || '50', 10),
    conflictTtlDays: Number.parseInt(process.env.DEVICE_SYNC_CONFLICT_TTL_DAYS || '30', 10),
    historyRetentionDays: Number.parseInt(
      process.env.DEVICE_SYNC_HISTORY_RETENTION_DAYS || '90',
      10
    ),
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-sync-svc',
    issuer: process.env.JWT_ISSUER || 'aivo',
  },

  websocket: {
    heartbeatIntervalMs: Number.parseInt(
      process.env.WS_HEARTBEAT_INTERVAL_MS || '30000',
      10
    ),
    clientTimeoutMs: Number.parseInt(process.env.WS_CLIENT_TIMEOUT_MS || '90000', 10),
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
