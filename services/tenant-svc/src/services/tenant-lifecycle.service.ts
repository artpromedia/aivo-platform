/**
 * Tenant Lifecycle Service
 *
 * Manages the complete tenant lifecycle including:
 * - Creation with default configuration
 * - Updates with audit logging
 * - Soft delete with 90-day grace period
 * - Reactivation
 * - Hard delete (data purge)
 *
 * All operations are logged to the audit trail.
 *
 * @module services/tenant-lifecycle.service
 */

import type { Redis } from 'ioredis';

// Types will be properly typed after prisma generate is run
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClient = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tenant = any;

// ══════════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════════

export type TenantType = 'CONSUMER' | 'DISTRICT' | 'CLINIC';
export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_DELETE' | 'DELETED';
export type TenantAuditEventType =
  | 'TENANT_CREATED'
  | 'TENANT_UPDATED'
  | 'TENANT_SUSPENDED'
  | 'TENANT_REACTIVATED'
  | 'TENANT_DELETE_INITIATED'
  | 'TENANT_DELETE_CANCELLED'
  | 'TENANT_DELETED'
  | 'CONFIG_UPDATED'
  | 'DOMAIN_VERIFIED'
  | 'DOMAIN_REMOVED'
  | 'QUOTA_WARNING'
  | 'QUOTA_EXCEEDED'
  | 'QUOTA_RESET'
  | 'ADMIN_ACCESS';

export interface TenantData {
  id: string;
  type: TenantType;
  name: string;
  primaryDomain: string;
  billingPlanId?: string | null;
  settingsJson?: Record<string, unknown> | null;
  subdomain?: string | null;
  customDomain?: string | null;
  domainVerified: boolean;
  domainVerifiedAt?: Date | null;
  region: string;
  isActive: boolean;
  status: TenantStatus;
  deletedAt?: Date | null;
  deleteGraceEndsAt?: Date | null;
  deletedByUserId?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTenantInput {
  type: TenantType;
  name: string;
  primaryDomain: string;
  subdomain?: string;
  customDomain?: string;
  region?: string;
  logoUrl?: string;
  primaryColor?: string;
  billingPlanId?: string;
  settingsJson?: Record<string, unknown>;
}

export interface UpdateTenantInput {
  type?: TenantType;
  name?: string;
  primaryDomain?: string;
  subdomain?: string;
  customDomain?: string;
  region?: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  billingPlanId?: string | null;
  settingsJson?: Record<string, unknown> | null;
}

export interface ActorContext {
  userId: string;
  email?: string;
  role?: string;
  ip?: string;
}

export interface TenantLifecycleServiceConfig {
  redis?: Redis | null;
  prisma: PrismaClient;
  deleteGracePeriodDays?: number; // Default 90 days
}

// ══════════════════════════════════════════════════════════════════════════════
// Constants
// ══════════════════════════════════════════════════════════════════════════════

const DEFAULT_GRACE_PERIOD_DAYS = 90;

// ══════════════════════════════════════════════════════════════════════════════
// Service Implementation
// ══════════════════════════════════════════════════════════════════════════════

export class TenantLifecycleService {
  private readonly redis: Redis | null;
  private readonly prisma: PrismaClient;
  private readonly deleteGracePeriodDays: number;

