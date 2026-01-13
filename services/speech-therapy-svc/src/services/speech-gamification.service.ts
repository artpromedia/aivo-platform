/**
 * Speech Therapy Gamification Service
 *
 * Handles rewards, achievements, streaks, and milestones
 * for speech therapy activities to encourage learner engagement.
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface SpeechRewardResult {
  xpEarned: number;
  starsEarned: number;
  newTotal: { xp: number; stars: number; level: number };
  leveledUp: boolean;
  newLevel?: number;
  achievementsUnlocked: UnlockedAchievement[];
  milestones: Milestone[];
  streakInfo: {
    currentStreak: number;
    isNewStreak: boolean;
    streakBonus: number;
  };
}

export interface UnlockedAchievement {
  code: string;
  title: string;
  description: string;
  category: string;
  xpReward: number;
  starsReward: number;
  icon: string;
}

export interface Milestone {
  type: string;
  title: string;
  message: string;
  xpReward: number;
  starsReward: number;
}

export interface SpeechProgressSummary {
  totalXp: number;
  currentLevel: number;
  totalStars: number;
  currentStreak: number;
  longestStreak: number;
  sessionsCompleted: number;
  perfectSessions: number;
  goalsMastered: number;
  soundsMastered: string[];
  totalPracticeMinutes: number;
}

export interface AchievementProgress {
  code: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  currentProgress: number;
  targetProgress: number;
  progressPercentage: number;
  isCompleted: boolean;
  completedAt?: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// ACHIEVEMENT DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

export const SPEECH_ACHIEVEMENTS = [
  // Session achievements
  {
    code: 'FIRST_SESSION',
    title: 'Getting Started',
    description: 'Complete your first speech therapy session',
    category: 'SESSIONS',
    icon: 'star',
    requirement: { type: 'sessions_completed', target: 1 },
    xpReward: 50,
    starsReward: 3,
  },
  {
    code: 'SESSION_5',
    title: 'Practice Makes Progress',
    description: 'Complete 5 speech therapy sessions',
    category: 'SESSIONS',
    icon: 'trophy',
    requirement: { type: 'sessions_completed', target: 5 },
    xpReward: 100,
    starsReward: 5,
  },
  {
    code: 'SESSION_25',
    title: 'Dedicated Learner',
    description: 'Complete 25 speech therapy sessions',
    category: 'SESSIONS',
    icon: 'medal',
    requirement: { type: 'sessions_completed', target: 25 },
    xpReward: 300,
    starsReward: 15,
  },
  {
    code: 'SESSION_100',
    title: 'Speech Champion',
    description: 'Complete 100 speech therapy sessions',
    category: 'SESSIONS',
    icon: 'crown',
    requirement: { type: 'sessions_completed', target: 100 },
    xpReward: 1000,
    starsReward: 50,
  },
  // Accuracy achievements
  {
    code: 'PERFECT_SESSION',
    title: 'Perfect Practice',
    description: 'Get 100% accuracy in a session',
    category: 'ACCURACY',
    icon: 'sparkle',
    requirement: { type: 'perfect_sessions', target: 1 },
    xpReward: 75,
    starsReward: 5,
  },
  {
    code: 'PERFECT_5',
    title: 'Consistency Star',
    description: 'Get 5 perfect sessions',
    category: 'ACCURACY',
    icon: 'star-filled',
    requirement: { type: 'perfect_sessions', target: 5 },
    xpReward: 200,
    starsReward: 10,
  },
  {
    code: 'PERFECT_20',
    title: 'Accuracy Master',
    description: 'Get 20 perfect sessions',
    category: 'ACCURACY',
    icon: 'diamond',
    requirement: { type: 'perfect_sessions', target: 20 },
    xpReward: 500,
    starsReward: 25,
  },
  // Goal achievements
  {
    code: 'FIRST_GOAL',
    title: 'Goal Getter',
    description: 'Master your first speech goal',
    category: 'GOALS',
    icon: 'flag',
    requirement: { type: 'goals_mastered', target: 1 },
    xpReward: 150,
    starsReward: 10,
  },
  {
    code: 'GOAL_5',
    title: 'Goal Crusher',
    description: 'Master 5 speech goals',
    category: 'GOALS',
    icon: 'mountain',
    requirement: { type: 'goals_mastered', target: 5 },
    xpReward: 400,
    starsReward: 20,
  },
  {
    code: 'GOAL_10',
    title: 'Goal Champion',
    description: 'Master 10 speech goals',
    category: 'GOALS',
    icon: 'trophy-gold',
    requirement: { type: 'goals_mastered', target: 10 },
    xpReward: 750,
    starsReward: 40,
  },
  // Home practice achievements
  {
    code: 'HOME_PRACTICE_START',
    title: 'Home Helper',
    description: 'Complete your first home practice assignment',
    category: 'HOME_PRACTICE',
    icon: 'home',
    requirement: { type: 'home_practice_completed', target: 1 },
    xpReward: 50,
    starsReward: 3,
  },
  {
    code: 'HOME_PRACTICE_10',
    title: 'Practice Pro',
    description: 'Complete 10 home practice assignments',
    category: 'HOME_PRACTICE',
    icon: 'clipboard-check',
    requirement: { type: 'home_practice_completed', target: 10 },
    xpReward: 200,
    starsReward: 10,
  },
  {
    code: 'PRACTICE_MINUTES_60',
    title: 'Hour Hero',
    description: 'Practice for a total of 60 minutes at home',
    category: 'HOME_PRACTICE',
    icon: 'clock',
    requirement: { type: 'total_practice_minutes', target: 60 },
    xpReward: 100,
    starsReward: 5,
  },
  {
    code: 'PRACTICE_MINUTES_300',
    title: 'Practice Champion',
    description: 'Practice for a total of 5 hours at home',
    category: 'HOME_PRACTICE',
    icon: 'hourglass',
    requirement: { type: 'total_practice_minutes', target: 300 },
    xpReward: 400,
    starsReward: 20,
  },
  // Streak achievements
  {
    code: 'STREAK_3',
    title: 'Getting in Rhythm',
    description: 'Practice 3 days in a row',
    category: 'STREAKS',
    icon: 'fire',
    requirement: { type: 'practice_streak', target: 3 },
    xpReward: 75,
    starsReward: 5,
  },
  {
    code: 'STREAK_7',
    title: 'Week Warrior',
    description: 'Practice 7 days in a row',
    category: 'STREAKS',
    icon: 'flame',
    requirement: { type: 'practice_streak', target: 7 },
    xpReward: 200,
    starsReward: 15,
  },
  {
    code: 'STREAK_14',
    title: 'Fortnight Fighter',
    description: 'Practice 14 days in a row',
    category: 'STREAKS',
    icon: 'rocket',
    requirement: { type: 'practice_streak', target: 14 },
    xpReward: 400,
    starsReward: 25,
  },
  {
    code: 'STREAK_30',
    title: 'Monthly Master',
    description: 'Practice 30 days in a row',
    category: 'STREAKS',
    icon: 'crown-gold',
    requirement: { type: 'practice_streak', target: 30 },
    xpReward: 1000,
    starsReward: 60,
  },
  // Sound mastery achievements
  {
    code: 'SOUND_MASTER_1',
    title: 'Sound Explorer',
    description: 'Master your first target sound',
    category: 'SOUNDS',
    icon: 'volume-up',
    requirement: { type: 'sounds_mastered', target: 1 },
    xpReward: 100,
    starsReward: 5,
  },
  {
    code: 'SOUND_MASTER_5',
    title: 'Sound Collector',
    description: 'Master 5 target sounds',
    category: 'SOUNDS',
    icon: 'music-note',
    requirement: { type: 'sounds_mastered', target: 5 },
    xpReward: 300,
    starsReward: 15,
  },
  {
    code: 'SOUND_MASTER_10',
    title: 'Sound Master',
    description: 'Master 10 target sounds',
    category: 'SOUNDS',
    icon: 'speaker',
    requirement: { type: 'sounds_mastered', target: 10 },
    xpReward: 600,
    starsReward: 30,
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// LEVEL SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

// XP thresholds for each level (designed for speech therapy pacing)
const LEVEL_THRESHOLDS = [
  0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, // 1-10
  3250, 3850, 4500, 5200, 6000, 6900, 7900, 9000, 10200, 11500, // 11-20
  13000, 14700, 16600, 18700, 21000, 23500, 26200, 29100, 32200, 35500, // 21-30
];

function calculateLevel(totalXp: number): { level: number; xpToNextLevel: number } {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }

  const nextLevelXp =
    level < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[level] : LEVEL_THRESHOLDS[level - 1] + 5000;
  return {
    level,
    xpToNextLevel: nextLevelXp - totalXp,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STORAGE (Would be Prisma in production)
// ══════════════════════════════════════════════════════════════════════════════

interface RewardData {
  totalXp: number;
  currentLevel: number;
  totalStars: number;
  currentPracticeStreak: number;
  longestPracticeStreak: number;
  lastPracticeDate?: Date;
  sessionsCompleted: number;
  perfectSessions: number;
  totalPracticeMinutes: number;
  homePracticeCompleted: number;
  goalsMastered: number;
  soundsMastered: string[];
}

interface AchievementData {
  currentProgress: number;
  targetProgress: number;
  isCompleted: boolean;
  completedAt?: Date;
}

const learnerRewards = new Map<string, RewardData>();
const learnerAchievements = new Map<string, Map<string, AchievementData>>();
const milestoneHistory: Array<{
  tenantId: string;
  learnerId: string;
  milestone: Milestone;
  achievedAt: Date;
}> = [];

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

function getKey(tenantId: string, learnerId: string): string {
  return `${tenantId}:${learnerId}`;
}

function getRewards(tenantId: string, learnerId: string): RewardData {
  const key = getKey(tenantId, learnerId);
  if (!learnerRewards.has(key)) {
    learnerRewards.set(key, {
      totalXp: 0,
      currentLevel: 1,
      totalStars: 0,
      currentPracticeStreak: 0,
      longestPracticeStreak: 0,
      sessionsCompleted: 0,
      perfectSessions: 0,
      totalPracticeMinutes: 0,
      homePracticeCompleted: 0,
      goalsMastered: 0,
      soundsMastered: [],
    });
  }
  return learnerRewards.get(key)!;
}

function getAchievements(tenantId: string, learnerId: string): Map<string, AchievementData> {
  const key = getKey(tenantId, learnerId);
  if (!learnerAchievements.has(key)) {
    const achievements = new Map<string, AchievementData>();
    for (const def of SPEECH_ACHIEVEMENTS) {
      achievements.set(def.code, {
        currentProgress: 0,
        targetProgress: def.requirement.target,
        isCompleted: false,
      });
    }
    learnerAchievements.set(key, achievements);
  }
  return learnerAchievements.get(key)!;
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
 * Award rewards for completing a therapy session
 */
