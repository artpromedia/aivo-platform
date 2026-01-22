/**
 * Extended Prisma Client Types for Ed-Fi Service
 * These types extend the base PrismaClient with Ed-Fi specific models.
 *
 * NOTE: This is a build-compatibility layer. The actual Prisma models
 * are defined in the schema.prisma file and generated via prisma generate.
 */

import type { PrismaClient as BasePrismaClient } from '@prisma/client';

// Model delegate types that match Prisma's API
interface ModelDelegate {
  findUnique: (args: any) => Promise<any>;
  findFirst: (args: any) => Promise<any>;
  findMany: (args?: any) => Promise<any[]>;
  create: (args: any) => Promise<any>;
  createMany: (args: any) => Promise<{ count: number }>;
  update: (args: any) => Promise<any>;
  updateMany: (args: any) => Promise<{ count: number }>;
  upsert: (args: any) => Promise<any>;
  delete: (args: any) => Promise<any>;
  deleteMany: (args?: any) => Promise<{ count: number }>;
  count: (args?: any) => Promise<number>;
  aggregate: (args: any) => Promise<any>;
  groupBy: (args: any) => Promise<any[]>;
}

// Extended PrismaClient type with Ed-Fi models
export interface ExtendedPrismaClient extends Omit<BasePrismaClient, '$transaction'> {
  // Configuration
  edfiConfig: ModelDelegate;
  edfiFieldMapping: ModelDelegate;

  // Export tracking
  edfiExportRun: ModelDelegate;
  edfiSubmission: ModelDelegate;

  // Sync tracking
  edfiSyncCursor: ModelDelegate;
  edfiTokenCache: ModelDelegate;

  // Validation and Audit
  edfiValidationError: ModelDelegate;
  edfiAuditLog: ModelDelegate;

  // Override $transaction to support array pattern
  $transaction: <T>(arg: Promise<T>[] | ((prisma: any) => Promise<T>), options?: any) => Promise<T[] | T>;
}

// Export extended prisma client factory
export function createExtendedPrismaClient(basePrisma: BasePrismaClient): ExtendedPrismaClient {
  return basePrisma as unknown as ExtendedPrismaClient;
}
