/**
 * Gamification Service API Client
 * Connects to gamification-svc microservice for XP, levels, achievements, and progress tracking
 */

// ============================================================================
// Configuration
// ============================================================================

const GAMIFICATION_API_BASE =
  process.env.NEXT_PUBLIC_GAMIFICATION_API_URL || 'http://localhost:4050/api/gamification';

// ============================================================================
// Types
// ============================================================================

export interface PlayerProfile {
  id: string;
  studentId: string;
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
}

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

export interface DailyGoal {
  goal: number;
  current: number;
  progress: number;
  completed: boolean;
  streak: number;
}

export interface Streak {
  currentDays: number;
  longestDays: number;
  todayComplete: boolean;
  freezesAvailable: number;
  nextMilestone: number;
  lastActivityDate: Date | null;
}

export interface ActivityStats {
  completedToday: number;
  totalCompleted: number;
  streak: number;
  totalXp: number;
  level: number;
}

export interface GamificationDashboard {
  profile: PlayerProfile;
  streak: Streak;
  dailyGoal: DailyGoal;
  activeChallenges: ChallengeProgress[];
}

export interface ChallengeProgress {
  challengeId: string;
  currentValue: number;
  targetValue: number;
  percentage: number;
  completed: boolean;
  expiresAt: Date;
}

// ============================================================================
// Helper Functions
// ============================================================================

async function apiRequest<T>(
  endpoint: string,
  studentId: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${GAMIFICATION_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Student-Id': studentId,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gamification API Error: ${response.status} - ${error}`);
  }

  const json = await response.json();
  return json.data as T;
}

// ============================================================================
// Profile APIs
// ============================================================================

/**
 * Get player profile and stats
 */
export async function getPlayerProfile(studentId: string): Promise<PlayerProfile> {
  return apiRequest<PlayerProfile>('/profile', studentId);
}

/**
 * Get full gamification dashboard
 */
export async function getGamificationDashboard(studentId: string): Promise<GamificationDashboard> {
  return apiRequest<GamificationDashboard>('/dashboard', studentId);
}

/**
 * Get daily progress towards goals
 */
export async function getDailyProgress(studentId: string): Promise<DailyGoal> {
  return apiRequest<DailyGoal>('/daily-progress', studentId);
}

// ============================================================================
// XP APIs
// ============================================================================

/**
 * Award XP for completing an activity
 */
export async function awardXP(
  studentId: string,
  activityType: string,
  options?: {
    amount?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<XPTransaction> {
  return apiRequest<XPTransaction>('/xp', studentId, {
    method: 'POST',
    body: JSON.stringify({
      activityType,
      amount: options?.amount,
      metadata: options?.metadata,
    }),
  });
}

/**
 * Get XP transaction history
 */
export async function getXPHistory(
  studentId: string,
  options?: { limit?: number; offset?: number }
): Promise<XPTransaction[]> {
  const params = new URLSearchParams();
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.offset) params.append('offset', options.offset.toString());

  const queryString = params.toString();
  const endpoint = `/xp/history${queryString ? `?${queryString}` : ''}`;

  return apiRequest<XPTransaction[]>(endpoint, studentId);
}

// ============================================================================
// Activity Stats Helper
// ============================================================================

/**
 * Get activity stats for display (converts profile to simpler format)
 */
export async function getActivityStats(studentId: string): Promise<ActivityStats> {
  try {
    const dashboard = await getGamificationDashboard(studentId);

    return {
      completedToday: dashboard.dailyGoal.current > 0 ? Math.floor(dashboard.dailyGoal.current / 25) : 0, // Estimate based on XP
      totalCompleted: dashboard.profile.lessonsCompleted + dashboard.profile.quizzesCompleted,
      streak: dashboard.streak.currentDays,
      totalXp: dashboard.profile.totalXp,
      level: dashboard.profile.level,
    };
  } catch (error) {
    console.error('[Gamification API] Failed to get activity stats:', error);
    // Return default stats on error
    return {
      completedToday: 0,
      totalCompleted: 0,
      streak: 0,
      totalXp: 0,
      level: 1,
    };
  }
}

/**
 * Record activity completion and award XP
 * Maps activity types to appropriate gamification activities
 */
export async function recordActivityCompletion(
  studentId: string,
  activityType: string,
  options?: {
    rating?: number;
    duration?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<XPTransaction | null> {
  // Map regulation activity types to gamification activity types
  const activityMap: Record<string, string> = {
    breathing: 'practice_session',
    grounding: 'practice_session',
    movement: 'practice_session',
    visualization: 'practice_session',
    sensory: 'practice_session',
    sounds: 'practice_session',
    counting: 'practice_session',
    progressive: 'practice_session',
    regulation: 'practice_session',
    skill_practiced: 'skill_practiced',
  };

  const gamificationActivity = activityMap[activityType] || 'practice_session';

  try {
    const transaction = await awardXP(studentId, gamificationActivity, {
      metadata: {
        originalActivityType: activityType,
        rating: options?.rating,
        duration: options?.duration,
        ...options?.metadata,
      },
    });

    return transaction;
  } catch (error) {
    console.error('[Gamification API] Failed to record activity completion:', error);
    return null;
  }
}

// ============================================================================
// Export All
// ============================================================================

export const gamificationApi = {
  // Profile APIs
  getPlayerProfile,
  getGamificationDashboard,
  getDailyProgress,

  // XP APIs
  awardXP,
  getXPHistory,

  // Helper APIs
  getActivityStats,
  recordActivityCompletion,
};

export default gamificationApi;
