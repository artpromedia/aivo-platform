/**
 * Licensing Repository
 *
 * Data access layer for seat entitlements, license assignments, and licensing events.
 */

import type { Prisma } from '../../generated/prisma-client/index.js';

import { prisma } from '../prisma.js';
import type {
  CreateLicenseAssignmentSchema,
  CreateLicenseEventSchema,
  CreateSeatEntitlementSchema,
  GradeBand,
  LicenseAssignment,
  LicenseAssignmentStatus,
  LicenseAssignmentWithEntitlement,
  LicenseEvent,
  LicenseEventType,
  SeatCapEnforcement,
  SeatEntitlement,
  SeatEntitlementWithAssignments,
  TenantSeatUsage,
  UpdateSeatEntitlementSchema,
} from '../types.js';

// ============================================================================
// Seat Entitlement Repository
// ============================================================================

export class SeatEntitlementRepository {
  /**
   * Create a new seat entitlement.
   */
  async create(
    data: Zod.infer<typeof CreateSeatEntitlementSchema>
  ): Promise<SeatEntitlement> {
    return prisma.seatEntitlement.create({
      data: {
        ...data,
        quantityAllocated: 0,
        overageCount: 0,
        isActive: true,
        metadataJson: data.metadataJson ?? Prisma.JsonNull,
      },
    }) as unknown as SeatEntitlement;
  }

  /**
   * Get entitlement by ID.
   */
  async getById(id: string): Promise<SeatEntitlement | null> {
    return prisma.seatEntitlement.findUnique({
      where: { id },
    }) as unknown as SeatEntitlement | null;
  }

  /**
   * Get entitlement with assignments.
   */
  async getByIdWithAssignments(
    id: string
  ): Promise<SeatEntitlementWithAssignments | null> {
    return prisma.seatEntitlement.findUnique({
      where: { id },
      include: {
        licenseAssignments: {
          where: { status: 'ACTIVE' },
        },
      },
    }) as unknown as SeatEntitlementWithAssignments | null;
  }

  /**
   * Find entitlement for a tenant, contract, and SKU.
   */
  async findByTenantContractSku(
    tenantId: string,
    contractId: string,
    sku: string
  ): Promise<SeatEntitlement | null> {
    return prisma.seatEntitlement.findUnique({
      where: {
        tenantId_contractId_sku: { tenantId, contractId, sku },
      },
    }) as unknown as SeatEntitlement | null;
  }

