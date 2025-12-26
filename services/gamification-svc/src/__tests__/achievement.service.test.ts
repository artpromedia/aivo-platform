/**
 * Achievement Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma client
const mockPrisma = {
  playerProfile: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  earnedAchievement: {
    findUnique: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  achievementProgress: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    findMany: vi.fn(),
  },
  xPTransaction: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  dailyLogin: {
    count: vi.fn(),
  },
  $transaction: vi.fn((fn) => fn(mockPrisma)),
};

vi.mock('../prisma.js', () => ({
  prisma: mockPrisma,
}));

const { achievementService, ACHIEVEMENT_DEFINITIONS } = await import(
  '../services/achievement.service.js'
);

describe('AchievementService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAchievements', () => {
    it('should return all achievements with earned status', async () => {
      mockPrisma.earnedAchievement.findMany.mockResolvedValue([
        { achievementId: 'first_lesson', earnedAt: new Date() },
        { achievementId: 'streak_3', earnedAt: new Date() },
      ]);

      mockPrisma.achievementProgress.findMany.mockResolvedValue([]);

      const achievements = await achievementService.getAchievements('student-1');

      expect(achievements.length).toBeGreaterThan(0);
      
      const firstLesson = achievements.find((a) => a.id === 'first_lesson');
      expect(firstLesson?.earned).toBe(true);

      const streak7 = achievements.find((a) => a.id === 'streak_7');
      expect(streak7?.earned).toBe(false);
    });

    it('should filter by category', async () => {
      mockPrisma.earnedAchievement.findMany.mockResolvedValue([]);
      mockPrisma.achievementProgress.findMany.mockResolvedValue([]);

      const achievements = await achievementService.getAchievements('student-1', {
        category: 'streak',
      });

      expect(achievements.every((a) => a.category === 'streak')).toBe(true);
    });

    it('should filter earned only', async () => {
      mockPrisma.earnedAchievement.findMany.mockResolvedValue([
        { achievementId: 'first_lesson', earnedAt: new Date() },
      ]);

      mockPrisma.achievementProgress.findMany.mockResolvedValue([]);

      const achievements = await achievementService.getAchievements('student-1', {
        earnedOnly: true,
      });

      expect(achievements.every((a) => a.earned)).toBe(true);
      expect(achievements.length).toBe(1);
    });
  });

  describe('checkAndAwardAchievements', () => {
    it('should award first lesson achievement', async () => {
      mockPrisma.xPTransaction.count.mockResolvedValue(1);
      mockPrisma.earnedAchievement.findUnique.mockResolvedValue(null);
      mockPrisma.earnedAchievement.create.mockResolvedValue({
        id: 'earned-1',
        achievementId: 'first_lesson',
      });
      mockPrisma.playerProfile.update.mockResolvedValue({});

      const awarded = await achievementService.checkAndAwardAchievements('student-1', {
        activityType: 'LESSON_COMPLETE',
      });

      expect(awarded.some((a) => a.id === 'first_lesson')).toBe(true);
    });

    it('should award streak achievements', async () => {
      mockPrisma.earnedAchievement.findUnique.mockResolvedValue(null);
      mockPrisma.earnedAchievement.create.mockResolvedValue({});
      mockPrisma.playerProfile.update.mockResolvedValue({});

      const awarded = await achievementService.checkAndAwardAchievements('student-1', {
        currentStreak: 7,
      });

      const streakAchievements = awarded.filter((a) => a.category === 'streak');
      expect(streakAchievements.length).toBeGreaterThan(0);
    });

    it('should not re-award already earned achievements', async () => {
      mockPrisma.xPTransaction.count.mockResolvedValue(100);
      mockPrisma.earnedAchievement.findUnique.mockResolvedValue({
        id: 'earned-1',
        achievementId: 'lesson_10',
        earnedAt: new Date(),
      });

      const awarded = await achievementService.checkAndAwardAchievements('student-1', {
        activityType: 'LESSON_COMPLETE',
      });

      // Should not contain lesson_10 since it's already earned
      expect(awarded.every((a) => a.id !== 'lesson_10')).toBe(true);
    });
  });

  describe('updateProgress', () => {
    it('should update achievement progress', async () => {
      mockPrisma.achievementProgress.upsert.mockResolvedValue({
        achievementId: 'lesson_100',
        currentProgress: 50,
        targetProgress: 100,
      });

      await achievementService.updateProgress('student-1', 'lesson_100', 50);

      expect(mockPrisma.achievementProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            studentId_achievementId: {
              studentId: 'student-1',
              achievementId: 'lesson_100',
            },
          },
        })
      );
    });
  });
});

describe('Achievement Definitions', () => {
  it('should have unique IDs for all achievements', () => {
    const ids = ACHIEVEMENT_DEFINITIONS.map((a) => a.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it('should have valid rarity values', () => {
    const validRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    
    ACHIEVEMENT_DEFINITIONS.forEach((achievement) => {
      expect(validRarities).toContain(achievement.rarity);
    });
  });

  it('should have positive XP rewards', () => {
    ACHIEVEMENT_DEFINITIONS.forEach((achievement) => {
      expect(achievement.xpReward).toBeGreaterThan(0);
    });
  });

  it('should have tiered achievements in proper order', () => {
    const tieredAchievements = [
      'first_lesson',
      'lesson_10',
      'lesson_50',
      'lesson_100',
      'lesson_500',
    ];

    const lessonAchievements = ACHIEVEMENT_DEFINITIONS.filter((a) =>
      tieredAchievements.includes(a.id)
    );

    // Verify they exist
    expect(lessonAchievements.length).toBe(tieredAchievements.length);

    // Verify XP rewards increase with tier
    for (let i = 1; i < lessonAchievements.length; i++) {
      expect(lessonAchievements[i].xpReward).toBeGreaterThanOrEqual(
        lessonAchievements[i - 1].xpReward
      );
    }
  });
});
