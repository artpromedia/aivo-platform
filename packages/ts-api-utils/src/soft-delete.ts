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

import type { Prisma } from '@prisma/client';

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
export function createSoftDeleteMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    const model = params.model;

    // Only apply to models that support soft delete
    if (!model || !supportsSoftDelete(model)) {
      return next(params);
    }

    // Handle DELETE operations - convert to soft delete
    if (params.action === 'delete') {
      params.action = 'update';
      params.args['data'] = { deletedAt: new Date() };
      return next(params);
    }

    if (params.action === 'deleteMany') {
      params.action = 'updateMany';
      if (params.args.data !== undefined) {
        params.args.data['deletedAt'] = new Date();
      } else {
        params.args['data'] = { deletedAt: new Date() };
      }
      return next(params);
    }

    // Handle READ operations - filter out deleted records
    const readActions = [
      'findUnique',
      'findUniqueOrThrow',
      'findFirst',
      'findFirstOrThrow',
      'findMany',
      'count',
      'aggregate',
      'groupBy',
    ];

    if (readActions.includes(params.action)) {
      // Check if we should include deleted records
      const includeDeleted = params.args?.where?.[INCLUDE_DELETED_KEY];

      if (includeDeleted) {
        // Remove the special key and don't filter
        delete params.args.where[INCLUDE_DELETED_KEY];
        return next(params);
      }

      // Add deletedAt: null filter
      if (params.args.where) {
        if (params.args.where.deletedAt === undefined) {
          params.args.where['deletedAt'] = null;
        }
      } else {
        params.args['where'] = { deletedAt: null };
      }
    }

    // Handle UPDATE operations - ensure we're not updating deleted records
    if (params.action === 'update' || params.action === 'updateMany') {
      const includeDeleted = params.args?.where?.[INCLUDE_DELETED_KEY];

      if (!includeDeleted) {
        if (params.args.where) {
          if (params.args.where.deletedAt === undefined) {
            params.args.where['deletedAt'] = null;
          }
        } else {
          params.args['where'] = { deletedAt: null };
        }
      } else {
        delete params.args.where[INCLUDE_DELETED_KEY];
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
