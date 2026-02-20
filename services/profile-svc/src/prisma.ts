/**
 * Prisma Client Instance
 *
 * Singleton instance for database access with resilient connection management.
 */

import { PrismaClient } from '../generated/prisma-client/index.js';

export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'info' },
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' },
        ]
      : [
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' },
        ],
});

/**
 * Connect to the database with error handling.
 * Service will start even if DB is temporarily unavailable.
 */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('[profile-svc] Database connected');
  } catch (error) {
    console.warn(
      `[profile-svc] Database connection failed - service will start without DB: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Disconnect from the database gracefully.
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  console.log('[profile-svc] Database disconnected');
}

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
