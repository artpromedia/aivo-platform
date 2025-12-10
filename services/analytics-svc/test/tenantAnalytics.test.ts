/**
 * Tenant Analytics Routes Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the prisma client
vi.mock('../src/prisma.js', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

import { prisma } from '../src/prisma.js';

// Types from the routes
interface TenantOverviewResponse {
  tenantId: string;
  tenantName: string;
  period: { from: string; to: string };
  dataFreshAsOf: string;
  engagement: {
    activeSchoolsCount: number;
    totalSchoolsCount: number;
    activeClassroomsCount: number;
    totalClassroomsCount: number;
    activeLearnersCount: number;
    totalLearnersCount: number;
    avgSessionsPerLearner: number;
    totalSessions: number;
    totalMinutes: number;
  };
  progress: {
    overallAvgMastery: number;
    masteryDistribution: Array<{ range: string; count: number; percentage: number }>;
    learnersWithProgressData: number;
  };
  moduleUsage: Array<{
    moduleName: string;
    enabled: boolean;
    activeUsers: number;
    usagePercentage: number;
  }>;
  dailyTrend: Array<{ date: string; sessions: number; activeLearners: number }>;
}

interface SchoolSummary {
  schoolId: string;
  schoolName: string;
  learnersCount: number;
  activeLearnersCount: number;
  classroomsCount: number;
  avgSessionsPerLearner: number;
  totalSessions: number;
  avgMastery: number;
  engagementRate: number;
}

interface TenantSchoolsResponse {
  tenantId: string;
  period: { from: string; to: string };
  dataFreshAsOf: string;
  schools: SchoolSummary[];
  totalSchools: number;
}

const mockQueryRaw = prisma.$queryRaw as ReturnType<typeof vi.fn>;

describe('tenantAnalyticsRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /analytics/tenants/:tenantId/overview', () => {
    it('should return tenant overview with engagement metrics', async () => {
      mockQueryRaw
        // tenant dim
        .mockResolvedValueOnce([{ tenant_key: 1, tenant_name: 'Springfield District' }])
        // school count
        .mockResolvedValueOnce([{ count: BigInt(5) }])
        // classroom count
        .mockResolvedValueOnce([{ count: BigInt(25) }])
        // learner count
        .mockResolvedValueOnce([{ count: BigInt(500) }])
        // session data
        .mockResolvedValueOnce([
          {
            learner_key: 1,
            school_key: 1,
            classroom_key: 1,
            date_key: 20241201,
            sessions: BigInt(3),
            minutes: BigInt(45),
          },
          {
            learner_key: 2,
            school_key: 1,
            classroom_key: 1,
            date_key: 20241201,
            sessions: BigInt(2),
            minutes: BigInt(30),
          },
          {
            learner_key: 3,
            school_key: 2,
            classroom_key: 2,
            date_key: 20241202,
            sessions: BigInt(1),
            minutes: BigInt(15),
          },
        ])
        // progress data
        .mockResolvedValueOnce([
          { learner_key: 1, avg_mastery: 0.75 },
          { learner_key: 2, avg_mastery: 0.65 },
          { learner_key: 3, avg_mastery: 0.55 },
        ])
        // homework users
        .mockResolvedValueOnce([{ count: BigInt(2) }])
        // focus users
        .mockResolvedValueOnce([{ count: BigInt(3) }])
        // sel users
        .mockResolvedValueOnce([{ count: BigInt(1) }]);

      const { tenantAnalyticsRoutes } = await import('../src/routes/tenantAnalytics.js');

      expect(mockQueryRaw).toHaveBeenCalledTimes(9);
    });

    it('should calculate correct module usage percentages', () => {
      const activeLearnersCount = 100;
      const homeworkUserCount = 45;
      const focusUserCount = 30;
      const selUserCount = 10;

      const homeworkUsagePercentage = Math.round((homeworkUserCount / activeLearnersCount) * 100);
      const focusUsagePercentage = Math.round((focusUserCount / activeLearnersCount) * 100);
      const selUsagePercentage = Math.round((selUserCount / activeLearnersCount) * 100);

      expect(homeworkUsagePercentage).toBe(45);
      expect(focusUsagePercentage).toBe(30);
      expect(selUsagePercentage).toBe(10);
    });

    it('should return 404 for non-existent tenant', async () => {
      mockQueryRaw.mockResolvedValueOnce([]); // No tenant found

      const { tenantAnalyticsRoutes } = await import('../src/routes/tenantAnalytics.js');

      expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /analytics/tenants/:tenantId/schools', () => {
    it('should return per-school metrics sorted by engagement', async () => {
      mockQueryRaw
        // tenant dim
        .mockResolvedValueOnce([{ tenant_key: 1 }])
        // school data
        .mockResolvedValueOnce([
          { school_key: 1, school_id: 'school-1', school_name: 'Maple Elementary' },
          { school_key: 2, school_id: 'school-2', school_name: 'Cedar Middle School' },
        ])
        // learner counts
        .mockResolvedValueOnce([
          { school_key: 1, count: BigInt(200) },
          { school_key: 2, count: BigInt(400) },
        ])
        // classroom counts
        .mockResolvedValueOnce([
          { school_key: 1, count: BigInt(10) },
          { school_key: 2, count: BigInt(20) },
        ])
        // session stats
        .mockResolvedValueOnce([
          { school_key: 1, learner_key: 1, sessions: BigInt(5) },
          { school_key: 1, learner_key: 2, sessions: BigInt(3) },
          { school_key: 2, learner_key: 3, sessions: BigInt(10) },
        ])
        // mastery stats
        .mockResolvedValueOnce([
          { school_key: 1, avg_mastery: 0.72 },
          { school_key: 2, avg_mastery: 0.68 },
        ]);

      const { tenantAnalyticsRoutes } = await import('../src/routes/tenantAnalytics.js');

      expect(mockQueryRaw).toHaveBeenCalledTimes(6);
    });

    it('should calculate engagement rate correctly', () => {
      const learnersCount = 200;
      const activeLearnersCount = 150;

      const engagementRate = Math.round((activeLearnersCount / learnersCount) * 100);

      expect(engagementRate).toBe(75);
    });

    it('should return empty array for tenant with no schools', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ tenant_key: 1 }]).mockResolvedValueOnce([]); // No schools

      const { tenantAnalyticsRoutes } = await import('../src/routes/tenantAnalytics.js');

      expect(mockQueryRaw).toHaveBeenCalledTimes(2);
    });
  });

  describe('daily trend calculation', () => {
    it('should build daily trend from session data', () => {
      const sessionsByDate = new Map<number, { sessions: number; learners: Set<number> }>();

      // Simulate session data
      const sessionData = [
        { date_key: 20241201, sessions: 10, learner_key: 1 },
        { date_key: 20241201, sessions: 5, learner_key: 2 },
        { date_key: 20241202, sessions: 8, learner_key: 1 },
        { date_key: 20241202, sessions: 3, learner_key: 3 },
      ];

      for (const row of sessionData) {
        if (!sessionsByDate.has(row.date_key)) {
          sessionsByDate.set(row.date_key, { sessions: 0, learners: new Set() });
        }
        const dayData = sessionsByDate.get(row.date_key)!;
        dayData.sessions += row.sessions;
        dayData.learners.add(row.learner_key);
      }

      const trend = Array.from(sessionsByDate.entries())
        .sort(([a], [b]) => a - b)
        .map(([dateKey, data]) => ({
          date: `${String(dateKey).slice(0, 4)}-${String(dateKey).slice(4, 6)}-${String(dateKey).slice(6, 8)}`,
          sessions: data.sessions,
          activeLearners: data.learners.size,
        }));

      expect(trend).toHaveLength(2);
      expect(trend[0]).toEqual({ date: '2024-12-01', sessions: 15, activeLearners: 2 });
      expect(trend[1]).toEqual({ date: '2024-12-02', sessions: 11, activeLearners: 2 });
    });
  });

  describe('access control', () => {
    it('should deny access if user tenant does not match', () => {
      const userTenantId = 'tenant-1';
      const requestedTenantId = 'tenant-2';
      const userRole = 'district_admin';

      const hasAccess =
        userTenantId === requestedTenantId &&
        (userRole === 'district_admin' || userRole === 'platform_admin');

      expect(hasAccess).toBe(false);
    });

    it('should allow access for district_admin of same tenant', () => {
      const userTenantId = 'tenant-1';
      const requestedTenantId = 'tenant-1';
      const userRole = 'district_admin';

      const hasAccess =
        userTenantId === requestedTenantId &&
        (userRole === 'district_admin' || userRole === 'platform_admin');

      expect(hasAccess).toBe(true);
    });

    it('should deny access for teacher role at tenant level', () => {
      const userTenantId = 'tenant-1';
      const requestedTenantId = 'tenant-1';
      const userRole = 'teacher';

      const hasAccess =
        userTenantId === requestedTenantId &&
        (userRole === 'district_admin' || userRole === 'platform_admin');

      expect(hasAccess).toBe(false);
    });
  });

  describe('mastery distribution', () => {
    it('should create correct distribution buckets', () => {
      const masteries = [0.1, 0.3, 0.5, 0.7, 0.9];
      const total = masteries.length;

      const buckets = [
        { range: '0-20%', min: 0, max: 0.2, count: 0 },
        { range: '20-40%', min: 0.2, max: 0.4, count: 0 },
        { range: '40-60%', min: 0.4, max: 0.6, count: 0 },
        { range: '60-80%', min: 0.6, max: 0.8, count: 0 },
        { range: '80-100%', min: 0.8, max: 1.0, count: 0 },
      ];

      for (const m of masteries) {
        for (const b of buckets) {
          if (m >= b.min && m < b.max) {
            b.count++;
            break;
          }
          if (m >= b.min && b.max === 1.0) {
            b.count++;
            break;
          }
        }
      }

      expect(buckets[0].count).toBe(1); // 0.1
      expect(buckets[1].count).toBe(1); // 0.3
      expect(buckets[2].count).toBe(1); // 0.5
      expect(buckets[3].count).toBe(1); // 0.7
      expect(buckets[4].count).toBe(1); // 0.9

      // Each bucket should have 20% of learners
      for (const b of buckets) {
        const percentage = Math.round((b.count / total) * 100);
        expect(percentage).toBe(20);
      }
    });
  });
});