export async function awardSessionReward(
  tenantId: string,
  learnerId: string,
  sessionAccuracy: number,
  durationMin: number
): Promise<SpeechRewardResult> {
  const rewards = getRewards(tenantId, learnerId);
  const today = new Date();

  let xpEarned = 0;
  let starsEarned = 0;
  const achievementsUnlocked: UnlockedAchievement[] = [];
  const milestones: Milestone[] = [];

  // Base session reward
  xpEarned += 30;
  starsEarned += 1;
  rewards.sessionsCompleted++;

  // Accuracy bonus
  if (sessionAccuracy >= 0.9) {
    xpEarned += 30;
    starsEarned += 2;
  } else if (sessionAccuracy >= 0.8) {
    xpEarned += 20;
    starsEarned += 1;
  } else if (sessionAccuracy >= 0.7) {
    xpEarned += 10;
  }

  // Perfect session tracking
  const isPerfect = sessionAccuracy >= 0.98;
  if (isPerfect) {
    rewards.perfectSessions++;
    xpEarned += 25;
    starsEarned += 3;
    milestones.push({
      type: 'PERFECT_SESSION',
      title: 'Perfect Session!',
      message: "Amazing! You nailed every word perfectly!",
      xpReward: 25,
      starsReward: 3,
    });
  }

  // Duration bonus
  if (durationMin >= 30) {
    xpEarned += 20;
    starsEarned += 1;
  } else if (durationMin >= 15) {
    xpEarned += 10;
  }

  // Update streak
  let streakBonus = 0;
  let isNewStreak = false;

  if (!rewards.lastPracticeDate || !isToday(rewards.lastPracticeDate)) {
    if (rewards.lastPracticeDate && isYesterday(rewards.lastPracticeDate)) {
      rewards.currentPracticeStreak++;
      isNewStreak = true;
    } else if (!rewards.lastPracticeDate || !isYesterday(rewards.lastPracticeDate)) {
      // Streak broken or new start
      rewards.currentPracticeStreak = 1;
      isNewStreak = true;
    }
    rewards.lastPracticeDate = today;
  }

  // Update longest streak
  if (rewards.currentPracticeStreak > rewards.longestPracticeStreak) {
    rewards.longestPracticeStreak = rewards.currentPracticeStreak;
  }

  // Streak bonus (every 3 days)
  if (rewards.currentPracticeStreak >= 3 && rewards.currentPracticeStreak % 3 === 0) {
    streakBonus = Math.min(50, rewards.currentPracticeStreak * 3);
    xpEarned += streakBonus;
    starsEarned += Math.floor(streakBonus / 15);
    milestones.push({
      type: 'STREAK_BONUS',
      title: `${rewards.currentPracticeStreak} Day Streak!`,
      message: `Keep it up! You've practiced ${rewards.currentPracticeStreak} days in a row!`,
      xpReward: streakBonus,
      starsReward: Math.floor(streakBonus / 15),
    });
  }

  // Check achievements
  const unlocked = checkAndUnlockAchievements(tenantId, learnerId, rewards);
  achievementsUnlocked.push(...unlocked);

  // Add achievement rewards
  for (const achievement of unlocked) {
    xpEarned += achievement.xpReward;
    starsEarned += achievement.starsReward;
  }

  // Update totals
  rewards.totalXp += xpEarned;
  rewards.totalStars += starsEarned;

  // Check for level up
  const levelInfo = calculateLevel(rewards.totalXp);
  const leveledUp = levelInfo.level > rewards.currentLevel;
  if (leveledUp) {
    milestones.push({
      type: 'LEVEL_UP',
      title: `Level ${levelInfo.level}!`,
      message: `Congratulations! You reached Level ${levelInfo.level}!`,
      xpReward: 0,
      starsReward: 5,
    });
    starsEarned += 5;
    rewards.totalStars += 5;
  }
  rewards.currentLevel = levelInfo.level;

  return {
    xpEarned,
    starsEarned,
    newTotal: {
      xp: rewards.totalXp,
      stars: rewards.totalStars,
      level: rewards.currentLevel,
    },
    leveledUp,
    newLevel: leveledUp ? levelInfo.level : undefined,
    achievementsUnlocked,
    milestones,
    streakInfo: {
      currentStreak: rewards.currentPracticeStreak,
      isNewStreak,
      streakBonus,
    },
  };
}

