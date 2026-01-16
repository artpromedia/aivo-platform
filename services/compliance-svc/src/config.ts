/**
 * AIVO Compliance Service - Configuration
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
  const keyContent = process.env.JWT_PUBLIC_KEY;
  if (keyContent) {
    return keyContent;
  }
  return null;
}

export const config = {
  // Server
  port: Number(process.env.PORT || 4052),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',

  // Database
  databaseUrl: requireEnvInProduction(
    'DATABASE_URL',
    'postgresql://localhost:5432/aivo_compliance'
  ),

  // Auth
  jwtPublicKey: loadJwtPublicKey(),
  internalApiKey: process.env.INTERNAL_API_KEY || 'dev-internal-key',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // NATS
  nats: {
    url: process.env.NATS_URL || 'nats://localhost:4222',
    enabled: process.env.NATS_ENABLED !== 'false',
  },

  // Service URLs
  services: {
    authSvc: process.env.AUTH_SVC_URL || 'http://auth-svc:4001',
    auditSvc: process.env.AUDIT_SVC_URL || 'http://audit-svc:4050',
  },

  // Compliance settings
  compliance: {
    snapshotIntervalHours: Number(process.env.SNAPSHOT_INTERVAL_HOURS || 24),
    evidenceExpiryWarningDays: Number(process.env.EVIDENCE_EXPIRY_WARNING_DAYS || 30),
    findingOverdueDays: Number(process.env.FINDING_OVERDUE_DAYS || 90),
  },
} as const;
