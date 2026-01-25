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

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/array-type */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { prisma, type Prisma } from '../prisma.js';

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
  return Number.parseInt(`${year}${month}${day}`, 10);
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

// Mobile App Progress Summary Response Types
interface MobileDailyStat {
  day: string;
  minutes: number;
  xp: number;
}

interface MobileSubjectProgress {
  subject: string;
  progress: number;
  colorHex: string;
  lessonsCompleted: number;
  totalLessons: number;
  mastery: number;
}

interface MobileSkillProgress {
  skill: string;
  level: number;
  maxLevel: number;
  emoji: string;
}

interface MobileRecentActivity {
  id: string;
  type: string;
  title: string;
  xp: number;
  time: string;
  emoji: string;
}

interface MobileProgressSummaryResponse {
  totalMinutesThisWeek: number;
  totalXpThisWeek: number;
  currentStreak: number;
  lessonsCompleted: number;
  weeklyStats: MobileDailyStat[];
  subjectProgress: MobileSubjectProgress[];
  skills: MobileSkillProgress[];
  recentActivity: MobileRecentActivity[];
}

// Subject color mapping
const SUBJECT_COLORS: Record<string, string> = {
  MATH: '#3B82F6',
  ELA: '#A855F7',
  SCIENCE: '#22C55E',
  SOCIAL_STUDIES: '#F97316',
  READING: '#A855F7',
  WRITING: '#EC4899',
  default: '#6B7280',
};

// Skill emoji mapping
const SKILL_EMOJIS: Record<string, string> = {
  fraction: '🔢',
  reading_comprehension: '📖',
  scientific_method: '🔬',
  problem_solving: '🧩',
  writing: '✍️',
  geography: '🗺️',
  algebra: '📊',
  grammar: '📝',
  vocabulary: '📚',
  default: '📚',
};

function getSkillEmoji(skillName: string): string {
  const normalizedName = skillName.toLowerCase().replace(/\s+/g, '_');
  return SKILL_EMOJIS[normalizedName] ?? SKILL_EMOJIS.default ?? '📚';
}

