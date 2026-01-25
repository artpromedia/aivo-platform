import {
  PrismaClient,
  Prisma,
  GoalDomain,
  GoalStatus,
  ObjectiveStatus,
  SessionPlanType,
  SessionPlanStatus,
  Visibility,
} from '../generated/prisma-client/index.js';

import { config } from './config.js';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: config.databaseUrl,
    },
  },
});

// Re-export Prisma namespace and enums for use in other files
export { Prisma };
export { GoalDomain, GoalStatus, ObjectiveStatus, SessionPlanType, SessionPlanStatus, Visibility };
