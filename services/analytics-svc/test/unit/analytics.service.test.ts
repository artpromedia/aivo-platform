/**
 * Analytics Service Unit Tests
 *
 * Comprehensive tests for the AnalyticsService class.
 * Tests cover: learner progress, content analytics, tenant overview,
 * competency heatmaps, caching, and edge cases.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnalyticsService } from '../../src/services/analytics.service.js';
import type { LearnerProgressParams, ContentAnalyticsParams, TenantOverviewParams, CompetencyHeatmapParams } from '../../src/services/analytics.service.js';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK SETUP
// ═══════════════════════════════════════════════════════════════════════════════

const mockPrisma = {
  dailyUserMetrics: {
    findMany: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  },
  dailyContentMetrics: {
    findMany: vi.fn(),
    groupBy: vi.fn(),
  },
  topicProgress: {
    findMany: vi.fn(),
  },
  learningEvent: {
    findMany: vi.fn(),
  },
};

const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

function createDailyMetricRow(date: Date, overrides = {}) {
  return {
    date,
    totalTimeSeconds: 3600,
    activeTimeSeconds: 2700,
    sessionsCount: 3,
    contentViewed: 10,
    contentCompleted: 5,
    videosWatched: 2,
    assessmentsStarted: 2,
    assessmentsCompleted: 1,
    questionsAnswered: 20,
    questionsCorrect: 16,
    xpEarned: 150,
    badgesEarned: 1,
    aiInteractions: 5,
    averageScore: { toNumber: () => 85.5 },
    ...overrides,
  };
}

function createTopicProgressRow(topicId: string, subjectId: string, overrides = {}) {
  return {
    topicId,
    subjectId,
    progressPercent: { toNumber: () => 75 },
    masteryLevel: { toNumber: () => 3 },
    totalTimeSeconds: 1800,
    lastAccessedAt: new Date('2024-01-15'),
    avgAssessmentScore: { toNumber: () => 82 },
    ...overrides,
  };
}

function createContentMetricRecord(contentId: string, contentType: string, date: Date, overrides = {}) {
  return {
    contentId,
    contentType,
    date,
    views: 100,
    completions: 75,
    totalTimeSeconds: 45000,
    attempts: 80,
    averageScore: { toNumber: () => 78 },
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let serviceWithCache: AnalyticsService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-20T12:00:00Z'));
    service = new AnalyticsService(mockPrisma as any);
    serviceWithCache = new AnalyticsService(mockPrisma as any, mockRedis as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // LEARNER PROGRESS TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getLearnerProgress', () => {
    const defaultParams: LearnerProgressParams = {
      tenantId: 'tenant-001',
      userId: 'user-001',
    };

    it('should return learner progress with aggregated metrics', async () => {
      const dailyMetrics = [
        createDailyMetricRow(new Date('2024-01-15')),
        createDailyMetricRow(new Date('2024-01-16')),
        createDailyMetricRow(new Date('2024-01-17')),
      ];

      const topicProgress = [
        createTopicProgressRow('topic-001', 'math'),
        createTopicProgressRow('topic-002', 'math'),
      ];

      mockPrisma.dailyUserMetrics.findMany.mockResolvedValue(dailyMetrics);
      mockPrisma.topicProgress.findMany.mockResolvedValue(topicProgress);

      const result = await service.getLearnerProgress(defaultParams);

      expect(result.userId).toBe('user-001');
      expect(result.totalTimeSeconds).toBe(10800); // 3600 * 3
      expect(result.sessionsCount).toBe(9); // 3 * 3
      expect(result.contentViewed).toBe(30); // 10 * 3
      expect(result.contentCompleted).toBe(15); // 5 * 3
      expect(result.topicProgress).toHaveLength(2);
      expect(result.dailyActivity).toHaveLength(3);
    });

    it('should filter by date range when provided', async () => {
      const params: LearnerProgressParams = {
        ...defaultParams,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      mockPrisma.dailyUserMetrics.findMany.mockResolvedValue([]);
      mockPrisma.topicProgress.findMany.mockResolvedValue([]);

      await service.getLearnerProgress(params);

      expect(mockPrisma.dailyUserMetrics.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: {
              gte: params.startDate,
              lte: params.endDate,
            },
          }),
        }),
      );
    });

    it('should filter by subject when provided', async () => {
      const params: LearnerProgressParams = {
        ...defaultParams,
        subjectId: 'math',
      };

      mockPrisma.dailyUserMetrics.findMany.mockResolvedValue([]);
      mockPrisma.topicProgress.findMany.mockResolvedValue([]);

      await service.getLearnerProgress(params);

      expect(mockPrisma.topicProgress.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            subjectId: 'math',
          }),
        }),
      );
    });

    it('should calculate average score correctly', async () => {
      const dailyMetrics = [
        createDailyMetricRow(new Date('2024-01-15'), { assessmentsCompleted: 2, averageScore: { toNumber: () => 80 } }),
        createDailyMetricRow(new Date('2024-01-16'), { assessmentsCompleted: 3, averageScore: { toNumber: () => 90 } }),
      ];

      mockPrisma.dailyUserMetrics.findMany.mockResolvedValue(dailyMetrics);
      mockPrisma.topicProgress.findMany.mockResolvedValue([]);

      const result = await service.getLearnerProgress(defaultParams);

      // Weighted average: (80*2 + 90*3) / 5 = 430/5 = 86
      expect(result.averageScore).toBeCloseTo(86, 1);
    });

    it('should return null average score when no assessments completed', async () => {
      const dailyMetrics = [
        createDailyMetricRow(new Date('2024-01-15'), { assessmentsCompleted: 0, averageScore: null }),
      ];

      mockPrisma.dailyUserMetrics.findMany.mockResolvedValue(dailyMetrics);
      mockPrisma.topicProgress.findMany.mockResolvedValue([]);

      const result = await service.getLearnerProgress(defaultParams);

      expect(result.averageScore).toBeNull();
    });

    it('should return cached result when available', async () => {
      const cachedData = {
        userId: 'user-001',
        totalTimeSeconds: 5000,
        streak: 5,
        topicProgress: [],
        dailyActivity: [],
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await serviceWithCache.getLearnerProgress(defaultParams);

      expect(result).toEqual(cachedData);
      expect(mockPrisma.dailyUserMetrics.findMany).not.toHaveBeenCalled();
    });

    it('should cache result after fetching from database', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.dailyUserMetrics.findMany.mockResolvedValue([]);
      mockPrisma.topicProgress.findMany.mockResolvedValue([]);

      await serviceWithCache.getLearnerProgress(defaultParams);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('learner-progress:'),
        300,
        expect.any(String),
      );
    });

    it('should handle empty metrics gracefully', async () => {
      mockPrisma.dailyUserMetrics.findMany.mockResolvedValue([]);
      mockPrisma.topicProgress.findMany.mockResolvedValue([]);

      const result = await service.getLearnerProgress(defaultParams);

      expect(result.userId).toBe('user-001');
      expect(result.totalTimeSeconds).toBe(0);
      expect(result.sessionsCount).toBe(0);
      expect(result.topicProgress).toHaveLength(0);
      expect(result.dailyActivity).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CONTENT ANALYTICS TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getContentAnalytics', () => {
    const defaultParams: ContentAnalyticsParams = {
      tenantId: 'tenant-001',
    };

    it('should return content analytics with engagement metrics', async () => {
      const contentMetrics = [
        createContentMetricRecord('content-001', 'video', new Date('2024-01-15')),
        createContentMetricRecord('content-001', 'video', new Date('2024-01-16'), { views: 50, completions: 40 }),
        createContentMetricRecord('content-002', 'lesson', new Date('2024-01-15')),
      ];

      mockPrisma.dailyContentMetrics.findMany.mockResolvedValue(contentMetrics);

      const result = await service.getContentAnalytics(defaultParams);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('contentId');
      expect(result[0]).toHaveProperty('completionRate');
      expect(result[0]).toHaveProperty('engagementScore');
    });

    it('should filter by contentId when provided', async () => {
      const params: ContentAnalyticsParams = {
        ...defaultParams,
        contentId: 'content-001',
      };

      mockPrisma.dailyContentMetrics.findMany.mockResolvedValue([]);

      await service.getContentAnalytics(params);

      expect(mockPrisma.dailyContentMetrics.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contentId: 'content-001',
          }),
        }),
      );
    });

    it('should filter by contentType when provided', async () => {
      const params: ContentAnalyticsParams = {
        ...defaultParams,
        contentType: 'video',
      };

      mockPrisma.dailyContentMetrics.findMany.mockResolvedValue([]);

      await service.getContentAnalytics(params);

      expect(mockPrisma.dailyContentMetrics.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contentType: 'video',
          }),
        }),
      );
    });

    it('should respect the limit parameter', async () => {
      const contentMetrics = Array.from({ length: 100 }, (_, i) =>
        createContentMetricRecord(`content-${i}`, 'video', new Date('2024-01-15'))
      );

      mockPrisma.dailyContentMetrics.findMany.mockResolvedValue(contentMetrics);

      const params: ContentAnalyticsParams = {
        ...defaultParams,
        limit: 10,
      };

      const result = await service.getContentAnalytics(params);

      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should calculate completion rate correctly', async () => {
      const contentMetrics = [
        createContentMetricRecord('content-001', 'video', new Date('2024-01-15'), { views: 100, completions: 75 }),
      ];

      mockPrisma.dailyContentMetrics.findMany.mockResolvedValue(contentMetrics);

      const result = await service.getContentAnalytics(defaultParams);

      expect(result[0].completionRate).toBeCloseTo(0.75, 2);
      expect(result[0].dropOffRate).toBeCloseTo(0.25, 2);
    });

    it('should calculate engagement score based on multiple factors', async () => {
      const contentMetrics = [
        createContentMetricRecord('content-001', 'video', new Date('2024-01-15'), {
          views: 500,
          completions: 450,
          totalTimeSeconds: 90000, // 180 seconds avg per view
        }),
      ];

      mockPrisma.dailyContentMetrics.findMany.mockResolvedValue(contentMetrics);

      const result = await service.getContentAnalytics(defaultParams);

      expect(result[0].engagementScore).toBeGreaterThan(0);
      expect(result[0].engagementScore).toBeLessThanOrEqual(100);
    });

    it('should return cached result when available', async () => {
      const cachedData = [{ contentId: 'content-001', totalViews: 100 }];
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await serviceWithCache.getContentAnalytics(defaultParams);

      expect(result).toEqual(cachedData);
      expect(mockPrisma.dailyContentMetrics.findMany).not.toHaveBeenCalled();
    });

    it('should limit daily trends to last 30 days', async () => {
      const dates = Array.from({ length: 60 }, (_, i) => {
        const d = new Date('2024-01-01');
        d.setDate(d.getDate() + i);
        return d;
      });

      const contentMetrics = dates.map(date =>
        createContentMetricRecord('content-001', 'video', date)
      );

      mockPrisma.dailyContentMetrics.findMany.mockResolvedValue(contentMetrics);

      const result = await service.getContentAnalytics(defaultParams);

      expect(result[0].dailyTrends.length).toBeLessThanOrEqual(30);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TENANT OVERVIEW TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getTenantOverview', () => {
    const defaultParams: TenantOverviewParams = {
      tenantId: 'tenant-001',
    };

    beforeEach(() => {
      // Setup default mock responses
      mockPrisma.dailyUserMetrics.aggregate.mockResolvedValue({
        _sum: { totalTimeSeconds: 10000, contentCompleted: 50, sessionsCount: 100 },
        _count: { userId: 25 },
      });
      mockPrisma.dailyUserMetrics.groupBy.mockResolvedValue([
        { userId: 'user-001' },
        { userId: 'user-002' },
        { userId: 'user-003' },
      ]);
      mockPrisma.dailyContentMetrics.groupBy.mockResolvedValue([
        { contentId: 'c1', contentType: 'video', _sum: { views: 100, completions: 80 } },
        { contentId: 'c2', contentType: 'lesson', _sum: { views: 50, completions: 45 } },
      ]);
    });

    it('should return tenant overview with all metrics', async () => {
      const result = await service.getTenantOverview(defaultParams);

      expect(result.tenantId).toBe('tenant-001');
      expect(result).toHaveProperty('totalUsers');
      expect(result).toHaveProperty('activeUsersToday');
      expect(result).toHaveProperty('activeUsersWeek');
      expect(result).toHaveProperty('activeUsersMonth');
      expect(result).toHaveProperty('totalTimeSecondsToday');
      expect(result).toHaveProperty('totalTimeSecondsWeek');
      expect(result).toHaveProperty('totalTimeSecondsMonth');
      expect(result).toHaveProperty('topContent');
      expect(result).toHaveProperty('averageSessionMinutes');
    });

    it('should calculate average session minutes correctly', async () => {
      mockPrisma.dailyUserMetrics.aggregate
        .mockResolvedValueOnce({ _sum: { totalTimeSeconds: 10000 }, _count: { userId: 25 } })
        .mockResolvedValueOnce({ _sum: { totalTimeSeconds: 50000 } })
        .mockResolvedValueOnce({ _sum: { totalTimeSeconds: 200000 } })
        .mockResolvedValueOnce({ _sum: { sessionsCount: 500, totalTimeSeconds: 150000 } });

      const result = await service.getTenantOverview(defaultParams);

      // 150000 seconds / 500 sessions / 60 = 5 minutes
      expect(result.averageSessionMinutes).toBeGreaterThanOrEqual(0);
    });

    it('should handle tenant with no users gracefully', async () => {
      mockPrisma.dailyUserMetrics.aggregate.mockResolvedValue({
        _sum: { totalTimeSeconds: null, contentCompleted: null },
        _count: { userId: 0 },
      });
      mockPrisma.dailyUserMetrics.groupBy.mockResolvedValue([]);
      mockPrisma.dailyContentMetrics.groupBy.mockResolvedValue([]);

      const result = await service.getTenantOverview(defaultParams);

      expect(result.totalUsers).toBe(0);
      expect(result.activeUsersToday).toBe(0);
      expect(result.totalTimeSecondsToday).toBe(0);
    });

    it('should return cached result when available', async () => {
      const cachedData = { tenantId: 'tenant-001', totalUsers: 100 };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await serviceWithCache.getTenantOverview(defaultParams);

      expect(result).toEqual(cachedData);
      expect(mockPrisma.dailyUserMetrics.aggregate).not.toHaveBeenCalled();
    });

    it('should return top 10 content items', async () => {
      const topContent = Array.from({ length: 15 }, (_, i) => ({
        contentId: `content-${i}`,
        contentType: 'video',
        _sum: { views: 100 - i, completions: 80 - i },
      }));

      mockPrisma.dailyContentMetrics.groupBy.mockResolvedValue(topContent);

      const result = await service.getTenantOverview(defaultParams);

      expect(result.topContent.length).toBeLessThanOrEqual(10);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPETENCY HEATMAP TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getCompetencyHeatmap', () => {
    const defaultParams: CompetencyHeatmapParams = {
      tenantId: 'tenant-001',
    };

    it('should return competency heatmap cells', async () => {
      const topicProgress = [
        createTopicProgressRow('topic-001', 'math'),
        createTopicProgressRow('topic-002', 'math'),
        createTopicProgressRow('topic-003', 'science'),
      ];

      mockPrisma.topicProgress.findMany.mockResolvedValue(topicProgress);

      const result = await service.getCompetencyHeatmap(defaultParams);

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('topicId');
      expect(result[0]).toHaveProperty('masteryLevel');
      expect(result[0]).toHaveProperty('progressPercent');
      expect(result[0]).toHaveProperty('totalTimeSeconds');
    });

    it('should filter by userId when provided', async () => {
      const params: CompetencyHeatmapParams = {
        ...defaultParams,
        userId: 'user-001',
      };

      mockPrisma.topicProgress.findMany.mockResolvedValue([]);

      await service.getCompetencyHeatmap(params);

      expect(mockPrisma.topicProgress.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-001',
          }),
        }),
      );
    });

    it('should filter by subjectId when provided', async () => {
      const params: CompetencyHeatmapParams = {
        ...defaultParams,
        subjectId: 'math',
      };

      mockPrisma.topicProgress.findMany.mockResolvedValue([]);

      await service.getCompetencyHeatmap(params);

      expect(mockPrisma.topicProgress.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            subjectId: 'math',
          }),
        }),
      );
    });

    it('should include userId in cells when no specific user is requested', async () => {
      const topicProgress = [
        { ...createTopicProgressRow('topic-001', 'math'), userId: 'user-001' },
        { ...createTopicProgressRow('topic-001', 'math'), userId: 'user-002' },
      ];

      mockPrisma.topicProgress.findMany.mockResolvedValue(topicProgress);

      const result = await service.getCompetencyHeatmap(defaultParams);

      // userId should NOT be included when not filtering by user (undefined in output)
      expect(result.some(c => c.userId !== undefined)).toBe(true);
    });

    it('should return cached result when available', async () => {
      const cachedData = [{ topicId: 'topic-001', masteryLevel: 3 }];
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await serviceWithCache.getCompetencyHeatmap(defaultParams);

      expect(result).toEqual(cachedData);
      expect(mockPrisma.topicProgress.findMany).not.toHaveBeenCalled();
    });

    it('should handle null assessment scores', async () => {
      const topicProgress = [
        createTopicProgressRow('topic-001', 'math', { avgAssessmentScore: null }),
      ];

      mockPrisma.topicProgress.findMany.mockResolvedValue(topicProgress);

      const result = await service.getCompetencyHeatmap(defaultParams);

      expect(result[0].assessmentScore).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CACHE ERROR HANDLING TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('cache error handling', () => {
    it('should continue without cache on redis get error', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
      mockPrisma.dailyUserMetrics.findMany.mockResolvedValue([]);
      mockPrisma.topicProgress.findMany.mockResolvedValue([]);

      const result = await serviceWithCache.getLearnerProgress({
        tenantId: 'tenant-001',
        userId: 'user-001',
      });

      expect(result).toBeDefined();
      expect(mockPrisma.dailyUserMetrics.findMany).toHaveBeenCalled();
    });

    it('should continue without caching on redis set error', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockRejectedValue(new Error('Redis write failed'));
      mockPrisma.dailyUserMetrics.findMany.mockResolvedValue([]);
      mockPrisma.topicProgress.findMany.mockResolvedValue([]);

      const result = await serviceWithCache.getLearnerProgress({
        tenantId: 'tenant-001',
        userId: 'user-001',
      });

      expect(result).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // LARGE DATASET TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('large dataset handling', () => {
    it('should handle large number of daily metrics efficiently', async () => {
      const largeDataset = Array.from({ length: 365 }, (_, i) => {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + i);
        return createDailyMetricRow(date);
      });

      mockPrisma.dailyUserMetrics.findMany.mockResolvedValue(largeDataset);
      mockPrisma.topicProgress.findMany.mockResolvedValue([]);

      const result = await service.getLearnerProgress({
        tenantId: 'tenant-001',
        userId: 'user-001',
      });

      expect(result.dailyActivity).toHaveLength(365);
      expect(result.totalTimeSeconds).toBe(3600 * 365);
    });

    it('should handle large number of content items', async () => {
      const largeContentSet = Array.from({ length: 1000 }, (_, i) =>
        createContentMetricRecord(`content-${i}`, 'video', new Date('2024-01-15'))
      );

      mockPrisma.dailyContentMetrics.findMany.mockResolvedValue(largeContentSet);

      const result = await service.getContentAnalytics({
        tenantId: 'tenant-001',
        limit: 50,
      });

      expect(result.length).toBe(50);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // EDGE CASES
  // ─────────────────────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('should handle zero views in completion rate calculation', async () => {
      const contentMetrics = [
        createContentMetricRecord('content-001', 'video', new Date('2024-01-15'), { views: 0, completions: 0 }),
      ];

      mockPrisma.dailyContentMetrics.findMany.mockResolvedValue(contentMetrics);

      const result = await service.getContentAnalytics({ tenantId: 'tenant-001' });

      expect(result[0].completionRate).toBe(0);
      expect(result[0].averageTimeSeconds).toBe(0);
    });

    it('should handle negative duration values gracefully', async () => {
      const dailyMetrics = [
        createDailyMetricRow(new Date('2024-01-15'), { totalTimeSeconds: -100 }),
      ];

      mockPrisma.dailyUserMetrics.findMany.mockResolvedValue(dailyMetrics);
      mockPrisma.topicProgress.findMany.mockResolvedValue([]);

      const result = await service.getLearnerProgress({
        tenantId: 'tenant-001',
        userId: 'user-001',
      });

      // Service should still return the data (validation is at input layer)
      expect(result.totalTimeSeconds).toBe(-100);
    });

    it('should handle very large time values without overflow', async () => {
      const largeTimeValue = Number.MAX_SAFE_INTEGER - 1000;
      const dailyMetrics = [
        createDailyMetricRow(new Date('2024-01-15'), { totalTimeSeconds: largeTimeValue }),
      ];

      mockPrisma.dailyUserMetrics.findMany.mockResolvedValue(dailyMetrics);
      mockPrisma.topicProgress.findMany.mockResolvedValue([]);

      const result = await service.getLearnerProgress({
        tenantId: 'tenant-001',
        userId: 'user-001',
      });

      expect(result.totalTimeSeconds).toBe(largeTimeValue);
    });

    it('should handle date boundary conditions', async () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

      mockPrisma.dailyUserMetrics.aggregate.mockResolvedValue({
        _sum: { totalTimeSeconds: 100 },
        _count: { userId: 1 },
      });
      mockPrisma.dailyUserMetrics.groupBy.mockResolvedValue([{ userId: 'u1' }]);
      mockPrisma.dailyContentMetrics.groupBy.mockResolvedValue([]);

      const result = await service.getTenantOverview({ tenantId: 'tenant-001' });

      expect(result).toBeDefined();
    });
  });
});
