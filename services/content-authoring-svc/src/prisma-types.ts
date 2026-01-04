/**
 * Extended Prisma Client Types for Content Authoring Service
 * These types extend the base PrismaClient with content authoring-specific models
 * for learning objects, versions, translations, and QA checks.
 * 
 * NOTE: This is a build-compatibility layer. The actual Prisma models
 * should be defined in the schema.prisma file and generated via prisma generate.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { PrismaClient as BasePrismaClient } from '@prisma/client';

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

// Transaction client type (available inside $transaction callback)
export interface TransactionClient {
  learningObject: ModelDelegate;
  learningObjectVersion: ModelDelegate;
  learningObjectVersionCheck: ModelDelegate;
  learningObjectVersionReviewNote: ModelDelegate;
  learningObjectVersionTransition: ModelDelegate;
  learningObjectTag: ModelDelegate;
  learningObjectSkill: ModelDelegate;
  learningObjectTranslation: ModelDelegate;
  // Include other base prisma methods that are available in transaction
  $queryRaw: BasePrismaClient['$queryRaw'];
  $executeRaw: BasePrismaClient['$executeRaw'];
  $queryRawUnsafe: BasePrismaClient['$queryRawUnsafe'];
  $executeRawUnsafe: BasePrismaClient['$executeRawUnsafe'];
}

// Extended PrismaClient type with content authoring models
export interface ExtendedPrismaClient extends Omit<BasePrismaClient, '$transaction'> {
  learningObject: ModelDelegate;
  learningObjectVersion: ModelDelegate;
  learningObjectVersionCheck: ModelDelegate;
  learningObjectVersionReviewNote: ModelDelegate;
  learningObjectVersionTransition: ModelDelegate;
  learningObjectTag: ModelDelegate;
  learningObjectSkill: ModelDelegate;
  learningObjectTranslation: ModelDelegate;
  // Override $transaction to use our TransactionClient
  $transaction: {
    // Callback-style transaction (returns the callback result directly)
    <R>(fn: (tx: TransactionClient) => Promise<R>, options?: any): Promise<R>;
    // Array-style transaction (returns array of results)
    <T>(arg: Promise<T>[], options?: any): Promise<T[]>;
  };
}

// Export extended prisma client
export const prisma = new BasePrismaClient() as unknown as ExtendedPrismaClient;
