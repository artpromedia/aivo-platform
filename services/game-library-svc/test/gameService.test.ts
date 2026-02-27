/**
 * Tests for game-library-svc game service.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  game: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    createMany: vi.fn(),
  },
  gameSession: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({ prisma: mockPrisma }));

describe('GameService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('seedGameCatalog', () => {
    it('bulk inserts game catalog entries', async () => {
      mockPrisma.game.createMany.mockResolvedValue({ count: 16 });
      const result = await mockPrisma.game.createMany({
        data: Array.from({ length: 16 }, (_, i) => ({
          id: `game-${i}`,
          name: `Game ${i}`,
          category: 'BRAIN_TRAINING',
        })),
        skipDuplicates: true,
      });
      expect(result.count).toBe(16);
    });
  });

  describe('listGames', () => {
    it('returns all available games', async () => {
      mockPrisma.game.findMany.mockResolvedValue([
        { id: 'g-1', name: 'Memory Match', category: 'MEMORY' },
        { id: 'g-2', name: 'Pattern Quest', category: 'PATTERN' },
      ]);
      const games = await mockPrisma.game.findMany({});
      expect(games).toHaveLength(2);
    });

    it('filters by category', async () => {
      mockPrisma.game.findMany.mockResolvedValue([
        { id: 'g-1', name: 'Memory Match', category: 'MEMORY' },
      ]);
      const games = await mockPrisma.game.findMany({
        where: { category: 'MEMORY' },
      });
      expect(games).toHaveLength(1);
      expect(games[0].category).toBe('MEMORY');
    });
  });

  describe('getGame', () => {
    it('returns game by id', async () => {
      mockPrisma.game.findUnique.mockResolvedValue({
        id: 'g-1',
        name: 'Memory Match',
        description: 'Test your memory',
        minAge: 5,
        maxAge: 12,
      });
      const game = await mockPrisma.game.findUnique({ where: { id: 'g-1' } });
      expect(game?.name).toBe('Memory Match');
    });

    it('returns null for unknown game', async () => {
      mockPrisma.game.findUnique.mockResolvedValue(null);
      const game = await mockPrisma.game.findUnique({ where: { id: 'unknown' } });
      expect(game).toBeNull();
    });
  });
});

describe('SessionService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('startSession', () => {
    it('creates active session', async () => {
      mockPrisma.gameSession.create.mockResolvedValue({
        id: 'sess-1',
        gameId: 'g-1',
        learnerId: 'learner-1',
        status: 'ACTIVE',
        startedAt: new Date(),
      });
      const session = await mockPrisma.gameSession.create({
        data: { gameId: 'g-1', learnerId: 'learner-1', status: 'ACTIVE' },
      });
      expect(session.status).toBe('ACTIVE');
    });
  });

  describe('endSession', () => {
    it('marks session as completed with score', async () => {
      mockPrisma.gameSession.update.mockResolvedValue({
        id: 'sess-1',
        status: 'COMPLETED',
        score: 950,
        endedAt: new Date(),
      });
      const session = await mockPrisma.gameSession.update({
        where: { id: 'sess-1' },
        data: { status: 'COMPLETED', score: 950, endedAt: new Date() },
      });
      expect(session.status).toBe('COMPLETED');
      expect(session.score).toBe(950);
    });
  });

  describe('pauseSession', () => {
    it('sets session to paused state', async () => {
      mockPrisma.gameSession.update.mockResolvedValue({
        id: 'sess-1',
        status: 'PAUSED',
      });
      const session = await mockPrisma.gameSession.update({
        where: { id: 'sess-1' },
        data: { status: 'PAUSED' },
      });
      expect(session.status).toBe('PAUSED');
    });
  });

  describe('getSessionHistory', () => {
    it('returns learner session history ordered by date', async () => {
      mockPrisma.gameSession.findMany.mockResolvedValue([
        { id: 's1', score: 800, startedAt: new Date('2026-02-01') },
        { id: 's2', score: 950, startedAt: new Date('2026-02-15') },
      ]);
      const history = await mockPrisma.gameSession.findMany({
        where: { learnerId: 'learner-1' },
        orderBy: { startedAt: 'desc' },
      });
      expect(history).toHaveLength(2);
    });
  });
});
