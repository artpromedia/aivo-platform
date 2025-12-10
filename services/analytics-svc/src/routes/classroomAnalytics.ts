/**
 * Classroom Analytics Routes
 *
 * API endpoints for teacher-facing classroom analytics.
 * Reads from warehouse fact tables to provide:
 * - Class engagement overview
 * - Learning progress distributions
 * - Learner list with risk flags
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unused-vars, @typescript-eslint/array-type, @typescript-eslint/no-non-null-assertion */

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

export type RiskFlag = 'LOW_ENGAGEMENT' | 'STRUGGLING' | 'AT_RISK_OVERLOAD';

export interface ClassroomEngagement {
  activeLearnersCount: number;
  inactiveLearnersCount: number;
  totalLearnersCount: number;
  avgSessionsPerLearner: number;
  totalSessions: number;
  totalMinutes: number;
  sessionsPerDay: Array<{ date: string; count: number }>;
}

export interface MasteryBucket {
  range: string;
  minScore: number;
  maxScore: number;
  count: number;
  percentage: number;
}

export interface SubjectProgress {
  subjectCode: string;
  subjectName: string;
  avgMastery: number;
  masteryDistribution: MasteryBucket[];
  learnersWithData: number;
}

export interface ClassroomLearningProgress {
  bySubject: SubjectProgress[];
  overallAvgMastery: number;
}

export interface ClassroomHomework {
  learnersUsingHomework: number;
  totalLearners: number;
  usagePercentage: number;
  avgSessionsPerUser: number;
}

export interface ClassroomFocus {
  avgBreaksPerSession: number;
  totalSessions: number;
  sessionsWithBreaks: number;
  breakRatePercentage: number;
}

export interface ClassroomOverviewResponse {
  classroomId: string;
  classroomName: string;
  period: { from: string; to: string };
  dataFreshAsOf: string;
  engagement: ClassroomEngagement;
  learningProgress: ClassroomLearningProgress;
  homework: ClassroomHomework;
  focus: ClassroomFocus;
}

