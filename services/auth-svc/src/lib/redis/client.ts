/**
 * Auth Service - Redis Client
 *
 * Provides a resilient Redis client for session management and SSO state.
 */

import Redis from 'ioredis';

// ============================================================================
// CONFIGURATION
// ============================================================================

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// ============================================================================
// CLIENT MANAGEMENT
// ============================================================================

let redisClient: Redis | null = null;

/**
 * Get the Redis client, creating it if necessary.
 * Returns null in development if Redis is not configured.
 */
export function getRedisClient(): Redis | null {
  if (redisClient) {
    return redisClient;
  }

  // In production, Redis is required
  if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
    throw new Error('REDIS_URL is required in production for session and SSO state management');
  }

  // In development, Redis is optional
  if (process.env.NODE_ENV !== 'production' && !process.env.REDIS_URL) {
    console.warn('[Redis] No REDIS_URL configured, using in-memory fallback');
    return null;
  }

  try {
    redisClient = createRedisClient();
    return redisClient;
  } catch (error) {
    console.error('[Redis] Failed to create client:', error);
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    return null;
  }
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return redisClient !== null && redisClient.status === 'ready';
}

/**
 * Create a new Redis client with proper error handling and retry logic
 */
function createRedisClient(): Redis {
  const client = new Redis(REDIS_URL, {
    password: REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 10) {
        console.error('[Redis:auth] Max retries exceeded');
        return null;
      }
      const delay = Math.min(times * 200, 2000);
      console.warn(`[Redis:auth] Retry attempt ${times}, waiting ${delay}ms`);
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
    console.log('[Redis:auth] Connected');
  });

  client.on('ready', () => {
    console.log('[Redis:auth] Ready');
  });

  client.on('error', (err) => {
    console.error('[Redis:auth] Error:', err.message);
  });

  client.on('close', () => {
    console.warn('[Redis:auth] Connection closed');
  });

  client.on('reconnecting', () => {
    console.log('[Redis:auth] Reconnecting...');
  });

  return client;
}

/**
 * Close the Redis connection gracefully
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    console.log('[Redis:auth] Disconnected');
    redisClient = null;
  }
}

/**
 * Redis key prefixes for auth service
 */
export const RedisKeys = {
  // SSO state keys
  ssoState: (stateId: string) => `sso:state:${stateId}`,

  // Token blacklist keys
  tokenBlacklist: (tokenId: string) => `blacklist:token:${tokenId}`,

  // Rate limiting keys
  failedLogins: (email: string, tenantId: string) => `failed_logins:${email}:${tenantId}`,

  // Session keys
  session: (sessionId: string) => `session:${sessionId}`,
  userSessions: (userId: string) => `user:${userId}:sessions`,
};
