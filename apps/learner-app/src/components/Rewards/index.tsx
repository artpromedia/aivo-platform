/**
 * Rewards & Achievement System Module
 *
 * Complete gamification system for the AIVO learning platform.
 * Includes achievements, XP progression, currency, and celebrations.
 */

// Main exports
export { RewardsSystem } from './RewardsSystem';
export { AchievementCard } from './AchievementCard';
export { LevelProgress } from './LevelProgress';
export { NewAchievementPopup } from './NewAchievementPopup';

// Types and constants
export {
  RARITY_COLORS,
  ACHIEVEMENT_DEFINITIONS,
  calculateLevel,
} from './types';

export type {
  AchievementRarity,
  AchievementCategory,
  Achievement,
  LearnerRewards,
  RewardShopItem,
  NewAchievementPopupProps,
  AchievementCardProps,
  RewardsSystemProps,
  LevelProgressProps,
} from './types';
