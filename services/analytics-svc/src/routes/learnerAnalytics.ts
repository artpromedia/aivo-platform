/**
 * Learner Analytics Routes
 *
 * API endpoints for learner and parent-facing analytics.
 * Reads from warehouse fact tables to provide:
 * - Engagement summaries
 * - Learning progress timeseries
 * - Strengths and support areas
 * - Effort/streak summaries for learner app
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unused-vars, @typescript-eslint/array-type, @typescript-eslint/no-non-null-assertion */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const summaryQuerySchema = z.object({
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
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

interface AuthenticatedUser {
  sub: string;
  tenantId: string;
  role: string;
  learnerId?: string;
}

function getUser(request: FastifyRequest): AuthenticatedUser {
  const user = (request as FastifyRequest & { user?: AuthenticatedUser }).user;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
}

function convertToDateKey(date: Date): number {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return parseInt(`${year}${month}${day}`, 10);
}

function getDefaultDateRange(): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 28); // Default to last 4 weeks
  return { from, to };
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00Z');
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day;
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Generate growth-oriented language for support areas.
 * Avoids deficit framing per neurodiversity-friendly guidelines.
 */
function generateSupportAreaText(skillName: string, masteryScore: number): string {
  if (masteryScore < 0.3) {
    return `Building foundation in ${skillName}`;
  } else if (masteryScore < 0.5) {
    return `Growing confidence with ${skillName}`;
  } else if (masteryScore < 0.7) {
    return `Strengthening skills in ${skillName}`;
  }
  return `Developing ${skillName} further`;
}

/**
 * Generate strength text for areas where learner excels.
 */
function generateStrengthText(skillName: string, masteryScore: number): string {
  if (masteryScore >= 0.9) {
    return `Mastered ${skillName}!`;
  } else if (masteryScore >= 0.8) {
    return `Excelling at ${skillName}`;
  }
  return `Strong foundation in ${skillName}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// RESPONSE TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface EngagementSummary {
  sessionsThisWeek: number;
  sessionsLastWeek: number;
  avgSessionDurationMinutes: number;
  daysActiveInRange: number;
  totalSessionsInRange: number;
}

interface SubjectProgressPoint {
  date: string;
  avgMasteryScore: number;
  masteredSkills: number;
  totalSkills: number;
}

interface SubjectProgress {
  subjectCode: string;
  subjectName: string;
  timeseries: SubjectProgressPoint[];
  skillsMasteredDelta: number;
  currentMastery: number;
}

interface LearningProgressSummary {
  bySubject: SubjectProgress[];
  totalSkillsMasteredDelta: number;
}

interface HomeworkUsageSummary {
  totalHomeworkSessions: number;
  avgStepsCompletedPerSession: number;
  completionRate: number;
}

interface FocusSummary {
  totalFocusBreaks: number;
  totalSessions: number;
  avgBreaksPerSession: number;
  focusBreaksSummary: string;
}

interface LearnerSummaryResponse {
  learnerId: string;
  dateRange: { from: string; to: string };
  engagement: EngagementSummary;
  learningProgress: LearningProgressSummary;
  homeworkUsage: HomeworkUsageSummary;
  focusSummary: FocusSummary;
}

interface StrengthOrNeedArea {
  subjectCode: string;
  subjectName: string;
  skillName: string;
  masteryScore: number;
  description: string;
}

interface StrengthsAndNeedsResponse {
  learnerId: string;
  strengths: StrengthOrNeedArea[];
  needsSupport: StrengthOrNeedArea[];
  overallMessage: string;
}

interface EffortSummaryResponse {
  learnerId: string;
  currentStreakDays: number;
  longestStreakDays: number;
  skillsMasteredThisMonth: number;
  sessionsCountThisWeek: number;
  milestones: Milestone[];
  encouragementMessage: string;
}

interface Milestone {
  id: string;
  type: 'streak' | 'skills' | 'sessions';
  title: string;
  description: string;
  achieved: boolean;
  achievedAt?: string;
  progress?: number;
  target?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export const learnerAnalyticsRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /analytics/learners/:learnerId/summary
   *
   * Returns comprehensive analytics summary for a learner.
   * Used by parent app for "Progress & Activity" dashboard.
   *
   * Query params:
   * - from: Start date (YYYY-MM-DD)
   * - to: End date (YYYY-MM-DD)
   */
  app.get<{
    Params: { learnerId: string };
    Querystring: { from?: string; to?: string };
  }>('/learners/:learnerId/summary', async (request, reply) => {
    const user = getUser(request);
    const { learnerId } = request.params;

    // Parse and validate query params
    const query = summaryQuerySchema.parse(request.query);
    const defaultRange = getDefaultDateRange();
    const fromDate = query.from ? parseDate(query.from) : defaultRange.from;
    const toDate = query.to ? parseDate(query.to) : defaultRange.to;

    const fromDateKey = convertToDateKey(fromDate);
    const endDateKey = convertToDateKey(toDate);

    // Calculate week boundaries for this week/last week comparison
    const now = new Date();
    const thisWeekStart = getWeekStart(now);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const thisWeekStartKey = convertToDateKey(thisWeekStart);
    const lastWeekStartKey = convertToDateKey(lastWeekStart);

    // Get learner key from warehouse
    const learnerDim = await prisma.$queryRaw<Array<{ learner_key: number }>>`
      SELECT learner_key FROM dim_learner
      WHERE learner_id = ${learnerId}::uuid AND is_current = true
      LIMIT 1
    `;

    if (learnerDim.length === 0) {
      return reply.code(404).send({ error: 'Learner not found' });
    }

    const learnerKey = learnerDim[0].learner_key;

    // ────────────────────────────────────────────────────────────────────────
    // ENGAGEMENT METRICS
    // ────────────────────────────────────────────────────────────────────────

    // Sessions this week
    const sessionsThisWeekResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM fact_sessions
      WHERE learner_key = ${learnerKey} AND date_key >= ${thisWeekStartKey}
    `;
    const sessionsThisWeek = Number(sessionsThisWeekResult[0]?.count ?? 0);

    // Sessions last week
    const sessionsLastWeekResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM fact_sessions
      WHERE learner_key = ${learnerKey}
        AND date_key >= ${lastWeekStartKey}
        AND date_key < ${thisWeekStartKey}
    `;
    const sessionsLastWeek = Number(sessionsLastWeekResult[0]?.count ?? 0);

    // Average session duration and total sessions in range
    const sessionStatsResult = await prisma.$queryRaw<
      Array<{ avg_duration: number | null; total_sessions: bigint; days_active: bigint }>
    >`
      SELECT 
        AVG(duration_seconds) / 60.0 as avg_duration,
        COUNT(*) as total_sessions,
        COUNT(DISTINCT date_key) as days_active
      FROM fact_sessions
      WHERE learner_key = ${learnerKey}
        AND date_key >= ${fromDateKey}
        AND date_key <= ${endDateKey}
    `;
    const avgSessionDurationMinutes =
      Math.round((sessionStatsResult[0]?.avg_duration ?? 0) * 10) / 10;
    const totalSessionsInRange = Number(sessionStatsResult[0]?.total_sessions ?? 0);
    const daysActiveInRange = Number(sessionStatsResult[0]?.days_active ?? 0);

    // ────────────────────────────────────────────────────────────────────────
    // LEARNING PROGRESS
    // ────────────────────────────────────────────────────────────────────────

    // Get progress by subject over time
    const progressBySubject = await prisma.$queryRaw<
      Array<{
        subject_code: string;
        subject_name: string;
        date_key: number;
        average_mastery: number;
        mastered_skills: number;
        total_skills: number;
      }>
    >`
      SELECT 
        s.subject_code,
        s.subject_name,
        p.date_key,
        p.average_mastery,
        p.mastered_skills,
        p.total_skills
      FROM fact_learning_progress p
      JOIN dim_subject s ON s.subject_key = p.subject_key
      WHERE p.learner_key = ${learnerKey}
        AND p.date_key >= ${fromDateKey}
        AND p.date_key <= ${endDateKey}
      ORDER BY s.subject_code, p.date_key
    `;

    // Group by subject
    const subjectMap = new Map<string, SubjectProgress>();
    for (const row of progressBySubject) {
      const dateStr = `${String(row.date_key).slice(0, 4)}-${String(row.date_key).slice(4, 6)}-${String(row.date_key).slice(6, 8)}`;

      if (!subjectMap.has(row.subject_code)) {
        subjectMap.set(row.subject_code, {
          subjectCode: row.subject_code,
          subjectName: row.subject_name,
          timeseries: [],
          skillsMasteredDelta: 0,
          currentMastery: 0,
        });
      }

      const subject = subjectMap.get(row.subject_code)!;
      subject.timeseries.push({
        date: dateStr,
        avgMasteryScore: Number(row.average_mastery),
        masteredSkills: row.mastered_skills,
        totalSkills: row.total_skills,
      });
    }

    // Calculate deltas and current mastery
    let totalSkillsMasteredDelta = 0;
    for (const subject of subjectMap.values()) {
      if (subject.timeseries.length > 0) {
        const first = subject.timeseries[0];
        const last = subject.timeseries[subject.timeseries.length - 1];
        subject.skillsMasteredDelta = last.masteredSkills - first.masteredSkills;
        subject.currentMastery = last.avgMasteryScore;
        totalSkillsMasteredDelta += subject.skillsMasteredDelta;
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // HOMEWORK USAGE
    // ────────────────────────────────────────────────────────────────────────

    const homeworkStats = await prisma.$queryRaw<
      Array<{ total_sessions: bigint; avg_steps: number | null; avg_completion: number | null }>
    >`
      SELECT 
        COUNT(*) as total_sessions,
        AVG(steps_completed) as avg_steps,
        AVG(completion_rate) as avg_completion
      FROM fact_homework_events
      WHERE learner_key = ${learnerKey}
        AND date_key >= ${fromDateKey}
        AND date_key <= ${endDateKey}
    `;

    const homeworkUsage: HomeworkUsageSummary = {
      totalHomeworkSessions: Number(homeworkStats[0]?.total_sessions ?? 0),
      avgStepsCompletedPerSession: Math.round((homeworkStats[0]?.avg_steps ?? 0) * 10) / 10,
      completionRate: Math.round((homeworkStats[0]?.avg_completion ?? 0) * 100) / 100,
    };

    // ────────────────────────────────────────────────────────────────────────
    // FOCUS SUMMARY
    // ────────────────────────────────────────────────────────────────────────

    const focusStats = await prisma.$queryRaw<
      Array<{ total_breaks: bigint; total_sessions: bigint }>
    >`
      SELECT 
        COUNT(*) as total_breaks,
        COUNT(DISTINCT session_key) as total_sessions
      FROM fact_focus_events
      WHERE learner_key = ${learnerKey}
        AND date_key >= ${fromDateKey}
        AND date_key <= ${endDateKey}
        AND event_type = 'BREAK_STARTED'
    `;

    const totalFocusBreaks = Number(focusStats[0]?.total_breaks ?? 0);
    const focusSessionCount = Number(focusStats[0]?.total_sessions ?? 0);
    const avgBreaksPerSession =
      focusSessionCount > 0 ? Math.round((totalFocusBreaks / focusSessionCount) * 10) / 10 : 0;

    // Generate friendly focus summary
    let focusBreaksSummary: string;
    if (focusSessionCount === 0) {
      focusBreaksSummary = 'No learning sessions recorded in this period.';
    } else if (avgBreaksPerSession < 0.5) {
      focusBreaksSummary = 'Maintaining strong focus during sessions.';
    } else if (avgBreaksPerSession < 1.5) {
      focusBreaksSummary = 'Taking healthy breaks to stay refreshed.';
    } else {
      focusBreaksSummary = 'Using regular breaks to support sustained learning.';
    }

    // ────────────────────────────────────────────────────────────────────────
    // BUILD RESPONSE
    // ────────────────────────────────────────────────────────────────────────

    const response: LearnerSummaryResponse = {
      learnerId,
      dateRange: {
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0],
      },
      engagement: {
        sessionsThisWeek,
        sessionsLastWeek,
        avgSessionDurationMinutes,
        daysActiveInRange,
        totalSessionsInRange,
      },
      learningProgress: {
        bySubject: Array.from(subjectMap.values()),
        totalSkillsMasteredDelta,
      },
      homeworkUsage,
      focusSummary: {
        totalFocusBreaks,
        totalSessions: focusSessionCount,
        avgBreaksPerSession,
        focusBreaksSummary,
      },
    };

    return response;
  });

  /**
   * GET /analytics/learners/:learnerId/strengths-and-needs
   *
   * Returns top strengths and areas needing support.
   * Uses growth-oriented, neurodiversity-friendly language.
   */
  app.get<{
    Params: { learnerId: string };
  }>('/learners/:learnerId/strengths-and-needs', async (request, reply) => {
    const user = getUser(request);
    const { learnerId } = request.params;

    // Get learner key
    const learnerDim = await prisma.$queryRaw<Array<{ learner_key: number }>>`
      SELECT learner_key FROM dim_learner
      WHERE learner_id = ${learnerId}::uuid AND is_current = true
      LIMIT 1
    `;

    if (learnerDim.length === 0) {
      return reply.code(404).send({ error: 'Learner not found' });
    }

    const learnerKey = learnerDim[0].learner_key;

    // Get most recent progress snapshot for each subject/skill
    const today = new Date();
    const todayKey = convertToDateKey(today);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoKey = convertToDateKey(thirtyDaysAgo);

    // Get skill-level progress (would need a fact_skill_progress table in real impl)
    // For now, we'll use subject-level progress and simulate skill data
    const progressData = await prisma.$queryRaw<
      Array<{
        subject_code: string;
        subject_name: string;
        average_mastery: number;
        mastered_skills: number;
        total_skills: number;
      }>
    >`
      SELECT DISTINCT ON (s.subject_code)
        s.subject_code,
        s.subject_name,
        p.average_mastery,
        p.mastered_skills,
        p.total_skills
      FROM fact_learning_progress p
      JOIN dim_subject s ON s.subject_key = p.subject_key
      WHERE p.learner_key = ${learnerKey}
        AND p.date_key >= ${thirtyDaysAgoKey}
        AND p.date_key <= ${todayKey}
      ORDER BY s.subject_code, p.date_key DESC
    `;

    // Identify strengths (high mastery) and support areas (low mastery)
    const strengths: StrengthOrNeedArea[] = [];
    const needsSupport: StrengthOrNeedArea[] = [];

    for (const row of progressData) {
      const mastery = Number(row.average_mastery);

      if (mastery >= 0.7) {
        strengths.push({
          subjectCode: row.subject_code,
          subjectName: row.subject_name,
          skillName: row.subject_name, // In real impl, would be specific skill
          masteryScore: mastery,
          description: generateStrengthText(row.subject_name, mastery),
        });
      } else if (mastery < 0.5) {
        needsSupport.push({
          subjectCode: row.subject_code,
          subjectName: row.subject_name,
          skillName: row.subject_name,
          masteryScore: mastery,
          description: generateSupportAreaText(row.subject_name, mastery),
        });
      }
    }

    // Sort by mastery score
    strengths.sort((a, b) => b.masteryScore - a.masteryScore);
    needsSupport.sort((a, b) => a.masteryScore - b.masteryScore);

    // Take top 3 of each
    const topStrengths = strengths.slice(0, 3);
    const topNeedsSupport = needsSupport.slice(0, 3);

    // Generate overall message
    let overallMessage: string;
    if (topStrengths.length > 0 && topNeedsSupport.length === 0) {
      overallMessage = 'Making great progress across all areas!';
    } else if (topStrengths.length === 0 && topNeedsSupport.length > 0) {
      overallMessage = 'Building a strong foundation for future growth.';
    } else if (topStrengths.length > 0 && topNeedsSupport.length > 0) {
      overallMessage = 'Showing strengths while continuing to grow in other areas.';
    } else {
      overallMessage = 'Learning journey is just getting started!';
    }

    const response: StrengthsAndNeedsResponse = {
      learnerId,
      strengths: topStrengths,
      needsSupport: topNeedsSupport,
      overallMessage,
    };

    return response;
  });

  /**
   * GET /analytics/learners/:learnerId/effort-summary
   *
   * Lightweight endpoint for learner app showing streaks and effort.
   * Emphasizes growth and effort, not comparison or deficits.
   */
  app.get<{
    Params: { learnerId: string };
  }>('/learners/:learnerId/effort-summary', async (request, reply) => {
    const user = getUser(request);
    const { learnerId } = request.params;

    // Verify learner can access their own data
    if (user.role === 'learner' && user.learnerId !== learnerId) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    // Get learner key
    const learnerDim = await prisma.$queryRaw<Array<{ learner_key: number }>>`
      SELECT learner_key FROM dim_learner
      WHERE learner_id = ${learnerId}::uuid AND is_current = true
      LIMIT 1
    `;

    if (learnerDim.length === 0) {
      return reply.code(404).send({ error: 'Learner not found' });
    }

    const learnerKey = learnerDim[0].learner_key;

    // Calculate current streak
    const today = new Date();
    const todayKey = convertToDateKey(today);

    // Get all session dates in last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysAgoKey = convertToDateKey(ninetyDaysAgo);

    const sessionDates = await prisma.$queryRaw<Array<{ date_key: number }>>`
      SELECT DISTINCT date_key
      FROM fact_sessions
      WHERE learner_key = ${learnerKey}
        AND date_key >= ${ninetyDaysAgoKey}
        AND date_key <= ${todayKey}
      ORDER BY date_key DESC
    `;

    // Calculate current streak (consecutive days ending today or yesterday)
    let currentStreakDays = 0;
    let longestStreakDays = 0;
    let currentStreak = 0;
    const checkDate = new Date(today);

    const activeDates = new Set<number>(sessionDates.map((r: { date_key: number }) => r.date_key));

    // Check if active today or yesterday to start streak
    const yesterdayKey = convertToDateKey(new Date(today.getTime() - 86400000));
    if (!activeDates.has(todayKey) && !activeDates.has(yesterdayKey)) {
      currentStreakDays = 0;
    } else {
      // Count consecutive days
      for (let i = 0; i < 90; i++) {
        const checkKey = convertToDateKey(checkDate);
        if (activeDates.has(checkKey)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (i === 0) {
          // If not active today, check yesterday
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        } else {
          break;
        }
      }
      currentStreakDays = currentStreak;
    }

    // Calculate longest streak
    const sortedDates = Array.from(activeDates).sort((a, b) => a - b);
    let tempStreak = 1;
    longestStreakDays = sortedDates.length > 0 ? 1 : 0;

    for (let i = 1; i < sortedDates.length; i++) {
      const prev = sortedDates[i - 1];
      const curr = sortedDates[i];

      // Check if consecutive (diff should be roughly 1 day in YYYYMMDD format)
      const prevDate = new Date(
        `${String(prev).slice(0, 4)}-${String(prev).slice(4, 6)}-${String(prev).slice(6, 8)}`
      );
      const currDate = new Date(
        `${String(curr).slice(0, 4)}-${String(curr).slice(4, 6)}-${String(curr).slice(6, 8)}`
      );
      const diffDays = (currDate.getTime() - prevDate.getTime()) / 86400000;

      if (diffDays === 1) {
        tempStreak++;
        longestStreakDays = Math.max(longestStreakDays, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    // Get skills mastered this month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartKey = convertToDateKey(monthStart);

    const skillsThisMonth = await prisma.$queryRaw<Array<{ skills_gained: bigint }>>`
      SELECT COALESCE(SUM(skills_gained_today), 0) as skills_gained
      FROM fact_learning_progress
      WHERE learner_key = ${learnerKey}
        AND date_key >= ${monthStartKey}
        AND date_key <= ${todayKey}
    `;
    const skillsMasteredThisMonth = Number(skillsThisMonth[0]?.skills_gained ?? 0);

    // Sessions this week
    const weekStart = getWeekStart(today);
    const weekStartKey = convertToDateKey(weekStart);

    const sessionsThisWeekResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM fact_sessions
      WHERE learner_key = ${learnerKey}
        AND date_key >= ${weekStartKey}
        AND date_key <= ${todayKey}
    `;
    const sessionsCountThisWeek = Number(sessionsThisWeekResult[0]?.count ?? 0);

    // Generate milestones
    const milestones: Milestone[] = [
      {
        id: 'streak-3',
        type: 'streak',
        title: '3-Day Streak',
        description: 'Practice 3 days in a row',
        achieved: longestStreakDays >= 3,
        achievedAt: longestStreakDays >= 3 ? today.toISOString() : undefined,
        progress: Math.min(currentStreakDays, 3),
        target: 3,
      },
      {
        id: 'streak-7',
        type: 'streak',
        title: 'Week Warrior',
        description: 'Practice 7 days in a row',
        achieved: longestStreakDays >= 7,
        achievedAt: longestStreakDays >= 7 ? today.toISOString() : undefined,
        progress: Math.min(currentStreakDays, 7),
        target: 7,
      },
      {
        id: 'streak-14',
        type: 'streak',
        title: 'Two-Week Champion',
        description: 'Practice 14 days in a row',
        achieved: longestStreakDays >= 14,
        achievedAt: longestStreakDays >= 14 ? today.toISOString() : undefined,
        progress: Math.min(currentStreakDays, 14),
        target: 14,
      },
      {
        id: 'skills-5',
        type: 'skills',
        title: 'Skill Builder',
        description: 'Master 5 skills this month',
        achieved: skillsMasteredThisMonth >= 5,
        progress: Math.min(skillsMasteredThisMonth, 5),
        target: 5,
      },
      {
        id: 'skills-10',
        type: 'skills',
        title: 'Knowledge Seeker',
        description: 'Master 10 skills this month',
        achieved: skillsMasteredThisMonth >= 10,
        progress: Math.min(skillsMasteredThisMonth, 10),
        target: 10,
      },
      {
        id: 'sessions-5',
        type: 'sessions',
        title: 'Consistent Learner',
        description: 'Complete 5 sessions this week',
        achieved: sessionsCountThisWeek >= 5,
        progress: Math.min(sessionsCountThisWeek, 5),
        target: 5,
      },
    ];

    // Generate encouragement message
    let encouragementMessage: string;
    if (currentStreakDays >= 7) {
      encouragementMessage = `Amazing! You're on a ${currentStreakDays}-day streak. Keep it up! 🌟`;
    } else if (currentStreakDays >= 3) {
      encouragementMessage = `Great work! ${currentStreakDays} days in a row. You're building a habit! 💪`;
    } else if (currentStreakDays >= 1) {
      encouragementMessage = `Nice start! Every day counts. Keep going! 🎯`;
    } else if (sessionsCountThisWeek > 0) {
      encouragementMessage = `You practiced ${sessionsCountThisWeek} time${sessionsCountThisWeek > 1 ? 's' : ''} this week. Ready for more?`;
    } else {
      encouragementMessage = `Ready to start your learning adventure today? 🚀`;
    }

    const response: EffortSummaryResponse = {
      learnerId,
      currentStreakDays,
      longestStreakDays,
      skillsMasteredThisMonth,
      sessionsCountThisWeek,
      milestones,
      encouragementMessage,
    };

    return response;
  });
};
