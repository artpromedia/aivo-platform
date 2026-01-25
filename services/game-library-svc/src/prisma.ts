/**
 * Prisma client singleton for game-library-svc
 */

import { PrismaClient } from '../generated/prisma-client/index.js';

export { Prisma } from '../generated/prisma-client/index.js';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Re-export types for convenience
export type {
  Game,
  GameSession,
  PlayerStats,
  UnlockedGame,
  BrainTrainingPlan,
} from '../generated/prisma-client/index.js';

// Re-export enums
export {
  GameType,
  GameCategory,
  CognitiveSkill,
  GradeBand,
  GameContext,
  SessionStatus,
} from '../generated/prisma-client/index.js';

// Re-export PrismaClient type
export type { PrismaClient } from '../generated/prisma-client/index.js';