  constructor(config: TenantLifecycleServiceConfig) {
    this.redis = config.redis ?? null;
    this.prisma = config.prisma;
    this.deleteGracePeriodDays = config.deleteGracePeriodDays ?? DEFAULT_GRACE_PERIOD_DAYS;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Tenant CRUD
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a new tenant with default configuration
   */
  async createTenant(input: CreateTenantInput, actor: ActorContext): Promise<TenantData> {
    // Validate required fields
    if (!input.name || !input.primaryDomain || !input.type) {
      throw new Error('name, primaryDomain, and type are required');
    }

    // Create tenant with config in a transaction
    const tenant = await this.prisma.$transaction(async (tx: PrismaClient) => {
      // Create tenant
      const newTenant = await tx.tenant.create({
        data: {
          type: input.type,
          name: input.name,
          primaryDomain: input.primaryDomain.toLowerCase(),
          subdomain: input.subdomain?.toLowerCase(),
          customDomain: input.customDomain?.toLowerCase(),
          region: input.region ?? 'us-east-1',
          logoUrl: input.logoUrl,
          primaryColor: input.primaryColor,
          billingPlanId: input.billingPlanId,
          settingsJson: input.settingsJson,
          status: 'ACTIVE',
          isActive: true,
        },
      });

      // Create default config
      await tx.tenantConfig.create({
        data: {
          tenantId: newTenant.id,
          // All defaults will be applied by Prisma
        },
      });

      // Log audit event
      await tx.tenantAuditEvent.create({
        data: {
          tenantId: newTenant.id,
          eventType: 'TENANT_CREATED',
          actorUserId: actor.userId,
          actorEmail: actor.email,
          actorRole: actor.role,
          actorIp: actor.ip,
          description: `Tenant "${input.name}" created`,
          afterState: this.mapToTenantData(newTenant),
        },
      });

      return newTenant;
    });

    return this.mapToTenantData(tenant);
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(tenantId: string): Promise<TenantData | null> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) return null;
    return this.mapToTenantData(tenant);
  }

