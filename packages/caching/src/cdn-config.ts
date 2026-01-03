/**
 * CDN Configuration and Edge Caching Rules
 *
 * Centralized configuration for CDN caching behavior across
 * CloudFront, Cloudflare, Fastly, and other edge providers.
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-unnecessary-boolean-literal-compare */

// ============================================================================
// TYPES
// ============================================================================

export interface CdnCacheRule {
  /** Path pattern (glob or regex) */
  pattern: string;
  /** Cache TTL at edge (seconds) */
  edgeTtl: number;
  /** Browser cache TTL (seconds) */
  browserTtl: number;
  /** Whether to cache when query string is present */
  cacheByQueryString?: 'none' | 'all' | 'whitelist' | 'blacklist';
  /** Query string keys to include/exclude */
  queryStringKeys?: string[];
  /** Whether to vary cache by these headers */
  varyHeaders?: string[];
  /** Whether content can be served stale during revalidation */
  staleWhileRevalidate?: number;
  /** Whether content can be served stale on error */
  staleIfError?: number;
  /** Bypass cache for these conditions */
  bypass?: CacheBypassCondition[];
  /** Compression settings */
  compress?: boolean;
  /** Origin shield region (for multi-region) */
  originShield?: string;
  /** Custom response headers to add */
  responseHeaders?: Record<string, string>;
}

export interface CacheBypassCondition {
  type: 'header' | 'cookie' | 'queryParam';
  name: string;
  value?: string | RegExp;
}

export interface CdnConfig {
  /** Default cache behavior */
  defaultBehavior: CdnCacheRule;
  /** Path-specific cache rules (ordered by priority) */
  rules: CdnCacheRule[];
  /** Global settings */
  settings: CdnGlobalSettings;
}

export interface CdnGlobalSettings {
  /** Enable HTTP/2 */
  http2: boolean;
  /** Enable HTTP/3 (QUIC) */
  http3: boolean;
  /** Minimum TLS version */
  minTlsVersion: '1.2' | '1.3';
  /** Enable Brotli compression */
  brotli: boolean;
  /** Enable early hints (103) */
  earlyHints: boolean;
  /** Enable image optimization */
  imageOptimization: boolean;
  /** Enable auto minification */
  autoMinify: {
    html: boolean;
    css: boolean;
    js: boolean;
  };
  /** Security settings */
  security: {
    waf: boolean;
    ddosProtection: boolean;
    botManagement: boolean;
  };
}

// ============================================================================
// CACHE DURATION CONSTANTS
// ============================================================================

export const CacheDuration = {
  /** 1 minute */
  SHORT: 60,
  /** 5 minutes */
  MEDIUM: 300,
  /** 1 hour */
  LONG: 3600,
  /** 1 day */
  DAY: 86400,
  /** 1 week */
  WEEK: 604800,
  /** 1 month */
  MONTH: 2592000,
  /** 1 year (immutable) */
  YEAR: 31536000,
} as const;

// ============================================================================
// DEFAULT CDN CONFIGURATION
// ============================================================================

