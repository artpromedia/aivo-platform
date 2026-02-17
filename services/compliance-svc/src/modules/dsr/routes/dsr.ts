/**
 * DSR Routes v1
 *
 * Core Data Subject Request routes for parents and admins.
 * Backward-compatible with original dsr-svc /requests endpoints.
 *
 * Ported from services/dsr-svc during Sprint-2 consolidation.
 */

import { Role, requireRole, type AuthContext } from '@aivo/ts-rbac';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { getPool } from '../../shared/db.js';
import { deidentifyLearner, DeleteError } from '../deleter.js';
import { buildExportBundle, ExportError } from '../exporter.js';
import {
  assertParentOwnsLearner,
  createDsrRequest,
  getDsrRequestById,
  getDsrRequestForUser,
  listDsrRequestsForUser,
  listDsrRequestsForTenant,
  listDsrRequestsByStatus,
  approveDsrRequest,
  rejectDsrRequest,
  markDeclined,
  updateRequestStatus,
} from '../repository.js';
import type { DsrRequest, DsrRequestType, DsrRequestStatus } from '../types.js';

// ════════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ════════════════════════════════════════════════════════════════════════════════

const createBodySchema = z.object({
  learnerId: z.string(),
  requestType: z.enum(['EXPORT', 'DELETE']),
  reason: z.string().max(2000).optional(),
});

const patchBodySchema = z.object({
  status: z.enum(['REJECTED']),
  reason: z.string().min(1).max(2000),
});

const adminPatchBodySchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().max(2000).optional(),
});

const adminQuerySchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'FAILED']).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

const statsQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
});

// ════════════════════════════════════════════════════════════════════════════════
// PLUGIN
// ════════════════════════════════════════════════════════════════════════════════

