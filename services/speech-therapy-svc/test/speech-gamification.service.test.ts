/**
 * Speech Gamification Service Tests
 *
 * Tests for gamification functionality:
 * - Session rewards
 * - Home practice rewards
 * - Goal mastery rewards
 * - Achievements
 * - Streaks
 * - Level progression
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SpeechGamificationService,
  SPEECH_ACHIEVEMENTS,
  type SpeechRewardResult,
} from '../src/services/speech-gamification.service.js';

// ============================================================================
// Mocks
// ============================================================================

const mockPrisma = {
  speechRewards: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  speechAchievement: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  practiceMilestone: {
    create: vi.fn(),
  },
};

// ============================================================================
// Test Fixtures
// ============================================================================

const TENANT_ID = 'tenant-test-123';
const LEARNER_ID = 'learner-456';

const createMockRewards = (overrides = {}) => ({
  id: 'rewards-123',
  tenantId: TENANT_ID,
  learnerId: LEARNER_ID,
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
  lastPracticeDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe('SpeechGamificationService', () => {
  let service: SpeechGamificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SpeechGamificationService(mockPrisma as any);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Session Rewards
  // ──────────────────────────────────────────────────────────────────────────

  describe('awardSessionReward', () => {
    it('should award base XP and stars for completing a session', async () => {
      const mockRewards = createMockRewards();
      mockPrisma.speechRewards.findUnique.mockResolvedValue(mockRewards);
      mockPrisma.speechRewards.update.mockImplementation(({ data }) => ({
        ...mockRewards,
        ...data,
      }));
      mockPrisma.speechAchievement.findUnique.mockResolvedValue(null);
      mockPrisma.speechAchievement.create.mockImplementation(({ data }) => ({
        id: 'ach-new',
        ...data,
        isCompleted: false,
      }));

      const result = await service.awardSessionReward(
        TENANT_ID,
        LEARNER_ID,
        0.6, // accuracy
        20 // duration
      );

      expect(result.xpEarned).toBeGreaterThanOrEqual(30); // base XP
      expect(result.starsEarned).toBeGreaterThanOrEqual(1); // base star
      expect(result.newTotal.xp).toBeGreaterThan(0);
    });

    it('should award accuracy bonus for high accuracy', async () => {
      const mockRewards = createMockRewards();
      mockPrisma.speechRewards.findUnique.mockResolvedValue(mockRewards);
      mockPrisma.speechRewards.update.mockImplementation(({ data }) => ({
        ...mockRewards,
        ...data,
      }));
      mockPrisma.speechAchievement.findUnique.mockResolvedValue(null);
      mockPrisma.speechAchievement.create.mockImplementation(({ data }) => ({
        id: 'ach-new',
        ...data,
        isCompleted: false,
      }));

      const highAccuracyResult = await service.awardSessionReward(
        TENANT_ID,
        LEARNER_ID,
        0.95, // high accuracy
        20
      );

      const lowAccuracyResult = await service.awardSessionReward(
        TENANT_ID,
        LEARNER_ID,
        0.5, // low accuracy
        20
      );

      expect(highAccuracyResult.xpEarned).toBeGreaterThan(
        lowAccuracyResult.xpEarned
      );
    });

    it('should award perfect session milestone', async () => {
      const mockRewards = createMockRewards();
      mockPrisma.speechRewards.findUnique.mockResolvedValue(mockRewards);
      mockPrisma.speechRewards.update.mockImplementation(({ data }) => ({
        ...mockRewards,
        ...data,
      }));
      mockPrisma.speechAchievement.findUnique.mockResolvedValue(null);
      mockPrisma.speechAchievement.create.mockImplementation(({ data }) => ({
        id: 'ach-new',
        ...data,
        isCompleted: false,
      }));

      const result = await service.awardSessionReward(
        TENANT_ID,
        LEARNER_ID,
        1.0, // perfect accuracy
        20
      );

      expect(result.milestones.some((m) => m.type === 'PERFECT_SESSION')).toBe(
        true
      );
    });

    it('should create rewards record if not exists', async () => {
      mockPrisma.speechRewards.findUnique.mockResolvedValue(null);
      mockPrisma.speechRewards.create.mockResolvedValue(createMockRewards());
      mockPrisma.speechRewards.update.mockImplementation(({ data }) => ({
        ...createMockRewards(),
        ...data,
      }));
      mockPrisma.speechAchievement.findUnique.mockResolvedValue(null);
      mockPrisma.speechAchievement.create.mockImplementation(({ data }) => ({
        id: 'ach-new',
        ...data,
        isCompleted: false,
      }));

      await service.awardSessionReward(TENANT_ID, LEARNER_ID, 0.8, 20);

      expect(mockPrisma.speechRewards.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          learnerId: LEARNER_ID,
          totalXp: 0,
          currentLevel: 1,
        }),
      });
    });

    it('should increment streak when practicing on consecutive days', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const mockRewards = createMockRewards({
        currentPracticeStreak: 2,
        lastPracticeDate: yesterday,
      });
      mockPrisma.speechRewards.findUnique.mockResolvedValue(mockRewards);
      mockPrisma.speechRewards.update.mockImplementation(({ data }) => ({
        ...mockRewards,
        ...data,
      }));
      mockPrisma.speechAchievement.findUnique.mockResolvedValue(null);
      mockPrisma.speechAchievement.create.mockImplementation(({ data }) => ({
        id: 'ach-new',
        ...data,
        isCompleted: false,
      }));
      mockPrisma.practiceMilestone.create.mockResolvedValue({});

      const result = await service.awardSessionReward(
        TENANT_ID,
        LEARNER_ID,
        0.8,
        20
      );

      expect(result.streakInfo.currentStreak).toBe(3);
      expect(result.streakInfo.isNewStreak).toBe(true);
    });

    it('should reset streak when missing a day', async () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const mockRewards = createMockRewards({
        currentPracticeStreak: 5,
        lastPracticeDate: twoDaysAgo,
      });
      mockPrisma.speechRewards.findUnique.mockResolvedValue(mockRewards);
      mockPrisma.speechRewards.update.mockImplementation(({ data }) => ({
        ...mockRewards,
        ...data,
      }));
      mockPrisma.speechAchievement.findUnique.mockResolvedValue(null);
      mockPrisma.speechAchievement.create.mockImplementation(({ data }) => ({
        id: 'ach-new',
        ...data,
        isCompleted: false,
      }));

      const result = await service.awardSessionReward(
        TENANT_ID,
        LEARNER_ID,
        0.8,
        20
      );

      expect(result.streakInfo.currentStreak).toBe(1);
    });

    it('should unlock first session achievement', async () => {
      const mockRewards = createMockRewards();
      mockPrisma.speechRewards.findUnique.mockResolvedValue(mockRewards);
      mockPrisma.speechRewards.update.mockImplementation(({ data }) => ({
        ...mockRewards,
        ...data,
      }));
      mockPrisma.speechAchievement.findUnique.mockResolvedValue(null);
      mockPrisma.speechAchievement.create.mockImplementation(({ data }) => ({
        id: 'ach-new',
        ...data,
        isCompleted: false,
      }));
      mockPrisma.speechAchievement.update.mockImplementation(({ data }) => ({
        id: 'ach-new',
        ...data,
      }));

      const result = await service.awardSessionReward(
        TENANT_ID,
        LEARNER_ID,
        0.8,
        20
      );

      expect(
        result.achievementsUnlocked.some((a) => a.code === 'FIRST_SESSION')
      ).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Home Practice Rewards
  // ──────────────────────────────────────────────────────────────────────────

  describe('awardHomePracticeReward', () => {
    it('should award XP and stars for home practice', async () => {
      const mockRewards = createMockRewards();
      mockPrisma.speechRewards.findUnique.mockResolvedValue(mockRewards);
      mockPrisma.speechRewards.update.mockImplementation(({ data }) => ({
        ...mockRewards,
        ...data,
      }));
      mockPrisma.speechAchievement.findUnique.mockResolvedValue(null);
      mockPrisma.speechAchievement.create.mockImplementation(({ data }) => ({
        id: 'ach-new',
        ...data,
        isCompleted: false,
      }));

      const result = await service.awardHomePracticeReward(
        TENANT_ID,
        LEARNER_ID,
        10 // minutes
      );

      expect(result.xpEarned).toBeGreaterThanOrEqual(15); // base XP
      expect(result.starsEarned).toBeGreaterThanOrEqual(1);
    });

    it('should award time bonus for longer practice', async () => {
      const mockRewards = createMockRewards();
      mockPrisma.speechRewards.findUnique.mockResolvedValue(mockRewards);
      mockPrisma.speechRewards.update.mockImplementation(({ data }) => ({
        ...mockRewards,
        ...data,
      }));
      mockPrisma.speechAchievement.findUnique.mockResolvedValue(null);
      mockPrisma.speechAchievement.create.mockImplementation(({ data }) => ({
        id: 'ach-new',
        ...data,
        isCompleted: false,
      }));

      const shortResult = await service.awardHomePracticeReward(
        TENANT_ID,
        LEARNER_ID,
        5
      );

      const longResult = await service.awardHomePracticeReward(
        TENANT_ID,
        LEARNER_ID,
        15
      );

      expect(longResult.xpEarned).toBeGreaterThan(shortResult.xpEarned);
    });

    it('should track total practice minutes', async () => {
      const mockRewards = createMockRewards({ totalPracticeMinutes: 50 });
      mockPrisma.speechRewards.findUnique.mockResolvedValue(mockRewards);
      mockPrisma.speechRewards.update.mockImplementation(({ data }) => ({
        ...mockRewards,
        ...data,
      }));
      mockPrisma.speechAchievement.findUnique.mockResolvedValue(null);
      mockPrisma.speechAchievement.create.mockImplementation(({ data }) => ({
        id: 'ach-new',
        ...data,
        isCompleted: false,
      }));
      mockPrisma.speechAchievement.update.mockImplementation(({ data }) => ({
        id: 'ach-new',
        ...data,
      }));

      await service.awardHomePracticeReward(TENANT_ID, LEARNER_ID, 15);

      expect(mockPrisma.speechRewards.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalPracticeMinutes: 65,
          }),
        })
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Goal Mastery
  // ──────────────────────────────────────────────────────────────────────────

  describe('awardGoalMastered', () => {
    it('should award substantial XP for mastering a goal', async () => {
      const mockRewards = createMockRewards();
      mockPrisma.speechRewards.findUnique.mockResolvedValue(mockRewards);
      mockPrisma.speechRewards.update.mockImplementation(({ data }) => ({
        ...mockRewards,
        ...data,
      }));
      mockPrisma.speechAchievement.findUnique.mockResolvedValue(null);
      mockPrisma.speechAchievement.create.mockImplementation(({ data }) => ({
        id: 'ach-new',
        ...data,
        isCompleted: false,
      }));
      mockPrisma.practiceMilestone.create.mockResolvedValue({});

      const result = await service.awardGoalMastered(
        TENANT_ID,
        LEARNER_ID,
        'Improve /r/ sound production in initial position',
        ['r']
      );

      expect(result.xpEarned).toBeGreaterThanOrEqual(200); // base goal XP
      expect(result.starsEarned).toBeGreaterThanOrEqual(15);
    });

    it('should add newly mastered sounds', async () => {
      const mockRewards = createMockRewards({ soundsMastered: ['s'] });
      mockPrisma.speechRewards.findUnique.mockResolvedValue(mockRewards);
      mockPrisma.speechRewards.update.mockImplementation(({ data }) => ({
        ...mockRewards,
        ...data,
      }));
      mockPrisma.speechAchievement.findUnique.mockResolvedValue(null);
      mockPrisma.speechAchievement.create.mockImplementation(({ data }) => ({
        id: 'ach-new',
        ...data,
        isCompleted: false,
      }));
      mockPrisma.practiceMilestone.create.mockResolvedValue({});

      const result = await service.awardGoalMastered(
        TENANT_ID,
        LEARNER_ID,
        'Improve /r/ and /l/ sounds',
        ['r', 'l']
      );

      expect(
        result.milestones.filter((m) => m.type === 'SOUND_MASTERED')
      ).toHaveLength(2);
      expect(mockPrisma.speechRewards.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            soundsMastered: ['s', 'r', 'l'],
          }),
        })
      );
    });

    it('should not duplicate already mastered sounds', async () => {
      const mockRewards = createMockRewards({ soundsMastered: ['r', 's'] });
      mockPrisma.speechRewards.findUnique.mockResolvedValue(mockRewards);
      mockPrisma.speechRewards.update.mockImplementation(({ data }) => ({
        ...mockRewards,
        ...data,
      }));
      mockPrisma.speechAchievement.findUnique.mockResolvedValue(null);
      mockPrisma.speechAchievement.create.mockImplementation(({ data }) => ({
        id: 'ach-new',
        ...data,
        isCompleted: false,
      }));
      mockPrisma.practiceMilestone.create.mockResolvedValue({});

      const result = await service.awardGoalMastered(
        TENANT_ID,
        LEARNER_ID,
        'Continue /r/ practice',
        ['r'] // already mastered
      );

      expect(
        result.milestones.filter((m) => m.type === 'SOUND_MASTERED')
      ).toHaveLength(0);
    });

    it('should create goal mastered milestone', async () => {
      const mockRewards = createMockRewards();
      mockPrisma.speechRewards.findUnique.mockResolvedValue(mockRewards);
      mockPrisma.speechRewards.update.mockImplementation(({ data }) => ({
        ...mockRewards,
        ...data,
      }));
      mockPrisma.speechAchievement.findUnique.mockResolvedValue(null);
      mockPrisma.speechAchievement.create.mockImplementation(({ data }) => ({
        id: 'ach-new',
        ...data,
        isCompleted: false,
      }));
      mockPrisma.practiceMilestone.create.mockResolvedValue({});

      const result = await service.awardGoalMastered(
        TENANT_ID,
        LEARNER_ID,
        'Improve articulation',
        ['r']
      );

      expect(result.milestones.some((m) => m.type === 'GOAL_MASTERED')).toBe(
        true
      );
      expect(mockPrisma.practiceMilestone.create).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Progress Summary
  // ──────────────────────────────────────────────────────────────────────────

  describe('getProgressSummary', () => {
    it('should return complete progress summary', async () => {
      const mockRewards = createMockRewards({
        totalXp: 500,
        currentLevel: 3,
        totalStars: 25,
        currentPracticeStreak: 5,
        longestPracticeStreak: 7,
        sessionsCompleted: 10,
        perfectSessions: 3,
        goalsMastered: 2,
        soundsMastered: ['r', 's'],
        totalPracticeMinutes: 120,
        lastPracticeDate: new Date(),
      });
      mockPrisma.speechRewards.findUnique.mockResolvedValue(mockRewards);

      const result = await service.getProgressSummary(TENANT_ID, LEARNER_ID);

      expect(result).toEqual({
        totalXp: 500,
        currentLevel: 3,
        totalStars: 25,
        currentStreak: 5,
        longestStreak: 7,
        sessionsCompleted: 10,
        perfectSessions: 3,
        goalsMastered: 2,
        soundsMastered: ['r', 's'],
        totalPracticeMinutes: 120,
      });
    });

    it('should reset streak if last practice was more than a day ago', async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const mockRewards = createMockRewards({
        currentPracticeStreak: 5,
        lastPracticeDate: threeDaysAgo,
      });
      mockPrisma.speechRewards.findUnique.mockResolvedValue(mockRewards);
      mockPrisma.speechRewards.update.mockResolvedValue({
        ...mockRewards,
        currentPracticeStreak: 0,
      });

      const result = await service.getProgressSummary(TENANT_ID, LEARNER_ID);

      expect(result.currentStreak).toBe(0);
      expect(mockPrisma.speechRewards.update).toHaveBeenCalledWith({
        where: { id: mockRewards.id },
        data: { currentPracticeStreak: 0 },
      });
    });

    it('should create rewards record if not exists', async () => {
      mockPrisma.speechRewards.findUnique.mockResolvedValue(null);
      mockPrisma.speechRewards.create.mockResolvedValue(createMockRewards());

      const result = await service.getProgressSummary(TENANT_ID, LEARNER_ID);

      expect(mockPrisma.speechRewards.create).toHaveBeenCalled();
      expect(result.totalXp).toBe(0);
      expect(result.currentLevel).toBe(1);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Achievement Progress
  // ──────────────────────────────────────────────────────────────────────────

  describe('getAchievementProgress', () => {
    it('should return progress for all achievements', async () => {
      const mockRewards = createMockRewards({ sessionsCompleted: 3 });
      mockPrisma.speechRewards.findUnique.mockResolvedValue(mockRewards);
      mockPrisma.speechAchievement.findUnique.mockResolvedValue(null);
      mockPrisma.speechAchievement.create.mockImplementation(({ data }) => ({
        id: 'ach-new',
        ...data,
        isCompleted: false,
        completedAt: null,
      }));

      const result = await service.getAchievementProgress(
        TENANT_ID,
        LEARNER_ID
      );

      expect(result.length).toBe(SPEECH_ACHIEVEMENTS.length);
      expect(result.every((a) => 'progressPercentage' in a)).toBe(true);
    });

    it('should show completed achievements', async () => {
      const mockRewards = createMockRewards({ sessionsCompleted: 5 });
      mockPrisma.speechRewards.findUnique.mockResolvedValue(mockRewards);
      mockPrisma.speechAchievement.findUnique.mockImplementation(
        ({ where }) => {
          if (where.tenantId_learnerId_achievementCode.achievementCode === 'FIRST_SESSION') {
            return {
              id: 'ach-1',
              achievementCode: 'FIRST_SESSION',
              currentProgress: 1,
              targetProgress: 1,
              isCompleted: true,
              completedAt: new Date(),
            };
          }
          if (where.tenantId_learnerId_achievementCode.achievementCode === 'SESSION_5') {
            return {
              id: 'ach-2',
              achievementCode: 'SESSION_5',
              currentProgress: 5,
              targetProgress: 5,
              isCompleted: true,
              completedAt: new Date(),
            };
          }
          return null;
        }
      );
      mockPrisma.speechAchievement.create.mockImplementation(({ data }) => ({
        id: 'ach-new',
        ...data,
        isCompleted: false,
        completedAt: null,
      }));

      const result = await service.getAchievementProgress(
        TENANT_ID,
        LEARNER_ID
      );

      const firstSession = result.find((a) => a.code === 'FIRST_SESSION');
      expect(firstSession?.isCompleted).toBe(true);
      expect(firstSession?.progressPercentage).toBe(100);

      const session5 = result.find((a) => a.code === 'SESSION_5');
      expect(session5?.isCompleted).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Celebration Messages
  // ──────────────────────────────────────────────────────────────────────────

  describe('getCelebrationMessage', () => {
    it('should return category-specific message', () => {
      const sessionAchievement = {
        code: 'FIRST_SESSION',
        title: 'Getting Started',
        description: 'Complete your first session',
        category: 'SESSIONS',
        xpReward: 50,
        starsReward: 3,
        icon: 'star',
      };

      const message = service.getCelebrationMessage(sessionAchievement);

      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });

    it('should return fallback message for unknown category', () => {
      const unknownAchievement = {
        code: 'UNKNOWN',
        title: 'Unknown',
        description: 'Unknown achievement',
        category: 'UNKNOWN_CATEGORY',
        xpReward: 10,
        starsReward: 1,
        icon: 'star',
      };

      const message = service.getCelebrationMessage(unknownAchievement);

      expect(['Great job!', 'Well done!', 'Keep it up!']).toContain(message);
    });
  });
});

// ============================================================================
// Achievement Definitions Tests
// ============================================================================

describe('SPEECH_ACHIEVEMENTS', () => {
  it('should have unique codes', () => {
    const codes = SPEECH_ACHIEVEMENTS.map((a) => a.code);
    const uniqueCodes = new Set(codes);
    expect(codes.length).toBe(uniqueCodes.size);
  });

  it('should have required properties', () => {
    for (const achievement of SPEECH_ACHIEVEMENTS) {
      expect(achievement.code).toBeDefined();
      expect(achievement.title).toBeDefined();
      expect(achievement.description).toBeDefined();
      expect(achievement.category).toBeDefined();
      expect(achievement.icon).toBeDefined();
      expect(achievement.requirement).toBeDefined();
      expect(achievement.requirement.type).toBeDefined();
      expect(achievement.requirement.target).toBeGreaterThan(0);
      expect(achievement.xpReward).toBeGreaterThan(0);
      expect(achievement.starsReward).toBeGreaterThan(0);
    }
  });

  it('should have valid categories', () => {
    const validCategories = [
      'SESSIONS',
      'ACCURACY',
      'GOALS',
      'HOME_PRACTICE',
      'STREAKS',
      'SOUNDS',
    ];
    for (const achievement of SPEECH_ACHIEVEMENTS) {
      expect(validCategories).toContain(achievement.category);
    }
  });

  it('should have increasing targets within same type', () => {
    const byType: Record<string, number[]> = {};
    for (const achievement of SPEECH_ACHIEVEMENTS) {
      const type = achievement.requirement.type;
      if (!byType[type]) byType[type] = [];
      byType[type].push(achievement.requirement.target);
    }

    for (const targets of Object.values(byType)) {
      const sorted = [...targets].sort((a, b) => a - b);
      expect(targets).toEqual(sorted);
    }
  });
});
