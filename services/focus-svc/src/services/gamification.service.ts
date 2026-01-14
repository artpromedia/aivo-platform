/**
 * Gamification Service
 *
 * Handles XP/Coins rewards, achievements, and streak tracking
 * for focus break mini-games and learning activities.
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type TransactionType =
  | 'GAME_COMPLETE'
  | 'BREAK_COMPLETE'
  | 'ACHIEVEMENT'
  | 'STREAK_BONUS'
  | 'DAILY_BONUS'
  | 'PERFECT_SCORE';

export type AchievementCategory = 'GAMES' | 'BREAKS' | 'STREAKS' | 'FOCUS' | 'SPECIAL';
export type AchievementTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface RewardResult {
  xpEarned: number;
  coinsEarned: number;
  newTotal: { xp: number; coins: number; level: number };
  leveledUp: boolean;
  newLevel?: number;
  achievementsUnlocked: UnlockedAchievement[];
}

export interface UnlockedAchievement {
  code: string;
  title: string;
  description: string;
  tier: AchievementTier;
  xpReward: number;
  coinReward: number;
}

export interface AchievementProgress {
  code: string;
  title: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  currentProgress: number;
  targetProgress: number;
  progressPercentage: number;
  isCompleted: boolean;
  completedAt?: Date;
}

export interface StreakInfo {
  currentDailyStreak: number;
  longestDailyStreak: number;
  gamesPlayedToday: number;
  gamesCompletedToday: number;
  perfectGamesToday: number;
  gamesThisWeek: number;
  breaksThisWeek: number;
  consecutiveFocusDays: number;
}

export interface LeaderboardEntry {
  learnerId: string;
  displayName: string;
  totalXp: number;
  level: number;
  rank: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// ACHIEVEMENT DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

// Define achievements in code (would be seeded to database)
export const ACHIEVEMENT_DEFINITIONS: {
  code: string;
  title: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  requirement: { type: string; target: number; gameCategory?: string };
  xpReward: number;
  coinReward: number;
  isHidden?: boolean;
}[] = [
  // Game achievements
  {
    code: 'FIRST_GAME',
    title: 'First Steps',
    description: 'Complete your first mini-game',
    category: 'GAMES',
    tier: 'BRONZE',
    requirement: { type: 'games_completed', target: 1 },
    xpReward: 25,
    coinReward: 10,
  },
  {
    code: 'GAME_EXPLORER',
    title: 'Game Explorer',
    description: 'Complete 10 mini-games',
    category: 'GAMES',
    tier: 'BRONZE',
    requirement: { type: 'games_completed', target: 10 },
    xpReward: 50,
    coinReward: 20,
  },
  {
    code: 'GAME_ENTHUSIAST',
    title: 'Game Enthusiast',
    description: 'Complete 50 mini-games',
    category: 'GAMES',
    tier: 'SILVER',
    requirement: { type: 'games_completed', target: 50 },
    xpReward: 150,
    coinReward: 50,
  },
  {
    code: 'GAME_MASTER',
    title: 'Game Master',
    description: 'Complete 200 mini-games',
    category: 'GAMES',
    tier: 'GOLD',
    requirement: { type: 'games_completed', target: 200 },
    xpReward: 500,
    coinReward: 150,
  },
  // Category-specific achievements
  {
    code: 'MEMORY_ROOKIE',
    title: 'Memory Rookie',
    description: 'Complete 5 cognitive games',
    category: 'GAMES',
    tier: 'BRONZE',
    requirement: { type: 'category_games', target: 5, gameCategory: 'cognitive' },
    xpReward: 30,
    coinReward: 10,
  },
  {
    code: 'MEMORY_MASTER',
    title: 'Memory Master',
    description: 'Complete 25 cognitive games',
    category: 'GAMES',
    tier: 'SILVER',
    requirement: { type: 'category_games', target: 25, gameCategory: 'cognitive' },
    xpReward: 100,
    coinReward: 40,
  },
  {
    code: 'ZEN_APPRENTICE',
    title: 'Zen Apprentice',
    description: 'Complete 5 relaxation games',
    category: 'GAMES',
    tier: 'BRONZE',
    requirement: { type: 'category_games', target: 5, gameCategory: 'relaxation' },
    xpReward: 30,
    coinReward: 10,
  },
  {
    code: 'ZEN_MASTER',
    title: 'Zen Master',
    description: 'Complete 25 relaxation games',
    category: 'GAMES',
    tier: 'SILVER',
    requirement: { type: 'category_games', target: 25, gameCategory: 'relaxation' },
    xpReward: 100,
    coinReward: 40,
  },
  {
    code: 'CREATIVE_SPARK',
    title: 'Creative Spark',
    description: 'Complete 5 creative games',
    category: 'GAMES',
    tier: 'BRONZE',
    requirement: { type: 'category_games', target: 5, gameCategory: 'creative' },
    xpReward: 30,
    coinReward: 10,
  },
  // Perfect score achievements
  {
    code: 'PERFECT_START',
    title: 'Perfect Start',
    description: 'Get a perfect score in any game',
    category: 'GAMES',
    tier: 'BRONZE',
    requirement: { type: 'perfect_scores', target: 1 },
    xpReward: 40,
    coinReward: 15,
  },
  {
    code: 'PERFECTIONIST',
    title: 'Perfectionist',
    description: 'Get 10 perfect scores',
    category: 'GAMES',
    tier: 'SILVER',
    requirement: { type: 'perfect_scores', target: 10 },
    xpReward: 150,
    coinReward: 50,
  },
  {
    code: 'FLAWLESS',
    title: 'Flawless',
    description: 'Get 50 perfect scores',
    category: 'GAMES',
    tier: 'GOLD',
    requirement: { type: 'perfect_scores', target: 50 },
    xpReward: 400,
    coinReward: 120,
  },
  // Streak achievements
  {
    code: 'STREAK_3',
    title: 'Getting Started',
    description: 'Play games 3 days in a row',
    category: 'STREAKS',
    tier: 'BRONZE',
    requirement: { type: 'daily_streak', target: 3 },
    xpReward: 50,
    coinReward: 20,
  },
  {
    code: 'STREAK_7',
    title: 'Week Warrior',
    description: 'Play games 7 days in a row',
    category: 'STREAKS',
    tier: 'SILVER',
    requirement: { type: 'daily_streak', target: 7 },
    xpReward: 150,
    coinReward: 50,
  },
  {
    code: 'STREAK_14',
    title: 'Two Week Champion',
    description: 'Play games 14 days in a row',
    category: 'STREAKS',
    tier: 'GOLD',
    requirement: { type: 'daily_streak', target: 14 },
    xpReward: 300,
    coinReward: 100,
  },
  {
    code: 'STREAK_30',
    title: 'Monthly Legend',
    description: 'Play games 30 days in a row',
    category: 'STREAKS',
    tier: 'PLATINUM',
    requirement: { type: 'daily_streak', target: 30 },
    xpReward: 750,
    coinReward: 250,
  },
  // Break achievements
  {
    code: 'BREAK_TAKER',
    title: 'Break Taker',
    description: 'Complete 10 focus breaks',
    category: 'BREAKS',
    tier: 'BRONZE',
    requirement: { type: 'breaks_completed', target: 10 },
    xpReward: 40,
    coinReward: 15,
  },
  {
    code: 'BREAK_CHAMPION',
    title: 'Break Champion',
    description: 'Complete 50 focus breaks',
    category: 'BREAKS',
    tier: 'SILVER',
    requirement: { type: 'breaks_completed', target: 50 },
    xpReward: 120,
    coinReward: 40,
  },
  {
    code: 'SELF_CARE_MASTER',
    title: 'Self-Care Master',
    description: 'Complete 200 focus breaks',
    category: 'BREAKS',
    tier: 'GOLD',
    requirement: { type: 'breaks_completed', target: 200 },
    xpReward: 400,
    coinReward: 130,
  },
  // Focus achievements
  {
    code: 'FOCUS_HERO',
    title: 'Focus Hero',
    description: 'Maintain focus for 5 consecutive days',
    category: 'FOCUS',
    tier: 'SILVER',
    requirement: { type: 'focus_streak', target: 5 },
    xpReward: 100,
    coinReward: 35,
  },
  // Special/hidden achievements
  {
    code: 'EARLY_BIRD',
    title: 'Early Bird',
    description: 'Complete a game before 8 AM',
    category: 'SPECIAL',
    tier: 'BRONZE',
    requirement: { type: 'early_game', target: 1 },
    xpReward: 35,
    coinReward: 15,
    isHidden: true,
  },
  {
    code: 'NIGHT_OWL',
    title: 'Night Owl',
    description: 'Complete a game after 8 PM',
    category: 'SPECIAL',
    tier: 'BRONZE',
    requirement: { type: 'late_game', target: 1 },
    xpReward: 35,
    coinReward: 15,
    isHidden: true,
  },
  {
    code: 'WEEKEND_WARRIOR',
    title: 'Weekend Warrior',
    description: 'Complete 5 games on a weekend',
    category: 'SPECIAL',
    tier: 'BRONZE',
    requirement: { type: 'weekend_games', target: 5 },
    xpReward: 50,
    coinReward: 20,
    isHidden: true,
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// LEVEL SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

// XP required for each level (exponential growth)
function getXpForLevel(level: number): number {
  // Level 1: 0 XP, Level 2: 100 XP, Level 3: 250 XP, etc.
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(1.2, level - 2) + 50 * (level - 1));
}

function calculateLevel(totalXp: number): { level: number; xpToNextLevel: number } {
  let level = 1;
  let xpForCurrentLevel = 0;
  let xpForNextLevel = getXpForLevel(2);

  while (totalXp >= xpForNextLevel) {
    level++;
    xpForCurrentLevel = xpForNextLevel;
    xpForNextLevel = getXpForLevel(level + 1);
  }

  return {
    level,
    xpToNextLevel: xpForNextLevel - totalXp,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STORAGE (Would be Prisma in production)
// ══════════════════════════════════════════════════════════════════════════════

interface RewardLedgerData {
  totalXp: number;
  totalCoins: number;
  currentLevel: number;
  xpToNextLevel: number;
  weeklyXp: number;
  monthlyXp: number;
}

interface LearnerStats {
  gamesCompleted: number;
  perfectScores: number;
  breaksCompleted: number;
  categoryGames: Record<string, number>;
}

interface AchievementData {
  currentProgress: number;
  targetProgress: number;
  isCompleted: boolean;
  completedAt?: Date;
}

interface StreakData {
  currentDailyStreak: number;
  longestDailyStreak: number;
  lastActivityDate?: Date;
  gamesPlayedToday: number;
  gamesCompletedToday: number;
  perfectGamesToday: number;
  weekStartDate?: Date;
  gamesThisWeek: number;
  breaksThisWeek: number;
  consecutiveFocusDays: number;
}

// In-memory stores (replace with Prisma queries in production)
const rewardLedgers = new Map<string, RewardLedgerData>();
const learnerStats = new Map<string, LearnerStats>();
const learnerAchievements = new Map<string, Map<string, AchievementData>>();
const learnerStreaks = new Map<string, StreakData>();
const rewardTransactions: {
  tenantId: string;
  learnerId: string;
  transactionType: TransactionType;
  xpAmount: number;
  coinAmount: number;
  sourceId?: string;
  sourceType?: string;
  description?: string;
  createdAt: Date;
}[] = [];

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

function getKey(tenantId: string, learnerId: string): string {
  return `${tenantId}:${learnerId}`;
}

function getLedger(tenantId: string, learnerId: string): RewardLedgerData {
  const key = getKey(tenantId, learnerId);
  if (!rewardLedgers.has(key)) {
    rewardLedgers.set(key, {
      totalXp: 0,
      totalCoins: 0,
      currentLevel: 1,
      xpToNextLevel: 100,
      weeklyXp: 0,
      monthlyXp: 0,
    });
  }
  return rewardLedgers.get(key);
}

function getStats(tenantId: string, learnerId: string): LearnerStats {
  const key = getKey(tenantId, learnerId);
  if (!learnerStats.has(key)) {
    learnerStats.set(key, {
      gamesCompleted: 0,
      perfectScores: 0,
      breaksCompleted: 0,
      categoryGames: {},
    });
  }
  return learnerStats.get(key);
}

function getAchievements(tenantId: string, learnerId: string): Map<string, AchievementData> {
  const key = getKey(tenantId, learnerId);
  if (!learnerAchievements.has(key)) {
    // Initialize all achievements with progress tracking
    const achievements = new Map<string, AchievementData>();
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      achievements.set(def.code, {
        currentProgress: 0,
        targetProgress: def.requirement.target,
        isCompleted: false,
      });
    }
    learnerAchievements.set(key, achievements);
  }
  return learnerAchievements.get(key);
}

function getStreak(tenantId: string, learnerId: string): StreakData {
  const key = getKey(tenantId, learnerId);
  if (!learnerStreaks.has(key)) {
    learnerStreaks.set(key, {
      currentDailyStreak: 0,
      longestDailyStreak: 0,
      gamesPlayedToday: 0,
      gamesCompletedToday: 0,
      perfectGamesToday: 0,
      gamesThisWeek: 0,
      breaksThisWeek: 0,
      consecutiveFocusDays: 0,
    });
  }
  return learnerStreaks.get(key);
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  );
}

/**
 * Award XP and coins for completing a game
 */