function getActivityEmoji(activityType: string): string {
  switch (activityType.toLowerCase()) {
    case 'lesson':
      return '📖';
    case 'assessment':
      return '📝';
    case 'practice':
      return '🎯';
    case 'game':
      return '🎮';
    case 'video':
      return '🎬';
    case 'achievement':
      return '🏆';
    default:
      return '📚';
  }
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) {
    return `${diffMins} minutes ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Maps database goal types to mobile app goal types
 */
function mapGoalType(
  dbType: string
): 'lessons' | 'minutes' | 'xp' | 'streak' | 'subject' | 'custom' {
  const typeMap: Record<
    string,
    'lessons' | 'minutes' | 'xp' | 'streak' | 'subject' | 'custom'
  > = {
    lesson_count: 'lessons',
    lessons: 'lessons',
    time_spent: 'minutes',
    minutes: 'minutes',
    xp_earned: 'xp',
    xp: 'xp',
    streak_days: 'streak',
    streak: 'streak',
    subject_mastery: 'subject',
    subject: 'subject',
  };
  return typeMap[dbType.toLowerCase()] ?? 'custom';
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export const learnerAnalyticsRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /analytics/learners/:learnerId/progress-summary
   *
   * Returns progress summary optimized for mobile learner app.
   * Includes weekly stats, subject progress, skills, and recent activity.
   */
  app.get<{
    Params: { learnerId: string };
  }>('/learners/:learnerId/progress-summary', async (request, reply) => {
    const user = getUser(request);
    const { learnerId } = request.params;

    // Verify learner can access their own data
    if (user.role === 'learner' && user.learnerId !== learnerId) {
      return reply.code(403).send({ error: 'Access denied' });
    }

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

    // Calculate date range for this week
    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekStartKey = convertToDateKey(weekStart);
    const todayKey = convertToDateKey(now);

    // Get weekly stats (daily breakdown)
    const dailyStats = await prisma.$queryRaw<
      Array<{ date_key: number; total_time_seconds: bigint; xp_earned: bigint }>
    >`
      SELECT 
        date_key,
        COALESCE(SUM(duration_seconds), 0) as total_time_seconds,
        COALESCE(SUM(xp_earned), 0) as xp_earned
      FROM fact_sessions
      WHERE learner_key = ${learnerKey}
        AND date_key >= ${weekStartKey}
        AND date_key <= ${todayKey}
      GROUP BY date_key
      ORDER BY date_key
    `;

    // Build weekly stats array (Mon-Sun)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyStats: MobileDailyStat[] = [];
    const statsMap = new Map<number, { minutes: number; xp: number }>();

    for (const stat of dailyStats) {
      statsMap.set(stat.date_key, {
        minutes: Math.round(Number(stat.total_time_seconds) / 60),
        xp: Number(stat.xp_earned),
      });
    }

    // Fill in all 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dateKey = convertToDateKey(date);
      const dayName = dayNames[date.getDay()] ?? 'Day';
      const stats = statsMap.get(dateKey) ?? { minutes: 0, xp: 0 };
      weeklyStats.push({
        day: dayName,
        minutes: stats.minutes,
        xp: stats.xp,
      });
    }

    // Calculate totals
    const totalMinutesThisWeek = weeklyStats.reduce((sum, s) => sum + s.minutes, 0);
    const totalXpThisWeek = weeklyStats.reduce((sum, s) => sum + s.xp, 0);

    // Get current streak
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

    const activeDates = new Set<number>(sessionDates.map((r: { date_key: number }) => r.date_key));
    let currentStreak = 0;
    const checkDate = new Date(now);
    const yesterdayKey = convertToDateKey(new Date(now.getTime() - 86400000));

    if (activeDates.has(todayKey) || activeDates.has(yesterdayKey)) {
      for (let i = 0; i < 90; i++) {
        const checkKey = convertToDateKey(checkDate);
        if (activeDates.has(checkKey)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (i === 0 && !activeDates.has(todayKey)) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        } else {
          break;
        }
      }
    }

    // Get lessons completed (total all time)
    const lessonsResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM fact_content_events
      WHERE learner_key = ${learnerKey}
        AND event_type = 'COMPLETED'
        AND content_type = 'lesson'
    `;
    const lessonsCompleted = Number(lessonsResult[0]?.count ?? 0);

    // Get subject progress
    const subjectData = await prisma.$queryRaw<
      Array<{
        subject_code: string;
        subject_name: string;
        average_mastery: Prisma.Decimal;
        mastered_skills: number;
        total_skills: number;
        lessons_completed: number;
        total_lessons: number;
      }>
    >`
      SELECT 
        s.subject_code,
        s.subject_name,
        COALESCE(p.average_mastery, 0) as average_mastery,
        COALESCE(p.mastered_skills, 0) as mastered_skills,
        COALESCE(p.total_skills, 1) as total_skills,
        COALESCE(p.lessons_completed, 0) as lessons_completed,
        COALESCE(p.total_lessons, 1) as total_lessons
      FROM dim_subject s
      LEFT JOIN LATERAL (
        SELECT 
          average_mastery,
          mastered_skills,
          total_skills,
          lessons_completed,
          total_lessons
        FROM fact_learning_progress
        WHERE learner_key = ${learnerKey}
          AND subject_key = s.subject_key
        ORDER BY date_key DESC
        LIMIT 1
      ) p ON true
      WHERE s.is_active = true
      ORDER BY s.subject_name
    `;

    const subjectProgress: MobileSubjectProgress[] = subjectData.map((s) => ({
      subject: s.subject_name,
      progress: s.total_lessons > 0 ? Math.round((s.lessons_completed / s.total_lessons) * 100) : 0,
      colorHex: SUBJECT_COLORS[s.subject_code] ?? SUBJECT_COLORS.default ?? '#6B7280',
      lessonsCompleted: s.lessons_completed,
      totalLessons: s.total_lessons,
      mastery: Math.round(Number(s.average_mastery) * 100),
    }));

    // Get top skills
    const skillsData = await prisma.$queryRaw<
      Array<{
        skill_code: string;
        skill_name: string;
        mastery_level: Prisma.Decimal;
      }>
    >`
      SELECT 
        sk.skill_code,
        sk.skill_name,
        COALESCE(sm.mastery_level, 0) as mastery_level
      FROM dim_skill sk
      LEFT JOIN fact_skill_mastery sm ON sm.skill_key = sk.skill_key
        AND sm.learner_key = ${learnerKey}
      WHERE sk.is_active = true
      ORDER BY sm.mastery_level DESC NULLS LAST
      LIMIT 6
    `;

    const skills: MobileSkillProgress[] = skillsData.map((s) => ({
      skill: s.skill_name,
      level: Math.min(Math.ceil(Number(s.mastery_level) / 20), 5), // Convert 0-100 to 1-5
      maxLevel: 5,
      emoji: getSkillEmoji(s.skill_code),
    }));

    // Get recent activity
    const activityData = await prisma.$queryRaw<
      Array<{
        event_id: string;
        event_type: string;
        content_type: string;
        content_title: string;
        xp_earned: number;
        event_timestamp: Date;
      }>
    >`
      SELECT 
        event_id::text,
        event_type,
        content_type,
        COALESCE(content_title, content_type) as content_title,
        COALESCE(xp_earned, 0) as xp_earned,
        event_timestamp
      FROM fact_content_events
      WHERE learner_key = ${learnerKey}
      ORDER BY event_timestamp DESC
      LIMIT 5
    `;

    const recentActivity: MobileRecentActivity[] = activityData.map((a) => ({
      id: a.event_id,
      type: a.content_type,
      title: `${a.event_type === 'COMPLETED' ? 'Completed' : 'Started'} "${a.content_title}"`,
      xp: a.xp_earned,
      time: formatRelativeTime(a.event_timestamp),
      emoji: getActivityEmoji(a.content_type),
    }));

    const response: MobileProgressSummaryResponse = {
      totalMinutesThisWeek,
      totalXpThisWeek,
      currentStreak,
      lessonsCompleted,
      weeklyStats,
      subjectProgress,
      skills,
      recentActivity,
    };

    return response;
  });

  /**
   * GET /analytics/learners/:learnerId/goals
   *
   * Returns active and completed goals for a learner.
   * Used by mobile learner app for goals tracking.
   */
  app.get<{
    Params: { learnerId: string };
    Querystring: { includeCompleted?: string };
  }>('/learners/:learnerId/goals', async (request, reply) => {
    const user = getUser(request);
    const { learnerId } = request.params;
    const includeCompleted = request.query.includeCompleted !== 'false';

    // Verify learner can access their own data
    if (user.role === 'learner' && user.learnerId !== learnerId) {
      return reply.code(403).send({ error: 'Access denied' });
    }

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

    // Get active goals
    const activeGoalsData = await prisma.$queryRaw<
      Array<{
        goal_id: string;
        title: string;
        description: string;
        goal_type: string;
        target_value: number;
        current_value: number;
        deadline: Date | null;
        status: string;
      }>
    >`
      SELECT 
        g.goal_id::text,
        g.title,
        COALESCE(g.description, '') as description,
        g.goal_type,
        g.target_value,
        COALESCE(g.current_value, 0) as current_value,
        g.deadline,
        g.status
      FROM dim_learner_goal g
      WHERE g.learner_key = ${learnerKey}
        AND g.status = 'active'
        AND g.is_current = true
      ORDER BY g.deadline ASC NULLS LAST
    `;

    const activeGoals = activeGoalsData.map((g) => ({
      id: g.goal_id,
      title: g.title,
      description: g.description,
      type: mapGoalType(g.goal_type),
      targetValue: g.target_value,
      currentValue: g.current_value,
      deadline: g.deadline?.toISOString() ?? null,
      status: 'active',
      objectives: [],
    }));

    // Get completed goals if requested
    let completedGoals: Array<{
      id: string;
      title: string;
      description: string;
      type: string;
      targetValue: number;
      currentValue: number;
      deadline: string | null;
      status: string;
      objectives: never[];
    }> = [];

    if (includeCompleted) {
      const completedGoalsData = await prisma.$queryRaw<
        Array<{
          goal_id: string;
          title: string;
          description: string;
          goal_type: string;
          target_value: number;
          current_value: number;
          deadline: Date | null;
          status: string;
        }>
      >`
        SELECT 
          g.goal_id::text,
          g.title,
          COALESCE(g.description, '') as description,
          g.goal_type,
          g.target_value,
          COALESCE(g.current_value, 0) as current_value,
          g.deadline,
          g.status
        FROM dim_learner_goal g
        WHERE g.learner_key = ${learnerKey}
          AND g.status = 'completed'
          AND g.is_current = true
        ORDER BY g.completed_at DESC
        LIMIT 10
      `;

      completedGoals = completedGoalsData.map((g) => ({
        id: g.goal_id,
        title: g.title,
        description: g.description,
        type: mapGoalType(g.goal_type),
        targetValue: g.target_value,
        currentValue: g.current_value,
        deadline: g.deadline?.toISOString() ?? null,
        status: 'completed',
        objectives: [],
      }));
    }

    return {
      activeGoals,
      completedGoals,
    };
  });

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
        average_mastery: Prisma.Decimal;
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
        average_mastery: Prisma.Decimal;
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
