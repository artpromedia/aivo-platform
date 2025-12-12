/**
 * Tenant-Scoped Prisma Client Extension
 *
 * This module provides a Prisma client extension that automatically filters
 * all queries by tenantId to ensure complete data isolation between tenants.
 *
 * CRITICAL: Zero data leakage between tenants. A teacher in District A must
 * never see learner data from District B.
 *
 * @module @aivo/ts-data-access/tenant-scoped-client
 */

// Note: We use 'any' for PrismaClient type to avoid requiring @prisma/client
// as a direct dependency. Services will import their own generated client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClientLike = any;

/**
 * Models that require tenant scoping
 * These are models that have a tenantId field in the schema.
 * All names are lowercase for case-insensitive matching.
 */
export const TENANT_SCOPED_MODELS = [
  'user',
  'learner',
  'brainprofile',
  'session',
  'notification',
  'difficultyproposal',
  'curriculumtopic',
  'contentitem',
  'roleassignment',
  'telemetryevent',
  'experiment',
  'feedback',
  'auditlogentry',
  'safetyincident',
  'school',
  'goal',
  'goalprogress',
  'lessonplan',
  'teacherassignment',
  'sessionevent',
  'activityresponse',
] as const;

export type TenantScopedModel = (typeof TENANT_SCOPED_MODELS)[number];

/**
 * Set of tenant-scoped models for O(1) lookup
 */
const TENANT_SCOPED_MODEL_SET = new Set<string>(TENANT_SCOPED_MODELS);

/**
 * Check if a model requires tenant scoping
 */
export function isTenantScopedModel(modelName: string): boolean {
  return TENANT_SCOPED_MODEL_SET.has(modelName.toLowerCase());
}

/**
 * Error thrown when cross-tenant access is attempted
 */
export class CrossTenantAccessError extends Error {
  constructor(
    public readonly attemptedTenantId: string | undefined,
    public readonly scopedTenantId: string,
    public readonly operation: string,
    public readonly model: string
  ) {
    super(
      `Cross-tenant access denied: attempted to access tenant '${attemptedTenantId}' ` +
        `but scoped to tenant '${scopedTenantId}' during ${operation} on ${model}`
    );
    this.name = 'CrossTenantAccessError';
  }
}

/**
 * Error thrown when raw SQL is attempted on a tenant-scoped client
 */
export class RawQueryBlockedError extends Error {
  constructor(public readonly scopedTenantId: string) {
    super(
      `Raw SQL queries are blocked on tenant-scoped clients. ` +
        `Use parameterized queries with explicit tenant filtering or the base client for system operations.`
    );
    this.name = 'RawQueryBlockedError';
  }
}

/**
 * Cross-tenant access log entry
 */
export interface CrossTenantAccessLogEntry {
  timestamp: Date;
  scopedTenantId: string;
  attemptedTenantId: string | undefined;
  operation: string;
  model: string;
  stackTrace?: string | undefined;
}

/**
 * Logger interface for cross-tenant access attempts
 */
export interface TenantScopeLogger {
  logCrossTenantAccess(entry: CrossTenantAccessLogEntry): void;
  logQuery(tenantId: string, model: string, operation: string, durationMs: number): void;
}

/**
 * Default logger that outputs to console
 */
export const defaultTenantScopeLogger: TenantScopeLogger = {
  logCrossTenantAccess(entry: CrossTenantAccessLogEntry): void {
    console.error('[SECURITY] Cross-tenant access attempt:', {
      ...entry,
      timestamp: entry.timestamp.toISOString(),
    });
  },
  logQuery(tenantId: string, model: string, operation: string, durationMs: number): void {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_TENANT_QUERIES) {
      console.debug(`[TENANT:${tenantId}] ${operation} on ${model} took ${durationMs}ms`);
    }
  },
};

/**
 * Options for creating a tenant-scoped client
 */