export async function awardGameReward(
  tenantId: string,
  learnerId: string,
  gameSessionId: string,
  gameCategory: string,
  completed: boolean,
  isPerfectScore: boolean,
  scorePercent: number
): Promise<RewardResult> {
  const ledger = getLedger(tenantId, learnerId);
  const stats = getStats(tenantId, learnerId);
  const streak = getStreak(tenantId, learnerId);

  let xpEarned = 0;
  let coinsEarned = 0;
  const achievementsUnlocked: UnlockedAchievement[] = [];

  // Base reward for playing
  xpEarned += 5;
  coinsEarned += 2;

  // Bonus for completion
  if (completed) {
    xpEarned += 15;
    coinsEarned += 5;
    stats.gamesCompleted++;
    stats.categoryGames[gameCategory] = (stats.categoryGames[gameCategory] || 0) + 1;
    streak.gamesCompletedToday++;
    streak.gamesThisWeek++;
  }

  // Bonus for perfect score
  if (isPerfectScore) {
    xpEarned += 25;
    coinsEarned += 10;
    stats.perfectScores++;
    streak.perfectGamesToday++;
  }

  // Score-based bonus (0-50% of base)
  const scoreBonus = Math.floor(10 * (scorePercent / 100));
  xpEarned += scoreBonus;

  // Update streak
  const today = new Date();
  if (!streak.lastActivityDate || !isToday(streak.lastActivityDate)) {
    if (streak.lastActivityDate && isYesterday(streak.lastActivityDate)) {
      // Continue streak
      streak.currentDailyStreak++;
    } else {
      // Reset streak (missed a day)
      streak.currentDailyStreak = 1;
    }
    // Reset daily counts
    streak.gamesPlayedToday = 0;
    streak.gamesCompletedToday = completed ? 1 : 0;
    streak.perfectGamesToday = isPerfectScore ? 1 : 0;
    streak.lastActivityDate = today;
  }
  streak.gamesPlayedToday++;

  // Update longest streak
  if (streak.currentDailyStreak > streak.longestDailyStreak) {
    streak.longestDailyStreak = streak.currentDailyStreak;
  }

  // Streak bonus (every 3 days adds bonus)
  if (streak.currentDailyStreak >= 3 && streak.currentDailyStreak % 3 === 0) {
    const streakBonus = Math.min(50, streak.currentDailyStreak * 2);
    xpEarned += streakBonus;
    coinsEarned += Math.floor(streakBonus / 3);
  }

  // Check achievements
  const unlocked = checkAndUnlockAchievements(tenantId, learnerId, stats, streak);
  achievementsUnlocked.push(...unlocked);

  // Add achievement rewards
  for (const achievement of unlocked) {
    xpEarned += achievement.xpReward;
    coinsEarned += achievement.coinReward;
  }

  // Update ledger
  ledger.totalXp += xpEarned;
  ledger.totalCoins += coinsEarned;
  ledger.weeklyXp += xpEarned;
  ledger.monthlyXp += xpEarned;

  // Check for level up
  const levelInfo = calculateLevel(ledger.totalXp);
  const leveledUp = levelInfo.level > ledger.currentLevel;
  ledger.currentLevel = levelInfo.level;
  ledger.xpToNextLevel = levelInfo.xpToNextLevel;

  // Record transaction
  rewardTransactions.push({
    tenantId,
    learnerId,
    transactionType: 'GAME_COMPLETE',
    xpAmount: xpEarned,
    coinAmount: coinsEarned,
    sourceId: gameSessionId,
    sourceType: 'GAME',
    description: `Completed ${gameCategory} game${isPerfectScore ? ' (perfect score!)' : ''}`,
    createdAt: new Date(),
  });

  return {
    xpEarned,
    coinsEarned,
    newTotal: {
      xp: ledger.totalXp,
      coins: ledger.totalCoins,
      level: ledger.currentLevel,
    },
    leveledUp,
    newLevel: leveledUp ? ledger.currentLevel : undefined,
    achievementsUnlocked,
  };
}

