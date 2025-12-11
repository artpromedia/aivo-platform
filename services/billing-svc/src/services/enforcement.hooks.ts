/**
 * License Enforcement Hooks
 *
 * Entry points for integrating licensing checks into the learner lifecycle.
 * These hooks are called at key moments:
 *   - Learner activation (after baseline, roster sync, etc.)
 *   - Module enablement (add-on access)
 *   - Grade band changes (learner promotion)
 *
 * Usage:
 *   import { enforcementHooks } from '@aivo/billing-svc';
 *   const result = await enforcementHooks.onLearnerActivation(tenantId, learnerId, gradeLevel);
 */

import { licensingService } from './licensing.service.js';
import type {
  GradeBand,
  LicenseAssignment,
  LicenseAssignmentResult,
  LicenseAvailabilityResult,
  TenantSeatUsageSummary,
} from '../types.js';
import { gradeToGradeBand } from '../types/licensing.types.js';

// ============================================================================
// Enforcement Hook Results
// ============================================================================

export interface EnforcementResult {
  allowed: boolean;
  assignment: LicenseAssignment | null;
  isOverage: boolean;
  warning: string | null;
  error: string | null;
  requiresAdminAction: boolean;
  adminMessage: string | null;
}

export interface ModuleAccessResult {
  hasAccess: boolean;
  reason: string | null;
  contractId: string | null;
  expiresAt: Date | null;
}

export interface GradeBandChangeResult {
  success: boolean;
  previousAssignment: LicenseAssignment | null;
  newAssignment: LicenseAssignment | null;
  isOverage: boolean;
  warning: string | null;
  error: string | null;
}

// ============================================================================
// Enforcement Hooks
// ============================================================================

