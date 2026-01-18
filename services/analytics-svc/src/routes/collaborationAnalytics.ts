/**
 * Collaboration Analytics Routes
 *
 * API endpoints for caregiver collaboration analytics (Epic 15).
 * Provides insights into:
 * - Care team engagement metrics
 * - Action plan progress tracking
 * - Task completion rates
 * - Communication activity (messages, meetings)
 * - Learner support effectiveness
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const dateRangeSchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const learnerFilterSchema = z.object({
  learnerId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
});

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

function getDefaultDateRange(): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30); // Default to last 30 days
  return { from, to };
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00Z');
}

function toDateKey(date: Date): number {
  return parseInt(
    `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

export const collaborationAnalyticsRoutes: FastifyPluginAsync = async (fastify) => {
  const { prisma } = fastify;

  // ════════════════════════════════════════════════════════════════════════════
  // CARE TEAM METRICS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /analytics/collaboration/care-teams/summary
   * Aggregate care team metrics across all learners or filtered by class
   */
  fastify.get(
    '/collaboration/care-teams/summary',
    async (request: FastifyRequest<{ Querystring: z.infer<typeof learnerFilterSchema> }>) => {
      const user = getUser(request);
      learnerFilterSchema.parse(request.query);

      // Query from dim_care_team and agg_collaboration_metrics_daily
      const dateRange = getDefaultDateRange();
      const fromDateKey = toDateKey(dateRange.from);
      const toDateKey = toDateKey(dateRange.to);

      const [careTeamStats, roleDistribution, periodMetrics] = await Promise.all([
        // Care team totals from dimension table
        prisma.$queryRaw<Array<{ total: bigint; active: bigint; avg_size: number }>>`
          SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE is_active = true) as active,
            AVG(member_count)::numeric(5,2) as avg_size
          FROM dim_care_team
          WHERE tenant_id = ${user.tenantId}::uuid
            AND is_current = true
        `,
        // Role distribution from current care teams
        prisma.$queryRaw<Array<{ parents: bigint; teachers: bigint; counselors: bigint; specialists: bigint; other: bigint }>>`
          SELECT
            SUM(parent_count) as parents,
            SUM(teacher_count) as teachers,
            SUM(counselor_count) as counselors,
            SUM(specialist_count) as specialists,
            SUM(other_count) as other
          FROM dim_care_team
          WHERE tenant_id = ${user.tenantId}::uuid
            AND is_current = true
        `,
        // Period comparison from aggregated metrics
        prisma.$queryRaw<Array<{ engagement_rate: number; active_teams_current: bigint; active_teams_previous: bigint }>>`
          WITH current_period AS (
            SELECT COALESCE(AVG(active_care_teams), 0) as avg_active, COALESCE(AVG(engagement_rate), 0) as avg_engagement
            FROM agg_collaboration_metrics_daily m
            JOIN dim_tenant t ON m.tenant_key = t.tenant_key
            WHERE t.tenant_id = ${user.tenantId}::uuid
              AND m.date_key BETWEEN ${fromDateKey} AND ${toDateKey}
          ),
          previous_period AS (
            SELECT COALESCE(AVG(active_care_teams), 0) as avg_active
            FROM agg_collaboration_metrics_daily m
            JOIN dim_tenant t ON m.tenant_key = t.tenant_key
            WHERE t.tenant_id = ${user.tenantId}::uuid
              AND m.date_key BETWEEN ${fromDateKey - 30} AND ${fromDateKey - 1}
          )
          SELECT
            c.avg_engagement as engagement_rate,
            c.avg_active::bigint as active_teams_current,
            p.avg_active::bigint as active_teams_previous
          FROM current_period c, previous_period p
        `,
      ]);

      const stats = careTeamStats[0] || { total: 0n, active: 0n, avg_size: 0 };
      const roles = roleDistribution[0] || { parents: 0n, teachers: 0n, counselors: 0n, specialists: 0n, other: 0n };
      const period = periodMetrics[0] || { engagement_rate: 0, active_teams_current: 0n, active_teams_previous: 0n };

      const current = Number(period.active_teams_current);
      const previous = Number(period.active_teams_previous);
      const changePercent = previous > 0 ? ((current - previous) / previous) * 100 : 0;

      return {
        totalCareTeams: Number(stats.total),
        averageTeamSize: stats.avg_size || 0,
        activeTeams: Number(stats.active),
        teamsWithRecentActivity: current,
        roleDistribution: {
          parents: Number(roles.parents),
          teachers: Number(roles.teachers),
          counselors: Number(roles.counselors),
          specialists: Number(roles.specialists),
          other: Number(roles.other),
        },
        engagementRate: period.engagement_rate || 0,
        periodComparison: {
          current,
          previous,
          changePercent: Math.round(changePercent * 10) / 10,
        },
      };
    }
  );

  /**
   * GET /analytics/collaboration/care-teams/:learnerId
   * Care team engagement metrics for a specific learner
   */
  fastify.get(
    '/collaboration/care-teams/:learnerId',
    async (
      request: FastifyRequest<{
        Params: { learnerId: string };
        Querystring: z.infer<typeof dateRangeSchema>;
      }>
    ) => {
      const user = getUser(request);
      const { learnerId } = request.params;
      const { from, to } = dateRangeSchema.parse(request.query);

      const dateRange = from && to
        ? { from: parseDate(from), to: parseDate(to) }
        : getDefaultDateRange();

      const fromDateKey = toDateKey(dateRange.from);
      const toDateKeyVal = toDateKey(dateRange.to);

      const [careTeam, engagement, timeline] = await Promise.all([
        // Get care team composition
        prisma.$queryRaw<Array<{
          member_count: number;
          parent_count: number;
          teacher_count: number;
          counselor_count: number;
          specialist_count: number;
          other_count: number;
        }>>`
          SELECT member_count, parent_count, teacher_count, counselor_count, specialist_count, other_count
          FROM dim_care_team
          WHERE learner_id = ${learnerId}::uuid
            AND tenant_id = ${user.tenantId}::uuid
            AND is_current = true
          LIMIT 1
        `,
        // Get engagement metrics
        prisma.$queryRaw<Array<{
          messages: bigint;
          meetings: bigint;
          notes: bigint;
          avg_response_hours: number;
        }>>`
          SELECT
            COALESCE((SELECT COUNT(*) FROM fact_collaboration_message m
              JOIN dim_learner l ON m.learner_key = l.learner_key
              WHERE l.learner_id = ${learnerId}::uuid
                AND m.date_key BETWEEN ${fromDateKey} AND ${toDateKeyVal}), 0) as messages,
            COALESCE((SELECT COUNT(*) FROM fact_collaboration_meeting m
              JOIN dim_learner l ON m.learner_key = l.learner_key
              WHERE l.learner_id = ${learnerId}::uuid
                AND m.date_key BETWEEN ${fromDateKey} AND ${toDateKeyVal}
                AND m.status = 'completed'), 0) as meetings,
            COALESCE((SELECT COUNT(*) FROM fact_care_note n
              JOIN dim_learner l ON n.learner_key = l.learner_key
              WHERE l.learner_id = ${learnerId}::uuid
                AND n.date_key BETWEEN ${fromDateKey} AND ${toDateKeyVal}
                AND n.event_type = 'created'), 0) as notes,
            COALESCE((SELECT AVG(response_time_minutes) / 60.0 FROM fact_collaboration_message m
              JOIN dim_learner l ON m.learner_key = l.learner_key
              WHERE l.learner_id = ${learnerId}::uuid
                AND m.date_key BETWEEN ${fromDateKey} AND ${toDateKeyVal}
                AND m.is_reply = true), 0) as avg_response_hours
        `,
        // Get weekly activity timeline
        prisma.$queryRaw<Array<{
          week_start: Date;
          messages: bigint;
          notes: bigint;
          meetings: bigint;
        }>>`
          SELECT
            date_trunc('week', t.full_date)::date as week_start,
            COUNT(DISTINCT m.message_key) as messages,
            COUNT(DISTINCT n.note_key) as notes,
            COUNT(DISTINCT mtg.meeting_key) as meetings
          FROM dim_time t
          LEFT JOIN fact_collaboration_message m ON t.date_key = m.date_key
            AND m.learner_key IN (SELECT learner_key FROM dim_learner WHERE learner_id = ${learnerId}::uuid)
          LEFT JOIN fact_care_note n ON t.date_key = n.date_key
            AND n.learner_key IN (SELECT learner_key FROM dim_learner WHERE learner_id = ${learnerId}::uuid)
            AND n.event_type = 'created'
          LEFT JOIN fact_collaboration_meeting mtg ON t.date_key = mtg.date_key
            AND mtg.learner_key IN (SELECT learner_key FROM dim_learner WHERE learner_id = ${learnerId}::uuid)
            AND mtg.status = 'completed'
          WHERE t.date_key BETWEEN ${fromDateKey} AND ${toDateKeyVal}
          GROUP BY date_trunc('week', t.full_date)
          ORDER BY week_start
        `,
      ]);

      const team = careTeam[0] || { member_count: 0, parent_count: 0, teacher_count: 0, counselor_count: 0, specialist_count: 0, other_count: 0 };
      const eng = engagement[0] || { messages: 0n, meetings: 0n, notes: 0n, avg_response_hours: 0 };

      const members = [
        { role: 'Parent', count: team.parent_count, activeCount: team.parent_count },
        { role: 'Teacher', count: team.teacher_count, activeCount: team.teacher_count },
        { role: 'Counselor', count: team.counselor_count, activeCount: team.counselor_count },
        { role: 'Specialist', count: team.specialist_count, activeCount: team.specialist_count },
        { role: 'Other', count: team.other_count, activeCount: team.other_count },
      ].filter(m => m.count > 0);

      return {
        learnerId,
        dateRange: {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString(),
        },
        teamSize: team.member_count,
        members,
        engagement: {
          messagesExchanged: Number(eng.messages),
          meetingsHeld: Number(eng.meetings),
          notesShared: Number(eng.notes),
          avgResponseTimeHours: Math.round((eng.avg_response_hours || 0) * 10) / 10,
        },
        activityTimeline: timeline.map(t => ({
          date: t.week_start.toISOString().split('T')[0],
          messages: Number(t.messages),
          notes: Number(t.notes),
          meetings: Number(t.meetings),
        })),
      };
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // ACTION PLAN ANALYTICS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /analytics/collaboration/action-plans/summary
   * Aggregate action plan metrics
   */
  fastify.get(
    '/collaboration/action-plans/summary',
    async (request: FastifyRequest<{ Querystring: z.infer<typeof learnerFilterSchema> }>) => {
      const user = getUser(request);
      learnerFilterSchema.parse(request.query);

      const [planStats, outcomeStats] = await Promise.all([
        // Get action plan statistics
        prisma.$queryRaw<Array<{
          total: bigint;
          draft: bigint;
          active: bigint;
          completed: bigint;
          archived: bigint;
          avg_goals: number;
          avg_progress: number;
          avg_duration: number;
        }>>`
          SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'draft') as draft,
            COUNT(*) FILTER (WHERE status = 'active') as active,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE status = 'archived') as archived,
            AVG(goal_count)::numeric(5,2) as avg_goals,
            AVG(progress_percent)::numeric(5,2) as avg_progress,
            AVG(CASE WHEN completed_date IS NOT NULL AND start_date IS NOT NULL
                THEN completed_date - start_date ELSE NULL END)::numeric(10,1) as avg_duration
          FROM dim_action_plan
          WHERE tenant_id = ${user.tenantId}::uuid
            AND is_current = true
        `,
        // Get outcome distribution
        prisma.$queryRaw<Array<{
          on_track: bigint;
          needs_attention: bigint;
          at_risk: bigint;
        }>>`
          SELECT
            COUNT(*) FILTER (WHERE outcome_status = 'on_track') as on_track,
            COUNT(*) FILTER (WHERE outcome_status = 'needs_attention') as needs_attention,
            COUNT(*) FILTER (WHERE outcome_status = 'at_risk') as at_risk
          FROM dim_action_plan
          WHERE tenant_id = ${user.tenantId}::uuid
            AND is_current = true
            AND status = 'active'
        `,
      ]);

      const stats = planStats[0] || { total: 0n, draft: 0n, active: 0n, completed: 0n, archived: 0n, avg_goals: 0, avg_progress: 0, avg_duration: 0 };
      const outcomes = outcomeStats[0] || { on_track: 0n, needs_attention: 0n, at_risk: 0n };

      return {
        totalPlans: Number(stats.total),
        activePlans: Number(stats.active),
        completedPlans: Number(stats.completed),
        averageGoalsPerPlan: stats.avg_goals || 0,
        statusDistribution: {
          draft: Number(stats.draft),
          active: Number(stats.active),
          completed: Number(stats.completed),
          archived: Number(stats.archived),
        },
        outcomeTracking: {
          onTrack: Number(outcomes.on_track),
          needsAttention: Number(outcomes.needs_attention),
          atRisk: Number(outcomes.at_risk),
        },
        avgCompletionRate: (stats.avg_progress || 0) / 100,
        avgDurationDays: stats.avg_duration || 0,
      };
    }
  );

  /**
   * GET /analytics/collaboration/action-plans/:learnerId
   * Action plan analytics for a specific learner
   */
  fastify.get(
    '/collaboration/action-plans/:learnerId',
    async (
      request: FastifyRequest<{
        Params: { learnerId: string };
        Querystring: z.infer<typeof dateRangeSchema>;
      }>
    ) => {
      const user = getUser(request);
      const { learnerId } = request.params;

      const [planCounts, plans, progressTrend] = await Promise.all([
        // Get plan counts
        prisma.$queryRaw<Array<{ active: bigint; completed: bigint }>>`
          SELECT
            COUNT(*) FILTER (WHERE status = 'active') as active,
            COUNT(*) FILTER (WHERE status = 'completed') as completed
          FROM dim_action_plan
          WHERE learner_id = ${learnerId}::uuid
            AND tenant_id = ${user.tenantId}::uuid
            AND is_current = true
        `,
        // Get plan details
        prisma.$queryRaw<Array<{
          action_plan_id: string;
          title: string;
          status: string;
          progress_percent: number;
          goal_count: number;
          completed_goal_count: number;
          task_count: number;
          completed_task_count: number;
          start_date: Date | null;
          target_date: Date | null;
        }>>`
          SELECT
            action_plan_id::text,
            title,
            status,
            progress_percent,
            goal_count,
            completed_goal_count,
            task_count,
            completed_task_count,
            start_date,
            target_date
          FROM dim_action_plan
          WHERE learner_id = ${learnerId}::uuid
            AND tenant_id = ${user.tenantId}::uuid
            AND is_current = true
            AND status IN ('active', 'completed')
          ORDER BY status = 'active' DESC, start_date DESC
          LIMIT 10
        `,
        // Get weekly progress trend
        prisma.$queryRaw<Array<{ week: string; avg_progress: number }>>`
          SELECT
            to_char(t.full_date, 'IYYY-"W"IW') as week,
            AVG(e.progress_after)::numeric(5,2) as avg_progress
          FROM fact_action_plan_event e
          JOIN dim_time t ON e.date_key = t.date_key
          JOIN dim_learner l ON e.learner_key = l.learner_key
          WHERE l.learner_id = ${learnerId}::uuid
            AND e.event_type = 'progress_updated'
            AND t.full_date >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY to_char(t.full_date, 'IYYY-"W"IW')
          ORDER BY week DESC
          LIMIT 4
        `,
      ]);

      const counts = planCounts[0] || { active: 0n, completed: 0n };

      return {
        learnerId,
        activePlans: Number(counts.active),
        completedPlans: Number(counts.completed),
        plans: plans.map(p => ({
          id: p.action_plan_id,
          title: p.title,
          status: p.status,
          progress: (p.progress_percent || 0) / 100,
          goals: p.goal_count,
          completedGoals: p.completed_goal_count,
          tasks: p.task_count,
          completedTasks: p.completed_task_count,
          startDate: p.start_date?.toISOString().split('T')[0] || null,
          targetDate: p.target_date?.toISOString().split('T')[0] || null,
        })),
        progressTrend: progressTrend.reverse().map(t => ({
          week: t.week,
          avgProgress: (t.avg_progress || 0) / 100,
        })),
      };
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // TASK ANALYTICS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /analytics/collaboration/tasks/summary
   * Task completion metrics across all action plans
   */
  fastify.get(
    '/collaboration/tasks/summary',
    async (request: FastifyRequest<{ Querystring: z.infer<typeof learnerFilterSchema> }>) => {
      const user = getUser(request);
      learnerFilterSchema.parse(request.query);

      const [taskStats, byAssignee, byPriority, weeklyTrend] = await Promise.all([
        // Overall task statistics
        prisma.$queryRaw<Array<{
          total: bigint;
          completed: bigint;
          overdue: bigint;
          avg_completion_days: number;
        }>>`
          SELECT
            COUNT(DISTINCT task_id) as total,
            COUNT(DISTINCT task_id) FILTER (WHERE event_type = 'completed') as completed,
            COUNT(DISTINCT task_id) FILTER (WHERE is_overdue = true AND event_type != 'completed') as overdue,
            AVG(completion_time_days) FILTER (WHERE event_type = 'completed')::numeric(10,1) as avg_completion_days
          FROM fact_collaboration_task t
          JOIN dim_tenant ten ON t.tenant_key = ten.tenant_key
          WHERE ten.tenant_id = ${user.tenantId}::uuid
        `,
        // Tasks by assignee role
        prisma.$queryRaw<Array<{
          role: string;
          total: bigint;
          completed: bigint;
        }>>`
          SELECT
            assignee_role as role,
            COUNT(DISTINCT task_id) as total,
            COUNT(DISTINCT task_id) FILTER (WHERE event_type = 'completed') as completed
          FROM fact_collaboration_task t
          JOIN dim_tenant ten ON t.tenant_key = ten.tenant_key
          WHERE ten.tenant_id = ${user.tenantId}::uuid
            AND assignee_role IS NOT NULL
          GROUP BY assignee_role
        `,
        // Tasks by priority
        prisma.$queryRaw<Array<{
          priority: string;
          total: bigint;
          completed: bigint;
        }>>`
          SELECT
            priority,
            COUNT(DISTINCT task_id) as total,
            COUNT(DISTINCT task_id) FILTER (WHERE event_type = 'completed') as completed
          FROM fact_collaboration_task t
          JOIN dim_tenant ten ON t.tenant_key = ten.tenant_key
          WHERE ten.tenant_id = ${user.tenantId}::uuid
            AND priority IS NOT NULL
          GROUP BY priority
        `,
        // Weekly trend
        prisma.$queryRaw<Array<{
          week: string;
          created: bigint;
          completed: bigint;
        }>>`
          SELECT
            to_char(dt.full_date, 'IYYY-"W"IW') as week,
            COUNT(*) FILTER (WHERE t.event_type = 'created') as created,
            COUNT(*) FILTER (WHERE t.event_type = 'completed') as completed
          FROM fact_collaboration_task t
          JOIN dim_time dt ON t.date_key = dt.date_key
          JOIN dim_tenant ten ON t.tenant_key = ten.tenant_key
          WHERE ten.tenant_id = ${user.tenantId}::uuid
            AND dt.full_date >= CURRENT_DATE - INTERVAL '28 days'
          GROUP BY to_char(dt.full_date, 'IYYY-"W"IW')
          ORDER BY week
        `,
      ]);

      const stats = taskStats[0] || { total: 0n, completed: 0n, overdue: 0n, avg_completion_days: 0 };
      const total = Number(stats.total);
      const completed = Number(stats.completed);

      // Build assignee metrics
      const assigneeMap: Record<string, { total: number; completed: number; rate: number }> = {};
      for (const a of byAssignee) {
        const t = Number(a.total);
        const c = Number(a.completed);
        assigneeMap[a.role] = { total: t, completed: c, rate: t > 0 ? Math.round((c / t) * 100) / 100 : 0 };
      }

      // Build priority metrics
      const priorityMap: Record<string, { total: number; completed: number }> = {};
      for (const p of byPriority) {
        priorityMap[p.priority] = { total: Number(p.total), completed: Number(p.completed) };
      }

      return {
        totalTasks: total,
        completedTasks: completed,
        overdueTasks: Number(stats.overdue),
        completionRate: total > 0 ? Math.round((completed / total) * 100) / 100 : 0,
        avgCompletionTimeDays: stats.avg_completion_days || 0,
        byAssignee: {
          parent: assigneeMap.parent || { total: 0, completed: 0, rate: 0 },
          teacher: assigneeMap.teacher || { total: 0, completed: 0, rate: 0 },
          learner: assigneeMap.learner || { total: 0, completed: 0, rate: 0 },
          counselor: assigneeMap.counselor || { total: 0, completed: 0, rate: 0 },
        },
        byPriority: {
          high: priorityMap.high || { total: 0, completed: 0 },
          medium: priorityMap.medium || { total: 0, completed: 0 },
          low: priorityMap.low || { total: 0, completed: 0 },
        },
        weeklyTrend: weeklyTrend.map(w => ({
          week: w.week,
          created: Number(w.created),
          completed: Number(w.completed),
        })),
      };
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // COMMUNICATION ANALYTICS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /analytics/collaboration/communication/summary
   * Messaging and meeting activity metrics
   */
  fastify.get(
    '/collaboration/communication/summary',
    async (request: FastifyRequest<{ Querystring: z.infer<typeof dateRangeSchema> }>) => {
      const user = getUser(request);
      const { from, to } = dateRangeSchema.parse(request.query);

      const dateRange = from && to
        ? { from: parseDate(from), to: parseDate(to) }
        : getDefaultDateRange();

      const fromDateKey = toDateKey(dateRange.from);
      const toDateKeyVal = toDateKey(dateRange.to);
      const dayCount = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) || 1;

      const [messageStats, meetingStats, noteStats, peakHours] = await Promise.all([
        // Message statistics
        prisma.$queryRaw<Array<{
          total: bigint;
          avg_response_hours: number;
          care_team: bigint;
          action_plan: bigint;
          meeting: bigint;
        }>>`
          SELECT
            COUNT(*) as total,
            AVG(response_time_minutes) FILTER (WHERE is_reply = true) / 60.0 as avg_response_hours,
            COUNT(*) FILTER (WHERE thread_type = 'care_team') as care_team,
            COUNT(*) FILTER (WHERE thread_type = 'action_plan') as action_plan,
            COUNT(*) FILTER (WHERE thread_type = 'meeting') as meeting
          FROM fact_collaboration_message m
          JOIN dim_tenant t ON m.tenant_key = t.tenant_key
          WHERE t.tenant_id = ${user.tenantId}::uuid
            AND m.date_key BETWEEN ${fromDateKey} AND ${toDateKeyVal}
        `,
        // Meeting statistics
        prisma.$queryRaw<Array<{
          total: bigint;
          scheduled: bigint;
          completed: bigint;
          avg_duration: number;
          avg_participants: number;
          iep: bigint;
          progress: bigint;
          concern: bigint;
          other: bigint;
        }>>`
          SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status IN ('scheduled', 'completed')) as scheduled,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            AVG(actual_duration_minutes) FILTER (WHERE status = 'completed')::numeric(10,1) as avg_duration,
            AVG(attended_count) FILTER (WHERE status = 'completed')::numeric(5,2) as avg_participants,
            COUNT(*) FILTER (WHERE meeting_type = 'iep') as iep,
            COUNT(*) FILTER (WHERE meeting_type = 'progress') as progress,
            COUNT(*) FILTER (WHERE meeting_type = 'concern') as concern,
            COUNT(*) FILTER (WHERE meeting_type = 'other') as other
          FROM fact_collaboration_meeting m
          JOIN dim_tenant t ON m.tenant_key = t.tenant_key
          WHERE t.tenant_id = ${user.tenantId}::uuid
            AND m.date_key BETWEEN ${fromDateKey} AND ${toDateKeyVal}
        `,
        // Care note statistics
        prisma.$queryRaw<Array<{
          total: bigint;
          acknowledged: bigint;
          avg_ack_hours: number;
          observation: bigint;
          concern: bigint;
          milestone: bigint;
          update: bigint;
        }>>`
          SELECT
            COUNT(*) FILTER (WHERE event_type = 'created') as total,
            COUNT(*) FILTER (WHERE event_type = 'acknowledged') as acknowledged,
            AVG(acknowledgment_time_hours) FILTER (WHERE event_type = 'acknowledged')::numeric(10,1) as avg_ack_hours,
            COUNT(*) FILTER (WHERE note_type = 'observation' AND event_type = 'created') as observation,
            COUNT(*) FILTER (WHERE note_type = 'concern' AND event_type = 'created') as concern,
            COUNT(*) FILTER (WHERE note_type = 'milestone' AND event_type = 'created') as milestone,
            COUNT(*) FILTER (WHERE note_type = 'update' AND event_type = 'created') as update
          FROM fact_care_note n
          JOIN dim_tenant t ON n.tenant_key = t.tenant_key
          WHERE t.tenant_id = ${user.tenantId}::uuid
            AND n.date_key BETWEEN ${fromDateKey} AND ${toDateKeyVal}
        `,
        // Peak activity hours
        prisma.$queryRaw<Array<{ hour: number; activity_count: bigint }>>`
          SELECT
            EXTRACT(HOUR FROM m.sent_at)::int as hour,
            COUNT(*) as activity_count
          FROM fact_collaboration_message m
          JOIN dim_tenant t ON m.tenant_key = t.tenant_key
          WHERE t.tenant_id = ${user.tenantId}::uuid
            AND m.date_key BETWEEN ${fromDateKey} AND ${toDateKeyVal}
          GROUP BY EXTRACT(HOUR FROM m.sent_at)
          ORDER BY activity_count DESC
          LIMIT 6
        `,
      ]);

      const msgs = messageStats[0] || { total: 0n, avg_response_hours: 0, care_team: 0n, action_plan: 0n, meeting: 0n };
      const mtgs = meetingStats[0] || { total: 0n, scheduled: 0n, completed: 0n, avg_duration: 0, avg_participants: 0, iep: 0n, progress: 0n, concern: 0n, other: 0n };
      const notes = noteStats[0] || { total: 0n, acknowledged: 0n, avg_ack_hours: 0, observation: 0n, concern: 0n, milestone: 0n, update: 0n };

      return {
        dateRange: {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString(),
        },
        messages: {
          total: Number(msgs.total),
          avgPerDay: Math.round(Number(msgs.total) / dayCount),
          avgResponseTimeHours: Math.round((msgs.avg_response_hours || 0) * 10) / 10,
          byThread: {
            careTeam: Number(msgs.care_team),
            actionPlan: Number(msgs.action_plan),
            meeting: Number(msgs.meeting),
          },
        },
        meetings: {
          total: Number(mtgs.total),
          scheduled: Number(mtgs.scheduled),
          attended: Number(mtgs.completed),
          avgDurationMinutes: mtgs.avg_duration || 0,
          avgParticipants: mtgs.avg_participants || 0,
          byType: {
            iep: Number(mtgs.iep),
            progress: Number(mtgs.progress),
            concern: Number(mtgs.concern),
            other: Number(mtgs.other),
          },
        },
        careNotes: {
          total: Number(notes.total),
          acknowledged: Number(notes.acknowledged),
          avgAcknowledgmentTimeHours: notes.avg_ack_hours || 0,
          byType: {
            observation: Number(notes.observation),
            concern: Number(notes.concern),
            milestone: Number(notes.milestone),
            update: Number(notes.update),
          },
        },
        peakActivityHours: peakHours.map(h => h.hour).sort((a, b) => a - b),
      };
    }
  );

  /**
   * GET /analytics/collaboration/communication/:learnerId
   * Communication metrics for a specific learner's care team
   */
  fastify.get(
    '/collaboration/communication/:learnerId',
    async (
      request: FastifyRequest<{
        Params: { learnerId: string };
        Querystring: z.infer<typeof dateRangeSchema>;
      }>
    ) => {
      const user = getUser(request);
      const { learnerId } = request.params;
      const { from, to } = dateRangeSchema.parse(request.query);

      const dateRange = from && to
        ? { from: parseDate(from), to: parseDate(to) }
        : getDefaultDateRange();

      const fromDateKey = toDateKey(dateRange.from);
      const toDateKeyVal = toDateKey(dateRange.to);

      const [messageStats, meetingStats, noteStats, memberActivity] = await Promise.all([
        // Message statistics for this learner
        prisma.$queryRaw<Array<{ total: bigint; threads: bigint }>>`
          SELECT
            COUNT(*) as total,
            COUNT(DISTINCT thread_id) as threads
          FROM fact_collaboration_message m
          JOIN dim_learner l ON m.learner_key = l.learner_key
          JOIN dim_tenant t ON m.tenant_key = t.tenant_key
          WHERE l.learner_id = ${learnerId}::uuid
            AND t.tenant_id = ${user.tenantId}::uuid
            AND m.date_key BETWEEN ${fromDateKey} AND ${toDateKeyVal}
        `,
        // Meeting statistics
        prisma.$queryRaw<Array<{ scheduled: bigint; completed: bigint; upcoming: bigint }>>`
          SELECT
            COUNT(*) FILTER (WHERE status IN ('scheduled', 'completed')) as scheduled,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE status = 'scheduled' AND scheduled_start > NOW()) as upcoming
          FROM fact_collaboration_meeting m
          JOIN dim_learner l ON m.learner_key = l.learner_key
          JOIN dim_tenant t ON m.tenant_key = t.tenant_key
          WHERE l.learner_id = ${learnerId}::uuid
            AND t.tenant_id = ${user.tenantId}::uuid
            AND m.date_key BETWEEN ${fromDateKey} AND ${toDateKeyVal}
        `,
        // Note statistics
        prisma.$queryRaw<Array<{ created: bigint; acknowledged: bigint }>>`
          SELECT
            COUNT(*) FILTER (WHERE event_type = 'created') as created,
            COUNT(*) FILTER (WHERE event_type = 'acknowledged') as acknowledged
          FROM fact_care_note n
          JOIN dim_learner l ON n.learner_key = l.learner_key
          JOIN dim_tenant t ON n.tenant_key = t.tenant_key
          WHERE l.learner_id = ${learnerId}::uuid
            AND t.tenant_id = ${user.tenantId}::uuid
            AND n.date_key BETWEEN ${fromDateKey} AND ${toDateKeyVal}
        `,
        // Member activity (top contributors)
        prisma.$queryRaw<Array<{
          user_id: string;
          role: string;
          messages: bigint;
          notes: bigint;
        }>>`
          WITH msg_activity AS (
            SELECT sender_user_id as user_id, sender_role as role, COUNT(*) as messages
            FROM fact_collaboration_message m
            JOIN dim_learner l ON m.learner_key = l.learner_key
            JOIN dim_tenant t ON m.tenant_key = t.tenant_key
            WHERE l.learner_id = ${learnerId}::uuid
              AND t.tenant_id = ${user.tenantId}::uuid
              AND m.date_key BETWEEN ${fromDateKey} AND ${toDateKeyVal}
            GROUP BY sender_user_id, sender_role
          ),
          note_activity AS (
            SELECT creator_user_id as user_id, creator_role as role, COUNT(*) as notes
            FROM fact_care_note n
            JOIN dim_learner l ON n.learner_key = l.learner_key
            JOIN dim_tenant t ON n.tenant_key = t.tenant_key
            WHERE l.learner_id = ${learnerId}::uuid
              AND t.tenant_id = ${user.tenantId}::uuid
              AND n.date_key BETWEEN ${fromDateKey} AND ${toDateKeyVal}
              AND n.event_type = 'created'
            GROUP BY creator_user_id, creator_role
          )
          SELECT
            COALESCE(m.user_id, n.user_id)::text as user_id,
            COALESCE(m.role, n.role) as role,
            COALESCE(m.messages, 0) as messages,
            COALESCE(n.notes, 0) as notes
          FROM msg_activity m
          FULL OUTER JOIN note_activity n ON m.user_id = n.user_id
          ORDER BY COALESCE(m.messages, 0) + COALESCE(n.notes, 0) DESC
          LIMIT 10
        `,
      ]);

      const msgs = messageStats[0] || { total: 0n, threads: 0n };
      const mtgs = meetingStats[0] || { scheduled: 0n, completed: 0n, upcoming: 0n };
      const notes = noteStats[0] || { created: 0n, acknowledged: 0n };

      return {
        learnerId,
        dateRange: {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString(),
        },
        messages: {
          sent: Number(msgs.total),
          received: Number(msgs.total), // Symmetric for care team communication
          threads: Number(msgs.threads),
        },
        meetings: {
          scheduled: Number(mtgs.scheduled),
          attended: Number(mtgs.completed),
          upcoming: Number(mtgs.upcoming),
        },
        notes: {
          created: Number(notes.created),
          acknowledged: Number(notes.acknowledged),
        },
        memberActivity: memberActivity.map(m => ({
          memberId: m.user_id,
          name: `Member ${m.user_id.slice(0, 8)}`, // Name lookup would require user service
          messages: Number(m.messages),
          notes: Number(m.notes),
          role: m.role || 'Unknown',
        })),
      };
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // CLASSROOM / TEACHER DASHBOARD
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /analytics/collaboration/classroom/:classId
   * Classroom-level collaboration metrics for teachers
   */
  fastify.get(
    '/collaboration/classroom/:classId',
    async (
      request: FastifyRequest<{
        Params: { classId: string };
        Querystring: z.infer<typeof dateRangeSchema>;
      }>
    ) => {
      const user = getUser(request);
      const { classId } = request.params;

      const dateRange = getDefaultDateRange();
      const fromDateKey = toDateKey(dateRange.from);
      const toDateKeyVal = toDateKey(dateRange.to);

      const [classStats, engagement, needsAttention, recentActivity] = await Promise.all([
        // Classroom collaboration stats (using classId to filter learners)
        prisma.$queryRaw<Array<{
          total_learners: bigint;
          with_care_teams: bigint;
          with_action_plans: bigint;
          pending_tasks: bigint;
          upcoming_meetings: bigint;
        }>>`
          WITH class_learners AS (
            SELECT learner_key, learner_id FROM dim_learner
            WHERE is_current = true
            -- Note: classId filtering would typically join to a class/enrollment table
          )
          SELECT
            (SELECT COUNT(*) FROM class_learners) as total_learners,
            (SELECT COUNT(DISTINCT ct.learner_id) FROM dim_care_team ct
              JOIN class_learners cl ON ct.learner_id = cl.learner_id
              WHERE ct.is_current = true AND ct.is_active = true) as with_care_teams,
            (SELECT COUNT(DISTINCT ap.learner_id) FROM dim_action_plan ap
              JOIN class_learners cl ON ap.learner_id = cl.learner_id
              WHERE ap.is_current = true AND ap.status = 'active') as with_action_plans,
            (SELECT COUNT(DISTINCT task_id) FROM fact_collaboration_task t
              JOIN class_learners cl ON t.learner_key = cl.learner_key
              WHERE t.event_type = 'created'
                AND NOT EXISTS (SELECT 1 FROM fact_collaboration_task t2
                  WHERE t2.task_id = t.task_id AND t2.event_type = 'completed')) as pending_tasks,
            (SELECT COUNT(*) FROM fact_collaboration_meeting m
              JOIN class_learners cl ON m.learner_key = cl.learner_key
              WHERE m.status = 'scheduled' AND m.scheduled_start > NOW()) as upcoming_meetings
        `,
        // Engagement metrics
        prisma.$queryRaw<Array<{
          avg_response_hours: number;
          parent_engagement: number;
          ack_rate: number;
        }>>`
          SELECT
            COALESCE(AVG(m.avg_response_time_hours), 0)::numeric(10,1) as avg_response_hours,
            COALESCE(AVG(m.parent_engagement_rate), 0)::numeric(5,4) as parent_engagement,
            COALESCE(AVG(m.note_acknowledgment_rate), 0)::numeric(5,4) as ack_rate
          FROM agg_collaboration_metrics_daily m
          JOIN dim_tenant t ON m.tenant_key = t.tenant_key
          WHERE t.tenant_id = ${user.tenantId}::uuid
            AND m.date_key BETWEEN ${fromDateKey} AND ${toDateKeyVal}
        `,
        // Learners needing attention
        prisma.$queryRaw<Array<{
          learner_id: string;
          learner_name: string;
          reason: string;
          count: number;
          days_since: number;
        }>>`
          WITH overdue AS (
            SELECT
              l.learner_id::text,
              CONCAT(LEFT(l.learner_id::text, 8), '...') as learner_name,
              'Overdue tasks' as reason,
              COUNT(DISTINCT t.task_id)::int as count,
              0 as days_since
            FROM fact_collaboration_task t
            JOIN dim_learner l ON t.learner_key = l.learner_key
            JOIN dim_tenant ten ON t.tenant_key = ten.tenant_key
            WHERE ten.tenant_id = ${user.tenantId}::uuid
              AND t.is_overdue = true
              AND t.event_type != 'completed'
            GROUP BY l.learner_id
            HAVING COUNT(DISTINCT t.task_id) > 0
            LIMIT 5
          ),
          no_contact AS (
            SELECT
              ct.learner_id::text,
              CONCAT(LEFT(ct.learner_id::text, 8), '...') as learner_name,
              'No recent communication' as reason,
              0 as count,
              EXTRACT(DAY FROM NOW() - MAX(m.sent_at))::int as days_since
            FROM dim_care_team ct
            JOIN dim_tenant ten ON ct.tenant_id = ten.tenant_id
            LEFT JOIN fact_collaboration_message m ON ct.care_team_key = m.care_team_key
            WHERE ten.tenant_id = ${user.tenantId}::uuid
              AND ct.is_current = true
            GROUP BY ct.learner_id
            HAVING EXTRACT(DAY FROM NOW() - MAX(m.sent_at)) > 14 OR MAX(m.sent_at) IS NULL
            LIMIT 5
          )
          SELECT * FROM overdue
          UNION ALL
          SELECT * FROM no_contact
          LIMIT 5
        `,
        // Recent activity
        prisma.$queryRaw<Array<{
          event_type: string;
          learner_id: string;
          learner_name: string;
          detail: string;
          occurred_at: Date;
        }>>`
          (
            SELECT
              'note_acknowledged' as event_type,
              l.learner_id::text,
              CONCAT(LEFT(l.learner_id::text, 8), '...') as learner_name,
              '' as detail,
              n.occurred_at
            FROM fact_care_note n
            JOIN dim_learner l ON n.learner_key = l.learner_key
            JOIN dim_tenant t ON n.tenant_key = t.tenant_key
            WHERE t.tenant_id = ${user.tenantId}::uuid
              AND n.event_type = 'acknowledged'
            ORDER BY n.occurred_at DESC
            LIMIT 3
          )
          UNION ALL
          (
            SELECT
              'task_completed' as event_type,
              l.learner_id::text,
              CONCAT(LEFT(l.learner_id::text, 8), '...') as learner_name,
              COALESCE(tk.task_title, '') as detail,
              tk.occurred_at
            FROM fact_collaboration_task tk
            JOIN dim_learner l ON tk.learner_key = l.learner_key
            JOIN dim_tenant t ON tk.tenant_key = t.tenant_key
            WHERE t.tenant_id = ${user.tenantId}::uuid
              AND tk.event_type = 'completed'
            ORDER BY tk.occurred_at DESC
            LIMIT 3
          )
          ORDER BY occurred_at DESC
          LIMIT 5
        `,
      ]);

      const stats = classStats[0] || { total_learners: 0n, with_care_teams: 0n, with_action_plans: 0n, pending_tasks: 0n, upcoming_meetings: 0n };
      const eng = engagement[0] || { avg_response_hours: 0, parent_engagement: 0, ack_rate: 0 };

      return {
        classId,
        className: `Class ${classId.slice(0, 8)}`,
        totalLearners: Number(stats.total_learners),
        collaboration: {
          learnersWithCareTeams: Number(stats.with_care_teams),
          learnersWithActionPlans: Number(stats.with_action_plans),
          pendingTasks: Number(stats.pending_tasks),
          upcomingMeetings: Number(stats.upcoming_meetings),
        },
        engagement: {
          avgCareTeamResponseTime: eng.avg_response_hours || 0,
          parentEngagementRate: eng.parent_engagement || 0,
          noteAcknowledgmentRate: eng.ack_rate || 0,
        },
        needsAttention: needsAttention.map(n => ({
          learnerId: n.learner_id,
          learnerName: n.learner_name,
          reason: n.reason,
          ...(n.count > 0 ? { count: n.count } : {}),
          ...(n.days_since > 0 ? { daysSinceContact: n.days_since } : {}),
        })),
        recentActivity: recentActivity.map(a => ({
          type: a.event_type,
          learnerId: a.learner_id,
          learnerName: a.learner_name,
          ...(a.detail ? { taskTitle: a.detail } : {}),
          timestamp: a.occurred_at.toISOString(),
        })),
      };
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // DISTRICT / ADMIN DASHBOARD
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /analytics/collaboration/district/summary
   * District-wide collaboration metrics for administrators
   */
  fastify.get('/collaboration/district/summary', async (request) => {
    const user = getUser(request);

    const dateRange = getDefaultDateRange();
    const fromDateKey = toDateKey(dateRange.from);
    const toDateKeyVal = toDateKey(dateRange.to);
    const previousFromDateKey = fromDateKey - 30;
    const previousToDateKey = fromDateKey - 1;

    const [overview, engagement, actionPlanStats, trends] = await Promise.all([
      // Overview counts
      prisma.$queryRaw<Array<{
        total_schools: bigint;
        total_learners: bigint;
        with_care_teams: bigint;
        with_action_plans: bigint;
      }>>`
        SELECT
          (SELECT COUNT(DISTINCT school_id) FROM dim_tenant WHERE is_current = true AND tenant_id = ${user.tenantId}::uuid) as total_schools,
          (SELECT COUNT(*) FROM dim_learner WHERE is_current = true) as total_learners,
          (SELECT COUNT(DISTINCT learner_id) FROM dim_care_team WHERE is_current = true AND is_active = true AND tenant_id = ${user.tenantId}::uuid) as with_care_teams,
          (SELECT COUNT(DISTINCT learner_id) FROM dim_action_plan WHERE is_current = true AND status = 'active' AND tenant_id = ${user.tenantId}::uuid) as with_action_plans
      `,
      // Engagement metrics
      prisma.$queryRaw<Array<{
        engagement_rate: number;
        avg_response_hours: number;
        parent_rate: number;
        teacher_rate: number;
      }>>`
        SELECT
          COALESCE(AVG(engagement_rate), 0)::numeric(5,4) as engagement_rate,
          COALESCE(AVG(avg_response_time_hours), 0)::numeric(10,1) as avg_response_hours,
          COALESCE(AVG(parent_engagement_rate), 0)::numeric(5,4) as parent_rate,
          COALESCE(AVG(teacher_engagement_rate), 0)::numeric(5,4) as teacher_rate
        FROM agg_collaboration_metrics_daily m
        JOIN dim_tenant t ON m.tenant_key = t.tenant_key
        WHERE t.tenant_id = ${user.tenantId}::uuid
          AND m.date_key BETWEEN ${fromDateKey} AND ${toDateKeyVal}
      `,
      // Action plan statistics
      prisma.$queryRaw<Array<{
        active: bigint;
        on_track: bigint;
        needs_attention: bigint;
        at_risk: bigint;
        avg_progress: number;
      }>>`
        SELECT
          COUNT(*) as active,
          COUNT(*) FILTER (WHERE outcome_status = 'on_track') as on_track,
          COUNT(*) FILTER (WHERE outcome_status = 'needs_attention') as needs_attention,
          COUNT(*) FILTER (WHERE outcome_status = 'at_risk') as at_risk,
          AVG(progress_percent)::numeric(5,2) as avg_progress
        FROM dim_action_plan
        WHERE tenant_id = ${user.tenantId}::uuid
          AND is_current = true
          AND status = 'active'
      `,
      // Trends (comparing current vs previous period)
      prisma.$queryRaw<Array<{
        current_engagement: number;
        previous_engagement: number;
        current_messages: bigint;
        previous_messages: bigint;
        success_rate: number;
      }>>`
        WITH current_period AS (
          SELECT
            COALESCE(AVG(engagement_rate), 0) as avg_engagement,
            COALESCE(SUM(messages_sent), 0) as total_messages
          FROM agg_collaboration_metrics_daily m
          JOIN dim_tenant t ON m.tenant_key = t.tenant_key
          WHERE t.tenant_id = ${user.tenantId}::uuid
            AND m.date_key BETWEEN ${fromDateKey} AND ${toDateKeyVal}
        ),
        previous_period AS (
          SELECT
            COALESCE(AVG(engagement_rate), 0) as avg_engagement,
            COALESCE(SUM(messages_sent), 0) as total_messages
          FROM agg_collaboration_metrics_daily m
          JOIN dim_tenant t ON m.tenant_key = t.tenant_key
          WHERE t.tenant_id = ${user.tenantId}::uuid
            AND m.date_key BETWEEN ${previousFromDateKey} AND ${previousToDateKey}
        ),
        success AS (
          SELECT
            COUNT(*) FILTER (WHERE status = 'completed')::float /
              NULLIF(COUNT(*) FILTER (WHERE status IN ('completed', 'archived')), 0) as rate
          FROM dim_action_plan
          WHERE tenant_id = ${user.tenantId}::uuid
            AND is_current = true
        )
        SELECT
          c.avg_engagement::numeric(5,4) as current_engagement,
          p.avg_engagement::numeric(5,4) as previous_engagement,
          c.total_messages as current_messages,
          p.total_messages as previous_messages,
          COALESCE(s.rate, 0)::numeric(5,4) as success_rate
        FROM current_period c, previous_period p, success s
      `,
    ]);

    const ov = overview[0] || { total_schools: 0n, total_learners: 0n, with_care_teams: 0n, with_action_plans: 0n };
    const eng = engagement[0] || { engagement_rate: 0, avg_response_hours: 0, parent_rate: 0, teacher_rate: 0 };
    const ap = actionPlanStats[0] || { active: 0n, on_track: 0n, needs_attention: 0n, at_risk: 0n, avg_progress: 0 };
    const tr = trends[0] || { current_engagement: 0, previous_engagement: 0, current_messages: 0n, previous_messages: 0n, success_rate: 0 };

    // Calculate engagement trend
    const engagementChange = tr.previous_engagement > 0
      ? ((tr.current_engagement - tr.previous_engagement) / tr.previous_engagement) * 100
      : 0;
    const engagementTrend = engagementChange > 2 ? 'increasing' : engagementChange < -2 ? 'decreasing' : 'stable';

    // Calculate communication volume trend
    const msgChange = Number(tr.previous_messages) > 0
      ? ((Number(tr.current_messages) - Number(tr.previous_messages)) / Number(tr.previous_messages)) * 100
      : 0;
    const communicationVolume = msgChange > 10 ? 'increasing' : msgChange < -10 ? 'decreasing' : 'stable';

    return {
      overview: {
        totalSchools: Number(ov.total_schools) || 1, // At least tenant's own
        totalLearners: Number(ov.total_learners),
        learnersWithCareTeams: Number(ov.with_care_teams),
        learnersWithActionPlans: Number(ov.with_action_plans),
      },
      engagement: {
        overallEngagementRate: eng.engagement_rate || 0,
        avgResponseTimeHours: eng.avg_response_hours || 0,
        parentParticipationRate: eng.parent_rate || 0,
        teacherParticipationRate: eng.teacher_rate || 0,
      },
      actionPlans: {
        active: Number(ap.active),
        onTrack: Number(ap.on_track),
        needsAttention: Number(ap.needs_attention),
        atRisk: Number(ap.at_risk),
        avgCompletionRate: (ap.avg_progress || 0) / 100,
      },
      trends: {
        engagementTrend,
        engagementChange: Math.round(engagementChange * 10) / 10,
        actionPlanSuccessRate: tr.success_rate || 0,
        communicationVolume,
      },
      // Note: School-level breakdown would require school dimension table
      topPerformingSchools: [],
      areasForImprovement: [],
    };
  });
};