export const defaultCdnConfig: CdnConfig = {
  defaultBehavior: {
    pattern: '*',
    edgeTtl: CacheDuration.SHORT,
    browserTtl: CacheDuration.SHORT,
    cacheByQueryString: 'none',
    compress: true,
    staleWhileRevalidate: 30,
    staleIfError: 60,
    bypass: [
      { type: 'header', name: 'Authorization' },
      { type: 'cookie', name: 'session' },
    ],
  },

  rules: [
    // Static assets - immutable
    {
      pattern: '/_next/static/*',
      edgeTtl: CacheDuration.YEAR,
      browserTtl: CacheDuration.YEAR,
      cacheByQueryString: 'none',
      compress: true,
      responseHeaders: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },

    // Built assets with hash
    {
      pattern: '/assets/*',
      edgeTtl: CacheDuration.YEAR,
      browserTtl: CacheDuration.YEAR,
      cacheByQueryString: 'none',
      compress: true,
      responseHeaders: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },

    // Images - long cache with revalidation
    {
      pattern: '/_next/image/*',
      edgeTtl: CacheDuration.WEEK,
      browserTtl: CacheDuration.DAY,
      cacheByQueryString: 'whitelist',
      queryStringKeys: ['url', 'w', 'q'],
      compress: false, // Images are already compressed
      staleWhileRevalidate: CacheDuration.DAY,
    },

    // User uploads / media
    {
      pattern: '/media/*',
      edgeTtl: CacheDuration.MONTH,
      browserTtl: CacheDuration.WEEK,
      cacheByQueryString: 'none',
      compress: false,
    },

    // Fonts - long cache
    {
      pattern: '/fonts/*',
      edgeTtl: CacheDuration.YEAR,
      browserTtl: CacheDuration.YEAR,
      cacheByQueryString: 'none',
      compress: true,
      responseHeaders: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },

    // API routes - no edge caching by default
    {
      pattern: '/api/*',
      edgeTtl: 0,
      browserTtl: 0,
      cacheByQueryString: 'none',
      bypass: [
        { type: 'header', name: 'Authorization' },
      ],
      responseHeaders: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },

    // Public API endpoints - short cache
    {
      pattern: '/api/v1/public/*',
      edgeTtl: CacheDuration.MEDIUM,
      browserTtl: CacheDuration.SHORT,
      cacheByQueryString: 'all',
      staleWhileRevalidate: CacheDuration.SHORT,
      varyHeaders: ['Accept', 'Accept-Language'],
    },

    // GraphQL - no caching (mutations mixed with queries)
    {
      pattern: '/graphql',
      edgeTtl: 0,
      browserTtl: 0,
      cacheByQueryString: 'none',
    },

    // HTML pages - short cache with revalidation
    {
      pattern: '*.html',
      edgeTtl: CacheDuration.MEDIUM,
      browserTtl: CacheDuration.SHORT,
      cacheByQueryString: 'none',
      staleWhileRevalidate: CacheDuration.MEDIUM,
      compress: true,
      varyHeaders: ['Accept-Language', 'Accept-Encoding'],
    },

    // Manifest and service worker - short cache
    {
      pattern: '/manifest.json',
      edgeTtl: CacheDuration.DAY,
      browserTtl: CacheDuration.LONG,
      cacheByQueryString: 'none',
    },
    {
      pattern: '/sw.js',
      edgeTtl: 0,
      browserTtl: 0,
      cacheByQueryString: 'none',
      responseHeaders: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Service-Worker-Allowed': '/',
      },
    },

    // Health checks - no caching
    {
      pattern: '/health*',
      edgeTtl: 0,
      browserTtl: 0,
      cacheByQueryString: 'none',
    },

    // Sitemap and robots - medium cache
    {
      pattern: '/sitemap*.xml',
      edgeTtl: CacheDuration.DAY,
      browserTtl: CacheDuration.LONG,
      cacheByQueryString: 'none',
      compress: true,
    },
    {
      pattern: '/robots.txt',
      edgeTtl: CacheDuration.DAY,
      browserTtl: CacheDuration.LONG,
      cacheByQueryString: 'none',
    },
  ],

  settings: {
    http2: true,
    http3: true,
    minTlsVersion: '1.2',
    brotli: true,
    earlyHints: true,
    imageOptimization: true,
    autoMinify: {
      html: true,
      css: true,
      js: true,
    },
    security: {
      waf: true,
      ddosProtection: true,
      botManagement: true,
    },
  },
};

// ============================================================================
// CLOUDFLARE CONFIGURATION GENERATOR
// ============================================================================

export interface CloudflarePageRule {
  targets: Array<{ target: string; constraint: { operator: string; value: string } }>;
  actions: Array<{ id: string; value?: any }>;
  status: 'active' | 'disabled';
  priority: number;
}

export function generateCloudflareRules(
  config: CdnConfig,
  domain: string
): CloudflarePageRule[] {
  return config.rules.map((rule, index) => ({
    targets: [
      {
        target: 'url',
        constraint: {
          operator: 'matches',
          value: `*${domain}${rule.pattern}`,
        },
      },
    ],
    actions: [
      { id: 'cache_level', value: rule.edgeTtl > 0 ? 'cache_everything' : 'bypass' },
      { id: 'edge_cache_ttl', value: rule.edgeTtl },
      { id: 'browser_cache_ttl', value: rule.browserTtl },
      ...(rule.compress ? [{ id: 'minify', value: { html: 'on', css: 'on', js: 'on' } }] : []),
    ],
    status: 'active',
    priority: index + 1,
  }));
}

// ============================================================================
// CLOUDFRONT CONFIGURATION GENERATOR
// ============================================================================

export interface CloudFrontCacheBehavior {
  PathPattern: string;
  TargetOriginId: string;
  ViewerProtocolPolicy: string;
  CachePolicyId?: string;
  ResponseHeadersPolicyId?: string;
  Compress: boolean;
  AllowedMethods: string[];
  CachedMethods: string[];
  DefaultTTL: number;
  MaxTTL: number;
  MinTTL: number;
}

export function generateCloudFrontBehaviors(
  config: CdnConfig,
  originId: string
): CloudFrontCacheBehavior[] {
  return config.rules.map((rule) => ({
    PathPattern: rule.pattern,
    TargetOriginId: originId,
    ViewerProtocolPolicy: 'redirect-to-https',
    Compress: rule.compress ?? true,
    AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
    CachedMethods: ['GET', 'HEAD'],
    DefaultTTL: rule.edgeTtl,
    MaxTTL: rule.edgeTtl * 2,
    MinTTL: 0,
  }));
}

