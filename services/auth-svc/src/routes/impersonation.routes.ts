/**
 * Impersonation Routes
 *
 * REST API for admin impersonation support:
 *   POST   /impersonate              – start an impersonation session
 *   GET    /impersonate/sessions      – list active sessions
 *   GET    /impersonate/sessions/:id  – get a specific session
 *   POST   /impersonate/sessions/:id/revoke – revoke a session
 *   GET    /impersonate/history       – session history (paginated)
 *   GET    /impersonate/search-users  – search users for impersonation
 *   GET    /impersonate/validate/:id  – validate an active session
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { verifyToken } from '../lib/jwt.js';
import { prisma } from '../prisma.js';
import {
  createImpersonationService,
  ImpersonationError,
} from '../services/impersonation.service.js';

const AUDIT_SVC_URL = process.env.AUDIT_SVC_URL ?? 'http://localhost:4050';

// ============================================================================
// Validation Schemas
// ============================================================================

const startImpersonationSchema = z.object({
  targetUserId: z.string().uuid('Invalid target user ID'),
  targetTenantId: z.string().uuid('Invalid target tenant ID'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  durationMinutes: z.number().int().min(1).max(60).default(30),
  readOnly: z.boolean().default(true),
});

const revokeSchema = z.object({
  reason: z.string().optional(),
});

const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  adminUserId: z.string().uuid().optional(),
  targetUserId: z.string().uuid().optional(),
  targetTenantId: z.string().uuid().optional(),
});

const searchUsersSchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ============================================================================
// Helpers
// ============================================================================

async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<{ userId: string; roles: string[] }> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    reply.status(401).send({ error: 'Authorization required' });
    throw new Error('Unauthorized');
  }

  const token = authHeader.substring(7);
  try {
    const payload = await verifyToken(token);
    return { userId: payload.sub, roles: payload.roles };
  } catch {
    reply.status(401).send({ error: 'Invalid token' });
    throw new Error('Invalid token');
  }
}

function requireImpersonationRole(roles: string[]): void {
  const allowed = roles.some(
    (r) => r === 'PLATFORM_ADMIN' || r === 'SUPPORT',
  );
  if (!allowed) {
    throw new ImpersonationError(
      'Insufficient permissions',
      'INSUFFICIENT_PERMISSIONS',
    );
  }
}

/** Fire-and-forget audit log for impersonation events */
function emitAuditLog(params: {
  eventType: string;
  action: string;
  description: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'DENIED';
  severity?: string;
  actorId?: string;
  actorRoles?: string[];
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, unknown>;
  request?: FastifyRequest;
}): void {
  void fetch(`${AUDIT_SVC_URL}/audit/logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-service-name': 'auth-svc',
    },
    body: JSON.stringify({
      eventType: params.eventType,
      category: 'SECURITY',
      severity: params.severity ?? 'NOTICE',
      action: params.action,
      description: params.description,
      outcome: params.outcome,
      actorId: params.actorId,
      actorType: 'USER',
      actorRoles: params.actorRoles ?? [],
      actorIpAddress: params.request?.ip,
      actorUserAgent: params.request?.headers['user-agent'],
      targetId: params.targetId,
      targetType: params.targetType ?? 'USER',
      sourceService: 'auth-svc',
      metadata: params.metadata ?? {},
      purpose: 'admin_impersonation_support',
      dataAccessed: ['user_session', 'user_identity'],
    }),
  }).catch(() => {});
}

// ============================================================================
// Route Registration
// ============================================================================

export async function registerImpersonationRoutes(fastify: FastifyInstance) {
  const service = createImpersonationService(prisma);

  // ----- POST /impersonate – Start an impersonation session -----
  fastify.post(
    '/impersonate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      requireImpersonationRole(auth.roles);

      const body = startImpersonationSchema.parse(request.body);

      try {
        const session = await service.startSession({
          adminUserId: auth.userId,
          targetUserId: body.targetUserId,
          targetTenantId: body.targetTenantId,
          reason: body.reason,
          durationMinutes: body.durationMinutes,
          readOnly: body.readOnly,
          adminIpAddress:
            request.ip ||
            request.headers['x-forwarded-for']?.toString(),
          adminUserAgent: request.headers['user-agent'],
        });

        emitAuditLog({
          eventType: 'IMPERSONATION_SESSION_STARTED',
          action: 'IMPERSONATE_USER',
          description: `Admin ${auth.userId} started impersonation session for user ${body.targetUserId} (reason: ${body.reason})`,
          outcome: 'SUCCESS',
          severity: 'WARNING',
          actorId: auth.userId,
          actorRoles: auth.roles,
          targetId: body.targetUserId,
          metadata: {
            sessionId: session.id,
            targetTenantId: body.targetTenantId,
            readOnly: body.readOnly,
            durationMinutes: body.durationMinutes,
            reason: body.reason,
          },
          request,
        });

        return reply.status(201).send({
          id: session.id,
          token: session.token,
          expiresAt: session.expiresAt,
          readOnly: session.readOnly,
          targetUserId: session.targetUserId,
          targetTenantId: session.targetTenantId,
        });
      } catch (err) {
        if (err instanceof ImpersonationError) {
          return reply.status(400).send({
            error: err.message,
            code: err.code,
          });
        }
        throw err;
      }
    },
  );

  // ----- GET /impersonate/sessions – List active sessions -----
  fastify.get(
    '/impersonate/sessions',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      requireImpersonationRole(auth.roles);

      const sessions = await service.listActiveSessions();
      return reply.send({ sessions });
    },
  );

  // ----- GET /impersonate/sessions/:id – Get session details -----
  fastify.get(
    '/impersonate/sessions/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      const auth = await requireAuth(request, reply);
      requireImpersonationRole(auth.roles);

      const session = await service.getSession(request.params.id);
      if (!session) {
        return reply.status(404).send({ error: 'Session not found' });
      }

      return reply.send(session);
    },
  );

  // ----- POST /impersonate/sessions/:id/revoke – Revoke a session -----
  fastify.post(
    '/impersonate/sessions/:id/revoke',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      const auth = await requireAuth(request, reply);
      requireImpersonationRole(auth.roles);

      const body = revokeSchema.parse(request.body ?? {});

      try {
        await service.revokeSession(
          request.params.id,
          auth.userId,
          body.reason,
        );

        emitAuditLog({
          eventType: 'IMPERSONATION_SESSION_REVOKED',
          action: 'REVOKE_IMPERSONATION',
          description: `Admin ${auth.userId} revoked impersonation session ${request.params.id}`,
          outcome: 'SUCCESS',
          severity: 'NOTICE',
          actorId: auth.userId,
          actorRoles: auth.roles,
          metadata: {
            sessionId: request.params.id,
            revokeReason: body.reason,
          },
          request,
        });

        return reply.send({ success: true });
      } catch (err) {
        if (err instanceof ImpersonationError) {
          return reply.status(400).send({
            error: err.message,
            code: err.code,
          });
        }
        throw err;
      }
    },
  );

  // ----- GET /impersonate/history – Session history (paginated) -----
  fastify.get(
    '/impersonate/history',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      requireImpersonationRole(auth.roles);

      const query = historyQuerySchema.parse(request.query);
      const result = await service.listSessionHistory(query);

      return reply.send({
        sessions: result.sessions,
        total: result.total,
        page: query.page,
        pageSize: query.pageSize,
      });
    },
  );

  // ----- GET /impersonate/search-users – Search users for impersonation -----
  fastify.get(
    '/impersonate/search-users',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      requireImpersonationRole(auth.roles);

      const query = searchUsersSchema.parse(request.query);
      const users = await service.searchUsers(query.q, query.limit);

      return reply.send({ users });
    },
  );

  // ----- GET /impersonate/validate/:id – Validate a session (used by middleware) -----
  fastify.get(
    '/impersonate/validate/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      // This endpoint can be called by internal services with a valid token
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Authorization required' });
      }

      const result = await service.validateSession(request.params.id);
      return reply.send(result);
    },
  );

  // ----- GET /impersonate/my-history – User's own impersonation history (privacy) -----
  fastify.get(
    '/impersonate/my-history',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);

      const query = z
        .object({
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(20),
        })
        .parse(request.query);

      const result = await service.getUserImpersonationHistory(
        auth.userId,
        query.page,
        query.pageSize,
      );

      return reply.send({
        sessions: result.sessions,
        total: result.total,
        page: query.page,
        pageSize: query.pageSize,
      });
    },
  );
}
