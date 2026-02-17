/**
 * DSR Routes v2 – Enhanced with grace period, rate limiting in audit trail
 *
 * Key enhancements over v1:
 * - 30-day grace period for DELETE requests (cancellable)
 * - Rate limiting (1 request per type per day)
 * - Full audit trail
 * - Consent data included in exports
 *
 * Ported from services/dsr-svc during Sprint-2 consolidation.
 */

import { Role, requireRole, type AuthContext } from '@aivo/ts-rbac';
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { getPool } from '../../shared/db.js';
import { buildExportBundle, ExportError } from '../exporter.js';
import {
  assertParentOwnsLearner,
  createDsrRequest,
  createDeleteRequestWithGracePeriod,
  cancelDeletionRequest,
  getDsrRequestForUser,
  listDsrRequestsForUser,
  checkRateLimit,
  recordRateLimitedRequest,
  createAuditEntry,
  getAuditTrail,
  calculateGracePeriodDaysRemaining,
  updateRequestStatus,
  getExportArtifacts,
  incrementDownloadCount,
} from '../repository.js';
import type { DsrRequestSummary, DsrCreateResponse } from '../types.js';
import { DSR_CONFIG } from '../types.js';

// ════════════════════════════════════════════════════════════════════════════════
// REQUEST SCHEMAS
// ════════════════════════════════════════════════════════════════════════════════

const createExportSchema = z.object({
  learnerId: z.string().uuid(),
  reason: z.string().max(2000).optional(),
});

const createDeleteSchema = z.object({
  learnerId: z.string().uuid(),
  reason: z.string().max(2000).optional(),
  acknowledgeGracePeriod: z.boolean(),
});

const cancelDeleteSchema = z.object({
  reason: z.string().max(2000).optional(),
});

// ════════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════════

interface RequestWithHeaders {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
}

function getClientInfo(request: RequestWithHeaders): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  const forwardedFor = request.headers['x-forwarded-for'];
  const forwardedIp = typeof forwardedFor === 'string' ? forwardedFor.split(',')[0]?.trim() : null;
  return {
    ipAddress: forwardedIp || request.ip || null,
    userAgent: (request.headers['user-agent'] as string) || null,
  };
}

interface AuthenticatedRequest extends FastifyRequest {
  auth?: AuthContext;
}

function getAuthFromRequest(request: FastifyRequest): AuthContext {
  const auth = (request as AuthenticatedRequest).auth;
  if (!auth?.userId || !auth?.tenantId) {
    throw new Error('Missing auth context');
  }
  return auth;
}

// ════════════════════════════════════════════════════════════════════════════════
// PLUGIN
// ════════════════════════════════════════════════════════════════════════════════

