/**
 * @aivo/caching - Multi-layer caching service
 *
 * Provides a hierarchical caching strategy:
 * - L1: In-memory LRU cache (per-instance, microseconds)
 * - L2: Redis cluster (shared, milliseconds)
 * - L3: CDN edge cache (global, for HTTP responses)
 */

export { CacheManager, getCacheManager, initCacheManager } from './cache-manager';
export type { CacheConfig, CacheOptions, CacheStats, CacheableValue } from './cache-manager';
export { compress, decompress } from './compression';
export { CacheKeyBuilder } from './cache-key-builder';
export { CacheWarmer } from './cache-warmer';
export { CacheMetrics } from './cache-metrics';

// HTTP Cache utilities for API routes
export {
  CachePresets,
  cachedResponse,
  createCacheHeaders,
  varyHeaders,
  generateETag,
  etagResponse,
} from './http-cache';
export type { CachePresetName } from './http-cache';
