/**
 * Prisma Client Instance
 *
 * Singleton instance for database access.
 */

import { PrismaClient, Prisma } from '../generated/prisma-client/index.js';

export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['warn', 'error'],
});

// Helper to cast Record<string, unknown> to Prisma's InputJsonValue
export function toJsonValue(value: Record<string, unknown> | undefined | null): Prisma.InputJsonValue | undefined {
  return value as unknown as Prisma.InputJsonValue | undefined;
}

export type { Goal, GoalObjective, SessionPlan, SessionPlanItem, ProgressNote } from '../generated/prisma-client/index.js';
export { GoalDomain, GoalStatus, ObjectiveStatus, SessionPlanType, SessionPlanStatus } from '../generated/prisma-client/index.js';
export { Prisma };
