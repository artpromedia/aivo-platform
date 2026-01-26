/**
 * Prisma Client Instance
 *
 * Singleton instance for database access.
 */

import { PrismaClient } from '../generated/prisma-client/index.js';

export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
});

// Re-export types and enums
export type {
  LearnerProfile,
  LearnerAccommodation,
  LearnerGoalLink,
  IepDocumentRef,
  ProfileChangeLog,
  SensoryProfile,
} from '../generated/prisma-client/index.js';

// Re-export enums that are actually used by models
export {
  Prisma,
  ProfileOrigin,
  AccommodationCategory,
  AccommodationSource,
  DocumentAccessScope,
  AiDisabledReason,
  FunctioningLevel,
  AssessmentType,
  AssessmentMode,
  SensoryImpairmentType,
  CommunicationModality,
  AACSystemType,
  InputMethod,
  VisualContrast,
  FontSize,
  ColorBlindMode,
} from '../generated/prisma-client/index.js';
