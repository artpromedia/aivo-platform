/**
 * Realtime Service - Redis Client
 *
 * Provides a resilient Redis client with connection pooling and error handling.
 */

import Redis from 'ioredis';

import { config } from '../config.js';
import { logger } from '../logger.js';

type RedisInstance = InstanceType<typeof Redis>;

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- ioredis type resolution
let redisClient: RedisInstance | null = null;
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- ioredis type resolution
let subscriberClient: RedisInstance | null = null;

/**
 * Get the main Redis client (for commands)
 */
export function getRedisClient(): RedisInstance {
  if (!redisClient) {
    redisClient = createRedisClient('main');
  }
  return redisClient;
}

/**
 * Get a subscriber Redis client (for pub/sub)
 */
export function getSubscriberClient(): RedisInstance {
  if (!subscriberClient) {
    subscriberClient = createRedisClient('subscriber');
  }
  return subscriberClient;
}

/**
 * Create a new Redis client
 */
function createRedisClient(name: string): Redis {
  const client = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 10) {
        logger.error({ name }, 'Redis max retries exceeded');
        return null;
      }
      const delay = Math.min(times * 200, 2000);
      logger.warn({ name, times, delay }, 'Redis retry attempt');
      return delay;
    },
    reconnectOnError: (err) => {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
      return targetErrors.some((e) => err.message.includes(e));
    },
    lazyConnect: false,
    enableReadyCheck: true,
    enableOfflineQueue: true,
  });

  client.on('connect', () => {
    logger.info({ name }, 'Redis connected');
  });

  client.on('ready', () => {
    logger.info({ name }, 'Redis ready');
  });

  client.on('error', (err) => {
    logger.error({ name, err }, 'Redis error');
  });

  client.on('close', () => {
    logger.warn({ name }, 'Redis connection closed');
  });

  client.on('reconnecting', () => {
    logger.info({ name }, 'Redis reconnecting');
  });

  return client;
}

/**
 * Close all Redis connections
 */
export async function closeRedisConnections(): Promise<void> {
  const promises: Promise<void>[] = [];

  if (redisClient) {
    promises.push(
      redisClient.quit().then(() => {
        logger.info({ name: 'main' }, 'Redis disconnected');
        redisClient = null;
      })
    );
  }

  if (subscriberClient) {
    promises.push(
      subscriberClient.quit().then(() => {
        logger.info({ name: 'subscriber' }, 'Redis disconnected');
        subscriberClient = null;
      })
    );
  }

  await Promise.all(promises);
}

/**
 * Redis key prefixes for different data types
 */
export const RedisKeys = {
  // Global prefix for all dashboard keys
  prefix: 'aivo',

  // Presence keys
  presence: (tenantId: string, userId: string) => `presence:${tenantId}:user:${userId}`,
  tenantOnline: (tenantId: string) => `presence:${tenantId}:online`,
  presenceSorted: (tenantId: string) => `presence:${tenantId}:sorted`,

  // Room keys
  roomMembers: (roomId: string) => `room:${roomId}:members`,
  roomState: (roomId: string) => `room:${roomId}:state`,
  roomConfig: (roomId: string) => `room:${roomId}:config`,
  roomMetadata: (roomId: string) => `room:${roomId}:metadata`,
  roomMessages: (roomId: string) => `room:${roomId}:messages`,

  // Document keys
  document: (documentId: string) => `document:${documentId}:state`,
  documentLock: (documentId: string) => `document:${documentId}:lock`,
  elementLock: (documentId: string, elementId: string) =>
    `document:${documentId}:element:${elementId}:lock`,

  // Server keys
  serverMetrics: (serverId: string) => `server:${serverId}:metrics`,
  serverHeartbeat: (serverId: string) => `server:${serverId}:heartbeat`,

  // Dashboard keys
  activity: (tenantId: string, classId: string, studentId: string) =>
    `aivo:activity:${tenantId}:${classId}:${studentId}`,
  session: (tenantId: string, learnerId: string) =>
    `aivo:session:${tenantId}:${learnerId}`,
  daily: (tenantId: string, learnerId: string, date: string) =>
    `aivo:daily:${tenantId}:${learnerId}:${date}`,
  activities: (tenantId: string, learnerId: string) =>
    `aivo:activities:${tenantId}:${learnerId}`,
  alertsList: (tenantId: string, learnerId: string) =>
    `aivo:alerts:${tenantId}:${learnerId}`,
  schoolClasses: (tenantId: string, schoolId: string) =>
    `aivo:school:${tenantId}:${schoolId}:classes`,
  districtSchools: (tenantId: string) =>
    `aivo:district:${tenantId}:schools`,

  // Pub/Sub channels
  channels: {
    broadcast: 'realtime:broadcast',
    presence: 'realtime:presence',
    session: 'realtime:session',
    analytics: 'realtime:analytics',
    alerts: 'realtime:alerts',
    activity: 'realtime:activity',
    focus: 'realtime:focus',
  },
};