// ============================================================================
// CACHE-CONTROL HEADER GENERATOR
// ============================================================================

export function generateCacheControlHeader(rule: CdnCacheRule): string {
  const directives: string[] = [];

  if (rule.edgeTtl === 0 && rule.browserTtl === 0) {
    return 'no-store, no-cache, must-revalidate';
  }

  // Visibility
  if (rule.bypass && rule.bypass.length > 0) {
    directives.push('private');
  } else {
    directives.push('public');
  }

  // Max age
  directives.push(`max-age=${rule.browserTtl}`);

  // S-maxage for CDN
  if (rule.edgeTtl !== rule.browserTtl) {
    directives.push(`s-maxage=${rule.edgeTtl}`);
  }

  // Stale directives
  if (rule.staleWhileRevalidate) {
    directives.push(`stale-while-revalidate=${rule.staleWhileRevalidate}`);
  }
  if (rule.staleIfError) {
    directives.push(`stale-if-error=${rule.staleIfError}`);
  }

  // Immutable for long TTLs
  if (rule.edgeTtl >= CacheDuration.YEAR) {
    directives.push('immutable');
  }

  return directives.join(', ');
}

// ============================================================================
// NGINX CONFIGURATION GENERATOR
// ============================================================================

export function generateNginxConfig(config: CdnConfig): string {
  const lines: string[] = [
    '# Auto-generated CDN cache configuration',
    '# Generated by @aivo/caching',
    '',
    '# Enable gzip compression',
    'gzip on;',
    'gzip_vary on;',
    'gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;',
    'gzip_min_length 256;',
    '',
  ];

  for (const rule of config.rules) {
    const pattern = rule.pattern.replace('*', '.*');
    const cacheControl = generateCacheControlHeader(rule);

    lines.push(`location ~* ${pattern} {`);
    lines.push(`    add_header Cache-Control "${cacheControl}";`);

    if (rule.varyHeaders && rule.varyHeaders.length > 0) {
      lines.push(`    add_header Vary "${rule.varyHeaders.join(', ')}";`);
    }

    if (rule.responseHeaders) {
      for (const [key, value] of Object.entries(rule.responseHeaders)) {
        if (key !== 'Cache-Control') {
          lines.push(`    add_header ${key} "${value}";`);
        }
      }
    }

    if (rule.edgeTtl > 0) {
      lines.push(`    proxy_cache_valid 200 ${rule.edgeTtl}s;`);
    } else {
      lines.push('    proxy_cache_bypass 1;');
    }

    lines.push('}');
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================================================
// VERCEL CONFIGURATION GENERATOR
// ============================================================================

export interface VercelHeader {
  source: string;
  headers: Array<{ key: string; value: string }>;
}

export function generateVercelHeaders(config: CdnConfig): VercelHeader[] {
  return config.rules.map((rule) => {
    const headers: Array<{ key: string; value: string }> = [
      { key: 'Cache-Control', value: generateCacheControlHeader(rule) },
    ];

    if (rule.varyHeaders && rule.varyHeaders.length > 0) {
      headers.push({ key: 'Vary', value: rule.varyHeaders.join(', ') });
    }

    if (rule.responseHeaders) {
      for (const [key, value] of Object.entries(rule.responseHeaders)) {
        if (key !== 'Cache-Control') {
          headers.push({ key, value });
        }
      }
    }

    return {
      source: rule.pattern.replace('*', ':path*'),
      headers,
    };
  });
}

// ============================================================================
// FASTIFY PLUGIN FOR CACHE HEADERS
// ============================================================================

export function createCacheHeadersPlugin(config: CdnConfig) {
  return async function cacheHeadersPlugin(fastify: any) {
    fastify.addHook('onSend', async (request: any, reply: any) => {
      const path = request.url;

      // Find matching rule
      const rule = config.rules.find((r) => {
        const pattern = r.pattern.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(path);
      }) || config.defaultBehavior;

      // Check bypass conditions
      const shouldBypass = rule.bypass?.some((condition) => {
        switch (condition.type) {
          case 'header':
            return request.headers[condition.name.toLowerCase()];
          case 'cookie':
            return request.cookies?.[condition.name];
          case 'queryParam':
            return request.query?.[condition.name];
          default:
            return false;
        }
      });

      if (shouldBypass) {
        reply.header('Cache-Control', 'no-store, max-age=0');
        return;
      }

      // Set cache headers
      reply.header('Cache-Control', generateCacheControlHeader(rule));

      if (rule.varyHeaders && rule.varyHeaders.length > 0) {
        reply.header('Vary', rule.varyHeaders.join(', '));
      }

      if (rule.responseHeaders) {
        for (const [key, value] of Object.entries(rule.responseHeaders)) {
          if (key !== 'Cache-Control') {
            reply.header(key, value);
          }
        }
      }
    });
  };
}