  /**
   * Get tenant by subdomain
   */
  async getTenantBySubdomain(subdomain: string): Promise<TenantData | null> {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        subdomain: subdomain.toLowerCase(),
        status: { not: 'DELETED' },
      },
    });

    if (!tenant) return null;
    return this.mapToTenantData(tenant);
  }

  /**
   * Get tenant by custom domain
   */
  async getTenantByCustomDomain(domain: string): Promise<TenantData | null> {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        customDomain: domain.toLowerCase(),
        domainVerified: true,
        status: { not: 'DELETED' },
      },
    });

    if (!tenant) return null;
    return this.mapToTenantData(tenant);
  }

  /**
   * Update tenant
   */
  async updateTenant(
    tenantId: string,
    input: UpdateTenantInput,
    actor: ActorContext
  ): Promise<TenantData> {
    // Get current state for audit
    const currentTenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!currentTenant) {
      throw new Error('Tenant not found');
    }

    if (currentTenant.status === 'DELETED') {
      throw new Error('Cannot update deleted tenant');
    }

    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};

    if (input.type !== undefined) updateData.type = input.type;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.primaryDomain !== undefined)
      updateData.primaryDomain = input.primaryDomain.toLowerCase();
    if (input.subdomain !== undefined)
      updateData.subdomain = input.subdomain?.toLowerCase() ?? null;
    if (input.customDomain !== undefined) {
      updateData.customDomain = input.customDomain?.toLowerCase() ?? null;
      // Reset domain verification if domain changed
      if (
        input.customDomain !== currentTenant.customDomain &&
        currentTenant.domainVerified
      ) {
        updateData.domainVerified = false;
        updateData.domainVerifiedAt = null;
      }
    }
    if (input.region !== undefined) updateData.region = input.region;
    if (input.logoUrl !== undefined) updateData.logoUrl = input.logoUrl;
    if (input.primaryColor !== undefined) updateData.primaryColor = input.primaryColor;
    if (input.billingPlanId !== undefined) updateData.billingPlanId = input.billingPlanId;
    if (input.settingsJson !== undefined) updateData.settingsJson = input.settingsJson;

    const tenant = await this.prisma.$transaction(async (tx: PrismaClient) => {
      const updated = await tx.tenant.update({
        where: { id: tenantId },
        data: updateData,
      });

      // Log audit event
      await tx.tenantAuditEvent.create({
        data: {
          tenantId,
          eventType: 'TENANT_UPDATED',
          actorUserId: actor.userId,
          actorEmail: actor.email,
          actorRole: actor.role,
          actorIp: actor.ip,
          description: `Tenant "${updated.name}" updated`,
          beforeState: this.mapToTenantData(currentTenant),
          afterState: this.mapToTenantData(updated),
          metadata: { updatedFields: Object.keys(updateData) },
        },
      });

      return updated;
    });

    // Invalidate caches
    await this.invalidateTenantCaches(tenantId, currentTenant);

    return this.mapToTenantData(tenant);
  }

  /**
   * List tenants with optional filters
   */
  async listTenants(options?: {
    type?: TenantType;
    status?: TenantStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ items: TenantData[]; total: number }> {
    const where: Record<string, unknown> = {};

    if (options?.type) where.type = options.type;
    if (options?.status) {
      where.status = options.status;
    } else {
      // By default, exclude DELETED tenants
      where.status = { not: 'DELETED' };
    }

    const [items, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip: options?.offset ?? 0,
        take: options?.limit ?? 20,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return {
      items: items.map((t: Tenant) => this.mapToTenantData(t)),
      total,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Lifecycle Management
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Suspend a tenant (temporarily disable)
   *
   * Suspended tenants cannot login but data is preserved.
   */
  async suspendTenant(
    tenantId: string,
    reason: string,
    actor: ActorContext
  ): Promise<TenantData> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) throw new Error('Tenant not found');
    if (tenant.status === 'DELETED') throw new Error('Cannot suspend deleted tenant');
    if (tenant.status === 'SUSPENDED') throw new Error('Tenant is already suspended');

    const updated = await this.prisma.$transaction(async (tx: PrismaClient) => {
      const updatedTenant = await tx.tenant.update({
        where: { id: tenantId },
        data: {
          status: 'SUSPENDED',
          isActive: false,
        },
      });

      await tx.tenantAuditEvent.create({
        data: {
          tenantId,
          eventType: 'TENANT_SUSPENDED',
          actorUserId: actor.userId,
          actorEmail: actor.email,
          actorRole: actor.role,
          actorIp: actor.ip,
          description: `Tenant suspended: ${reason}`,
          beforeState: this.mapToTenantData(tenant),
          afterState: this.mapToTenantData(updatedTenant),
          metadata: { reason },
        },
      });

      return updatedTenant;
    });

    await this.invalidateTenantCaches(tenantId, tenant);
    return this.mapToTenantData(updated);
  }

  /**
   * Reactivate a suspended tenant
   */
  async reactivateTenant(tenantId: string, actor: ActorContext): Promise<TenantData> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) throw new Error('Tenant not found');
    if (tenant.status === 'DELETED') throw new Error('Cannot reactivate deleted tenant');
    if (tenant.status === 'ACTIVE') throw new Error('Tenant is already active');

    const updated = await this.prisma.$transaction(async (tx: PrismaClient) => {
      const updatedTenant = await tx.tenant.update({
        where: { id: tenantId },
        data: {
          status: 'ACTIVE',
          isActive: true,
          // Clear any delete-related fields
          deletedAt: null,
          deleteGraceEndsAt: null,
          deletedByUserId: null,
        },
      });

      const eventType =
        tenant.status === 'PENDING_DELETE' ? 'TENANT_DELETE_CANCELLED' : 'TENANT_REACTIVATED';

      await tx.tenantAuditEvent.create({
        data: {
          tenantId,
          eventType,
          actorUserId: actor.userId,
          actorEmail: actor.email,
          actorRole: actor.role,
          actorIp: actor.ip,
          description:
            eventType === 'TENANT_DELETE_CANCELLED'
              ? 'Tenant deletion cancelled and reactivated'
              : 'Tenant reactivated',
          beforeState: this.mapToTenantData(tenant),
          afterState: this.mapToTenantData(updatedTenant),
        },
      });

      return updatedTenant;
    });

    await this.invalidateTenantCaches(tenantId, tenant);
    return this.mapToTenantData(updated);
  }

  /**
   * Initiate soft delete of a tenant
   *
   * Sets status to PENDING_DELETE with a 90-day grace period.
   * During grace period:
   * - No new user logins allowed
   * - Data is preserved
   * - Tenant can be reactivated
   *
   * After grace period, hard delete can be triggered.
   */
  async initiateDelete(tenantId: string, actor: ActorContext): Promise<TenantData> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) throw new Error('Tenant not found');
    if (tenant.status === 'DELETED') throw new Error('Tenant is already deleted');
    if (tenant.status === 'PENDING_DELETE') throw new Error('Tenant deletion already pending');

    const now = new Date();
    const graceEndsAt = new Date(now);
    graceEndsAt.setDate(graceEndsAt.getDate() + this.deleteGracePeriodDays);

    const updated = await this.prisma.$transaction(async (tx: PrismaClient) => {
      const updatedTenant = await tx.tenant.update({
        where: { id: tenantId },
        data: {
          status: 'PENDING_DELETE',
          isActive: false,
          deletedAt: now,
          deleteGraceEndsAt: graceEndsAt,
          deletedByUserId: actor.userId,
        },
      });

      await tx.tenantAuditEvent.create({
        data: {
          tenantId,
          eventType: 'TENANT_DELETE_INITIATED',
          actorUserId: actor.userId,
          actorEmail: actor.email,
          actorRole: actor.role,
          actorIp: actor.ip,
          description: `Tenant deletion initiated. Grace period ends ${graceEndsAt.toISOString()}`,
          beforeState: this.mapToTenantData(tenant),
          afterState: this.mapToTenantData(updatedTenant),
          metadata: {
            graceEndsAt: graceEndsAt.toISOString(),
            gracePeriodDays: this.deleteGracePeriodDays,
          },
        },
      });

      return updatedTenant;
    });

    await this.invalidateTenantCaches(tenantId, tenant);
    return this.mapToTenantData(updated);
  }

  /**
   * Hard delete a tenant (permanently remove all data)
   *
   * Can only be called after grace period ends or by a super admin override.
   */
  async hardDelete(
    tenantId: string,
    actor: ActorContext,
    options?: { forceDelete?: boolean }
  ): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) throw new Error('Tenant not found');
    if (tenant.status === 'DELETED') throw new Error('Tenant is already deleted');

    // Check grace period unless force delete
    if (!options?.forceDelete) {
      if (tenant.status !== 'PENDING_DELETE') {
        throw new Error('Tenant must be in PENDING_DELETE status. Call initiateDelete first.');
      }

      if (tenant.deleteGraceEndsAt && new Date() < tenant.deleteGraceEndsAt) {
        const remainingDays = Math.ceil(
          (tenant.deleteGraceEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        throw new Error(
          `Grace period has not ended. ${remainingDays} days remaining. Use forceDelete for immediate deletion.`
        );
      }
    }

    await this.prisma.$transaction(async (tx: PrismaClient) => {
      // Log final audit event before deletion
      await tx.tenantAuditEvent.create({
        data: {
          tenantId,
          eventType: 'TENANT_DELETED',
          actorUserId: actor.userId,
          actorEmail: actor.email,
          actorRole: actor.role,
          actorIp: actor.ip,
          description: options?.forceDelete
            ? 'Tenant force-deleted (grace period bypassed)'
            : 'Tenant permanently deleted after grace period',
          beforeState: this.mapToTenantData(tenant),
          metadata: {
            forceDelete: options?.forceDelete ?? false,
          },
        },
      });

      // Update tenant to DELETED status (we keep the record for audit purposes)
      // In a production system, you might cascade delete related data here
      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          status: 'DELETED',
          isActive: false,
          // Clear sensitive data
          subdomain: null,
          customDomain: null,
          logoUrl: null,
          settingsJson: null,
          billingPlanId: null,
        },
      });

      // Delete related configuration
      await tx.tenantConfig.deleteMany({ where: { tenantId } });

      // Delete schools and cascade to classrooms
      await tx.school.deleteMany({ where: { tenantId } });

      // Delete domain verifications
      await tx.tenantDomainVerification.deleteMany({ where: { tenantId } });
    });

    await this.invalidateTenantCaches(tenantId, tenant);
  }

  /**
   * Get tenants pending deletion (for cleanup job)
   */
  async getTenantsReadyForDeletion(): Promise<TenantData[]> {
    const now = new Date();

    const tenants = await this.prisma.tenant.findMany({
      where: {
        status: 'PENDING_DELETE',
        deleteGraceEndsAt: {
          lte: now,
        },
      },
    });

    return tenants.map((t: Tenant) => this.mapToTenantData(t));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Audit Log
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Get audit events for a tenant
   */
  async getAuditEvents(
    tenantId: string,
    options?: {
      eventType?: TenantAuditEventType;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ items: unknown[]; total: number }> {
    const where: Record<string, unknown> = { tenantId };

    if (options?.eventType) where.eventType = options.eventType;
    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options?.startDate) {
        (where.createdAt as Record<string, unknown>).gte = options.startDate;
      }
      if (options?.endDate) {
        (where.createdAt as Record<string, unknown>).lte = options.endDate;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.tenantAuditEvent.findMany({
        where,
        skip: options?.offset ?? 0,
        take: options?.limit ?? 50,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenantAuditEvent.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Log a custom audit event
   */
  async logAuditEvent(
    tenantId: string,
    eventType: TenantAuditEventType,
    description: string,
    actor: ActorContext,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.prisma.tenantAuditEvent.create({
      data: {
        tenantId,
        eventType,
        actorUserId: actor.userId,
        actorEmail: actor.email,
        actorRole: actor.role,
        actorIp: actor.ip,
        description,
        metadata,
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Private Helpers
  // ════════════════════════════════════════════════════════════════════════════

  private mapToTenantData(tenant: Tenant): TenantData {
    return {
      id: tenant.id,
      type: tenant.type,
      name: tenant.name,
      primaryDomain: tenant.primaryDomain,
      billingPlanId: tenant.billingPlanId,
      settingsJson: tenant.settingsJson as Record<string, unknown> | null,
      subdomain: tenant.subdomain,
      customDomain: tenant.customDomain,
      domainVerified: tenant.domainVerified,
      domainVerifiedAt: tenant.domainVerifiedAt,
      region: tenant.region,
      isActive: tenant.isActive,
      status: tenant.status,
      deletedAt: tenant.deletedAt,
      deleteGraceEndsAt: tenant.deleteGraceEndsAt,
      deletedByUserId: tenant.deletedByUserId,
      logoUrl: tenant.logoUrl,
      primaryColor: tenant.primaryColor,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }

  private async invalidateTenantCaches(tenantId: string, tenant: Tenant): Promise<void> {
    if (!this.redis) return;

    const keysToDelete: string[] = [
      `tenant:id:${tenantId}`,
      `tenant:config:${tenantId}`,
      `tenant:usage:today:${tenantId}`,
    ];

    if (tenant.subdomain) {
      keysToDelete.push(`tenant:subdomain:${tenant.subdomain}`);
    }

    if (tenant.customDomain) {
      keysToDelete.push(`tenant:domain:${tenant.customDomain}`);
    }

    try {
      if (keysToDelete.length > 0) {
        await this.redis.del(...keysToDelete);
      }
    } catch {
      // Redis error - continue
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Singleton Helper
// ══════════════════════════════════════════════════════════════════════════════

let _tenantLifecycleService: TenantLifecycleService | null = null;

/**
 * Get the singleton TenantLifecycleService instance
 */
export function getTenantLifecycleService(
  config?: TenantLifecycleServiceConfig
): TenantLifecycleService {
  if (!_tenantLifecycleService) {
    if (!config) {
      throw new Error(
        'TenantLifecycleService not initialized. Call getTenantLifecycleService(config) first.'
      );
    }
    _tenantLifecycleService = new TenantLifecycleService(config);
  }
  return _tenantLifecycleService;
}