/**
 * Award rewards for completing a focus break
 */
export async function awardBreakReward(
  tenantId: string,
  learnerId: string,
  breakSessionId: string,
  wasEffective: boolean
): Promise<RewardResult> {
  const ledger = getLedger(tenantId, learnerId);
  const stats = getStats(tenantId, learnerId);
  const streak = getStreak(tenantId, learnerId);

  let xpEarned = 10;
  let coinsEarned = 3;
  const achievementsUnlocked: UnlockedAchievement[] = [];

  stats.breaksCompleted++;
  streak.breaksThisWeek++;

  // Bonus for effective breaks
  if (wasEffective) {
    xpEarned += 10;
    coinsEarned += 5;
  }

  // Check achievements
  const unlocked = checkAndUnlockAchievements(tenantId, learnerId, stats, streak);
  achievementsUnlocked.push(...unlocked);

  for (const achievement of unlocked) {
    xpEarned += achievement.xpReward;
    coinsEarned += achievement.coinReward;
  }

  // Update ledger
  ledger.totalXp += xpEarned;
  ledger.totalCoins += coinsEarned;
  ledger.weeklyXp += xpEarned;
  ledger.monthlyXp += xpEarned;

  const levelInfo = calculateLevel(ledger.totalXp);
  const leveledUp = levelInfo.level > ledger.currentLevel;
  ledger.currentLevel = levelInfo.level;
  ledger.xpToNextLevel = levelInfo.xpToNextLevel;

  rewardTransactions.push({
    tenantId,
    learnerId,
    transactionType: 'BREAK_COMPLETE',
    xpAmount: xpEarned,
    coinAmount: coinsEarned,
    sourceId: breakSessionId,
    sourceType: 'BREAK',
    description: `Completed focus break${wasEffective ? ' (improved focus!)' : ''}`,
    createdAt: new Date(),
  });

  return {
    xpEarned,
    coinsEarned,
    newTotal: {
      xp: ledger.totalXp,
      coins: ledger.totalCoins,
      level: ledger.currentLevel,
    },
    leveledUp,
    newLevel: leveledUp ? ledger.currentLevel : undefined,
    achievementsUnlocked,
  };
}