/**
 * Award rewards for completing home practice
 */
export async function awardHomePracticeReward(
  tenantId: string,
  learnerId: string,
  practiceMinutes: number
): Promise<SpeechRewardResult> {
  const rewards = getRewards(tenantId, learnerId);

  let xpEarned = 15;
  let starsEarned = 1;
  const achievementsUnlocked: UnlockedAchievement[] = [];
  const milestones: Milestone[] = [];

  rewards.homePracticeCompleted++;
  rewards.totalPracticeMinutes += practiceMinutes;

  // Time-based bonus
  if (practiceMinutes >= 15) {
    xpEarned += 15;
    starsEarned += 1;
  } else if (practiceMinutes >= 10) {
    xpEarned += 10;
  }

  // Update streak
  const today = new Date();
  let streakBonus = 0;
  let isNewStreak = false;

  if (!rewards.lastPracticeDate || !isToday(rewards.lastPracticeDate)) {
    if (rewards.lastPracticeDate && isYesterday(rewards.lastPracticeDate)) {
      rewards.currentPracticeStreak++;
      isNewStreak = true;
    } else {
      rewards.currentPracticeStreak = 1;
      isNewStreak = true;
    }
    rewards.lastPracticeDate = today;
  }

  if (rewards.currentPracticeStreak > rewards.longestPracticeStreak) {
    rewards.longestPracticeStreak = rewards.currentPracticeStreak;
  }

  // Check achievements
  const unlocked = checkAndUnlockAchievements(tenantId, learnerId, rewards);
  achievementsUnlocked.push(...unlocked);

  for (const achievement of unlocked) {
    xpEarned += achievement.xpReward;
    starsEarned += achievement.starsReward;
  }

  rewards.totalXp += xpEarned;
  rewards.totalStars += starsEarned;

  const levelInfo = calculateLevel(rewards.totalXp);
  const leveledUp = levelInfo.level > rewards.currentLevel;
  rewards.currentLevel = levelInfo.level;

  return {
    xpEarned,
    starsEarned,
    newTotal: {
      xp: rewards.totalXp,
      stars: rewards.totalStars,
      level: rewards.currentLevel,
    },
    leveledUp,
    newLevel: leveledUp ? levelInfo.level : undefined,
    achievementsUnlocked,
    milestones,
    streakInfo: {
      currentStreak: rewards.currentPracticeStreak,
      isNewStreak,
      streakBonus,
    },
  };
}

