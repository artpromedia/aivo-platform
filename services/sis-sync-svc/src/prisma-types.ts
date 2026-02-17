/**
 * Extended Prisma types for sis-sync-svc
 * 
 * This file provides type stubs for Prisma models that are defined in the schema
 * but may not be present in the generated client during development.
 * 
 * These types allow TypeScript compilation to succeed while the actual
 * Prisma client is generated with the real model implementations.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { PrismaClient as BasePrismaClient } from '../generated/prisma-client/index.js';

/**
 * Generic model delegate interface for CRUD operations
 */
export interface ModelDelegate<T = any> {
  findUnique: (args: any) => Promise<T | null>;
  findUniqueOrThrow: (args: any) => Promise<T>;
  findFirst: (args: any) => Promise<T | null>;
  findFirstOrThrow: (args: any) => Promise<T>;
  findMany: (args?: any) => Promise<T[]>;
  create: (args: any) => Promise<T>;
  createMany: (args: any) => Promise<{ count: number }>;
  createManyAndReturn: (args: any) => Promise<T[]>;
  update: (args: any) => Promise<T>;
  updateMany: (args: any) => Promise<{ count: number }>;
  upsert: (args: any) => Promise<T>;
  delete: (args: any) => Promise<T>;
  deleteMany: (args?: any) => Promise<{ count: number }>;
  count: (args?: any) => Promise<number>;
  aggregate: (args: any) => Promise<any>;
  groupBy: (args: any) => Promise<any[]>;
  fields: Record<string, any>;
}

/**
 * Extended PrismaClient interface with SIS-specific models
 */
export interface ExtendedPrismaClient extends BasePrismaClient {
  // SIS Provider models
  sisProvider: ModelDelegate;
  sisSyncRun: ModelDelegate;
  sisSyncQueue: ModelDelegate;
  sisMapping: ModelDelegate;
  sisCredential: ModelDelegate;
  sisSyncConfig: ModelDelegate;
  sisFieldMapping: ModelDelegate;
  sisSyncHistory: ModelDelegate;
  sisWebhookEvent: ModelDelegate;
  sisProviderConfig: ModelDelegate;
  sisSyncError: ModelDelegate;
  sisSyncSchedule: ModelDelegate;
  sisDeltaMarker: ModelDelegate;
  
  // Raw data models
  sisRawSchool: ModelDelegate;
  sisRawClass: ModelDelegate;
  sisRawUser: ModelDelegate;
  sisRawEnrollment: ModelDelegate;
  
  // Sync state models
  deltaSyncState: ModelDelegate;
  syncConflict: ModelDelegate;
  syncHistory: ModelDelegate;
  syncError: ModelDelegate;
  
  // Academic models
  academicTerm: ModelDelegate;
  parentStudentRelationship: ModelDelegate;
  studentDemographic: ModelDelegate;
  
  // Webhook models
  webhookConfig: ModelDelegate;
  webhookLog: ModelDelegate;
  webhookDeadLetter: ModelDelegate;

  // Device sync models (absorbed from sync-svc, Sprint 3)
  deviceSyncConflict: ModelDelegate;
  deviceSyncHistory: ModelDelegate;
  deviceSyncState: ModelDelegate;
  syncLearningSession: ModelDelegate;
  syncResponse: ModelDelegate;
  syncProgress: ModelDelegate;
  syncSkillMastery: ModelDelegate;
  syncSettings: ModelDelegate;
  syncBookmark: ModelDelegate;
  syncNote: ModelDelegate;
  offlineContent: ModelDelegate;
  contentVersion: ModelDelegate;
}

/**
 * Type alias for the extended PrismaClient
 */
export type PrismaClient = ExtendedPrismaClient;
