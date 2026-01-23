/**
 * Dashboard Repository
 *
 * Data access layer for teacher dashboard queries.
 * Uses Prisma for database operations with optimized queries.
 *
 * All queries are tenant-scoped and teacher-scoped for security.
 *
 * @module dashboard.repository
 */

import { logger, metrics } from '@aivo/ts-observability';

import { prisma } from '../prisma.js';
import type {
  DashboardQueryOptions,
  AtRiskQueryOptions,
  ActivityQueryOptions,
  UpcomingQueryOptions,
  RawClassMetrics,
  RawStudentRisk,
  RawIEPGoal,
  PeriodDateRange,
  DashboardPeriod,
} from '../types/dashboard.types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const SLOW_QUERY_THRESHOLD_MS = 500;

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate date range for a given period
 */
export function getPeriodDateRange(period: DashboardPeriod): PeriodDateRange {
  const end = new Date();
  const start = new Date();
  const previousEnd = new Date();
  const previousStart = new Date();

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      previousEnd.setHours(0, 0, 0, 0);
      previousStart.setDate(previousStart.getDate() - 1);
      previousStart.setHours(0, 0, 0, 0);
      break;

    case 'week':
      start.setDate(start.getDate() - 7);
      previousEnd.setDate(previousEnd.getDate() - 7);
      previousStart.setDate(previousStart.getDate() - 14);
      break;

    case 'month':
      start.setMonth(start.getMonth() - 1);
      previousEnd.setMonth(previousEnd.getMonth() - 1);
      previousStart.setMonth(previousStart.getMonth() - 2);
      break;

    case 'quarter':
      start.setMonth(start.getMonth() - 3);
      previousEnd.setMonth(previousEnd.getMonth() - 3);
      previousStart.setMonth(previousStart.getMonth() - 6);
      break;

    case 'year':
      start.setFullYear(start.getFullYear() - 1);
      previousEnd.setFullYear(previousEnd.getFullYear() - 1);
      previousStart.setFullYear(previousStart.getFullYear() - 2);
      break;
  }

  return { start, end, previousStart, previousEnd };
}

/**
 * Log slow queries for monitoring
 */
