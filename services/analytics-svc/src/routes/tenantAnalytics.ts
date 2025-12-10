/**
 * Tenant (District) Analytics Routes
 *
 * API endpoints for district admin-facing analytics.
 * Provides aggregate views across schools and classrooms.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/array-type, @typescript-eslint/no-non-null-assertion */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const dateRangeQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface MasteryBucket {
  range: string;
  minScore: number;
  maxScore: number;
  count: number;
  percentage: number;
}

export interface ModuleUsage {
  moduleName: string;
  enabled: boolean;
  activeUsers: number;
  usagePercentage: number;
}

export interface TenantOverviewEngagement {
  activeSchoolsCount: number;
  totalSchoolsCount: number;
  activeClassroomsCount: number;
  totalClassroomsCount: number;
  activeLearnersCount: number;
  totalLearnersCount: number;
  avgSessionsPerLearner: number;
  totalSessions: number;
  totalMinutes: number;
}

export interface TenantOverviewProgress {
  overallAvgMastery: number;
  masteryDistribution: MasteryBucket[];
  learnersWithProgressData: number;
}

export interface DailyTrend {
  date: string;
  sessions: number;
  activeLearners: number;
}

export interface TenantOverviewResponse {
  tenantId: string;
  tenantName: string;
  period: { from: string; to: string };
  dataFreshAsOf: string;
  engagement: TenantOverviewEngagement;
  progress: TenantOverviewProgress;
  moduleUsage: ModuleUsage[];
  dailyTrend: DailyTrend[];
}

