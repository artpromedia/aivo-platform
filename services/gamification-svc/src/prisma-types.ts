/**
 * Extended Prisma Client Types for Gamification Service
 * These types extend the base PrismaClient with gamification-specific models.
 *
 * NOTE: This is a build-compatibility layer. The actual Prisma models
 * should be defined in the schema.prisma file and generated via prisma generate.
 */

import type { PrismaClient as BasePrismaClient } from '../generated/prisma-client/index.js';

// Model delegate types that match Prisma's API
 
interface ModelDelegate {
  findUnique: (args: any) => Promise<any>;
  findFirst: (args: any) => Promise<any>;
  findMany: (args?: any) => Promise<any[]>;
  create: (args: any) => Promise<any>;
  createMany: (args: any) => Promise<{ count: number }>;
  update: (args: any) => Promise<any>;
  updateMany: (args: any) => Promise<{ count: number }>;
  upsert: (args: any) => Promise<any>;
  delete: (args: any) => Promise<any>;
  deleteMany: (args?: any) => Promise<{ count: number }>;
  count: (args?: any) => Promise<number>;
  aggregate: (args: any) => Promise<any>;
  groupBy: (args: any) => Promise<any[]>;
}

// List of model properties we override with our generic ModelDelegate
type GamificationModelKeys =
  | 'playerProfile'
  | 'playerSession'
  | 'playerTitle'
  | 'xPTransaction'
  | 'dailyLogin'
  | 'dailyActivity'
  | 'dailyGoalRecord'
  | 'earnedAchievement'
  | 'achievementProgress'
  | 'activeChallenge'
  | 'classChallenge'
  | 'classChallengeProgress'
  | 'classChallengeParticipant'
  | 'activeBooster'
  | 'shopItem'
  | 'ownedItem'
  | 'ownedTitle'
  | 'equippedItem'
  | 'streakFreezeUsage'
  | 'leaderboardArchive'
  | 'classGamificationSettings'
  | 'gamificationNotification'
  | 'competition'
  | 'competitionParticipant'
  | 'team'
  | 'teamMember'
  | 'teamAchievement';

// Extended PrismaClient type with gamification models
// We omit both $transaction and all model properties we redefine to avoid type conflicts
export interface ExtendedPrismaClient extends Omit<BasePrismaClient, '$transaction' | GamificationModelKeys> {
  // Player/Profile models
  playerProfile: ModelDelegate;
  playerSession: ModelDelegate;
  playerTitle: ModelDelegate;

  // XP and Rewards
  xPTransaction: ModelDelegate;
  dailyLogin: ModelDelegate;
  dailyActivity: ModelDelegate;
  dailyGoalRecord: ModelDelegate;

  // Achievements
  earnedAchievement: ModelDelegate;
  achievementProgress: ModelDelegate;

  // Challenges
  activeChallenge: ModelDelegate;
  classChallenge: ModelDelegate;
  classChallengeProgress: ModelDelegate;
  classChallengeParticipant: ModelDelegate;

  // Boosters
  activeBooster: ModelDelegate;

  // Shop and Items
  shopItem: ModelDelegate;
  ownedItem: ModelDelegate;
  ownedTitle: ModelDelegate;
  equippedItem: ModelDelegate;

  // Streaks
  streakFreezeUsage: ModelDelegate;

  // Leaderboards
  leaderboardArchive: ModelDelegate;

  // Settings and Notifications
  classGamificationSettings: ModelDelegate;
  gamificationNotification: ModelDelegate;

  // Competitions
  competition: ModelDelegate;
  competitionParticipant: ModelDelegate;

  // Teams
  team: ModelDelegate;
  teamMember: ModelDelegate;
  teamAchievement: ModelDelegate;

  // Override $transaction to support array pattern
  $transaction: <T>(arg: Promise<T>[] | ((prisma: any) => Promise<T>), options?: any) => Promise<T[] | T>;
}

// Export extended prisma client factory
export function createExtendedPrismaClient(basePrisma: BasePrismaClient): ExtendedPrismaClient {
  return basePrisma as unknown as ExtendedPrismaClient;
}
