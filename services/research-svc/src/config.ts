import 'dotenv/config';

export const config = {
  port: Number.parseInt(process.env.PORT ?? '3040', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
  
  // NATS
  natsUrl: process.env.NATS_URL ?? 'nats://localhost:4222',
  
  // S3/Storage
  s3Bucket: process.env.S3_BUCKET ?? 'aivo-research-exports',
  s3Region: process.env.S3_REGION ?? 'us-east-1',
  
  // Privacy
  deidentificationSalt: process.env.RESEARCH_DEIDENTIFICATION_SALT ?? 'dev-salt',
  kAnonymityThreshold: Number.parseInt(process.env.K_ANONYMITY_THRESHOLD ?? '10', 10),
  
  // Export retention
  exportRetentionDays: Number.parseInt(process.env.EXPORT_RETENTION_DAYS ?? '30', 10),
  
  // Warehouse connection
  warehouseDatabaseUrl: process.env.WAREHOUSE_DATABASE_URL ?? process.env.DATABASE_URL,
} as const;
