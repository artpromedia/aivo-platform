/**
 * Audit Events API Routes
 *
 * Provides endpoints for accessing and querying audit trails:
 * - Learner difficulty changes
 * - Today Plan changes
 * - Policy document updates
 *
 * Used by:
 * - District Admin: Learner-specific audit timeline
 * - Platform Admin: Cross-tenant policy audit
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const learnerParamsSchema = z.object({
  learnerId: z.string().uuid(),
});

const entityParamsSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
});

const auditEventIdSchema = z.object({
  id: z.string().uuid(),
});

const listQuerySchema = z.object({
  entityType: z.string().optional(),
  actorType: z.enum(['USER', 'SYSTEM', 'AGENT']).optional(),
  action: z.enum(['CREATED', 'UPDATED', 'DELETED', 'ACTIVATED', 'DEACTIVATED']).optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const policyAuditQuerySchema = z.object({
  tenantId: z.string().uuid().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface AuthenticatedUser {
  sub: string;
  tenantId: string;
  role: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function formatAuditEvent(event: {
  id: string;
  tenantId: string;
  actorType: string;
  actorId: string | null;
  actorDisplayName: string | null;
  entityType: string;
  entityId: string;
  entityDisplayName: string | null;
  action: string;
  changeJson: unknown;
  summary: string;
  reason: string | null;
  relatedExplanationId: string | null;
  sessionId: string | null;
  learnerId: string | null;
  createdAt: Date;
}) {
  return {
    id: event.id,
    tenantId: event.tenantId,
    actorType: event.actorType,
    actorId: event.actorId,
    actorDisplayName: event.actorDisplayName,
    entityType: event.entityType,
    entityId: event.entityId,
    entityDisplayName: event.entityDisplayName,
    action: event.action,
    changeJson: event.changeJson,
    summary: event.summary,
    reason: event.reason,
    relatedExplanationId: event.relatedExplanationId,
    sessionId: event.sessionId,
    learnerId: event.learnerId,
    createdAt: event.createdAt.toISOString(),
  };
}

function formatAuditEventSummary(event: {
  id: string;
  actorType: string;
  actorDisplayName: string | null;
  entityType: string;
  entityDisplayName: string | null;
  action: string;
  summary: string;
  relatedExplanationId: string | null;
  createdAt: Date;
}) {
  return {
    id: event.id,
    actorType: event.actorType,
    actorDisplayName: event.actorDisplayName,
    entityType: event.entityType,
    entityDisplayName: event.entityDisplayName,
    action: event.action,
    summary: event.summary,
    relatedExplanationId: event.relatedExplanationId,
    createdAt: event.createdAt.toISOString(),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export const auditRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /audit/learner/:learnerId
   *
   * Get audit timeline for a specific learner.
   * Shows difficulty changes, plan changes, and other learner-specific events.
   *
   * Used by District Admin to answer:
   * "What changed for this learner's plan in the last 7 days?"
   */
  fastify.get(
    '/learner/:learnerId',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof learnerParamsSchema>;
        Querystring: z.infer<typeof listQuerySchema>;
      }>,
      reply
    ) => {
      const user = request.user as AuthenticatedUser | undefined;

      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const params = learnerParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: 'Invalid learner ID' });
      }

      const query = listQuerySchema.safeParse(request.query);
      if (!query.success) {
        return reply.code(400).send({ error: 'Invalid query parameters', details: query.error.issues });
      }

      const { learnerId } = params.data;
      const { entityType, actorType, action, fromDate, toDate, limit, offset } = query.data;

      // Build where clause
      const where: Record<string, unknown> = {
        tenantId: user.tenantId,
        learnerId,
      };

      if (entityType) where.entityType = entityType;
      if (actorType) where.actorType = actorType;
      if (action) where.action = action;
      if (fromDate || toDate) {
        where.createdAt = {
          ...(fromDate && { gte: new Date(fromDate) }),
          ...(toDate && { lte: new Date(toDate) }),
        };
      }

      const [events, total] = await Promise.all([
        prisma.auditEvent.findMany({
          where,
          select: {
            id: true,
            actorType: true,
            actorDisplayName: true,
            entityType: true,
            entityDisplayName: true,
            action: true,
            summary: true,
            relatedExplanationId: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.auditEvent.count({ where }),
      ]);

      return {
        learnerId,
        events: events.map(formatAuditEventSummary),
        total,
      };
    }
  );

  /**
   * GET /audit/entity/:entityType/:entityId
   *
   * Get audit history for a specific entity.
   */
  fastify.get(
    '/entity/:entityType/:entityId',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof entityParamsSchema>;
        Querystring: z.infer<typeof listQuerySchema>;
      }>,
      reply
    ) => {
      const user = request.user as AuthenticatedUser | undefined;

      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const params = entityParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: 'Invalid entity parameters' });
      }

      const query = listQuerySchema.safeParse(request.query);
      if (!query.success) {
        return reply.code(400).send({ error: 'Invalid query parameters' });
      }

      const { entityType, entityId } = params.data;
      const { actorType, action, fromDate, toDate, limit, offset } = query.data;

      // Build where clause
      const where: Record<string, unknown> = {
        tenantId: user.tenantId,
        entityType,
        entityId,
      };

      if (actorType) where.actorType = actorType;
      if (action) where.action = action;
      if (fromDate || toDate) {
        where.createdAt = {
          ...(fromDate && { gte: new Date(fromDate) }),
          ...(toDate && { lte: new Date(toDate) }),
        };
      }

      const [events, total] = await Promise.all([
        prisma.auditEvent.findMany({
          where,
          select: {
            id: true,
            actorType: true,
            actorDisplayName: true,
            entityType: true,
            entityDisplayName: true,
            action: true,
            summary: true,
            relatedExplanationId: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.auditEvent.count({ where }),
      ]);

      return {
        entityType,
        entityId,
        events: events.map(formatAuditEventSummary),
        total,
      };
    }
  );

  /**
   * GET /audit/event/:id
   *
   * Get full details of a single audit event.
   */
  fastify.get(
    '/event/:id',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof auditEventIdSchema>;
      }>,
      reply
    ) => {
      const user = request.user as AuthenticatedUser | undefined;

      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const params = auditEventIdSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: 'Invalid event ID' });
      }

      const event = await prisma.auditEvent.findUnique({
        where: { id: params.data.id },
      });

      if (!event) {
        return reply.code(404).send({ error: 'Audit event not found' });
      }

      // Check tenant access (platform admin can see all)
      if (event.tenantId !== user.tenantId && !['PLATFORM_ADMIN', 'SUPPORT'].includes(user.role)) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      return { event: formatAuditEvent(event) };
    }
  );

  /**
   * GET /audit/policies
   *
   * Get policy change audit trail across tenants.
   * Platform Admin only.
   */
  fastify.get(
    '/policies',
    async (
      request: FastifyRequest<{
        Querystring: z.infer<typeof policyAuditQuerySchema>;
      }>,
      reply
    ) => {
      const user = request.user as AuthenticatedUser | undefined;

      if (!user || !['PLATFORM_ADMIN', 'SUPPORT'].includes(user.role)) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const query = policyAuditQuerySchema.safeParse(request.query);
      if (!query.success) {
        return reply.code(400).send({ error: 'Invalid query parameters' });
      }

      const { tenantId, fromDate, toDate, limit, offset } = query.data;

      // Build where clause
      const where: Record<string, unknown> = {
        entityType: 'POLICY_DOCUMENT',
      };

      if (tenantId) where.tenantId = tenantId;
      if (fromDate || toDate) {
        where.createdAt = {
          ...(fromDate && { gte: new Date(fromDate) }),
          ...(toDate && { lte: new Date(toDate) }),
        };
      }

      const [events, total] = await Promise.all([
        prisma.auditEvent.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.auditEvent.count({ where }),
      ]);

      return {
        events: events.map(formatAuditEvent),
        total,
      };
    }
  );

  /**
   * GET /audit/tenant/:tenantId
   *
   * Get all audit events for a tenant.
   * Platform Admin only (or own tenant for district admin).
   */
  fastify.get(
    '/tenant/:tenantId',
    async (
      request: FastifyRequest<{
        Params: { tenantId: string };
        Querystring: z.infer<typeof listQuerySchema>;
      }>,
      reply
    ) => {
      const user = request.user as AuthenticatedUser | undefined;

      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const tenantId = request.params.tenantId;

      // Check access
      if (tenantId !== user.tenantId && !['PLATFORM_ADMIN', 'SUPPORT'].includes(user.role)) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const query = listQuerySchema.safeParse(request.query);
      if (!query.success) {
        return reply.code(400).send({ error: 'Invalid query parameters' });
      }

      const { entityType, actorType, action, fromDate, toDate, limit, offset } = query.data;

      // Build where clause
      const where: Record<string, unknown> = { tenantId };

      if (entityType) where.entityType = entityType;
      if (actorType) where.actorType = actorType;
      if (action) where.action = action;
      if (fromDate || toDate) {
        where.createdAt = {
          ...(fromDate && { gte: new Date(fromDate) }),
          ...(toDate && { lte: new Date(toDate) }),
        };
      }

      const [events, total] = await Promise.all([
        prisma.auditEvent.findMany({
          where,
          select: {
            id: true,
            actorType: true,
            actorDisplayName: true,
            entityType: true,
            entityDisplayName: true,
            action: true,
            summary: true,
            relatedExplanationId: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.auditEvent.count({ where }),
      ]);

      return {
        tenantId,
        events: events.map(formatAuditEventSummary),
        total,
      };
    }
  );
};
