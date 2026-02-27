import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import type { JwtUser } from '../types/index.js';

const SUBJECT_COLORS: Record<string, string> = {
  MATH: '#3B82F6',
  ELA: '#A855F7',
  SCIENCE: '#22C55E',
  HISTORY: '#F97316',
  CODING: '#06B6D4',
};

const SummaryQuerySchema = z.object({
  learnerId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  days: z.coerce.number().int().min(1).max(90).default(30),
});

const SessionsQuerySchema = z.object({
  learnerId: z.string().uuid(),
  subject: z.enum(['MATH', 'ELA', 'SCIENCE', 'HISTORY', 'CODING']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export async function analyticsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/tutor/analytics/summary
   * Aggregated tutor usage for a parent's children.
   */
  fastify.get(
    '/summary',
    async (request: FastifyRequest<{ Querystring: z.infer<typeof SummaryQuerySchema> }>, reply: FastifyReply) => {
      const query = SummaryQuerySchema.parse(request.query);
      const user = request.user as JwtUser;
      const tenantId = user?.tenantId ?? user?.tenant_id;

      if (!tenantId) {
        return reply.status(401).send({ error: 'Tenant ID required' });
      }

      const startDate = query.startDate
        ? new Date(query.startDate)
        : new Date(Date.now() - query.days * 86400000);
      const endDate = query.endDate ? new Date(query.endDate) : new Date();

      // Build where clause — if learnerId provided, filter; otherwise get all children
      const where: Record<string, unknown> = {
        tenantId,
        startedAt: { gte: startDate, lte: endDate },
      };
      if (query.learnerId) {
        where.learnerId = query.learnerId;
      }

      const sessions = await prisma.tutorSession.findMany({
        where,
        include: {
          persona: true,
          _count: { select: { messages: true } },
        },
        orderBy: { startedAt: 'desc' },
      });

      // Aggregate totals
      const totalSessions = sessions.length;
      const totalMinutes = sessions.reduce((acc, s) => {
        if (s.endedAt && s.startedAt) {
          return acc + (s.endedAt.getTime() - s.startedAt.getTime()) / 60000;
        }
        return acc + (s.totalDurationMs ?? 0) / 60000;
      }, 0);
      const totalMessages = sessions.reduce(
        (acc, s) => acc + (s._count?.messages ?? s.totalMessages ?? 0),
        0,
      );
      const averageSessionMinutes = totalSessions > 0
        ? Math.round((totalMinutes / totalSessions) * 10) / 10
        : 0;

      // Subject breakdown
      const subjectMap: Record<string, { sessions: number; minutes: number; topics: Set<string> }> = {};
      for (const s of sessions) {
        if (!subjectMap[s.subject]) {
          subjectMap[s.subject] = { sessions: 0, minutes: 0, topics: new Set() };
        }
        subjectMap[s.subject].sessions++;
        if (s.endedAt && s.startedAt) {
          subjectMap[s.subject].minutes += (s.endedAt.getTime() - s.startedAt.getTime()) / 60000;
        } else {
          subjectMap[s.subject].minutes += (s.totalDurationMs ?? 0) / 60000;
        }
        if (s.topic) subjectMap[s.subject].topics.add(s.topic);
      }

      const subjectBreakdown = Object.entries(subjectMap).map(([subject, data]) => ({
        subject,
        sessions: data.sessions,
        minutes: Math.round(data.minutes),
        topTopics: [...data.topics].slice(0, 5),
        color: SUBJECT_COLORS[subject] ?? '#6B7280',
      }));

      // Weekly usage (last 8 weeks)
      const weeklyUsage: Array<{ week: string; sessions: number; minutes: number }> = [];
      const eightWeeksAgo = new Date(Date.now() - 56 * 86400000);
      for (let i = 0; i < 8; i++) {
        const weekStart = new Date(eightWeeksAgo.getTime() + i * 7 * 86400000);
        const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
        const weekSessions = sessions.filter(
          (s) => s.startedAt >= weekStart && s.startedAt < weekEnd,
        );
        if (weekSessions.length > 0 || weekStart <= endDate) {
          const mins = weekSessions.reduce((acc, s) => {
            if (s.endedAt && s.startedAt) {
              return acc + (s.endedAt.getTime() - s.startedAt.getTime()) / 60000;
            }
            return acc + (s.totalDurationMs ?? 0) / 60000;
          }, 0);
          weeklyUsage.push({
            week: weekStart.toISOString().split('T')[0],
            sessions: weekSessions.length,
            minutes: Math.round(mins),
          });
        }
      }

      // Per-learner breakdown
      const learnerMap: Record<string, {
        sessions: number;
        minutes: number;
        subjects: Record<string, number>;
        lastSessionAt: Date | null;
      }> = {};

      for (const s of sessions) {
        if (!learnerMap[s.learnerId]) {
          learnerMap[s.learnerId] = {
            sessions: 0,
            minutes: 0,
            subjects: {},
            lastSessionAt: null,
          };
        }
        const learner = learnerMap[s.learnerId];
        learner.sessions++;
        if (s.endedAt && s.startedAt) {
          learner.minutes += (s.endedAt.getTime() - s.startedAt.getTime()) / 60000;
        } else {
          learner.minutes += (s.totalDurationMs ?? 0) / 60000;
        }
        learner.subjects[s.subject] = (learner.subjects[s.subject] ?? 0) + 1;
        if (!learner.lastSessionAt || s.startedAt > learner.lastSessionAt) {
          learner.lastSessionAt = s.startedAt;
        }
      }

      const learners = Object.entries(learnerMap).map(([learnerId, data]) => {
        const favoriteSubject = Object.entries(data.subjects).sort(
          (a, b) => b[1] - a[1],
        )[0]?.[0] ?? null;
        return {
          learnerId,
          totalSessions: data.sessions,
          totalMinutes: Math.round(data.minutes),
          favoriteSubject,
          lastSessionAt: data.lastSessionAt?.toISOString() ?? null,
        };
      });

      return {
        totalSessions,
        totalMinutes: Math.round(totalMinutes),
        totalMessages,
        averageSessionMinutes,
        subjectBreakdown,
        weeklyUsage,
        learners,
      };
    },
  );

  /**
   * GET /api/v1/tutor/analytics/sessions
   * Paginated session list for a learner with summaries.
   */
  fastify.get(
    '/sessions',
    async (request: FastifyRequest<{ Querystring: z.infer<typeof SessionsQuerySchema> }>, reply: FastifyReply) => {
      const query = SessionsQuerySchema.parse(request.query);
      const user = request.user as JwtUser;
      const tenantId = user?.tenantId ?? user?.tenant_id;

      if (!tenantId) {
        return reply.status(401).send({ error: 'Tenant ID required' });
      }

      const where: Record<string, unknown> = {
        tenantId,
        learnerId: query.learnerId,
      };
      if (query.subject) {
        where.subject = query.subject;
      }

      const [sessions, total] = await Promise.all([
        prisma.tutorSession.findMany({
          where,
          include: {
            persona: true,
            _count: { select: { messages: true } },
          },
          orderBy: { startedAt: 'desc' },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        prisma.tutorSession.count({ where }),
      ]);

      return {
        sessions: sessions.map((s) => {
          const durationMinutes = s.endedAt && s.startedAt
            ? Math.round((s.endedAt.getTime() - s.startedAt.getTime()) / 60000)
            : Math.round((s.totalDurationMs ?? 0) / 60000);

          return {
            id: s.id,
            subject: s.subject,
            persona: {
              name: s.persona.name,
              slug: s.persona.slug,
              avatar: s.persona.avatarStaticImage,
            },
            topic: s.topic,
            startedAt: s.startedAt.toISOString(),
            endedAt: s.endedAt?.toISOString() ?? null,
            durationMinutes,
            messageCount: s._count?.messages ?? s.totalMessages ?? 0,
            locale: s.locale,
            status: s.status,
            color: SUBJECT_COLORS[s.subject] ?? '#6B7280',
          };
        }),
        total,
        page: query.page,
        pageSize: query.pageSize,
        totalPages: Math.ceil(total / query.pageSize),
      };
    },
  );

  /**
   * GET /api/v1/tutor/analytics/sessions/:sessionId/transcript
   * Full message transcript for parent review.
   */
  fastify.get(
    '/sessions/:sessionId/transcript',
    async (request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) => {
      const { sessionId } = request.params;
      const user = request.user as JwtUser;
      const tenantId = user?.tenantId ?? user?.tenant_id;

      if (!tenantId) {
        return reply.status(401).send({ error: 'Tenant ID required' });
      }

      const session = await prisma.tutorSession.findFirst({
        where: { id: sessionId, tenantId },
        include: { persona: true },
      });

      if (!session) {
        return reply.status(404).send({ error: 'Session not found' });
      }

      const messages = await prisma.tutorMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          role: true,
          content: true,
          emotionTag: true,
          createdAt: true,
        },
      });

      const durationMinutes = session.endedAt && session.startedAt
        ? Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 60000)
        : Math.round((session.totalDurationMs ?? 0) / 60000);

      return {
        session: {
          id: session.id,
          subject: session.subject,
          topic: session.topic,
          persona: {
            name: session.persona.name,
            slug: session.persona.slug,
            avatar: session.persona.avatarStaticImage,
          },
          startedAt: session.startedAt.toISOString(),
          endedAt: session.endedAt?.toISOString() ?? null,
          durationMinutes,
          locale: session.locale,
        },
        messages: messages
          .filter((m) => m.role !== 'SYSTEM')
          .map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            emotion: m.emotionTag,
            createdAt: m.createdAt.toISOString(),
          })),
      };
    },
  );

  /**
   * Legacy route — kept for backward compatibility with existing sessions page.
   * GET /api/v1/tutor/analytics
   */
  fastify.get(
    '/',
    async (request: FastifyRequest<{ Querystring: { learnerId: string; days?: string } }>, reply: FastifyReply) => {
      const learnerId = request.query.learnerId;
      const days = parseInt(request.query.days ?? '30', 10) || 30;
      const user = request.user as JwtUser;
      const tenantId = user?.tenantId ?? user?.tenant_id;

      if (!tenantId) {
        return reply.status(401).send({ error: 'Tenant ID required' });
      }

      const since = new Date();
      since.setDate(since.getDate() - days);

      const sessions = await prisma.tutorSession.findMany({
        where: {
          tenantId,
          ...(learnerId && learnerId !== 'demo' ? { learnerId } : {}),
          startedAt: { gte: since },
        },
        include: {
          persona: true,
          _count: { select: { messages: true } },
        },
        orderBy: { startedAt: 'desc' },
      });

      const totalSessions = sessions.length;
      const totalMinutes = sessions.reduce((acc, s) => {
        if (s.endedAt && s.startedAt) {
          return acc + (s.endedAt.getTime() - s.startedAt.getTime()) / 60000;
        }
        return acc + (s.totalDurationMs ?? 0) / 60000;
      }, 0);
      const totalMessages = sessions.reduce(
        (acc, s) => acc + (s._count?.messages ?? s.totalMessages ?? 0),
        0,
      );

      const bySubject = sessions.reduce(
        (acc, s) => {
          const key = s.subject;
          if (!acc[key]) {
            acc[key] = { sessions: 0, totalMinutes: 0, messages: 0 };
          }
          acc[key].sessions++;
          if (s.endedAt && s.startedAt) {
            acc[key].totalMinutes += (s.endedAt.getTime() - s.startedAt.getTime()) / 60000;
          } else {
            acc[key].totalMinutes += (s.totalDurationMs ?? 0) / 60000;
          }
          acc[key].messages += s._count?.messages ?? s.totalMessages ?? 0;
          return acc;
        },
        {} as Record<string, { sessions: number; totalMinutes: number; messages: number }>,
      );

      return {
        learnerId: learnerId ?? null,
        period: { days, since: since.toISOString() },
        summary: {
          totalSessions,
          totalMinutes: Math.round(totalMinutes * 10) / 10,
          totalMessages,
          averageSessionMinutes:
            totalSessions > 0 ? Math.round((totalMinutes / totalSessions) * 10) / 10 : 0,
        },
        bySubject,
        recentSessions: sessions.slice(0, 10).map((s) => ({
          id: s.id,
          subject: s.subject,
          topic: s.topic,
          persona: s.persona.name,
          status: s.status,
          startedAt: s.startedAt.toISOString(),
          endedAt: s.endedAt?.toISOString() ?? null,
          totalMinutes: s.endedAt && s.startedAt
            ? Math.round((s.endedAt.getTime() - s.startedAt.getTime()) / 60000 * 10) / 10
            : Math.round((s.totalDurationMs ?? 0) / 60000 * 10) / 10,
          messageCount: s._count?.messages ?? s.totalMessages ?? 0,
        })),
      };
    },
  );
}