/**
 * Check and unlock any achievements that have been met
 */
function checkAndUnlockAchievements(
  tenantId: string,
  learnerId: string,
  stats: LearnerStats,
  streak: StreakData
): UnlockedAchievement[] {
  const achievements = getAchievements(tenantId, learnerId);
  const unlocked: UnlockedAchievement[] = [];

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    const achievement = achievements.get(def.code);
    if (achievement.isCompleted) continue;

    // Calculate current progress based on requirement type
    let progress = 0;
    switch (def.requirement.type) {
      case 'games_completed':
        progress = stats.gamesCompleted;
        break;
      case 'category_games':
        progress = stats.categoryGames[def.requirement.gameCategory] || 0;
        break;
      case 'perfect_scores':
        progress = stats.perfectScores;
        break;
      case 'daily_streak':
        progress = streak.currentDailyStreak;
        break;
      case 'breaks_completed':
        progress = stats.breaksCompleted;
        break;
      case 'focus_streak':
        progress = streak.consecutiveFocusDays;
        break;
      case 'early_game':
      case 'late_game':
      case 'weekend_games':
        // These are tracked separately via special events
        progress = achievement.currentProgress;
        break;
    }

    // Update progress
    achievement.currentProgress = progress;

    // Check if completed
    if (progress >= def.requirement.target && !achievement.isCompleted) {
      achievement.isCompleted = true;
      achievement.completedAt = new Date();

      unlocked.push({
        code: def.code,
        title: def.title,
        description: def.description,
        tier: def.tier,
        xpReward: def.xpReward,
        coinReward: def.coinReward,
      });
    }
  }

  return unlocked;
}

