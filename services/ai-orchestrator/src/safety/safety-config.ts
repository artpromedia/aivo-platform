/**
 * Safety Configuration
 *
 * Tenant-configurable safety settings with Redis-backed storage
 * and sensible defaults for K-12 educational content.
 */

import Redis from 'ioredis';

import type { SafetyConfig } from './safety.types.js';

// ══════════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ══════════════════════════════════════════════════════════════════════════════

export const defaultSafetyConfig: SafetyConfig = {
  enabled: true,
  blockOnCritical: true,
  blockOnHigh: true,
  blockOnMedium: false,
  sanitizePii: true,
  minimumSafetyScore: 0.6,
  maxGradeLevel: undefined,
};

// ══════════════════════════════════════════════════════════════════════════════
// CONFIG ACCESSOR
// ══════════════════════════════════════════════════════════════════════════════

const REDIS_KEY_PREFIX = 'safety:config:';

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!_redis) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      _redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
      _redis.on('error', () => {
        /* swallow — fallback to defaults */
      });
    } catch {
      return null;
    }
  }
  return _redis;
}

/**
 * Retrieve safety config for a given tenant.
 * Falls back to `defaultSafetyConfig` when Redis is unavailable or
 * no tenant override has been stored.
 */
export async function getSafetyConfig(tenantId: string): Promise<SafetyConfig> {
  const redis = getRedis();
  if (!redis) return { ...defaultSafetyConfig };

  try {
    const raw = await redis.get(`${REDIS_KEY_PREFIX}${tenantId}`);
    if (!raw) return { ...defaultSafetyConfig };
    const parsed = JSON.parse(raw) as Partial<SafetyConfig>;
    return { ...defaultSafetyConfig, ...parsed };
  } catch {
    return { ...defaultSafetyConfig };
  }
}

/**
 * Persist a tenant-specific safety configuration override in Redis.
 */
export async function setSafetyConfig(
  tenantId: string,
  config: Partial<SafetyConfig>,
): Promise<SafetyConfig> {
  const merged: SafetyConfig = { ...defaultSafetyConfig, ...config };
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(`${REDIS_KEY_PREFIX}${tenantId}`, JSON.stringify(merged));
    } catch {
      /* best-effort */
    }
  }
  return merged;
}

/**
 * Delete tenant-specific overrides so the tenant falls back to defaults.
 */
export async function resetSafetyConfig(tenantId: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(`${REDIS_KEY_PREFIX}${tenantId}`);
    } catch {
      /* best-effort */
    }
  }
}
