/**
 * Realtime Service Configuration
 *
 * Environment-based configuration with sensible defaults.
 */

import { z } from 'zod';
import 'dotenv/config';

const configSchema = z.object({
  // Server
  port: z.coerce.number().default(3003),
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),

  // Database
  databaseUrl: z.string().url(),

  // Redis
  redis: z.object({
    host: z.string().default('localhost'),
    port: z.coerce.number().default(6379),
    password: z.string().optional(),
  }),

  // JWT
  jwtSecret: z.string().min(32),

  // CORS
  corsOrigins: z.string().transform((val) => val.split(',')),

  // WebSocket
  websocket: z.object({
    pingInterval: z.coerce.number().default(25000),
    pingTimeout: z.coerce.number().default(20000),
    maxBufferSize: z.coerce.number().default(1048576),
  }),

  // Presence
  presence: z.object({
    ttl: z.coerce.number().default(60),
    heartbeatInterval: z.coerce.number().default(15000),
    cleanupInterval: z.coerce.number().default(30000),
    offlineGracePeriod: z.coerce.number().default(30000),
  }),

  // Room Configuration
  room: z.object({
    ttl: z.coerce.number().default(3600),
    maxMembers: z.coerce.number().default(100),
    messageHistoryLimit: z.coerce.number().default(100),
  }),

  // Collaboration
  collaboration: z.object({
    lockDefaultTtl: z.coerce.number().default(30000),
    operationsBufferSize: z.coerce.number().default(1000),
  }),

  // Scaling
  maxConnectionsPerPod: z.coerce.number().default(10000),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const result = configSchema.safeParse({
    port: process.env.PORT,
    nodeEnv: process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL,
    redis: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
    },
    jwtSecret: process.env.JWT_SECRET,
    corsOrigins: process.env.CORS_ORIGINS || 'http://localhost:3000',
    websocket: {
      pingInterval: process.env.WS_PING_INTERVAL,
      pingTimeout: process.env.WS_PING_TIMEOUT,
      maxBufferSize: process.env.WS_MAX_BUFFER_SIZE,
    },
    presence: {
      ttl: process.env.PRESENCE_TTL,
      heartbeatInterval: process.env.PRESENCE_HEARTBEAT_INTERVAL,
      cleanupInterval: process.env.PRESENCE_CLEANUP_INTERVAL,
      offlineGracePeriod: process.env.PRESENCE_OFFLINE_GRACE_PERIOD,
    },
    room: {
      ttl: process.env.ROOM_TTL,
      maxMembers: process.env.ROOM_MAX_MEMBERS,
      messageHistoryLimit: process.env.ROOM_MESSAGE_HISTORY_LIMIT,
    },
    collaboration: {
      lockDefaultTtl: process.env.COLLAB_LOCK_DEFAULT_TTL,
      operationsBufferSize: process.env.COLLAB_OPERATIONS_BUFFER_SIZE,
    },
    maxConnectionsPerPod: process.env.MAX_CONNECTIONS_PER_POD,
  });

  if (!result.success) {
    console.error('Configuration validation failed:', result.error.format());
    throw new Error('Invalid configuration');
  }

  return result.data;
}

export const config = loadConfig();
