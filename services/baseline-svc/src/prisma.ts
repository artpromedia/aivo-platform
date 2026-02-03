/**
 * Prisma client singleton for baseline-svc
 */

import { PrismaClient, Prisma } from '../generated/prisma-client/index.js';

export { Prisma } from '../generated/prisma-client/index.js';

import { config } from './config.js';

export const prisma = new PrismaClient({
  datasources: { db: { url: config.databaseUrl } },
});

export function toJsonValue(value: unknown): Prisma.InputJsonValue | Prisma.JsonNull {
  if (value === null || value === undefined) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

export function toJsonValueOptional(
  value: unknown
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
}

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
