// ==============================================================================
// AIVO Status Page Service — Configuration
// ==============================================================================

import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3090', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  // SQLite — deliberately NOT on the platform PostgreSQL so the status page
  // survives full platform outages.
  databasePath: process.env.DATABASE_PATH || './data/status.db',

  // Prometheus (to poll platform health metrics)
  prometheusUrl: process.env.PROMETHEUS_URL || 'http://prometheus:9090',

  // Alertmanager webhook verification
  alertmanagerWebhookSecret: process.env.ALERTMANAGER_WEBHOOK_SECRET || '',

  // Notification SMTP
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'status@aivolearning.com',
  },

  // Public URL for feed links / unsubscribe
  publicUrl: process.env.PUBLIC_URL || 'https://status.aivolearning.com',

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // Auto-incident detection thresholds
  detection: {
    /** Seconds a component must be down before auto-creating an incident */
    downThresholdSeconds: 120, // 2 minutes
    /** Error rate (0-1) above which an incident is created */
    errorRateThreshold: 0.05, // 5 %
    /** Seconds error rate must remain above threshold */
    errorRateDurationSeconds: 300, // 5 minutes
    /** Factor by which P95 must exceed baseline to trigger incident */
    latencyFactor: 2.0, // 2×
    /** Seconds P95 must remain elevated */
    latencyDurationSeconds: 600, // 10 minutes
    /** Seconds a component must be healthy before auto-resolving */
    autoResolveSeconds: 300, // 5 minutes
    /** How often to run detection checks (seconds) */
    pollIntervalSeconds: 30,
  },
} as const;
