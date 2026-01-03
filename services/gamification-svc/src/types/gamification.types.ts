/**
 * Gamification System Type Definitions
 *
 * Comprehensive types for the gamification engine including:
 * - XP and leveling
 * - Achievements and badges
 * - Streaks and daily goals
 * - Leaderboards
 * - Challenges and quests
 * - Rewards and virtual currency
 * - Avatar customization
 */

// ============================================================================
// XP & LEVELING TYPES
// ============================================================================

export interface XPTransaction {
  id: string;
  studentId: string;
  amount: number;
  activity: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  leveledUp?: boolean;
  newLevel?: number;
}

export interface LevelConfig {
  level: number;
  xpRequired: number;
  title: string;
  color: string;
  rewards?: LevelReward[];
}

export interface LevelReward {
  type: 'coins' | 'gems' | 'item' | 'title' | 'badge' | 'freeze';
  amount?: number;
  itemId?: string;
}

export interface PlayerProfile {
  id: string;
  studentId: string;
  student?: {
    id: string;
    givenName: string;
    familyName: string;
    photoUrl?: string | null;
  };
  totalXp: number;
  level: number;
  levelTitle: string;
  levelColor: string;
  currentLevelXp: number;
  xpToNextLevel: number;
  xpProgress: number;
  coins: number;
  gems: number;
  streakDays: number;
  longestStreak: number;
  dailyXpGoal: number;
  todayXp: number;
  weekXp?: number;
  monthXp?: number;
  lessonsCompleted: number;
  quizzesCompleted: number;
  perfectScores: number;
  totalTimeMinutes: number;
  equippedItems?: EquippedItem[];
  activeTitle?: PlayerTitle | null;
  settings: PlayerSettings;
}

export interface PlayerSettings {
  showOnLeaderboard: boolean;
  celebrationsEnabled: boolean;
  soundEnabled: boolean;
  dailyReminders: boolean;
  autoUseFreeze?: boolean;
  sessionTimeLimit?: number; // minutes
  breakReminderInterval?: number; // minutes
}

export interface EquippedItem {
  id: string;
  slot: 'avatar' | 'frame' | 'badge' | 'background' | 'effect';
  itemId: string;
  item?: ShopItem;
}

export interface PlayerTitle {
  id: string;
  name: string;
  color?: string;
}

// ============================================================================
// ACHIEVEMENT TYPES
// ============================================================================

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  iconUrl: string;
  xpReward: number;
  rarity: AchievementRarity;
  tier?: AchievementTier;
  secret?: boolean;
  earnedAt?: Date;
}

export interface AchievementDefinition extends Achievement {
  requirement?: AchievementRequirement;
  threshold?: number;
}

export interface AchievementRequirement {
  type: string;
  count: number;
  metadata?: Record<string, unknown>;
}

export interface AchievementProgress {
  achievementId: string;
  achievement: Achievement;
  currentValue: number;
  targetValue: number;
  percentage: number;
}

export type AchievementCategory =
  | 'onboarding'
  | 'lessons'
  | 'mastery'
  | 'consistency'
  | 'xp'
  | 'skills'
  | 'time'
  | 'social'
  | 'challenges'
  | 'secret';

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

// ============================================================================
// STREAK TYPES
// ============================================================================

export interface Streak {
  currentDays: number;
  longestDays: number;
  todayComplete: boolean;
  freezesAvailable: number;
  nextMilestone: number;
  lastActivityDate: Date | null;
  daysUntilNextMilestone?: number;
}

export interface StreakFreeze {
  id: string;
  studentId: string;
  usedAt: Date;
  streakDayProtected: number;
}

export interface DailyGoal {
  goal: number;
  current: number;
  progress: number;
  completed: boolean;
  streak: number;
}

export interface StreakCalendarDay {
  date: Date;
  hasActivity: boolean;
  usedFreeze: boolean;
  xpEarned: number;
}

// ============================================================================
// LEADERBOARD TYPES
// ============================================================================

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  displayName: string;
  avatarUrl?: string | null;
  score: number;
  level: number;
  change?: number; // Position change from previous period
}

