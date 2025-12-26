import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { createHash } from 'crypto';

/**
 * Cache metadata keys
 */
export const CACHE_KEY = 'cache:key';
export const CACHE_TTL = 'cache:ttl';
export const CACHE_TAGS = 'cache:tags';
export const CACHE_ENABLED = 'cache:enabled';
export const CACHE_VARY = 'cache:vary';

/**
 * Cache decorator options
 */
export interface CacheDecoratorOptions {
  key?: string | ((ctx: ExecutionContext) => string);
  ttl?: number;
  tags?: string[] | ((ctx: ExecutionContext) => string[]);
  vary?: string[];
  condition?: (ctx: ExecutionContext) => boolean;
}

/**
 * Decorator to enable caching on a route
 */
export function Cacheable(options: CacheDecoratorOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    SetMetadata(CACHE_ENABLED, true)(target, propertyKey, descriptor);

    if (options.key) {
      SetMetadata(CACHE_KEY, options.key)(target, propertyKey, descriptor);
    }
    if (options.ttl) {
      SetMetadata(CACHE_TTL, options.ttl)(target, propertyKey, descriptor);
    }
    if (options.tags) {
      SetMetadata(CACHE_TAGS, options.tags)(target, propertyKey, descriptor);
    }
    if (options.vary) {
      SetMetadata(CACHE_VARY, options.vary)(target, propertyKey, descriptor);
    }

    return descriptor;
  };
}

/**
 * Decorator to invalidate cache
 */
export function CacheInvalidate(options: {
  tags?: string[] | ((ctx: ExecutionContext) => string[]);
  keys?: string[] | ((ctx: ExecutionContext) => string[]);
  pattern?: string | ((ctx: ExecutionContext) => string);
}) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      // Get cache manager (would be injected in real implementation)
      const cache = getCacheManagerInstance();

      if (cache) {
        // Invalidate by tags
        if (options.tags) {
          const tags =
            typeof options.tags === 'function'
              ? options.tags(args[0])
              : options.tags;

          for (const tag of tags) {
            await cache.invalidateByTag(tag);
          }
        }

        // Invalidate by keys
        if (options.keys) {
          const keys =
            typeof options.keys === 'function'
              ? options.keys(args[0])
              : options.keys;

          for (const key of keys) {
            await cache.delete(key);
          }
        }

        // Invalidate by pattern
        if (options.pattern) {
          const pattern =
            typeof options.pattern === 'function'
              ? options.pattern(args[0])
              : options.pattern;

          await cache.invalidateByPattern(pattern);
        }
      }

      return result;
    };

    return descriptor;
  };
}

// Simple cache interface for the interceptor
interface CacheInterface {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: { ttl?: number; tags?: string[] }): Promise<void>;
  delete(key: string): Promise<void>;
  invalidateByTag(tag: string): Promise<number>;
  invalidateByPattern(pattern: string): Promise<number>;
}

// Placeholder for cache manager instance
let cacheManagerInstance: CacheInterface | null = null;

export function setCacheManagerInstance(cache: CacheInterface): void {
  cacheManagerInstance = cache;
}

export function getCacheManagerInstance(): CacheInterface | null {
  return cacheManagerInstance;
}

/**
 * HTTP Response Cache Interceptor
 */