/**
 * Get learner's current rewards summary
 */
export function getRewardsSummary(
  tenantId: string,
  learnerId: string
): {
  totalXp: number;
  totalCoins: number;
  currentLevel: number;
  xpToNextLevel: number;
  weeklyXp: number;
} {
  const ledger = getLedger(tenantId, learnerId);
  return {
    totalXp: ledger.totalXp,
    totalCoins: ledger.totalCoins,
    currentLevel: ledger.currentLevel,
    xpToNextLevel: ledger.xpToNextLevel,
    weeklyXp: ledger.weeklyXp,
  };
}

/**
 * Get learner's achievement progress
 */
export function getAchievementProgress(
  tenantId: string,
  learnerId: string,
  includeHidden?: boolean
): AchievementProgress[] {
  const achievements = getAchievements(tenantId, learnerId);
  const stats = getStats(tenantId, learnerId);
  const streak = getStreak(tenantId, learnerId);

  // Update progress for all achievements
  checkAndUnlockAchievements(tenantId, learnerId, stats, streak);

  const result: AchievementProgress[] = [];

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    // Skip hidden achievements unless they're completed or we're including hidden
    if (def.isHidden && !includeHidden) {
      const achievement = achievements.get(def.code);
      if (!achievement.isCompleted) continue;
    }

    const achievement = achievements.get(def.code);
    result.push({
      code: def.code,
      title: def.title,
      description: def.description,
      category: def.category,
      tier: def.tier,
      currentProgress: achievement.currentProgress,
      targetProgress: achievement.targetProgress,
      progressPercentage: Math.min(
        100,
        Math.round((achievement.currentProgress / achievement.targetProgress) * 100)
      ),
      isCompleted: achievement.isCompleted,
      completedAt: achievement.completedAt,
    });
  }

  return result;
}