export type LeaderboardType = 'xp' | 'lessons' | 'streak' | 'achievements';

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all_time';

export type LeaderboardScope = 'global' | 'school' | 'class';

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
  period: LeaderboardPeriod;
  updatedAt: Date;
  playerRank?: number | null;
}

// ============================================================================
// CHALLENGE TYPES
// ============================================================================

export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: ChallengeType;
  category: string;
  metric: string;
  goal: number;
  currentProgress?: number;
  xpReward: number;
  coinReward?: number;
  gemReward?: number;
  iconUrl: string;
  startDate: Date;
  endDate: Date;
  status: ChallengeStatus;
  completedAt?: Date | null;
}

export interface ChallengeDefinition {
  id: string;
  name: string;
  description: string;
  type: ChallengeType;
  category: string;
  goal: number;
  metric: string;
  xpReward: number;
  coinReward?: number;
  gemReward?: number;
  iconUrl: string;
}

export interface ChallengeProgress {
  challengeId: string;
  challenge: Challenge;
  type: ChallengeType;
  currentValue: number;
  targetValue: number;
  percentage: number;
  completed: boolean;
  expiresAt: Date;
}

export type ChallengeType = 'daily' | 'weekly' | 'monthly' | 'special' | 'class';

export type ChallengeStatus = 'active' | 'in_progress' | 'completed' | 'expired' | 'failed';

// ============================================================================
// REWARD & SHOP TYPES
// ============================================================================

export interface Reward {
  id: string;
  type: RewardType;
  amount?: number;
  itemId?: string;
  item?: ShopItem;
  reason: string;
  awardedAt: Date;
}

export type RewardType = 'xp' | 'coins' | 'gems' | 'item' | 'title' | 'badge' | 'booster' | 'freeze';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: ShopCategory;
  type: ShopItemType;
  imageUrl: string;
  previewUrl?: string;
  price: number;
  currency: 'coins' | 'gems';
  rarity: AchievementRarity;
  isLimited?: boolean;
  limitedUntil?: Date;
  requiredLevel?: number;
  requiredAchievement?: string;
  metadata?: Record<string, unknown>;
}

export type ShopCategory = 'avatars' | 'frames' | 'backgrounds' | 'effects' | 'boosters' | 'freezes' | 'titles';

export type ShopItemType =
  | 'avatar'
  | 'avatar_frame'
  | 'profile_background'
  | 'celebration_effect'
  | 'xp_booster'
  | 'streak_freeze'
  | 'title';

export interface ActiveBooster {
  id: string;
  studentId: string;
  type: 'xp_2x' | 'xp_3x' | 'coin_2x';
  multiplier: number;
  expiresAt: Date;
}

export interface PurchaseResult {
  success: boolean;
  message: string;
  item?: ShopItem;
  newBalance?: {
    coins: number;
    gems: number;
  };
}

// ============================================================================
// AVATAR CUSTOMIZATION TYPES
// ============================================================================

export interface AvatarConfig {
  baseAvatar: string;
  frame?: string;
  background?: string;
  effect?: string;
  displayBadges: string[];
}

export interface AvatarPart {
  id: string;
  type: 'base' | 'frame' | 'background' | 'effect' | 'badge';
  imageUrl: string;
  name: string;
  owned: boolean;
  equipped: boolean;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface GamificationNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  iconUrl?: string;
  data?: Record<string, unknown>;
  createdAt: Date;
  read: boolean;
}

export type NotificationType =
  | 'xp_earned'
  | 'level_up'
  | 'achievement_unlocked'
  | 'streak_milestone'
  | 'streak_warning'
  | 'streak_broken'
  | 'challenge_completed'
  | 'challenge_expiring'
  | 'leaderboard_rank_change'
  | 'reward_received'
  | 'daily_goal_complete'
  | 'break_reminder'
  | 'session_time_warning';

// ============================================================================
// CELEBRATION TYPES
// ============================================================================

