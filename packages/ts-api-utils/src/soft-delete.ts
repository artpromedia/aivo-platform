/**
 * Prisma Soft Delete Middleware
 *
 * Provides middleware for automatic soft delete filtering across all queries.
 * This ensures that deleted records are never returned unless explicitly requested.
 *
 * GDPR Article 17 Compliance:
 * - Soft delete allows data to be "deleted" for users while maintaining audit trails
 * - Data can be permanently purged after retention period
 * - Users can request data restoration within retention window
 *
 * @module soft-delete-middleware
 */

/**
 * Prisma middleware params (compatible with Prisma's internal type)
 */
interface MiddlewareParams {
  model?: string;
  action: string;
  args: Record<string, unknown>;
  dataPath: string[];
  runInTransaction: boolean;
}

/**
 * Prisma middleware function type
 */
type PrismaMiddleware = (
  params: MiddlewareParams,
  next: (params: MiddlewareParams) => Promise<unknown>
) => Promise<unknown>;

/**
 * Models that support soft delete (have deletedAt field)
 * Add model names as they gain soft delete support
 */
export const SOFT_DELETE_MODELS = new Set([
  // Session service
  'Session',
  // Learner model service
  'VirtualBrain',
  // Assessment service
  'Assessment',
  'Attempt',
  'QuestionResponse',
  // Goal service
  'Goal',
  'GoalObjective',
  'SessionPlan',
  'ProgressNote',
  // Gamification service
  'PlayerProfile',
  'XPTransaction',
  'EarnedAchievement',
]);

/**
 * Check if a model supports soft delete
 */
export function supportsSoftDelete(model: string): boolean {
  return SOFT_DELETE_MODELS.has(model);
}

/**
 * Context key to bypass soft delete filtering
 * Use: prisma.$extends({ query: { $allModels: { findMany: ({ args, query }) => { args.where = { ...args.where, includeDeleted: true }; return query(args); } } } })
 */
export const INCLUDE_DELETED_KEY = 'includeDeleted';

/**
 * Read actions that should filter out soft-deleted records
 */
const READ_ACTIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
]);

/**
 * Apply soft delete filter to where clause
 * Adds deletedAt: null if not already specified
 */
function applySoftDeleteFilter(
  args: Record<string, unknown>,
  where: Record<string, unknown> | undefined
): void {
  if (where) {
    if (where.deletedAt === undefined) {
      where['deletedAt'] = null;
    }
  } else {
    args['where'] = { deletedAt: null };
  }
}

/**
 * Check and remove the includeDeleted flag from where clause
 * Returns true if includeDeleted was set
 */
function checkAndRemoveIncludeDeleted(where: Record<string, unknown> | undefined): boolean {
  if (!where) return false;
  const includeDeleted = where[INCLUDE_DELETED_KEY];
  if (includeDeleted) {
    delete where[INCLUDE_DELETED_KEY];
    return true;
  }
  return false;
}

/**
 * Handle delete operations by converting to soft delete
 */
function handleDeleteOperation(
  params: MiddlewareParams,
  args: Record<string, unknown>
): void {
  if (params.action === 'delete') {
    params.action = 'update';
    args['data'] = { deletedAt: new Date() };
  } else if (params.action === 'deleteMany') {
    params.action = 'updateMany';
    const existingData = args.data;
    if (existingData && typeof existingData === 'object') {
      (existingData as Record<string, unknown>)['deletedAt'] = new Date();
    } else {
      args['data'] = { deletedAt: new Date() };
    }
  }
}

/**
 * Create Prisma middleware for soft delete filtering
 *
 * This middleware:
 * 1. Converts delete operations to soft delete (update with deletedAt)
 * 2. Filters out soft-deleted records from all queries
 * 3. Allows bypass with includeDeleted: true in where clause
 *
 * @example
 * ```typescript
 * import { PrismaClient } from '@prisma/client';
 * import { createSoftDeleteMiddleware } from '@aivo/ts-api-utils';
 *
 * const prisma = new PrismaClient();
 * prisma.$use(createSoftDeleteMiddleware());
 * ```
 */