export const registerDsrRoutesV2: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const pool = getPool();

  // ──────────────────────────────────────────────────────────────────────────────
  // GET /v2/dsr/requests - List user's DSR requests with summary info
  // ──────────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/v2/dsr/requests',
    { preHandler: requireRole([Role.PARENT]) },
    async (request, reply) => {
      const auth = getAuthFromRequest(request);
      const requests = await listDsrRequestsForUser(pool, auth.tenantId, auth.userId);

      const summaries: DsrRequestSummary[] = await Promise.all(
        requests.map(async (req) => {
          const artifacts =
            req.request_type === 'EXPORT' && req.status === 'COMPLETED'
              ? await getExportArtifacts(pool, req.id)
              : [];

          const downloadArtifact = artifacts.find((a) => a.expires_at > new Date());

          return {
            id: req.id,
            request_type: req.request_type,
            status: req.status,
            learner_id: req.learner_id,
            learner_name: null,
            created_at: req.created_at,
            grace_period_ends_at: req.grace_period_ends_at,
            scheduled_deletion_at: req.scheduled_deletion_at,
            grace_period_days_remaining: calculateGracePeriodDaysRemaining(req),
            can_cancel:
              req.status === 'GRACE_PERIOD' &&
              (req.grace_period_ends_at ?? new Date()) > new Date(),
            download_url: downloadArtifact?.storage_uri ?? null,
            download_expires_at: downloadArtifact?.expires_at ?? null,
          };
        }),
      );

      reply.code(200).send({ requests: summaries });
    },
  );

  // ──────────────────────────────────────────────────────────────────────────────
  // POST /v2/dsr/export - Create an EXPORT request
  // ──────────────────────────────────────────────────────────────────────────────
  fastify.post(
    '/v2/dsr/export',
    { preHandler: requireRole([Role.PARENT]) },
    async (request, reply) => {
      const auth = getAuthFromRequest(request);
      const { ipAddress, userAgent } = getClientInfo(request);

      const parsed = createExportSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.code(400).send({ error: 'Invalid request body', details: parsed.error.issues });
        return;
      }

      const rateLimit = await checkRateLimit(pool, auth.tenantId, auth.userId, 'EXPORT');
      if (!rateLimit.allowed) {
        reply.code(429).send({
          error: 'Rate limit exceeded',
          message: `You can only request ${rateLimit.max_requests_per_day} export per day`,
          rate_limit: rateLimit,
        });
        return;
      }

      const owns = await assertParentOwnsLearner(
        pool,
        auth.tenantId,
        auth.userId,
        parsed.data.learnerId,
      );
      if (!owns) {
        reply.code(403).send({ error: 'You do not have access to this learner' });
        return;
      }

      const dsrRequest = await createDsrRequest(pool, {
        tenantId: auth.tenantId,
        requestedByUserId: auth.userId,
        learnerId: parsed.data.learnerId,
        requestType: 'EXPORT',
        reason: parsed.data.reason ?? null,
      });

      await recordRateLimitedRequest(pool, auth.tenantId, auth.userId, 'EXPORT');

      await createAuditEntry(pool, dsrRequest.id, 'CREATED', {
        performedByUserId: auth.userId,
        ipAddress,
        userAgent,
        details: { request_type: 'EXPORT' },
      });

      await updateRequestStatus(pool, dsrRequest.id, auth.tenantId, 'IN_PROGRESS');

      try {
        const bundle = await buildExportBundle(pool, {
          tenantId: auth.tenantId,
          parentId: auth.userId,
          learnerId: parsed.data.learnerId,
          requestId: dsrRequest.id,
        });

        const completed = await updateRequestStatus(
          pool,
          dsrRequest.id,
          auth.tenantId,
          'COMPLETED',
          {
            resultUri: `data:application/json;base64,${Buffer.from(JSON.stringify(bundle)).toString('base64')}`,
            completed: true,
          },
        );

        await createAuditEntry(pool, dsrRequest.id, 'COMPLETED', {
          performedByUserId: auth.userId,
          ipAddress,
          userAgent,
          details: { export_size_bytes: JSON.stringify(bundle).length },
        });

        const response: DsrCreateResponse = {
          request_id: completed.id,
          request_type: 'EXPORT',
          status: 'COMPLETED',
          message: 'Your data export is ready for download',
        };

        reply.code(201).send({ ...response, export: bundle });
      } catch (err) {
        if (err instanceof ExportError) {
          await updateRequestStatus(pool, dsrRequest.id, auth.tenantId, 'FAILED', {
            errorMessage: err.message,
            completed: true,
          });

          await createAuditEntry(pool, dsrRequest.id, 'FAILED', {
            performedByUserId: auth.userId,
            ipAddress,
            userAgent,
            details: { error: err.message },
          });

          reply.code(400).send({ error: err.message });
          return;
        }
        throw err;
      }
    },
  );

  // ──────────────────────────────────────────────────────────────────────────────
  // POST /v2/dsr/delete - Create a DELETE request (with 30-day grace period)
  // ──────────────────────────────────────────────────────────────────────────────
  fastify.post(
    '/v2/dsr/delete',
    { preHandler: requireRole([Role.PARENT]) },
    async (request, reply) => {
      const auth = getAuthFromRequest(request);
      const { ipAddress, userAgent } = getClientInfo(request);

      const parsed = createDeleteSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.code(400).send({ error: 'Invalid request body', details: parsed.error.issues });
        return;
      }

      if (!parsed.data.acknowledgeGracePeriod) {
        reply.code(400).send({
          error: 'Grace period acknowledgement required',
          message: `You must acknowledge that there is a ${DSR_CONFIG.GRACE_PERIOD_DAYS}-day grace period during which you can cancel this request`,
        });
        return;
      }

      const rateLimit = await checkRateLimit(pool, auth.tenantId, auth.userId, 'DELETE');
      if (!rateLimit.allowed) {
        reply.code(429).send({
          error: 'Rate limit exceeded',
          message: `You can only request ${rateLimit.max_requests_per_day} deletion per day`,
          rate_limit: rateLimit,
        });
        return;
      }

      const owns = await assertParentOwnsLearner(
        pool,
        auth.tenantId,
        auth.userId,
        parsed.data.learnerId,
      );
      if (!owns) {
        reply.code(403).send({ error: 'You do not have access to this learner' });
        return;
      }

      const dsrRequest = await createDeleteRequestWithGracePeriod(pool, {
        tenantId: auth.tenantId,
        requestedByUserId: auth.userId,
        learnerId: parsed.data.learnerId,
        requestType: 'DELETE',
        reason: parsed.data.reason ?? null,
      });

      await recordRateLimitedRequest(pool, auth.tenantId, auth.userId, 'DELETE');

      await createAuditEntry(pool, dsrRequest.id, 'CREATED', {
        performedByUserId: auth.userId,
        ipAddress,
        userAgent,
        details: {
          request_type: 'DELETE',
          grace_period_days: DSR_CONFIG.GRACE_PERIOD_DAYS,
          scheduled_deletion_at: dsrRequest.scheduled_deletion_at,
        },
      });

      const response: DsrCreateResponse = {
        request_id: dsrRequest.id,
        request_type: 'DELETE',
        status: 'GRACE_PERIOD',
        message: `Your deletion request has been scheduled. You have ${DSR_CONFIG.GRACE_PERIOD_DAYS} days to cancel.`,
        grace_period_info: {
          grace_period_ends_at: dsrRequest.grace_period_ends_at ?? new Date(),
          scheduled_deletion_at: dsrRequest.scheduled_deletion_at ?? new Date(),
          cancellation_deadline: dsrRequest.grace_period_ends_at ?? new Date(),
        },
      };

      reply.code(201).send(response);
    },
  );

  // ──────────────────────────────────────────────────────────────────────────────
  // POST /v2/dsr/requests/:id/cancel - Cancel a deletion during grace period
  // ──────────────────────────────────────────────────────────────────────────────
  fastify.post(
    '/v2/dsr/requests/:id/cancel',
    { preHandler: requireRole([Role.PARENT]) },
    async (request, reply) => {
      const auth = getAuthFromRequest(request);
      const { id } = request.params as { id: string };
      const { ipAddress, userAgent } = getClientInfo(request);

      const parsed = cancelDeleteSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.code(400).send({ error: 'Invalid request body', details: parsed.error.issues });
        return;
      }

      const existingRequest = await getDsrRequestForUser(pool, id, auth.tenantId, auth.userId);
      if (!existingRequest) {
        reply.code(404).send({ error: 'Request not found' });
        return;
      }

      if (existingRequest.request_type !== 'DELETE') {
        reply.code(400).send({ error: 'Only deletion requests can be cancelled' });
        return;
      }

      try {
        const cancelled = await cancelDeletionRequest(
          pool,
          id,
          auth.tenantId,
          auth.userId,
          parsed.data.reason,
        );

        await createAuditEntry(pool, id, 'CANCELLED', {
          performedByUserId: auth.userId,
          ipAddress,
          userAgent,
          details: { reason: parsed.data.reason },
        });

        reply.code(200).send({
          message: 'Deletion request cancelled successfully',
          request: {
            id: cancelled.id,
            status: cancelled.status,
            cancelled_at: cancelled.cancelled_at,
          },
        });
      } catch (err) {
        if (err instanceof Error && err.message.includes('Cannot cancel')) {
          reply.code(400).send({ error: err.message });
          return;
        }
        throw err;
      }
    },
  );

  // ──────────────────────────────────────────────────────────────────────────────
  // GET /v2/dsr/requests/:id - Get detailed request info with audit trail
  // ──────────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/v2/dsr/requests/:id',
    { preHandler: requireRole([Role.PARENT]) },
    async (request, reply) => {
      const auth = getAuthFromRequest(request);
      const { id } = request.params as { id: string };

      const dsrRequest = await getDsrRequestForUser(pool, id, auth.tenantId, auth.userId);
      if (!dsrRequest) {
        reply.code(404).send({ error: 'Request not found' });
        return;
      }

      const auditTrail = await getAuditTrail(pool, id);

      let exportData = null;
      if (
        dsrRequest.request_type === 'EXPORT' &&
        dsrRequest.status === 'COMPLETED' &&
        dsrRequest.export_location
      ) {
        try {
          exportData = JSON.parse(dsrRequest.export_location);
        } catch {
          // Leave null
        }
      }

      reply.code(200).send({
        request: {
          id: dsrRequest.id,
          request_type: dsrRequest.request_type,
          status: dsrRequest.status,
          learner_id: dsrRequest.learner_id,
          reason: dsrRequest.reason,
          created_at: dsrRequest.created_at,
          completed_at: dsrRequest.completed_at,
          grace_period_ends_at: dsrRequest.grace_period_ends_at,
          scheduled_deletion_at: dsrRequest.scheduled_deletion_at,
          grace_period_days_remaining: calculateGracePeriodDaysRemaining(dsrRequest),
          can_cancel:
            dsrRequest.status === 'GRACE_PERIOD' &&
            (dsrRequest.grace_period_ends_at ?? new Date()) > new Date(),
          cancelled_at: dsrRequest.cancelled_at,
          cancellation_reason: dsrRequest.cancellation_reason,
        },
        audit_trail: auditTrail.map((entry) => ({
          action: entry.action,
          timestamp: entry.created_at,
        })),
        export: exportData,
      });
    },
  );

  // ──────────────────────────────────────────────────────────────────────────────
  // GET /v2/dsr/rate-limit - Check current rate limit status
  // ──────────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/v2/dsr/rate-limit',
    { preHandler: requireRole([Role.PARENT]) },
    async (request, reply) => {
      const auth = getAuthFromRequest(request);

      const [exportLimit, deleteLimit] = await Promise.all([
        checkRateLimit(pool, auth.tenantId, auth.userId, 'EXPORT'),
        checkRateLimit(pool, auth.tenantId, auth.userId, 'DELETE'),
      ]);

      reply.code(200).send({ export: exportLimit, delete: deleteLimit });
    },
  );

  // ──────────────────────────────────────────────────────────────────────────────
  // GET /v2/dsr/requests/:id/download - Track downloads for audit
  // ──────────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/v2/dsr/requests/:id/download',
    { preHandler: requireRole([Role.PARENT]) },
    async (request, reply) => {
      const auth = getAuthFromRequest(request);
      const { id } = request.params as { id: string };
      const { ipAddress, userAgent } = getClientInfo(request);

      const dsrRequest = await getDsrRequestForUser(pool, id, auth.tenantId, auth.userId);
      if (!dsrRequest) {
        reply.code(404).send({ error: 'Request not found' });
        return;
      }

      if (dsrRequest.request_type !== 'EXPORT') {
        reply.code(400).send({ error: 'Only export requests have downloadable data' });
        return;
      }

      if (dsrRequest.status !== 'COMPLETED') {
        reply.code(400).send({ error: 'Export is not yet complete' });
        return;
      }

      const artifacts = await getExportArtifacts(pool, id);
      const artifact = artifacts.find((a) => a.expires_at > new Date());

      if (artifact) {
        await incrementDownloadCount(pool, artifact.id);
      }

      await createAuditEntry(pool, id, 'DOWNLOADED', {
        performedByUserId: auth.userId,
        ipAddress,
        userAgent,
      });

      if (dsrRequest.export_location) {
        try {
          const data = JSON.parse(dsrRequest.export_location);
          reply
            .header('Content-Type', 'application/json')
            .header(
              'Content-Disposition',
              `attachment; filename="dsr-export-${dsrRequest.learner_id}.json"`,
            )
            .send(data);
        } catch {
          reply.code(500).send({ error: 'Failed to parse export data' });
        }
      } else {
        reply.code(404).send({ error: 'Export data not available' });
      }
    },
  );
};
