import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import type { JwtUser } from '../types/index.js';

const AnalyticsQuerySchema = z.object({
  learnerId: z.string().uuid(),
  days: z.coerce.number().int().min(1).max(90).default(30),
});

export async function analyticsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/tutor/analytics
   * Get tutor session analytics for a learner (parent-facing)
   */
  fastify.get(
    '/',
    async (request: FastifyRequest<{ Querystring: z.infer<typeof AnalyticsQuerySchema> }>, reply: FastifyReply) => {
      const query = AnalyticsQuerySchema.parse(request.query);
      const user = request.user as JwtUser;
      const tenantId = user?.tenantId ?? user?.tenant_id;

      if (!tenantId) {
        return reply.status(401).send({ error: 'Tenant ID required' });
      }

      const since = new Date();
      since.setDate(since.getDate() - query.days);

      const sessions = await prisma.tutorSession.findMany({
        where: {
          tenantId,
          learnerId: query.learnerId,
          startedAt: { gte: since },
        },
        include: {
          persona: true,
          analytics: true,
        },
        orderBy: { startedAt: 'desc' },
      });

      // Aggregate stats
      const totalSessions = sessions.length;
      const totalMinutes = sessions.reduce(
        (acc, s) => acc + (s.analytics?.totalMinutes ?? 0),
        0,
      );
      const totalMessages = sessions.reduce(
        (acc, s) => acc + (s.analytics?.messageCount ?? 0),
        0,
      );

      // Group by subject
      const bySubject = sessions.reduce(
        (acc, s) => {
          const key = s.subject;
          if (!acc[key]) {
            acc[key] = { sessions: 0, totalMinutes: 0, messages: 0 };
          }
          acc[key].sessions++;
          acc[key].totalMinutes += s.analytics?.totalMinutes ?? 0;
          acc[key].messages += s.analytics?.messageCount ?? 0;
          return acc;
        },
        {} as Record<string, { sessions: number; totalMinutes: number; messages: number }>,
      );

      return {
        learnerId: query.learnerId,
        period: { days: query.days, since: since.toISOString() },
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
          totalMinutes: s.analytics?.totalMinutes ?? 0,
          messageCount: s.analytics?.messageCount ?? 0,
        })),
      };
    },
  );
}
