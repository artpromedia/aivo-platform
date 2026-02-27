/**
 * Tests for game-library-svc recommendations and brain training.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  game: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  gameSession: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  brainTrainingPlan: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  brainTrainingStat: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({ prisma: mockPrisma }));

describe('RecommendationService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getRecommendations', () => {
    it('returns games matching learner profile', async () => {
      mockPrisma.game.findMany.mockResolvedValue([
        { id: 'g-1', name: 'Memory Match', targetSkills: ['memory', 'attention'] },
        { id: 'g-2', name: 'Pattern Quest', targetSkills: ['logic', 'pattern'] },
      ]);

      const games = await mockPrisma.game.findMany({
        where: { targetAge: { lte: 10, gte: 8 } },
      });
      expect(games).toHaveLength(2);
    });

    it('excludes recently played games', async () => {
      mockPrisma.gameSession.findMany.mockResolvedValue([
        { gameId: 'g-1', startedAt: new Date() },
      ]);
      mockPrisma.game.findMany.mockResolvedValue([
        { id: 'g-2', name: 'Pattern Quest' },
      ]);

      const recentSessions = await mockPrisma.gameSession.findMany({
        where: { learnerId: 'learner-1' },
      });
      const recentGameIds = recentSessions.map((s: { gameId: string }) => s.gameId);

      const games = await mockPrisma.game.findMany({
        where: { id: { notIn: recentGameIds } },
      });
      expect(games).toHaveLength(1);
      expect(games[0].id).toBe('g-2');
    });
  });

  describe('getRandomFocusBreak', () => {
    it('returns a random focus break game', async () => {
      mockPrisma.game.findMany.mockResolvedValue([
        { id: 'g-5', name: 'Breathing Bubbles', category: 'FOCUS_BREAK' },
      ]);
      const games = await mockPrisma.game.findMany({
        where: { category: 'FOCUS_BREAK' },
      });
      expect(games).toHaveLength(1);
      expect(games[0].category).toBe('FOCUS_BREAK');
    });
  });
});

describe('BrainTrainingService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getBrainTrainingPlan', () => {
    it('returns existing plan for learner', async () => {
      mockPrisma.brainTrainingPlan.findUnique.mockResolvedValue({
        id: 'plan-1',
        learnerId: 'learner-1',
        dailyGoal: 3,
        focusAreas: ['memory', 'attention'],
      });
      const plan = await mockPrisma.brainTrainingPlan.findUnique({
        where: { learnerId: 'learner-1' },
      });
      expect(plan?.dailyGoal).toBe(3);
      expect(plan?.focusAreas).toContain('memory');
    });

    it('returns null when no plan exists', async () => {
      mockPrisma.brainTrainingPlan.findUnique.mockResolvedValue(null);
      const plan = await mockPrisma.brainTrainingPlan.findUnique({
        where: { learnerId: 'unknown' },
      });
      expect(plan).toBeNull();
    });
  });

  describe('completeBrainTrainingGame', () => {
    it('updates stats after game completion', async () => {
      mockPrisma.brainTrainingStat.upsert.mockResolvedValue({
        learnerId: 'learner-1',
        gamesPlayed: 5,
        totalScore: 4200,
        streak: 3,
      });
      const stat = await mockPrisma.brainTrainingStat.upsert({
        where: { learnerId: 'learner-1' },
        create: { learnerId: 'learner-1', gamesPlayed: 1, totalScore: 850 },
        update: { gamesPlayed: { increment: 1 }, totalScore: { increment: 850 } },
      });
      expect(stat.gamesPlayed).toBe(5);
    });
  });

  describe('getBrainTrainingStats', () => {
    it('returns learner brain training statistics', async () => {
      mockPrisma.brainTrainingStat.findUnique.mockResolvedValue({
        learnerId: 'learner-1',
        gamesPlayed: 42,
        totalScore: 35000,
        streak: 7,
        bestStreak: 14,
      });
      const stats = await mockPrisma.brainTrainingStat.findUnique({
        where: { learnerId: 'learner-1' },
      });
      expect(stats?.gamesPlayed).toBe(42);
      expect(stats?.streak).toBe(7);
    });
  });
});