export interface SchoolSummary {
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

export interface TenantSchoolsResponse {
  tenantId: string;
  period: { from: string; to: string };
  dataFreshAsOf: string;
  schools: SchoolSummary[];
  totalSchools: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

interface AuthenticatedUser {
  sub: string;
  tenantId: string;
  role: string;
}

function getUser(request: FastifyRequest): AuthenticatedUser {
  const user = (request as FastifyRequest & { user?: AuthenticatedUser }).user;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
}

function hasTenantAccess(user: AuthenticatedUser, tenantId: string): boolean {
  // District admins can only access their own tenant
  if (user.tenantId !== tenantId) {
    return false;
  }
  // Only district_admin and platform_admin can access tenant-level data
  return user.role === 'district_admin' || user.role === 'platform_admin';
}

function convertToDateKey(date: Date): number {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return parseInt(`${year}${month}${day}`, 10);
}

function dateKeyToString(dateKey: number): string {
  const s = String(dateKey);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function getDefaultDateRange(): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 28);
  return { from, to };
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00Z');
}

function getMasteryBuckets(learnerMasteries: number[]): MasteryBucket[] {
  const buckets: MasteryBucket[] = [
    { range: '0-20%', minScore: 0, maxScore: 0.2, count: 0, percentage: 0 },
    { range: '20-40%', minScore: 0.2, maxScore: 0.4, count: 0, percentage: 0 },
    { range: '40-60%', minScore: 0.4, maxScore: 0.6, count: 0, percentage: 0 },
    { range: '60-80%', minScore: 0.6, maxScore: 0.8, count: 0, percentage: 0 },
    { range: '80-100%', minScore: 0.8, maxScore: 1.0, count: 0, percentage: 0 },
  ];

  for (const mastery of learnerMasteries) {
    for (const bucket of buckets) {
      if (mastery >= bucket.minScore && mastery < bucket.maxScore) {
        bucket.count++;
        break;
      }
      if (mastery === 1.0 && bucket.maxScore === 1.0) {
        bucket.count++;
        break;
      }
    }
  }

  const total = learnerMasteries.length;
  for (const bucket of buckets) {
    bucket.percentage = total > 0 ? Math.round((bucket.count / total) * 100) : 0;
  }

  return buckets;
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export const tenantAnalyticsRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /analytics/tenants/:tenantId/overview
   *
   * Returns tenant-wide engagement, progress, and module usage metrics.
   */
  app.get<{
    Params: { tenantId: string };
    Querystring: { from?: string; to?: string };
  }>('/tenants/:tenantId/overview', async (request, reply) => {
    const user = getUser(request);
    const { tenantId } = request.params;

    if (!hasTenantAccess(user, tenantId)) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    const query = dateRangeQuerySchema.parse(request.query);
    const defaultRange = getDefaultDateRange();
    const fromDate = query.from ? parseDate(query.from) : defaultRange.from;
    const toDate = query.to ? parseDate(query.to) : defaultRange.to;
    const fromDateKey = convertToDateKey(fromDate);
    const toDateKey = convertToDateKey(toDate);

    // Get tenant info
    const tenantDim = await prisma.$queryRaw<Array<{ tenant_key: number; tenant_name: string }>>`
      SELECT tenant_key, tenant_name FROM dim_tenant
      WHERE tenant_id = ${tenantId}::uuid AND is_current = true
      LIMIT 1
    `;

    if (tenantDim.length === 0) {
      return reply.code(404).send({ error: 'Tenant not found' });
    }

    const tenantKey = tenantDim[0].tenant_key;
    const tenantName = tenantDim[0].tenant_name;

    // ─── COUNT TOTALS ──────────────────────────────────────────────────────────

    const schoolCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM dim_school
      WHERE tenant_key = ${tenantKey} AND is_current = true
    `;
    const totalSchools = Number(schoolCount[0]?.count ?? 0);

    const classroomCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM dim_classroom
      WHERE tenant_key = ${tenantKey} AND is_current = true
    `;
    const totalClassrooms = Number(classroomCount[0]?.count ?? 0);

    const learnerCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM dim_learner
      WHERE tenant_key = ${tenantKey} AND is_current = true
    `;
    const totalLearners = Number(learnerCount[0]?.count ?? 0);

    // ─── ENGAGEMENT ────────────────────────────────────────────────────────────

    const sessionData = await prisma.$queryRaw<
      Array<{
        learner_key: number;
        school_key: number;
        classroom_key: number;
        date_key: number;
        sessions: bigint;
        minutes: bigint;
      }>
    >`
      SELECT 
        s.learner_key, 
        l.school_key,
        s.classroom_key,
        s.date_key,
        COUNT(*) as sessions, 
        COALESCE(SUM(s.duration_minutes), 0) as minutes
      FROM fact_sessions s
      JOIN dim_learner l ON l.learner_key = s.learner_key
      WHERE l.tenant_key = ${tenantKey}
        AND s.date_key >= ${fromDateKey}
        AND s.date_key <= ${toDateKey}
      GROUP BY s.learner_key, l.school_key, s.classroom_key, s.date_key
    `;

    const activeLearnersSet = new Set<number>();
    const activeSchoolsSet = new Set<number>();
    const activeClassroomsSet = new Set<number>();
    const sessionsByDate = new Map<number, { sessions: number; learners: Set<number> }>();
    let totalSessions = 0;
    let totalMinutes = 0;

    for (const row of sessionData) {
      activeLearnersSet.add(row.learner_key);
      if (row.school_key) activeSchoolsSet.add(row.school_key);
      if (row.classroom_key) activeClassroomsSet.add(row.classroom_key);

      const sessions = Number(row.sessions);
      totalSessions += sessions;
      totalMinutes += Number(row.minutes);

      if (!sessionsByDate.has(row.date_key)) {
        sessionsByDate.set(row.date_key, { sessions: 0, learners: new Set() });
      }
      const dayData = sessionsByDate.get(row.date_key)!;
      dayData.sessions += sessions;
      dayData.learners.add(row.learner_key);
    }

    const activeLearnersCount = activeLearnersSet.size;
    const activeSchoolsCount = activeSchoolsSet.size;
    const activeClassroomsCount = activeClassroomsSet.size;
    const avgSessionsPerLearner =
      totalLearners > 0 ? Math.round((totalSessions / totalLearners) * 10) / 10 : 0;

    // Build daily trend
    const dailyTrend: DailyTrend[] = [];
    const sortedDates = Array.from(sessionsByDate.keys()).sort((a, b) => a - b);
    for (const dateKey of sortedDates) {
      const dayData = sessionsByDate.get(dateKey)!;
      dailyTrend.push({
        date: dateKeyToString(dateKey),
        sessions: dayData.sessions,
        activeLearners: dayData.learners.size,
      });
    }

    // ─── PROGRESS ──────────────────────────────────────────────────────────────

    const progressData = await prisma.$queryRaw<
      Array<{ learner_key: number; avg_mastery: number }>
    >`
      SELECT 
        learner_key,
        AVG(average_mastery) as avg_mastery
      FROM (
        SELECT DISTINCT ON (p.learner_key, p.subject_key)
          p.learner_key, p.average_mastery
        FROM fact_learning_progress p
        JOIN dim_learner l ON l.learner_key = p.learner_key
        WHERE l.tenant_key = ${tenantKey}
          AND p.date_key >= ${fromDateKey}
          AND p.date_key <= ${toDateKey}
        ORDER BY p.learner_key, p.subject_key, p.date_key DESC
      ) sub
      GROUP BY learner_key
    `;

    const learnerMasteries = progressData.map((r) => Number(r.avg_mastery));
    const overallAvgMastery =
      learnerMasteries.length > 0
        ? Math.round(
            (learnerMasteries.reduce((a, b) => a + b, 0) / learnerMasteries.length) * 100
          ) / 100
        : 0;

    // ─── MODULE USAGE ──────────────────────────────────────────────────────────

    // Get homework helper users
    const homeworkUsers = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT learner_key) as count
      FROM fact_homework_events h
      JOIN dim_learner l ON l.learner_key = h.learner_key
      WHERE l.tenant_key = ${tenantKey}
        AND h.date_key >= ${fromDateKey}
        AND h.date_key <= ${toDateKey}
    `;
    const homeworkUserCount = Number(homeworkUsers[0]?.count ?? 0);

    // Get focus mode users (from fact_focus_events)
    const focusUsers = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT learner_key) as count
      FROM fact_focus_events f
      JOIN dim_learner l ON l.learner_key = f.learner_key
      WHERE l.tenant_key = ${tenantKey}
        AND f.date_key >= ${fromDateKey}
        AND f.date_key <= ${toDateKey}
    `;
    const focusUserCount = Number(focusUsers[0]?.count ?? 0);

    // Get SEL module users (checking for SEL-related sessions/progress)
    const selUsers = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT p.learner_key) as count
      FROM fact_learning_progress p
      JOIN dim_learner l ON l.learner_key = p.learner_key
      JOIN dim_subject s ON s.subject_key = p.subject_key
      WHERE l.tenant_key = ${tenantKey}
        AND p.date_key >= ${fromDateKey}
        AND p.date_key <= ${toDateKey}
        AND s.subject_code = 'SEL'
    `;
    const selUserCount = Number(selUsers[0]?.count ?? 0);

    const moduleUsage: ModuleUsage[] = [
      {
        moduleName: 'Homework Helper',
        enabled: true,
        activeUsers: homeworkUserCount,
        usagePercentage:
          activeLearnersCount > 0 ? Math.round((homeworkUserCount / activeLearnersCount) * 100) : 0,
      },
      {
        moduleName: 'Focus Mode',
        enabled: true,
        activeUsers: focusUserCount,
        usagePercentage:
          activeLearnersCount > 0 ? Math.round((focusUserCount / activeLearnersCount) * 100) : 0,
      },
      {
        moduleName: 'SEL Content',
        enabled: selUserCount > 0,
        activeUsers: selUserCount,
        usagePercentage:
          activeLearnersCount > 0 ? Math.round((selUserCount / activeLearnersCount) * 100) : 0,
      },
    ];

    // ─── BUILD RESPONSE ────────────────────────────────────────────────────────

    const response: TenantOverviewResponse = {
      tenantId,
      tenantName,
      period: {
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0],
      },
      dataFreshAsOf: new Date().toISOString(),
      engagement: {
        activeSchoolsCount,
        totalSchoolsCount: totalSchools,
        activeClassroomsCount,
        totalClassroomsCount: totalClassrooms,
        activeLearnersCount,
        totalLearnersCount: totalLearners,
        avgSessionsPerLearner,
        totalSessions,
        totalMinutes,
      },
      progress: {
        overallAvgMastery,
        masteryDistribution: getMasteryBuckets(learnerMasteries),
        learnersWithProgressData: learnerMasteries.length,
      },
      moduleUsage,
      dailyTrend,
    };

    return response;
  });

  /**
   * GET /analytics/tenants/:tenantId/schools
   *
   * Returns per-school engagement and progress metrics.
   */
  app.get<{
    Params: { tenantId: string };
    Querystring: { from?: string; to?: string };
  }>('/tenants/:tenantId/schools', async (request, reply) => {
    const user = getUser(request);
    const { tenantId } = request.params;

    if (!hasTenantAccess(user, tenantId)) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    const query = dateRangeQuerySchema.parse(request.query);
    const defaultRange = getDefaultDateRange();
    const fromDate = query.from ? parseDate(query.from) : defaultRange.from;
    const toDate = query.to ? parseDate(query.to) : defaultRange.to;
    const fromDateKey = convertToDateKey(fromDate);
    const toDateKey = convertToDateKey(toDate);

    // Get tenant info
    const tenantDim = await prisma.$queryRaw<Array<{ tenant_key: number }>>`
      SELECT tenant_key FROM dim_tenant
      WHERE tenant_id = ${tenantId}::uuid AND is_current = true
      LIMIT 1
    `;

    if (tenantDim.length === 0) {
      return reply.code(404).send({ error: 'Tenant not found' });
    }

    const tenantKey = tenantDim[0].tenant_key;

    // Get all schools in tenant
    const schoolData = await prisma.$queryRaw<
      Array<{ school_key: number; school_id: string; school_name: string }>
    >`
      SELECT school_key, school_id, school_name FROM dim_school
      WHERE tenant_key = ${tenantKey} AND is_current = true
    `;

    if (schoolData.length === 0) {
      const emptyResponse: TenantSchoolsResponse = {
        tenantId,
        period: {
          from: fromDate.toISOString().split('T')[0],
          to: toDate.toISOString().split('T')[0],
        },
        dataFreshAsOf: new Date().toISOString(),
        schools: [],
        totalSchools: 0,
      };
      return emptyResponse;
    }

    const schoolKeys = schoolData.map((s) => s.school_key);
    const schoolMap = new Map(schoolData.map((s) => [s.school_key, s]));

    // Get learner counts per school
    const learnerCounts = await prisma.$queryRaw<Array<{ school_key: number; count: bigint }>>`
      SELECT school_key, COUNT(*) as count FROM dim_learner
      WHERE school_key = ANY(${schoolKeys}::int[])
        AND is_current = true
      GROUP BY school_key
    `;
    const learnerCountMap = new Map(learnerCounts.map((r) => [r.school_key, Number(r.count)]));

    // Get classroom counts per school
    const classroomCounts = await prisma.$queryRaw<Array<{ school_key: number; count: bigint }>>`
      SELECT school_key, COUNT(*) as count FROM dim_classroom
      WHERE school_key = ANY(${schoolKeys}::int[])
        AND is_current = true
      GROUP BY school_key
    `;
    const classroomCountMap = new Map(classroomCounts.map((r) => [r.school_key, Number(r.count)]));

    // Get session stats per school
    const sessionStats = await prisma.$queryRaw<
      Array<{ school_key: number; learner_key: number; sessions: bigint }>
    >`
      SELECT l.school_key, s.learner_key, COUNT(*) as sessions
      FROM fact_sessions s
      JOIN dim_learner l ON l.learner_key = s.learner_key
      WHERE l.school_key = ANY(${schoolKeys}::int[])
        AND s.date_key >= ${fromDateKey}
        AND s.date_key <= ${toDateKey}
      GROUP BY l.school_key, s.learner_key
    `;

    // Aggregate by school
    const schoolSessionMap = new Map<
      number,
      { totalSessions: number; activeLearners: Set<number> }
    >();
    for (const row of sessionStats) {
      if (!schoolSessionMap.has(row.school_key)) {
        schoolSessionMap.set(row.school_key, { totalSessions: 0, activeLearners: new Set() });
      }
      const schoolData = schoolSessionMap.get(row.school_key)!;
      schoolData.totalSessions += Number(row.sessions);
      schoolData.activeLearners.add(row.learner_key);
    }

    // Get mastery per school
    const masteryStats = await prisma.$queryRaw<Array<{ school_key: number; avg_mastery: number }>>`
      SELECT 
        l.school_key,
        AVG(sub.avg_mastery) as avg_mastery
      FROM (
        SELECT DISTINCT ON (p.learner_key, p.subject_key)
          p.learner_key, p.average_mastery as avg_mastery
        FROM fact_learning_progress p
        JOIN dim_learner l ON l.learner_key = p.learner_key
        WHERE l.school_key = ANY(${schoolKeys}::int[])
          AND p.date_key >= ${fromDateKey}
          AND p.date_key <= ${toDateKey}
        ORDER BY p.learner_key, p.subject_key, p.date_key DESC
      ) sub
      JOIN dim_learner l ON l.learner_key = sub.learner_key
      GROUP BY l.school_key
    `;
    const masteryMap = new Map(masteryStats.map((r) => [r.school_key, Number(r.avg_mastery)]));

    // Build school summaries
    const schools: SchoolSummary[] = [];

    for (const schoolKey of schoolKeys) {
      const school = schoolMap.get(schoolKey)!;
      const learnersCount = learnerCountMap.get(schoolKey) ?? 0;
      const classroomsCount = classroomCountMap.get(schoolKey) ?? 0;
      const sessionData = schoolSessionMap.get(schoolKey);
      const totalSessions = sessionData?.totalSessions ?? 0;
      const activeLearnersCount = sessionData?.activeLearners.size ?? 0;
      const avgMastery = masteryMap.get(schoolKey) ?? 0;

      const avgSessionsPerLearner =
        learnersCount > 0 ? Math.round((totalSessions / learnersCount) * 10) / 10 : 0;
      const engagementRate =
        learnersCount > 0 ? Math.round((activeLearnersCount / learnersCount) * 100) : 0;

      schools.push({
        schoolId: school.school_id,
        schoolName: school.school_name,
        learnersCount,
        activeLearnersCount,
        classroomsCount,
        avgSessionsPerLearner,
        totalSessions,
        avgMastery: Math.round(avgMastery * 100) / 100,
        engagementRate,
      });
    }

    // Sort by engagement rate descending
    schools.sort((a, b) => b.engagementRate - a.engagementRate);

    const response: TenantSchoolsResponse = {
      tenantId,
      period: {
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0],
      },
      dataFreshAsOf: new Date().toISOString(),
      schools,
      totalSchools: schools.length,
    };

    return response;
  });
};
