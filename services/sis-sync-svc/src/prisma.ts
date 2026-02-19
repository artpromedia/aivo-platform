/**
 * Prisma Client re-export for sis-sync-svc
 * 
 * This file re-exports the generated Prisma client and types from the local
 * generated directory. All imports of PrismaClient and Prisma types should
 * use this file instead of importing from '@prisma/client' directly.
 */

export { PrismaClient, Prisma } from '../generated/prisma-client/index.js';

// Re-export all enums from the generated client
export {
  SisProviderType,
  IntegrationStatus,
  SyncStatus,
  SisEntityType,
  ExternalUserRoleHint,
  ExternalEnrollmentRole,
  IdentityConflictType,
  IdentityConflictStatus,
} from '../generated/prisma-client/index.js';

// Re-export types for models
export type {
  SisProvider,
  SisSyncRun,
  SisSyncQueue,
  SisFieldMapping,
  SisRawSchool,
  SisRawClass,
  SisRawUser,
  SisRawEnrollment,
  ExternalSchoolMapping,
  ExternalClassMapping,
  ExternalUserMapping,
  ExternalEnrollmentMapping,
  IdentityConflict,
  DeltaSyncState,
  AcademicTerm,
  ParentStudentRelationship,
  StudentDemographic,
  WebhookConfig,
  WebhookLog,
  WebhookDeadLetter,
  SyncHistory,
} from '../generated/prisma-client/index.js';

// Type stubs for models planned in schema but not yet in generated client
// Allows downstream code to compile while Prisma schema migrations are pending
export type SisMapping = Record<string, unknown>;
export type SisCredential = Record<string, unknown>;
export type SisSyncConfig = Record<string, unknown>;
export type SisWebhookEvent = Record<string, unknown>;
export type SisSyncHistory = import('../generated/prisma-client/index.js').SyncHistory;

// RelationshipType is stored as string in schema, not generated as an enum
export type RelationshipType = 'parent' | 'guardian' | 'mother' | 'father' | 'grandparent' | 'other';