export const enforcementHooks = {
  /**
   * Called when a learner is activated (e.g., after baseline completion).
   *
   * This is the primary entry point for license assignment.
   *
   * @param tenantId - The tenant (district) ID
   * @param learnerId - The learner's UUID
   * @param gradeLevel - The learner's grade (0 for K, 1-12 for grades)
   * @param schoolId - Optional school ID for tracking
   * @param actorId - Optional user ID who triggered the activation
   */
  async onLearnerActivation(
    tenantId: string,
    learnerId: string,
    gradeLevel: number | string,
    schoolId?: string,
    actorId?: string
  ): Promise<EnforcementResult> {
    const result = await licensingService.assignLicense(
      tenantId,
      learnerId,
      gradeLevel,
      schoolId,
      actorId
    );

    return mapToEnforcementResult(result);
  },

  /**
   * Pre-check if a learner can be activated (before actually activating).
   *
   * Use this for UX to show warnings before attempting activation.
   */
  async canActivateLearner(
    tenantId: string,
    learnerId: string,
    gradeLevel: number | string
  ): Promise<LicenseAvailabilityResult> {
    return licensingService.checkLicenseAvailability(
      tenantId,
      learnerId,
      gradeLevel
    );
  },

  /**
   * Called when a learner's grade band changes (e.g., promotion from 5th to 6th grade).
   *
   * This triggers a license transfer from one grade band to another.
   *
   * @param tenantId - The tenant ID
   * @param learnerId - The learner's UUID
   * @param newGradeLevel - The new grade level
   * @param newSchoolId - Optional new school (e.g., moving to middle school)
   * @param actorId - Optional user ID who triggered the change
   */
  async onGradeBandChange(
    tenantId: string,
    learnerId: string,
    newGradeLevel: number | string,
    newSchoolId?: string,
    actorId?: string
  ): Promise<GradeBandChangeResult> {
    // First check if learner has an existing assignment
    const { hasLicense, assignment } = await licensingService.hasActiveLicense(
      tenantId,
      learnerId
    );

    if (!hasLicense || !assignment) {
      // No existing license - just assign a new one
      const result = await licensingService.assignLicense(
        tenantId,
        learnerId,
        newGradeLevel,
        newSchoolId,
        actorId
      );

      return {
        success: result.success,
        previousAssignment: null,
        newAssignment: result.assignment,
        isOverage: result.isOverage,
        warning: result.warning,
        error: result.error,
      };
    }

    // Check if grade band actually changed
    const currentGradeBand = assignment.gradeBand as GradeBand;
    const newGradeBand = gradeToGradeBand(newGradeLevel);

    if (currentGradeBand === newGradeBand) {
      // Same grade band - no transfer needed
      return {
        success: true,
        previousAssignment: assignment,
        newAssignment: assignment,
        isOverage: assignment.isOverage,
        warning: null,
        error: null,
      };
    }

    // Transfer license to new grade band
    const transferResult = await licensingService.transferLicense({
      assignmentId: assignment.id,
      newGradeBand,
      newSchoolId,
      transferredBy: actorId,
    });

    return {
      success: transferResult.success,
      previousAssignment: transferResult.previousAssignment,
      newAssignment: transferResult.newAssignment,
      isOverage: transferResult.newAssignment?.isOverage ?? false,
      warning: transferResult.newAssignment?.isOverage
        ? `Seat limit exceeded in ${newGradeBand}. This assignment is in overage.`
        : null,
      error: transferResult.error,
    };
  },

  /**
   * Called when a learner is deactivated/removed.
   *
   * This revokes their license, freeing up the seat.
   */
  async onLearnerDeactivation(
    tenantId: string,
    learnerId: string,
    reason?: string,
    actorId?: string
  ): Promise<{ success: boolean; error: string | null }> {
    const { hasLicense, assignment } = await licensingService.hasActiveLicense(
      tenantId,
      learnerId
    );

    if (!hasLicense || !assignment) {
      // No license to revoke
      return { success: true, error: null };
    }

    return licensingService.revokeLicense(assignment.id, reason, actorId);
  },

  /**
   * Check if a learner has an active license.
   *
   * Use this for feature gating and access control.
   */
  async checkLearnerLicense(
    tenantId: string,
    learnerId: string
  ): Promise<{ hasLicense: boolean; assignment: LicenseAssignment | null }> {
    return licensingService.hasActiveLicense(tenantId, learnerId);
  },

  /**
   * Get seat usage summary for a tenant.
   *
   * Use this for admin dashboards and monitoring.
   */
  async getSeatUsage(tenantId: string): Promise<TenantSeatUsageSummary> {
    return licensingService.getTenantSeatUsageSummary(tenantId);
  },

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
    return licensingService.getOverageStats(tenantId, sinceDays);
  },

  /**
   * Sync entitlements from a contract.
   *
   * Called when a contract is activated or updated.
   */
  async syncFromContract(
    contractId: string,
    forceRecreate = false
  ): Promise<{ created: number; updated: number; errors: string[] }> {
    const result = await licensingService.syncEntitlementsFromContract({
      contractId,
      forceRecreate,
    });
    return {
      created: result.created,
      updated: result.updated,
      errors: result.errors,
    };
  },

  /**
   * Process expired entitlements.
   *
   * This should be called by a scheduled job (e.g., daily cron).
   */
  async processExpired(): Promise<{
    entitlementsExpired: number;
    assignmentsExpired: number;
  }> {
    return licensingService.processExpiredEntitlements();
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function mapToEnforcementResult(
  result: LicenseAssignmentResult
): EnforcementResult {
  const requiresAdminAction =
    !result.success &&
    result.error !== null &&
    !result.error.includes('already has an active license');

  let adminMessage: string | null = null;
  if (requiresAdminAction) {
    if (result.error?.includes('Seat limit')) {
      adminMessage =
        'The seat limit for this grade band has been reached. ' +
        'Please contact your administrator to purchase additional seats ' +
        'or review the current seat allocations in the admin dashboard.';
    } else if (result.error?.includes('No active entitlement')) {
      adminMessage =
        'No active license entitlement found for this grade band. ' +
        'Please ensure the district contract is active and includes seats ' +
        'for this grade band.';
    } else {
      adminMessage = result.error;
    }
  }

  return {
    allowed: result.success,
    assignment: result.assignment,
    isOverage: result.isOverage,
    warning: result.warning,
    error: result.error,
    requiresAdminAction,
    adminMessage,
  };
}

// ============================================================================
// Module Access Hooks (for add-on features like SEL, Speech, Science)
// ============================================================================

/**
 * Check if a tenant has access to a specific module/feature.
 *
 * This checks ContractEntitlement (feature-level) not SeatEntitlement (seat-level).
 */
export async function checkModuleAccess(
  tenantId: string,
  featureKey: string
): Promise<ModuleAccessResult> {
  // Import the contract repository dynamically to avoid circular deps
  const { contractEntitlementRepository } = await import(
    '../repositories/contract.repository.js'
  );

  const { hasAccess, quantity } =
    await contractEntitlementRepository.hasEntitlement(tenantId, featureKey);

  if (!hasAccess) {
    return {
      hasAccess: false,
      reason: `Module ${featureKey} is not included in the current contract`,
      contractId: null,
      expiresAt: null,
    };
  }

  // Get the entitlement details for expiration
  const entitlements =
    await contractEntitlementRepository.listActiveByTenant(tenantId);
  const entitlement = entitlements.find((e) => e.featureKey === featureKey);

  return {
    hasAccess: true,
    reason: null,
    contractId: entitlement?.contractId ?? null,
    expiresAt: entitlement?.endDate ?? null,
  };
}

/**
 * Check multiple modules at once.
 */
export async function checkModulesAccess(
  tenantId: string,
  featureKeys: string[]
): Promise<Record<string, ModuleAccessResult>> {
  const results: Record<string, ModuleAccessResult> = {};

  for (const key of featureKeys) {
    results[key] = await checkModuleAccess(tenantId, key);
  }

  return results;
}

// ============================================================================
// Export convenience types
// ============================================================================

export type {
  LicenseAssignment,
  LicenseAvailabilityResult,
  TenantSeatUsageSummary,
};
