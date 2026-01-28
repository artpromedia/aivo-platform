/**
 * Mobile Analytics Routes
 *
 * Mobile-friendly API endpoints for learning analytics.
 * Wraps the comprehensive learner analytics with simplified
 * responses optimized for mobile display.
 * 
 * Endpoints:
 * - GET /analytics/learner/summary - Get learning analytics summary
 * - GET /analytics/learner/screens - Get screen analytics
 * - GET /analytics/learner/weekly-trend - Get weekly activity trend
 * - POST /analytics/events/batch - Batch upload analytics events
 */

import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const AnalyticsEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  timestamp: z.string().datetime(),
  properties: z.record(z.unknown()).optional(),
  sessionId: z.string().optional(),
  screenName: z.string().optional(),
  userId: z.string().optional(),
});

const BatchEventsSchema = z.object({
  events: z.array(AnalyticsEventSchema),
});

// ══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

interface LearningAnalytics {
  totalTimeMinutes: number;
  totalActivities: number;
  averageAccuracy: number;
  streakDays: number;
  skillsMastered: number;
  subjectProgress: SubjectProgress[];
  recentActivities: RecentActivity[];
  dailyGoalProgress: DailyGoalProgress;
}

interface SubjectProgress {
  subjectId: string;
  subjectName: string;
  progress: number;
  activitiesCompleted: number;
  timeSpentMinutes: number;
}

interface RecentActivity {
  id: string;
  type: string;
  name: string;
  timestamp: string;
  durationMinutes: number;
  accuracy: number | null;
}

interface DailyGoalProgress {
  targetMinutes: number;
  completedMinutes: number;
  percentageComplete: number;
}

interface ScreenAnalytics {
  screenName: string;
  viewCount: number;
  totalTimeSeconds: number;
  averageTimeSeconds: number;
  lastViewedAt: string;
}

interface DailyAnalytics {
  date: string;
  timeMinutes: number;
  activitiesCompleted: number;
  xpEarned: number;
}

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

function getLearnerId(request: FastifyRequest): string {
  const user = getUser(request);
  // For learner role, use their own ID
  if (user.role === 'learner' && user.learnerId) {
    return user.learnerId;
  }
  // For parent/teacher, they should specify learner ID in query/header
  const learnerIdHeader = request.headers['x-learner-id'] as string;
  if (learnerIdHeader) {
    return learnerIdHeader;
  }
  throw new Error('Learner ID not available');
}

