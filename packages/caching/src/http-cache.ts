/**
 * HTTP Caching Utilities
 *
 * Provides utilities for setting proper Cache-Control headers in Next.js API routes.
 */

import { NextResponse } from 'next/server';

/**
 * Cache control presets for different types of content
 */
export const CachePresets = {
  /**
   * No caching - for dynamic, user-specific data
   * Use for: authenticated user data, real-time data
   */
  noCache: {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  },

  /**
   * Private cache for user-specific but somewhat stable data
   * Use for: user preferences, dashboards
   */
  privateShort: {
    'Cache-Control': 'private, max-age=60, stale-while-revalidate=30',
  },

  /**
   * Private cache for user-specific stable data
   * Use for: user profiles, settings
   */
  privateMedium: {
    'Cache-Control': 'private, max-age=300, stale-while-revalidate=60',
  },

  /**
   * Short public cache for semi-dynamic content
   * Use for: frequently updated lists, recent items
   */
  publicShort: {
    'Cache-Control': 'public, max-age=60, stale-while-revalidate=30',
  },

  /**
   * Medium public cache for moderately stable content
   * Use for: catalog data, policies, configuration
   */
  publicMedium: {
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=120',
  },

  /**
   * Long public cache for stable content
   * Use for: reference data, templates, static configuration
   */
  publicLong: {
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=600',
  },

  /**
   * Immutable content that never changes
   * Use for: versioned assets, archived data
   */
  immutable: {
    'Cache-Control': 'public, max-age=31536000, immutable',
  },
} as const;

export type CachePresetName = keyof typeof CachePresets;

/**
 * Creates a NextResponse with appropriate caching headers
 *
 * @example
 * ```ts
 * // In an API route
 * return cachedResponse(data, 'publicMedium');
 *
 * // With custom status
 * return cachedResponse(data, 'publicShort', { status: 201 });
 *
 * // With additional headers
 * return cachedResponse(data, 'privateMedium', {
 *   headers: { 'X-Custom': 'value' }
 * });
 * ```
 */
export function cachedResponse<T>(
  data: T,
  preset: CachePresetName,
  options?: {
    status?: number;
    headers?: Record<string, string>;
  }
): NextResponse<T> {
  const { status = 200, headers = {} } = options ?? {};

  const cacheHeaders = CachePresets[preset];

  return NextResponse.json(data, {
    status,
    headers: {
      ...cacheHeaders,
      ...headers,
    },
  });
}

/**
 * Creates a custom cache-control header
 *
 * @example
 * ```ts
 * const headers = createCacheHeaders({
 *   public: true,
 *   maxAge: 120,
 *   staleWhileRevalidate: 60,
 * });
 * ```
 */
export function createCacheHeaders(options: {
  public?: boolean;
  private?: boolean;
  maxAge?: number;
  sMaxAge?: number;
  staleWhileRevalidate?: number;
  staleIfError?: number;
  noCache?: boolean;
  noStore?: boolean;
  mustRevalidate?: boolean;
  immutable?: boolean;
}): Record<string, string> {
  const directives: string[] = [];

  if (options.noStore) {
    directives.push('no-store');
  }
  if (options.noCache) {
    directives.push('no-cache');
  }
  if (options.public) {
    directives.push('public');
  }
  if (options.private) {
    directives.push('private');
  }
  if (options.maxAge !== undefined) {
    directives.push(`max-age=${options.maxAge}`);
  }
  if (options.sMaxAge !== undefined) {
    directives.push(`s-maxage=${options.sMaxAge}`);
  }
  if (options.staleWhileRevalidate !== undefined) {
    directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
  }
  if (options.staleIfError !== undefined) {
    directives.push(`stale-if-error=${options.staleIfError}`);
  }
  if (options.mustRevalidate) {
    directives.push('must-revalidate');
  }
  if (options.immutable) {
    directives.push('immutable');
  }

  return {
    'Cache-Control': directives.join(', '),
  };
}

/**
 * Adds Vary header for proper cache key differentiation
 *
 * @example
 * ```ts
 * return NextResponse.json(data, {
 *   headers: {
 *     ...CachePresets.publicMedium,
 *     ...varyHeaders('Accept-Language', 'Authorization'),
 *   }
 * });
 * ```
 */
export function varyHeaders(...headers: string[]): Record<string, string> {
  return {
    Vary: headers.join(', '),
  };
}

/**
 * Conditional ETag generation for response validation
 */
export function generateETag(content: unknown): string {
  const hash = simpleHash(JSON.stringify(content));
  return `"${hash}"`;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Creates a response with ETag for conditional requests
 *
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const data = await fetchData();
 *   return etagResponse(request, data, 'publicMedium');
 * }
 * ```
 */
export function etagResponse<T>(
  request: { headers: Headers },
  data: T,
  preset: CachePresetName = 'publicMedium'
): NextResponse<T | null> {
  const etag = generateETag(data);
  const ifNoneMatch = request.headers.get('If-None-Match');

  if (ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        ...CachePresets[preset],
      },
    }) as NextResponse<T | null>;
  }

  return NextResponse.json(data, {
    headers: {
      ETag: etag,
      ...CachePresets[preset],
    },
  }) as NextResponse<T | null>;
}
