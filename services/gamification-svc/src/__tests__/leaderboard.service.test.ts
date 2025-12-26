/**
 * Leaderboard Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Redis client
const mockRedis = {
  zadd: vi.fn(),
  zrevrank: vi.fn(),
  zscore: vi.fn(),
  zrevrange: vi.fn(),
  zcount: vi.fn(),
  pipeline: vi.fn(() => mockRedis),
  exec: vi.fn(),
};

// Mock Prisma client
const mockPrisma = {
  playerProfile: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  leaderboardArchive: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock('../redis.js', () => ({
  redis: mockRedis,
}));

vi.mock('../prisma.js', () => ({
  prisma: mockPrisma,
}));

const { leaderboardService } = await import('../services/leaderboard.service.js');

describe('LeaderboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateScore', () => {
    it('should update player score in Redis', async () => {
      mockRedis.zadd.mockResolvedValue(1);

      await leaderboardService.updateScore({
        studentId: 'student-1',
        score: 1500,
        scope: 'class',
        scopeId: 'class-1',
        period: 'weekly',
      });

      expect(mockRedis.zadd).toHaveBeenCalledWith(
        expect.stringContaining('leaderboard:'),
        1500,
        'student-1'
      );
    });

    it('should update multiple period leaderboards', async () => {
      mockRedis.zadd.mockResolvedValue(1);

      await leaderboardService.updateAllPeriods('student-1', 100, 'class', 'class-1');

      // Should update daily, weekly, monthly, and allTime
      expect(mockRedis.zadd).toHaveBeenCalledTimes(4);
    });
  });

  describe('getLeaderboard', () => {
    it('should return leaderboard from Redis', async () => {
      mockRedis.zrevrange.mockResolvedValue([
        'student-1', '1500',
        'student-2', '1200',
        'student-3', '1000',
      ]);

      mockPrisma.playerProfile.findMany.mockResolvedValue([
        { studentId: 'student-1', level: 10 },
        { studentId: 'student-2', level: 8 },
        { studentId: 'student-3', level: 7 },
      ]);

      const leaderboard = await leaderboardService.getLeaderboard({
        scope: 'class',
        scopeId: 'class-1',
        period: 'weekly',
        limit: 10,
      });

      expect(leaderboard.length).toBe(3);
      expect(leaderboard[0].rank).toBe(1);
      expect(leaderboard[0].score).toBe(1500);
      expect(leaderboard[1].rank).toBe(2);
    });

    it('should fall back to database when Redis fails', async () => {
      mockRedis.zrevrange.mockRejectedValue(new Error('Redis error'));

      mockPrisma.playerProfile.findMany.mockResolvedValue([
        { studentId: 'student-1', totalXP: 1500, level: 10 },
        { studentId: 'student-2', totalXP: 1200, level: 8 },
      ]);

      const leaderboard = await leaderboardService.getLeaderboard({
        scope: 'global',
        period: 'allTime',
        limit: 10,
      });

      expect(leaderboard.length).toBe(2);
      expect(mockPrisma.playerProfile.findMany).toHaveBeenCalled();
    });
  });

  describe('getPlayerRank', () => {
    it('should return player rank from Redis', async () => {
      mockRedis.zrevrank.mockResolvedValue(4); // 0-indexed rank 4 = position 5

      const rank = await leaderboardService.getPlayerRank({
        studentId: 'student-1',
        scope: 'class',
        scopeId: 'class-1',
        period: 'weekly',
      });

      expect(rank).toBe(5); // Converted to 1-indexed
    });

    it('should return null if player not on leaderboard', async () => {
      mockRedis.zrevrank.mockResolvedValue(null);

      const rank = await leaderboardService.getPlayerRank({
        studentId: 'unknown-student',
        scope: 'class',
        scopeId: 'class-1',
        period: 'weekly',
      });

      expect(rank).toBeNull();
    });
  });

  describe('getNeighbors', () => {
    it('should return players around the current player', async () => {
      mockRedis.zrevrank.mockResolvedValue(5);
      mockRedis.zrevrange.mockResolvedValue([
        'student-3', '1600',
        'student-4', '1550',
        'student-1', '1500', // Current player
        'student-5', '1450',
        'student-6', '1400',
      ]);

      mockPrisma.playerProfile.findMany.mockResolvedValue([
        { studentId: 'student-3', level: 11 },
        { studentId: 'student-4', level: 10 },
        { studentId: 'student-1', level: 10 },
        { studentId: 'student-5', level: 9 },
        { studentId: 'student-6', level: 9 },
      ]);

      const neighbors = await leaderboardService.getNeighbors({
        studentId: 'student-1',
        scope: 'class',
        scopeId: 'class-1',
        period: 'weekly',
        range: 2,
      });

      expect(neighbors.length).toBe(5);
      expect(neighbors[2].studentId).toBe('student-1');
    });
  });

  describe('archiveLeaderboard', () => {
    it('should archive weekly leaderboard', async () => {
      mockRedis.zrevrange.mockResolvedValue([
        'student-1', '1500',
        'student-2', '1200',
        'student-3', '1000',
      ]);

      mockPrisma.leaderboardArchive.create.mockResolvedValue({});

      await leaderboardService.archiveWeekly('class', 'class-1');

      expect(mockPrisma.leaderboardArchive.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            period: 'weekly',
            scope: 'class',
          }),
        })
      );
    });
  });
});

describe('Leaderboard Key Generation', () => {
  it('should generate correct Redis keys', async () => {
    const { generateLeaderboardKey } = await import('../services/leaderboard.service.js');

    const classWeekly = generateLeaderboardKey('class', 'class-123', 'weekly');
    expect(classWeekly).toBe('leaderboard:class:class-123:weekly');

    const globalAllTime = generateLeaderboardKey('global', undefined, 'allTime');
    expect(globalAllTime).toBe('leaderboard:global:allTime');
  });
});