function getDefaultDateRange(): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 28); // Last 4 weeks
  return { startDate, endDate };
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export const mobileAnalyticsRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /analytics/learner/summary
   * 
   * Get learning analytics summary for the current learner
   */
  app.get<{
    Querystring: { startDate?: string; endDate?: string };
  }>(
    '/learner/summary',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUser(request);

      try {
        const learnerId = getLearnerId(request);
        const queryResult = DateRangeSchema.safeParse(request.query);

        let startDate: Date;
        let endDate: Date;

        if (queryResult.success && queryResult.data.startDate && queryResult.data.endDate) {
          startDate = new Date(queryResult.data.startDate);
          endDate = new Date(queryResult.data.endDate);
        } else {
          const range = getDefaultDateRange();
          startDate = range.startDate;
          endDate = range.endDate;
        }

        // TODO: Query actual analytics data from warehouse
        // For now, return mock data
        const analytics: LearningAnalytics = {
          totalTimeMinutes: 320,
          totalActivities: 45,
          averageAccuracy: 0.82,
          streakDays: 7,
          skillsMastered: 12,
          subjectProgress: [
            {
              subjectId: 'math',
              subjectName: 'Mathematics',
              progress: 0.68,
              activitiesCompleted: 15,
              timeSpentMinutes: 120,
            },
            {
              subjectId: 'reading',
              subjectName: 'Reading',
              progress: 0.75,
              activitiesCompleted: 20,
              timeSpentMinutes: 150,
            },
            {
              subjectId: 'science',
              subjectName: 'Science',
              progress: 0.55,
              activitiesCompleted: 10,
              timeSpentMinutes: 50,
            },
          ],
          recentActivities: [
            {
              id: 'act-1',
              type: 'lesson',
              name: 'Fractions Practice',
              timestamp: new Date().toISOString(),
              durationMinutes: 15,
              accuracy: 0.85,
            },
            {
              id: 'act-2',
              type: 'quiz',
              name: 'Reading Comprehension',
              timestamp: new Date(Date.now() - 3600000).toISOString(),
              durationMinutes: 10,
              accuracy: 0.92,
            },
          ],
          dailyGoalProgress: {
            targetMinutes: 30,
            completedMinutes: 25,
            percentageComplete: 0.83,
          },
        };

        return reply.send(analytics);
      } catch (error) {
        app.log.error({ error }, 'Error fetching learning analytics summary');
        return reply.code(500).send({ error: 'Failed to fetch analytics summary' });
      }
    }
  );

  /**
   * GET /analytics/learner/screens
   * 
   * Get screen view analytics
   */
  app.get(
    '/learner/screens',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUser(request);

      try {
        const learnerId = getLearnerId(request);

        // TODO: Query actual screen analytics from database
        // For now, return mock data
        const screens: ScreenAnalytics[] = [
          {
            screenName: 'Dashboard',
            viewCount: 45,
            totalTimeSeconds: 2700,
            averageTimeSeconds: 60,
            lastViewedAt: new Date().toISOString(),
          },
          {
            screenName: 'Lessons',
            viewCount: 38,
            totalTimeSeconds: 5700,
            averageTimeSeconds: 150,
            lastViewedAt: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            screenName: 'Games',
            viewCount: 25,
            totalTimeSeconds: 3000,
            averageTimeSeconds: 120,
            lastViewedAt: new Date(Date.now() - 7200000).toISOString(),
          },
        ];

        return reply.send(screens);
      } catch (error) {
        app.log.error({ error }, 'Error fetching screen analytics');
        return reply.code(500).send({ error: 'Failed to fetch screen analytics' });
      }
    }
  );

  /**
   * GET /analytics/learner/weekly-trend
   * 
   * Get weekly activity trend (daily breakdowns)
   */
  app.get(
    '/learner/weekly-trend',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUser(request);

      try {
        const learnerId = getLearnerId(request);

        // TODO: Query actual daily analytics from warehouse
        // For now, return mock data for last 7 days
        const trend: DailyAnalytics[] = [];
        const now = new Date();

        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          
          trend.push({
            date: date.toISOString().split('T')[0],
            timeMinutes: 20 + Math.floor(Math.random() * 40),
            activitiesCompleted: 3 + Math.floor(Math.random() * 8),
            xpEarned: 50 + Math.floor(Math.random() * 150),
          });
        }

        return reply.send(trend);
      } catch (error) {
        app.log.error({ error }, 'Error fetching weekly trend');
        return reply.code(500).send({ error: 'Failed to fetch weekly trend' });
      }
    }
  );

  /**
   * POST /analytics/events/batch
   * 
   * Batch upload analytics events from mobile app
   */
  app.post<{
    Body: unknown;
  }>(
    '/events/batch',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUser(request);

      try {
        const bodyResult = BatchEventsSchema.safeParse(request.body);
        
        if (!bodyResult.success) {
          return reply.code(400).send({ 
            error: 'Invalid events batch',
            details: bodyResult.error.errors,
          });
        }

        const { events } = bodyResult.data;
        const learnerId = getLearnerId(request);

        // TODO: Store events in analytics warehouse
        // For now, just log them
        app.log.info(
          { learnerId, eventCount: events.length },
          'Received analytics events batch'
        );

        // In production, you would:
        // 1. Validate event schema
        // 2. Enrich events with metadata (tenant, device info, etc.)
        // 3. Write to Kafka/event stream
        // 4. Process in analytics pipeline
        // 5. Update warehouse tables

        return reply.code(200).send({ 
          success: true,
          processed: events.length,
        });
      } catch (error) {
        app.log.error({ error }, 'Error processing analytics events batch');
        return reply.code(500).send({ error: 'Failed to process events' });
      }
    }
  );
};
