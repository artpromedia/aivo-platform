/* eslint-disable @typescript-eslint/no-explicit-any */
import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl as any, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
} as any);

redis.on('error', (err: any) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

export type RedisClient = typeof redis;

// Check if Redis is available
export async function isRedisAvailable(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}