@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<any>> {
    // Check if caching is enabled for this route
    const cacheEnabled = this.reflector.get<boolean>(
      CACHE_ENABLED,
      context.getHandler()
    );

    if (!cacheEnabled) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Skip cache for non-GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Skip if user has Cache-Control: no-cache
    if (request.headers['cache-control']?.includes('no-cache')) {
      return next.handle();
    }

    const cache = getCacheManagerInstance();
    if (!cache) {
      return next.handle();
    }

    const cacheKey = this.buildCacheKey(context, request);
    const ttl =
      this.reflector.get<number>(CACHE_TTL, context.getHandler()) || 300;
    const tags = this.resolveTags(context);

    // Try to get from cache
    const startTime = performance.now();
    const cached = await cache.get<{ body: any; headers: Record<string, string> }>(
      cacheKey
    );

    if (cached) {
      const latency = performance.now() - startTime;

      // Set cached headers
      if (cached.headers) {
        for (const [key, value] of Object.entries(cached.headers)) {
          response.setHeader(key, value);
        }
      }

      response.setHeader('X-Cache', 'HIT');
      response.setHeader('X-Cache-Age', String(Math.floor(latency)));

      return of(cached.body);
    }

    // Execute handler and cache result
    return next.handle().pipe(
      tap(async (data) => {
        // Don't cache error responses
        if (response.statusCode >= 400) {
          return;
        }

        // Cache the response
        const headersToCache: Record<string, string> = {};
        const varyHeaders =
          this.reflector.get<string[]>(CACHE_VARY, context.getHandler()) || [];

        for (const header of varyHeaders) {
          const value = response.getHeader(header);
          if (value) {
            headersToCache[header] = String(value);
          }
        }

        await cache.set(cacheKey, { body: data, headers: headersToCache }, { ttl, tags });

        response.setHeader('X-Cache', 'MISS');
      })
    );
  }

  private buildCacheKey(context: ExecutionContext, request: Request): string {
    const keyMetadata = this.reflector.get<
      string | ((ctx: ExecutionContext) => string)
    >(CACHE_KEY, context.getHandler());

    if (typeof keyMetadata === 'function') {
      return `http:${keyMetadata(context)}`;
    }

    if (keyMetadata) {
      return `http:${keyMetadata}`;
    }

    // Build key from request
    const vary =
      this.reflector.get<string[]>(CACHE_VARY, context.getHandler()) || [];

    const parts = ['http', request.path, this.hashQuery(request.query)];

    // Include varied headers in key
    for (const header of vary) {
      const value = request.headers[header.toLowerCase()];
      if (value) {
        parts.push(`${header}:${value}`);
      }
    }

    // Include user ID if authenticated (for user-specific caching)
    if ((request as any).user?.id) {
      parts.push(`user:${(request as any).user.id}`);
    }

    return parts.join(':');
  }

  private hashQuery(query: any): string {
    if (!query || Object.keys(query).length === 0) {
      return '';
    }

    const sorted = Object.keys(query)
      .sort()
      .map((k) => `${k}=${query[k]}`)
      .join('&');

    return createHash('sha256').update(sorted).digest('hex').slice(0, 16);
  }

  private resolveTags(context: ExecutionContext): string[] {
    const tagsMetadata = this.reflector.get<
      string[] | ((ctx: ExecutionContext) => string[])
    >(CACHE_TAGS, context.getHandler());

    if (typeof tagsMetadata === 'function') {
      return tagsMetadata(context);
    }

    return tagsMetadata || [];
  }
}

/**
 * GraphQL Cache Interceptor
 */
@Injectable()
export class GraphQLCacheInterceptor implements NestInterceptor {
  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<any>> {
    // GraphQL-specific caching logic
    const gqlContext = context.getArgByIndex(2);
    const info = context.getArgByIndex(3);

    if (!info || !gqlContext) {
      return next.handle();
    }

    const operationType = info.operation?.operation;

    // Only cache queries, not mutations or subscriptions
    if (operationType !== 'query') {
      return next.handle();
    }

    const cache = getCacheManagerInstance();
    if (!cache) {
      return next.handle();
    }

    const cacheKey = this.buildGraphQLCacheKey(context, info);

    const cached = await cache.get(cacheKey);
    if (cached) {
      return of(cached);
    }

    return next.handle().pipe(
      tap(async (data) => {
        // Determine TTL based on query
        const ttl = this.determineTTL(info);
        await cache.set(cacheKey, data, { ttl });
      })
    );
  }

  private buildGraphQLCacheKey(context: ExecutionContext, info: any): string {
    const fieldName = info.fieldName;
    const args = context.getArgByIndex(1) || {};
    const argsHash = createHash('sha256')
      .update(JSON.stringify(args))
      .digest('hex')
      .slice(0, 16);

    return `gql:${fieldName}:${argsHash}`;
  }

  private determineTTL(info: any): number {
    // Could use directive-based TTL
    const cacheHint = info.cacheControl?.cacheHint;

    if (cacheHint?.maxAge) {
      return cacheHint.maxAge;
    }

    // Default TTLs by operation type
    const defaultTTLs: Record<string, number> = {
      student: 60,
      lesson: 300,
      class: 600,
      analytics: 60,
    };

    return defaultTTLs[info.fieldName] || 300;
  }
}
