/**
 * Tenant Scope Middleware for Fastify
 *
 * Extracts tenant context from JWT claims and creates a tenant-scoped
 * Prisma client for each request.
 *
 * @module @aivo/ts-data-access/middleware
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

import type { TenantContext, ExtendedTenantContext } from './tenant-context.js';
import {
  TenantContextError,
  validateTenantContext,
  runWithTenantContext,
} from './tenant-context.js';
import {
  createTenantScopedClient,
  getCachedTenantClient,
  type TenantScopeLogger,
  type TenantScopedPrismaClient,
} from './tenant-scoped-client.js';

// Note: We use 'any' for PrismaClient type to avoid requiring @prisma/client
// as a direct dependency. Services will import their own generated client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClientLike = any;

/**
 * Options for the tenant scope middleware
 */
export interface TenantScopeMiddlewareOptions<T extends PrismaClientLike = PrismaClientLike> {
  /**
   * The base Prisma client instance to extend
   */
  prisma: T;

  /**
   * Optional function to validate that a tenant exists and is active
   * Called on each request to ensure tenant hasn't been deactivated
   */
  validateTenant?: (tenantId: string) => Promise<{ isActive: boolean; type?: string }>;

  /**
   * Optional logger for security events and telemetry
   */
  logger?: TenantScopeLogger;

  /**
   * Whether to block raw SQL queries (default: true)
   */
  blockRawQueries?: boolean;

  /**
   * Whether to throw on cross-tenant access attempts (default: true)
   */
  throwOnCrossTenantAccess?: boolean;

  /**
   * Whether to cache tenant-scoped clients (default: true)
   */
  cacheClients?: boolean;

  /**
   * Paths that should skip tenant scope middleware (public endpoints)
   */
  skipPaths?: string[];

  /**
   * Paths that should skip tenant scope middleware (regex patterns)
   */
  skipPathPatterns?: RegExp[];
}

// Augment Fastify types
declare module 'fastify' {
  interface FastifyRequest {
    /**
     * Tenant context extracted from JWT
     */
    tenantContext: ExtendedTenantContext;

    /**
     * Tenant-scoped Prisma client
     */
    tenantPrisma: TenantScopedPrismaClient;
  }
}

/**
 * Checks if a path should skip tenant scope middleware
 */
function shouldSkipPath(
  path: string,
  skipPaths?: string[],
  skipPatterns?: RegExp[]
): boolean {
  if (skipPaths?.includes(path)) return true;
  if (skipPatterns?.some((pattern) => pattern.test(path))) return true;
  return false;
}

/**
 * Default logger for tenant scope middleware
 */
const defaultMiddlewareLogger: TenantScopeLogger = {
  logCrossTenantAccess(entry) {
    console.error('[SECURITY] Cross-tenant access attempt:', JSON.stringify(entry));
  },
  logQuery(tenantId, model, operation, durationMs) {
    if (process.env.DEBUG_TENANT_QUERIES === 'true') {
      console.debug(`[TENANT:${tenantId}] ${operation} on ${model}: ${durationMs.toFixed(2)}ms`);
    }
  },
};

/**
 * Creates the tenant scope preHandler hook
 */
async function tenantScopeHandler<T extends PrismaClientLike>(
  request: FastifyRequest,
  reply: FastifyReply,
  options: TenantScopeMiddlewareOptions<T>
): Promise<void> {
  const path = request.routeOptions?.url || request.url;

  // Skip middleware for specified paths
  if (shouldSkipPath(path, options.skipPaths, options.skipPathPatterns)) {
    return;
  }

  // Get auth context from request (set by auth middleware)
  const auth = (request as any).auth || (request as any).user;

  if (!auth) {
    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }

  // Validate tenant context from auth
  if (!validateTenantContext(auth)) {
    request.log.warn({ auth }, 'Invalid tenant context in auth token');
    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Invalid tenant context in token',
    });
    return;
  }

  const tenantContext: ExtendedTenantContext = {
    tenantId: auth.tenantId,
    userId: auth.userId,
    roles: auth.roles,
    tenantType: auth.tenantType,
    relatedLearnerIds: auth.relatedLearnerIds,
    requestId: request.id,
    timestamp: new Date(),
  };

  // Validate tenant is active if validator provided
  if (options.validateTenant) {
    try {
      const tenantInfo = await options.validateTenant(tenantContext.tenantId);

      if (!tenantInfo.isActive) {
        request.log.warn({ tenantId: tenantContext.tenantId }, 'Tenant is inactive');
        reply.code(403).send({
          error: 'Forbidden',
          message: 'Tenant account is inactive',
        });
        return;
      }

      tenantContext.tenantType = tenantInfo.type as ExtendedTenantContext['tenantType'];
      tenantContext.isActive = tenantInfo.isActive;
    } catch (error) {
      if (error instanceof TenantContextError && error.code === 'TENANT_NOT_FOUND') {
        reply.code(403).send({
          error: 'Forbidden',
          message: 'Tenant not found',
        });
        return;
      }
      throw error;
    }
  }

  // Create tenant-scoped client
  const logger = options.logger ?? defaultMiddlewareLogger;
  const clientOptions = {
    tenantId: tenantContext.tenantId,
    logger,
    blockRawQueries: options.blockRawQueries ?? true,
    throwOnCrossTenantAccess: options.throwOnCrossTenantAccess ?? true,
  };

  const tenantPrisma =
    options.cacheClients !== false
      ? getCachedTenantClient(options.prisma, clientOptions)
      : createTenantScopedClient(options.prisma, clientOptions);

  // Attach to request
  request.tenantContext = tenantContext;
  request.tenantPrisma = tenantPrisma as TenantScopedPrismaClient;
}

