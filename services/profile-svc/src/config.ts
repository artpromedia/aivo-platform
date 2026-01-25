/**
 * Profile Service Configuration
 *
 * Environment-based configuration with type-safe defaults.
 */

import 'dotenv/config';

export const config = {
  port: Number.parseInt(process.env.PORT ?? '3420', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  natsUrl: process.env.NATS_URL ?? 'nats://localhost:4222',
  natsStream: process.env.NATS_STREAM ?? 'profile',
} as const;
