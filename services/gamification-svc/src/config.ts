/**
 * Gamification Service Configuration
 */

import 'dotenv/config';

// JWT secret is required in production
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}

export const config = {
  port: process.env.PORT ?? '3032',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? '',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  natsUrl: process.env.NATS_URL ?? 'nats://localhost:4222',
  jwtSecret: jwtSecret ?? 'dev-only-not-for-production',

  // Gamification settings
  maxLeaderboardSize: 100,
  streakGracePeriodHours: 24,
  maxDailyPoints: 1000,
};