/**
 * Award rewards for mastering a goal
 */
export async function awardGoalMastered(
  tenantId: string,
  learnerId: string,
  goalDescription: string,
  targetSounds: string[]
): Promise<SpeechRewardResult> {
  const rewards = getRewards(tenantId, learnerId);

  let xpEarned = 200;
  let starsEarned = 15;
  const achievementsUnlocked: UnlockedAchievement[] = [];
  const milestones: Milestone[] = [];

  rewards.goalsMastered++;

  // Add newly mastered sounds
  for (const sound of targetSounds) {
    if (!rewards.soundsMastered.includes(sound)) {
      rewards.soundsMastered.push(sound);
      milestones.push({
        type: 'SOUND_MASTERED',
        title: `Sound Mastered: "${sound}"`,
        message: `You've mastered the "${sound}" sound!`,
        xpReward: 50,
        starsReward: 3,
      });
      xpEarned += 50;
      starsEarned += 3;
    }
  }

  milestones.push({
    type: 'GOAL_MASTERED',
    title: 'Goal Achieved!',
    message: goalDescription.substring(0, 100),
    xpReward: 200,
    starsReward: 15,
  });

  // Check achievements
  const unlocked = checkAndUnlockAchievements(tenantId, learnerId, rewards);
  achievementsUnlocked.push(...unlocked);

  for (const achievement of unlocked) {
    xpEarned += achievement.xpReward;
    starsEarned += achievement.starsReward;
  }

  rewards.totalXp += xpEarned;
  rewards.totalStars += starsEarned;

  const levelInfo = calculateLevel(rewards.totalXp);
  const leveledUp = levelInfo.level > rewards.currentLevel;
  rewards.currentLevel = levelInfo.level;

  return {
    xpEarned,
    starsEarned,
    newTotal: {
      xp: rewards.totalXp,
      stars: rewards.totalStars,
      level: rewards.currentLevel,
    },
    leveledUp,
    newLevel: leveledUp ? levelInfo.level : undefined,
    achievementsUnlocked,
    milestones,
    streakInfo: {
      currentStreak: rewards.currentPracticeStreak,
      isNewStreak: false,
      streakBonus: 0,
    },
  };
}