/**
 * Fastify plugin for tenant scope middleware
 *
 * @example
 * ```typescript
 * import Fastify from 'fastify';
 * import { PrismaClient } from '@prisma/client';
 * import { tenantScopeMiddleware } from '@aivo/ts-data-access';
 *
 * const prisma = new PrismaClient();
 * const app = Fastify();
 *
 * app.register(tenantScopeMiddleware, {
 *   prisma,
 *   skipPaths: ['/health', '/metrics'],
 *   validateTenant: async (tenantId) => {
 *     const tenant = await prisma.tenant.findUnique({
 *       where: { id: tenantId },
 *       select: { isActive: true, type: true },
 *     });
 *     if (!tenant) throw new TenantContextError('Tenant not found', 'TENANT_NOT_FOUND');
 *     return { isActive: tenant.isActive, type: tenant.type };
 *   },
 * });
 *
 * // In route handlers:
 * app.get('/users', async (request, reply) => {
 *   // Automatically scoped to the tenant from JWT
 *   const users = await request.tenantPrisma.user.findMany();
 *   return users;
 * });
 * ```
 */
async function tenantScopeMiddlewarePlugin<T extends PrismaClientLike>(
  fastify: FastifyInstance,
  options: TenantScopeMiddlewareOptions<T>
): Promise<void> {
  // Add preHandler hook that runs after authentication
  fastify.addHook('preHandler', async (request, reply) => {
    await tenantScopeHandler(request, reply, options);
  });

  // Add onRequest hook to wrap request in tenant context for AsyncLocalStorage
  fastify.addHook('onRequest', async (request) => {
    // Context will be available after preHandler
    // This sets up the async context for any downstream code that needs it
  });

  // Add onResponse hook for cleanup/logging
  fastify.addHook('onResponse', async (request, reply) => {
    if (request.tenantContext && process.env.DEBUG_TENANT_QUERIES === 'true') {
      request.log.debug(
        {
          tenantId: request.tenantContext.tenantId,
          userId: request.tenantContext.userId,
          statusCode: reply.statusCode,
          responseTime: reply.elapsedTime,
        },
        'Tenant-scoped request completed'
      );
    }
  });
}

/**
 * Tenant scope middleware Fastify plugin
 */
export const tenantScopeMiddleware = fp(tenantScopeMiddlewarePlugin, {
  name: 'tenant-scope-middleware',
  // Run after auth middleware
  dependencies: [],
});

/**
 * Helper to create a standalone tenant scope hook (for services that don't use the plugin)
 */
export function createTenantScopeHook<T extends PrismaClientLike>(
  options: TenantScopeMiddlewareOptions<T>
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async (request, reply) => {
    await tenantScopeHandler(request, reply, options);
  };
}

/**
 * Decorator to run a function within the current request's tenant context
 * Useful for spawning background jobs that need tenant context
 */
export function withRequestTenantContext<T>(
  request: FastifyRequest,
  fn: () => T | Promise<T>
): T | Promise<T> {
  if (!request.tenantContext) {
    throw new TenantContextError('No tenant context on request', 'MISSING_CONTEXT');
  }
  return runWithTenantContext(request.tenantContext, fn);
}
