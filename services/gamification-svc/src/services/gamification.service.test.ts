/**
 * Unit Tests for Gamification Service (Progress Tracking)
 *
 * Tests for:
 * - XP awarding system
 * - Level progression
 * - Player profile management
 * - Streak tracking
 * - Daily goals
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockPrismaPlayerProfile = {
  findUnique: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};

const mockPrismaXPTransaction = {
  create: vi.fn(),
  findMany: vi.fn(),
  aggregate: vi.fn(),
};

const mockPrismaDailyProgress = {
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  upsert: vi.fn(),
};

vi.mock('../prisma.js', () => ({
  prisma: {
    playerProfile: mockPrismaPlayerProfile,
    xpTransaction: mockPrismaXPTransaction,
    dailyProgress: mockPrismaDailyProgress,
  },
}));

const mockEventEmitter = {
  emit: vi.fn(),
};

vi.mock('../events/event-emitter.js', () => ({
  eventEmitter: mockEventEmitter,
}));

vi.mock('./achievement.service.js', () => ({
  achievementService: {
    checkAndAward: vi.fn(),
  },
}));

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface PlayerProfile {
  id: string;
  studentId: string;
  totalXp: number;
  level: number;
  currentLevelXp: number;
  coins: number;
  gems: number;
  streakDays: number;
  longestStreak: number;
  dailyXpGoal: number;
  lessonsCompleted: number;
  quizzesCompleted: number;
  perfectScores: number;
  totalTimeMinutes: number;
  settings: {
    showOnLeaderboard: boolean;
    celebrationsEnabled: boolean;
    soundEnabled: boolean;
    dailyReminders: boolean;
  };
  lastActiveDate?: Date;
}

interface LevelConfig {
  level: number;
  xpRequired: number;
  title: string;
  color: string;
}

interface XPTransaction {
  id: string;
  studentId: string;
  amount: number;
  activityType: string;
  sourceId?: string;
  timestamp: Date;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const XP_AWARDS: Record<string, number> = {
  lesson_started: 5,
  lesson_completed: 25,
  lesson_perfect_score: 50,
  quiz_completed: 30,
  quiz_passed: 20,
  quiz_perfect: 100,
  daily_login: 5,
  daily_goal_met: 25,
  streak_maintained: 10,
  skill_mastered: 75,
};

const LEVEL_CONFIG: LevelConfig[] = [
  { level: 1, xpRequired: 0, title: 'Novice Learner', color: '#9E9E9E' },
  { level: 2, xpRequired: 100, title: 'Curious Explorer', color: '#8BC34A' },
  { level: 3, xpRequired: 250, title: 'Knowledge Seeker', color: '#4CAF50' },
  { level: 4, xpRequired: 500, title: 'Rising Star', color: '#00BCD4' },
  { level: 5, xpRequired: 1000, title: 'Dedicated Scholar', color: '#2196F3' },
  { level: 6, xpRequired: 1750, title: 'Brilliant Mind', color: '#3F51B5' },
  { level: 7, xpRequired: 2750, title: 'Master Student', color: '#9C27B0' },
  { level: 8, xpRequired: 4000, title: 'Learning Champion', color: '#E91E63' },
  { level: 9, xpRequired: 5500, title: 'Knowledge Wizard', color: '#FF5722' },
  { level: 10, xpRequired: 7500, title: 'Legendary Learner', color: '#FFD700' },
];

// =============================================================================
// GAMIFICATION SERVICE (Simplified for testing)
// =============================================================================

class GamificationService {
  // Calculate level from total XP
  calculateLevel(totalXp: number): { level: number; currentLevelXp: number; xpToNextLevel: number } {
    let level = 1;
    let currentLevelXp = totalXp;

    for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
      if (totalXp >= LEVEL_CONFIG[i].xpRequired) {
        level = LEVEL_CONFIG[i].level;
        currentLevelXp = totalXp - LEVEL_CONFIG[i].xpRequired;
        break;
      }
    }

    const nextLevel = LEVEL_CONFIG.find((l) => l.level === level + 1);
    const xpToNextLevel = nextLevel
      ? nextLevel.xpRequired - totalXp
      : 0;

    return { level, currentLevelXp, xpToNextLevel };
  }

  // Get level info
  getLevelInfo(level: number): LevelConfig | undefined {
    return LEVEL_CONFIG.find((l) => l.level === level);
  }

  // Get or create player profile
  async getPlayerProfile(studentId: string): Promise<PlayerProfile> {
    let profile = await mockPrismaPlayerProfile.findUnique({
      where: { studentId },
    });

    if (!profile) {
      profile = await mockPrismaPlayerProfile.create({
        data: {
          studentId,
          totalXp: 0,
          level: 1,
          currentLevelXp: 0,
          coins: 0,
          gems: 0,
          streakDays: 0,
          longestStreak: 0,
          dailyXpGoal: 50,
          lessonsCompleted: 0,
          quizzesCompleted: 0,
          perfectScores: 0,
          totalTimeMinutes: 0,
          settings: {
            showOnLeaderboard: true,
            celebrationsEnabled: true,
            soundEnabled: true,
            dailyReminders: true,
          },
        },
      });
    }

    return profile;
  }

  // Award XP
  async awardXp(
    studentId: string,
    activityType: string,
    sourceId?: string,
    multiplier = 1
  ): Promise<{ xpAwarded: number; levelUp: boolean; newLevel?: number }> {
    const baseXp = XP_AWARDS[activityType] ?? 0;
    const xpAmount = Math.round(baseXp * multiplier);

    if (xpAmount <= 0) {
      return { xpAwarded: 0, levelUp: false };
    }

    const profile = await this.getPlayerProfile(studentId);
    const newTotalXp = profile.totalXp + xpAmount;
    const levelInfo = this.calculateLevel(newTotalXp);
    const levelUp = levelInfo.level > profile.level;

    // Record transaction
    await mockPrismaXPTransaction.create({
      data: {
        studentId,
        amount: xpAmount,
        activityType,
        sourceId,
        timestamp: new Date(),
      },
    });

    // Update profile
    await mockPrismaPlayerProfile.update({
      where: { studentId },
      data: {
        totalXp: newTotalXp,
        level: levelInfo.level,
        currentLevelXp: levelInfo.currentLevelXp,
      },
    });

    // Emit events
    mockEventEmitter.emit('xp:awarded', { studentId, amount: xpAmount, activityType });

    if (levelUp) {
      mockEventEmitter.emit('level:up', { studentId, newLevel: levelInfo.level });
    }

    return {
      xpAwarded: xpAmount,
      levelUp,
      newLevel: levelUp ? levelInfo.level : undefined,
    };
  }

  // Update streak
  async updateStreak(studentId: string): Promise<{ streakDays: number; isNewStreak: boolean }> {
    const profile = await this.getPlayerProfile(studentId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActive = profile.lastActiveDate
      ? new Date(profile.lastActiveDate)
      : null;

    if (lastActive) {
      lastActive.setHours(0, 0, 0, 0);
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let newStreak = profile.streakDays;
    let isNewStreak = false;

    if (!lastActive || lastActive < yesterday) {
      // Streak broken or first activity
      newStreak = 1;
      isNewStreak = true;
    } else if (lastActive.getTime() === yesterday.getTime()) {
      // Continuing streak
      newStreak = profile.streakDays + 1;
    }
    // If lastActive is today, streak unchanged

    const newLongestStreak = Math.max(profile.longestStreak, newStreak);

    await mockPrismaPlayerProfile.update({
      where: { studentId },
      data: {
        streakDays: newStreak,
        longestStreak: newLongestStreak,
        lastActiveDate: new Date(),
      },
    });

    return { streakDays: newStreak, isNewStreak };
  }

  // Check daily goal
  async checkDailyGoal(studentId: string): Promise<{
    goalMet: boolean;
    currentXp: number;
    goalXp: number;
    progress: number;
  }> {
    const profile = await this.getPlayerProfile(studentId);
    const today = new Date().toISOString().split('T')[0];

    // Get today's XP
    const todayXp = await mockPrismaXPTransaction.aggregate({
      where: {
        studentId,
        timestamp: {
          gte: new Date(today),
        },
      },
      _sum: { amount: true },
    });

    const currentXp = todayXp._sum?.amount ?? 0;
    const goalMet = currentXp >= profile.dailyXpGoal;
    const progress = Math.min(100, (currentXp / profile.dailyXpGoal) * 100);

    return {
      goalMet,
      currentXp,
      goalXp: profile.dailyXpGoal,
      progress: Math.round(progress),
    };
  }

  // Update player settings
  async updateSettings(
    studentId: string,
    settings: Partial<PlayerProfile['settings']>
  ): Promise<PlayerProfile> {
    const profile = await this.getPlayerProfile(studentId);
    const newSettings = { ...profile.settings, ...settings };

    return mockPrismaPlayerProfile.update({
      where: { studentId },
      data: { settings: newSettings },
    });
  }

  // Record activity
  async recordActivity(
    studentId: string,
    activityType: 'lesson' | 'quiz' | 'time',
    value: number
  ): Promise<void> {
    const updateData: Record<string, unknown> = {};

    switch (activityType) {
      case 'lesson':
        updateData.lessonsCompleted = { increment: value };
        break;
      case 'quiz':
        updateData.quizzesCompleted = { increment: value };
        break;
      case 'time':
        updateData.totalTimeMinutes = { increment: value };
        break;
    }

    await mockPrismaPlayerProfile.update({
      where: { studentId },
      data: updateData,
    });
  }
}

// =============================================================================
// FIXTURES
// =============================================================================

const createMockProfile = (overrides: Partial<PlayerProfile> = {}): PlayerProfile => ({
  id: 'profile-001',
  studentId: 'student-001',
  totalXp: 500,
  level: 4,
  currentLevelXp: 0,
  coins: 100,
  gems: 10,
  streakDays: 5,
  longestStreak: 10,
  dailyXpGoal: 50,
  lessonsCompleted: 20,
  quizzesCompleted: 10,
  perfectScores: 5,
  totalTimeMinutes: 300,
  settings: {
    showOnLeaderboard: true,
    celebrationsEnabled: true,
    soundEnabled: true,
    dailyReminders: true,
  },
  lastActiveDate: new Date(),
  ...overrides,
});

// =============================================================================
// TESTS
// =============================================================================

describe('GamificationService', () => {
  let service: GamificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GamificationService();
  });

  // ===========================================================================
  // LEVEL CALCULATION TESTS
  // ===========================================================================

  describe('calculateLevel', () => {
    it('should return level 1 for 0 XP', () => {
      const result = service.calculateLevel(0);
      expect(result.level).toBe(1);
      expect(result.currentLevelXp).toBe(0);
    });

    it('should return level 2 at 100 XP', () => {
      const result = service.calculateLevel(100);
      expect(result.level).toBe(2);
      expect(result.currentLevelXp).toBe(0);
    });

    it('should calculate XP within level', () => {
      const result = service.calculateLevel(175);
      expect(result.level).toBe(2);
      expect(result.currentLevelXp).toBe(75); // 175 - 100
    });

    it('should return level 5 at 1000 XP', () => {
      const result = service.calculateLevel(1000);
      expect(result.level).toBe(5);
    });

    it('should calculate XP to next level', () => {
      const result = service.calculateLevel(80); // Level 1, 20 XP to level 2
      expect(result.xpToNextLevel).toBe(20);
    });

    it('should handle max level', () => {
      const result = service.calculateLevel(10000);
      expect(result.level).toBe(10);
    });
  });

  // ===========================================================================
  // GET LEVEL INFO TESTS
  // ===========================================================================

  describe('getLevelInfo', () => {
    it('should return level info for valid level', () => {
      const info = service.getLevelInfo(5);
      expect(info).toEqual({
        level: 5,
        xpRequired: 1000,
        title: 'Dedicated Scholar',
        color: '#2196F3',
      });
    });

    it('should return undefined for invalid level', () => {
      const info = service.getLevelInfo(999);
      expect(info).toBeUndefined();
    });
  });

  // ===========================================================================
  // PLAYER PROFILE TESTS
  // ===========================================================================

  describe('getPlayerProfile', () => {
    it('should return existing profile', async () => {
      const mockProfile = createMockProfile();
      mockPrismaPlayerProfile.findUnique.mockResolvedValueOnce(mockProfile);

      const result = await service.getPlayerProfile('student-001');

      expect(result.studentId).toBe('student-001');
      expect(mockPrismaPlayerProfile.create).not.toHaveBeenCalled();
    });

    it('should create new profile if not exists', async () => {
      const newProfile = createMockProfile({ totalXp: 0, level: 1 });
      mockPrismaPlayerProfile.findUnique.mockResolvedValueOnce(null);
      mockPrismaPlayerProfile.create.mockResolvedValueOnce(newProfile);

      const result = await service.getPlayerProfile('new-student');

      expect(mockPrismaPlayerProfile.create).toHaveBeenCalled();
      expect(result.totalXp).toBe(0);
    });
  });

  // ===========================================================================
  // XP AWARDING TESTS
  // ===========================================================================

  describe('awardXp', () => {
    it('should award XP for lesson completion', async () => {
      const profile = createMockProfile({ totalXp: 400, level: 3 });
      mockPrismaPlayerProfile.findUnique.mockResolvedValue(profile);

      const result = await service.awardXp('student-001', 'lesson_completed', 'lesson-001');

      expect(result.xpAwarded).toBe(25);
      expect(mockPrismaXPTransaction.create).toHaveBeenCalled();
      expect(mockPrismaPlayerProfile.update).toHaveBeenCalled();
    });

    it('should trigger level up event', async () => {
      const profile = createMockProfile({ totalXp: 490, level: 3 }); // 10 XP to level 4
      mockPrismaPlayerProfile.findUnique.mockResolvedValue(profile);

      const result = await service.awardXp('student-001', 'lesson_completed'); // +25 XP

      expect(result.levelUp).toBe(true);
      expect(result.newLevel).toBe(4);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'level:up',
        expect.objectContaining({ newLevel: 4 })
      );
    });

    it('should apply XP multiplier', async () => {
      const profile = createMockProfile({ totalXp: 100 });
      mockPrismaPlayerProfile.findUnique.mockResolvedValue(profile);

      const result = await service.awardXp('student-001', 'lesson_completed', undefined, 2);

      expect(result.xpAwarded).toBe(50); // 25 * 2
    });

    it('should return 0 for unknown activity type', async () => {
      const profile = createMockProfile();
      mockPrismaPlayerProfile.findUnique.mockResolvedValue(profile);

      const result = await service.awardXp('student-001', 'unknown_activity');

      expect(result.xpAwarded).toBe(0);
      expect(mockPrismaXPTransaction.create).not.toHaveBeenCalled();
    });

    it('should emit xp:awarded event', async () => {
      const profile = createMockProfile();
      mockPrismaPlayerProfile.findUnique.mockResolvedValue(profile);

      await service.awardXp('student-001', 'quiz_completed', 'quiz-001');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'xp:awarded',
        expect.objectContaining({
          studentId: 'student-001',
          amount: 30,
          activityType: 'quiz_completed',
        })
      );
    });
  });

  // ===========================================================================
  // STREAK TESTS
  // ===========================================================================

  describe('updateStreak', () => {
    it('should start new streak for first activity', async () => {
      const profile = createMockProfile({
        streakDays: 0,
        lastActiveDate: undefined,
      });
      mockPrismaPlayerProfile.findUnique.mockResolvedValueOnce(profile);

      const result = await service.updateStreak('student-001');

      expect(result.streakDays).toBe(1);
      expect(result.isNewStreak).toBe(true);
    });

    it('should continue streak for consecutive days', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const profile = createMockProfile({
        streakDays: 5,
        lastActiveDate: yesterday,
      });
      mockPrismaPlayerProfile.findUnique.mockResolvedValueOnce(profile);

      const result = await service.updateStreak('student-001');

      expect(result.streakDays).toBe(6);
      expect(result.isNewStreak).toBe(false);
    });

    it('should reset streak after gap', async () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const profile = createMockProfile({
        streakDays: 10,
        lastActiveDate: twoDaysAgo,
      });
      mockPrismaPlayerProfile.findUnique.mockResolvedValueOnce(profile);

      const result = await service.updateStreak('student-001');

      expect(result.streakDays).toBe(1);
      expect(result.isNewStreak).toBe(true);
    });

    it('should update longest streak', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const profile = createMockProfile({
        streakDays: 10,
        longestStreak: 10,
        lastActiveDate: yesterday,
      });
      mockPrismaPlayerProfile.findUnique.mockResolvedValueOnce(profile);

      await service.updateStreak('student-001');

      expect(mockPrismaPlayerProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            longestStreak: 11,
          }),
        })
      );
    });
  });

  // ===========================================================================
  // DAILY GOAL TESTS
  // ===========================================================================

  describe('checkDailyGoal', () => {
    it('should return goal not met when under target', async () => {
      const profile = createMockProfile({ dailyXpGoal: 50 });
      mockPrismaPlayerProfile.findUnique.mockResolvedValueOnce(profile);
      mockPrismaXPTransaction.aggregate.mockResolvedValueOnce({
        _sum: { amount: 30 },
      });

      const result = await service.checkDailyGoal('student-001');

      expect(result.goalMet).toBe(false);
      expect(result.currentXp).toBe(30);
      expect(result.goalXp).toBe(50);
      expect(result.progress).toBe(60);
    });

    it('should return goal met when at or above target', async () => {
      const profile = createMockProfile({ dailyXpGoal: 50 });
      mockPrismaPlayerProfile.findUnique.mockResolvedValueOnce(profile);
      mockPrismaXPTransaction.aggregate.mockResolvedValueOnce({
        _sum: { amount: 75 },
      });

      const result = await service.checkDailyGoal('student-001');

      expect(result.goalMet).toBe(true);
      expect(result.progress).toBe(100); // Capped at 100
    });

    it('should handle zero XP for today', async () => {
      const profile = createMockProfile({ dailyXpGoal: 50 });
      mockPrismaPlayerProfile.findUnique.mockResolvedValueOnce(profile);
      mockPrismaXPTransaction.aggregate.mockResolvedValueOnce({
        _sum: { amount: null },
      });

      const result = await service.checkDailyGoal('student-001');

      expect(result.currentXp).toBe(0);
      expect(result.progress).toBe(0);
    });
  });

  // ===========================================================================
  // SETTINGS TESTS
  // ===========================================================================

  describe('updateSettings', () => {
    it('should update player settings', async () => {
      const profile = createMockProfile();
      mockPrismaPlayerProfile.findUnique.mockResolvedValueOnce(profile);
      mockPrismaPlayerProfile.update.mockResolvedValueOnce({
        ...profile,
        settings: { ...profile.settings, showOnLeaderboard: false },
      });

      const result = await service.updateSettings('student-001', {
        showOnLeaderboard: false,
      });

      expect(result.settings.showOnLeaderboard).toBe(false);
    });

    it('should preserve other settings', async () => {
      const profile = createMockProfile();
      mockPrismaPlayerProfile.findUnique.mockResolvedValueOnce(profile);
      mockPrismaPlayerProfile.update.mockImplementationOnce(({ data }) => ({
        ...profile,
        settings: data.settings,
      }));

      await service.updateSettings('student-001', { soundEnabled: false });

      const updateCall = mockPrismaPlayerProfile.update.mock.calls[0][0];
      expect(updateCall.data.settings.celebrationsEnabled).toBe(true);
      expect(updateCall.data.settings.soundEnabled).toBe(false);
    });
  });

  // ===========================================================================
  // ACTIVITY RECORDING TESTS
  // ===========================================================================

  describe('recordActivity', () => {
    it('should increment lessons completed', async () => {
      await service.recordActivity('student-001', 'lesson', 1);

      expect(mockPrismaPlayerProfile.update).toHaveBeenCalledWith({
        where: { studentId: 'student-001' },
        data: { lessonsCompleted: { increment: 1 } },
      });
    });

    it('should increment quizzes completed', async () => {
      await service.recordActivity('student-001', 'quiz', 1);

      expect(mockPrismaPlayerProfile.update).toHaveBeenCalledWith({
        where: { studentId: 'student-001' },
        data: { quizzesCompleted: { increment: 1 } },
      });
    });

    it('should increment time spent', async () => {
      await service.recordActivity('student-001', 'time', 15);

      expect(mockPrismaPlayerProfile.update).toHaveBeenCalledWith({
        where: { studentId: 'student-001' },
        data: { totalTimeMinutes: { increment: 15 } },
      });
    });
  });
});

// =============================================================================
// XP AWARDS CONFIG TESTS
// =============================================================================

describe('XP Awards Configuration', () => {
  it('should have positive XP for all activities', () => {
    Object.entries(XP_AWARDS).forEach(([activity, xp]) => {
      expect(xp).toBeGreaterThan(0);
    });
  });

  it('should award more XP for harder achievements', () => {
    expect(XP_AWARDS.quiz_perfect).toBeGreaterThan(XP_AWARDS.quiz_passed);
    expect(XP_AWARDS.lesson_perfect_score).toBeGreaterThan(XP_AWARDS.lesson_completed);
  });

  it('should have lesson activities defined', () => {
    expect(XP_AWARDS.lesson_started).toBeDefined();
    expect(XP_AWARDS.lesson_completed).toBeDefined();
  });

  it('should have quiz activities defined', () => {
    expect(XP_AWARDS.quiz_completed).toBeDefined();
    expect(XP_AWARDS.quiz_passed).toBeDefined();
  });
});

// =============================================================================
// LEVEL CONFIG TESTS
// =============================================================================

describe('Level Configuration', () => {
  it('should start at level 1 with 0 XP required', () => {
    expect(LEVEL_CONFIG[0].level).toBe(1);
    expect(LEVEL_CONFIG[0].xpRequired).toBe(0);
  });

  it('should have increasing XP requirements', () => {
    for (let i = 1; i < LEVEL_CONFIG.length; i++) {
      expect(LEVEL_CONFIG[i].xpRequired).toBeGreaterThan(LEVEL_CONFIG[i - 1].xpRequired);
    }
  });

  it('should have sequential levels', () => {
    for (let i = 0; i < LEVEL_CONFIG.length; i++) {
      expect(LEVEL_CONFIG[i].level).toBe(i + 1);
    }
  });

  it('should have titles for all levels', () => {
    LEVEL_CONFIG.forEach((config) => {
      expect(config.title).toBeTruthy();
      expect(config.title.length).toBeGreaterThan(0);
    });
  });

  it('should have colors for all levels', () => {
    LEVEL_CONFIG.forEach((config) => {
      expect(config.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});
