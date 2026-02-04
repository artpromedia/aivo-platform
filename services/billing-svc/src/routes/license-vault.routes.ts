/**
 * License Vault Routes
 *
 * REST API endpoints for secure license issuance, verification,
 * redemption, and management using cryptographic vault.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { getLicenseVaultService } from '../services/license-vault.service.js';

// Get the singleton vault service instance
const licenseVaultService = getLicenseVaultService();

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const IssueLicenseSchema = z.object({
  tenantId: z.string().uuid(),
  type: z.enum(['SEAT', 'ENTERPRISE', 'TRIAL', 'PROMOTIONAL', 'NFR']),
  seats: z.number().int().min(1).default(1),
  features: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional(),
  notes: z.string().optional(),
  enterpriseDealId: z.string().uuid().optional(),
  contractId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const BulkIssueLicensesSchema = z.object({
  tenantId: z.string().uuid(),
  type: z.enum(['SEAT', 'ENTERPRISE', 'TRIAL', 'PROMOTIONAL', 'NFR']),
  count: z.number().int().min(1).max(1000),
  seatsPerLicense: z.number().int().min(1).default(1),
  features: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional(),
  enterpriseDealId: z.string().uuid().optional(),
  contractId: z.string().uuid().optional(),
});

const VerifyLicenseSchema = z.object({
  licenseKey: z.string().min(1),
});

const ActivateLicenseSchema = z.object({
  licenseId: z.string().uuid(),
});

const SuspendLicenseSchema = z.object({
  licenseId: z.string().uuid(),
  reason: z.string().optional(),
});

const RevokeLicenseSchema = z.object({
  licenseId: z.string().uuid(),
  reason: z.string(),
});

const GenerateCodesSchema = z.object({
  licenseId: z.string().uuid(),
  codeType: z.enum(['REDEMPTION', 'ACTIVATION', 'ACCESS', 'PIN']),
  count: z.number().int().min(1).max(500).default(1),
  maxRedemptions: z.number().int().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
});

const VerifyCodeSchema = z.object({
  code: z.string().min(1),
});

const RedeemCodeSchema = z.object({
  code: z.string().min(1),
  targetTenantId: z.string().uuid().optional(),
});

const RevokeCodeSchema = z.object({
  codeId: z.string().uuid(),
  reason: z.string(),
});

const ListLicensesQuerySchema = z.object({
  tenantId: z.string().uuid().optional(),
  type: z.enum(['SEAT', 'ENTERPRISE', 'TRIAL', 'PROMOTIONAL', 'NFR']).optional(),
  status: z.enum(['ISSUED', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED']).optional(),
  enterpriseDealId: z.string().uuid().optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).default('50'),
  offset: z.string().transform(Number).pipe(z.number().int().min(0)).default('0'),
});

const AuditLogQuerySchema = z.object({
  licenseId: z.string().uuid().optional(),
  codeId: z.string().uuid().optional(),
  action: z.string().optional(),
  performedBy: z.string().uuid().optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).default('50'),
  offset: z.string().transform(Number).pipe(z.number().int().min(0)).default('0'),
});

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface RequestContext {
  tenantId: string;
  userId: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}

// Extract context from request headers
function getContext(request: FastifyRequest): RequestContext {
  const tenantId = request.headers['x-tenant-id'] as string;
  const userId = request.headers['x-user-id'] as string;
  const correlationId = (request.headers['x-correlation-id'] as string) ?? crypto.randomUUID();
  const ipAddress = request.ip;
  const userAgent = request.headers['user-agent'];

  if (!tenantId || !userId) {
    throw new Error('Missing required headers: x-tenant-id, x-user-id');
  }

  return { tenantId, userId, correlationId, ipAddress, userAgent };
}

// Check if user has admin/sales role (placeholder - integrate with auth)
function requireAdminRole(_ctx: RequestContext): void {
  // [PLACEHOLDER] Integrate with actual role checking from auth service
  // For now, we trust the x-user-id header for admin operations
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

export async function licenseVaultRoutes(app: FastifyInstance): Promise<void> {
  // ───────────────────────────────────────────────────────────────────────────
  // LICENSE MANAGEMENT
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * POST /vault/licenses
   * Issue a new license
   * Requires: Admin role
   */
  app.post('/vault/licenses', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    requireAdminRole(ctx);

    const body = IssueLicenseSchema.parse(request.body);

    const validDays = body.expiresAt
      ? Math.ceil((new Date(body.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 365;

    const result = await licenseVaultService.issueLicense({
      tenantId: body.tenantId,
      type: body.type,
      seats: body.seats,
      validDays,
      features: body.features,
      enterpriseDealId: body.enterpriseDealId,
      contractId: body.contractId,
      issuedBy: ctx.userId,
      notes: body.notes,
      metadata: body.metadata,
    });

    return reply.status(201).send({
      success: true,
      license: {
        id: result.license.id,
        licenseKey: result.license.fullKey,
        displayKey: result.license.displayKey,
        type: body.type,
        seats: body.seats,
        status: 'ISSUED',
        issuedAt: new Date().toISOString(),
        expiresAt: result.license.expiresAt.toISOString(),
      },
    });
  });

  /**
   * POST /vault/licenses/bulk
   * Issue multiple licenses at once
   * Requires: Admin role
   */
  app.post('/vault/licenses/bulk', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    requireAdminRole(ctx);

    const body = BulkIssueLicensesSchema.parse(request.body);

    // Calculate validDays from expiresAt if provided, default to 365 days
    const validDays = body.expiresAt
      ? Math.ceil((new Date(body.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 365;

    const result = await licenseVaultService.generateBulkLicenses({
      tenantId: body.tenantId,
      type: body.type,
      quantity: body.count,
      seatsPerLicense: body.seatsPerLicense,
      features: body.features,
      validDays,
      enterpriseDealId: body.enterpriseDealId ?? '',
      issuedBy: ctx.userId,
    });

    return reply.status(201).send({
      success: true,
      totalIssued: result.licenses.length,
      licenses: result.licenses.map((l) => ({
        id: l.id,
        displayKey: l.displayKey,
      })),
    });
  });

  /**
   * GET /vault/licenses
   * List licenses with filters
   * Requires: Admin role
   */
  app.get('/vault/licenses', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    requireAdminRole(ctx);

    const query = ListLicensesQuerySchema.parse(request.query);

    const result = await licenseVaultService.listLicenses(query.tenantId, {
      type: query.type,
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    });

    return reply.send({
      success: true,
      licenses: result.licenses,
      total: result.total,
      limit: query.limit,
      offset: query.offset,
    });
  });

  /**
   * GET /vault/licenses/:id
   * Get a specific license by ID
   * Requires: Admin role
   */
  app.get('/vault/licenses/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    requireAdminRole(ctx);

    const { id } = request.params as { id: string };

    if (!z.string().uuid().safeParse(id).success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid license ID format',
      });
    }

    const license = await licenseVaultService.getLicense(id);

    if (!license) {
      return reply.status(404).send({
        success: false,
        error: 'License not found',
      });
    }

    return reply.send({
      success: true,
      license,
    });
  });

  /**
   * POST /vault/licenses/verify
   * Verify a license key
   * Public endpoint (but may require API key)
   */
  app.post('/vault/licenses/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = VerifyLicenseSchema.parse(request.body);
    const _ctx = getContext(request);

    const result = await licenseVaultService.verifyLicense(body.licenseKey);

    const isExpired = result.expiresAt ? new Date(result.expiresAt) < new Date() : false;

    return reply.send({
      success: true,
      verification: {
        isValid: result.valid,
        status: result.status,
        type: result.type,
        seats: result.seats,
        features: result.features,
        expiresAt: result.expiresAt,
        isExpired,
        errorMessage: result.error,
      },
    });
  });

  /**
   * POST /vault/licenses/activate
   * Activate a license
   * Requires: Admin role
   */
  app.post('/vault/licenses/activate', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    requireAdminRole(ctx);

    const body = ActivateLicenseSchema.parse(request.body);

    try {
      await licenseVaultService.activateLicense(body.licenseId, ctx.userId);
      return reply.send({
        success: true,
        message: 'License activated successfully',
      });
    } catch (err) {
      return reply.status(400).send({
        success: false,
        message: 'Failed to activate license',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /vault/licenses/suspend
   * Suspend a license
   * Requires: Admin role
   */
  app.post('/vault/licenses/suspend', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    requireAdminRole(ctx);

    const body = SuspendLicenseSchema.parse(request.body);

    try {
      await licenseVaultService.suspendLicense(
        body.licenseId,
        body.reason ?? 'Suspended by admin',
        ctx.userId
      );
      return reply.send({
        success: true,
        message: 'License suspended successfully',
      });
    } catch (err) {
      return reply.status(400).send({
        success: false,
        message: 'Failed to suspend license',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /vault/licenses/revoke
   * Revoke a license permanently
   * Requires: Admin role
   */
  app.post('/vault/licenses/revoke', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    requireAdminRole(ctx);

    const body = RevokeLicenseSchema.parse(request.body);

    try {
      await licenseVaultService.revokeLicense(body.licenseId, body.reason, ctx.userId);
      return reply.send({
        success: true,
        message: 'License revoked successfully',
      });
    } catch (err) {
      return reply.status(400).send({
        success: false,
        message: 'Failed to revoke license',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /vault/licenses/reinstate
   * Reinstate a suspended license
   * Requires: Admin role
   */
  app.post('/vault/licenses/reinstate', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    requireAdminRole(ctx);

    const body = ActivateLicenseSchema.parse(request.body); // Same schema, just needs licenseId

    try {
      await licenseVaultService.reinstateLicense(body.licenseId, ctx.userId);
      return reply.send({
        success: true,
        message: 'License reinstated successfully',
      });
    } catch (err) {
      return reply.status(400).send({
        success: false,
        message: 'Failed to reinstate license',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CODE MANAGEMENT
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * POST /vault/codes
   * Generate redemption/activation codes for a license
   * Requires: Admin role
   */
  app.post('/vault/codes', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    requireAdminRole(ctx);

    const body = GenerateCodesSchema.parse(request.body);

    // Calculate validDays from expiresAt if provided
    const validDays = body.expiresAt
      ? Math.ceil((new Date(body.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : undefined;

    const result = await licenseVaultService.generateCodes({
      licenseId: body.licenseId,
      codeType: body.codeType,
      quantity: body.count,
      maxRedemptions: body.maxRedemptions,
      validDays,
      createdBy: ctx.userId,
    });

    return reply.status(201).send({
      success: true,
      codes: result.codes.map((c) => ({
        id: c.id,
        code: c.code,
        type: body.codeType,
      })),
    });
  });

  /**
   * POST /vault/codes/verify
   * Verify a code without redeeming it
   * Public endpoint (but may require API key)
   */
  app.post('/vault/codes/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = VerifyCodeSchema.parse(request.body);

    const result = await licenseVaultService.verifyCode(body.code);

    const isExpired = result.expiresAt ? new Date(result.expiresAt) < new Date() : false;

    return reply.send({
      success: true,
      verification: {
        isValid: result.valid,
        codeType: result.codeType,
        remainingRedemptions: result.remainingRedemptions,
        expiresAt: result.expiresAt,
        isExpired,
        licenseId: result.licenseId,
        errorMessage: result.error,
      },
    });
  });

  /**
   * POST /vault/codes/redeem
   * Redeem a code
   * Requires: Authenticated user
   */
  app.post('/vault/codes/redeem', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    const body = RedeemCodeSchema.parse(request.body);

    const result = await licenseVaultService.redeemCode(body.code, ctx.userId, body.targetTenantId);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: result.error,
      });
    }

    return reply.send({
      success: true,
      redemption: {
        licenseId: result.licenseId,
        tenantId: result.tenantId,
        activatedSeats: result.activatedSeats,
      },
    });
  });

  /**
   * POST /vault/codes/revoke
   * Revoke a code
   * Requires: Admin role
   */
  app.post('/vault/codes/revoke', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    requireAdminRole(ctx);

    const body = RevokeCodeSchema.parse(request.body);

    try {
      await licenseVaultService.revokeCode(body.codeId, body.reason, ctx.userId);
      return reply.send({
        success: true,
        message: 'Code revoked successfully',
      });
    } catch (err) {
      return reply.status(400).send({
        success: false,
        message: 'Failed to revoke code',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // AUDIT LOGS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * GET /vault/audit-logs
   * Get audit logs with filters
   * Requires: Admin role
   */
  app.get('/vault/audit-logs', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    requireAdminRole(ctx);

    const query = AuditLogQuerySchema.parse(request.query);

    const result = await licenseVaultService.getAuditLog(query.licenseId, {
      limit: query.limit,
      offset: query.offset,
    });

    return reply.send({
      success: true,
      auditLogs: result.entries,
      total: result.total,
      limit: query.limit,
      offset: query.offset,
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // HEALTH CHECK
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * GET /vault/health
   * Health check for vault service
   */
  app.get('/vault/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    // Check if encryption keys are configured
    const encryptionKeyConfigured = !!process.env.LICENSE_VAULT_ENCRYPTION_KEY;
    const hmacKeyConfigured = !!process.env.LICENSE_VAULT_HMAC_KEY;

    const healthy = encryptionKeyConfigured && hmacKeyConfigured;

    return reply.status(healthy ? 200 : 503).send({
      status: healthy ? 'healthy' : 'unhealthy',
      components: {
        encryptionKey: encryptionKeyConfigured ? 'configured' : 'missing',
        hmacKey: hmacKeyConfigured ? 'configured' : 'missing',
      },
      timestamp: new Date().toISOString(),
    });
  });
}
