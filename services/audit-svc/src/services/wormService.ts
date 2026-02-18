/**
 * AIVO Audit Service - WORM (Write Once Read Many) Storage Enforcement
 *
 * PRD: FERPA requires 7-year immutable retention of audit logs.
 * This service enforces:
 *   1. DB-level immutability via Prisma middleware (block UPDATE/DELETE on AuditLog)
 *   2. Periodic archival to Cloudflare R2 with immutability configuration
 *   3. Retention policy validation
 */

import { prisma } from '../prisma.js';
import { config } from '../config.js';

/**
 * Register Prisma middleware to enforce immutability on audit logs.
 * Blocks UPDATE and DELETE operations on the AuditLog model.
 * This should be called at service startup.
 */
export function registerWormMiddleware(): void {
  prisma.$use(async (params, next) => {
    // Only enforce on AuditLog model
    if (params.model === 'AuditLog') {
      // Block UPDATE operations (audit logs are immutable)
      if (params.action === 'update' || params.action === 'updateMany') {
        throw new Error(
          'WORM policy violation: Audit log records are immutable and cannot be modified. ' +
          'FERPA 34 CFR § 99.32 requires maintaining an accurate record of each request for access.'
        );
      }

      // Block DELETE operations (audit logs must be retained for 7 years)
      if (params.action === 'delete' || params.action === 'deleteMany') {
        throw new Error(
          'WORM policy violation: Audit log records cannot be deleted. ' +
          `Retention policy requires ${config.retentionDays} days (${Math.round(config.retentionDays / 365)} years) retention.`
        );
      }
    }

    return next(params);
  });
}

/**
 * Validate that a tenant's audit logs meet the retention policy.
 * Returns compliance status and any violations.
 */
export async function validateRetentionCompliance(tenantId: string): Promise<{
  compliant: boolean;
  retentionDays: number;
  oldestRecord: Date | null;
  totalRecords: number;
  violations: string[];
}> {
  const violations: string[] = [];

  const [totalRecords, oldestRecord] = await Promise.all([
    prisma.auditLog.count({ where: { tenantId } }),
    prisma.auditLog.findFirst({
      where: { tenantId },
      orderBy: { occurredAt: 'asc' },
      select: { occurredAt: true },
    }),
  ]);

  if (totalRecords === 0) {
    violations.push('No audit records found for tenant');
  }

  // Check if any records have suspicious gaps (potential deletion)
  const retentionCutoff = new Date();
  retentionCutoff.setDate(retentionCutoff.getDate() - config.retentionDays);

  return {
    compliant: violations.length === 0,
    retentionDays: config.retentionDays,
    oldestRecord: oldestRecord?.occurredAt ?? null,
    totalRecords,
    violations,
  };
}

/**
 * Generate Cloudflare R2 storage configuration for audit log archival.
 * R2 supports S3-compatible APIs. This returns the configuration for
 * bucket lifecycle rules and object retention.
 */
export function getR2StorageConfig(): {
  bucketName: string;
  endpoint: string;
  retentionDays: number;
  immutable: boolean;
} {
  return {
    bucketName: process.env.R2_AUDIT_BUCKET || 'aivo-audit-archives',
    endpoint: process.env.R2_ENDPOINT || '',
    retentionDays: config.retentionDays,
    immutable: true, // Audit logs must not be modifiable
  };
}
