export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type AchievementCategory = 'learning' | 'streak' | 'mastery' | 'social' | 'exploration' | 'special';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  category: AchievementCategory;
  xpReward: number;
  coinReward: number;
  threshold: number; // Target progress value
  isSecret?: boolean;
  unlockedAt?: string;
  progress?: number;
  progressTotal?: number;
}

export interface LearnerRewards {
  learnerId: string;
  xp: number;
  level: number;
  xpToNextLevel: number;
  coins: number;
  gems: number;
  currentStreak: number;
  longestStreak: number;
  achievements: Achievement[];
  unlockedItems: string[];
}

export interface RewardShopItem {
  id: string;
  name: string;
  description: string;
  type: 'avatar' | 'frame' | 'background' | 'title' | 'effect' | 'booster';
  price: number;
  currency: 'coins' | 'gems';
  rarity: AchievementRarity;
  imageUrl?: string;
  emoji?: string;
  levelRequired?: number;
  isLimited?: boolean;
  expiresAt?: string;
}

export interface NewAchievementPopupProps {
  achievements: Achievement[];
  onClose: () => void;
}

export interface AchievementCardProps {
  achievement: Achievement;
  showProgress?: boolean;
  className?: string;
}

export interface RewardsSystemProps {
  learnerId: string;
  onAchievementUnlocked?: (achievement: Achievement) => void;
}

export interface LevelProgressProps {
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  className?: string;
}

// Rarity colors
export const RARITY_COLORS: Record<AchievementRarity, { bg: string; border: string; text: string }> = {
  common: {
    bg: 'bg-gray-100',
    border: 'border-gray-300',
    text: 'text-gray-600',
  },
  uncommon: {
    bg: 'bg-green-100',
    border: 'border-green-400',
    text: 'text-green-700',
  },
  rare: {
    bg: 'bg-blue-100',
    border: 'border-blue-400',
    text: 'text-blue-700',
  },
  epic: {
    bg: 'bg-purple-100',
    border: 'border-purple-400',
    text: 'text-purple-700',
  },
  legendary: {
    bg: 'bg-amber-100',
    border: 'border-amber-400',
    text: 'text-amber-700',
  },
};

// Predefined achievements
export const ACHIEVEMENT_DEFINITIONS: Achievement[] = [
  // Learning achievements
  {
    id: 'first_lesson',
    title: 'First Steps',
    description: 'Complete your first lesson',
    icon: '🎓',
    rarity: 'common',
    category: 'learning',
    xpReward: 50,
    coinReward: 10,
    threshold: 1,
  },
  {
    id: 'ten_lessons',
    title: 'Knowledge Seeker',
    description: 'Complete 10 lessons',
    icon: '📚',
    rarity: 'uncommon',
    category: 'learning',
    xpReward: 100,
    coinReward: 25,
    threshold: 10,
  },
  {
    id: 'fifty_lessons',
    title: 'Dedicated Learner',
    description: 'Complete 50 lessons',
    icon: '🌟',
    rarity: 'rare',
    category: 'learning',
    xpReward: 250,
    coinReward: 50,
    threshold: 50,
  },
  {
    id: 'hundred_lessons',
    title: 'Learning Champion',
    description: 'Complete 100 lessons',
    icon: '🏆',
    rarity: 'epic',
    category: 'learning',
    xpReward: 500,
    coinReward: 100,
    threshold: 100,
  },

  // Streak achievements
  {
    id: 'streak_3',
    title: 'Getting Started',
    description: 'Maintain a 3-day streak',
    icon: '🔥',
    rarity: 'common',
    category: 'streak',
    xpReward: 30,
    coinReward: 15,
    threshold: 3,
  },
  {
    id: 'streak_7',
    title: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '⚡',
    rarity: 'uncommon',
    category: 'streak',
    xpReward: 75,
    coinReward: 30,
    threshold: 7,
  },
  {
    id: 'streak_30',
    title: 'Monthly Master',
    description: 'Maintain a 30-day streak',
    icon: '🌙',
    rarity: 'rare',
    category: 'streak',
    xpReward: 200,
    coinReward: 75,
    threshold: 30,
  },
  {
    id: 'streak_100',
    title: 'Unstoppable',
    description: 'Maintain a 100-day streak',
    icon: '💎',
    rarity: 'legendary',
    category: 'streak',
    xpReward: 1000,
    coinReward: 250,
    threshold: 100,
  },

  // Mastery achievements
  {
    id: 'first_mastery',
    title: 'Skill Master',
    description: 'Master your first subject',
    icon: '🎯',
    rarity: 'uncommon',
    category: 'mastery',
    xpReward: 150,
    coinReward: 40,
    threshold: 1,
  },
  {
    id: 'perfect_game',
    title: 'Perfect!',
    description: 'Get 100% on any game',
    icon: '💯',
    rarity: 'uncommon',
    category: 'mastery',
    xpReward: 75,
    coinReward: 20,
    threshold: 1,
  },
  {
    id: 'speed_demon',
    title: 'Speed Demon',
    description: 'Complete a game in under 60 seconds',
    icon: '⏱️',
    rarity: 'rare',
    category: 'mastery',
    xpReward: 100,
    coinReward: 35,
    threshold: 1,
  },
  {
    id: 'streak_master',
    title: 'On Fire!',
    description: 'Get a 10x streak in any game',
    icon: '🔥',
    rarity: 'rare',
    category: 'mastery',
    xpReward: 100,
    coinReward: 35,
    threshold: 10,
  },

  // Exploration achievements
  {
    id: 'all_subjects',
    title: 'Explorer',
    description: 'Try all available subjects',
    icon: '🗺️',
    rarity: 'rare',
    category: 'exploration',
    xpReward: 200,
    coinReward: 50,
    threshold: 8,
  },
  {
    id: 'ten_games',
    title: 'Game Explorer',
    description: 'Play 10 different games',
    icon: '🎮',
    rarity: 'uncommon',
    category: 'exploration',
    xpReward: 100,
    coinReward: 25,
    threshold: 10,
  },

  // Special achievements
  {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Complete a lesson before 8 AM',
    icon: '🌅',
    rarity: 'uncommon',
    category: 'special',
    xpReward: 50,
    coinReward: 15,
    threshold: 1,
    isSecret: true,
  },
  {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Complete a lesson after 9 PM',
    icon: '🦉',
    rarity: 'uncommon',
    category: 'special',
    xpReward: 50,
    coinReward: 15,
    threshold: 1,
    isSecret: true,
  },
  {
    id: 'weekend_warrior',
    title: 'Weekend Warrior',
    description: 'Learn on both Saturday and Sunday',
    icon: '🏖️',
    rarity: 'uncommon',
    category: 'special',
    xpReward: 75,
    coinReward: 20,
    threshold: 1,
  },
];

// Calculate level from XP
export function calculateLevel(xp: number): { level: number; xpInLevel: number; xpToNext: number } {
  // XP required for each level increases
  // Level 1: 0-100, Level 2: 100-250, Level 3: 250-450, etc.
  let level = 1;
  let xpRequired = 100;
  let totalXpRequired = 0;

  while (xp >= totalXpRequired + xpRequired) {
    totalXpRequired += xpRequired;
    level++;
    xpRequired = Math.floor(100 * Math.pow(1.5, level - 1));
  }

  return {
    level,
    xpInLevel: xp - totalXpRequired,
    xpToNext: xpRequired,
  };
}
