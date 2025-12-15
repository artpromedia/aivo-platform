/**
 * Engagement Service Configuration
 */

import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3021', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // NATS
  natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
  
  // JWT
  jwtIssuer: process.env.JWT_ISSUER || 'https://auth.aivo.dev',
  jwtAudience: process.env.JWT_AUDIENCE || 'aivo-api',
  
  // Engagement defaults
  defaults: {
    maxDailyXp: 100,
    maxDailyCelebrations: 3,
    streakGracePeriodHours: 24,
  },
} as const;
