/**
 * Prisma client singleton for baseline-svc
 */

import { PrismaClient } from '../generated/prisma-client/index.js';

export { Prisma } from '../generated/prisma-client/index.js';

import { config } from './config.js';

export const prisma = new PrismaClient({
  datasources: { db: { url: config.databaseUrl } },
});

// Re-export enums
export {
  BaselineDomain,
  GradeBand,
  BaselineStatus,
  RetestReasonType,
  IepDocumentStatus,
  IepComparisonDecision,
  ParentAssessmentStatus,
  AssessmentType,
} from '../generated/prisma-client/index.js';

// Re-export PrismaClient type
export type { PrismaClient } from '../generated/prisma-client/index.js';