export interface Celebration {
  type: CelebrationType;
  title: string;
  subtitle?: string;
  iconUrl?: string;
  confetti?: boolean;
  sound?: string;
  duration?: number;
  rewards?: CelebrationReward[];
}

export type CelebrationType =
  | 'level_up'
  | 'achievement'
  | 'streak_milestone'
  | 'challenge_complete'
  | 'perfect_score'
  | 'daily_goal'
  | 'first_lesson';

export interface CelebrationReward {
  type: RewardType;
  amount: number;
  label: string;
}

// ============================================================================
// ANTI-ADDICTION TYPES
// ============================================================================

export interface SessionStats {
  sessionStartTime: Date;
  sessionDurationMinutes: number;
  lastBreakTime?: Date;
  breaksTaken: number;
  lessonsCompleted: number;
  isTimeLimitExceeded: boolean;
  isBreakRecommended: boolean;
}

export interface AntiAddictionSettings {
  enabled: boolean;
  dailyTimeLimitMinutes: number;
  sessionTimeLimitMinutes: number;
  breakReminderIntervalMinutes: number;
  breakDurationMinutes: number;
  hardLimitEnabled: boolean;
  parentControlled: boolean;
}

export interface BreakReminder {
  type: 'suggestion' | 'warning' | 'required';
  message: string;
  sessionDurationMinutes: number;
  suggestedBreakMinutes: number;
}

// ============================================================================
// TEACHER CONTROLS TYPES
// ============================================================================

export interface ClassGamificationSettings {
  classId: string;
  enabled: boolean;
  features: {
    xpEnabled: boolean;
    achievementsEnabled: boolean;
    streaksEnabled: boolean;
    leaderboardEnabled: boolean;
    leaderboardScope: 'class' | 'anonymous' | 'disabled';
    challengesEnabled: boolean;
    rewardsEnabled: boolean;
    celebrationsEnabled: boolean;
    soundEnabled: boolean;
  };
  customXpMultiplier?: number;
  antiAddiction: {
    enforceTimeLimits: boolean;
    maxDailyMinutes?: number;
    enforceBreaks: boolean;
    breakIntervalMinutes?: number;
  };
  updatedAt: Date;
  updatedBy: string;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface GamificationEvent {
  type: string;
  studentId: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

export interface XPAwardedEvent extends GamificationEvent {
  type: 'xp.awarded';
  data: {
    amount: number;
    activity: string;
    newTotal: number;
  };
}

export interface LevelUpEvent extends GamificationEvent {
  type: 'player.levelUp';
  data: {
    oldLevel: number;
    newLevel: number;
    title: string;
  };
}

export interface AchievementEarnedEvent extends GamificationEvent {
  type: 'achievement.earned';
  data: {
    achievementId: string;
    name: string;
    description: string;
    iconUrl: string;
    xpReward: number;
    rarity: AchievementRarity;
  };
}

export interface StreakEvent extends GamificationEvent {
  type: 'streak.extended' | 'streak.milestone' | 'streak.broken';
  data: {
    days: number;
    previousStreak?: number;
    daysMissed?: number;
  };
}

export interface ChallengeCompletedEvent extends GamificationEvent {
  type: 'challenge.completed';
  data: {
    challengeId: string;
    name: string;
    xpReward: number;
    coinReward?: number;
    gemReward?: number;
  };
}

// ============================================================================
// API TYPES
// ============================================================================

export interface PlayerDashboardResponse {
  profile: PlayerProfile;
  streak: Streak;
  dailyGoal: DailyGoal;
  recentAchievements: Achievement[];
  activeChallenges: ChallengeProgress[];
  leaderboardRank: number | null;
}

export interface AchievementsResponse {
  earned: Achievement[];
  progress: AchievementProgress[];
  stats: {
    total: number;
    earned: number;
    percentage: number;
  };
}

export interface ShopResponse {
  categories: {
    id: ShopCategory;
    name: string;
    items: ShopItem[];
  }[];
  featured: ShopItem[];
  playerBalance: {
    coins: number;
    gems: number;
  };
}