function logQueryTiming(queryName: string, startTime: number): void {
  const duration = Date.now() - startTime;
  // Use database histogram for query timing
  metrics.database.queryDuration.observe({ query: queryName, operation: 'dashboard' }, duration / 1000);

  if (duration > SLOW_QUERY_THRESHOLD_MS) {
    logger.warn({ query: queryName, durationMs: duration, threshold: SLOW_QUERY_THRESHOLD_MS }, 'Slow dashboard query detected');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPOSITORY CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class DashboardRepository {
  /**
   * Get class metrics for a teacher
   */
  async getClassMetrics(options: DashboardQueryOptions): Promise<RawClassMetrics[]> {
    const startTime = Date.now();
    const { teacherId, tenantId, period = 'week' } = options;
    const { start } = getPeriodDateRange(period);

    try {
      // Get classes taught by this teacher with summary data
      const classSummaries = await prisma.classAnalyticsSummary.findMany({
        where: {
          tenantId,
          teacherId,
          summaryDate: { gte: start },
        },
        orderBy: { summaryDate: 'desc' },
        distinct: ['classId'],
      });

      // Get previous period summaries for trend calculation
      const { previousStart, previousEnd } = getPeriodDateRange(period);
      const previousSummaries = await prisma.classAnalyticsSummary.findMany({
        where: {
          tenantId,
          teacherId,
          summaryDate: { gte: previousStart, lt: previousEnd },
        },
        orderBy: { summaryDate: 'desc' },
        distinct: ['classId'],
      });

      const previousMasteryMap = new Map(
        previousSummaries.map((s) => [s.classId, s.avgClassMastery])
      );

      // Map to RawClassMetrics
      const results: RawClassMetrics[] = classSummaries.map((summary) => ({
        classId: summary.classId,
        className: `Class ${summary.classId.slice(-4)}`, // Placeholder - would join with Class table
        totalStudents: summary.totalStudents,
        avgMastery: summary.avgClassMastery,
        avgEngagement: summary.avgEngagement,
        atRiskCount: summary.highRiskCount + summary.criticalRiskCount,
        iepCount: summary.studentsWithIEP,
        prevAvgMastery: previousMasteryMap.get(summary.classId),
      }));

      logQueryTiming('getClassMetrics', startTime);
      return results;
    } catch (error) {
      logger.error({ err: error, teacherId, tenantId }, 'Failed to get class metrics');
      throw error;
    }
  }

  /**
   * Get aggregate stats for dashboard header
   */
  async getAggregateStats(options: DashboardQueryOptions): Promise<{
    totalStudents: number;
    averageMastery: number;
    iepStudents: number;
    atRiskStudents: number;
  }> {
    const startTime = Date.now();
    const { teacherId, tenantId, period = 'week' } = options;
    const { start } = getPeriodDateRange(period);

    try {
      // Get latest summary for each class
      const summaries = await prisma.classAnalyticsSummary.findMany({
        where: {
          tenantId,
          teacherId,
          summaryDate: { gte: start },
        },
        orderBy: { summaryDate: 'desc' },
        distinct: ['classId'],
      });

      const totalStudents = summaries.reduce((sum, s) => sum + s.totalStudents, 0);
      const iepStudents = summaries.reduce((sum, s) => sum + s.studentsWithIEP, 0);
      const atRiskStudents = summaries.reduce(
        (sum, s) => sum + s.highRiskCount + s.criticalRiskCount,
        0
      );

      // Calculate weighted average mastery
      const weightedMastery = summaries.reduce(
        (sum, s) => sum + s.avgClassMastery * s.totalStudents,
        0
      );
      const averageMastery =
        totalStudents > 0 ? Math.round((weightedMastery / totalStudents) * 10) / 10 : 0;

      logQueryTiming('getAggregateStats', startTime);
      return { totalStudents, averageMastery, iepStudents, atRiskStudents };
    } catch (error) {
      logger.error({ err: error, teacherId, tenantId }, 'Failed to get aggregate stats');
      throw error;
    }
  }

  /**
   * Get at-risk students for a teacher's classes
   */
  async getAtRiskStudents(options: AtRiskQueryOptions): Promise<RawStudentRisk[]> {
    const startTime = Date.now();
    const { teacherId, tenantId, limit = 10, riskLevel } = options;

    try {
      // Get class IDs for this teacher
      const classSummaries = await prisma.classAnalyticsSummary.findMany({
        where: { tenantId, teacherId },
        select: { classId: true },
        distinct: ['classId'],
      });

      const classIds = classSummaries.map((c) => c.classId);

      if (classIds.length === 0) {
        logQueryTiming('getAtRiskStudents', startTime);
        return [];
      }

      // Get at-risk learner snapshots
      const riskLevels = riskLevel ? [riskLevel.toUpperCase()] : ['HIGH', 'CRITICAL', 'MEDIUM'];

      const snapshots = await prisma.learnerModelSnapshot.findMany({
        where: {
          tenantId,
          classId: { in: classIds },
          riskLevel: { in: riskLevels as ('HIGH' | 'CRITICAL' | 'MEDIUM' | 'LOW')[] },
        },
        orderBy: [{ riskLevel: 'desc' }, { snapshotDate: 'desc' }],
        distinct: ['learnerId'],
        take: limit,
      });

      // Map to RawStudentRisk
      const results: RawStudentRisk[] = snapshots.map((snapshot) => ({
        learnerId: snapshot.learnerId,
        learnerName: `Student ${snapshot.learnerId.slice(-4)}`, // Placeholder
        classId: snapshot.classId ?? '',
        className: `Class ${(snapshot.classId ?? '').slice(-4)}`, // Placeholder
        riskLevel: snapshot.riskLevel.toLowerCase(),
        riskScore: snapshot.engagementScore * 100, // Simplified risk score
        riskFactors: Array.isArray(snapshot.riskFactors) ? (snapshot.riskFactors as string[]) : [],
        lastActivityAt: null, // Would need to join with session data
        engagementScore: snapshot.engagementScore,
        masteryLevel: snapshot.overallMastery,
      }));

      logQueryTiming('getAtRiskStudents', startTime);
      return results;
    } catch (error) {
      logger.error({ err: error, teacherId, tenantId }, 'Failed to get at-risk students');
      throw error;
    }
  }

  /**
   * Get IEP goals for students in teacher's classes
   */
  async getIEPGoals(options: DashboardQueryOptions): Promise<RawIEPGoal[]> {
    const startTime = Date.now();
    const { teacherId, tenantId, limit = 20 } = options;

    try {
      // Get class IDs for this teacher
      const classSummaries = await prisma.classAnalyticsSummary.findMany({
        where: { tenantId, teacherId },
        select: { classId: true },
        distinct: ['classId'],
      });

      const classIds = classSummaries.map((c) => c.classId);

      if (classIds.length === 0) {
        logQueryTiming('getIEPGoals', startTime);
        return [];
      }

      // Get IEP goals for students in these classes
      const goals = await prisma.iEPGoal.findMany({
        where: {
          tenantId,
          classId: { in: classIds },
          status: { not: 'DISCONTINUED' },
        },
        orderBy: [{ status: 'asc' }, { targetDate: 'asc' }],
        take: limit,
      });

      // Get upcoming reviews
      const learnerIds = [...new Set(goals.map((g) => g.learnerId))];
      const reviews = await prisma.iEPReviewSchedule.findMany({
        where: {
          tenantId,
          learnerId: { in: learnerIds },
          isCompleted: false,
          reviewDate: { gte: new Date() },
        },
        orderBy: { reviewDate: 'asc' },
      });

      const reviewMap = new Map(reviews.map((r) => [r.learnerId, r.reviewDate]));

      // Map to RawIEPGoal
      const results: RawIEPGoal[] = goals.map((goal) => ({
        id: goal.id,
        learnerId: goal.learnerId,
        learnerName: `Student ${goal.learnerId.slice(-4)}`, // Placeholder
        classId: goal.classId,
        className: goal.classId ? `Class ${goal.classId.slice(-4)}` : null, // Placeholder
        description: goal.description,
        category: goal.category,
        status: goal.status,
        currentProgress: goal.currentProgress,
        expectedProgress: goal.expectedProgress,
        targetDate: goal.targetDate,
        nextReviewDate: reviewMap.get(goal.learnerId),
      }));

      logQueryTiming('getIEPGoals', startTime);
      return results;
    } catch (error) {
      logger.error({ err: error, teacherId, tenantId }, 'Failed to get IEP goals');
      throw error;
    }
  }

  /**
   * Get recent activity for teacher's classes
   */
  async getRecentActivity(options: ActivityQueryOptions): Promise<
    {
      id: string;
      type: string;
      title: string;
      description: string;
      timestamp: Date;
      learnerId?: string;
      contentId?: string;
    }[]
  > {
    const startTime = Date.now();
    const { teacherId, tenantId, limit = 20, activityType, since } = options;

    try {
      // Get class IDs for this teacher
      const classSummaries = await prisma.classAnalyticsSummary.findMany({
        where: { tenantId, teacherId },
        select: { classId: true },
        distinct: ['classId'],
      });

      const classIds = classSummaries.map((c) => c.classId);

      if (classIds.length === 0) {
        logQueryTiming('getRecentActivity', startTime);
        return [];
      }

      // Get learner IDs from snapshots in these classes
      const snapshots = await prisma.learnerModelSnapshot.findMany({
        where: {
          tenantId,
          classId: { in: classIds },
        },
        select: { learnerId: true },
        distinct: ['learnerId'],
      });

      const learnerIds = snapshots.map((s) => s.learnerId);

      if (learnerIds.length === 0) {
        logQueryTiming('getRecentActivity', startTime);
        return [];
      }

      // Build activity type filter
      const eventTypes: string[] = [];
      if (!activityType || activityType === 'submission') {
        eventTypes.push('CONTENT_COMPLETED', 'ASSESSMENT_COMPLETED');
      }
      if (!activityType || activityType === 'grade') {
        eventTypes.push('ASSESSMENT_COMPLETED');
      }
      if (!activityType || activityType === 'alert') {
        eventTypes.push('SESSION_ENDED');
      }

      // Get recent learning events
      const events = await prisma.learningEvent.findMany({
        where: {
          tenantId,
          userId: { in: learnerIds },
          eventType: { in: eventTypes as any[] },
          timestamp: since ? { gte: since } : undefined,
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });

      // Map to activity items
      const results = events.map((event) => ({
        id: event.id,
        type: this.mapEventTypeToActivityType(event.eventType),
        title: this.getEventTitle(event.eventType),
        description: this.getEventDescription(event),
        timestamp: event.timestamp,
        learnerId: event.userId,
        contentId: event.contentId ?? undefined,
      }));

      logQueryTiming('getRecentActivity', startTime);
      return results;
    } catch (error) {
      logger.error({ err: error, teacherId, tenantId }, 'Failed to get recent activity');
      throw error;
    }
  }

  /**
   * Get upcoming items (deadlines, meetings, reviews)
   */
  async getUpcomingItems(options: UpcomingQueryOptions): Promise<
    {
      id: string;
      type: string;
      title: string;
      date: Date;
      priority: string;
      learnerId?: string;
    }[]
  > {
    const startTime = Date.now();
    const { teacherId, tenantId, daysAhead = 14, itemType } = options;

    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      const now = new Date();

      const results: {
        id: string;
        type: string;
        title: string;
        date: Date;
        priority: string;
        learnerId?: string;
      }[] = [];

      // Get IEP reviews if not filtered or filter matches
      if (!itemType || itemType === 'review') {
        const classSummaries = await prisma.classAnalyticsSummary.findMany({
          where: { tenantId, teacherId },
          select: { classId: true },
          distinct: ['classId'],
        });

        const classIds = classSummaries.map((c) => c.classId);

        if (classIds.length > 0) {
          const reviews = await prisma.iEPReviewSchedule.findMany({
            where: {
              tenantId,
              classId: { in: classIds },
              isCompleted: false,
              reviewDate: { gte: now, lte: futureDate },
            },
            orderBy: { reviewDate: 'asc' },
            take: 10,
          });

          for (const review of reviews) {
            const daysUntil = Math.ceil(
              (review.reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );

            results.push({
              id: review.id,
              type: 'review',
              title: `IEP Review: Student ${review.learnerId.slice(-4)}`,
              date: review.reviewDate,
              priority: daysUntil <= 3 ? 'high' : daysUntil <= 7 ? 'medium' : 'low',
              learnerId: review.learnerId,
            });
          }
        }
      }

      // Get IEP goal target dates as deadlines
      if (!itemType || itemType === 'deadline') {
        const classSummaries = await prisma.classAnalyticsSummary.findMany({
          where: { tenantId, teacherId },
          select: { classId: true },
          distinct: ['classId'],
        });

        const classIds = classSummaries.map((c) => c.classId);

        if (classIds.length > 0) {
          const goals = await prisma.iEPGoal.findMany({
            where: {
              tenantId,
              classId: { in: classIds },
              status: { in: ['ON_TRACK', 'BEHIND', 'AT_RISK'] },
              targetDate: { gte: now, lte: futureDate },
            },
            orderBy: { targetDate: 'asc' },
            take: 10,
          });

          for (const goal of goals) {
            const daysUntil = Math.ceil(
              (goal.targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );

            results.push({
              id: goal.id,
              type: 'deadline',
              title: `IEP Goal Due: ${goal.category}`,
              date: goal.targetDate,
              priority: goal.status === 'AT_RISK' ? 'high' : daysUntil <= 7 ? 'medium' : 'low',
              learnerId: goal.learnerId,
            });
          }
        }
      }

      // Sort all items by date
      results.sort((a, b) => a.date.getTime() - b.date.getTime());

      logQueryTiming('getUpcomingItems', startTime);
      return results;
    } catch (error) {
      logger.error({ err: error, teacherId, tenantId }, 'Failed to get upcoming items');
      throw error;
    }
  }

  /**
   * Get teacher contact history for a student
   */
  async getTeacherContactHistory(
    tenantId: string,
    teacherId: string,
    learnerId: string
  ): Promise<Date | null> {
    const startTime = Date.now();

    try {
      const contact = await prisma.teacherContactLog.findFirst({
        where: { tenantId, teacherId, learnerId },
        orderBy: { contactDate: 'desc' },
        select: { contactDate: true },
      });

      logQueryTiming('getTeacherContactHistory', startTime);
      return contact?.contactDate ?? null;
    } catch (error) {
      logger.error({ err: error, teacherId, learnerId }, 'Failed to get teacher contact history');
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Private Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private mapEventTypeToActivityType(eventType: string): string {
    switch (eventType) {
      case 'CONTENT_COMPLETED':
      case 'ASSESSMENT_COMPLETED':
        return 'submission';
      case 'SESSION_ENDED':
        return 'alert';
      default:
        return 'submission';
    }
  }

  private getEventTitle(eventType: string): string {
    switch (eventType) {
      case 'CONTENT_COMPLETED':
        return 'Content Completed';
      case 'ASSESSMENT_COMPLETED':
        return 'Assessment Completed';
      case 'SESSION_ENDED':
        return 'Session Ended';
      default:
        return 'Activity';
    }
  }

  private getEventDescription(event: {
    eventType: string;
    userId: string;
    contentId?: string | null;
  }): string {
    const studentId = event.userId.slice(-4);

    switch (event.eventType) {
      case 'CONTENT_COMPLETED':
        return `Student ${studentId} completed content`;
      case 'ASSESSMENT_COMPLETED':
        return `Student ${studentId} completed an assessment`;
      case 'SESSION_ENDED':
        return `Student ${studentId} ended their learning session`;
      default:
        return `Student ${studentId} activity recorded`;
    }
  }
}

// Export singleton instance
export const dashboardRepository = new DashboardRepository();
