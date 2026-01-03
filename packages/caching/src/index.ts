/**
 * @aivo/caching - Multi-layer caching service
 *
 * Provides a hierarchical caching strategy:
 * - L1: In-memory LRU cache (per-instance, microseconds)
 * - L2: Redis cluster (shared, milliseconds)
 * - L3: CDN edge cache (global, for HTTP responses)
 */

/* eslint-disable @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-unnecessary-boolean-literal-compare */

export { CacheManager, getCacheManager, initCacheManager } from './cache-manager';
export type { CacheConfig, CacheOptions, CacheStats, CacheableValue } from './cache-manager';
export { compress, decompress } from './compression';
export { CacheKeyBuilder } from './cache-key-builder';
export { CacheWarmer } from './cache-warmer';
export { CacheMetrics } from './cache-metrics';

// CDN Configuration
export {
  defaultCdnConfig,
  CacheDuration,
  generateCloudflareRules,
  generateCloudFrontBehaviors,
  generateCacheControlHeader,
  generateNginxConfig,
  generateVercelHeaders,
  createCacheHeadersPlugin,
} from './cdn-config';
export type {
  CdnCacheRule,
  CdnConfig,
  CdnGlobalSettings,
  CacheBypassCondition,
  CloudflarePageRule,
  CloudFrontCacheBehavior,
  VercelHeader,
} from './cdn-config';

// HTTP Cache utilities for API routes (requires Next.js - commented out for builds without Next.js)
// export {
//   CachePresets,
//   cachedResponse,
//   createCacheHeaders,
//   varyHeaders,
//   generateETag,
//   etagResponse,
// } from './http-cache';
// export type { CachePresetName } from './http-cache';
