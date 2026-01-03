/**
 * Gamification Types for Frontend
 */
export interface PlayerProfile {
    studentId: string;
    totalXP: number;
    level: number;
    levelName: string;
    levelColor: string;
    xpToNextLevel: number;
    xpForCurrentLevel: number;
    progressPercent: number;
    currentStreak: number;
    longestStreak: number;
    coins: number;
    gems: number;
    streakFreezes: number;
    dailyXPGoal: number;
    dailyLessonsGoal: number;
    dailyMinutesGoal: number;
    rank?: number;
    title?: string;
}
export interface DailyProgress {
    xpEarned: number;
    xpGoal: number;
    lessonsCompleted: number;
    lessonsGoal: number;
    minutesLearned: number;
    minutesGoal: number;
    xpCompleted: boolean;
    lessonsCompleted2: boolean;
    minutesCompleted: boolean;
    allGoalsCompleted: boolean;
}
export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    category: AchievementCategory;
    rarity: AchievementRarity;
    xpReward: number;
    threshold?: number;
    isSecret?: boolean;
    earned: boolean;
    earnedAt?: string;
    currentProgress?: number;
    progressPercentage?: number;
}
export type AchievementCategory = 'lessons' | 'streaks' | 'xp' | 'mastery' | 'social' | 'special' | 'secret';
export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export interface Streak {
    current: number;
    longest: number;
    freezesAvailable: number;
    streakAtRisk: boolean;
    lastActivityDate?: string;
    isActive: boolean;
}
export interface StreakDay {
    date: string;
    completed: boolean;
    frozenUsed: boolean;
    xpEarned: number;
}
export interface Challenge {
    id: string;
    type: 'daily' | 'weekly' | 'monthly' | 'class';
    title: string;
    description: string;
    targetType: string;
    targetValue: number;
    currentProgress: number;
    progressPercentage: number;
    xpReward: number;
    coinReward?: number;
    completed: boolean;
    expiresAt: string;
    icon?: string;
}
export interface LeaderboardEntry {
    rank: number;
    studentId: string;
    displayName: string;
    avatarUrl?: string;
    level: number;
    xp: number;
    streak: number;
    isCurrentPlayer?: boolean;
    rankChange?: number;
}
export type LeaderboardScope = 'global' | 'school' | 'class' | 'friends';
export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'allTime';
export interface ShopItem {
    id: string;
    name: string;
    description: string;
    category: ShopCategory;
    type: string;
    imageUrl: string;
    previewUrl?: string;
    price: number;
    currency: 'coins' | 'gems';
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    isLimited?: boolean;
    limitedUntil?: string;
    requiredLevel?: number;
    owned?: boolean;
    equipped?: boolean;
}
export type ShopCategory = 'avatars' | 'frames' | 'backgrounds' | 'effects' | 'boosters' | 'freezes' | 'titles';
export interface XPTransaction {
    id: string;
    amount: number;
    activity: string;
    description: string;
    multiplier?: number;
    createdAt: string;
}
export interface GamificationNotification {
    type: 'xp_awarded' | 'level_up' | 'achievement_earned' | 'streak_milestone' | 'challenge_completed' | 'daily_goal_completed' | 'break_reminder' | 'rank_change';
    data: Record<string, unknown>;
}
export interface CelebrationConfig {
    type: 'confetti' | 'fireworks' | 'stars' | 'levelUp' | 'achievement';
    duration?: number;
    intensity?: 'low' | 'medium' | 'high';
    message?: string;
    icon?: string;
}
//# sourceMappingURL=gamification.types.d.ts.map