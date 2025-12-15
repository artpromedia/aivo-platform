/**
 * Prisma client singleton for engagement-svc
 */

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'warn', 'error']
      : ['warn', 'error'],
});

// Re-export types for convenience
export {
  EngagementProfile,
  EngagementEvent,
  Badge,
  LearnerBadge,
  Kudos,
  TenantGamificationSettings,
  LearnerGamificationPreferences,
  EngagementEventType,
  BadgeCategory,
  KudosContext,
  KudosSource,
  RewardStyle,
} from '@prisma/client';
