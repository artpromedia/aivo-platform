/**
 * AIVO Model Registry Service - Configuration
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
  port: Number(process.env.PORT || 4051),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',

  // Database
  databaseUrl: requireEnvInProduction(
    'DATABASE_URL',
    'postgresql://localhost:5432/aivo_model_registry'
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

  // S3 Storage
  s3: {
    bucket: process.env.S3_BUCKET || 'aivo-model-registry',
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT, // For MinIO/LocalStack
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },

  // Model Registry Settings
  registry: {
    maxArtifactSizeBytes: Number(process.env.MAX_ARTIFACT_SIZE_BYTES || 10 * 1024 * 1024 * 1024), // 10GB
    presignedUrlExpiresSec: Number(process.env.PRESIGNED_URL_EXPIRES_SEC || 3600), // 1 hour
  },

  // Service URLs
  services: {
    authSvc: process.env.AUTH_SVC_URL || 'http://auth-svc:4001',
    auditSvc: process.env.AUDIT_SVC_URL || 'http://audit-svc:4050',
  },
} as const;
