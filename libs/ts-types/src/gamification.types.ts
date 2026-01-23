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

export type AchievementCategory =
  | 'lessons'
  | 'streaks'
  | 'xp'
  | 'mastery'
  | 'social'
  | 'special'
  | 'secret';
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

export type ShopCategory =
  | 'avatars'
  | 'frames'
  | 'backgrounds'
  | 'effects'
  | 'boosters'
  | 'freezes'
  | 'titles';

export interface XPTransaction {
  id: string;
  amount: number;
  activity: string;
  description: string;
  multiplier?: number;
  createdAt: string;
}

export interface GamificationNotification {
  type:
    | 'xp_awarded'
    | 'level_up'
    | 'achievement_earned'
    | 'streak_milestone'
    | 'challenge_completed'
    | 'daily_goal_completed'
    | 'break_reminder'
    | 'rank_change';
  data: Record<string, unknown>;
}

export interface CelebrationConfig {
  type: 'confetti' | 'fireworks' | 'stars' | 'levelUp' | 'achievement';
  duration?: number;
  intensity?: 'low' | 'medium' | 'high';
  message?: string;
  icon?: string;
}

// ============================================================================
// Team & Social Types
// ============================================================================

export interface Team {
  id: string;
  name: string;
  description: string;
  avatarUrl?: string;
  type: TeamType;
  schoolId?: string;
  classId?: string;
  totalXp: number;
  weeklyXp: number;
  monthlyXp: number;
  level: number;
  rank?: number;
  memberCount: number;
  maxMembers: number;
  isPublic: boolean;
  createdAt: string;
  createdBy: string;
}

export type TeamType = 'classroom' | 'school' | 'cross_school';

export interface TeamMember {
  id: string;
  teamId: string;
  studentId: string;
  displayName: string;
  avatarUrl?: string;
  role: TeamMemberRole;
  contributedXp: number;
  weeklyContribution: number;
  level?: number;
  joinedAt: string;
}

export type TeamMemberRole = 'owner' | 'captain' | 'member';

export interface TeamDetails extends Team {
  members: TeamMember[];
  competitions: CompetitionStanding[];
  recentActivity: TeamActivity[];
}

export interface TeamActivity {
  id: string;
  type: 'xp_earned' | 'member_joined' | 'achievement' | 'rank_change' | 'competition_result';
  description: string;
  memberName?: string;
  amount?: number;
  timestamp: string;
}

export interface TeamInvite {
  id: string;
  teamId: string;
  teamName: string;
  invitedBy: string;
  inviterName: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: string;
  createdAt: string;
}

// ============================================================================
// Competition Types
// ============================================================================

export interface Competition {
  id: string;
  name: string;
  description: string;
  type: CompetitionType;
  category: CompetitionCategory;
  duration: CompetitionDuration;
  status: CompetitionStatus;
  startDate: string;
  endDate: string;
  minParticipants?: number;
  maxParticipants?: number;
  currentParticipants: number;
  minLevel?: number;
  maxLevel?: number;
  schoolId?: string;
  isPublic: boolean;
  autoJoin: boolean;
  prizes: CompetitionPrize[];
  createdBy: string;
  createdAt: string;
}

export type CompetitionType = 'individual' | 'team' | 'class' | 'school';
export type CompetitionCategory =
  | 'xp_earned'
  | 'lessons_completed'
  | 'reading_minutes'
  | 'math_problems'
  | 'streak_days'
  | 'perfect_scores';
export type CompetitionDuration = 'daily' | 'weekly' | 'seasonal';
export type CompetitionStatus = 'upcoming' | 'active' | 'ended' | 'cancelled';

export interface CompetitionPrize {
  rank: number;
  xp?: number;
  coins?: number;
  gems?: number;
  badge?: string;
  title?: string;
}

export interface CompetitionParticipant {
  id: string;
  competitionId: string;
  participantId: string;
  participantType: CompetitionType;
  participantName: string;
  avatarUrl?: string;
  score: number;
  rank: number;
  previousRank?: number;
  joinedAt: string;
}

export interface CompetitionStanding {
  competitionId: string;
  competitionName: string;
  competitionType: CompetitionType;
  rank: number;
  score: number;
  totalParticipants: number;
  timeRemaining: string;
  endsAt: string;
}

export interface CompetitionDetails extends Competition {
  leaderboard: CompetitionParticipant[];
  playerStanding?: CompetitionParticipant;
  isParticipating: boolean;
}

// ============================================================================
// Leaderboard Types (Extended)
// ============================================================================

export interface Leaderboard {
  id: string;
  type: LeaderboardType;
  scope: LeaderboardScope;
  period: LeaderboardPeriod;
  scopeId?: string;
  entries: LeaderboardEntry[];
  total: number;
  playerRank?: number;
  updatedAt: string;
}

export type LeaderboardType = 'xp' | 'lessons' | 'streak' | 'achievements';

export interface LeaderboardFilters {
  scope: LeaderboardScope;
  period: LeaderboardPeriod;
  type?: LeaderboardType;
  schoolId?: string;
  classId?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Achievement Types (Extended)
// ============================================================================

export interface AchievementCriteria {
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

export interface AchievementUnlockEvent {
  achievementId: string;
  achievement: Achievement;
  unlockedAt: string;
  celebration: CelebrationConfig;
}

// ============================================================================
// Privacy & Settings Types
// ============================================================================

export interface GamificationPrivacySettings {
  showOnLeaderboard: boolean;
  showProfileToOthers: boolean;
  allowTeamInvites: boolean;
  showRealName: boolean;
  showAchievements: boolean;
  showStreak: boolean;
  allowCompetitions: boolean;
}

export interface GamificationSettings {
  celebrationsEnabled: boolean;
  soundEnabled: boolean;
  dailyReminders: boolean;
  weeklyReportEnabled: boolean;
  autoUseFreeze: boolean;
  privacy: GamificationPrivacySettings;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface GamificationAnalytics {
  studentId: string;
  period: 'daily' | 'weekly' | 'monthly';
  xpEarned: number;
  lessonsCompleted: number;
  achievementsUnlocked: number;
  streakDays: number;
  competitionsJoined: number;
  competitionsWon: number;
  teamContributions: number;
  leaderboardPositionChange: number;
  engagementScore: number;
  timestamp: string;
}

export interface EngagementMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  averageSessionLength: number;
  achievementUnlockRate: number;
  leaderboardParticipationRate: number;
  competitionEngagementRate: number;
  teamJoinRate: number;
  streakRetentionRate: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface GamificationDashboard {
  profile: PlayerProfile;
  streak: Streak;
  dailyProgress: DailyProgress;
  challenges: Challenge[];
  recentAchievements: Achievement[];
  leaderboardRank?: number;
  team?: Team;
  activeCompetitions: CompetitionStanding[];
}

export interface TeamListResponse {
  teams: Team[];
  total: number;
  hasMore: boolean;
}

export interface CompetitionListResponse {
  competitions: Competition[];
  total: number;
  hasMore: boolean;
}

export interface AchievementListResponse {
  achievements: Achievement[];
  earned: number;
  total: number;
  percentage: number;
}
