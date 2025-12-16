/**
 * Events Routes
 *
 * REST API routes for learning events.
 */

import type { FastifyPluginAsync } from 'fastify';

import { prisma } from '../prisma.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const getEventsQuerySchema = {
  type: 'object',
  properties: {
    tenantId: { type: 'string' },
    userId: { type: 'string' },
    eventType: { type: 'string' },
    eventCategory: { type: 'string' },
    contentId: { type: 'string' },
    sessionId: { type: 'string' },
    startDate: { type: 'string', format: 'date-time' },
    endDate: { type: 'string', format: 'date-time' },
    limit: { type: 'integer', minimum: 1, maximum: 1000, default: 100 },
    offset: { type: 'integer', minimum: 0, default: 0 },
  },
  required: ['tenantId'],
} as const;

const createEventSchema = {
  type: 'object',
  properties: {
    tenantId: { type: 'string' },
    userId: { type: 'string' },
    sessionId: { type: 'string' },
    eventType: { type: 'string' },
    eventCategory: { type: 'string' },
    contentId: { type: 'string' },
    contentType: { type: 'string' },
    subjectId: { type: 'string' },
    topicId: { type: 'string' },
    assessmentId: { type: 'string' },
    questionId: { type: 'string' },
    data: { type: 'object' },
    duration: { type: 'number' },
    score: { type: 'number' },
    deviceType: { type: 'string' },
    platform: { type: 'string' },
    appVersion: { type: 'string' },
    timestamp: { type: 'string', format: 'date-time' },
  },
  required: ['tenantId', 'userId', 'eventType', 'eventCategory'],
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES PLUGIN
// ═══════════════════════════════════════════════════════════════════════════════

const eventsRoutes: FastifyPluginAsync = async (fastify) => {
  // ─────────────────────────────────────────────────────────────────────────────
  // GET EVENTS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /events
   *
   * Query learning events with filters
   */
  fastify.get<{
    Querystring: {
      tenantId: string;
      userId?: string;
      eventType?: string;
      eventCategory?: string;
      contentId?: string;
      sessionId?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    };
  }>(
    '/',
    {
      schema: {
        querystring: getEventsQuerySchema,
      },
    },
    async (request, reply) => {
      const {
        tenantId,
        userId,
        eventType,
        eventCategory,
        contentId,
        sessionId,
        startDate,
        endDate,
        limit = 100,
        offset = 0,
      } = request.query;

      const where = {
        tenantId,
        ...(userId ? { userId } : {}),
        ...(eventType ? { eventType: eventType as any } : {}),
        ...(eventCategory ? { eventCategory: eventCategory as any } : {}),
        ...(contentId ? { contentId } : {}),
        ...(sessionId ? { sessionId } : {}),
        ...(startDate || endDate
          ? {
              timestamp: {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
              },
            }
          : {}),
      };

      const [events, total] = await Promise.all([
        prisma.learningEvent.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.learningEvent.count({ where }),
      ]);

      return {
        success: true,
        data: events,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + events.length < total,
        },
      };
    },
  );

  /**
   * GET /events/:id
   *
   * Get a specific event by ID
   */
  fastify.get<{
    Params: { id: string };
  }>(
    '/:id',
    {
      schema: {
        params: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const event = await prisma.learningEvent.findUnique({
        where: { id },
      });

      if (!event) {
        return reply.status(404).send({
          success: false,
          error: 'Event not found',
        });
      }

      return { success: true, data: event };
    },
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE EVENTS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * POST /events
   *
   * Create a new learning event (for direct ingestion)
   */
  fastify.post<{
    Body: {
      tenantId: string;
      userId: string;
      sessionId?: string;
      eventType: string;
      eventCategory: string;
      contentId?: string;
      contentType?: string;
      subjectId?: string;
      topicId?: string;
      assessmentId?: string;
      questionId?: string;
      data?: Record<string, unknown>;
      duration?: number;
      score?: number;
      deviceType?: string;
      platform?: string;
      appVersion?: string;
      timestamp?: string;
    };
  }>(
    '/',
    {
      schema: {
        body: createEventSchema,
      },
    },
    async (request, reply) => {
      const {
        tenantId,
        userId,
        sessionId,
        eventType,
        eventCategory,
        contentId,
        contentType,
        subjectId,
        topicId,
        assessmentId,
        questionId,
        data,
        duration,
        score,
        deviceType,
        platform,
        appVersion,
        timestamp,
      } = request.body;

      const event = await prisma.learningEvent.create({
        data: {
          tenantId,
          userId,
          sessionId: sessionId ?? null,
          eventType: eventType as any,
          eventCategory: eventCategory as any,
          contentId: contentId ?? null,
          contentType: contentType ?? null,
          subjectId: subjectId ?? null,
          topicId: topicId ?? null,
          assessmentId: assessmentId ?? null,
          questionId: questionId ?? null,
          data: data ?? {},
          duration: duration ?? null,
          score: score ?? null,
          deviceType: deviceType ?? null,
          platform: platform ?? null,
          appVersion: appVersion ?? null,
          timestamp: timestamp ? new Date(timestamp) : new Date(),
          processedAt: new Date(),
        },
      });

      return reply.status(201).send({
        success: true,
        data: event,
      });
    },
  );

  /**
   * POST /events/batch
   *
   * Create multiple learning events in batch
   */
  fastify.post<{
    Body: {
      events: Array<{
        tenantId: string;
        userId: string;
        sessionId?: string;
        eventType: string;
        eventCategory: string;
        contentId?: string;
        contentType?: string;
        subjectId?: string;
        topicId?: string;
        assessmentId?: string;
        questionId?: string;
        data?: Record<string, unknown>;
        duration?: number;
        score?: number;
        deviceType?: string;
        platform?: string;
        appVersion?: string;
        timestamp?: string;
      }>;
    };
  }>(
    '/batch',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            events: {
              type: 'array',
              items: createEventSchema,
              maxItems: 1000,
            },
          },
          required: ['events'],
        },
      },
    },
    async (request, reply) => {
      const { events } = request.body;

      const createdEvents = await prisma.learningEvent.createMany({
        data: events.map((e) => ({
          tenantId: e.tenantId,
          userId: e.userId,
          sessionId: e.sessionId ?? null,
          eventType: e.eventType as any,
          eventCategory: e.eventCategory as any,
          contentId: e.contentId ?? null,
          contentType: e.contentType ?? null,
          subjectId: e.subjectId ?? null,
          topicId: e.topicId ?? null,
          assessmentId: e.assessmentId ?? null,
          questionId: e.questionId ?? null,
          data: e.data ?? {},
          duration: e.duration ?? null,
          score: e.score ?? null,
          deviceType: e.deviceType ?? null,
          platform: e.platform ?? null,
          appVersion: e.appVersion ?? null,
          timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
          processedAt: new Date(),
        })),
      });

      return reply.status(201).send({
        success: true,
        data: {
          created: createdEvents.count,
        },
      });
    },
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // EVENT STATISTICS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /events/stats
   *
   * Get event statistics
   */
  fastify.get<{
    Querystring: {
      tenantId: string;
      startDate?: string;
      endDate?: string;
    };
  }>(
    '/stats',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
          required: ['tenantId'],
        },
      },
    },
    async (request, reply) => {
      const { tenantId, startDate, endDate } = request.query;

      const where = {
        tenantId,
        ...(startDate || endDate
          ? {
              timestamp: {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
              },
            }
          : {}),
      };

      const [totalCount, byType, byCategory] = await Promise.all([
        prisma.learningEvent.count({ where }),
        prisma.learningEvent.groupBy({
          by: ['eventType'],
          where,
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 20,
        }),
        prisma.learningEvent.groupBy({
          by: ['eventCategory'],
          where,
          _count: { id: true },
        }),
      ]) as unknown as [number, { eventType: string; _count: { id: number } }[], { eventCategory: string; _count: { id: number } }[]];

      return {
        success: true,
        data: {
          totalEvents: totalCount,
          byType: byType.map((t: { eventType: string; _count: { id: number } }) => ({
            type: t.eventType,
            count: t._count.id,
          })),
          byCategory: byCategory.map((c: { eventCategory: string; _count: { id: number } }) => ({
            category: c.eventCategory,
            count: c._count.id,
          })),
        },
      };
    },
  );

  /**
   * GET /events/timeline
   *
   * Get event counts over time
   */
  fastify.get<{
    Querystring: {
      tenantId: string;
      userId?: string;
      startDate: string;
      endDate: string;
      interval?: 'hour' | 'day' | 'week';
    };
  }>(
    '/timeline',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            userId: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            interval: { type: 'string', enum: ['hour', 'day', 'week'], default: 'day' },
          },
          required: ['tenantId', 'startDate', 'endDate'],
        },
      },
    },
    async (request, reply) => {
      const { tenantId, userId, startDate, endDate } = request.query;

      // Get events and group by day for now
      // More sophisticated time-series grouping would use raw SQL or aggregation
      const events = await prisma.learningEvent.findMany({
        where: {
          tenantId,
          ...(userId ? { userId } : {}),
          timestamp: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        select: {
          timestamp: true,
          eventCategory: true,
        },
        orderBy: { timestamp: 'asc' },
      });

      // Group by day
      const dailyCounts = new Map<string, { total: number; byCategory: Record<string, number> }>();

      for (const event of events) {
        const day = event.timestamp.toISOString().split('T')[0];

        if (!dailyCounts.has(day)) {
          dailyCounts.set(day, { total: 0, byCategory: {} });
        }

        const dayData = dailyCounts.get(day)!;
        dayData.total++;
        dayData.byCategory[event.eventCategory] = (dayData.byCategory[event.eventCategory] ?? 0) + 1;
      }

      const timeline = Array.from(dailyCounts.entries()).map(([date, data]) => ({
        date,
        ...data,
      }));

      return {
        success: true,
        data: timeline,
      };
    },
  );
};

export default eventsRoutes;
