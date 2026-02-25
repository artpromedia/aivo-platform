/**
 * Domain Resolver Middleware (Sprint 9)
 *
 * Resolves the incoming request's Host header to a tenant.
 * Supports:
 *   - Default subdomain routing: <slug>.aivolearning.com → tenant slug
 *   - Custom domain routing:     school.example.com → cached tenant lookup
 *
 * Attaches tenantId, tenantSlug, and isCustomDomain to the Express request
 * and securityContext for downstream guards/interceptors.
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

import { PrismaService } from '../../prisma/prisma.service';

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const DOMAIN_CACHE_PREFIX = 'domain:tenant:';
const DOMAIN_CACHE_TTL = 300; // 5 minutes
const NEGATIVE_CACHE_TTL = 60; // 1 minute for "not found" entries

/* -------------------------------------------------------------------------- */
/*  Type augmentation                                                          */
/* -------------------------------------------------------------------------- */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenantId?: string;
      tenantSlug?: string;
      isCustomDomain?: boolean;
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  Middleware                                                                  */
/* -------------------------------------------------------------------------- */

@Injectable()
export class DomainResolverMiddleware implements NestMiddleware {
  private readonly logger = new Logger(DomainResolverMiddleware.name);
  private readonly redis: Redis | null;
  private readonly baseDomain: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const redisHost = this.configService.get<string>('REDIS_HOST');
    if (redisHost) {
      this.redis = new Redis({
        host: redisHost,
        port: this.configService.get<number>('REDIS_PORT', 6379),
        password: this.configService.get<string>('REDIS_PASSWORD'),
        db: this.configService.get<number>('REDIS_DOMAIN_DB', 0),
        keyPrefix: DOMAIN_CACHE_PREFIX,
        lazyConnect: true,
        maxRetriesPerRequest: 2,
        retryStrategy: (times: number) =>
          times > 3 ? null : Math.min(times * 200, 2000),
      });
      this.redis.on('error', (err: Error) => {
        this.logger.warn(`Domain cache Redis error: ${err.message}`);
      });
    } else {
      this.redis = null;
    }

    this.baseDomain = this.configService.get<string>(
      'BASE_DOMAIN',
      'aivolearning.com',
    );
  }

  /* -----------------------------------------------------------------------*/
  /*  Middleware handler                                                      */
  /* -----------------------------------------------------------------------*/

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const host = this.extractHost(req);
    if (!host) {
      return next();
    }

    try {
      // 1. Check if this is a default subdomain (e.g. springfield.aivolearning.com)
      const slug = this.extractSubdomain(host);
      if (slug) {
        const tenant = await this.resolveBySlug(slug);
        if (tenant) {
          this.attachTenantContext(req, tenant.id, slug, false);
        }
        return next();
      }

      // 2. Custom domain lookup (e.g. learn.springfield-schools.org)
      const result = await this.resolveCustomDomain(host);
      if (result) {
        this.attachTenantContext(req, result.tenantId, result.slug, true);
      }
    } catch (err) {
      // Domain resolution is best-effort — don't block the request
      this.logger.error(
        `Domain resolution failed for ${host}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    next();
  }

  /* -----------------------------------------------------------------------*/
  /*  Host parsing                                                           */
  /* -----------------------------------------------------------------------*/

  private extractHost(req: Request): string | null {
    // Prefer X-Forwarded-Host behind load balancer, fall back to Host header
    const forwarded = req.headers['x-forwarded-host'] as string | undefined;
    const raw = forwarded || req.headers.host;
    if (!raw) return null;

    // Strip port if present
    return raw.split(':')[0].toLowerCase().trim();
  }

  /**
   * If the host is a direct subdomain of the base domain, return the slug.
   * e.g. `springfield.aivolearning.com` → `springfield`
   * Returns null for top-level (`aivolearning.com`) or non-matching hosts.
   */
  private extractSubdomain(host: string): string | null {
    const suffix = `.${this.baseDomain}`;
    if (!host.endsWith(suffix)) return null;

    const sub = host.slice(0, -suffix.length);
    // Must be a single-level subdomain (no dots) and non-empty
    if (!sub || sub.includes('.')) return null;

    // Skip well-known subdomains that aren't tenant slugs
    const reserved = new Set([
      'www',
      'api',
      'app',
      'admin',
      'status',
      'docs',
      'mail',
      'cdn',
    ]);
    if (reserved.has(sub)) return null;

    return sub;
  }

  /* -----------------------------------------------------------------------*/
  /*  Tenant resolution                                                      */
  /* -----------------------------------------------------------------------*/

  private async resolveBySlug(
    slug: string,
  ): Promise<{ id: string; slug: string } | null> {
    // Try cache first
    const cacheKey = `slug:${slug}`;
    const cached = await this.getCache(cacheKey);
    if (cached === '__NOT_FOUND__') return null;
    if (cached) {
      try {
        return JSON.parse(cached) as { id: string; slug: string };
      } catch {
        /* ignore bad cache */
      }
    }

    // Database lookup
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        OR: [{ slug }, { subdomain: slug }],
        status: 'ACTIVE',
      },
      select: { id: true, slug: true },
    });

    if (tenant) {
      await this.setCache(cacheKey, JSON.stringify(tenant), DOMAIN_CACHE_TTL);
      return tenant;
    }

    // Negative cache
    await this.setCache(cacheKey, '__NOT_FOUND__', NEGATIVE_CACHE_TTL);
    return null;
  }

  private async resolveCustomDomain(
    domain: string,
  ): Promise<{ tenantId: string; slug: string } | null> {
    // Try cache first
    const cacheKey = `custom:${domain}`;
    const cached = await this.getCache(cacheKey);
    if (cached === '__NOT_FOUND__') return null;
    if (cached) {
      try {
        return JSON.parse(cached) as { tenantId: string; slug: string };
      } catch {
        /* ignore bad cache */
      }
    }

    // Database lookup — custom domain must be verified
    const record = await this.prisma.tenantCustomDomain.findFirst({
      where: {
        domain,
        status: 'VERIFIED',
      },
      select: {
        tenantId: true,
        tenant: { select: { slug: true } },
      },
    });

    if (record) {
      const result = { tenantId: record.tenantId, slug: record.tenant.slug };
      await this.setCache(cacheKey, JSON.stringify(result), DOMAIN_CACHE_TTL);
      return result;
    }

    // Negative cache
    await this.setCache(cacheKey, '__NOT_FOUND__', NEGATIVE_CACHE_TTL);
    return null;
  }

  /* -----------------------------------------------------------------------*/
  /*  Context attachment                                                     */
  /* -----------------------------------------------------------------------*/

  private attachTenantContext(
    req: Request,
    tenantId: string,
    slug: string,
    isCustomDomain: boolean,
  ): void {
    req.tenantId = tenantId;
    req.tenantSlug = slug;
    req.isCustomDomain = isCustomDomain;

    // Also attach to securityContext if already initialised
    if (req.securityContext) {
      req.securityContext.tenantId = tenantId;
    }
  }

  /* -----------------------------------------------------------------------*/
  /*  Redis helpers                                                          */
  /* -----------------------------------------------------------------------*/

  private async getCache(key: string): Promise<string | null> {
    if (!this.redis) return null;
    try {
      return await this.redis.get(key);
    } catch {
      return null;
    }
  }

  private async setCache(
    key: string,
    value: string,
    ttl: number,
  ): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.set(key, value, 'EX', ttl);
    } catch {
      /* best-effort */
    }
  }
}
