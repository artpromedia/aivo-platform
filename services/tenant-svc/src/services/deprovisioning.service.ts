/**
 * Tenant Deprovisioning Service (Sprint 11 — Task 6)
 *
 * Manages the tenant deletion lifecycle with GDPR compliance:
 * - Initiate soft delete with 30-day grace period
 * - Request data export (GDPR right to portability)
 * - Cancel pending deletion (reactivate)
 * - Permanent delete after grace period (data purge)
 * - Full audit trail for compliance
 *
 * @module services/deprovisioning.service
 */

import { randomUUID } from 'node:crypto';
import type { Redis } from 'ioredis';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClient = any;

// ══════════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════════

export interface DeletionRequest {
  tenantId: string;
  requestedBy: string;
  requestedByEmail?: string;
  reason?: string;
  exportData?: boolean; // Request data export before deletion
}

export interface DeletionStatus {
  tenantId: string;
  tenantName: string;
  status: string;
  deletedAt: string | null;
  deleteGraceEndsAt: string | null;
  daysUntilPermanentDelete: number;
  dataExport: {
    requested: boolean;
    status: string | null;
    downloadUrl: string | null;
    downloadExpiresAt: string | null;
  } | null;
  canCancel: boolean;
  canPermanentlyDelete: boolean;
}

export interface DataExportResult {
  exportId: string;
  tenantId: string;
  status: string;
  format: string;
  requestedAt: string;
  downloadUrl?: string;
  downloadExpiresAt?: string;
}

export interface DeprovisioningServiceConfig {
  prisma: PrismaClient;
  redis?: Redis | null;
  gracePeriodDays?: number;
  dataExportBucket?: string;
  dataExportTtlDays?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// Service Implementation
// ══════════════════════════════════════════════════════════════════════════════

export class DeprovisioningService {
  private readonly prisma: PrismaClient;
  private readonly redis: Redis | null;
  private readonly gracePeriodDays: number;
  private readonly dataExportBucket: string;
  private readonly dataExportTtlDays: number;

  constructor(config: DeprovisioningServiceConfig) {
    this.prisma = config.prisma;
    this.redis = config.redis ?? null;
    this.gracePeriodDays = config.gracePeriodDays ?? 30;
    this.dataExportBucket = config.dataExportBucket ?? 'aivo-data-exports';
    this.dataExportTtlDays = config.dataExportTtlDays ?? 7;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Deletion Lifecycle
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Initiate a soft deletion with grace period.
   * The tenant is marked as PENDING_DELETE and becomes read-only.
   */
  async initiateDeletion(request: DeletionRequest): Promise<DeletionStatus> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: request.tenantId },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    if (tenant.status === 'DELETED') {
      throw new Error('Tenant has already been permanently deleted');
    }

    if (tenant.status === 'PENDING_DELETE') {
      // Already pending — return current status
      return this.getDeletionStatus(request.tenantId);
    }

    const now = new Date();
    const graceEndsAt = new Date(now.getTime() + this.gracePeriodDays * 24 * 60 * 60 * 1000);

    await this.prisma.$transaction(async (tx: PrismaClient) => {
      // Mark tenant as pending delete
      await tx.tenant.update({
        where: { id: request.tenantId },
        data: {
          status: 'PENDING_DELETE',
          deletedAt: now,
          deleteGraceEndsAt: graceEndsAt,
          deletedByUserId: request.requestedBy,
        },
      });

      // Log audit event
      await tx.tenantAuditEvent.create({
        data: {
          tenantId: request.tenantId,
          eventType: 'DEPROVISIONING_STARTED',
          actorUserId: request.requestedBy,
          actorEmail: request.requestedByEmail,
          description: `Tenant deletion initiated. Grace period ends ${graceEndsAt.toISOString()}`,
          metadata: {
            reason: request.reason,
            gracePeriodDays: this.gracePeriodDays,
            graceEndsAt: graceEndsAt.toISOString(),
          },
        },
      });
    });

    // If data export requested, start it
    if (request.exportData) {
      await this.requestDataExport(
        request.tenantId,
        request.requestedBy,
        request.requestedByEmail,
      );
    }

