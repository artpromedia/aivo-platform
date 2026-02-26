import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPrisma = {
  trustScore: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  },
  trustScoreHistory: {
    create: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  $queryRaw: vi.fn(),
};

vi.mock('../src/prisma', () => ({ prisma: mockPrisma }));

import { TrustScoreRepository } from '../src/repositories/trust-score.repository';

describe('TrustScoreRepository', () => {
  let repo: TrustScoreRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new TrustScoreRepository(mockPrisma as any);
  });

  describe('findByUserId', () => {
    it('returns trust score for existing user', async () => {
      const mockScore = {
        id: 'ts-1',
        userId: 'user-1',
        score: 85,
        tier: 'HIGH',
        factors: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.trustScore.findFirst.mockResolvedValue(mockScore);

      const result = await repo.findByUserId('user-1');
      expect(result).toBeDefined();
      expect(result?.score).toBe(85);
    });

    it('returns null for non-existent user', async () => {
      mockPrisma.trustScore.findFirst.mockResolvedValue(null);

      const result = await repo.findByUserId('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates a new trust score record', async () => {
      const input = { userId: 'user-1', score: 75, tier: 'MEDIUM', factors: {} };
      mockPrisma.trustScore.create.mockResolvedValue({ id: 'ts-new', ...input });

      const result = await repo.create(input as any);
      expect(result).toBeDefined();
      expect(mockPrisma.trustScore.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates an existing trust score', async () => {
      mockPrisma.trustScore.update.mockResolvedValue({ id: 'ts-1', score: 90 });

      const result = await repo.update('ts-1', { score: 90 } as any);
      expect(result).toBeDefined();
      expect(mockPrisma.trustScore.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'ts-1' } }),
      );
    });
  });

  describe('upsert', () => {
    it('creates or updates trust score', async () => {
      mockPrisma.trustScore.upsert.mockResolvedValue({ id: 'ts-1', userId: 'user-1', score: 80 });

      const result = await repo.upsert('user-1', { score: 80 } as any);
      expect(result).toBeDefined();
    });
  });

  describe('delete', () => {
    it('deletes a trust score', async () => {
      mockPrisma.trustScore.delete.mockResolvedValue({ id: 'ts-1' });

      await repo.delete('ts-1');
      expect(mockPrisma.trustScore.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'ts-1' } }),
      );
    });
  });

  describe('findByTier', () => {
    it('returns scores by tier', async () => {
      mockPrisma.trustScore.findMany.mockResolvedValue([
        { id: 'ts-1', tier: 'HIGH', score: 90 },
        { id: 'ts-2', tier: 'HIGH', score: 85 },
      ]);

      const result = await repo.findByTier('HIGH');
      expect(result).toHaveLength(2);
    });
  });

  describe('findBelowScore', () => {
    it('returns scores below threshold', async () => {
      mockPrisma.trustScore.findMany.mockResolvedValue([
        { id: 'ts-3', score: 20 },
      ]);

      const result = await repo.findBelowScore(30);
      expect(result).toHaveLength(1);
    });
  });

  describe('getStatistics', () => {
    it('returns aggregate statistics', async () => {
      mockPrisma.trustScore.aggregate.mockResolvedValue({
        _avg: { score: 72 },
        _min: { score: 10 },
        _max: { score: 98 },
        _count: { _all: 150 },
      });

      const result = await repo.getStatistics();
      expect(result).toBeDefined();
    });
  });

  describe('createHistory', () => {
    it('creates a history entry', async () => {
      mockPrisma.trustScoreHistory.create.mockResolvedValue({ id: 'hist-1' });

      const result = await repo.createHistory({
        trustScoreId: 'ts-1',
        score: 85,
        factors: {},
      } as any);
      expect(result).toBeDefined();
    });
  });

  describe('getHistory', () => {
    it('returns history entries for a trust score', async () => {
      mockPrisma.trustScoreHistory.findMany.mockResolvedValue([
        { id: 'hist-1', score: 80 },
        { id: 'hist-2', score: 85 },
      ]);

      const result = await repo.getHistory('ts-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('pruneHistory', () => {
    it('deletes old history entries', async () => {
      mockPrisma.trustScoreHistory.deleteMany.mockResolvedValue({ count: 5 });

      const result = await repo.pruneHistory(90);
      expect(mockPrisma.trustScoreHistory.deleteMany).toHaveBeenCalled();
    });
  });
});