/**
 * Check and unlock achievements
 */
function checkAndUnlockAchievements(
  tenantId: string,
  learnerId: string,
  rewards: RewardData
): UnlockedAchievement[] {
  const achievements = getAchievements(tenantId, learnerId);
  const unlocked: UnlockedAchievement[] = [];

  for (const def of SPEECH_ACHIEVEMENTS) {
    const achievement = achievements.get(def.code)!;
    if (achievement.isCompleted) continue;

    let progress = 0;
    switch (def.requirement.type) {
      case 'sessions_completed':
        progress = rewards.sessionsCompleted;
        break;
      case 'perfect_sessions':
        progress = rewards.perfectSessions;
        break;
      case 'goals_mastered':
        progress = rewards.goalsMastered;
        break;
      case 'home_practice_completed':
        progress = rewards.homePracticeCompleted;
        break;
      case 'total_practice_minutes':
        progress = rewards.totalPracticeMinutes;
        break;
      case 'practice_streak':
        progress = rewards.currentPracticeStreak;
        break;
      case 'sounds_mastered':
        progress = rewards.soundsMastered.length;
        break;
    }

    achievement.currentProgress = progress;

    if (progress >= def.requirement.target && !achievement.isCompleted) {
      achievement.isCompleted = true;
      achievement.completedAt = new Date();

      unlocked.push({
        code: def.code,
        title: def.title,
        description: def.description,
        category: def.category,
        xpReward: def.xpReward,
        starsReward: def.starsReward,
        icon: def.icon,
      });
    }
  }

  return unlocked;
}

