/**
 * Writing Pad Service Configuration
 */

import { readFileSync } from 'fs';

function requireEnvInProduction(name: string, devDefault: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production`);
  }
  return value || devDefault;
}

function loadKey(envKey: string, pathEnvKey: string): string {
  const inline = process.env[envKey];
  if (inline) return inline;

  const keyPath = process.env[pathEnvKey];
  if (keyPath) return readFileSync(keyPath, 'utf-8');

  // For development, provide a fallback
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return 'development-key';
  }

  throw new Error(`Missing ${envKey} or ${pathEnvKey} environment variable`);
}

export const config = {
  port: parseInt(process.env.PORT || '4030', 10),
  logLevel: process.env.LOG_LEVEL || 'info',

  // Database
  databaseUrl: requireEnvInProduction('DATABASE_URL', 'postgresql://localhost:5432/aivo_writing'),
  pgSsl: process.env.PGSSL === 'true',

  // JWT Authentication
  jwtPublicKey: loadKey('JWT_PUBLIC_KEY', 'JWT_PUBLIC_KEY_PATH'),

  // AI Orchestrator
  aiOrchestratorUrl: requireEnvInProduction('AI_ORCHESTRATOR_URL', 'http://localhost:4010'),
  aiOrchestratorApiKey: process.env.AI_ORCHESTRATOR_API_KEY || '',

  // Session Service
  sessionSvcUrl: requireEnvInProduction('SESSION_SVC_URL', 'http://localhost:4020'),
  sessionSvcApiKey: process.env.SESSION_SVC_API_KEY || '',

  // Writing Settings
  maxDocumentSize: parseInt(process.env.MAX_DOCUMENT_SIZE || '50000', 10), // 50KB
  maxVersionsPerDocument: parseInt(process.env.MAX_VERSIONS_PER_DOCUMENT || '100', 10),
  autoSaveIntervalMs: parseInt(process.env.AUTO_SAVE_INTERVAL_MS || '30000', 10), // 30s
};