export interface TenantScopedClientOptions {
  /**
   * The tenant ID to scope all queries to
   */
  tenantId: string;
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
   * If false, will silently filter to the scoped tenant
   */
  throwOnCrossTenantAccess?: boolean;
}

/**
 * Extracts tenantId from a where clause if present
 */
function extractTenantIdFromWhere(where: unknown): string | undefined {
  if (!where || typeof where !== 'object') return undefined;
  const w = where as Record<string, unknown>;
  if (typeof w.tenantId === 'string') return w.tenantId;
  if (w.tenantId && typeof w.tenantId === 'object') {
    const tid = w.tenantId as Record<string, unknown>;
    if (typeof tid.equals === 'string') return tid.equals;
  }
  return undefined;
}

/**
 * Validates that a where clause doesn't try to override the tenant scope
 */
function validateTenantScope(
  where: unknown,
  scopedTenantId: string,
  operation: string,
  model: string,
  options: TenantScopedClientOptions,
  logger: TenantScopeLogger
): void {
  const attemptedTenantId = extractTenantIdFromWhere(where);

  if (attemptedTenantId !== undefined && attemptedTenantId !== scopedTenantId) {
    logger.logCrossTenantAccess({
      timestamp: new Date(),
      scopedTenantId,
      attemptedTenantId,
      operation,
      model,
      stackTrace: new Error().stack,
    });

    if (options.throwOnCrossTenantAccess !== false) {
      throw new CrossTenantAccessError(attemptedTenantId, scopedTenantId, operation, model);
    }
  }
}

/**
 * Adds tenantId to a where clause
 */
function addTenantToWhere(
  where: Record<string, unknown> | undefined,
  tenantId: string
): Record<string, unknown> {
  return {
    ...where,
    tenantId,
  };
}

/**
 * Adds tenantId to data for create operations
 */
function addTenantToData(
  data: Record<string, unknown> | undefined,
  tenantId: string
): Record<string, unknown> {
  return {
    ...data,
    tenantId,
  };
}

/**
 * Adds tenantId to an array of data items for createMany
 */
function addTenantToDataArray(
  data: Record<string, unknown>[] | undefined,
  tenantId: string
): Record<string, unknown>[] {
  if (!data) return [];
  return data.map((item) => addTenantToData(item, tenantId));
}

type PrismaOperation =
  | 'findUnique'
  | 'findUniqueOrThrow'
  | 'findFirst'
  | 'findFirstOrThrow'
  | 'findMany'
  | 'create'
  | 'createMany'
  | 'createManyAndReturn'
  | 'update'
  | 'updateMany'
  | 'upsert'
  | 'delete'
  | 'deleteMany'
  | 'aggregate'
  | 'count'
  | 'groupBy';

/**
 * Creates a tenant-scoped Prisma client that automatically
 * filters all queries by the provided tenantId.
 *
 * @param basePrisma - The base Prisma client instance
 * @param options - Configuration options for tenant scoping
 * @returns A Prisma client with automatic tenant filtering
 *
 * @example
 * ```typescript
 * const tenantPrisma = createTenantScopedClient(prisma, {
 *   tenantId: 'tenant-123',
 *   logger: customLogger,
 * });
 *
 * // This automatically filters by tenantId
 * const users = await tenantPrisma.user.findMany();
 * ```
 */
