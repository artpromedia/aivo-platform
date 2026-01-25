/**
 * AIVO Compliance Service - Prisma Client
 */

import { PrismaClient, Prisma } from '../generated/prisma-client/index.js';

// Re-export Prisma namespace for types
export { Prisma };

// Re-export PrismaClient type
export type { PrismaClient };

// Re-export all enums from schema
export {
  Framework,
  ControlStatus,
  AssessmentStatus,
  FindingSeverity,
  FindingStatus,
  EvidenceType,
  EvidenceStatus,
  RemediationPriority,
  RemediationStatus,
} from '../generated/prisma-client/index.js';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
});