  /**
   * Find active entitlements for a tenant and grade band.
   */
  async findActiveByTenantGradeBand(
    tenantId: string,
    gradeBand: GradeBand
  ): Promise<SeatEntitlement[]> {
    const now = new Date();
    return prisma.seatEntitlement.findMany({
      where: {
        tenantId,
        gradeBand,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { endDate: 'desc' }, // Prefer entitlement that ends later
    }) as unknown as SeatEntitlement[];
  }

  /**
   * Get all active entitlements for a tenant.
   */
  async listActiveByTenant(tenantId: string): Promise<SeatEntitlement[]> {
    const now = new Date();
    return prisma.seatEntitlement.findMany({
      where: {
        tenantId,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: [{ gradeBand: 'asc' }, { endDate: 'desc' }],
    }) as unknown as SeatEntitlement[];
  }

  /**
   * Get entitlements for a contract.
   */
  async listByContract(contractId: string): Promise<SeatEntitlement[]> {
    return prisma.seatEntitlement.findMany({
      where: { contractId },
      orderBy: { gradeBand: 'asc' },
    }) as unknown as SeatEntitlement[];
  }

  /**
   * Update an entitlement.
   */
  async update(
    id: string,
    data: Zod.infer<typeof UpdateSeatEntitlementSchema>
  ): Promise<SeatEntitlement> {
    return prisma.seatEntitlement.update({
      where: { id },
      data: {
        ...data,
        metadataJson: data.metadataJson ?? undefined,
      },
    }) as unknown as SeatEntitlement;
  }

  /**
   * Increment allocated count.
   */
  async incrementAllocated(
    id: string,
    isOverage: boolean
  ): Promise<SeatEntitlement> {
    return prisma.seatEntitlement.update({
      where: { id },
      data: {
        quantityAllocated: { increment: 1 },
        overageCount: isOverage ? { increment: 1 } : undefined,
      },
    }) as unknown as SeatEntitlement;
  }

  /**
   * Decrement allocated count.
   */
  async decrementAllocated(
    id: string,
    wasOverage: boolean
  ): Promise<SeatEntitlement> {
    return prisma.seatEntitlement.update({
      where: { id },
      data: {
        quantityAllocated: { decrement: 1 },
        overageCount: wasOverage ? { decrement: 1 } : undefined,
      },
    }) as unknown as SeatEntitlement;
  }

  /**
   * Deactivate entitlements for a contract.
   */
  async deactivateByContract(contractId: string): Promise<number> {
    const result = await prisma.seatEntitlement.updateMany({
      where: { contractId },
      data: { isActive: false },
    });
    return result.count;
  }

  /**
   * Get seat usage statistics for a tenant.
   */
  async getTenantSeatUsage(tenantId: string): Promise<TenantSeatUsage[]> {
    const now = new Date();
    const entitlements = await prisma.seatEntitlement.findMany({
      where: {
        tenantId,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });

    return entitlements.map((e) => ({
      tenantId: e.tenantId,
      gradeBand: e.gradeBand as GradeBand,
      sku: e.sku,
      seatsCommitted: e.quantityCommitted,
      seatsAllocated: e.quantityAllocated,
      seatsAvailable: Math.max(0, e.quantityCommitted - e.quantityAllocated),
      overageCount: e.overageCount,
      overageLimit: e.overageLimit,
      utilizationPercent:
        e.quantityCommitted > 0
          ? Math.round((e.quantityAllocated / e.quantityCommitted) * 100)
          : 0,
      isOverCap: e.quantityAllocated > e.quantityCommitted,
      enforcement: e.enforcement as SeatCapEnforcement,
    }));
  }

  /**
   * Find expiring entitlements.
   */
  async findExpiringSoon(days: number): Promise<SeatEntitlement[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    return prisma.seatEntitlement.findMany({
      where: {
        isActive: true,
        endDate: { lte: cutoff },
      },
      orderBy: { endDate: 'asc' },
    }) as unknown as SeatEntitlement[];
  }
}

// ============================================================================
// License Assignment Repository
// ============================================================================

export class LicenseAssignmentRepository {
  /**
   * Create a new license assignment.
   */
  async create(
    data: Zod.infer<typeof CreateLicenseAssignmentSchema> & {
      isOverage?: boolean;
    }
  ): Promise<LicenseAssignment> {
    return prisma.licenseAssignment.create({
      data: {
        ...data,
        status: 'ACTIVE',
        isOverage: data.isOverage ?? false,
        metadataJson: data.metadataJson ?? Prisma.JsonNull,
      },
    }) as unknown as LicenseAssignment;
  }

  /**
   * Get assignment by ID.
   */
  async getById(id: string): Promise<LicenseAssignment | null> {
    return prisma.licenseAssignment.findUnique({
      where: { id },
    }) as unknown as LicenseAssignment | null;
  }

  /**
   * Get assignment with entitlement.
   */
  async getByIdWithEntitlement(
    id: string
  ): Promise<LicenseAssignmentWithEntitlement | null> {
    return prisma.licenseAssignment.findUnique({
      where: { id },
      include: { entitlement: true },
    }) as unknown as LicenseAssignmentWithEntitlement | null;
  }

  /**
   * Find active assignment for a learner.
   */
  async findActiveByLearnerId(
    learnerId: string
  ): Promise<LicenseAssignment | null> {
    return prisma.licenseAssignment.findFirst({
      where: {
        learnerId,
        status: 'ACTIVE',
      },
    }) as unknown as LicenseAssignment | null;
  }

  /**
   * Find active assignment for a learner in a specific tenant.
   */
  async findActiveByTenantLearnerId(
    tenantId: string,
    learnerId: string
  ): Promise<LicenseAssignment | null> {
    return prisma.licenseAssignment.findFirst({
      where: {
        tenantId,
        learnerId,
        status: 'ACTIVE',
      },
    }) as unknown as LicenseAssignment | null;
  }

  /**
   * List active assignments for an entitlement.
   */
  async listActiveByEntitlement(
    entitlementId: string
  ): Promise<LicenseAssignment[]> {
    return prisma.licenseAssignment.findMany({
      where: {
        entitlementId,
        status: 'ACTIVE',
      },
      orderBy: { assignedAt: 'desc' },
    }) as unknown as LicenseAssignment[];
  }

  /**
   * List active assignments for a school.
   */
  async listActiveBySchool(schoolId: string): Promise<LicenseAssignment[]> {
    return prisma.licenseAssignment.findMany({
      where: {
        schoolId,
        status: 'ACTIVE',
      },
      orderBy: { assignedAt: 'desc' },
    }) as unknown as LicenseAssignment[];
  }

  /**
   * List active assignments for a tenant by grade band.
   */
  async listActiveByTenantGradeBand(
    tenantId: string,
    gradeBand: GradeBand
  ): Promise<LicenseAssignment[]> {
    return prisma.licenseAssignment.findMany({
      where: {
        tenantId,
        gradeBand,
        status: 'ACTIVE',
      },
      orderBy: { assignedAt: 'desc' },
    }) as unknown as LicenseAssignment[];
  }

  /**
   * Count active assignments for an entitlement.
   */
  async countActiveByEntitlement(entitlementId: string): Promise<number> {
    return prisma.licenseAssignment.count({
      where: {
        entitlementId,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Count active overage assignments for an entitlement.
   */
  async countOverageByEntitlement(entitlementId: string): Promise<number> {
    return prisma.licenseAssignment.count({
      where: {
        entitlementId,
        status: 'ACTIVE',
        isOverage: true,
      },
    });
  }

  /**
   * Revoke an assignment.
   */
  async revoke(
    id: string,
    reason?: string,
    revokedBy?: string
  ): Promise<LicenseAssignment> {
    return prisma.licenseAssignment.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedReason: reason,
        revokedBy,
      },
    }) as unknown as LicenseAssignment;
  }

  /**
   * Mark assignment as transferred.
   */
  async markTransferred(id: string): Promise<LicenseAssignment> {
    return prisma.licenseAssignment.update({
      where: { id },
      data: {
        status: 'TRANSFERRED',
        revokedAt: new Date(),
      },
    }) as unknown as LicenseAssignment;
  }

  /**
   * Expire assignments for an entitlement.
   */
  async expireByEntitlement(entitlementId: string): Promise<number> {
    const result = await prisma.licenseAssignment.updateMany({
      where: {
        entitlementId,
        status: 'ACTIVE',
      },
      data: {
        status: 'EXPIRED',
        revokedAt: new Date(),
      },
    });
    return result.count;
  }

  /**
   * Get assignments by status.
   */
  async listByStatus(
    tenantId: string,
    status: LicenseAssignmentStatus
  ): Promise<LicenseAssignment[]> {
    return prisma.licenseAssignment.findMany({
      where: { tenantId, status },
      orderBy: { assignedAt: 'desc' },
    }) as unknown as LicenseAssignment[];
  }
}

// ============================================================================
// License Event Repository
// ============================================================================

export class LicenseEventRepository {
  /**
   * Create a license event.
   */
  async create(
    data: Zod.infer<typeof CreateLicenseEventSchema>
  ): Promise<LicenseEvent> {
    return prisma.licenseEvent.create({
      data: {
        ...data,
        metadataJson: data.metadataJson ?? Prisma.JsonNull,
        previousValue: data.previousValue ?? Prisma.JsonNull,
        newValue: data.newValue ?? Prisma.JsonNull,
      },
    }) as unknown as LicenseEvent;
  }

  /**
   * List events for a tenant.
   */
  async listByTenant(
    tenantId: string,
    limit = 100
  ): Promise<LicenseEvent[]> {
    return prisma.licenseEvent.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }) as unknown as LicenseEvent[];
  }

  /**
   * List events for an entitlement.
   */
  async listByEntitlement(
    entitlementId: string,
    limit = 50
  ): Promise<LicenseEvent[]> {
    return prisma.licenseEvent.findMany({
      where: { entitlementId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }) as unknown as LicenseEvent[];
  }

  /**
   * List events for a learner.
   */
  async listByLearner(
    learnerId: string,
    limit = 50
  ): Promise<LicenseEvent[]> {
    return prisma.licenseEvent.findMany({
      where: { learnerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }) as unknown as LicenseEvent[];
  }

  /**
   * List events by type for a tenant.
   */
  async listByType(
    tenantId: string,
    eventType: LicenseEventType,
    limit = 50
  ): Promise<LicenseEvent[]> {
    return prisma.licenseEvent.findMany({
      where: { tenantId, eventType },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }) as unknown as LicenseEvent[];
  }

  /**
   * Count overage events for a tenant in a time range.
   */
  async countOverageEvents(
    tenantId: string,
    since: Date
  ): Promise<{ warnings: number; blocked: number }> {
    const [warnings, blocked] = await Promise.all([
      prisma.licenseEvent.count({
        where: {
          tenantId,
          eventType: 'OVERAGE_WARNING',
          createdAt: { gte: since },
        },
      }),
      prisma.licenseEvent.count({
        where: {
          tenantId,
          eventType: 'OVERAGE_BLOCKED',
          createdAt: { gte: since },
        },
      }),
    ]);
    return { warnings, blocked };
  }
}

// ============================================================================
// Repository Instances
// ============================================================================

export const seatEntitlementRepository = new SeatEntitlementRepository();
export const licenseAssignmentRepository = new LicenseAssignmentRepository();
export const licenseEventRepository = new LicenseEventRepository();
