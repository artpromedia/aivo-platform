/**
 * Python Safety Client
 *
 * HTTP client that calls the Python API Gateway for secondary toxicity
 * scoring as a fallback / cross-check. Results are cached in Redis.
 *
 * - POST http://python-api-gateway:8000/safety/score
 * - 200ms timeout — falls back to local scoring on timeout
 * - Redis cache with 5-minute TTL by content SHA-256 hash
 */

import { createHash } from 'node:crypto';

import Redis from 'ioredis';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface PythonSafetyScore {
  safe: boolean;
  score: number;
  flags: { type: string; severity: string; detail: string }[];
}

// ══════════════════════════════════════════════════════════════════════════════
// CACHE
// ══════════════════════════════════════════════════════════════════════════════

const CACHE_PREFIX = 'safety:python:';
const CACHE_TTL_SECONDS = 300; // 5 minutes

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!_redis) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      _redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
      _redis.on('error', () => { /* intentionally swallowed */ });
    } catch {
      return null;
    }
  }
  return _redis;
}

function contentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

// ══════════════════════════════════════════════════════════════════════════════
// CLIENT
// ══════════════════════════════════════════════════════════════════════════════

const PYTHON_GATEWAY_URL =
  process.env.PYTHON_API_GATEWAY_URL || 'http://python-api-gateway:8000';
const TIMEOUT_MS = 200;

/**
 * Call the Python safety scoring endpoint.
 * Returns null on timeout or error — caller should fall back to local scoring.
 */
export async function scoreToxicityViaPython(
  content: string,
  context: string,
): Promise<PythonSafetyScore | null> {
  const hash = contentHash(content);

  // Check cache first
  const redis = getRedis();
  if (redis) {
    try {
      const cached = await redis.get(`${CACHE_PREFIX}${hash}`);
      if (cached) {
        return JSON.parse(cached) as PythonSafetyScore;
      }
    } catch {
      /* ignore */
    }
  }

  // Call Python gateway
  try {
    const response = await fetch(`${PYTHON_GATEWAY_URL}/safety/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, context }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) return null;

    const result = (await response.json()) as PythonSafetyScore;

    // Cache the result
    if (redis) {
      redis
        .set(`${CACHE_PREFIX}${hash}`, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS)
        .catch(() => { /* fire-and-forget */ });
    }

    return result;
  } catch {
    // Timeout or network error — fall back to local
    return null;
  }
}