/**
 * Get learner's progress summary
 */
export function getProgressSummary(tenantId: string, learnerId: string): SpeechProgressSummary {
  const rewards = getRewards(tenantId, learnerId);

  // Check if streak is still valid
  if (rewards.lastPracticeDate && !isToday(rewards.lastPracticeDate) && !isYesterday(rewards.lastPracticeDate)) {
    rewards.currentPracticeStreak = 0;
  }

  return {
    totalXp: rewards.totalXp,
    currentLevel: rewards.currentLevel,
    totalStars: rewards.totalStars,
    currentStreak: rewards.currentPracticeStreak,
    longestStreak: rewards.longestPracticeStreak,
    sessionsCompleted: rewards.sessionsCompleted,
    perfectSessions: rewards.perfectSessions,
    goalsMastered: rewards.goalsMastered,
    soundsMastered: rewards.soundsMastered,
    totalPracticeMinutes: rewards.totalPracticeMinutes,
  };
}

/**
 * Get achievement progress
 */
export function getAchievementProgress(
  tenantId: string,
  learnerId: string
): AchievementProgress[] {
  const achievements = getAchievements(tenantId, learnerId);
  const rewards = getRewards(tenantId, learnerId);

  // Update progress
  checkAndUnlockAchievements(tenantId, learnerId, rewards);

  const result: AchievementProgress[] = [];

  for (const def of SPEECH_ACHIEVEMENTS) {
    const achievement = achievements.get(def.code)!;
    result.push({
      code: def.code,
      title: def.title,
      description: def.description,
      category: def.category,
      icon: def.icon,
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
 * Get celebration message based on achievement
 */
export function getCelebrationMessage(achievement: UnlockedAchievement): string {
  const messages: Record<string, string[]> = {
    SESSIONS: [
      "You're building great habits!",
      'Practice makes progress!',
      'Every session makes you stronger!',
    ],
    ACCURACY: [
      "Your pronunciation is getting clearer!",
      "Amazing accuracy! You're doing great!",
      'Your hard work is paying off!',
    ],
    GOALS: [
      "You did it! Goal achieved!",
      'Another goal mastered! Keep going!',
      "You're making incredible progress!",
    ],
    STREAKS: [
      "You're on fire! Keep the streak going!",
      'Consistency is key, and you have it!',
      "Day after day, you're getting better!",
    ],
    SOUNDS: [
      'That sound is yours now!',
      "You've conquered another sound!",
      'Your speech is clearer than ever!',
    ],
    HOME_PRACTICE: [
      'Practice at home makes perfect!',
      "You're a home practice champion!",
      'Every minute of practice counts!',
    ],
  };

  const categoryMessages = messages[achievement.category] || [
    'Great job!',
    'Well done!',
    'Keep it up!',
  ];
  return categoryMessages[Math.floor(Math.random() * categoryMessages.length)];
}
