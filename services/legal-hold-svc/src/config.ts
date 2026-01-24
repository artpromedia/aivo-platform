/**
 * AIVO Legal Hold Service - Configuration
 */

import * as dotenv from 'dotenv';
dotenv.config();

function requireEnvInProduction(name: string, devDefault: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production`);
  }
  return value || devDefault;
}

export const config = {
  port: Number.parseInt(process.env.PORT || '4061', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',

  // Database
  databaseUrl: requireEnvInProduction('DATABASE_URL', 'postgresql://localhost:5432/aivo_legal_hold'),

  // Authentication
  jwtPublicKeyPath: process.env.JWT_PUBLIC_KEY_PATH || '../../.keys/jwt-public.pem',
  internalApiKey: process.env.INTERNAL_API_KEY || 'dev-internal-key',

  // Redis
  redis: {
    url: requireEnvInProduction('REDIS_URL', 'redis://localhost:6379'),
  },

  // NATS
  nats: {
    url: requireEnvInProduction('NATS_URL', 'nats://localhost:4222'),
    enabled: process.env.NATS_ENABLED !== 'false',
  },

  // Email (for notifications)
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    host: requireEnvInProduction('SMTP_HOST', 'localhost'),
    port: Number.parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'legal-hold@aivo.com',
    replyTo: process.env.EMAIL_REPLY_TO || 'legal@aivo.com',
  },

  // Hold settings
  holds: {
    defaultReminderDays: Number.parseInt(process.env.DEFAULT_REMINDER_DAYS || '7', 10),
    defaultEscalationDays: Number.parseInt(process.env.DEFAULT_ESCALATION_DAYS || '14', 10),
    acknowledgmentDeadlineDays: Number.parseInt(process.env.ACKNOWLEDGMENT_DEADLINE_DAYS || '5', 10),
    maxReminders: Number.parseInt(process.env.MAX_REMINDERS || '5', 10),
  },

  // Notification settings
  notifications: {
    batchSize: Number.parseInt(process.env.NOTIFICATION_BATCH_SIZE || '50', 10),
    retryAttempts: Number.parseInt(process.env.NOTIFICATION_RETRY_ATTEMPTS || '3', 10),
    retryDelayMs: Number.parseInt(process.env.NOTIFICATION_RETRY_DELAY_MS || '5000', 10),
  },

  // Report settings
  reports: {
    expirationDays: Number.parseInt(process.env.REPORT_EXPIRATION_DAYS || '7', 10),
    maxExportSize: Number.parseInt(process.env.MAX_EXPORT_SIZE || '100000', 10),
  },

  // Service URLs
  services: {
    authSvc: process.env.AUTH_SVC_URL || 'http://auth-svc:4001',
    auditSvc: process.env.AUDIT_SVC_URL || 'http://audit-svc:4050',
  },
};