export function createSoftDeleteMiddleware(): PrismaMiddleware {
  return async (params: MiddlewareParams, next: (params: MiddlewareParams) => Promise<unknown>) => {
    const model = params.model;

    // Only apply to models that support soft delete
    if (!model || !supportsSoftDelete(model)) {
      return next(params);
    }

    const args = params.args;

    // Handle DELETE operations - convert to soft delete
    if (params.action === 'delete' || params.action === 'deleteMany') {
      handleDeleteOperation(params, args);
      return next(params);
    }

    const where = args.where as Record<string, unknown> | undefined;

    // Handle READ operations - filter out deleted records
    if (READ_ACTIONS.has(params.action)) {
      if (checkAndRemoveIncludeDeleted(where)) {
        return next(params);
      }
      applySoftDeleteFilter(args, where);
    }

    // Handle UPDATE operations - ensure we're not updating deleted records
    if (params.action === 'update' || params.action === 'updateMany') {
      if (!checkAndRemoveIncludeDeleted(where)) {
        applySoftDeleteFilter(args, where);
      }
    }

    return next(params);
  };
}

/**
 * Soft delete a record by setting deletedAt to current timestamp
 *
 * @param prisma - Prisma client instance
 * @param model - Model name (e.g., 'User', 'Session')
 * @param where - Where clause to identify record
 * @returns Promise resolving to updated record
 */
export async function softDelete<T>(
  prisma: { [key: string]: { update: (args: { where: object; data: object }) => Promise<T> } },
  model: string,
  where: object
): Promise<T> {
  const modelClient = prisma[model.charAt(0).toLowerCase() + model.slice(1)];
  if (!modelClient) {
    throw new Error(`Model ${model} not found on Prisma client`);
  }

  return modelClient.update({
    where,
    data: { deletedAt: new Date() },
  });
}

/**
 * Restore a soft-deleted record by setting deletedAt to null
 *
 * @param prisma - Prisma client instance
 * @param model - Model name
 * @param where - Where clause to identify record
 * @returns Promise resolving to restored record
 */
export async function restoreSoftDelete<T>(
  prisma: { [key: string]: { update: (args: { where: object; data: object }) => Promise<T> } },
  model: string,
  where: object
): Promise<T> {
  const modelClient = prisma[model.charAt(0).toLowerCase() + model.slice(1)];
  if (!modelClient) {
    throw new Error(`Model ${model} not found on Prisma client`);
  }

  return modelClient.update({
    where: { ...where, [INCLUDE_DELETED_KEY]: true },
    data: { deletedAt: null },
  });
}

/**
 * Permanently delete soft-deleted records older than retention period
 *
 * GDPR Note: After the retention period (typically 30-90 days),
 * soft-deleted records should be permanently purged.
 *
 * @param prisma - Prisma client instance
 * @param model - Model name
 * @param retentionDays - Days after soft delete before permanent deletion
 * @returns Promise resolving to count of purged records
 */
export async function purgeSoftDeleted(
  prisma: { [key: string]: { deleteMany: (args: { where: object }) => Promise<{ count: number }> } },
  model: string,
  retentionDays: number = 90
): Promise<number> {
  const modelClient = prisma[model.charAt(0).toLowerCase() + model.slice(1)];
  if (!modelClient) {
    throw new Error(`Model ${model} not found on Prisma client`);
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  // Use raw deleteMany to bypass soft delete middleware
  const result = await modelClient.deleteMany({
    where: {
      deletedAt: {
        not: null,
        lt: cutoffDate,
      },
    },
  });

  return result.count;
}

/**
 * Get count of soft-deleted records pending permanent deletion
 */
export async function countPendingPurge(
  prisma: { [key: string]: { count: (args: { where: object }) => Promise<number> } },
  model: string,
  retentionDays: number = 90
): Promise<number> {
  const modelClient = prisma[model.charAt(0).toLowerCase() + model.slice(1)];
  if (!modelClient) {
    throw new Error(`Model ${model} not found on Prisma client`);
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  return modelClient.count({
    where: {
      deletedAt: {
        not: null,
        lt: cutoffDate,
      },
      [INCLUDE_DELETED_KEY]: true,
    },
  });
}
