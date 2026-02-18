/**
 * AIVO Audit Service - Configuration
 *
 * Centralized configuration management with environment variable validation.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import * as dotenv from 'dotenv';

dotenv.config();

function readOptionalKey(
  keyEnv: string | undefined,
  fileEnv: string | undefined
): string | undefined {
  if (keyEnv) return keyEnv;
  if (fileEnv) {
    const abs = path.resolve(fileEnv);
    try {
      return fs.readFileSync(abs, 'utf-8');
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function requireEnvInProduction(name: string, devDefault: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production`);
  }
  return value || devDefault;
}

export const config = {
  // Server
  port: Number(process.env.PORT || 4050),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',

  // Database
  databaseUrl: requireEnvInProduction(
    'DATABASE_URL',
    'postgresql://localhost:5432/aivo_audit'
  ),

  // JWT Authentication
  jwtPublicKey: readOptionalKey(
    process.env.JWT_PUBLIC_KEY,
    process.env.JWT_PUBLIC_KEY_PATH
  ),
  internalApiKey: process.env.INTERNAL_API_KEY || 'dev-internal-key',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // NATS
  nats: {
    enabled: process.env.NATS_ENABLED === 'true',
    url: process.env.NATS_URL || 'nats://localhost:4222',
  },

  // Retention Settings
  retentionDays: Number(process.env.AUDIT_RETENTION_DAYS || 2555), // ~7 years
  exportRetentionDays: Number(process.env.EXPORT_RETENTION_DAYS || 7),

  // Service URLs
  authServiceUrl: process.env.AUTH_SVC_URL || 'http://auth-svc:4001',

  // Pagination defaults
  defaultPageSize: 50,
  maxPageSize: 1000,
};
