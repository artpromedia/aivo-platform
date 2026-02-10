import { describe, it, expect } from 'vitest';
import { compress, decompress } from '../src/compression.js';
import { CacheKeyBuilder } from '../src/cache-key-builder.js';
import { CacheMetrics } from '../src/cache-metrics.js';
import { CachePresets, createCacheHeaders, varyHeaders, generateETag } from '../src/http-cache.js';
import {
  CacheDuration,
  generateCacheControlHeader,
  generateCloudflareRules,
  generateCloudFrontBehaviors,
  generateNginxConfig,
  generateVercelHeaders,
  defaultCdnConfig,
} from '../src/cdn-config.js';

// ============================================================================
// Compression
// ============================================================================

describe('compression', () => {
  it('compresses and decompresses a string', () => {
    const original = 'Hello, world! '.repeat(100);
    const compressed = compress(original);
    const decompressed = decompress(compressed);
    expect(decompressed).toBe(original);
  });

  it('handles empty string', () => {
    const compressed = compress('');
    const decompressed = decompress(compressed);
    expect(decompressed).toBe('');
  });

  it('handles unicode', () => {
    const original = '日本語テスト 🎉 données françaises';
    const compressed = compress(original);
    expect(decompress(compressed)).toBe(original);
  });

  it('produces base64 output', () => {
    const compressed = compress('test data');
    // Base64 should only contain valid characters
    expect(compressed).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
});

// ============================================================================
// CacheKeyBuilder
// ============================================================================

describe('CacheKeyBuilder', () => {
  it('builds a simple key with prefix', () => {
    const key = new CacheKeyBuilder('app').entity('user').id('123').build();
    expect(key).toBe('app:user:123');
  });

  it('supports chaining with namespace and tenant', () => {
    const key = new CacheKeyBuilder('cache')
      .namespace('v2')
      .entity('lesson')
      .tenant('t-abc')
      .id('lesson-42')
      .build();
    expect(key).toBe('cache:v2:lesson:t_t-abc:lesson-42');
  });

  it('adds user context', () => {
    const key = new CacheKeyBuilder('data').user('u-99').build();
    expect(key).toBe('data:u_u-99');
  });

  it('hashes params by default', () => {
    const key = new CacheKeyBuilder('list')
      .entity('items')
      .params({ page: 1, sort: 'name' })
      .build();
    expect(key).toMatch(/^list:items:p_[a-f0-9]+$/);
  });

  it('does not hash params when hashParams is false', () => {
    const key = new CacheKeyBuilder('list', { hashParams: false })
      .entity('items')
      .params({ a: 1 })
      .build();
    expect(key).toContain('p_a');
  });

  it('ignores empty params', () => {
    const key = new CacheKeyBuilder('test').params({}).build();
    expect(key).toBe('test');
  });

  it('adds version segment', () => {
    const key = new CacheKeyBuilder('app').version(3).build();
    expect(key).toBe('app:v3');
  });

  it('adds custom segment', () => {
    const key = new CacheKeyBuilder('app').segment('region', 'eu').build();
    expect(key).toBe('app:region_eu');
  });

  it('buildHashed appends hash suffix', () => {
    const key = new CacheKeyBuilder('app').entity('test').buildHashed();
    expect(key).toMatch(/^app:test:[a-f0-9]{8}$/);
  });

  it('normalizes invalid characters', () => {
    const key = new CacheKeyBuilder('app').id('hello world!@#').build();
    expect(key).not.toContain(' ');
    expect(key).not.toContain('!');
  });

  describe('static helpers', () => {
    it('forEntity builds entity key', () => {
      const key = CacheKeyBuilder.forEntity('user', '42', 'tenant-1');
      expect(key).toContain('entity');
      expect(key).toContain('user');
      expect(key).toContain('42');
      expect(key).toContain('t_tenant-1');
    });

    it('forUser builds user key', () => {
      const key = CacheKeyBuilder.forUser('u-1', 'profile');
      expect(key).toContain('user');
      expect(key).toContain('u_u-1');
      expect(key).toContain('res_profile');
    });

    it('forSession builds session key', () => {
      const key = CacheKeyBuilder.forSession('sess-abc');
      expect(key).toContain('session');
      expect(key).toContain('sess-abc');
    });

    it('forAnalytics builds analytics key', () => {
      const key = CacheKeyBuilder.forAnalytics('daily', 'school-1', '2024-01');
      expect(key).toContain('analytics');
      expect(key).toContain('report_daily');
    });

    it('create returns new builder', () => {
      const builder = CacheKeyBuilder.create('prefix');
      expect(builder).toBeInstanceOf(CacheKeyBuilder);
      expect(builder.build()).toBe('prefix');
    });
  });
});

// ============================================================================
// CacheMetrics
// ============================================================================

describe('CacheMetrics', () => {
  it('increments counters', () => {
    const metrics = new CacheMetrics({ reportInterval: 0 });
    metrics.increment('l1.hits');
    metrics.increment('l1.hits');
    metrics.increment('l1.hits', 3);
    expect(metrics.getCounter('l1.hits')).toBe(5);
    metrics.stop();
  });

  it('records latencies and computes percentiles', () => {
    const metrics = new CacheMetrics({ reportInterval: 0 });
    for (let i = 1; i <= 100; i++) {
      metrics.recordLatency(i);
    }
    expect(metrics.getPercentile(50)).toBe(50);
    expect(metrics.getPercentile(95)).toBe(95);
    expect(metrics.getPercentile(99)).toBe(99);
    metrics.stop();
  });

  it('returns 0 percentile when no latencies', () => {
    const metrics = new CacheMetrics({ reportInterval: 0 });
    expect(metrics.getPercentile(50)).toBe(0);
    metrics.stop();
  });

  it('generates a report', () => {
    const metrics = new CacheMetrics({ reportInterval: 0 });
    metrics.increment('l1.hits', 10);
    metrics.increment('l1.misses', 5);
    metrics.recordLatency(50);

    const report = metrics.report();
    expect(report.l1.hits).toBe(10);
    expect(report.l1.misses).toBe(5);
    expect(report.l1.hitRate).toBeCloseTo(10 / 15);
    expect(report.latency.avg).toBe(50);
    expect(report.timestamp).toBeGreaterThan(0);
    metrics.stop();
  });

  it('resets counters after report', () => {
    const metrics = new CacheMetrics({ reportInterval: 0 });
    metrics.increment('l1.hits', 5);
    metrics.report();
    expect(metrics.getCounter('l1.hits')).toBe(0);
    metrics.stop();
  });

  it('tracks gauge values with buckets', () => {
    const metrics = new CacheMetrics({ reportInterval: 0 });
    metrics.gauge('pool.size', 10);
    metrics.gauge('pool.size', 15);
    const history = metrics.getHistory('pool.size');
    expect(history.length).toBeGreaterThan(0);
    metrics.stop();
  });
});

// ============================================================================
// HTTP Cache
// ============================================================================

describe('CachePresets', () => {
  it('has expected presets', () => {
    expect(CachePresets.noCache['Cache-Control']).toContain('no-store');
    expect(CachePresets.privateShort['Cache-Control']).toContain('private');
    expect(CachePresets.publicLong['Cache-Control']).toContain('public');
    expect(CachePresets.immutable['Cache-Control']).toContain('immutable');
  });
});

describe('createCacheHeaders', () => {
  it('builds no-store header', () => {
    const headers = createCacheHeaders({ noStore: true });
    expect(headers['Cache-Control']).toContain('no-store');
  });

  it('builds public with max-age', () => {
    const headers = createCacheHeaders({ public: true, maxAge: 300 });
    expect(headers['Cache-Control']).toContain('public');
    expect(headers['Cache-Control']).toContain('max-age=300');
  });

  it('includes stale-while-revalidate', () => {
    const headers = createCacheHeaders({
      public: true,
      maxAge: 60,
      staleWhileRevalidate: 30,
    });
    expect(headers['Cache-Control']).toContain('stale-while-revalidate=30');
  });

  it('includes s-maxage', () => {
    const headers = createCacheHeaders({ public: true, maxAge: 60, sMaxAge: 300 });
    expect(headers['Cache-Control']).toContain('s-maxage=300');
  });

  it('includes immutable', () => {
    const headers = createCacheHeaders({ public: true, maxAge: 31536000, immutable: true });
    expect(headers['Cache-Control']).toContain('immutable');
  });
});

describe('varyHeaders', () => {
  it('joins headers with comma', () => {
    const result = varyHeaders('Accept', 'Accept-Language');
    expect(result.Vary).toBe('Accept, Accept-Language');
  });
});

describe('generateETag', () => {
  it('produces consistent etag for same content', () => {
    const data = { id: 1, name: 'test' };
    const etag1 = generateETag(data);
    const etag2 = generateETag(data);
    expect(etag1).toBe(etag2);
  });

  it('produces different etags for different content', () => {
    const etag1 = generateETag({ id: 1 });
    const etag2 = generateETag({ id: 2 });
    expect(etag1).not.toBe(etag2);
  });

  it('wraps in quotes', () => {
    const etag = generateETag('hello');
    expect(etag).toMatch(/^".*"$/);
  });
});

// ============================================================================
// CDN Config
// ============================================================================

describe('CacheDuration', () => {
  it('has correct values', () => {
    expect(CacheDuration.SHORT).toBe(60);
    expect(CacheDuration.MEDIUM).toBe(300);
    expect(CacheDuration.LONG).toBe(3600);
    expect(CacheDuration.DAY).toBe(86400);
    expect(CacheDuration.WEEK).toBe(604800);
    expect(CacheDuration.MONTH).toBe(2592000);
    expect(CacheDuration.YEAR).toBe(31536000);
  });
});

describe('generateCacheControlHeader', () => {
  it('returns no-store for zero TTL', () => {
    const header = generateCacheControlHeader({
      pattern: '*',
      edgeTtl: 0,
      browserTtl: 0,
    });
    expect(header).toContain('no-store');
  });

  it('sets public and max-age', () => {
    const header = generateCacheControlHeader({
      pattern: '/static/*',
      edgeTtl: 3600,
      browserTtl: 3600,
    });
    expect(header).toContain('public');
    expect(header).toContain('max-age=3600');
  });

  it('sets s-maxage when edge and browser differ', () => {
    const header = generateCacheControlHeader({
      pattern: '/images/*',
      edgeTtl: 604800,
      browserTtl: 86400,
    });
    expect(header).toContain('s-maxage=604800');
    expect(header).toContain('max-age=86400');
  });

  it('sets private when bypass conditions exist', () => {
    const header = generateCacheControlHeader({
      pattern: '/api/*',
      edgeTtl: 60,
      browserTtl: 60,
      bypass: [{ type: 'header', name: 'Authorization' }],
    });
    expect(header).toContain('private');
  });

  it('adds immutable for year-long TTL', () => {
    const header = generateCacheControlHeader({
      pattern: '/assets/*',
      edgeTtl: 31536000,
      browserTtl: 31536000,
    });
    expect(header).toContain('immutable');
  });

  it('includes stale-while-revalidate', () => {
    const header = generateCacheControlHeader({
      pattern: '*',
      edgeTtl: 300,
      browserTtl: 60,
      staleWhileRevalidate: 120,
    });
    expect(header).toContain('stale-while-revalidate=120');
  });
});

describe('generateCloudflareRules', () => {
  it('generates rules for each CDN rule', () => {
    const rules = generateCloudflareRules(defaultCdnConfig, 'aivo.com');
    expect(rules.length).toBe(defaultCdnConfig.rules.length);
    expect(rules[0].status).toBe('active');
    expect(rules[0].targets[0].constraint.value).toContain('aivo.com');
  });
});

describe('generateCloudFrontBehaviors', () => {
  it('generates behaviors for each CDN rule', () => {
    const behaviors = generateCloudFrontBehaviors(defaultCdnConfig, 'origin-1');
    expect(behaviors.length).toBe(defaultCdnConfig.rules.length);
    expect(behaviors[0].TargetOriginId).toBe('origin-1');
    expect(behaviors[0].ViewerProtocolPolicy).toBe('redirect-to-https');
  });
});

describe('generateNginxConfig', () => {
  it('generates valid nginx config string', () => {
    const config = generateNginxConfig(defaultCdnConfig);
    expect(config).toContain('gzip on;');
    expect(config).toContain('location ~*');
    expect(config).toContain('add_header Cache-Control');
  });
});

describe('generateVercelHeaders', () => {
  it('generates vercel headers array', () => {
    const headers = generateVercelHeaders(defaultCdnConfig);
    expect(headers.length).toBe(defaultCdnConfig.rules.length);
    for (const h of headers) {
      expect(h.source).toBeDefined();
      expect(h.headers.length).toBeGreaterThan(0);
    }
  });
});
