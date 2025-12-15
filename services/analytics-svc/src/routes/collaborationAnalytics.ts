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
      // Validate user and query for future use when real data is available
      getUser(request);
      learnerFilterSchema.parse(request.query);

      // TODO: Query from fact tables when available
      // For now, return mock aggregated data
      return {
        totalCareTeams: 45,
        averageTeamSize: 3.2,
        activeTeams: 42,
        teamsWithRecentActivity: 38,
        roleDistribution: {
          parents: 78,
          teachers: 45,
          counselors: 12,
          specialists: 8,
          other: 5,
        },
        engagementRate: 0.84,
        periodComparison: {
          current: 42,
          previous: 38,
          changePercent: 10.5,
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
      getUser(request);
      const { learnerId } = request.params;
      const { from, to } = dateRangeSchema.parse(request.query);

      const dateRange = from && to
        ? { from: parseDate(from), to: parseDate(to) }
        : getDefaultDateRange();

      // TODO: Query from fact tables when available
      return {
        learnerId,
        dateRange: {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString(),
        },
        teamSize: 4,
        members: [
          { role: 'Parent', count: 2, activeCount: 2 },
          { role: 'Teacher', count: 1, activeCount: 1 },
          { role: 'Counselor', count: 1, activeCount: 1 },
        ],
        engagement: {
          messagesExchanged: 24,
          meetingsHeld: 3,
          notesShared: 12,
          avgResponseTimeHours: 4.2,
        },
        activityTimeline: [
          { date: '2024-12-01', messages: 4, notes: 2, meetings: 0 },
          { date: '2024-12-08', messages: 6, notes: 3, meetings: 1 },
          { date: '2024-12-14', messages: 8, notes: 4, meetings: 1 },
        ],
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