export interface LearnerListItem {
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

export interface ClassroomLearnerListResponse {
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

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

interface AuthenticatedUser {
  sub: string;
  tenantId: string;
  role: string;
  classroomIds?: string[];
}

function getUser(request: FastifyRequest): AuthenticatedUser {
  const user = (request as FastifyRequest & { user?: AuthenticatedUser }).user;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
}

function hasClassroomAccess(user: AuthenticatedUser, classroomId: string): boolean {
  if (user.role === 'district_admin' || user.role === 'school_admin') {
    return true;
  }
  if (user.role === 'teacher') {
    return user.classroomIds?.includes(classroomId) ?? true;
  }
  return false;
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

function computeRiskFlags(
  sessionsCount: number,
  avgMastery: number,
  focusBreaksPerSession: number,
  periodDays: number
): RiskFlag[] {
  const flags: RiskFlag[] = [];

  // LOW_ENGAGEMENT: Less than 1 session per week on average
  const expectedSessions = periodDays / 7;
  if (sessionsCount < expectedSessions * 0.5) {
    flags.push('LOW_ENGAGEMENT');
  }

  // STRUGGLING: Average mastery below 40%
  if (avgMastery < 0.4 && avgMastery > 0) {
    flags.push('STRUGGLING');
  }

  // AT_RISK_OVERLOAD: More than 3 focus breaks per session on average
  if (focusBreaksPerSession > 3) {
    flags.push('AT_RISK_OVERLOAD');
  }

  return flags;
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
      // Handle exactly 1.0
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

export const classroomAnalyticsRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /analytics/classrooms/:classroomId/overview
   *
   * Returns aggregated engagement, progress, homework, and focus metrics.
   */
  app.get<{
    Params: { classroomId: string };
    Querystring: { from?: string; to?: string };
  }>('/classrooms/:classroomId/overview', async (request, reply) => {
    const user = getUser(request);
    const { classroomId } = request.params;

    if (!hasClassroomAccess(user, classroomId)) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    const query = dateRangeQuerySchema.parse(request.query);
    const defaultRange = getDefaultDateRange();
    const fromDate = query.from ? parseDate(query.from) : defaultRange.from;
    const toDate = query.to ? parseDate(query.to) : defaultRange.to;
    const fromDateKey = convertToDateKey(fromDate);
    const toDateKey = convertToDateKey(toDate);
    const periodDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;

    // Get classroom info
    const classroomDim = await prisma.$queryRaw<
      Array<{ classroom_key: number; classroom_name: string }>
    >`
      SELECT classroom_key, classroom_name FROM dim_classroom
      WHERE classroom_id = ${classroomId}::uuid AND is_current = true
      LIMIT 1
    `;

    if (classroomDim.length === 0) {
      return reply.code(404).send({ error: 'Classroom not found' });
    }

    const classroomKey = classroomDim[0].classroom_key;
    const classroomName = classroomDim[0].classroom_name;

    // Get all learners in this classroom
    const classroomLearners = await prisma.$queryRaw<
      Array<{ learner_key: number; learner_id: string }>
    >`
      SELECT l.learner_key, l.learner_id
      FROM dim_learner l
      JOIN bridge_classroom_learner bcl ON bcl.learner_key = l.learner_key
      WHERE bcl.classroom_key = ${classroomKey}
        AND l.is_current = true
    `;

    const learnerKeys = classroomLearners.map((l) => l.learner_key);
    const totalLearners = learnerKeys.length;

    if (totalLearners === 0) {
      const emptyResponse: ClassroomOverviewResponse = {
        classroomId,
        classroomName,
        period: {
          from: fromDate.toISOString().split('T')[0],
          to: toDate.toISOString().split('T')[0],
        },
        dataFreshAsOf: new Date().toISOString(),
        engagement: {
          activeLearnersCount: 0,
          inactiveLearnersCount: 0,
          totalLearnersCount: 0,
          avgSessionsPerLearner: 0,
          totalSessions: 0,
          totalMinutes: 0,
          sessionsPerDay: [],
        },
        learningProgress: { bySubject: [], overallAvgMastery: 0 },
        homework: {
          learnersUsingHomework: 0,
          totalLearners: 0,
          usagePercentage: 0,
          avgSessionsPerUser: 0,
        },
        focus: {
          avgBreaksPerSession: 0,
          totalSessions: 0,
          sessionsWithBreaks: 0,
          breakRatePercentage: 0,
        },
      };
      return emptyResponse;
    }

    // ─── ENGAGEMENT ────────────────────────────────────────────────────────────

    const sessionData = await prisma.$queryRaw<
      Array<{ learner_key: number; date_key: number; sessions: bigint; minutes: bigint }>
    >`
      SELECT learner_key, date_key, COUNT(*) as sessions, SUM(duration_minutes) as minutes
      FROM fact_sessions
      WHERE learner_key = ANY(${learnerKeys}::int[])
        AND date_key >= ${fromDateKey}
        AND date_key <= ${toDateKey}
      GROUP BY learner_key, date_key
    `;

    const activeLearnersSet = new Set<number>();
    const sessionsByDate = new Map<number, number>();
    let totalSessions = 0;
    let totalMinutes = 0;

    for (const row of sessionData) {
      activeLearnersSet.add(row.learner_key);
      totalSessions += Number(row.sessions);
      totalMinutes += Number(row.minutes);

      const existing = sessionsByDate.get(row.date_key) ?? 0;
      sessionsByDate.set(row.date_key, existing + Number(row.sessions));
    }

    const activeLearnersCount = activeLearnersSet.size;
    const inactiveLearnersCount = totalLearners - activeLearnersCount;
    const avgSessionsPerLearner =
      totalLearners > 0 ? Math.round((totalSessions / totalLearners) * 10) / 10 : 0;

    // Build sessions per day array
    const sessionsPerDay: Array<{ date: string; count: number }> = [];
    const sortedDates = Array.from(sessionsByDate.keys()).sort((a, b) => a - b);
    for (const dateKey of sortedDates) {
      sessionsPerDay.push({
        date: dateKeyToString(dateKey),
        count: sessionsByDate.get(dateKey) ?? 0,
      });
    }

    // ─── LEARNING PROGRESS ─────────────────────────────────────────────────────

    const progressData = await prisma.$queryRaw<
      Array<{
        learner_key: number;
        subject_key: number;
        subject_code: string;
        subject_name: string;
        average_mastery: number;
      }>
    >`
      SELECT DISTINCT ON (p.learner_key, p.subject_key)
        p.learner_key,
        p.subject_key,
        s.subject_code,
        s.subject_name,
        p.average_mastery
      FROM fact_learning_progress p
      JOIN dim_subject s ON s.subject_key = p.subject_key
      WHERE p.learner_key = ANY(${learnerKeys}::int[])
        AND p.date_key >= ${fromDateKey}
        AND p.date_key <= ${toDateKey}
      ORDER BY p.learner_key, p.subject_key, p.date_key DESC
    `;

    // Group by subject
    const subjectMap = new Map<string, { name: string; masteries: number[] }>();
    let overallMasterySum = 0;
    let overallMasteryCount = 0;

    for (const row of progressData) {
      const mastery = Number(row.average_mastery);
      overallMasterySum += mastery;
      overallMasteryCount++;

      if (!subjectMap.has(row.subject_code)) {
        subjectMap.set(row.subject_code, { name: row.subject_name, masteries: [] });
      }
      subjectMap.get(row.subject_code)!.masteries.push(mastery);
    }

    const bySubject: SubjectProgress[] = [];
    for (const [code, data] of subjectMap) {
      const avg = data.masteries.reduce((a, b) => a + b, 0) / data.masteries.length;
      bySubject.push({
        subjectCode: code,
        subjectName: data.name,
        avgMastery: Math.round(avg * 100) / 100,
        masteryDistribution: getMasteryBuckets(data.masteries),
        learnersWithData: data.masteries.length,
      });
    }

    const overallAvgMastery =
      overallMasteryCount > 0
        ? Math.round((overallMasterySum / overallMasteryCount) * 100) / 100
        : 0;

    // ─── HOMEWORK USAGE ────────────────────────────────────────────────────────

    interface HomeworkStat {
      learner_key: number;
      sessions: bigint;
    }
    const homeworkData = await prisma.$queryRaw<HomeworkStat[]>`
      SELECT learner_key, COUNT(*) as sessions
      FROM fact_homework_events
      WHERE learner_key = ANY(${learnerKeys}::int[])
        AND date_key >= ${fromDateKey}
        AND date_key <= ${toDateKey}
      GROUP BY learner_key
    `;

    const learnersUsingHomework = homeworkData.length;
    const totalHomeworkSessions = homeworkData.reduce(
      (sum: number, r) => sum + Number(r.sessions),
      0
    );
    const usagePercentage =
      totalLearners > 0 ? Math.round((learnersUsingHomework / totalLearners) * 100) : 0;
    const avgHomeworkSessionsPerUser =
      learnersUsingHomework > 0
        ? Math.round((totalHomeworkSessions / learnersUsingHomework) * 10) / 10
        : 0;

    // ─── FOCUS SUMMARY ─────────────────────────────────────────────────────────

    const focusData = await prisma.$queryRaw<
      Array<{ total_breaks: bigint; total_sessions: bigint }>
    >`
      SELECT 
        COUNT(*) as total_breaks,
        COUNT(DISTINCT session_key) as total_sessions
      FROM fact_focus_events
      WHERE learner_key = ANY(${learnerKeys}::int[])
        AND date_key >= ${fromDateKey}
        AND date_key <= ${toDateKey}
        AND event_type = 'BREAK_STARTED'
    `;

    const totalFocusBreaks = Number(focusData[0]?.total_breaks ?? 0);
    const focusSessions = Number(focusData[0]?.total_sessions ?? 0);
    const avgBreaksPerSession =
      focusSessions > 0 ? Math.round((totalFocusBreaks / focusSessions) * 10) / 10 : 0;
    const breakRatePercentage =
      totalSessions > 0 ? Math.round((focusSessions / totalSessions) * 100) : 0;

    // ─── BUILD RESPONSE ────────────────────────────────────────────────────────

    const response: ClassroomOverviewResponse = {
      classroomId,
      classroomName,
      period: {
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0],
      },
      dataFreshAsOf: new Date().toISOString(),
      engagement: {
        activeLearnersCount,
        inactiveLearnersCount,
        totalLearnersCount: totalLearners,
        avgSessionsPerLearner,
        totalSessions,
        totalMinutes,
        sessionsPerDay,
      },
      learningProgress: {
        bySubject,
        overallAvgMastery,
      },
      homework: {
        learnersUsingHomework,
        totalLearners,
        usagePercentage,
        avgSessionsPerUser: avgHomeworkSessionsPerUser,
      },
      focus: {
        avgBreaksPerSession,
        totalSessions: focusSessions,
        sessionsWithBreaks: focusSessions,
        breakRatePercentage,
      },
    };

    return response;
  });

  /**
   * GET /analytics/classrooms/:classroomId/learner-list
   *
   * Returns per-learner metrics with risk flags.
   */
  app.get<{
    Params: { classroomId: string };
    Querystring: { from?: string; to?: string };
  }>('/classrooms/:classroomId/learner-list', async (request, reply) => {
    const user = getUser(request);
    const { classroomId } = request.params;

    if (!hasClassroomAccess(user, classroomId)) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    const query = dateRangeQuerySchema.parse(request.query);
    const defaultRange = getDefaultDateRange();
    const fromDate = query.from ? parseDate(query.from) : defaultRange.from;
    const toDate = query.to ? parseDate(query.to) : defaultRange.to;
    const fromDateKey = convertToDateKey(fromDate);
    const toDateKey = convertToDateKey(toDate);
    const periodDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;

    // Get classroom info
    const classroomDim = await prisma.$queryRaw<Array<{ classroom_key: number }>>`
      SELECT classroom_key FROM dim_classroom
      WHERE classroom_id = ${classroomId}::uuid AND is_current = true
      LIMIT 1
    `;

    if (classroomDim.length === 0) {
      return reply.code(404).send({ error: 'Classroom not found' });
    }

    const classroomKey = classroomDim[0].classroom_key;

    // Get all learners in classroom with their info
    const learnerData = await prisma.$queryRaw<
      Array<{
        learner_key: number;
        learner_id: string;
        full_name: string;
        grade_level: string;
      }>
    >`
      SELECT l.learner_key, l.learner_id, l.full_name, l.grade_level
      FROM dim_learner l
      JOIN bridge_classroom_learner bcl ON bcl.learner_key = l.learner_key
      WHERE bcl.classroom_key = ${classroomKey}
        AND l.is_current = true
    `;

    if (learnerData.length === 0) {
      const emptyResponse: ClassroomLearnerListResponse = {
        classroomId,
        period: {
          from: fromDate.toISOString().split('T')[0],
          to: toDate.toISOString().split('T')[0],
        },
        dataFreshAsOf: new Date().toISOString(),
        learners: [],
        totalCount: 0,
        flagCounts: { lowEngagement: 0, struggling: 0, atRiskOverload: 0 },
      };
      return emptyResponse;
    }

    const learnerKeys = learnerData.map((l) => l.learner_key);
    interface LearnerInfo {
      learner_key: number;
      learner_id: string;
      full_name: string;
      grade_level: string;
    }
    const learnerMap = new Map<number, LearnerInfo>(learnerData.map((l) => [l.learner_key, l]));

    // Get session counts and minutes per learner
    interface SessionStat {
      learner_key: number;
      sessions: bigint;
      minutes: bigint;
      last_date: number;
    }
    const sessionStats = await prisma.$queryRaw<SessionStat[]>`
      SELECT 
        learner_key,
        COUNT(*) as sessions,
        COALESCE(SUM(duration_minutes), 0) as minutes,
        MAX(date_key) as last_date
      FROM fact_sessions
      WHERE learner_key = ANY(${learnerKeys}::int[])
        AND date_key >= ${fromDateKey}
        AND date_key <= ${toDateKey}
      GROUP BY learner_key
    `;

    const sessionsByLearner = new Map<number, SessionStat>(
      sessionStats.map((s) => [s.learner_key, s])
    );

    // Get latest mastery per learner (across all subjects)
    interface MasteryStat {
      learner_key: number;
      avg_mastery: number;
    }
    const masteryStats = await prisma.$queryRaw<MasteryStat[]>`
      SELECT 
        learner_key,
        AVG(average_mastery) as avg_mastery
      FROM (
        SELECT DISTINCT ON (learner_key, subject_key)
          learner_key, average_mastery
        FROM fact_learning_progress
        WHERE learner_key = ANY(${learnerKeys}::int[])
          AND date_key >= ${fromDateKey}
          AND date_key <= ${toDateKey}
        ORDER BY learner_key, subject_key, date_key DESC
      ) sub
      GROUP BY learner_key
    `;

    const masteryByLearner = new Map<number, number>(
      masteryStats.map((m) => [m.learner_key, Number(m.avg_mastery)])
    );

    // Get focus breaks per learner
    interface FocusStat {
      learner_key: number;
      breaks: bigint;
      sessions: bigint;
    }
    const focusStats = await prisma.$queryRaw<FocusStat[]>`
      SELECT 
        learner_key,
        COUNT(*) as breaks,
        COUNT(DISTINCT session_key) as sessions
      FROM fact_focus_events
      WHERE learner_key = ANY(${learnerKeys}::int[])
        AND date_key >= ${fromDateKey}
        AND date_key <= ${toDateKey}
        AND event_type = 'BREAK_STARTED'
      GROUP BY learner_key
    `;

    const focusByLearner = new Map<number, { breaks: number; sessions: number }>(
      focusStats.map((f) => [
        f.learner_key,
        { breaks: Number(f.breaks), sessions: Number(f.sessions) },
      ])
    );

    // Build learner list
    const learners: LearnerListItem[] = [];
    const flagCounts = { lowEngagement: 0, struggling: 0, atRiskOverload: 0 };

    for (const learnerKey of learnerKeys) {
      const learnerInfo = learnerMap.get(learnerKey)!;
      const session = sessionsByLearner.get(learnerKey);
      const mastery = masteryByLearner.get(learnerKey) ?? 0;
      const focus = focusByLearner.get(learnerKey);

      const sessionsCount = Number(session?.sessions ?? 0);
      const totalMinutes = Number(session?.minutes ?? 0);
      const lastDate = session?.last_date ? dateKeyToString(session.last_date) : null;

      const focusBreaksPerSession =
        focus && focus.sessions > 0 ? Math.round((focus.breaks / focus.sessions) * 10) / 10 : 0;

      const riskFlags = computeRiskFlags(sessionsCount, mastery, focusBreaksPerSession, periodDays);

      // Count flags
      if (riskFlags.includes('LOW_ENGAGEMENT')) flagCounts.lowEngagement++;
      if (riskFlags.includes('STRUGGLING')) flagCounts.struggling++;
      if (riskFlags.includes('AT_RISK_OVERLOAD')) flagCounts.atRiskOverload++;

      learners.push({
        learnerId: learnerInfo.learner_id,
        learnerName: learnerInfo.full_name,
        grade: learnerInfo.grade_level,
        sessionsCount,
        totalMinutes,
        avgMasteryScore: Math.round(mastery * 100) / 100,
        focusBreaksPerSession,
        lastActiveDate: lastDate,
        riskFlags,
      });
    }

    // Sort by risk flags (most flags first), then by sessions (ascending)
    learners.sort((a, b) => {
      if (b.riskFlags.length !== a.riskFlags.length) {
        return b.riskFlags.length - a.riskFlags.length;
      }
      return a.sessionsCount - b.sessionsCount;
    });

    const response: ClassroomLearnerListResponse = {
      classroomId,
      period: {
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0],
      },
      dataFreshAsOf: new Date().toISOString(),
      learners,
      totalCount: learners.length,
      flagCounts,
    };

    return response;
  });
};
