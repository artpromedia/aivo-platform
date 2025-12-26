/**
 * Gamification Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Prisma client
const mockPrisma = {
  playerProfile: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  xPTransaction: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  dailyActivity: {
    findFirst: vi.fn(),
    upsert: vi.fn(),
  },
  $transaction: vi.fn((fn) => fn(mockPrisma)),
};

vi.mock('../prisma.js', () => ({
  prisma: mockPrisma,
}));

// Import after mock
const { gamificationService } = await import('../services/gamification.service.js');

describe('GamificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPlayerProfile', () => {
    it('should return existing player profile', async () => {
      const mockProfile = {
        id: 'profile-1',
        studentId: 'student-1',
        level: 5,
        totalXP: 1500,
        currentStreak: 7,
        longestStreak: 14,
        coins: 250,
        gems: 10,
        freezesAvailable: 2,
      };

      mockPrisma.playerProfile.findUnique.mockResolvedValue(mockProfile);

      const profile = await gamificationService.getPlayerProfile('student-1');

      expect(profile).toBeDefined();
      expect(profile?.studentId).toBe('student-1');
      expect(profile?.level).toBe(5);
    });

    it('should create new profile if not exists', async () => {
      mockPrisma.playerProfile.findUnique.mockResolvedValue(null);
      mockPrisma.playerProfile.create.mockResolvedValue({
        id: 'new-profile',
        studentId: 'new-student',
        level: 1,
        totalXP: 0,
        currentStreak: 0,
        longestStreak: 0,
        coins: 0,
        gems: 0,
        freezesAvailable: 0,
      });

      const profile = await gamificationService.getOrCreateProfile('new-student');

      expect(mockPrisma.playerProfile.create).toHaveBeenCalled();
      expect(profile.level).toBe(1);
      expect(profile.totalXP).toBe(0);
    });
  });

  describe('awardXP', () => {
    it('should award XP for valid activity', async () => {
      const mockProfile = {
        id: 'profile-1',
        studentId: 'student-1',
        level: 1,
        totalXP: 50,
        currentStreak: 1,
        longestStreak: 1,
        coins: 0,
        gems: 0,
        freezesAvailable: 0,
      };

      mockPrisma.playerProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.playerProfile.update.mockResolvedValue({
        ...mockProfile,
        totalXP: 100,
      });
      mockPrisma.xPTransaction.create.mockResolvedValue({});
      mockPrisma.dailyActivity.upsert.mockResolvedValue({});

      const result = await gamificationService.awardXP({
        studentId: 'student-1',
        activityType: 'LESSON_COMPLETE',
        resourceId: 'lesson-1',
      });

      expect(result.xpAwarded).toBeGreaterThan(0);
      expect(mockPrisma.xPTransaction.create).toHaveBeenCalled();
    });

    it('should level up when XP threshold is reached', async () => {
      const mockProfile = {
        id: 'profile-1',
        studentId: 'student-1',
        level: 1,
        totalXP: 90, // Close to 100 XP threshold for level 2
        currentStreak: 1,
        longestStreak: 1,
        coins: 0,
        gems: 0,
        freezesAvailable: 0,
      };

      mockPrisma.playerProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.playerProfile.update.mockResolvedValue({
        ...mockProfile,
        totalXP: 140,
        level: 2,
      });
      mockPrisma.xPTransaction.create.mockResolvedValue({});
      mockPrisma.dailyActivity.upsert.mockResolvedValue({});

      const result = await gamificationService.awardXP({
        studentId: 'student-1',
        activityType: 'LESSON_COMPLETE',
        resourceId: 'lesson-1',
      });

      expect(result.leveledUp).toBe(true);
      expect(result.newLevel).toBe(2);
    });

    it('should apply streak bonuses correctly', async () => {
      const mockProfile = {
        id: 'profile-1',
        studentId: 'student-1',
        level: 5,
        totalXP: 1000,
        currentStreak: 7, // 7-day streak = 1.35x bonus
        longestStreak: 7,
        coins: 0,
        gems: 0,
        freezesAvailable: 0,
      };

      mockPrisma.playerProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.playerProfile.update.mockResolvedValue(mockProfile);
      mockPrisma.xPTransaction.create.mockResolvedValue({});
      mockPrisma.dailyActivity.upsert.mockResolvedValue({});

      const result = await gamificationService.awardXP({
        studentId: 'student-1',
        activityType: 'LESSON_COMPLETE',
        resourceId: 'lesson-1',
      });

      // Base XP for LESSON_COMPLETE is 25, with 7-day streak bonus of 1.35x
      expect(result.streakBonus).toBeGreaterThan(0);
    });
  });

  describe('calculateLevel', () => {
    it('should calculate level 1 for 0 XP', () => {
      const level = gamificationService.calculateLevel(0);
      expect(level.level).toBe(1);
      expect(level.title).toBe('Novice Learner');
    });

    it('should calculate level 5 for 1000 XP', () => {
      const level = gamificationService.calculateLevel(1000);
      expect(level.level).toBe(5);
      expect(level.title).toBe('Bright Mind');
    });

    it('should calculate max level for very high XP', () => {
      const level = gamificationService.calculateLevel(100000);
      expect(level.level).toBe(20);
      expect(level.title).toBe('Ultimate Legend');
    });
  });

  describe('getDailyProgress', () => {
    it('should return daily progress with goal percentages', async () => {
      mockPrisma.playerProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        studentId: 'student-1',
        dailyXPGoal: 50,
        dailyLessonGoal: 3,
        dailyMinutesGoal: 30,
      });

      mockPrisma.dailyActivity.findFirst.mockResolvedValue({
        todayXP: 25,
        lessonsCompleted: 1,
        minutesLearned: 15,
      });

      const progress = await gamificationService.getDailyProgress('student-1');

      expect(progress.todayXP).toBe(25);
      expect(progress.dailyGoalXP).toBe(50);
      expect(progress.lessonsCompleted).toBe(1);
    });
  });
});

describe('XP Constants', () => {
  it('should have valid XP awards for all activity types', async () => {
    const { XP_AWARDS } = await import('../services/gamification.service.js');

    expect(XP_AWARDS.LESSON_COMPLETE).toBeDefined();
    expect(XP_AWARDS.QUIZ_PASS).toBeDefined();
    expect(XP_AWARDS.PRACTICE_SESSION).toBeDefined();
    expect(XP_AWARDS.DAILY_LOGIN).toBeDefined();

    // All XP values should be positive
    Object.values(XP_AWARDS).forEach((xp) => {
      expect(xp).toBeGreaterThan(0);
    });
  });

  it('should have valid level thresholds', async () => {
    const { LEVEL_CONFIG } = await import('../services/gamification.service.js');

    expect(LEVEL_CONFIG.length).toBe(20);

    // XP thresholds should be increasing
    for (let i = 1; i < LEVEL_CONFIG.length; i++) {
      expect(LEVEL_CONFIG[i].xpRequired).toBeGreaterThan(
        LEVEL_CONFIG[i - 1].xpRequired
      );
    }
  });
});
