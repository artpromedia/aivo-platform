import {
  PrismaClient,
  Prisma,
  GameType,
  GenerationStatus,
  DifficultyLevel,
  ContentSource,
} from '../generated/prisma-client/index.js';

export const prisma = new PrismaClient();

// Re-export enums and Prisma namespace for use by services
export { Prisma, GameType, GenerationStatus, DifficultyLevel, ContentSource };