/**
 * Get learner's streak information
 */
export function getStreakInfo(tenantId: string, learnerId: string): StreakInfo {
  const streak = getStreak(tenantId, learnerId);

  // Check if we need to reset daily counters
  if (streak.lastActivityDate && !isToday(streak.lastActivityDate)) {
    if (!isYesterday(streak.lastActivityDate)) {
      // Streak broken - more than a day has passed
      streak.currentDailyStreak = 0;
    }
    streak.gamesPlayedToday = 0;
    streak.gamesCompletedToday = 0;
    streak.perfectGamesToday = 0;
  }

  return {
    currentDailyStreak: streak.currentDailyStreak,
    longestDailyStreak: streak.longestDailyStreak,
    gamesPlayedToday: streak.gamesPlayedToday,
    gamesCompletedToday: streak.gamesCompletedToday,
    perfectGamesToday: streak.perfectGamesToday,
    gamesThisWeek: streak.gamesThisWeek,
    breaksThisWeek: streak.breaksThisWeek,
    consecutiveFocusDays: streak.consecutiveFocusDays,
  };
}

/**
 * Get recent reward transactions
 */
export function getRewardHistory(
  tenantId: string,
  learnerId: string,
  limit = 20
): {
  transactionType: TransactionType;
  xpAmount: number;
  coinAmount: number;
  description?: string;
  createdAt: Date;
}[] {
  return rewardTransactions
    .filter((t) => t.tenantId === tenantId && t.learnerId === learnerId)
    .slice(-limit)
    .reverse();
}

/**
 * Get leaderboard for a tenant
 */
export function getLeaderboard(tenantId: string, limit = 10): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [];

  for (const [key, ledger] of rewardLedgers) {
    if (key.startsWith(tenantId + ':')) {
      const learnerId = key.split(':')[1];
      entries.push({
        learnerId,
        displayName: `Learner ${learnerId.substring(0, 8)}`, // Would fetch real name
        totalXp: ledger.totalXp,
        level: ledger.currentLevel,
        rank: 0,
      });
    }
  }

  // Sort by XP descending and assign ranks
  entries.sort((a, b) => b.totalXp - a.totalXp);
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return entries.slice(0, limit);
}

/**
 * Track special achievements (early bird, night owl, etc.)
 */
export function trackSpecialEvent(
  tenantId: string,
  learnerId: string,
  eventType: 'early_game' | 'late_game' | 'weekend_games'
): UnlockedAchievement[] {
  const achievements = getAchievements(tenantId, learnerId);
  const unlocked: UnlockedAchievement[] = [];

  // Find matching achievement
  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (def.requirement.type === eventType) {
      const achievement = achievements.get(def.code);
      if (!achievement.isCompleted) {
        achievement.currentProgress++;

        if (achievement.currentProgress >= def.requirement.target) {
          achievement.isCompleted = true;
          achievement.completedAt = new Date();

          unlocked.push({
            code: def.code,
            title: def.title,
            description: def.description,
            tier: def.tier,
            xpReward: def.xpReward,
            coinReward: def.coinReward,
          });

          // Add rewards
          const ledger = getLedger(tenantId, learnerId);
          ledger.totalXp += def.xpReward;
          ledger.totalCoins += def.coinReward;
        }
      }
    }
  }

  return unlocked;
}
