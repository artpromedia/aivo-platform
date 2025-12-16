/**
 * Prisma client singleton for engagement-svc
 */

import { PrismaClient } from '../generated/prisma-client/index.js';

export { Prisma } from '../generated/prisma-client/index.js';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
});

// Re-export types for convenience
export type {
  EngagementProfile,
  EngagementEvent,
  Badge,
  LearnerBadge,
  Kudos,
  GamificationSettings,
  XpRule,
  LevelThreshold,
} from '../generated/prisma-client/index.js';

export {
  EngagementEventType,
  BadgeCategory,
  BadgeSource,
  KudosContext,
  KudosSenderRole,
  RewardStyle,
} from '../generated/prisma-client/index.js';
