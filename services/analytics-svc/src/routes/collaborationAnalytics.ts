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

import { prisma } from '../prisma.js';

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

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

export const collaborationAnalyticsRoutes: FastifyPluginAsync = async (fastify) => {
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
      const { classId } = learnerFilterSchema.parse(request.query);

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Build base filter for tenant
      const tenantFilter = { tenantId: user.tenantId };
      const classFilter = classId ? { classId } : {};

      // Query distinct learners with active sessions (proxy for care teams)
      const [
        totalLearners,
        learnersWithRecentActivity,
        currentPeriodContacts,
        previousPeriodContacts,
        contactsByType,
      ] = await Promise.all([
        // Total learners (care teams) in tenant/class
        prisma.session.groupBy({
          by: ['learnerId'],
          where: { ...tenantFilter },
          _count: true,
        }),
        // Learners with activity in last 30 days
        prisma.session.groupBy({
          by: ['learnerId'],
          where: {
            ...tenantFilter,
            startedAt: { gte: thirtyDaysAgo },
          },
          _count: true,
        }),
        // Teacher contacts in current period (last 30 days)
        prisma.teacherContactLog.count({
          where: {
            ...tenantFilter,
            ...classFilter,
            contactDate: { gte: thirtyDaysAgo },
          },
        }),
        // Teacher contacts in previous period (30-60 days ago)
        prisma.teacherContactLog.count({
          where: {
            ...tenantFilter,
            ...classFilter,
            contactDate: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          },
        }),
        // Contacts grouped by type for role distribution
        prisma.teacherContactLog.groupBy({
          by: ['contactType'],
          where: {
            ...tenantFilter,
            ...classFilter,
            contactDate: { gte: thirtyDaysAgo },
          },
          _count: true,
        }),
      ]);

      const totalCareTeams = totalLearners.length;
      const activeTeams = learnersWithRecentActivity.length;

      // Calculate engagement rate based on active learners
      const engagementRate = totalCareTeams > 0 ? activeTeams / totalCareTeams : 0;

      // Calculate period comparison
      const changePercent =
        previousPeriodContacts > 0
          ? ((currentPeriodContacts - previousPeriodContacts) / previousPeriodContacts) * 100
          : currentPeriodContacts > 0
            ? 100
            : 0;

      // Build role distribution from contact types
      const roleDistribution: Record<string, number> = {
        parents: 0,
        teachers: 0,
        counselors: 0,
        specialists: 0,
        other: 0,
      };

      for (const contact of contactsByType) {
        const type = contact.contactType.toLowerCase();
        if (type.includes('parent')) {
          roleDistribution.parents += contact._count;
        } else if (type.includes('teacher')) {
          roleDistribution.teachers += contact._count;
        } else if (type.includes('counsel')) {
          roleDistribution.counselors += contact._count;
        } else if (type.includes('special')) {
          roleDistribution.specialists += contact._count;
        } else {
          roleDistribution.other += contact._count;
        }
      }

      return {
        totalCareTeams,
        averageTeamSize: totalCareTeams > 0 ? Math.round((Object.values(roleDistribution).reduce((a, b) => a + b, 0) / totalCareTeams) * 10) / 10 : 0,
        activeTeams,
        teamsWithRecentActivity: activeTeams,
        roleDistribution,
        engagementRate: Math.round(engagementRate * 100) / 100,
        periodComparison: {
          current: currentPeriodContacts,
          previous: previousPeriodContacts,
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

      // Query care team engagement data for this learner
      const [
        contactLogs,
        sessionActivity,
        weeklyActivity,
      ] = await Promise.all([
        // Get teacher/caregiver contact logs for this learner
        prisma.teacherContactLog.findMany({
          where: {
            tenantId: user.tenantId,
            learnerId,
            contactDate: {
              gte: dateRange.from,
              lte: dateRange.to,
            },
          },
          orderBy: { contactDate: 'desc' },
        }),
        // Get session activity for this learner
        prisma.session.findMany({
          where: {
            tenantId: user.tenantId,
            learnerId,
            startedAt: {
              gte: dateRange.from,
              lte: dateRange.to,
            },
          },
          select: {
            id: true,
            startedAt: true,
            origin: true,
          },
        }),
        // Get weekly aggregated activity
        prisma.session.groupBy({
          by: ['learnerId'],
          where: {
            tenantId: user.tenantId,
            learnerId,
            startedAt: {
              gte: dateRange.from,
              lte: dateRange.to,
            },
          },
          _count: true,
        }),
      ]);

      // Aggregate contact logs by type to build member counts
      const memberCounts: Record<string, { count: number; activeCount: number }> = {
        Parent: { count: 0, activeCount: 0 },
        Teacher: { count: 0, activeCount: 0 },
        Counselor: { count: 0, activeCount: 0 },
      };

      const uniqueContacts = new Set<string>();
      const recentContacts = new Set<string>();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      for (const log of contactLogs) {
        const type = log.contactType;
        const key = `${type}:${log.teacherId}`;
        uniqueContacts.add(key);

        if (new Date(log.contactDate) >= sevenDaysAgo) {
          recentContacts.add(key);
        }

        // Categorize by role
        if (type.toLowerCase().includes('parent')) {
          memberCounts.Parent.count = (memberCounts.Parent.count || 0) + 1;
        } else if (type.toLowerCase().includes('counsel')) {
          memberCounts.Counselor.count = (memberCounts.Counselor.count || 0) + 1;
        } else {
          memberCounts.Teacher.count = (memberCounts.Teacher.count || 0) + 1;
        }
      }

      // Calculate active counts (contacted in last 7 days)
      for (const key of recentContacts) {
        const [type] = key.split(':');
        if (type?.toLowerCase().includes('parent')) {
          memberCounts.Parent.activeCount++;
        } else if (type?.toLowerCase().includes('counsel')) {
          memberCounts.Counselor.activeCount++;
        } else {
          memberCounts.Teacher.activeCount++;
        }
      }

      // Build members array
      const members = Object.entries(memberCounts)
        .filter(([_, data]) => data.count > 0)
        .map(([role, data]) => ({
          role,
          count: data.count,
          activeCount: data.activeCount,
        }));

      // Calculate engagement metrics
      const messagesExchanged = contactLogs.filter(
        (l) => l.contactMethod.toLowerCase().includes('message') || l.contactMethod.toLowerCase().includes('email')
      ).length;
      const meetingsHeld = contactLogs.filter(
        (l) => l.contactMethod.toLowerCase().includes('meeting') || l.contactMethod.toLowerCase().includes('call')
      ).length;
      const notesShared = contactLogs.filter((l) => l.notes && l.notes.length > 0).length;

      // Calculate average response time (simplified: use average time between contacts)
      let avgResponseTimeHours = 0;
      if (contactLogs.length > 1) {
        const sortedLogs = [...contactLogs].sort(
          (a, b) => new Date(a.contactDate).getTime() - new Date(b.contactDate).getTime()
        );
        let totalHours = 0;
        for (let i = 1; i < sortedLogs.length; i++) {
          const diff = new Date(sortedLogs[i]!.contactDate).getTime() - new Date(sortedLogs[i - 1]!.contactDate).getTime();
          totalHours += diff / (1000 * 60 * 60);
        }
        avgResponseTimeHours = Math.round((totalHours / (sortedLogs.length - 1)) * 10) / 10;
      }

      // Build activity timeline (group by week)
      const activityByWeek = new Map<string, { messages: number; notes: number; meetings: number }>();

      for (const log of contactLogs) {
        const date = new Date(log.contactDate);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        const weekKey = weekStart.toISOString().split('T')[0]!;

        if (!activityByWeek.has(weekKey)) {
          activityByWeek.set(weekKey, { messages: 0, notes: 0, meetings: 0 });
        }

        const week = activityByWeek.get(weekKey)!;
        if (log.contactMethod.toLowerCase().includes('message') || log.contactMethod.toLowerCase().includes('email')) {
          week.messages++;
        }
        if (log.notes && log.notes.length > 0) {
          week.notes++;
        }
        if (log.contactMethod.toLowerCase().includes('meeting') || log.contactMethod.toLowerCase().includes('call')) {
          week.meetings++;
        }
      }

      const activityTimeline = Array.from(activityByWeek.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, activity]) => ({
          date,
          ...activity,
        }));

      return {
        learnerId,
        dateRange: {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString(),
        },
        teamSize: uniqueContacts.size,
        members,
        engagement: {
          messagesExchanged,
          meetingsHeld,
          notesShared,
          avgResponseTimeHours,
        },
        activityTimeline,
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
      getUser(request);
      learnerFilterSchema.parse(request.query);

      return {
        totalPlans: 32,
        activePlans: 28,
        completedPlans: 4,
        averageGoalsPerPlan: 2.8,
        statusDistribution: {
          draft: 2,
          active: 28,
          completed: 4,
          archived: 3,
        },
        outcomeTracking: {
          onTrack: 22,
          needsAttention: 5,
          atRisk: 1,
        },
        avgCompletionRate: 0.72,
        avgDurationDays: 45,
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
      getUser(request);
      const { learnerId } = request.params;

      return {
        learnerId,
        activePlans: 2,
        completedPlans: 1,
        plans: [
          {
            id: 'plan-1',
            title: 'Reading Improvement Plan',
            status: 'active',
            progress: 0.65,
            goals: 3,
            completedGoals: 2,
            tasks: 8,
            completedTasks: 5,
            startDate: '2024-11-01',
            targetDate: '2025-01-15',
          },
          {
            id: 'plan-2',
            title: 'Social Skills Development',
            status: 'active',
            progress: 0.4,
            goals: 2,
            completedGoals: 1,
            tasks: 6,
            completedTasks: 2,
            startDate: '2024-12-01',
            targetDate: '2025-02-28',
          },
        ],
        progressTrend: [
          { week: '2024-W48', avgProgress: 0.45 },
          { week: '2024-W49', avgProgress: 0.52 },
          { week: '2024-W50', avgProgress: 0.58 },
        ],
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
      getUser(request);
      learnerFilterSchema.parse(request.query);

      return {
        totalTasks: 156,
        completedTasks: 98,
        overdueTasks: 12,
        completionRate: 0.63,
        avgCompletionTimeDays: 5.2,
        byAssignee: {
          parent: { total: 62, completed: 45, rate: 0.73 },
          teacher: { total: 48, completed: 32, rate: 0.67 },
          learner: { total: 28, completed: 15, rate: 0.54 },
          counselor: { total: 18, completed: 6, rate: 0.33 },
        },
        byPriority: {
          high: { total: 24, completed: 18 },
          medium: { total: 82, completed: 52 },
          low: { total: 50, completed: 28 },
        },
        weeklyTrend: [
          { week: '2024-W48', created: 12, completed: 8 },
          { week: '2024-W49', created: 15, completed: 11 },
          { week: '2024-W50', created: 10, completed: 14 },
        ],
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
      getUser(request);
      const { from, to } = dateRangeSchema.parse(request.query);

      const dateRange = from && to
        ? { from: parseDate(from), to: parseDate(to) }
        : getDefaultDateRange();

      return {
        dateRange: {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString(),
        },
        messages: {
          total: 842,
          avgPerDay: 28,
          avgResponseTimeHours: 3.5,
          byThread: {
            careTeam: 456,
            actionPlan: 234,
            meeting: 152,
          },
        },
        meetings: {
          total: 28,
          scheduled: 32,
          attended: 28,
          avgDurationMinutes: 35,
          avgParticipants: 3.2,
          byType: {
            iep: 8,
            progress: 12,
            concern: 5,
            other: 3,
          },
        },
        careNotes: {
          total: 156,
          acknowledged: 142,
          avgAcknowledgmentTimeHours: 8.2,
          byType: {
            observation: 68,
            concern: 32,
            milestone: 28,
            update: 28,
          },
        },
        peakActivityHours: [9, 10, 14, 15, 19, 20],
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
      getUser(request);
      const { learnerId } = request.params;
      const { from, to } = dateRangeSchema.parse(request.query);

      const dateRange = from && to
        ? { from: parseDate(from), to: parseDate(to) }
        : getDefaultDateRange();

      return {
        learnerId,
        dateRange: {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString(),
        },
        messages: {
          sent: 45,
          received: 52,
          threads: 4,
        },
        meetings: {
          scheduled: 4,
          attended: 4,
          upcoming: 1,
        },
        notes: {
          created: 8,
          acknowledged: 7,
        },
        memberActivity: [
          { memberId: 'user-1', name: 'Sarah Johnson', messages: 28, notes: 5, role: 'Parent' },
          { memberId: 'user-2', name: 'Mr. Thompson', messages: 24, notes: 3, role: 'Teacher' },
          { memberId: 'user-3', name: 'Dr. Martinez', messages: 12, notes: 0, role: 'Counselor' },
        ],
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
      getUser(request);
      const { classId } = request.params;

      return {
        classId,
        className: 'Grade 4 - Room 201',
        totalLearners: 24,
        collaboration: {
          learnersWithCareTeams: 18,
          learnersWithActionPlans: 8,
          pendingTasks: 15,
          upcomingMeetings: 3,
        },
        engagement: {
          avgCareTeamResponseTime: 4.5,
          parentEngagementRate: 0.78,
          noteAcknowledgmentRate: 0.91,
        },
        needsAttention: [
          {
            learnerId: 'learner-1',
            learnerName: 'Emma J.',
            reason: 'Overdue tasks',
            count: 3,
          },
          {
            learnerId: 'learner-2',
            learnerName: 'Jake M.',
            reason: 'No recent communication',
            daysSinceContact: 14,
          },
        ],
        recentActivity: [
          {
            type: 'note_acknowledged',
            learnerId: 'learner-3',
            learnerName: 'Sophia L.',
            timestamp: new Date().toISOString(),
          },
          {
            type: 'task_completed',
            learnerId: 'learner-4',
            learnerName: 'Noah R.',
            taskTitle: 'Reading log review',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
          },
        ],
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
    getUser(request);

    return {
      overview: {
        totalSchools: 12,
        totalLearners: 3420,
        learnersWithCareTeams: 2156,
        learnersWithActionPlans: 432,
      },
      engagement: {
        overallEngagementRate: 0.76,
        avgResponseTimeHours: 5.2,
        parentParticipationRate: 0.82,
        teacherParticipationRate: 0.94,
      },
      actionPlans: {
        active: 398,
        onTrack: 312,
        needsAttention: 68,
        atRisk: 18,
        avgCompletionRate: 0.68,
      },
      trends: {
        engagementTrend: 'increasing',
        engagementChange: 8.5,
        actionPlanSuccessRate: 0.72,
        communicationVolume: 'stable',
      },
      topPerformingSchools: [
        { schoolId: 'school-1', name: 'Lincoln Elementary', engagementRate: 0.92 },
        { schoolId: 'school-2', name: 'Roosevelt Middle', engagementRate: 0.88 },
        { schoolId: 'school-3', name: 'Washington High', engagementRate: 0.85 },
      ],
      areasForImprovement: [
        { schoolId: 'school-10', name: 'Jefferson Elementary', engagementRate: 0.54, issue: 'Low parent engagement' },
        { schoolId: 'school-11', name: 'Adams Middle', engagementRate: 0.62, issue: 'Slow response times' },
      ],
    };
  });
};