export function createTenantScopedClient<T extends PrismaClientLike>(
  basePrisma: T,
  options: TenantScopedClientOptions
): T {
  const { tenantId, blockRawQueries = true } = options;
  const logger = options.logger ?? defaultTenantScopeLogger;

  // Validate tenantId
  if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
    throw new Error('tenantId is required and must be a non-empty string');
  }

  // Cast to any to work with Prisma's $extends API
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaAny = basePrisma as any;

  return prismaAny.$extends({
    name: 'tenantScope',

    query: {
      $allModels: {
        async $allOperations({
          model,
          operation,
          args,
          query,
        }: {
          model: string;
          operation: string;
          args: Record<string, unknown>;
          query: (args: Record<string, unknown>) => Promise<unknown>;
        }) {
          const startTime = performance.now();
          const modelLower = model.toLowerCase();

          // Skip tenant scoping for non-tenant models
          if (!isTenantScopedModel(modelLower)) {
            return query(args);
          }

          const typedArgs = args as Record<string, unknown>;
          const op = operation as PrismaOperation;

          // Handle different operations
          switch (op) {
            case 'findUnique':
            case 'findUniqueOrThrow': {
              // For unique queries, we need to add tenant filter
              validateTenantScope(typedArgs.where, tenantId, op, model, options, logger);
              typedArgs.where = addTenantToWhere(
                typedArgs.where as Record<string, unknown>,
                tenantId
              );
              break;
            }

            case 'findFirst':
            case 'findFirstOrThrow':
            case 'findMany':
            case 'count':
            case 'aggregate':
            case 'groupBy': {
              // For read operations, filter by tenant
              validateTenantScope(typedArgs.where, tenantId, op, model, options, logger);
              typedArgs.where = addTenantToWhere(
                typedArgs.where as Record<string, unknown>,
                tenantId
              );
              break;
            }

            case 'create': {
              // For create, inject tenantId into data
              const data = typedArgs.data as Record<string, unknown>;
              if (data?.tenantId && data.tenantId !== tenantId) {
                logger.logCrossTenantAccess({
                  timestamp: new Date(),
                  scopedTenantId: tenantId,
                  attemptedTenantId: data.tenantId as string,
                  operation: op,
                  model,
                  stackTrace: new Error().stack,
                });
                if (options.throwOnCrossTenantAccess !== false) {
                  throw new CrossTenantAccessError(
                    data.tenantId as string,
                    tenantId,
                    op,
                    model
                  );
                }
              }
              typedArgs.data = addTenantToData(data, tenantId);
              break;
            }

            case 'createMany':
            case 'createManyAndReturn': {
              // For createMany, inject tenantId into all data items
              const dataArray = typedArgs.data as Record<string, unknown>[];
              for (const item of dataArray || []) {
                if (item.tenantId && item.tenantId !== tenantId) {
                  logger.logCrossTenantAccess({
                    timestamp: new Date(),
                    scopedTenantId: tenantId,
                    attemptedTenantId: item.tenantId as string,
                    operation: op,
                    model,
                    stackTrace: new Error().stack,
                  });
                  if (options.throwOnCrossTenantAccess !== false) {
                    throw new CrossTenantAccessError(
                      item.tenantId as string,
                      tenantId,
                      op,
                      model
                    );
                  }
                }
              }
              typedArgs.data = addTenantToDataArray(dataArray, tenantId);
              break;
            }

            case 'update': {
              // For update, filter where by tenant and prevent tenant change
              validateTenantScope(typedArgs.where, tenantId, op, model, options, logger);
              typedArgs.where = addTenantToWhere(
                typedArgs.where as Record<string, unknown>,
                tenantId
              );
              // Prevent changing tenantId in update data
              const updateData = typedArgs.data as Record<string, unknown>;
              if (updateData?.tenantId && updateData.tenantId !== tenantId) {
                throw new CrossTenantAccessError(
                  updateData.tenantId as string,
                  tenantId,
                  'update (data)',
                  model
                );
              }
              // Remove tenantId from update data to prevent accidental changes
              if (updateData?.tenantId) {
                delete updateData.tenantId;
              }
              break;
            }

            case 'updateMany': {
              // For updateMany, filter where by tenant and prevent tenant change
              validateTenantScope(typedArgs.where, tenantId, op, model, options, logger);
              typedArgs.where = addTenantToWhere(
                typedArgs.where as Record<string, unknown>,
                tenantId
              );
              // Prevent changing tenantId in update data
              const updateManyData = typedArgs.data as Record<string, unknown>;
              if (updateManyData?.tenantId) {
                throw new Error(
                  'Cannot modify tenantId in updateMany operation. This is a security violation.'
                );
              }
              break;
            }

            case 'upsert': {
              // For upsert, handle both create and update paths
              validateTenantScope(typedArgs.where, tenantId, op, model, options, logger);
              typedArgs.where = addTenantToWhere(
                typedArgs.where as Record<string, unknown>,
                tenantId
              );
              // Add tenant to create data
              if (typedArgs.create) {
                typedArgs.create = addTenantToData(
                  typedArgs.create as Record<string, unknown>,
                  tenantId
                );
              }
              // Prevent tenant change in update data
              const upsertUpdateData = typedArgs.update as Record<string, unknown>;
              if (upsertUpdateData?.tenantId) {
                delete upsertUpdateData.tenantId;
              }
              break;
            }

            case 'delete':
            case 'deleteMany': {
              // For delete operations, filter by tenant
              validateTenantScope(typedArgs.where, tenantId, op, model, options, logger);
              typedArgs.where = addTenantToWhere(
                typedArgs.where as Record<string, unknown>,
                tenantId
              );
              break;
            }
          }

          try {
            const result = await query(args);
            const durationMs = performance.now() - startTime;
            logger.logQuery(tenantId, model, op, durationMs);
            return result;
          } catch (error) {
            const durationMs = performance.now() - startTime;
            logger.logQuery(tenantId, model, `${op}:error`, durationMs);
            throw error;
          }
        },
      },
    },

    client: {
      // Block raw queries if configured
      $queryRaw(..._args: unknown[]) {
        if (blockRawQueries) {
          throw new RawQueryBlockedError(tenantId);
        }
        // Fallback to original (shouldn't reach here with default config)
        return (prismaAny.$queryRaw as Function).apply(prismaAny, arguments);
      },
      $queryRawUnsafe(..._args: unknown[]) {
        if (blockRawQueries) {
          throw new RawQueryBlockedError(tenantId);
        }
        return (prismaAny.$queryRawUnsafe as Function).apply(prismaAny, arguments);
      },
      $executeRaw(..._args: unknown[]) {
        if (blockRawQueries) {
          throw new RawQueryBlockedError(tenantId);
        }
        return (prismaAny.$executeRaw as Function).apply(prismaAny, arguments);
      },
      $executeRawUnsafe(..._args: unknown[]) {
        if (blockRawQueries) {
          throw new RawQueryBlockedError(tenantId);
        }
        return (prismaAny.$executeRawUnsafe as Function).apply(prismaAny, arguments);
      },

      /**
       * Get the tenant ID this client is scoped to
       */
      $getTenantId(): string {
        return tenantId;
      },
    },
  }) as unknown as T;
}

/**
 * Type-safe extension of PrismaClient with tenant scope methods
 */
export type TenantScopedPrismaClient<T extends PrismaClientLike = PrismaClientLike> = T & {
  $getTenantId(): string;
};

/**
 * Cache for tenant-scoped clients to avoid recreating extensions
 * Uses WeakMap to allow garbage collection of base clients
 */
const clientCache = new WeakMap<PrismaClientLike, Map<string, PrismaClientLike>>();

/**
 * Gets or creates a cached tenant-scoped client
 *
 * @param basePrisma - The base Prisma client
 * @param options - Tenant scope options
 * @returns Cached or new tenant-scoped client
 */
export function getCachedTenantClient<T extends PrismaClientLike>(
  basePrisma: T,
  options: TenantScopedClientOptions
): T {
  let tenantMap = clientCache.get(basePrisma);

  if (!tenantMap) {
    tenantMap = new Map();
    clientCache.set(basePrisma, tenantMap);
  }

  const cacheKey = `${options.tenantId}-${options.blockRawQueries ?? true}`;
  let client = tenantMap.get(cacheKey);

  if (!client) {
    client = createTenantScopedClient(basePrisma, options);
    tenantMap.set(cacheKey, client);
  }

  return client as T;
}
