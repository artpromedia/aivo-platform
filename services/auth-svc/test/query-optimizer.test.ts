import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPrisma = {
  user: { findMany: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
};

vi.mock('../src/prisma', () => ({ prisma: mockPrisma }));

import { QueryOptimizer } from '../src/utils/query-optimizer';

describe('QueryOptimizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findManyWithRelations', () => {
    it('fetches records with related data', async () => {
      const mockData = [{ id: '1', name: 'Test' }];
      mockPrisma.user.findMany.mockResolvedValue(mockData);

      const result = await QueryOptimizer.findManyWithRelations(mockPrisma.user as any, {
        where: {},
        include: { roles: true },
      });
      expect(result).toEqual(mockData);
    });
  });

  describe('paginateWithCursor', () => {
    it('returns paginated results with cursor', async () => {
      const mockData = [
        { id: '1', name: 'A' },
        { id: '2', name: 'B' },
      ];
      mockPrisma.user.findMany.mockResolvedValue(mockData);

      const result = await QueryOptimizer.paginateWithCursor(mockPrisma.user as any, {
        take: 10,
      });
      expect(result).toBeDefined();
      expect(result).toHaveProperty('data');
    });
  });

  describe('countWithEstimate', () => {
    it('returns count from pg_class for large tables', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ reltuples: 1000000 }]);

      const result = await QueryOptimizer.countWithEstimate(mockPrisma as any, 'users');
      expect(typeof result).toBe('number');
    });
  });

  describe('bulkUpsert', () => {
    it('performs bulk upsert via raw SQL', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(2);

      const result = await QueryOptimizer.bulkUpsert(mockPrisma as any, {
        table: 'users',
        data: [{ id: '1', name: 'Updated' }],
        conflictColumns: ['id'],
        updateColumns: ['name'],
      });
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('deleteInBatches', () => {
    it('deletes records in batches', async () => {
      mockPrisma.$executeRaw
        .mockResolvedValueOnce(100) // first batch
        .mockResolvedValueOnce(50)  // second batch
        .mockResolvedValueOnce(0);  // done

      const result = await QueryOptimizer.deleteInBatches(mockPrisma as any, {
        table: 'audit_logs',
        where: 'created_at < NOW() - INTERVAL \'90 days\'',
        batchSize: 100,
      });
      expect(result).toBeGreaterThanOrEqual(150);
    });
  });

  describe('aggregateGroupBy', () => {
    it('performs grouped aggregation', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        { role: 'TEACHER', count: 50 },
        { role: 'PARENT', count: 200 },
      ]);

      const result = await QueryOptimizer.aggregateGroupBy(mockPrisma as any, {
        table: 'users',
        groupBy: 'role',
        aggregate: 'COUNT(*)',
      });
      expect(result).toHaveLength(2);
    });
  });
});
