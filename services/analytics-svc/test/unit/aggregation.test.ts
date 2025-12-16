/**
 * Aggregation Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AggregationService } from '../../src/services/aggregation.service.js';

// Mock PrismaClient
const mockPrisma = {
  learningEvent: {
    groupBy: vi.fn(),
    findMany: vi.fn(),
  },
  dailyUserMetrics: {
    upsert: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  },
  dailyContentMetrics: {
    upsert: vi.fn(),
  },
  periodMetrics: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  topicProgress: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  metricsCache: {
    deleteMany: vi.fn(),
  },
};

describe('AggregationService', () => {
  let service: AggregationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AggregationService(mockPrisma as any);
  });

  describe('aggregateDailyUserMetrics', () => {
    it('should aggregate user metrics for a day', async () => {
      const date = new Date('2024-01-15');

      mockPrisma.learningEvent.groupBy.mockResolvedValue([
        { tenantId: 'tenant-001', userId: 'user-001' },
        { tenantId: 'tenant-001', userId: 'user-002' },
      ]);

      mockPrisma.learningEvent.findMany.mockResolvedValue([
        {
          tenantId: 'tenant-001',
          userId: 'user-001',
          eventType: 'CONTENT_VIEWED',
          timestamp: date,
          duration: 300,
          score: null,
        },
        {
          tenantId: 'tenant-001',
          userId: 'user-001',
          eventType: 'SESSION_STARTED',
          timestamp: date,
          duration: null,
          score: null,
        },
      ]);

      mockPrisma.dailyUserMetrics.upsert.mockResolvedValue({});

      const result = await service.aggregateDailyUserMetrics(date);

      expect(result.processed).toBe(2);
      expect(result.errors).toBe(0);
      expect(mockPrisma.learningEvent.groupBy).toHaveBeenCalled();
    });

    it('should filter by tenant when provided', async () => {
      const date = new Date('2024-01-15');
      const tenantId = 'tenant-001';

      mockPrisma.learningEvent.groupBy.mockResolvedValue([]);

      await service.aggregateDailyUserMetrics(date, tenantId);

      expect(mockPrisma.learningEvent.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
          }),
        }),
      );
    });

    it('should handle errors gracefully', async () => {
      const date = new Date('2024-01-15');

      mockPrisma.learningEvent.groupBy.mockResolvedValue([
        { tenantId: 'tenant-001', userId: 'user-001' },
      ]);

      mockPrisma.learningEvent.findMany.mockRejectedValue(new Error('DB error'));

      const result = await service.aggregateDailyUserMetrics(date);

      expect(result.errors).toBe(1);
      expect(result.processed).toBe(0);
    });
  });

  describe('aggregateDailyContentMetrics', () => {
    it('should aggregate content metrics', async () => {
      const date = new Date('2024-01-15');

      mockPrisma.learningEvent.groupBy.mockResolvedValue([
        { tenantId: 'tenant-001', contentId: 'content-001', contentType: 'video' },
      ]);

      mockPrisma.learningEvent.findMany.mockResolvedValue([
        {
          tenantId: 'tenant-001',
          userId: 'user-001',
          contentId: 'content-001',
          eventType: 'CONTENT_VIEWED',
          timestamp: date,
          duration: 300,
          score: null,
        },
      ]);

      mockPrisma.dailyContentMetrics.upsert.mockResolvedValue({});

      const result = await service.aggregateDailyContentMetrics(date);

      expect(result.processed).toBe(1);
    });

    it('should skip null content IDs', async () => {
      const date = new Date('2024-01-15');

      mockPrisma.learningEvent.groupBy.mockResolvedValue([
        { tenantId: 'tenant-001', contentId: null, contentType: null },
      ]);

      const result = await service.aggregateDailyContentMetrics(date);

      expect(result.processed).toBe(0);
      expect(mockPrisma.dailyContentMetrics.upsert).not.toHaveBeenCalled();
    });
  });

  describe('rollupWeeklyMetrics', () => {
    it('should roll up daily metrics to weekly', async () => {
      const weekStart = new Date('2024-01-08');

      mockPrisma.dailyUserMetrics.aggregate.mockResolvedValue({
        _sum: {
          totalTimeSeconds: 10000,
          activeTimeSeconds: 5000,
          sessionsCount: 50,
          contentViewed: 200,
          contentCompleted: 100,
          videosWatched: 30,
          videoTimeSeconds: 3000,
          assessmentsStarted: 20,
          assessmentsCompleted: 18,
          questionsAnswered: 180,
          questionsCorrect: 150,
          xpEarned: 5000,
          badgesEarned: 5,
          aiInteractions: 50,
        },
        _avg: {
          averageScore: { toNumber: () => 85 },
        },
      });

      mockPrisma.dailyUserMetrics.groupBy.mockResolvedValueOnce([
        { tenantId: 'tenant-001' },
      ]);

      mockPrisma.dailyUserMetrics.groupBy.mockResolvedValueOnce([
        { userId: 'user-001' },
        { userId: 'user-002' },
      ]);

      mockPrisma.periodMetrics.upsert.mockResolvedValue({});

      const result = await service.rollupWeeklyMetrics(weekStart);

      expect(result.processed).toBe(1);
      expect(mockPrisma.periodMetrics.upsert).toHaveBeenCalled();
    });
  });

  describe('rollupMonthlyMetrics', () => {
    it('should roll up weekly metrics to monthly', async () => {
      const monthStart = new Date('2024-01-01');

      mockPrisma.periodMetrics.groupBy.mockResolvedValue([
        { tenantId: 'tenant-001' },
      ]);

      mockPrisma.periodMetrics.findMany.mockResolvedValue([
        {
          tenantId: 'tenant-001',
          metricData: {
            totalTimeSeconds: 10000,
            activeTimeSeconds: 5000,
            sessionsCount: 50,
            averageScore: 85,
            engagementScore: 70,
          },
        },
      ]);

      mockPrisma.periodMetrics.upsert.mockResolvedValue({});

      const result = await service.rollupMonthlyMetrics(monthStart);

      expect(result.processed).toBe(1);
    });
  });

  describe('updateTopicProgress', () => {
    it('should update topic progress from events', async () => {
      mockPrisma.learningEvent.findMany.mockResolvedValue([
        {
          tenantId: 'tenant-001',
          userId: 'user-001',
          topicId: 'math-algebra',
          subjectId: 'math',
          contentId: 'content-001',
          eventType: 'CONTENT_COMPLETED',
          timestamp: new Date('2024-01-15'),
          duration: 600,
          score: null,
        },
        {
          tenantId: 'tenant-001',
          userId: 'user-001',
          topicId: 'math-algebra',
          subjectId: 'math',
          contentId: 'content-001',
          eventType: 'ASSESSMENT_COMPLETED',
          timestamp: new Date('2024-01-15'),
          duration: 300,
          score: 85,
        },
      ]);

      mockPrisma.topicProgress.upsert.mockResolvedValue({});

      await service.updateTopicProgress('tenant-001', 'user-001', 'math-algebra');

      expect(mockPrisma.topicProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_topicId: { userId: 'user-001', topicId: 'math-algebra' },
          },
        }),
      );
    });

    it('should not update for empty events', async () => {
      mockPrisma.learningEvent.findMany.mockResolvedValue([]);

      await service.updateTopicProgress('tenant-001', 'user-001', 'math-algebra');

      expect(mockPrisma.topicProgress.upsert).not.toHaveBeenCalled();
    });
  });

  describe('invalidateCache', () => {
    it('should delete expired cache entries', async () => {
      mockPrisma.metricsCache.deleteMany.mockResolvedValue({ count: 5 });

      await service.invalidateCache('tenant-001', new Date());

      expect(mockPrisma.metricsCache.deleteMany).toHaveBeenCalled();
    });
  });
});
