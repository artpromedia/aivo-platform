/**
 * Prisma Client Instance
 *
 * Singleton instance for database access.
 */

import { PrismaClient } from '../generated/prisma-client/index.js';

export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['warn', 'error'],
});

export type { Goal, GoalObjective, SessionPlan, SessionPlanItem, ProgressNote } from '../generated/prisma-client/index.js';
export { GoalDomain, GoalStatus, ObjectiveStatus, SessionPlanType, SessionPlanStatus } from '../generated/prisma-client/index.js';
