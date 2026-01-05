/**
 * Licensing Service
 *
 * Manages seat entitlements, license assignments, and enforcement.
 * Handles the full lifecycle of seat-based licensing for district contracts.
 */

import { prisma } from '../prisma.js';
import {
  licenseAssignmentRepository,
  licenseEventRepository,
  seatEntitlementRepository,
} from '../repositories/licensing.repository.js';
import {
  type EnforcementDecision,
  type GradeBand,
  getGradeBandForSku,
  getSkuForGradeBand,
  gradeToGradeBand,
  isSeatSku,
  type LicenseAssignment,
  type LicenseAssignmentResult,
  type LicenseAvailabilityResult,
  LicenseEventType,
  type SeatCapEnforcement,
  type SeatEntitlement,
  type SyncEntitlementsRequest,
  type SyncEntitlementsResult,
  type TenantSeatUsage,
  type TenantSeatUsageSummary,
  type TransferLicenseRequest,
  type TransferLicenseResult,
} from '../types.js';

// ============================================================================
// Licensing Service
// ============================================================================

export class LicensingService {
  // --------------------------------------------------------------------------
  // Entitlement Sync
  // --------------------------------------------------------------------------

  /**
   * Sync seat entitlements from a contract's line items.
   * Creates or updates SeatEntitlement records for each seat-based SKU.
   */
  async syncEntitlementsFromContract(
    request: SyncEntitlementsRequest
  ): Promise<SyncEntitlementsResult> {
    const { contractId, forceRecreate = false } = request;

    const result: SyncEntitlementsResult = {
      contractId,
      created: 0,
      updated: 0,
      deactivated: 0,
      entitlements: [],
      errors: [],
    };

    // Get contract with line items
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: { lineItems: true },
    });

    if (!contract) {
      result.errors.push(`Contract not found: ${contractId}`);
      return result;
    }

    // Get existing entitlements for this contract
    const existingEntitlements = await seatEntitlementRepository.listByContract(
      contractId
    );
    const existingBySkuMap = new Map(
      existingEntitlements.map((e) => [e.sku, e])
    );

    // Process each seat-based line item
    const processedSkus = new Set<string>();

    // Use transaction to ensure atomic sync of all entitlements
    try {
      await prisma.$transaction(async (tx) => {
        for (const lineItem of contract.lineItems) {
          if (!isSeatSku(lineItem.sku)) {
            continue; // Skip non-seat SKUs (e.g., ORG_BASE, add-ons)
          }

          const gradeBand = getGradeBandForSku(lineItem.sku);
          if (!gradeBand) {
            result.errors.push(
              `Unknown grade band for SKU: ${lineItem.sku}`
            );
            continue;
          }

          processedSkus.add(lineItem.sku);
          const existing = existingBySkuMap.get(lineItem.sku);

          if (existing && !forceRecreate) {
            // Update existing entitlement within transaction
            const updated = await tx.seatEntitlement.update({
              where: { id: existing.id },
              data: {
                quantityCommitted: lineItem.quantityCommitted,
                startDate: lineItem.startDate ?? contract.startDate,
                endDate: lineItem.endDate ?? contract.endDate,
                isActive: contract.status === 'ACTIVE',
              },
            });

            result.updated++;
            result.entitlements.push(updated as unknown as SeatEntitlement);

            // Log event within transaction
            await tx.licenseEvent.create({
              data: {
                tenantId: contract.tenantId,
                eventType: LicenseEventType.ENTITLEMENT_UPDATED,
                entitlementId: existing.id,
                actorType: 'SYSTEM',
                description: `Updated entitlement for ${lineItem.sku}: ${lineItem.quantityCommitted} seats`,
                previousValue: { quantityCommitted: existing.quantityCommitted },
                newValue: { quantityCommitted: lineItem.quantityCommitted },
              },
            });
          } else {
            // Create new entitlement within transaction
            const entitlement = await tx.seatEntitlement.create({
              data: {
                tenantId: contract.tenantId,
                contractId: contract.id,
                lineItemId: lineItem.id,
                sku: lineItem.sku,
                gradeBand,
                quantityCommitted: lineItem.quantityCommitted,
                quantityAllocated: 0,
                overageAllowed: true, // Default to soft cap
                overageCount: 0,
                enforcement: 'SOFT',
                startDate: lineItem.startDate ?? contract.startDate,
                endDate: lineItem.endDate ?? contract.endDate,
                isActive: true,
              },
            });

            result.created++;
            result.entitlements.push(entitlement as unknown as SeatEntitlement);

            // Log event within transaction
            await tx.licenseEvent.create({
              data: {
                tenantId: contract.tenantId,
                eventType: LicenseEventType.ENTITLEMENT_CREATED,
                entitlementId: entitlement.id,
                actorType: 'SYSTEM',
                description: `Created entitlement for ${lineItem.sku}: ${lineItem.quantityCommitted} seats`,
                newValue: { sku: lineItem.sku, gradeBand, quantityCommitted: lineItem.quantityCommitted },
              },
            });
          }
        }

        // Deactivate entitlements for SKUs no longer in contract
        for (const existing of existingEntitlements) {
          if (!processedSkus.has(existing.sku) && existing.isActive) {
            await tx.seatEntitlement.update({
              where: { id: existing.id },
              data: { isActive: false },
            });
            result.deactivated++;

            await tx.licenseEvent.create({
              data: {
                tenantId: contract.tenantId,
                eventType: LicenseEventType.ENTITLEMENT_EXPIRED,
                entitlementId: existing.id,
                actorType: 'SYSTEM',
                description: `Deactivated entitlement for ${existing.sku}: SKU no longer in contract`,
              },
            });
          }
        }
      });
    } catch (error) {
      result.errors.push(
        `Transaction failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return result;
  }

  // --------------------------------------------------------------------------
  // License Assignment
  // --------------------------------------------------------------------------

  /**
   * Check if a license can be assigned to a learner.
   */
  async checkLicenseAvailability(
    tenantId: string,
    learnerId: string,
    gradeLevel: number | string
  ): Promise<LicenseAvailabilityResult> {
    const gradeBand = gradeToGradeBand(gradeLevel);
    
    // Check if learner already has an active license
    const existingAssignment =
      await licenseAssignmentRepository.findActiveByTenantLearnerId(
        tenantId,
        learnerId
      );

    if (existingAssignment) {
      // Already has a license - check if grade band matches
      if (existingAssignment.gradeBand === gradeBand) {
        return {
          canAssign: false,
          wouldBeOverage: false,
          entitlement: null,
          seatsRemaining: 0,
          overageRemaining: null,
          enforcement: 'SOFT',
          blockReason: 'Learner already has an active license for this grade band',
        };
      }
      // Different grade band - will need transfer
    }

    // Find active entitlement for this grade band
    const entitlements =
      await seatEntitlementRepository.findActiveByTenantGradeBand(
        tenantId,
        gradeBand
      );

    if (entitlements.length === 0) {
      return {
        canAssign: false,
        wouldBeOverage: false,
        entitlement: null,
        seatsRemaining: 0,
        overageRemaining: null,
        enforcement: 'HARD',
        blockReason: `No active entitlement found for grade band ${gradeBand}`,
      };
    }

    // Use the first valid entitlement (ordered by end date desc)
    const entitlement = entitlements[0];
    const seatsRemaining = Math.max(
      0,
      entitlement.quantityCommitted - entitlement.quantityAllocated
    );
    const overageRemaining = entitlement.overageLimit
      ? Math.max(0, entitlement.overageLimit - entitlement.overageCount)
      : entitlement.overageAllowed
        ? null // Unlimited overage
        : 0;

    const wouldBeOverage = seatsRemaining === 0;

    // Determine if assignment is allowed
    const decision = this.makeEnforcementDecision(
      entitlement,
      seatsRemaining,
      overageRemaining
    );

    return {
      canAssign: decision.allowed,
      wouldBeOverage,
      entitlement,
      seatsRemaining,
      overageRemaining,
      enforcement: entitlement.enforcement as SeatCapEnforcement,
      blockReason: decision.blockMessage,
    };
  }

  /**
   * Assign a license to a learner.
   */
  async assignLicense(
    tenantId: string,
    learnerId: string,
    gradeLevel: number | string,
    schoolId?: string,
    assignedBy?: string
  ): Promise<LicenseAssignmentResult> {
    const gradeBand = gradeToGradeBand(gradeLevel);
    const sku = getSkuForGradeBand(gradeBand);

    // Check availability first
    const availability = await this.checkLicenseAvailability(
      tenantId,
      learnerId,
      gradeLevel
    );

    if (!availability.canAssign) {
      // Check if this is because learner already has a license
      const existingAssignment =
        await licenseAssignmentRepository.findActiveByTenantLearnerId(
          tenantId,
          learnerId
        );

      if (existingAssignment && existingAssignment.gradeBand !== gradeBand) {
        // Need to transfer to different grade band
        const transferResult = await this.transferLicense({
          assignmentId: existingAssignment.id,
          newGradeBand: gradeBand,
          newSchoolId: schoolId,
          transferredBy: assignedBy,
        });

        if (transferResult.success && transferResult.newAssignment) {
          return {
            success: true,
            assignment: transferResult.newAssignment,
            isOverage: transferResult.newAssignment.isOverage,
            warning: null,
            error: null,
            entitlementStatus: await this.getEntitlementStatus(
              transferResult.newAssignment.entitlementId
            ),
          };
        }
      }

      // Cannot assign and not eligible for transfer
      if (availability.blockReason?.includes('already has an active license')) {
        const existingAssignmentAgain =
          await licenseAssignmentRepository.findActiveByTenantLearnerId(
            tenantId,
            learnerId
          );
        
        return {
          success: true, // Already licensed - not a failure
          assignment: existingAssignmentAgain,
          isOverage: existingAssignmentAgain?.isOverage ?? false,
          warning: 'Learner already has an active license',
          error: null,
          entitlementStatus: existingAssignmentAgain
            ? await this.getEntitlementStatus(existingAssignmentAgain.entitlementId)
            : { committed: 0, allocated: 0, remaining: 0, overageLimit: null, enforcement: 'SOFT' as SeatCapEnforcement },
        };
      }

      // Log blocked attempt
      if (availability.entitlement) {
        await this.logEvent({
          tenantId,
          eventType: LicenseEventType.OVERAGE_BLOCKED,
          entitlementId: availability.entitlement.id,
          learnerId,
          description: `License assignment blocked: ${availability.blockReason}`,
          metadataJson: {
            gradeBand,
            sku,
            seatsRemaining: availability.seatsRemaining,
          },
        });
      }

      return {
        success: false,
        assignment: null,
        isOverage: false,
        warning: null,
        error: availability.blockReason ?? 'License assignment not allowed',
        entitlementStatus: availability.entitlement
          ? await this.getEntitlementStatus(availability.entitlement.id)
          : { committed: 0, allocated: 0, remaining: 0, overageLimit: null, enforcement: 'HARD' as SeatCapEnforcement },
      };
    }

    // Create the assignment
    const entitlement = availability.entitlement!;
    const isOverage = availability.wouldBeOverage;

    try {
      // Create assignment in transaction
      const assignment = await prisma.$transaction(async (tx) => {
        // Create the assignment
        const newAssignment = await tx.licenseAssignment.create({
          data: {
            tenantId,
            entitlementId: entitlement.id,
            learnerId,
            sku,
            gradeBand,
            schoolId,
            status: 'ACTIVE',
            isOverage,
            assignedBy,
          },
        });

        // Increment entitlement allocation
        await tx.seatEntitlement.update({
          where: { id: entitlement.id },
          data: {
            quantityAllocated: { increment: 1 },
            overageCount: isOverage ? { increment: 1 } : undefined,
          },
        });

        return newAssignment;
      });

      // Log assignment event
      await this.logEvent({
        tenantId,
        eventType: LicenseEventType.LICENSE_ASSIGNED,
        entitlementId: entitlement.id,
        assignmentId: assignment.id,
        learnerId,
        actorId: assignedBy,
        actorType: assignedBy ? 'USER' : 'SYSTEM',
        description: `Assigned ${sku} license to learner (grade band: ${gradeBand})${isOverage ? ' [OVERAGE]' : ''}`,
        newValue: {
          sku,
          gradeBand,
          schoolId,
          isOverage,
        },
      });

      // Log overage warning if applicable
      let warning: string | null = null;
      if (isOverage) {
        warning = `Seat limit exceeded for ${gradeBand}. This assignment is in overage.`;
        await this.logEvent({
          tenantId,
          eventType: LicenseEventType.OVERAGE_WARNING,
          entitlementId: entitlement.id,
          assignmentId: assignment.id,
          learnerId,
          description: warning,
          metadataJson: {
            committed: entitlement.quantityCommitted,
            allocated: entitlement.quantityAllocated + 1,
            overage: entitlement.overageCount + 1,
          },
        });
      }

      return {
        success: true,
        assignment: assignment as unknown as LicenseAssignment,
        isOverage,
        warning,
        error: null,
        entitlementStatus: await this.getEntitlementStatus(entitlement.id),
      };
    } catch (error) {
      return {
        success: false,
        assignment: null,
        isOverage: false,
        warning: null,
        error: `Failed to assign license: ${error instanceof Error ? error.message : String(error)}`,
        entitlementStatus: await this.getEntitlementStatus(entitlement.id),
      };
    }
  }

  /**
   * Revoke a license assignment.
   */
  async revokeLicense(
    assignmentId: string,
    reason?: string,
    revokedBy?: string
  ): Promise<{ success: boolean; error: string | null }> {
    const assignment =
      await licenseAssignmentRepository.getByIdWithEntitlement(assignmentId);

    if (!assignment) {
      return { success: false, error: 'Assignment not found' };
    }

    if (assignment.status !== 'ACTIVE') {
      return { success: false, error: `Assignment is already ${assignment.status}` };
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Revoke the assignment
        await tx.licenseAssignment.update({
          where: { id: assignmentId },
          data: {
            status: 'REVOKED',
            revokedAt: new Date(),
            revokedReason: reason,
            revokedBy,
          },
        });

        // Decrement entitlement allocation
        await tx.seatEntitlement.update({
          where: { id: assignment.entitlementId },
          data: {
            quantityAllocated: { decrement: 1 },
            overageCount: assignment.isOverage ? { decrement: 1 } : undefined,
          },
        });
      });

      // Log event
      await this.logEvent({
        tenantId: assignment.tenantId,
        eventType: LicenseEventType.LICENSE_REVOKED,
        entitlementId: assignment.entitlementId,
        assignmentId,
        learnerId: assignment.learnerId ?? undefined,
        actorId: revokedBy,
        actorType: revokedBy ? 'USER' : 'SYSTEM',
        description: `Revoked ${assignment.sku} license${reason ? `: ${reason}` : ''}`,
        previousValue: {
          status: 'ACTIVE',
          isOverage: assignment.isOverage,
        },
      });

      return { success: true, error: null };
    } catch (error) {
      return {
        success: false,
        error: `Failed to revoke license: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Transfer a license to a different grade band (e.g., when learner moves grades).
   */
  async transferLicense(
    request: TransferLicenseRequest
  ): Promise<TransferLicenseResult> {
    const { assignmentId, newGradeBand, newSchoolId, transferredBy } = request;

    const currentAssignment =
      await licenseAssignmentRepository.getByIdWithEntitlement(assignmentId);

    if (!currentAssignment) {
      return {
        success: false,
        previousAssignment: null,
        newAssignment: null,
        error: 'Assignment not found',
      };
    }

    if (currentAssignment.status !== 'ACTIVE') {
      return {
        success: false,
        previousAssignment: currentAssignment,
        newAssignment: null,
        error: `Cannot transfer: assignment is ${currentAssignment.status}`,
      };
    }

    if (currentAssignment.gradeBand === newGradeBand) {
      return {
        success: false,
        previousAssignment: currentAssignment,
        newAssignment: null,
        error: 'Learner is already in the requested grade band',
      };
    }

    // Check availability in new grade band
    const newSku = getSkuForGradeBand(newGradeBand);
    const newEntitlements =
      await seatEntitlementRepository.findActiveByTenantGradeBand(
        currentAssignment.tenantId,
        newGradeBand
      );

    if (newEntitlements.length === 0) {
      return {
        success: false,
        previousAssignment: currentAssignment,
        newAssignment: null,
        error: `No active entitlement for grade band ${newGradeBand}`,
      };
    }

    const newEntitlement = newEntitlements[0];
    const seatsRemaining = Math.max(
      0,
      newEntitlement.quantityCommitted - newEntitlement.quantityAllocated
    );
    const overageRemaining = newEntitlement.overageLimit
      ? Math.max(0, newEntitlement.overageLimit - newEntitlement.overageCount)
      : newEntitlement.overageAllowed
        ? null
        : 0;

    const decision = this.makeEnforcementDecision(
      newEntitlement,
      seatsRemaining,
      overageRemaining
    );

    if (!decision.allowed) {
      return {
        success: false,
        previousAssignment: currentAssignment,
        newAssignment: null,
        error: decision.blockMessage ?? 'Transfer not allowed: seat limit reached',
      };
    }

    const isOverage = seatsRemaining === 0;

    try {
      const [oldAssignment, newAssignment] = await prisma.$transaction(
        async (tx) => {
          // Mark old assignment as transferred
          const old = await tx.licenseAssignment.update({
            where: { id: assignmentId },
            data: {
              status: 'TRANSFERRED',
              revokedAt: new Date(),
            },
          });

          // Decrement old entitlement
          await tx.seatEntitlement.update({
            where: { id: currentAssignment.entitlementId },
            data: {
              quantityAllocated: { decrement: 1 },
              overageCount: currentAssignment.isOverage
                ? { decrement: 1 }
                : undefined,
            },
          });

          // Create new assignment
          const created = await tx.licenseAssignment.create({
            data: {
              tenantId: currentAssignment.tenantId,
              entitlementId: newEntitlement.id,
              learnerId: currentAssignment.learnerId,
              teacherId: currentAssignment.teacherId,
              sku: newSku,
              gradeBand: newGradeBand,
              schoolId: newSchoolId ?? currentAssignment.schoolId,
              status: 'ACTIVE',
              isOverage,
              assignedBy: transferredBy,
              previousAssignmentId: assignmentId,
            },
          });

          // Increment new entitlement
          await tx.seatEntitlement.update({
            where: { id: newEntitlement.id },
            data: {
              quantityAllocated: { increment: 1 },
              overageCount: isOverage ? { increment: 1 } : undefined,
            },
          });

          return [old, created];
        }
      );

      // Log event
      await this.logEvent({
        tenantId: currentAssignment.tenantId,
        eventType: LicenseEventType.LICENSE_TRANSFERRED,
        entitlementId: newEntitlement.id,
        assignmentId: newAssignment.id,
        learnerId: currentAssignment.learnerId ?? undefined,
        actorId: transferredBy,
        actorType: transferredBy ? 'USER' : 'SYSTEM',
        description: `Transferred license from ${currentAssignment.gradeBand} to ${newGradeBand}`,
        previousValue: {
          gradeBand: currentAssignment.gradeBand,
          sku: currentAssignment.sku,
          entitlementId: currentAssignment.entitlementId,
        },
        newValue: {
          gradeBand: newGradeBand,
          sku: newSku,
          entitlementId: newEntitlement.id,
          isOverage,
        },
      });

      return {
        success: true,
        previousAssignment: oldAssignment as unknown as LicenseAssignment,
        newAssignment: newAssignment as unknown as LicenseAssignment,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        previousAssignment: currentAssignment,
        newAssignment: null,
        error: `Transfer failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Enforcement Helpers
  // --------------------------------------------------------------------------

  /**
   * Make an enforcement decision for a seat assignment.
   */
  private makeEnforcementDecision(
    entitlement: SeatEntitlement,
    seatsRemaining: number,
    overageRemaining: number | null
  ): EnforcementDecision {
    // Seats available - always allowed
    if (seatsRemaining > 0) {
      return {
        allowed: true,
        isOverage: false,
        warning: null,
        blockMessage: null,
        enforcement: entitlement.enforcement as SeatCapEnforcement,
      };
    }

    // No seats remaining - check enforcement mode
    switch (entitlement.enforcement) {
      case 'UNLIMITED':
        return {
          allowed: true,
          isOverage: true,
          warning: 'Seat limit exceeded (unlimited enforcement)',
          blockMessage: null,
          enforcement: 'UNLIMITED',
        };

      case 'SOFT':
        // Check overage limit
        if (overageRemaining !== null && overageRemaining <= 0) {
          return {
            allowed: false,
            isOverage: false,
            warning: null,
            blockMessage: `Overage limit reached (${entitlement.overageLimit} seats). Contact sales to increase capacity.`,
            enforcement: 'SOFT',
          };
        }
        return {
          allowed: true,
          isOverage: true,
          warning: `Seat limit (${entitlement.quantityCommitted}) exceeded. Assignment will be marked as overage.`,
          blockMessage: null,
          enforcement: 'SOFT',
        };

      case 'HARD':
        return {
          allowed: false,
          isOverage: false,
          warning: null,
          blockMessage: `Seat limit (${entitlement.quantityCommitted}) reached. Contact Aivo to add more seats.`,
          enforcement: 'HARD',
        };

      default:
        return {
          allowed: false,
          isOverage: false,
          warning: null,
          blockMessage: 'Unknown enforcement mode',
          enforcement: 'HARD',
        };
    }
  }

  /**
   * Get current entitlement status for a given entitlement ID.
   */
  private async getEntitlementStatus(entitlementId: string): Promise<{
    committed: number;
    allocated: number;
    remaining: number;
    overageLimit: number | null;
    enforcement: SeatCapEnforcement;
  }> {
    const entitlement = await seatEntitlementRepository.getById(entitlementId);
    if (!entitlement) {
      return {
        committed: 0,
        allocated: 0,
        remaining: 0,
        overageLimit: null,
        enforcement: 'HARD',
      };
    }
    return {
      committed: entitlement.quantityCommitted,
      allocated: entitlement.quantityAllocated,
      remaining: Math.max(
        0,
        entitlement.quantityCommitted - entitlement.quantityAllocated
      ),
      overageLimit: entitlement.overageLimit,
      enforcement: entitlement.enforcement as SeatCapEnforcement,
    };
  }

  // --------------------------------------------------------------------------
  // Analytics & Monitoring
  // --------------------------------------------------------------------------

  /**
   * Get seat usage summary for a tenant.
   */
  async getTenantSeatUsageSummary(
    tenantId: string
  ): Promise<TenantSeatUsageSummary> {
    const usageByGradeBand = await seatEntitlementRepository.getTenantSeatUsage(
      tenantId
    );

    // Get active contracts for reference
    const contracts = await prisma.contract.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        contractNumber: true,
        status: true,
        endDate: true,
      },
    });

    const totalCommitted = usageByGradeBand.reduce(
      (sum, u) => sum + u.seatsCommitted,
      0
    );
    const totalAllocated = usageByGradeBand.reduce(
      (sum, u) => sum + u.seatsAllocated,
      0
    );
    const totalOverage = usageByGradeBand.reduce(
      (sum, u) => sum + u.overageCount,
      0
    );

    return {
      tenantId,
      totalCommitted,
      totalAllocated,
      totalOverage,
      utilizationPercent:
        totalCommitted > 0
          ? Math.round((totalAllocated / totalCommitted) * 100)
          : 0,
      byGradeBand: usageByGradeBand,
      contracts: contracts.map((c) => ({
        contractId: c.id,
        contractNumber: c.contractNumber,
        status: c.status,
        endDate: c.endDate.toISOString(),
      })),
    };
  }

  /**
   * Check if a learner has an active license.
   */
  async hasActiveLicense(
    tenantId: string,
    learnerId: string
  ): Promise<{ hasLicense: boolean; assignment: LicenseAssignment | null }> {
    const assignment =
      await licenseAssignmentRepository.findActiveByTenantLearnerId(
        tenantId,
        learnerId
      );
    return {
      hasLicense: !!assignment,
      assignment,
    };
  }

  /**
   * Get overage statistics for a tenant.
   */
  async getOverageStats(
    tenantId: string,
    sinceDays = 30
  ): Promise<{
    currentOverage: number;
    warningsThisPeriod: number;
    blockedThisPeriod: number;
  }> {
    const usage = await seatEntitlementRepository.getTenantSeatUsage(tenantId);
    const currentOverage = usage.reduce((sum, u) => sum + u.overageCount, 0);

    const since = new Date();
    since.setDate(since.getDate() - sinceDays);

    const events = await licenseEventRepository.countOverageEvents(
      tenantId,
      since
    );

    return {
      currentOverage,
      warningsThisPeriod: events.warnings,
      blockedThisPeriod: events.blocked,
    };
  }

  // --------------------------------------------------------------------------
  // Expiration Handling
  // --------------------------------------------------------------------------

  /**
   * Process expired entitlements and mark their assignments as expired.
   * Uses transaction to ensure atomic processing of expirations.
   */
  async processExpiredEntitlements(): Promise<{
    entitlementsExpired: number;
    assignmentsExpired: number;
  }> {
    const now = new Date();
    let entitlementsExpired = 0;
    let assignmentsExpired = 0;

    // Find active entitlements that have passed their end date
    const expiredEntitlements = await prisma.seatEntitlement.findMany({
      where: {
        isActive: true,
        endDate: { lt: now },
      },
    });

    // Process each expiration in its own transaction to prevent partial failures
    // from affecting other entitlements while maintaining atomicity per entitlement
    for (const entitlement of expiredEntitlements) {
      try {
        const expiredCount = await prisma.$transaction(async (tx) => {
          // Deactivate entitlement
          await tx.seatEntitlement.update({
            where: { id: entitlement.id },
            data: { isActive: false },
          });

          // Expire all active assignments for this entitlement
          const result = await tx.licenseAssignment.updateMany({
            where: {
              entitlementId: entitlement.id,
              status: 'ACTIVE',
            },
            data: {
              status: 'EXPIRED',
              revokedAt: now,
              revokedReason: 'Entitlement expired',
            },
          });

          // Log event within transaction
          await tx.licenseEvent.create({
            data: {
              tenantId: entitlement.tenantId,
              eventType: LicenseEventType.ENTITLEMENT_EXPIRED,
              entitlementId: entitlement.id,
              actorType: 'SYSTEM',
              description: `Entitlement expired: ${entitlement.sku}, ${result.count} assignments affected`,
              metadataJson: {
                assignmentsExpired: result.count,
                endDate: entitlement.endDate.toISOString(),
              },
            },
          });

          return result.count;
        });

        entitlementsExpired++;
        assignmentsExpired += expiredCount;
      } catch (error) {
        console.error(`Failed to expire entitlement ${entitlement.id}:`, error);
        // Continue processing other entitlements
      }
    }

    return { entitlementsExpired, assignmentsExpired };
  }

  // --------------------------------------------------------------------------
  // Event Logging
  // --------------------------------------------------------------------------

  /**
   * Log a licensing event.
   */
  private async logEvent(params: {
    tenantId: string;
    eventType: LicenseEventType;
    entitlementId?: string;
    assignmentId?: string;
    learnerId?: string;
    actorId?: string;
    actorType?: string;
    description: string;
    previousValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
    metadataJson?: Record<string, unknown>;
  }): Promise<void> {
    await licenseEventRepository.create({
      tenantId: params.tenantId,
      eventType: params.eventType,
      entitlementId: params.entitlementId,
      assignmentId: params.assignmentId,
      learnerId: params.learnerId,
      actorId: params.actorId,
      actorType: params.actorType ?? 'SYSTEM',
      description: params.description,
      previousValue: params.previousValue,
      newValue: params.newValue,
      metadataJson: params.metadataJson,
    });
  }
}

// ============================================================================
// Service Instance
// ============================================================================

export const licensingService = new LicensingService();
