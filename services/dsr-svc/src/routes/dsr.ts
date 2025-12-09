import { Role, requireRole, type AuthContext } from '@aivo/ts-rbac';
import { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';

import { deidentifyLearner, DeleteError } from '../deleter.js';
import { buildExportBundle, ExportError } from '../exporter.js';
import {
  assertParentOwnsLearner,
  createDsrRequest,
  getDsrRequestById,
  getDsrRequestForParent,
  listDsrRequestsForParent,
  listDsrRequestsForTenant,
  listDsrRequestsByStatus,
  approveDsrRequest,
  rejectDsrRequest,
  markDeclined,
  updateRequestStatus,
} from '../repository.js';
import type { DsrRequest, DsrRequestType, DsrRequestStatus } from '../types.js';

const createBodySchema = z.object({
  learnerId: z.string(),
  requestType: z.enum(['EXPORT', 'DELETE']),
  reason: z.string().max(2000).optional(),
});

const patchBodySchema = z.object({
  status: z.enum(['DECLINED']),
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

export const registerDsrRoutes: FastifyPluginAsync<{ pool: Pool }> = async (
  fastify: FastifyInstance,
  opts
) => {
  const { pool } = opts;

  async function ensureOwnership(tenantId: string, parentId: string, learnerId: string) {
    const owns = await assertParentOwnsLearner(pool, tenantId, parentId, learnerId);
    return owns;
  }

  async function handleExport(requestRecord: DsrRequest, auth: AuthContext, reply: any) {
    try {
      const bundle = await buildExportBundle(pool, {
        tenantId: auth.tenantId,
        parentId: auth.userId,
        learnerId: requestRecord.learner_id,
      });
      const serialized = JSON.stringify(bundle);
      const completed = await updateRequestStatus(
        pool,
        requestRecord.id,
        auth.tenantId,
        'COMPLETED',
        {
          exportLocation: serialized,
          completed: true,
        }
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
        {
          completed: true,
        }
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

  fastify.get('/requests', { preHandler: requireRole([Role.PARENT]) }, async (request, reply) => {
    const auth = (request as any).auth as AuthContext;
    const requests = await listDsrRequestsForParent(pool, auth.tenantId, auth.userId);
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
      const record = await getDsrRequestForParent(pool, id, auth.tenantId, auth.userId);
      if (!record) {
        reply.code(404).send({ error: 'Request not found' });
        return;
      }
      let exportPayload: unknown = undefined;
      if (record.request_type === 'EXPORT' && record.export_location) {
        try {
          exportPayload = JSON.parse(record.export_location);
        } catch (err) {
          // Leave payload undefined if parsing fails; this is intentionally non-fatal for retrieval.
          exportPayload = null;
        }
      }
      reply.code(200).send({ request: record, export: exportPayload });
    }
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
    }
  );

  // ════════════════════════════════════════════════════════════════════════════════
  // ADMIN ENDPOINTS
  // ════════════════════════════════════════════════════════════════════════════════

  /**
   * GET /admin/requests - List DSR requests for tenant (admin view)
   * Supports filtering by status and pagination
   */
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
    }
  );

  /**
   * GET /admin/requests/all - List DSR requests across all tenants (platform admin only)
   * Supports filtering by status
   */
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
    }
  );

  /**
   * GET /admin/requests/:id - Get a specific DSR request (admin view)
   */
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
    }
  );

  /**
   * PATCH /admin/requests/:id - Approve or reject a DSR request
   */
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
        reply.code(400).send({ error: `Cannot ${parsed.data.action.toLowerCase()} request with status ${record.status}` });
        return;
      }

      let updated: DsrRequest;
      if (parsed.data.action === 'APPROVE') {
        updated = await approveDsrRequest(pool, id, auth.tenantId, auth.userId);
        // Note: The actual export/delete processing would be handled by a background worker
        // after approval. For now, we just mark it as approved and IN_PROGRESS.
      } else {
        updated = await rejectDsrRequest(
          pool,
          id,
          auth.tenantId,
          auth.userId,
          parsed.data.reason ?? 'Rejected by administrator'
        );
      }

      reply.code(200).send({ request: updated });
    }
  );
};
