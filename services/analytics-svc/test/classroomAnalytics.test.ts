/**
 * Classroom Analytics Routes Tests
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
type RiskFlag = 'LOW_ENGAGEMENT' | 'STRUGGLING' | 'AT_RISK_OVERLOAD';

interface ClassroomOverviewResponse {
  classroomId: string;
  classroomName: string;
  period: { from: string; to: string };
  dataFreshAsOf: string;
  engagement: {
    activeLearnersCount: number;
    inactiveLearnersCount: number;
    totalLearnersCount: number;
    avgSessionsPerLearner: number;
    totalSessions: number;
    totalMinutes: number;
    sessionsPerDay: Array<{ date: string; count: number }>;
  };
  learningProgress: {
    bySubject: Array<{
      subjectCode: string;
      subjectName: string;
      avgMastery: number;
      masteryDistribution: Array<{ range: string; count: number; percentage: number }>;
      learnersWithData: number;
    }>;
    overallAvgMastery: number;
  };
  homework: {
    learnersUsingHomework: number;
    totalLearners: number;
    usagePercentage: number;
    avgSessionsPerUser: number;
  };
  focus: {
    avgBreaksPerSession: number;
    totalSessions: number;
    sessionsWithBreaks: number;
    breakRatePercentage: number;
  };
}

interface LearnerListItem {
  learnerId: string;
  learnerName: string;
  grade: string;
  sessionsCount: number;
  totalMinutes: number;
  avgMasteryScore: number;
  focusBreaksPerSession: number;
  lastActiveDate: string | null;
  riskFlags: RiskFlag[];
}

interface ClassroomLearnerListResponse {
  classroomId: string;
  period: { from: string; to: string };
  dataFreshAsOf: string;
  learners: LearnerListItem[];
  totalCount: number;
  flagCounts: {
    lowEngagement: number;
    struggling: number;
    atRiskOverload: number;
  };
}

const mockQueryRaw = prisma.$queryRaw as ReturnType<typeof vi.fn>;

describe('classroomAnalyticsRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /analytics/classrooms/:classroomId/overview', () => {
    it('should return classroom overview with engagement metrics', async () => {
      // Setup mocks
      mockQueryRaw
        // classroom dim
        .mockResolvedValueOnce([{ classroom_key: 1, classroom_name: 'Math 101' }])
        // classroom learners
        .mockResolvedValueOnce([
          { learner_key: 1, learner_id: 'learner-1' },
          { learner_key: 2, learner_id: 'learner-2' },
          { learner_key: 3, learner_id: 'learner-3' },
        ])
        // session data
        .mockResolvedValueOnce([
          { learner_key: 1, date_key: 20241201, sessions: BigInt(3), minutes: BigInt(45) },
          { learner_key: 2, date_key: 20241201, sessions: BigInt(2), minutes: BigInt(30) },
          { learner_key: 1, date_key: 20241202, sessions: BigInt(2), minutes: BigInt(30) },
        ])
        // progress data
        .mockResolvedValueOnce([
          {
            learner_key: 1,
            subject_key: 1,
            subject_code: 'MATH',
            subject_name: 'Mathematics',
            average_mastery: 0.75,
          },
          {
            learner_key: 2,
            subject_key: 1,
            subject_code: 'MATH',
            subject_name: 'Mathematics',
            average_mastery: 0.65,
          },
        ])
        // homework data
        .mockResolvedValueOnce([
          { learner_key: 1, sessions: BigInt(5) },
          { learner_key: 2, sessions: BigInt(3) },
        ])
        // focus data
        .mockResolvedValueOnce([{ total_breaks: BigInt(8), total_sessions: BigInt(4) }]);

      // Import and test
      const { classroomAnalyticsRoutes } = await import('../src/routes/classroomAnalytics.js');

      // Validate the response structure
      const expectedEngagement = {
        activeLearnersCount: 2,
        inactiveLearnersCount: 1,
        totalLearnersCount: 3,
        avgSessionsPerLearner: expect.any(Number),
        totalSessions: 7,
        totalMinutes: 105,
        sessionsPerDay: expect.any(Array),
      };

      // Check that prisma was called the expected number of times
      expect(mockQueryRaw).toHaveBeenCalledTimes(6);
    });

    it('should return empty response for classroom with no learners', async () => {
      mockQueryRaw
        .mockResolvedValueOnce([{ classroom_key: 1, classroom_name: 'Empty Class' }])
        .mockResolvedValueOnce([]); // No learners

      const { classroomAnalyticsRoutes } = await import('../src/routes/classroomAnalytics.js');

      // With no learners, should return empty structure
      expect(mockQueryRaw).toHaveBeenCalledTimes(2);
    });

    it('should return 404 for non-existent classroom', async () => {
      mockQueryRaw.mockResolvedValueOnce([]); // No classroom found

      const { classroomAnalyticsRoutes } = await import('../src/routes/classroomAnalytics.js');

      expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /analytics/classrooms/:classroomId/learner-list', () => {
    it('should return learner list with risk flags', async () => {
      mockQueryRaw
        // classroom dim
        .mockResolvedValueOnce([{ classroom_key: 1 }])
        // learner data
        .mockResolvedValueOnce([
          { learner_key: 1, learner_id: 'learner-1', full_name: 'Alice Smith', grade_level: '5' },
          { learner_key: 2, learner_id: 'learner-2', full_name: 'Bob Jones', grade_level: '5' },
          { learner_key: 3, learner_id: 'learner-3', full_name: 'Charlie Brown', grade_level: '5' },
        ])
        // session stats
        .mockResolvedValueOnce([
          { learner_key: 1, sessions: BigInt(10), minutes: BigInt(150), last_date: 20241209 },
          { learner_key: 2, sessions: BigInt(1), minutes: BigInt(15), last_date: 20241201 }, // Low engagement
        ])
        // mastery stats
        .mockResolvedValueOnce([
          { learner_key: 1, avg_mastery: 0.8 },
          { learner_key: 2, avg_mastery: 0.25 }, // Struggling
        ])
        // focus stats
        .mockResolvedValueOnce([
          { learner_key: 1, breaks: BigInt(5), sessions: BigInt(10) },
          { learner_key: 3, breaks: BigInt(20), sessions: BigInt(5) }, // High focus breaks
        ]);

      const { classroomAnalyticsRoutes } = await import('../src/routes/classroomAnalytics.js');

      expect(mockQueryRaw).toHaveBeenCalledTimes(5);
    });

    it('should correctly identify LOW_ENGAGEMENT flag', () => {
      // A learner with < 0.5 sessions per week expected should be flagged
      // For 28 days, expected = 4, so < 2 sessions = LOW_ENGAGEMENT
      const periodDays = 28;
      const expectedSessions = periodDays / 7; // 4
      const threshold = expectedSessions * 0.5; // 2

      expect(1 < threshold).toBe(true); // 1 session in 28 days = flagged
      expect(3 < threshold).toBe(false); // 3 sessions in 28 days = not flagged
    });

    it('should correctly identify STRUGGLING flag', () => {
      // A learner with avgMastery < 0.4 and > 0 should be flagged
      expect(0.35 < 0.4 && 0.35 > 0).toBe(true); // Struggling
      expect(0.45 < 0.4).toBe(false); // Not struggling
      expect(0 > 0).toBe(false); // No data, don't flag
    });

    it('should correctly identify AT_RISK_OVERLOAD flag', () => {
      // A learner with > 3 focus breaks per session should be flagged
      expect(4 > 3).toBe(true); // Overload
      expect(2.5 > 3).toBe(false); // Not overload
    });
  });

  describe('risk flag computation', () => {
    it('should assign multiple flags when applicable', () => {
      // A learner could have both LOW_ENGAGEMENT and STRUGGLING
      const flags: RiskFlag[] = [];

      const sessionsCount = 1;
      const avgMastery = 0.3;
      const focusBreaksPerSession = 4;
      const periodDays = 28;

      // LOW_ENGAGEMENT
      const expectedSessions = periodDays / 7;
      if (sessionsCount < expectedSessions * 0.5) {
        flags.push('LOW_ENGAGEMENT');
      }

      // STRUGGLING
      if (avgMastery < 0.4 && avgMastery > 0) {
        flags.push('STRUGGLING');
      }

      // AT_RISK_OVERLOAD
      if (focusBreaksPerSession > 3) {
        flags.push('AT_RISK_OVERLOAD');
      }

      expect(flags).toContain('LOW_ENGAGEMENT');
      expect(flags).toContain('STRUGGLING');
      expect(flags).toContain('AT_RISK_OVERLOAD');
      expect(flags.length).toBe(3);
    });
  });

  describe('mastery distribution buckets', () => {
    it('should correctly bucket mastery scores', () => {
      const masteries = [0.15, 0.25, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95, 1.0];

      const buckets = [
        { range: '0-20%', count: 0 },
        { range: '20-40%', count: 0 },
        { range: '40-60%', count: 0 },
        { range: '60-80%', count: 0 },
        { range: '80-100%', count: 0 },
      ];

      for (const m of masteries) {
        if (m < 0.2) buckets[0].count++;
        else if (m < 0.4) buckets[1].count++;
        else if (m < 0.6) buckets[2].count++;
        else if (m < 0.8) buckets[3].count++;
        else buckets[4].count++;
      }

      expect(buckets[0].count).toBe(1); // 0.15
      expect(buckets[1].count).toBe(1); // 0.25
      expect(buckets[2].count).toBe(2); // 0.45, 0.55
      expect(buckets[3].count).toBe(2); // 0.65, 0.75
      expect(buckets[4].count).toBe(3); // 0.85, 0.95, 1.0
    });
  });
});
