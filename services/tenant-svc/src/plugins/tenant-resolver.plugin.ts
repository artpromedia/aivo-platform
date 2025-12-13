/**
 * Tenant Resolver Fastify Plugin
 *
 * Attaches tenant resolution to every request using the request hostname.
 * Decorates the request object with tenant context.
 *
 * Usage:
 *   import { tenantResolverPlugin } from './plugins/tenant-resolver.plugin';
 *   fastify.register(tenantResolverPlugin, { ... });
 *
 *   // Access in route handlers:
 *   fastify.get('/api/example', async (request) => {
 *     const { tenant, tenantId } = request.tenantContext;
 *   });
 */

import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

import {
  type TenantResolverService,
  createTenantResolverService,
  type TenantResolution,
} from '../services/tenant-resolver.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════════

export interface TenantContext {
  tenantId: string | null;
  tenant: TenantResolution['tenant'] | null;
  source: TenantResolution['source'] | null;
  resolved: boolean;
}

export interface TenantResolverPluginOptions {
  /**
   * Redis client for caching (optional - caching disabled if not provided)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  redis?: any;

  /**
   * Prisma client for database queries
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any;

  /**
   * Base domain for subdomain extraction (e.g., "aivo.ai")
   */
  baseDomain: string;

  /**
   * Cache TTL in seconds (default: 300)
   */
  cacheTtlSeconds?: number;

  /**
   * Default tenant ID for app.aivo.ai consumer access
   */
  defaultTenantId?: string;

  /**
   * Paths to skip tenant resolution (e.g., health checks)
   */
  skipPaths?: string[];

  /**
   * If true, returns 404 when tenant cannot be resolved
   * If false, continues with null tenant context
   */
  requireTenant?: boolean;

  /**
   * Custom hostname extraction function
   * Default: uses request.hostname
   */
  getHostname?: (request: FastifyRequest) => string;
}

// ══════════════════════════════════════════════════════════════════════════════
// Type Augmentation
// ══════════════════════════════════════════════════════════════════════════════

declare module 'fastify' {
  interface FastifyRequest {
    tenantContext: TenantContext;
    tenantResolver: TenantResolverService;
  }

  interface FastifyInstance {
    tenantResolver: TenantResolverService;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Default Values
// ══════════════════════════════════════════════════════════════════════════════

const DEFAULT_SKIP_PATHS = [
  '/health',
  '/healthz',
  '/ready',
  '/readyz',
  '/metrics',
  '/favicon.ico',
];

// ══════════════════════════════════════════════════════════════════════════════
// Plugin Implementation
// ══════════════════════════════════════════════════════════════════════════════

const tenantResolverPluginImpl: FastifyPluginAsync<TenantResolverPluginOptions> = async (
  fastify,
  options
) => {
  /* eslint-disable @typescript-eslint/no-unsafe-assignment */
  const {
    redis,
    prisma,
    baseDomain,
    cacheTtlSeconds = 300,
    defaultTenantId,
    skipPaths = DEFAULT_SKIP_PATHS,
    requireTenant = false,
    getHostname = (req) => req.hostname,
  } = options;

  // Initialize service
  const resolverService = createTenantResolverService({
    redis: redis ?? null,
    prisma,
    baseDomain,
    cacheTtlSeconds,
    defaultTenantId,
  });
  /* eslint-enable @typescript-eslint/no-unsafe-assignment */

  // Decorate fastify instance with resolver service
  fastify.decorate('tenantResolver', resolverService);

  // Decorate request with tenant context
  fastify.decorateRequest('tenantContext', null);
  fastify.decorateRequest('tenantResolver', null);

  // Add onRequest hook to resolve tenant
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Attach resolver to request
    (request as unknown as { tenantResolver: TenantResolverService }).tenantResolver = resolverService;

    // Skip resolution for certain paths
    const shouldSkip = skipPaths.some((path) => request.url.startsWith(path));
    if (shouldSkip) {
      (request as unknown as { tenantContext: TenantContext }).tenantContext = {
        tenantId: null,
        tenant: null,
        source: null,
        resolved: false,
      };
      return;
    }

    // Extract hostname
    const hostname = getHostname(request);

    // Resolve tenant
    const resolution = await resolverService.resolveFromHost(hostname);

    if (resolution) {
      (request as unknown as { tenantContext: TenantContext }).tenantContext = {
        tenantId: resolution.tenantId,
        tenant: resolution.tenant,
        source: resolution.source,
        resolved: true,
      };
    } else {
      // Tenant not resolved
      if (requireTenant) {
        reply.code(404).send({
          error: 'Tenant not found',
          message: 'Unable to resolve tenant from hostname',
          hostname,
        });
        return;
      }

      (request as unknown as { tenantContext: TenantContext }).tenantContext = {
        tenantId: null,
        tenant: null,
        source: null,
        resolved: false,
      };
    }
  });

  // Log initialization
  fastify.log.info(
    { baseDomain, cacheEnabled: !!redis, cacheTtlSeconds },
    'Tenant resolver plugin initialized'
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// Export
// ══════════════════════════════════════════════════════════════════════════════

// Export with type cast to resolve fp() type inference issue
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any */
export const tenantResolverPlugin = fp(tenantResolverPluginImpl as any, {
  fastify: '4.x',
  name: 'tenant-resolver',
});
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any */

// ══════════════════════════════════════════════════════════════════════════════
// Utilities
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Middleware-style guard that requires tenant resolution
 */
export async function requireTenantContext(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.tenantContext.resolved || !request.tenantContext.tenantId) {
    reply.code(404).send({
      error: 'Tenant required',
      message: 'This endpoint requires a valid tenant context',
    });
  }
}

/**
 * Helper to get tenant ID or throw
 */
export function getTenantIdOrThrow(request: FastifyRequest): string {
  const tenantId = request.tenantContext.tenantId;
  if (!tenantId) {
    throw new Error('Tenant context not available');
  }
  return tenantId;
}
