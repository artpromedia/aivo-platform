import 'dotenv/config';

function requireEnvInProduction(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production`);
  }
  return value || defaultValue || '';
}

export const config = {
  port: Number.parseInt(process.env.PORT ?? '3040', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  // JWT (required in production)
  jwtSecret: requireEnvInProduction('JWT_SECRET', 'dev-only-secret'),

  // NATS
  natsUrl: process.env.NATS_URL ?? 'nats://localhost:4222',

  // S3/Storage Configuration
  s3Bucket:
    process.env.S3_RESEARCH_EXPORT_BUCKET ?? process.env.S3_BUCKET ?? 'aivo-research-exports',
  s3Region: process.env.AWS_REGION ?? process.env.S3_REGION ?? 'us-east-1',
  s3KmsKeyId: process.env.S3_KMS_KEY_ID ?? 'alias/aivo-research-exports',
  s3Endpoint: process.env.S3_ENDPOINT, // Optional, for MinIO/LocalStack

  // Presigned URL expiry (in hours, default 24)
  exportUrlExpiryHours: Number.parseInt(process.env.RESEARCH_EXPORT_URL_EXPIRY_HOURS ?? '24', 10),

  // Privacy (required in production - critical for data protection)
  deidentificationSalt: requireEnvInProduction('RESEARCH_DEIDENTIFICATION_SALT', 'dev-only-salt'),
  kAnonymityThreshold: Number.parseInt(process.env.K_ANONYMITY_THRESHOLD ?? '10', 10),

  // Export retention
  exportRetentionDays: Number.parseInt(process.env.EXPORT_RETENTION_DAYS ?? '30', 10),

  // Warehouse connection
  warehouseDatabaseUrl: process.env.WAREHOUSE_DATABASE_URL ?? process.env.DATABASE_URL,

  // Computed properties for compatibility
  get PORT() {
    return this.port;
  },
  get LOG_LEVEL() {
    return this.nodeEnv === 'development' ? 'debug' : 'info';
  },
  get isDev() {
    return this.nodeEnv === 'development';
  },
  get JWT_SECRET() {
    return this.jwtSecret;
  },
  get CORS_ORIGINS() {
    return process.env.CORS_ORIGINS ?? 'http://localhost:3000';
  },
  get NATS_URL() {
    return this.natsUrl;
  },
} as const;
