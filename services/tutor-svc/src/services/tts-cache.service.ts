import crypto from 'node:crypto';

import Redis from 'ioredis';

import { config } from '../config.js';
import type { TtsSpeechResult } from './tts.service.js';

// =============================================================================
// Constants
// =============================================================================

/** Maximum text length eligible for caching (short common phrases). */
const MAX_CACHEABLE_LENGTH = 200;

/** Cache TTL: 24 hours. */
const CACHE_TTL_SECONDS = 86_400;

/** Redis key prefix for TTS cache entries. */
const KEY_PREFIX = 'tts:cache:';

// =============================================================================
// Redis client (lazy init)
// =============================================================================

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    redis.on('error', (err) => {
      console.warn('TTS cache Redis error:', err.message);
    });

    redis.connect().catch(() => {
      // Silently ignore — cache is best-effort
    });
  }
  return redis;
}

// =============================================================================
// Cache key generation
// =============================================================================

/**
 * Generate a deterministic cache key from the synthesis parameters.
 *
 * Key components: text + voice ID + locale + speaking rate.
 * This ensures different voices/rates for the same text produce
 * separate cache entries.
 */
function buildCacheKey(
  text: string,
  voiceId: string,
  locale: string,
  speakingRate: number,
): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${text}|${voiceId}|${locale}|${speakingRate}`)
    .digest('hex')
    .slice(0, 16);

  return `${KEY_PREFIX}${hash}`;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Check if a cached TTS result exists for the given parameters.
 *
 * Returns null if:
 * - Text is too long for caching
 * - No cached result exists
 * - Redis is unavailable (cache is best-effort)
 */
export async function getCachedTts(
  text: string,
  voiceId: string,
  locale: string,
  speakingRate: number,
): Promise<TtsSpeechResult | null> {
  if (text.length > MAX_CACHEABLE_LENGTH) return null;

  try {
    const client = getRedis();
    const key = buildCacheKey(text, voiceId, locale, speakingRate);
    const cached = await client.get(key);

    if (!cached) return null;

    return JSON.parse(cached) as TtsSpeechResult;
  } catch {
    return null;
  }
}

/**
 * Store a TTS result in cache for future reuse.
 *
 * Only caches short phrases (< 200 characters) to avoid
 * excessive Redis memory usage.
 */
export async function cacheTtsResult(
  text: string,
  voiceId: string,
  locale: string,
  speakingRate: number,
  result: TtsSpeechResult,
): Promise<void> {
  if (text.length > MAX_CACHEABLE_LENGTH) return;

  try {
    const client = getRedis();
    const key = buildCacheKey(text, voiceId, locale, speakingRate);
    await client.setex(key, CACHE_TTL_SECONDS, JSON.stringify(result));
  } catch {
    // Cache write failures are non-fatal
  }
}

/**
 * Disconnect the cache Redis client (for graceful shutdown).
 */
export async function disconnectTtsCache(): Promise<void> {
  if (redis) {
    await redis.quit().catch(() => {});
    redis = null;
  }
}