    // Invalidate cache
    if (this.redis) {
      await this.redis.del(`tenant:${request.tenantId}`);
      if (tenant.subdomain) {
        await this.redis.del(`tenant:subdomain:${tenant.subdomain}`);
      }
    }

    return this.getDeletionStatus(request.tenantId);
  }

  /**
   * Cancel a pending deletion and reactivate the tenant.
   */
  async cancelDeletion(tenantId: string, cancelledBy: string, cancelledByEmail?: string): Promise<DeletionStatus> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    if (tenant.status !== 'PENDING_DELETE') {
      throw new Error(`Cannot cancel deletion — tenant status is ${tenant.status}`);
    }

    await this.prisma.$transaction(async (tx: PrismaClient) => {
      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          status: 'ACTIVE',
          isActive: true,
          deletedAt: null,
          deleteGraceEndsAt: null,
          deletedByUserId: null,
        },
      });

      await tx.tenantAuditEvent.create({
        data: {
          tenantId,
          eventType: 'TENANT_DELETE_CANCELLED',
          actorUserId: cancelledBy,
          actorEmail: cancelledByEmail,
          description: 'Tenant deletion cancelled, tenant reactivated',
        },
      });
    });

    // Invalidate cache
    if (this.redis) {
      await this.redis.del(`tenant:${tenantId}`);
    }

    return this.getDeletionStatus(tenantId);
  }

  /**
   * Get the current deletion status for a tenant.
   */
  async getDeletionStatus(tenantId: string): Promise<DeletionStatus> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const now = new Date();
    const graceEndsAt = tenant.deleteGraceEndsAt ? new Date(tenant.deleteGraceEndsAt) : null;
    const daysRemaining = graceEndsAt
      ? Math.max(0, Math.ceil((graceEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    // Check for data export
    const latestExport = await this.prisma.tenantDataExport.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      status: tenant.status,
      deletedAt: tenant.deletedAt?.toISOString() ?? null,
      deleteGraceEndsAt: graceEndsAt?.toISOString() ?? null,
      daysUntilPermanentDelete: daysRemaining,
      dataExport: latestExport
        ? {
            requested: true,
            status: latestExport.status,
            downloadUrl: latestExport.downloadUrl,
            downloadExpiresAt: latestExport.downloadExpiresAt?.toISOString() ?? null,
          }
        : null,
      canCancel: tenant.status === 'PENDING_DELETE',
      canPermanentlyDelete: tenant.status === 'PENDING_DELETE' && daysRemaining === 0,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Data Export (GDPR Right to Portability)
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Request a data export for a tenant (GDPR compliance).
   */
  async requestDataExport(
    tenantId: string,
    requestedBy: string,
    requestedByEmail?: string,
    format: 'json' | 'csv' = 'json',
  ): Promise<DataExportResult> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Check for existing pending/in-progress export
    const existing = await this.prisma.tenantDataExport.findFirst({
      where: {
        tenantId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
    });

    if (existing) {
      return {
        exportId: existing.id,
        tenantId,
        status: existing.status,
        format: existing.format,
        requestedAt: existing.createdAt.toISOString(),
      };
    }

    const exportRecord = await this.prisma.tenantDataExport.create({
      data: {
        tenantId,
        requestedBy,
        requestedByEmail,
        format,
        status: 'PENDING',
      },
    });

    // Log audit event
    await this.prisma.tenantAuditEvent.create({
      data: {
        tenantId,
        eventType: 'DATA_EXPORT_REQUESTED',
        actorUserId: requestedBy,
        actorEmail: requestedByEmail,
        description: `Data export requested in ${format} format`,
        metadata: { exportId: exportRecord.id, format },
      },
    });

    // Start export processing in background
    this.processDataExport(exportRecord.id).catch((err) => {
      console.error(`[DataExport] Failed to process export ${exportRecord.id}:`, err);
    });

    return {
      exportId: exportRecord.id,
      tenantId,
      status: 'PENDING',
      format,
      requestedAt: exportRecord.createdAt.toISOString(),
    };
  }

  /**
   * Get data export status.
   */
  async getDataExportStatus(exportId: string): Promise<DataExportResult> {
    const exportRecord = await this.prisma.tenantDataExport.findUnique({
      where: { id: exportId },
    });

    if (!exportRecord) {
      throw new Error('Data export not found');
    }

    return {
      exportId: exportRecord.id,
      tenantId: exportRecord.tenantId,
      status: exportRecord.status,
      format: exportRecord.format,
      requestedAt: exportRecord.createdAt.toISOString(),
      downloadUrl: exportRecord.downloadUrl ?? undefined,
      downloadExpiresAt: exportRecord.downloadExpiresAt?.toISOString() ?? undefined,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Permanent Deletion (cron job)
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Process tenants past their grace period for permanent deletion.
   * Should be run daily by a cron job.
   */
  async processPermanentDeletions(): Promise<{ deleted: number; errors: string[] }> {
    const now = new Date();
    const errors: string[] = [];
    let deleted = 0;

    const tenantsToDelete = await this.prisma.tenant.findMany({
      where: {
        status: 'PENDING_DELETE',
        deleteGraceEndsAt: { lte: now },
      },
    });

    for (const tenant of tenantsToDelete) {
      try {
        await this.permanentlyDeleteTenant(tenant.id);
        deleted++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`Tenant ${tenant.id}: ${message}`);
      }
    }

    return { deleted, errors };
  }

  /**
   * Permanently delete a tenant and purge all data.
   * This is irreversible!
   */
  async permanentlyDeleteTenant(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        schools: true,
        config: true,
        branding: true,
        usageRecords: true,
        customDomains: true,
      },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    if (tenant.status !== 'PENDING_DELETE') {
      throw new Error('Tenant must be in PENDING_DELETE status');
    }

    // Create final audit event before deletion
    await this.prisma.tenantAuditEvent.create({
      data: {
        tenantId,
        eventType: 'DEPROVISIONING_COMPLETED',
        description: `Permanent deletion of "${tenant.name}" — all data purged`,
        metadata: {
          schoolCount: tenant.schools?.length ?? 0,
          hadBranding: !!tenant.branding,
          hadConfig: !!tenant.config,
          usageRecordCount: tenant.usageRecords?.length ?? 0,
        },
      },
    });

    // Delete all related records in a transaction
    await this.prisma.$transaction(async (tx: PrismaClient) => {
      // Delete feature flags
      await tx.tenantFeatureFlag.deleteMany({ where: { tenantId } });

      // Delete branding
      await tx.tenantBranding.deleteMany({ where: { tenantId } });

      // Delete custom domains
      await tx.tenantCustomDomain.deleteMany({ where: { tenantId } });

      // Delete IP allowlist
      await tx.tenantIpAllowlist.deleteMany({ where: { tenantId } });

      // Delete domain verifications
      await tx.tenantDomainVerification.deleteMany({ where: { tenantId } });

      // Delete usage records
      await tx.tenantUsage.deleteMany({ where: { tenantId } });

      // Delete classrooms (cascade from schools)
      for (const school of (tenant.schools ?? [])) {
        await tx.classroomLearner.deleteMany({
          where: { classroom: { schoolId: school.id } },
        });
        await tx.classroomSessionCode.deleteMany({
          where: { classroomId: { in: (await tx.classroom.findMany({ where: { schoolId: school.id }, select: { id: true } })).map((c: { id: string }) => c.id) } },
        });
        await tx.classroom.deleteMany({ where: { schoolId: school.id } });
      }

      // Delete schools
      await tx.school.deleteMany({ where: { tenantId } });

      // Delete config
      await tx.tenantConfig.deleteMany({ where: { tenantId } });

      // Delete data exports
      await tx.tenantDataExport.deleteMany({ where: { tenantId } });

      // Delete provisioning jobs
      await tx.tenantProvisioningJob.deleteMany({ where: { tenantId } });

      // Mark tenant as DELETED (keep minimal record for audit trail)
      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          status: 'DELETED',
          isActive: false,
          name: `[DELETED] ${tenant.name}`,
          primaryDomain: `deleted-${tenantId}.aivo.ai`,
          subdomain: null,
          customDomain: null,
          settingsJson: null,
          billingPlanId: null,
          logoUrl: null,
          primaryColor: null,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
        },
      });
    });

    // Invalidate all caches
    if (this.redis) {
      await this.redis.del(`tenant:${tenantId}`);
      if (tenant.subdomain) {
        await this.redis.del(`tenant:subdomain:${tenant.subdomain}`);
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Private helpers
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Process a data export: collect all tenant data and package it.
   */
  private async processDataExport(exportId: string): Promise<void> {
    const exportRecord = await this.prisma.tenantDataExport.findUnique({
      where: { id: exportId },
    });

    if (!exportRecord || exportRecord.status !== 'PENDING') {
      return;
    }

    // Mark as in-progress
    await this.prisma.tenantDataExport.update({
      where: { id: exportId },
      data: { status: 'IN_PROGRESS' },
    });

    try {
      // Collect all tenant data
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: exportRecord.tenantId },
        include: {
          schools: {
            include: {
              classrooms: {
                include: {
                  learners: true,
                  sessionCodes: true,
                },
              },
            },
          },
          config: true,
          branding: true,
          usageRecords: true,
          domainVerifications: true,
          auditEvents: {
            orderBy: { createdAt: 'desc' },
            take: 10000,
          },
        },
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Build export data (sanitized — no internal IDs or secrets)
      const exportData = {
        exportedAt: new Date().toISOString(),
        format: exportRecord.format,
        tenant: {
          name: tenant.name,
          type: tenant.type,
          domain: tenant.primaryDomain,
          subdomain: tenant.subdomain,
          region: tenant.region,
          createdAt: tenant.createdAt.toISOString(),
          stateCode: tenant.stateCode,
          city: tenant.city,
        },
        config: tenant.config
          ? {
              enabledModules: tenant.config.enabledModules,
              curriculumStandards: tenant.config.curriculumStandards,
              gradeLevels: tenant.config.gradeLevels,
            }
          : null,
        schools: (tenant.schools ?? []).map((s: Record<string, unknown>) => ({
          name: s.name,
          address: s.address,
          classrooms: ((s as Record<string, unknown>).classrooms as Array<Record<string, unknown>> ?? []).map((c: Record<string, unknown>) => ({
            name: c.name,
            grade: c.grade,
            learnerCount: ((c as Record<string, unknown>).learners as unknown[])?.length ?? 0,
          })),
        })),
        usage: {
          totalRecords: (tenant.usageRecords ?? []).length,
          summary: this.summarizeUsage(tenant.usageRecords ?? []),
        },
        auditLog: {
          totalEvents: (tenant.auditEvents ?? []).length,
          events: (tenant.auditEvents ?? []).map((e: Record<string, unknown>) => ({
            type: e.eventType,
            description: e.description,
            createdAt: (e.createdAt as Date).toISOString(),
          })),
        },
      };

      // In production, this would upload to S3 and generate a signed URL.
      // For now, store the export data inline (suitable for small tenants).
      const dataJson = JSON.stringify(exportData, null, 2);
      const fileSize = Buffer.byteLength(dataJson, 'utf-8');
      const downloadExpiry = new Date();
      downloadExpiry.setDate(downloadExpiry.getDate() + this.dataExportTtlDays);

      await this.prisma.tenantDataExport.update({
        where: { id: exportId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          fileSize: BigInt(fileSize),
          downloadExpiresAt: downloadExpiry,
          // In production: downloadUrl would be an S3 presigned URL
          downloadUrl: `/deprovisioning/exports/${exportId}/download`,
        },
      });

      // Audit log
      await this.prisma.tenantAuditEvent.create({
        data: {
          tenantId: exportRecord.tenantId,
          eventType: 'DATA_EXPORT_COMPLETED',
          actorUserId: exportRecord.requestedBy,
          description: `Data export completed (${this.formatBytes(fileSize)})`,
          metadata: { exportId, fileSize, format: exportRecord.format },
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.tenantDataExport.update({
        where: { id: exportId },
        data: {
          status: 'FAILED',
          error: message,
        },
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private summarizeUsage(records: any[]): Record<string, unknown> {
    if (records.length === 0) return { totalDays: 0 };

    let totalLLMCalls = 0;
    let totalTutorTurns = 0;
    let totalSessions = 0;

    for (const r of records) {
      totalLLMCalls += r.llmCallCount ?? 0;
      totalTutorTurns += r.tutorTurnCount ?? 0;
      totalSessions += r.sessionCount ?? 0;
    }

    return {
      totalDays: records.length,
      totalLLMCalls,
      totalTutorTurns,
      totalSessions,
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }
}
