/**
 * Dashboard Service Unit Tests
 *
 * Comprehensive tests for teacher dashboard analytics.
 * Tests cover: dashboard summary, at-risk students, IEP progress,
 * caching behavior, and intervention suggestions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the dependencies before importing the service
vi.mock('../../src/config.js', () => ({
  redisClient: {
    get: vi.fn(),
    setex: vi.fn(),
    ttl: vi.fn(),
    keys: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock('../../src/services/dashboard.repository.js', () => ({
  dashboardRepository: {
    getAggregateStats: vi.fn(),
    getClassMetrics: vi.fn(),
    getAtRiskStudents: vi.fn(),
    getIEPGoals: vi.fn(),
    getRecentActivity: vi.fn(),
    getUpcomingItems: vi.fn(),
  },
}));

vi.mock('@aivo/ts-observability', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  metrics: {
    database: {
      queryDuration: {
        observe: vi.fn(),
      },
    },
  },
}));

import { DashboardService } from '../../src/services/dashboard.service.js';
import { redisClient } from '../../src/config.js';
import { dashboardRepository } from '../../src/services/dashboard.repository.js';
import type {
  DashboardQueryOptions,
  AtRiskQueryOptions,
  ActivityQueryOptions,
  UpcomingQueryOptions,
} from '../../src/types/dashboard.types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

function createMockStats() {
  return {
    totalStudents: 150,
    activeStudents: 120,
    avgMastery: 0.72,
    avgEngagement: 0.85,
    atRiskCount: 12,
    iepCount: 8,
  };
}

function createMockClassMetrics() {
  return [
    {
      classId: 'class-001',
      className: 'Math 101',
      avgMastery: 0.78,
      avgEngagement: 0.82,
      prevAvgMastery: 0.72,
      totalStudents: 25,
      atRiskCount: 2,
      iepCount: 1,
    },
    {
      classId: 'class-002',
      className: 'Science 101',
      avgMastery: 0.68,
      avgEngagement: 0.75,
      prevAvgMastery: 0.70,
      totalStudents: 28,
      atRiskCount: 4,
      iepCount: 2,
    },
  ];
}

function createMockAtRiskStudents() {
  return [
    {
      learnerId: 'learner-001',
      learnerName: 'John Doe',
      className: 'Math 101',
      classId: 'class-001',
      riskLevel: 'HIGH',
      riskFactors: ['Low engagement', 'Missing assignments'],
      lastActivityAt: new Date('2024-01-15T10:00:00Z'),
      masteryLevel: 0.35,
      engagementScore: 0.25,
    },
    {
      learnerId: 'learner-002',
      learnerName: 'Jane Smith',
      className: 'Science 101',
      classId: 'class-002',
      riskLevel: 'MEDIUM',
      riskFactors: ['Declining mastery'],
      lastActivityAt: new Date('2024-01-18T14:00:00Z'),
      masteryLevel: 0.55,
      engagementScore: 0.60,
    },
  ];
}

function createMockIEPGoals() {
  return [
    {
      id: 'goal-001',
      learnerId: 'learner-003',
      learnerName: 'Bob Wilson',
      classId: 'class-001',
      className: 'Math 101',
      category: 'Reading',
      description: 'Improve reading comprehension to grade level',
      currentProgress: 0.65,
      expectedProgress: 0.60,
      status: 'ON_TRACK',
      targetDate: new Date('2024-06-01'),
      nextReviewDate: new Date('2024-02-15'),
    },
    {
      id: 'goal-002',
      learnerId: 'learner-004',
      learnerName: 'Alice Brown',
      classId: 'class-002',
      className: 'Science 101',
      category: 'Math',
      description: 'Master basic multiplication',
      currentProgress: 0.40,
      expectedProgress: 0.70,
      status: 'AT_RISK',
      targetDate: new Date('2024-05-01'),
      nextReviewDate: new Date('2024-01-25'),
    },
  ];
}

function createMockActivity() {
  return [
    {
      id: 'activity-001',
      type: 'submission',
      title: 'Homework submitted',
      description: 'Math homework completed',
      timestamp: new Date('2024-01-20T09:00:00Z'),
      learnerId: 'learner-001',
      contentId: 'content-001',
    },
    {
      id: 'activity-002',
      type: 'alert',
      title: 'At-risk alert',
      description: 'Student showing declining engagement',
      timestamp: new Date('2024-01-20T08:30:00Z'),
      learnerId: 'learner-002',
      contentId: null,
    },
  ];
}

function createMockUpcomingItems() {
  return [
    {
      id: 'upcoming-001',
      type: 'deadline',
      title: 'Assignment due',
      date: new Date('2024-01-25'),
      priority: 'high',
      learnerId: null,
    },
    {
      id: 'upcoming-002',
      type: 'meeting',
      title: 'Parent conference',
      date: new Date('2024-01-28'),
      priority: 'medium',
      learnerId: 'learner-001',
    },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('DashboardService', () => {
  let service: DashboardService;
  const mockRedis = redisClient as unknown as {
    get: ReturnType<typeof vi.fn>;
    setex: ReturnType<typeof vi.fn>;
    ttl: ReturnType<typeof vi.fn>;
    keys: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
  };
  const mockRepo = dashboardRepository as unknown as {
    getAggregateStats: ReturnType<typeof vi.fn>;
    getClassMetrics: ReturnType<typeof vi.fn>;
    getAtRiskStudents: ReturnType<typeof vi.fn>;
    getIEPGoals: ReturnType<typeof vi.fn>;
    getRecentActivity: ReturnType<typeof vi.fn>;
    getUpcomingItems: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-20T12:00:00Z'));
    service = new DashboardService();

    // Setup default mock responses
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue('OK');
    mockRedis.ttl.mockResolvedValue(300);
    mockRedis.keys.mockResolvedValue([]);
    mockRedis.del.mockResolvedValue(1);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // DASHBOARD SUMMARY TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getDashboardSummary', () => {
    const defaultOptions: DashboardQueryOptions = {
      teacherId: 'teacher-001',
      tenantId: 'tenant-001',
      period: 'week',
    };

    beforeEach(() => {
      mockRepo.getAggregateStats.mockResolvedValue(createMockStats());
      mockRepo.getClassMetrics.mockResolvedValue(createMockClassMetrics());
      mockRepo.getAtRiskStudents.mockResolvedValue(createMockAtRiskStudents());
      mockRepo.getIEPGoals.mockResolvedValue(createMockIEPGoals());
      mockRepo.getRecentActivity.mockResolvedValue(createMockActivity());
      mockRepo.getUpcomingItems.mockResolvedValue(createMockUpcomingItems());
    });

    it('should return complete dashboard summary', async () => {
      const result = await service.getDashboardSummary(defaultOptions);

      expect(result).toHaveProperty('stats');
      expect(result).toHaveProperty('classPerformance');
      expect(result).toHaveProperty('atRiskStudents');
      expect(result).toHaveProperty('iepProgress');
      expect(result).toHaveProperty('recentActivity');
      expect(result).toHaveProperty('upcomingItems');
      expect(result).toHaveProperty('metadata');
    });

    it('should include metadata with fetch time', async () => {
      const result = await service.getDashboardSummary(defaultOptions);

      expect(result.metadata).toHaveProperty('fetchedAt');
      expect(result.metadata).toHaveProperty('period', 'week');
      expect(result.metadata).toHaveProperty('teacherId', 'teacher-001');
      expect(result.metadata).toHaveProperty('tenantId', 'tenant-001');
    });

    it('should fetch all data in parallel for performance', async () => {
      await service.getDashboardSummary(defaultOptions);

      expect(mockRepo.getAggregateStats).toHaveBeenCalled();
      expect(mockRepo.getClassMetrics).toHaveBeenCalled();
      expect(mockRepo.getAtRiskStudents).toHaveBeenCalled();
      expect(mockRepo.getIEPGoals).toHaveBeenCalled();
      expect(mockRepo.getRecentActivity).toHaveBeenCalled();
      expect(mockRepo.getUpcomingItems).toHaveBeenCalled();
    });

    it('should return cached result when available', async () => {
      const cachedSummary = {
        stats: createMockStats(),
        classPerformance: [],
        atRiskStudents: [],
        iepProgress: [],
        recentActivity: [],
        upcomingItems: [],
        metadata: { cached: true },
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedSummary));
      mockRedis.ttl.mockResolvedValue(150);

      const result = await service.getDashboardSummary(defaultOptions);

      expect(result.metadata.cached).toBe(true);
      expect(mockRepo.getAggregateStats).not.toHaveBeenCalled();
    });

    it('should skip cache when skipCache option is true', async () => {
      const cachedSummary = { stats: {}, metadata: { cached: true } };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedSummary));

      await service.getDashboardSummary({ ...defaultOptions, skipCache: true });

      expect(mockRepo.getAggregateStats).toHaveBeenCalled();
    });

    it('should use week as default period', async () => {
      const optionsWithoutPeriod: DashboardQueryOptions = {
        teacherId: 'teacher-001',
        tenantId: 'tenant-001',
      };

      const result = await service.getDashboardSummary(optionsWithoutPeriod);

      expect(result.metadata.period).toBe('week');
    });

    it('should limit at-risk students to 5 in summary', async () => {
      const manyAtRiskStudents = Array.from({ length: 10 }, (_, i) => ({
        ...createMockAtRiskStudents()[0],
        learnerId: `learner-${i}`,
      }));
      mockRepo.getAtRiskStudents.mockResolvedValue(manyAtRiskStudents);

      const result = await service.getDashboardSummary(defaultOptions);

      expect(result.atRiskStudents.length).toBeLessThanOrEqual(5);
    });

    it('should cache result after fetching', async () => {
      await service.getDashboardSummary(defaultOptions);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('dashboard:'),
        expect.any(Number),
        expect.any(String),
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // DASHBOARD STATS TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getStats', () => {
    it('should return aggregate stats from repository', async () => {
      const mockStats = createMockStats();
      mockRepo.getAggregateStats.mockResolvedValue(mockStats);

      const result = await service.getStats({
        teacherId: 'teacher-001',
        tenantId: 'tenant-001',
      });

      expect(result).toEqual(mockStats);
    });

    it('should use different cache keys for different periods', async () => {
      mockRepo.getAggregateStats.mockResolvedValue(createMockStats());

      await service.getStats({ teacherId: 't1', tenantId: 'tenant-001', period: 'week' });
      await service.getStats({ teacherId: 't1', tenantId: 'tenant-001', period: 'month' });

      const calls = mockRedis.get.mock.calls;
      const cacheKeys = calls.map(call => call[0]);

      // Cache keys should be different for different periods
      expect(new Set(cacheKeys).size).toBe(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CLASS PERFORMANCE TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getClassPerformance', () => {
    it('should return class performance with trends', async () => {
      mockRepo.getClassMetrics.mockResolvedValue(createMockClassMetrics());

      const result = await service.getClassPerformance({
        teacherId: 'teacher-001',
        tenantId: 'tenant-001',
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('mastery');
      expect(result[0]).toHaveProperty('engagement');
      expect(result[0]).toHaveProperty('trend');
      expect(result[0]).toHaveProperty('trendPercent');
    });

    it('should calculate trend as up when mastery increased', async () => {
      mockRepo.getClassMetrics.mockResolvedValue([
        {
          classId: 'class-001',
          className: 'Math 101',
          avgMastery: 0.80,
          avgEngagement: 0.82,
          prevAvgMastery: 0.70, // 14% increase
          totalStudents: 25,
          atRiskCount: 2,
          iepCount: 1,
        },
      ]);

      const result = await service.getClassPerformance({
        teacherId: 'teacher-001',
        tenantId: 'tenant-001',
      });

      expect(result[0].trend).toBe('up');
      expect(result[0].trendPercent).toBeGreaterThan(0);
    });

    it('should calculate trend as down when mastery decreased', async () => {
      mockRepo.getClassMetrics.mockResolvedValue([
        {
          classId: 'class-001',
          className: 'Math 101',
          avgMastery: 0.60,
          avgEngagement: 0.82,
          prevAvgMastery: 0.75, // 20% decrease
          totalStudents: 25,
          atRiskCount: 2,
          iepCount: 1,
        },
      ]);

      const result = await service.getClassPerformance({
        teacherId: 'teacher-001',
        tenantId: 'tenant-001',
      });

      expect(result[0].trend).toBe('down');
      expect(result[0].trendPercent).toBeLessThan(0);
    });

    it('should calculate trend as stable when change is minimal', async () => {
      mockRepo.getClassMetrics.mockResolvedValue([
        {
          classId: 'class-001',
          className: 'Math 101',
          avgMastery: 0.72,
          avgEngagement: 0.82,
          prevAvgMastery: 0.71, // < 5% change
          totalStudents: 25,
          atRiskCount: 2,
          iepCount: 1,
        },
      ]);

      const result = await service.getClassPerformance({
        teacherId: 'teacher-001',
        tenantId: 'tenant-001',
      });

      expect(result[0].trend).toBe('stable');
    });

    it('should round mastery and engagement to 2 decimal places', async () => {
      mockRepo.getClassMetrics.mockResolvedValue([
        {
          classId: 'class-001',
          className: 'Math 101',
          avgMastery: 0.78456,
          avgEngagement: 0.82123,
          prevAvgMastery: 0.72,
          totalStudents: 25,
          atRiskCount: 2,
          iepCount: 1,
        },
      ]);

      const result = await service.getClassPerformance({
        teacherId: 'teacher-001',
        tenantId: 'tenant-001',
      });

      expect(result[0].mastery).toBe(0.78);
      expect(result[0].engagement).toBe(0.82);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AT-RISK STUDENTS TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getAtRiskStudents', () => {
    it('should return at-risk students with intervention suggestions', async () => {
      mockRepo.getAtRiskStudents.mockResolvedValue(createMockAtRiskStudents());

      const result = await service.getAtRiskStudents({
        teacherId: 'teacher-001',
        tenantId: 'tenant-001',
      });

      expect(result.students).toHaveLength(2);
      expect(result.students[0]).toHaveProperty('suggestedInterventions');
      expect(result.students[0].suggestedInterventions.length).toBeGreaterThan(0);
    });

    it('should provide intervention suggestions based on risk factors', async () => {
      mockRepo.getAtRiskStudents.mockResolvedValue([
        {
          learnerId: 'learner-001',
          learnerName: 'John Doe',
          className: 'Math 101',
          classId: 'class-001',
          riskLevel: 'HIGH',
          riskFactors: ['Low engagement'],
          lastActivityAt: new Date(),
          masteryLevel: 0.35,
          engagementScore: 0.25,
        },
      ]);

      const result = await service.getAtRiskStudents({
        teacherId: 'teacher-001',
        tenantId: 'tenant-001',
      });

      const suggestions = result.students[0].suggestedInterventions;
      expect(suggestions).toContain('One-on-one check-in');
      expect(suggestions).toContain('Gamification incentives');
    });

    it('should map risk levels correctly', async () => {
      mockRepo.getAtRiskStudents.mockResolvedValue([
        { ...createMockAtRiskStudents()[0], riskLevel: 'HIGH' },
        { ...createMockAtRiskStudents()[0], learnerId: 'l2', riskLevel: 'CRITICAL' },
        { ...createMockAtRiskStudents()[0], learnerId: 'l3', riskLevel: 'MEDIUM' },
        { ...createMockAtRiskStudents()[0], learnerId: 'l4', riskLevel: 'LOW' },
      ]);

      const result = await service.getAtRiskStudents({
        teacherId: 'teacher-001',
        tenantId: 'tenant-001',
      });

      expect(result.students[0].riskLevel).toBe('high');
      expect(result.students[1].riskLevel).toBe('high');
      expect(result.students[2].riskLevel).toBe('medium');
      expect(result.students[3].riskLevel).toBe('low');
    });

    it('should calculate days since activity', async () => {
      vi.setSystemTime(new Date('2024-01-20T12:00:00Z'));
      mockRepo.getAtRiskStudents.mockResolvedValue([
        {
          ...createMockAtRiskStudents()[0],
          lastActivityAt: new Date('2024-01-15T12:00:00Z'), // 5 days ago
        },
      ]);

      const result = await service.getAtRiskStudents({
        teacherId: 'teacher-001',
        tenantId: 'tenant-001',
      });

      expect(result.students[0].daysSinceActivity).toBe(5);
    });

    it('should count students by risk level', async () => {
      mockRepo.getAtRiskStudents.mockResolvedValue([
        { ...createMockAtRiskStudents()[0], riskLevel: 'HIGH' },
        { ...createMockAtRiskStudents()[0], learnerId: 'l2', riskLevel: 'HIGH' },
        { ...createMockAtRiskStudents()[0], learnerId: 'l3', riskLevel: 'MEDIUM' },
      ]);

      const result = await service.getAtRiskStudents({
        teacherId: 'teacher-001',
        tenantId: 'tenant-001',
      });

      expect(result.byRiskLevel.high).toBe(2);
      expect(result.byRiskLevel.medium).toBe(1);
      expect(result.byRiskLevel.low).toBe(0);
    });

    it('should respect limit parameter', async () => {
      const manyStudents = Array.from({ length: 20 }, (_, i) => ({
        ...createMockAtRiskStudents()[0],
        learnerId: `learner-${i}`,
      }));
      mockRepo.getAtRiskStudents.mockResolvedValue(manyStudents);

      const result = await service.getAtRiskStudents({
        teacherId: 'teacher-001',
        tenantId: 'tenant-001',
        limit: 5,
      });

      expect(result.students.length).toBe(5);
      expect(result.total).toBe(20);
    });

    it('should provide relative time for last activity', async () => {
      vi.setSystemTime(new Date('2024-01-20T12:00:00Z'));
      mockRepo.getAtRiskStudents.mockResolvedValue([
        {
          ...createMockAtRiskStudents()[0],
          lastActivityAt: new Date('2024-01-20T11:30:00Z'), // 30 mins ago
        },
      ]);

      const result = await service.getAtRiskStudents({
        teacherId: 'teacher-001',
        tenantId: 'tenant-001',
      });

      expect(result.students[0].lastActivity).toContain('minute');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // IEP PROGRESS TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getIEPProgress', () => {
    it('should return IEP progress entries with status', async () => {
      mockRepo.getIEPGoals.mockResolvedValue(createMockIEPGoals());

      const result = await service.getIEPProgress({
        teacherId: 'teacher-001',
        tenantId: 'tenant-001',
      });

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0]).toHaveProperty('goalId');
      expect(result.entries[0]).toHaveProperty('status');
      expect(result.entries[0]).toHaveProperty('currentProgress');
      expect(result.entries[0]).toHaveProperty('targetProgress');
    });

    it('should map IEP status correctly', async () => {
      mockRepo.getIEPGoals.mockResolvedValue([
        { ...createMockIEPGoals()[0], status: 'ON_TRACK', currentProgress: 0.65, expectedProgress: 0.60 },
        { ...createMockIEPGoals()[0], id: 'g2', status: 'COMPLETED', currentProgress: 1.2, expectedProgress: 1.0 },
        { ...createMockIEPGoals()[0], id: 'g3', status: 'BEHIND', currentProgress: 0.40, expectedProgress: 0.70 },
      ]);

      const result = await service.getIEPProgress({
        teacherId: 'teacher-001',
        tenantId: 'tenant-001',
      });

      expect(result.entries[0].status).toBe('on-track');
      expect(result.entries[1].status).toBe('exceeded');
      expect(result.entries[2].status).toBe('at-risk');
    });

    it('should calculate IEP summary statistics', async () => {
      mockRepo.getIEPGoals.mockResolvedValue([
        { ...createMockIEPGoals()[0], status: 'ON_TRACK', currentProgress: 0.65, expectedProgress: 0.60 },
        { ...createMockIEPGoals()[0], id: 'g2', status: 'COMPLETED', currentProgress: 1.2, expectedProgress: 1.0 },
        { ...createMockIEPGoals()[0], id: 'g3', status: 'BEHIND', currentProgress: 0.40, expectedProgress: 0.70 },
      ]);

      const result = await service.getIEPProgress({
        teacherId: 'teacher-001',
        tenantId: 'tenant-001',
      });

      expect(result.summary.total).toBe(3);
      expect(result.summary.onTrack).toBe(1);
      expect(result.summary.exceeded).toBe(1);
      expect(result.summary.atRisk).toBe(1);
    });

    it('should count upcoming reviews within 7 days', async () => {
      vi.setSystemTime(new Date('2024-01-20T12:00:00Z'));
      mockRepo.getIEPGoals.mockResolvedValue([
        { ...createMockIEPGoals()[0], nextReviewDate: new Date('2024-01-25') }, // 5 days
        { ...createMockIEPGoals()[0], id: 'g2', nextReviewDate: new Date('2024-02-15') }, // 26 days
      ]);

      const result = await service.getIEPProgress({
        teacherId: 'teacher-001',
        tenantId: 'tenant-001',
      });

      expect(result.upcomingReviewsCount).toBe(1);
    });

    it('should round progress values', async () => {
      mockRepo.getIEPGoals.mockResolvedValue([
        { ...createMockIEPGoals()[0], currentProgress: 0.6543, expectedProgress: 0.7891 },
      ]);

      const result = await service.getIEPProgress({
        teacherId: 'teacher-001',
        tenantId: 'tenant-001',
      });

      expect(result.entries[0].currentProgress).toBe(0.65);
      expect(result.entries[0].targetProgress).toBe(0.79);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // RECENT ACTIVITY TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getRecentActivity', () => {
    it('should return recent activity items', async () => {
      mockRepo.getRecentActivity.mockResolvedValue(createMockActivity());

      const result = await service.getRecentActivity({
        teacherId: 'teacher-001',
        tenantId: 'tenant-001',
      });

      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toHaveProperty('id');
      expect(result.items[0]).toHaveProperty('type');
      expect(result.items[0]).toHaveProperty('title');
      expect(result.items[0]).toHaveProperty('relativeTime');
    });

    it('should mark alerts as action required', async () => {
      mockRepo.getRecentActivity.mockResolvedValue(createMockActivity());

      const result = await service.getRecentActivity({
        teacherId: 'teacher-001',
        tenantId: 'tenant-001',
      });

      const alertItem = result.items.find(i => i.type === 'alert');
      expect(alertItem?.actionRequired).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const manyActivities = Array.from({ length: 30 }, (_, i) => ({
        ...createMockActivity()[0],
        id: `activity-${i}`,
      }));
      mockRepo.getRecentActivity.mockResolvedValue(manyActivities);

      const result = await service.getRecentActivity({
        teacherId: 'teacher-001',
        tenantId: 'tenant-001',
        limit: 10,
      });

      expect(result.items.length).toBe(10);
      expect(result.hasMore).toBe(true);
    });

    it('should provide relative time for timestamps', async () => {
      vi.setSystemTime(new Date('2024-01-20T12:00:00Z'));
      mockRepo.getRecentActivity.mockResolvedValue([
        {
          ...createMockActivity()[0],
          timestamp: new Date('2024-01-20T11:55:00Z'), // 5 mins ago
        },
      ]);

      const result = await service.getRecentActivity({
        teacherId: 'teacher-001',
        tenantId: 'tenant-001',
      });

      expect(result.items[0].relativeTime).toContain('minute');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // UPCOMING ITEMS TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getUpcomingItems', () => {
    it('should return upcoming items with days until', async () => {
      vi.setSystemTime(new Date('2024-01-20T12:00:00Z'));
      mockRepo.getUpcomingItems.mockResolvedValue(createMockUpcomingItems());

      const result = await service.getUpcomingItems({
        teacherId: 'teacher-001',
        tenantId: 'tenant-001',
      });

      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toHaveProperty('daysUntil');
      expect(result.items[0].daysUntil).toBeGreaterThanOrEqual(0);
    });

    it('should count items by type', async () => {
      mockRepo.getUpcomingItems.mockResolvedValue([
        { ...createMockUpcomingItems()[0], type: 'deadline' },
        { ...createMockUpcomingItems()[0], id: 'u2', type: 'deadline' },
        { ...createMockUpcomingItems()[0], id: 'u3', type: 'meeting' },
        { ...createMockUpcomingItems()[0], id: 'u4', type: 'review' },
      ]);

      const result = await service.getUpcomingItems({
        teacherId: 'teacher-001',
        tenantId: 'tenant-001',
      });

      expect(result.byType.deadline).toBe(2);
      expect(result.byType.meeting).toBe(1);
      expect(result.byType.review).toBe(1);
      expect(result.byType.event).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CACHE INVALIDATION TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('invalidateCache', () => {
    it('should delete matching cache keys', async () => {
      mockRedis.keys.mockResolvedValue([
        'dashboard:summary:tenant-001:teacher-001:week',
        'dashboard:stats:tenant-001:teacher-001:week',
      ]);

      await service.invalidateCache('teacher-001', 'tenant-001');

      expect(mockRedis.keys).toHaveBeenCalledWith(expect.stringContaining('teacher-001'));
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('should not call del when no keys found', async () => {
      mockRedis.keys.mockResolvedValue([]);

      await service.invalidateCache('teacher-001', 'tenant-001');

      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ERROR HANDLING TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('should continue when cache read fails', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
      mockRepo.getAggregateStats.mockResolvedValue(createMockStats());
      mockRepo.getClassMetrics.mockResolvedValue([]);
      mockRepo.getAtRiskStudents.mockResolvedValue([]);
      mockRepo.getIEPGoals.mockResolvedValue([]);
      mockRepo.getRecentActivity.mockResolvedValue([]);
      mockRepo.getUpcomingItems.mockResolvedValue([]);

      const result = await service.getDashboardSummary({
        teacherId: 'teacher-001',
        tenantId: 'tenant-001',
      });

      expect(result).toBeDefined();
      expect(result.metadata.cached).toBe(false);
    });

    it('should continue when cache write fails', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis write failed'));
      mockRepo.getAggregateStats.mockResolvedValue(createMockStats());
      mockRepo.getClassMetrics.mockResolvedValue([]);
      mockRepo.getAtRiskStudents.mockResolvedValue([]);
      mockRepo.getIEPGoals.mockResolvedValue([]);
      mockRepo.getRecentActivity.mockResolvedValue([]);
      mockRepo.getUpcomingItems.mockResolvedValue([]);

      const result = await service.getDashboardSummary({
        teacherId: 'teacher-001',
        tenantId: 'tenant-001',
      });

      expect(result).toBeDefined();
    });
  });
});
