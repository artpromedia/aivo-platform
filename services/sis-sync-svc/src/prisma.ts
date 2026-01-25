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
  RelationshipType,
} from '../generated/prisma-client/index.js';

// Re-export types for models
export type {
  SisProvider,
  SisSyncRun,
  SisSyncQueue,
  SisMapping,
  SisCredential,
  SisSyncConfig,
  SisFieldMapping,
  SisSyncHistory,
  SisWebhookEvent,
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
} from '../generated/prisma-client/index.js';