export const registerDsrRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const pool = getPool();

  async function ensureOwnership(tenantId: string, parentId: string, learnerId: string) {
    return assertParentOwnsLearner(pool, tenantId, parentId, learnerId);
  }

  async function handleExport(requestRecord: DsrRequest, auth: AuthContext, reply: any) {
    try {
      const bundle = await buildExportBundle(pool, {
        tenantId: auth.tenantId,
        parentId: auth.userId,
        learnerId: requestRecord.learner_id,
        requestId: requestRecord.id,
      });
      const serialized = JSON.stringify(bundle);
      const completed = await updateRequestStatus(
        pool,
        requestRecord.id,
        auth.tenantId,
        'COMPLETED',
        {
          resultUri: serialized,
          completed: true,
        },
      );
      reply.code(201).send({ request: completed, export: bundle });
    } catch (err) {
      if (err instanceof ExportError) {
        const declined = await markDeclined(pool, requestRecord.id, auth.tenantId, err.message);
        reply.code(400).send({ error: err.message, request: declined });
        return;
      }
      throw err;
    }
  }

  async function handleDelete(requestRecord: DsrRequest, auth: AuthContext, reply: any) {
    try {
      await deidentifyLearner(pool, {
        tenantId: auth.tenantId,
        parentId: auth.userId,
        learnerId: requestRecord.learner_id,
      });
      const completed = await updateRequestStatus(
        pool,
        requestRecord.id,
        auth.tenantId,
        'COMPLETED',
        { completed: true },
      );
      reply.code(201).send({ request: completed });
    } catch (err) {
      if (err instanceof DeleteError) {
        const declined = await markDeclined(pool, requestRecord.id, auth.tenantId, err.message);
        reply.code(400).send({ error: err.message, request: declined });
        return;
      }
      throw err;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // PARENT ENDPOINTS
  // ──────────────────────────────────────────────────────────────────────────────

  fastify.get('/requests', { preHandler: requireRole([Role.PARENT]) }, async (request, reply) => {
    const auth = (request as any).auth as AuthContext;
    const requests = await listDsrRequestsForUser(pool, auth.tenantId, auth.userId);
    reply.code(200).send({ requests });
  });

  fastify.post('/requests', { preHandler: requireRole([Role.PARENT]) }, async (request, reply) => {
    const parsed = createBodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'Invalid payload' });
      return;
    }
    const auth = (request as any).auth as AuthContext;

    const owns = await ensureOwnership(auth.tenantId, auth.userId, parsed.data.learnerId);
    if (!owns) {
      reply.code(403).send({ error: 'Parent does not own learner' });
      return;
    }

    const record = await createDsrRequest(pool, {
      tenantId: auth.tenantId,
      requestedByUserId: auth.userId,
      learnerId: parsed.data.learnerId,
      requestType: parsed.data.requestType as DsrRequestType,
      reason: parsed.data.reason ?? null,
    });

    const inProgress = await updateRequestStatus(pool, record.id, auth.tenantId, 'IN_PROGRESS');

    if (parsed.data.requestType === 'EXPORT') {
      return handleExport(inProgress, auth, reply);
    }
    return handleDelete(inProgress, auth, reply);
  });

  fastify.get(
    '/requests/:id',
    { preHandler: requireRole([Role.PARENT]) },
    async (request, reply) => {
      const auth = (request as any).auth as AuthContext;
      const { id } = request.params as { id: string };
      const record = await getDsrRequestForUser(pool, id, auth.tenantId, auth.userId);
      if (!record) {
        reply.code(404).send({ error: 'Request not found' });
        return;
      }
      let exportPayload: unknown = undefined;
      if (record.request_type === 'EXPORT' && record.export_location) {
        try {
          exportPayload = JSON.parse(record.export_location);
        } catch {
          exportPayload = null;
        }
      }
      reply.code(200).send({ request: record, export: exportPayload });
    },
  );

  fastify.patch(
    '/requests/:id',
    { preHandler: requireRole([Role.PLATFORM_ADMIN, Role.SUPPORT]) },
    async (request, reply) => {
      const auth = (request as any).auth as AuthContext;
      const { id } = request.params as { id: string };
      const parsed = patchBodySchema.safeParse(request.body);
      if (!parsed.success) {
        reply.code(400).send({ error: 'Invalid payload' });
        return;
      }
      const record = await getDsrRequestById(pool, id, auth.tenantId);
      if (!record) {
        reply.code(404).send({ error: 'Request not found' });
        return;
      }
      const updated = await updateRequestStatus(pool, id, auth.tenantId, parsed.data.status, {
        reason: parsed.data.reason,
        completed: true,
      });
      reply.code(200).send({ request: updated });
    },
  );

  // ──────────────────────────────────────────────────────────────────────────────
  // ADMIN ENDPOINTS
  // ──────────────────────────────────────────────────────────────────────────────

  fastify.get(
    '/admin/requests',
    { preHandler: requireRole([Role.DISTRICT_ADMIN, Role.PLATFORM_ADMIN]) },
    async (request, reply) => {
      const auth = (request as any).auth as AuthContext;
      const parsed = adminQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        reply.code(400).send({ error: 'Invalid query parameters' });
        return;
      }

      const { requests, total } = await listDsrRequestsForTenant(pool, auth.tenantId, {
        status: parsed.data.status as DsrRequestStatus | undefined,
        limit: parsed.data.limit,
        offset: parsed.data.offset,
      });

      reply.code(200).send({
        requests,
        pagination: {
          total,
          limit: parsed.data.limit,
          offset: parsed.data.offset,
          hasMore: parsed.data.offset + requests.length < total,
        },
      });
    },
  );

  fastify.get(
    '/admin/requests/all',
    { preHandler: requireRole([Role.PLATFORM_ADMIN]) },
    async (request, reply) => {
      const parsed = adminQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        reply.code(400).send({ error: 'Invalid query parameters' });
        return;
      }

      const { requests, total } = await listDsrRequestsByStatus(pool, {
        status: parsed.data.status as DsrRequestStatus | undefined,
        limit: parsed.data.limit,
        offset: parsed.data.offset,
      });

      reply.code(200).send({
        requests,
        pagination: {
          total,
          limit: parsed.data.limit,
          offset: parsed.data.offset,
          hasMore: parsed.data.offset + requests.length < total,
        },
      });
    },
  );

  fastify.get(
    '/admin/requests/:id',
    { preHandler: requireRole([Role.DISTRICT_ADMIN, Role.PLATFORM_ADMIN]) },
    async (request, reply) => {
      const auth = (request as any).auth as AuthContext;
      const { id } = request.params as { id: string };

      const record = await getDsrRequestById(pool, id, auth.tenantId);
      if (!record) {
        reply.code(404).send({ error: 'Request not found' });
        return;
      }

      let exportPayload: unknown = undefined;
      if (record.request_type === 'EXPORT' && record.export_location) {
        try {
          exportPayload = JSON.parse(record.export_location);
        } catch {
          exportPayload = null;
        }
      }

      reply.code(200).send({ request: record, export: exportPayload });
    },
  );

  fastify.patch(
    '/admin/requests/:id',
    { preHandler: requireRole([Role.DISTRICT_ADMIN, Role.PLATFORM_ADMIN]) },
    async (request, reply) => {
      const auth = (request as any).auth as AuthContext;
      const { id } = request.params as { id: string };
      const parsed = adminPatchBodySchema.safeParse(request.body);

      if (!parsed.success) {
        reply.code(400).send({ error: 'Invalid payload' });
        return;
      }

      const record = await getDsrRequestById(pool, id, auth.tenantId);
      if (!record) {
        reply.code(404).send({ error: 'Request not found' });
        return;
      }

      if (record.status !== 'PENDING') {
        reply
          .code(400)
          .send({
            error: `Cannot ${parsed.data.action.toLowerCase()} request with status ${record.status}`,
          });
        return;
      }

      let updated: DsrRequest;
      if (parsed.data.action === 'APPROVE') {
        updated = await approveDsrRequest(pool, id, auth.tenantId, auth.userId);
      } else {
        updated = await rejectDsrRequest(
          pool,
          id,
          auth.tenantId,
          auth.userId,
          parsed.data.reason ?? 'Rejected by administrator',
        );
      }

      reply.code(200).send({ request: updated });
    },
  );

  // ──────────────────────────────────────────────────────────────────────────────
  // STATS ENDPOINT (Platform Admin Compliance Dashboard)
  // ──────────────────────────────────────────────────────────────────────────────

  fastify.get(
    '/admin/dsr/stats',
    { preHandler: requireRole([Role.PLATFORM_ADMIN]) },
    async (request, reply) => {
      const parsed = statsQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        reply
          .code(400)
          .send({ error: 'Invalid date range parameters', details: parsed.error.issues });
        return;
      }

      const { from, to } = parsed.data;

      const typeStatsResult = await pool.query<{ request_type: string; count: string }>(
        `SELECT request_type, COUNT(*)::text as count FROM dsr_requests
         WHERE created_at >= $1 AND created_at <= $2 GROUP BY request_type`,
        [from, to],
      );

      const statusStatsResult = await pool.query<{ status: string; count: string }>(
        `SELECT status, COUNT(*)::text as count FROM dsr_requests
         WHERE created_at >= $1 AND created_at <= $2 GROUP BY status`,
        [from, to],
      );

      const recentResult = await pool.query<{
        id: string;
        tenant_id: string;
        tenant_name: string | null;
        request_type: string;
        status: string;
        learner_id: string;
        created_at: Date;
        completed_at: Date | null;
      }>(
        `SELECT r.id, r.tenant_id, t.name as tenant_name, r.request_type, r.status,
                r.learner_id, r.created_at, r.completed_at
         FROM dsr_requests r
         LEFT JOIN tenants t ON r.tenant_id::uuid = t.id
         WHERE r.created_at >= $1 AND r.created_at <= $2
         ORDER BY r.created_at DESC LIMIT 10`,
        [from, to],
      );

      const countsByType: Record<string, number> = {};
      for (const row of typeStatsResult.rows) {
        countsByType[row.request_type] = Number.parseInt(row.count, 10);
      }

      const countsByStatus: Record<string, number> = {};
      for (const row of statusStatsResult.rows) {
        countsByStatus[row.status] = Number.parseInt(row.count, 10);
      }

      const totalRequests = Object.values(countsByType).reduce((sum, c) => sum + c, 0);

      const recentRequests = recentResult.rows.map((row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        tenantName: row.tenant_name ?? 'Unknown',
        requestType: row.request_type,
        status: row.status,
        learnerId: row.learner_id,
        createdAt: row.created_at.toISOString(),
        completedAt: row.completed_at?.toISOString() ?? null,
      }));

      reply.code(200).send({
        totalRequests,
        countsByType,
        countsByStatus,
        recentRequests,
        periodStart: from,
        periodEnd: to,
      });
    },
  );
};
