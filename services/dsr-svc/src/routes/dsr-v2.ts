/**
 * DSR Routes v2 - Enhanced with grace period and rate limiting
 *
 * Key enhancements over v1:
 * - 30-day grace period for DELETE requests (cancellable)
 * - Rate limiting (1 request per type per day)
 * - Full audit trail
 * - Consent data included in exports
 */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { Role, requireRole, type AuthContext } from '@aivo/ts-rbac';
import { type FastifyInstance, type FastifyPluginAsync, type FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';

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
  /** User acknowledged the 30-day grace period */
  acknowledgeGracePeriod: z.boolean(),
});

const cancelDeleteSchema = z.object({
  reason: z.string().max(2000).optional(),
});

// ════════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
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

/** Interface for augmented Fastify request with auth context */
interface AuthenticatedRequest extends FastifyRequest {
  auth?: AuthContext;
}

/** Type-safe auth extraction from Fastify request */
function getAuthFromRequest(request: FastifyRequest): AuthContext {
  // Fastify request is augmented with auth by the authMiddleware
  const auth = (request as AuthenticatedRequest).auth;
  if (!auth?.userId || !auth?.tenantId) {
    throw new Error('Missing auth context');
  }
  return auth;
}

// ════════════════════════════════════════════════════════════════════════════════
// ROUTES
// ════════════════════════════════════════════════════════════════════════════════

export const registerDsrRoutesV2: FastifyPluginAsync<{ pool: Pool }> = async (
  fastify: FastifyInstance,
  opts
) => {
  const { pool } = opts;

  // ──────────────────────────────────────────────────────────────────────────────
  // GET /v2/dsr/requests - List user's DSR requests with summary info
  // ──────────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/v2/dsr/requests',
    { preHandler: requireRole([Role.PARENT]) },
    async (request, reply) => {
      const auth = getAuthFromRequest(request);
      const requests = await listDsrRequestsForUser(pool, auth.tenantId, auth.userId);

      // Build summary with grace period info
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
            learner_name: null, // Would be populated from join in real implementation
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
        })
      );

      reply.code(200).send({ requests: summaries });
    }
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
        reply.code(400).send({
          error: 'Invalid request body',
          details: parsed.error.issues,
        });
        return;
      }

      // Check rate limit
      const rateLimit = await checkRateLimit(pool, auth.tenantId, auth.userId, 'EXPORT');
      if (!rateLimit.allowed) {
        reply.code(429).send({
          error: 'Rate limit exceeded',
          message: `You can only request ${rateLimit.max_requests_per_day} export per day`,
          rate_limit: rateLimit,
        });
        return;
      }

      // Verify ownership
      const owns = await assertParentOwnsLearner(
        pool,
        auth.tenantId,
        auth.userId,
        parsed.data.learnerId
      );
      if (!owns) {
        reply.code(403).send({ error: 'You do not have access to this learner' });
        return;
      }

      // Create the request
      const dsrRequest = await createDsrRequest(pool, {
        tenantId: auth.tenantId,
        requestedByUserId: auth.userId,
        learnerId: parsed.data.learnerId,
        requestType: 'EXPORT',
        reason: parsed.data.reason ?? null,
      });

      // Record for rate limiting
      await recordRateLimitedRequest(pool, auth.tenantId, auth.userId, 'EXPORT');

      // Create audit entry
      await createAuditEntry(pool, dsrRequest.id, 'CREATED', {
        performedByUserId: auth.userId,
        ipAddress,
        userAgent,
        details: { request_type: 'EXPORT' },
      });

      // For EXPORT, start processing immediately
      await updateRequestStatus(pool, dsrRequest.id, auth.tenantId, 'IN_PROGRESS');

      // Build export bundle
      try {
        const bundle = await buildExportBundle(pool, {
          tenantId: auth.tenantId,
          parentId: auth.userId,
          learnerId: parsed.data.learnerId,
          requestId: dsrRequest.id,
        });

        // In production, this would be stored to S3/GCS and an artifact record created
        // For now, store the result URI with bundle info
        const completed = await updateRequestStatus(
          pool,
          dsrRequest.id,
          auth.tenantId,
          'COMPLETED',
          {
            resultUri: `data:application/json;base64,${Buffer.from(JSON.stringify(bundle)).toString('base64')}`,
            completed: true,
          }
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
    }
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
        reply.code(400).send({
          error: 'Invalid request body',
          details: parsed.error.issues,
        });
        return;
      }

      if (!parsed.data.acknowledgeGracePeriod) {
        reply.code(400).send({
          error: 'Grace period acknowledgement required',
          message: `You must acknowledge that there is a ${DSR_CONFIG.GRACE_PERIOD_DAYS}-day grace period during which you can cancel this request`,
        });
        return;
      }

      // Check rate limit
      const rateLimit = await checkRateLimit(pool, auth.tenantId, auth.userId, 'DELETE');
      if (!rateLimit.allowed) {
        reply.code(429).send({
          error: 'Rate limit exceeded',
          message: `You can only request ${rateLimit.max_requests_per_day} deletion per day`,
          rate_limit: rateLimit,
        });
        return;
      }

      // Verify ownership
      const owns = await assertParentOwnsLearner(
        pool,
        auth.tenantId,
        auth.userId,
        parsed.data.learnerId
      );
      if (!owns) {
        reply.code(403).send({ error: 'You do not have access to this learner' });
        return;
      }

      // Create the request with grace period
      const dsrRequest = await createDeleteRequestWithGracePeriod(pool, {
        tenantId: auth.tenantId,
        requestedByUserId: auth.userId,
        learnerId: parsed.data.learnerId,
        requestType: 'DELETE',
        reason: parsed.data.reason ?? null,
      });

      // Record for rate limiting
      await recordRateLimitedRequest(pool, auth.tenantId, auth.userId, 'DELETE');

      // Create audit entry
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
    }
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
        reply.code(400).send({
          error: 'Invalid request body',
          details: parsed.error.issues,
        });
        return;
      }

      // Verify ownership of the request
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
          parsed.data.reason
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
    }
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

      // Get audit trail
      const auditTrail = await getAuditTrail(pool, id);

      // Get export data if available
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
          // Don't expose IP/user agent to end users
        })),
        export: exportData,
      });
    }
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

      reply.code(200).send({
        export: exportLimit,
        delete: deleteLimit,
      });
    }
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

      // Get artifacts
      const artifacts = await getExportArtifacts(pool, id);
      const artifact = artifacts.find((a) => a.expires_at > new Date());

      if (artifact) {
        // Increment download count and log
        await incrementDownloadCount(pool, artifact.id);
      }

      // Log download in audit trail
      await createAuditEntry(pool, id, 'DOWNLOADED', {
        performedByUserId: auth.userId,
        ipAddress,
        userAgent,
      });

      // Return the export data
      if (dsrRequest.export_location) {
        try {
          const data = JSON.parse(dsrRequest.export_location);
          reply
            .header('Content-Type', 'application/json')
            .header(
              'Content-Disposition',
              `attachment; filename="dsr-export-${dsrRequest.learner_id}.json"`
            )
            .send(data);
        } catch {
          reply.code(500).send({ error: 'Failed to parse export data' });
        }
      } else {
        reply.code(404).send({ error: 'Export data not available' });
      }
    }
  );
};
