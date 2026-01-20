/**
 * Assessment Service Configuration
 */

// JWT secret is required in production
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}

export const config = {
  port: process.env.PORT ?? '3031',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? '',
  natsUrl: process.env.NATS_URL ?? 'nats://localhost:4222',
  jwtSecret: jwtSecret ?? 'dev-only-not-for-production',

  // Assessment settings
  maxQuestionsPerAssessment: 100,
  maxAttempts: 3,
  defaultTimeLimit: 60, // minutes
};
