/**
 * Configuration for the reports service.
 * Aggregates data from other microservices.
 */

function requireEnvInProduction(name: string, devDefault: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production`);
  }
  return value || devDefault;
}

export const config = {
  port: Number.parseInt(process.env.PORT || '4055', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Service URLs (use K8s internal DNS defaults)
  services: {
    baseline: process.env.BASELINE_SVC_URL || 'http://baseline-svc:3000',
    learnerModel: process.env.LEARNER_MODEL_SVC_URL || 'http://personalization-svc:3000',
    analytics: process.env.ANALYTICS_SVC_URL || 'http://analytics-svc:3000',
    goal: process.env.GOAL_SVC_URL || 'http://goal-svc:3000',
    tenant: process.env.TENANT_SVC_URL || 'http://tenant-svc:3000',
    session: process.env.SESSION_SVC_URL || 'http://session-svc:3000',
    parent: process.env.PARENT_SVC_URL || 'http://parent-svc:3000',
    profile: process.env.PROFILE_SVC_URL || 'http://profile-svc:3000',
    assessment: process.env.ASSESSMENT_SVC_URL || 'http://assessment-svc:3000',
    notify: process.env.NOTIFY_SVC_URL || 'http://notify-svc:3000',
  },

  // NATS for job queue / event bus
  natsUrl: process.env.NATS_URL || 'nats://localhost:4222',

  // Redis for caching / rate-limit state
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // S3 storage
  s3Bucket: requireEnvInProduction('S3_BUCKET', 'aivo-exports-dev'),
  s3Region: process.env.S3_REGION || 'us-east-1',

  // JWT validation
  jwtIssuer: process.env.JWT_ISSUER || 'https://auth.aivo.app',
  jwtAudience: process.env.JWT_AUDIENCE || 'aivo-api',
  jwksUrl: process.env.JWKS_URL || 'https://auth.aivo.app/.well-known/jwks.json',
} as const;

export type Config = typeof config;
