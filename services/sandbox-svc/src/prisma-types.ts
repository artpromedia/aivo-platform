/**
 * Extended Prisma Client Types for Sandbox Service
 * These types extend the base PrismaClient with sandbox-specific models
 * that are used for synthetic data generation and partner management.
 * 
 * NOTE: This is a build-compatibility layer. The actual Prisma models
 * should be defined in the schema.prisma file and generated via prisma generate.
 */

import { PrismaClient as BasePrismaClient } from '@prisma/client';

// Use `any` for model types to allow flexibility with actual Prisma-generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyModel = any;

// Model delegate types that match Prisma's API
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// Extended PrismaClient type with sandbox models
export interface ExtendedPrismaClient extends Omit<BasePrismaClient, '$transaction'> {
  sandboxAdmin: ModelDelegate;
  sandboxTenant: ModelDelegate;
  partner: ModelDelegate;
  sandboxSyntheticTeacher: ModelDelegate;
  sandboxSyntheticClass: ModelDelegate;
  sandboxSyntheticLearner: ModelDelegate;
  sandboxSyntheticEnrollment: ModelDelegate;
  sandboxSyntheticSession: ModelDelegate;
  sandboxSyntheticLearnerProgress: ModelDelegate;
  sandboxApiKey: ModelDelegate;
  sandboxApiUsageLog: ModelDelegate;
  sandboxWebhookEndpoint: ModelDelegate;
  sandboxWebhookDelivery: ModelDelegate;
  adminSession: ModelDelegate;
  adminAuditLog: ModelDelegate;
  adminLoginAttempt: ModelDelegate;
  adminPasswordHistory: ModelDelegate;
  // Override $transaction to support array pattern
  $transaction: <T>(arg: Promise<T>[] | ((prisma: any) => Promise<T>), options?: any) => Promise<T[]>;
}

// Export extended prisma client
export const prisma = new BasePrismaClient() as unknown as ExtendedPrismaClient;
