/**
 * Prisma Client Instance
 *
 * Singleton instance for database access.
 */

import { PrismaClient } from '../generated/prisma-client/index.js';

export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['warn', 'error'],
});

// Re-export types and enums
export type {
  LearnerProfile,
  LearnerAccommodation,
  LearnerGoalLink,
  IepDocumentRef,
  ProfileChangeLog,
} from '../generated/prisma-client/index.js';

export {
  ProfileOrigin,
  AccommodationCategory,
  AccommodationSource,
  DocumentAccessScope,
  SensitivityLevel,
  FontPreference,
  TextSizePreference,
  CheckFrequency,
} from '../generated/prisma-client/index.js';
