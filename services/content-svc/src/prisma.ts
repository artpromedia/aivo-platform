import {
  PrismaClient,
  Prisma,
  // Enums
  LearningObjectSubject,
  LearningObjectGradeBand,
  LearningObjectVersionState,
  ReviewDecision,
  IngestionJobStatus,
  IngestionSource,
  ContentPackageStatus,
  ContentLocale,
  FileCategory,
  FileOwnerType,
  VirusScanStatus,
  SocialStoryCategory,
  SocialStoryReadingLevel,
  SocialStoryVisualStyle,
  SensoryCategory,
  VisualComplexity,
  AnimationIntensity,
  CognitiveLoadLevel,
  IncidentSeverity,
  IncidentStatus,
  LessonStatus,
} from '../generated/prisma-client/index.js';

export const prisma = new PrismaClient();

// Re-export PrismaClient type and Prisma namespace
export { PrismaClient, Prisma };
export type { PrismaClient as PrismaClientType };

// Re-export all enums
export {
  LearningObjectSubject,
  LearningObjectGradeBand,
  LearningObjectVersionState,
  ReviewDecision,
  IngestionJobStatus,
  IngestionSource,
  ContentPackageStatus,
  ContentLocale,
  FileCategory,
  FileOwnerType,
  VirusScanStatus,
  SocialStoryCategory,
  SocialStoryReadingLevel,
  SocialStoryVisualStyle,
  SensoryCategory,
  VisualComplexity,
  AnimationIntensity,
  CognitiveLoadLevel,
  IncidentSeverity,
  IncidentStatus,
  LessonStatus,
};
