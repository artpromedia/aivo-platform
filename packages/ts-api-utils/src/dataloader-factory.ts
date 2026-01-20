/**
 * DataLoader Factory for Service Integration
 *
 * Provides a standardized way to create and manage DataLoaders across services.
 * Addresses P0 Issue: Integrate DataLoader in services to prevent N+1 queries
 *
 * CRITICAL: The N+1 query problem is one of the most common performance issues
 * in backend services. This factory provides tools to batch database queries
 * automatically.
 *
 * Usage:
 *
 * 1. Create a service-specific loader factory:
 * ```typescript
 * import { createServiceDataLoaders, DataLoaderFactory } from '@aivo/ts-api-utils';
 *
 * // In your service constructor
 * const loaders = createServiceDataLoaders(prisma);
 *
 * // Use the loaders
 * const users = await loaders.userById.loadMany(['user-1', 'user-2']);
 * ```
 *
 * 2. For Fastify/Express request context:
 * ```typescript
 * // Create fresh loaders per request to avoid cache leaks
 * app.addHook('preHandler', async (request) => {
 *   request.loaders = createServiceDataLoaders(prisma);
 * });
 * ```
 *
 * 3. For GraphQL:
 * ```typescript
 * // In your GraphQL context factory
 * context: ({ req }) => ({
 *   loaders: createServiceDataLoaders(prisma),
 * })
 * ```
 */

import {
  createDataLoader,
  createIdLoader,
  createRelationLoader,
  DataLoader,
  DataLoaderOptions,
  LRUCache,
  TTLCache,
} from './dataloader.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generic Prisma-like client interface
 */
export interface PrismaLike {
  [model: string]: {
    findMany: (args: { where: { id: { in: string[] } } }) => Promise<{ id: string }[]>;
  };
}

/**
 * Common entity shapes
 */
export interface BaseEntity {
  id: string;
}

export interface TenantEntity extends BaseEntity {
  tenantId: string;
}

export interface UserEntity extends TenantEntity {
  email: string;
  status?: string;
}

export interface StudentEntity extends TenantEntity {
  firstName?: string;
  lastName?: string;
}

/**
 * DataLoader collection for a service
 */
export interface ServiceDataLoaders<TModels extends Record<string, BaseEntity>> {
  [K: string]: DataLoader<string, TModels[keyof TModels] | null>;
}

// ══════════════════════════════════════════════════════════════════════════════
// LOADER FACTORIES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a DataLoader for a Prisma model
 */
export function createPrismaLoader<T extends BaseEntity>(
  prismaModel: { findMany: (args: { where: { id: { in: string[] } } }) => Promise<T[]> },
  options?: DataLoaderOptions<string, T>
): DataLoader<string, T> {
  return createIdLoader(
    async (ids: string[]) => {
      return prismaModel.findMany({
        where: { id: { in: ids } },
      });
    },
    {
      name: options?.name ?? 'PrismaLoader',
      cache: options?.cache ?? true,
      maxBatchSize: options?.maxBatchSize ?? 100,
      cacheMap: options?.cacheMap,
    }
  );
}

/**
 * Create a tenant-scoped DataLoader
 * Ensures data isolation between tenants
 */
export function createTenantScopedLoader<T extends TenantEntity>(
  prismaModel: {
    findMany: (args: { where: { id: { in: string[] }; tenantId: string } }) => Promise<T[]>;
  },
  tenantId: string,
  options?: DataLoaderOptions<string, T>
): DataLoader<string, T> {
  return createIdLoader(
    async (ids: string[]) => {
      return prismaModel.findMany({
        where: {
          id: { in: ids },
          tenantId,
        },
      });
    },
    {
      name: options?.name ?? `TenantLoader:${tenantId}`,
      cache: true,
      maxBatchSize: 100,
      ...options,
    }
  );
}

/**
 * Create a DataLoader for one-to-many relations
 */
