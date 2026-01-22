/**
 * Extended Prisma Client Types for content-svc
 *
 * Provides type definitions for Prisma models and operations.
 */

/* eslint-disable @typescript-eslint/no-namespace, @typescript-eslint/no-unused-vars */

import type { PrismaClient as BasePrismaClient } from '@prisma/client';

// Generic model delegate interface
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

// Extended Prisma Client with content-svc specific models
// Note: We don't extend BasePrismaClient directly due to delegate type incompatibilities
export interface ExtendedPrismaClient {
  // Standard Prisma methods
  $connect: () => Promise<void>;
  $disconnect: () => Promise<void>;
  $executeRaw: (query: any, ...values: any[]) => Promise<number>;
  $executeRawUnsafe: (query: string, ...values: any[]) => Promise<number>;
  $queryRaw: <T = unknown>(query: any, ...values: any[]) => Promise<T>;
  $queryRawUnsafe: <T = unknown>(query: string, ...values: any[]) => Promise<T>;
  $on: (event: string, callback: (event: any) => void) => void;

  // Content models
  learningObject: ModelDelegate;
  learningObjectVersion: ModelDelegate;
  contentBundle: ModelDelegate;
  contentItem: ModelDelegate;
  contentPackage: ModelDelegate;
  contentTag: ModelDelegate;
  contentCategory: ModelDelegate;

  // Sensory models
  contentSensoryMetadata: ModelDelegate;
  learnerSensoryProfile: ModelDelegate;
  sensoryIncident: ModelDelegate;

  // Social stories models
  socialStory: ModelDelegate;
  socialStoryView: ModelDelegate;
  socialStoryAssignment: ModelDelegate;
  learnerStoryPreferences: ModelDelegate;

  // Lesson builder models
  lessonDraft: ModelDelegate;
  lessonVersion: ModelDelegate;
  lessonTemplate: ModelDelegate;

  // xAPI models
  xapiStatement: ModelDelegate;

  // Other content models
  curriculum: ModelDelegate;
  curriculumStandard: ModelDelegate;
  contentAlignment: ModelDelegate;
  contentReview: ModelDelegate;
  contentMetrics: ModelDelegate;

  // Transaction override
  $transaction: <T>(
    arg: Promise<T>[] | ((prisma: any) => Promise<T>),
    options?: any
  ) => Promise<T[] | T>;

  // Allow any additional models
  [key: string]: any;
}

// Factory function to create extended client
export function createExtendedPrismaClient(basePrisma: BasePrismaClient): ExtendedPrismaClient {
  return basePrisma as unknown as ExtendedPrismaClient;
}

// Re-export Prisma namespace with extended types
export namespace Prisma {
  export type ContentSensoryMetadataWhereInput = any;
  export type ContentSensoryMetadataUpdateInput = any;
  export type ContentSensoryMetadataCreateInput = any;
  export type SocialStoryWhereInput = any;
  export type SocialStoryUpdateInput = any;
  export type SocialStoryCreateInput = any;
  export type SocialStoryGetPayload<T> = any;
  export type SocialStoryAssignmentUpdateInput = any;
  export type LearnerStoryPreferencesUpdateInput = any;
  export type SensoryIncidentWhereInput = any;
  export type InputJsonValue = any;
  export type JsonValue = any;
}

// Re-export content-related types from actual Prisma client
export {
  SocialStoryCategory,
  SocialStoryReadingLevel,
  SocialStoryVisualStyle,
  LearningObjectGradeBand,
  LearningObjectSubject,
  LearningObjectVersionState,
  ReviewDecision,
  IngestionJobStatus,
  SensoryCategory,
  IncidentSeverity,
  IncidentStatus,
  LessonStatus,
} from '@prisma/client';

export type ContentSensoryMetadata = any;
export type SensoryIncident = any;