export function createRelationDataLoader<T>(
  fetchFn: (foreignKeys: string[]) => Promise<T[]>,
  foreignKeyAccessor: (item: T) => string,
  options?: DataLoaderOptions<string, T[]>
): DataLoader<string, T[]> {
  return createRelationLoader(fetchFn, foreignKeyAccessor, {
    name: options?.name ?? 'RelationLoader',
    cache: true,
    maxBatchSize: 50,
    ...options,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE LOADER FACTORY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for service-specific DataLoaders
 */
export interface DataLoaderConfig {
  /** Enable LRU cache with max entries (default: unlimited Map cache) */
  lruCacheSize?: number;
  /** Enable TTL cache with expiry in ms (default: no expiry) */
  ttlMs?: number;
  /** Maximum batch size (default: 100) */
  maxBatchSize?: number;
}

/**
 * Create a new DataLoaderFactory for a service
 *
 * Example:
 * ```typescript
 * const factory = new DataLoaderFactory({ lruCacheSize: 1000, ttlMs: 60000 });
 *
 * factory.register('users', () => createPrismaLoader(prisma.user, { name: 'UserLoader' }));
 * factory.register('students', () => createPrismaLoader(prisma.student, { name: 'StudentLoader' }));
 *
 * // Create loaders for a request
 * const loaders = factory.createLoaders();
 * const user = await loaders.get('users')?.load('user-id');
 * ```
 */
export class DataLoaderFactory<TLoaders extends Record<string, DataLoader<unknown, unknown>>> {
  private factories = new Map<keyof TLoaders, () => TLoaders[keyof TLoaders]>();
  private config: DataLoaderConfig;

  constructor(config: DataLoaderConfig = {}) {
    this.config = {
      lruCacheSize: config.lruCacheSize,
      ttlMs: config.ttlMs,
      maxBatchSize: config.maxBatchSize ?? 100,
    };
  }

  /**
   * Register a loader factory
   */
  register<K extends keyof TLoaders>(name: K, factory: () => TLoaders[K]): this {
    this.factories.set(name, factory as () => TLoaders[keyof TLoaders]);
    return this;
  }

  /**
   * Create a fresh set of loaders (call once per request)
   */
  createLoaders(): TLoaders {
    const loaders: Partial<TLoaders> = {};

    for (const [name, factory] of this.factories) {
      loaders[name as keyof TLoaders] = factory();
    }

    return loaders as TLoaders;
  }

  /**
   * Get cache factory based on config
   */
  getCacheFactory<K, V>(): (() => LRUCache<K, V> | TTLCache<K, V>) | undefined {
    if (this.config.lruCacheSize) {
      return () => new LRUCache<K, V>(this.config.lruCacheSize!);
    }
    if (this.config.ttlMs) {
      return () => new TTLCache<K, V>(this.config.ttlMs!);
    }
    return undefined;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// COMMON LOADER PRESETS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Common DataLoader types for AIVO services
 */
export interface CommonDataLoaders {
  userById: DataLoader<string, UserEntity>;
  studentById: DataLoader<string, StudentEntity>;
  [key: string]: DataLoader<string, unknown>;
}

/**
 * Create standard DataLoaders for a service with Prisma
 *
 * Example usage:
 * ```typescript
 * // In your service module
 * import { createCommonDataLoaders } from '@aivo/ts-api-utils';
 *
 * @Injectable()
 * export class MyService {
 *   private loaders: ReturnType<typeof createCommonDataLoaders>;
 *
 *   constructor(private readonly prisma: PrismaService) {
 *     this.loaders = createCommonDataLoaders(prisma, 'tenant-123');
 *   }
 *
 *   async getUsersWithStudents(userIds: string[]) {
 *     // Batched automatically - no N+1 queries!
 *     const users = await this.loaders.userById.loadMany(userIds);
 *     return users;
 *   }
 * }
 * ```
 */
export function createCommonDataLoaders(
  prisma: {
    user?: { findMany: (args: any) => Promise<UserEntity[]> };
    student?: { findMany: (args: any) => Promise<StudentEntity[]> };
    learner?: { findMany: (args: any) => Promise<StudentEntity[]> };
  },
  tenantId?: string,
  config: DataLoaderConfig = {}
): Partial<CommonDataLoaders> {
  const loaders: Partial<CommonDataLoaders> = {};

  // User loader
  if (prisma.user) {
    loaders.userById = createDataLoader<string, UserEntity>(
      async (ids) => {
        const whereClause: any = { id: { in: ids } };
        if (tenantId) whereClause.tenantId = tenantId;

        const users = await prisma.user!.findMany({ where: whereClause });
        const userMap = new Map(users.map((u) => [u.id, u]));
        return ids.map((id) => userMap.get(id) ?? null);
      },
      {
        name: 'UserByIdLoader',
        maxBatchSize: config.maxBatchSize ?? 100,
        cacheMap: config.lruCacheSize
          ? new LRUCache(config.lruCacheSize)
          : config.ttlMs
            ? new TTLCache(config.ttlMs)
            : undefined,
      }
    );
  }

  // Student/Learner loader
  const studentModel = prisma.student ?? prisma.learner;
  if (studentModel) {
    loaders.studentById = createDataLoader<string, StudentEntity>(
      async (ids) => {
        const whereClause: any = { id: { in: ids } };
        if (tenantId) whereClause.tenantId = tenantId;

        const students = await studentModel!.findMany({ where: whereClause });
        const studentMap = new Map(students.map((s) => [s.id, s]));
        return ids.map((id) => studentMap.get(id) ?? null);
      },
      {
        name: 'StudentByIdLoader',
        maxBatchSize: config.maxBatchSize ?? 100,
        cacheMap: config.lruCacheSize
          ? new LRUCache(config.lruCacheSize)
          : config.ttlMs
            ? new TTLCache(config.ttlMs)
            : undefined,
      }
    );
  }

  return loaders;
}

// ══════════════════════════════════════════════════════════════════════════════
// FASTIFY INTEGRATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fastify plugin declaration for TypeScript
 */
declare module 'fastify' {
  interface FastifyRequest {
    loaders?: Partial<CommonDataLoaders>;
  }
}

/**
 * Create a Fastify plugin to inject DataLoaders into requests
 *
 * Usage:
 * ```typescript
 * import Fastify from 'fastify';
 * import { createDataLoaderPlugin } from '@aivo/ts-api-utils';
 *
 * const app = Fastify();
 * app.register(createDataLoaderPlugin(prisma));
 *
 * // In your routes
 * app.get('/users/:id', async (request) => {
 *   const user = await request.loaders?.userById?.load(request.params.id);
 *   return user;
 * });
 * ```
 */
export function createDataLoaderPlugin(
  prisma: {
    user?: { findMany: (args: any) => Promise<UserEntity[]> };
    student?: { findMany: (args: any) => Promise<StudentEntity[]> };
    learner?: { findMany: (args: any) => Promise<StudentEntity[]> };
  },
  config: DataLoaderConfig = {}
) {
  return async function dataLoaderPlugin(fastify: any) {
    fastify.addHook('preHandler', async (request: any) => {
      // Extract tenant ID from request if available
      const tenantId =
        request.user?.tenantId ?? request.headers['x-tenant-id'] ?? undefined;

      // Create fresh loaders for each request
      request.loaders = createCommonDataLoaders(prisma, tenantId, config);
    });
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export {
  createDataLoader,
  createIdLoader,
  createRelationLoader,
  DataLoader,
  DataLoaderOptions,
  LRUCache,
  TTLCache,
} from './dataloader.js';
