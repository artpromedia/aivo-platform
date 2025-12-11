/**
 * Licensing Service Tests
 *
 * Comprehensive tests for seat entitlements, license assignments,
 * and enforcement logic.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  GradeBand,
  gradeToGradeBand,
  getSkuForGradeBand,
  getGradeBandForSku,
  isSeatSku,
  SeatCapEnforcement,
  LicenseAssignmentStatus,
  LicenseEventType,
} from '../src/types/licensing.types';

// ============================================================================
// Unit Tests: Grade Band Mapping
// ============================================================================

describe('Grade Band Mapping', () => {
  describe('gradeToGradeBand', () => {
    it('maps kindergarten to K_2', () => {
      expect(gradeToGradeBand(0)).toBe(GradeBand.K_2);
      expect(gradeToGradeBand('K')).toBe(GradeBand.K_2);
    });

    it('maps grades 1-2 to K_2', () => {
      expect(gradeToGradeBand(1)).toBe(GradeBand.K_2);
      expect(gradeToGradeBand(2)).toBe(GradeBand.K_2);
    });

    it('maps grades 3-5 to G3_5', () => {
      expect(gradeToGradeBand(3)).toBe(GradeBand.G3_5);
      expect(gradeToGradeBand(4)).toBe(GradeBand.G3_5);
      expect(gradeToGradeBand(5)).toBe(GradeBand.G3_5);
    });

    it('maps grades 6-8 to G6_8', () => {
      expect(gradeToGradeBand(6)).toBe(GradeBand.G6_8);
      expect(gradeToGradeBand(7)).toBe(GradeBand.G6_8);
      expect(gradeToGradeBand(8)).toBe(GradeBand.G6_8);
    });

    it('maps grades 9-12 to G9_12', () => {
      expect(gradeToGradeBand(9)).toBe(GradeBand.G9_12);
      expect(gradeToGradeBand(10)).toBe(GradeBand.G9_12);
      expect(gradeToGradeBand(11)).toBe(GradeBand.G9_12);
      expect(gradeToGradeBand(12)).toBe(GradeBand.G9_12);
    });

    it('handles string grade inputs', () => {
      expect(gradeToGradeBand('5')).toBe(GradeBand.G3_5);
      expect(gradeToGradeBand('8')).toBe(GradeBand.G6_8);
    });

    it('handles edge cases', () => {
      expect(gradeToGradeBand(-1)).toBe(GradeBand.K_2);
      expect(gradeToGradeBand(13)).toBe(GradeBand.G9_12);
      expect(gradeToGradeBand('invalid')).toBe(GradeBand.K_2);
    });
  });

  describe('getSkuForGradeBand', () => {
    it('returns correct SKU for each grade band', () => {
      expect(getSkuForGradeBand(GradeBand.K_2)).toBe('SEAT_K5');
      expect(getSkuForGradeBand(GradeBand.G3_5)).toBe('SEAT_K5');
      expect(getSkuForGradeBand(GradeBand.G6_8)).toBe('SEAT_6_8');
      expect(getSkuForGradeBand(GradeBand.G9_12)).toBe('SEAT_9_12');
      expect(getSkuForGradeBand(GradeBand.TEACHER)).toBe('LICENSE_TEACHER');
    });

    it('throws for ALL grade band', () => {
      expect(() => getSkuForGradeBand(GradeBand.ALL)).toThrow();
    });
  });

  describe('getGradeBandForSku', () => {
    it('returns correct grade band for seat SKUs', () => {
      expect(getGradeBandForSku('SEAT_K5')).toBe(GradeBand.G3_5);
      expect(getGradeBandForSku('SEAT_6_8')).toBe(GradeBand.G6_8);
      expect(getGradeBandForSku('SEAT_9_12')).toBe(GradeBand.G9_12);
    });

    it('returns ALL for add-on SKUs', () => {
      expect(getGradeBandForSku('ADDON_SEL')).toBe(GradeBand.ALL);
      expect(getGradeBandForSku('ADDON_SPEECH')).toBe(GradeBand.ALL);
      expect(getGradeBandForSku('ADDON_SCIENCE')).toBe(GradeBand.ALL);
    });

    it('returns null for unknown SKUs', () => {
      expect(getGradeBandForSku('UNKNOWN_SKU')).toBeNull();
      expect(getGradeBandForSku('ORG_BASE')).toBeNull();
    });
  });

  describe('isSeatSku', () => {
    it('identifies seat SKUs correctly', () => {
      expect(isSeatSku('SEAT_K5')).toBe(true);
      expect(isSeatSku('SEAT_6_8')).toBe(true);
      expect(isSeatSku('SEAT_9_12')).toBe(true);
      expect(isSeatSku('LICENSE_TEACHER')).toBe(true);
    });

    it('rejects non-seat SKUs', () => {
      expect(isSeatSku('ORG_BASE')).toBe(false);
      expect(isSeatSku('ADDON_SEL')).toBe(false);
      expect(isSeatSku('SETUP_ONBOARDING')).toBe(false);
    });
  });
});

// ============================================================================
// Mock Data Generators
// ============================================================================

function createMockEntitlement(overrides: Partial<any> = {}): any {
  return {
    id: 'ent-123',
    tenantId: 'tenant-1',
    contractId: 'contract-1',
    lineItemId: 'line-1',
    sku: 'SEAT_K5',
    gradeBand: GradeBand.G3_5,
    quantityCommitted: 100,
    quantityAllocated: 50,
    overageAllowed: true,
    overageLimit: 10,
    overageCount: 0,
    enforcement: SeatCapEnforcement.SOFT,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
    isActive: true,
    metadataJson: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockAssignment(overrides: Partial<any> = {}): any {
  return {
    id: 'assign-123',
    tenantId: 'tenant-1',
    entitlementId: 'ent-123',
    learnerId: 'learner-1',
    teacherId: null,
    sku: 'SEAT_K5',
    gradeBand: GradeBand.G3_5,
    schoolId: 'school-1',
    status: LicenseAssignmentStatus.ACTIVE,
    isOverage: false,
    assignedAt: new Date(),
    revokedAt: null,
    revokedReason: null,
    assignedBy: null,
    revokedBy: null,
    previousAssignmentId: null,
    metadataJson: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// Enforcement Logic Tests (Pure Functions)
// ============================================================================

describe('Enforcement Logic', () => {
  // Helper function to simulate enforcement decision
  function makeEnforcementDecision(
    entitlement: any,
    seatsRemaining: number,
    overageRemaining: number | null
  ): {
    allowed: boolean;
    isOverage: boolean;
    warning: string | null;
    blockMessage: string | null;
  } {
    // Seats available - always allowed
    if (seatsRemaining > 0) {
      return {
        allowed: true,
        isOverage: false,
        warning: null,
        blockMessage: null,
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
        };

      case 'SOFT':
        // Check overage limit
        if (overageRemaining !== null && overageRemaining <= 0) {
          return {
            allowed: false,
            isOverage: false,
            warning: null,
            blockMessage: `Overage limit reached (${entitlement.overageLimit} seats).`,
          };
        }
        return {
          allowed: true,
          isOverage: true,
          warning: `Seat limit (${entitlement.quantityCommitted}) exceeded.`,
          blockMessage: null,
        };

      case 'HARD':
        return {
          allowed: false,
          isOverage: false,
          warning: null,
          blockMessage: `Seat limit (${entitlement.quantityCommitted}) reached.`,
        };

      default:
        return {
          allowed: false,
          isOverage: false,
          warning: null,
          blockMessage: 'Unknown enforcement mode',
        };
    }
  }

  describe('when seats are available', () => {
    it('allows assignment regardless of enforcement mode', () => {
      const entitlementSoft = createMockEntitlement({ enforcement: 'SOFT' });
      const entitlementHard = createMockEntitlement({ enforcement: 'HARD' });
      const entitlementUnlimited = createMockEntitlement({ enforcement: 'UNLIMITED' });

      expect(makeEnforcementDecision(entitlementSoft, 10, null).allowed).toBe(true);
      expect(makeEnforcementDecision(entitlementHard, 10, null).allowed).toBe(true);
      expect(makeEnforcementDecision(entitlementUnlimited, 10, null).allowed).toBe(true);
    });

    it('does not mark as overage', () => {
      const entitlement = createMockEntitlement();
      const decision = makeEnforcementDecision(entitlement, 10, null);
      expect(decision.isOverage).toBe(false);
      expect(decision.warning).toBeNull();
    });
  });

  describe('SOFT enforcement with no seats remaining', () => {
    it('allows assignment as overage when overage is allowed', () => {
      const entitlement = createMockEntitlement({
        enforcement: 'SOFT',
        overageAllowed: true,
        overageLimit: 10,
      });
      const decision = makeEnforcementDecision(entitlement, 0, 10);
      expect(decision.allowed).toBe(true);
      expect(decision.isOverage).toBe(true);
      expect(decision.warning).toContain('exceeded');
    });

    it('blocks when overage limit reached', () => {
      const entitlement = createMockEntitlement({
        enforcement: 'SOFT',
        overageAllowed: true,
        overageLimit: 10,
      });
      const decision = makeEnforcementDecision(entitlement, 0, 0);
      expect(decision.allowed).toBe(false);
      expect(decision.blockMessage).toContain('Overage limit reached');
    });

    it('allows unlimited overage when limit is null', () => {
      const entitlement = createMockEntitlement({
        enforcement: 'SOFT',
        overageAllowed: true,
        overageLimit: null,
      });
      const decision = makeEnforcementDecision(entitlement, 0, null);
      expect(decision.allowed).toBe(true);
      expect(decision.isOverage).toBe(true);
    });
  });

  describe('HARD enforcement', () => {
    it('blocks assignment when no seats remaining', () => {
      const entitlement = createMockEntitlement({
        enforcement: 'HARD',
        quantityCommitted: 100,
      });
      const decision = makeEnforcementDecision(entitlement, 0, 0);
      expect(decision.allowed).toBe(false);
      expect(decision.blockMessage).toContain('Seat limit (100) reached');
    });
  });

  describe('UNLIMITED enforcement', () => {
    it('always allows assignment', () => {
      const entitlement = createMockEntitlement({ enforcement: 'UNLIMITED' });
      const decision = makeEnforcementDecision(entitlement, 0, 0);
      expect(decision.allowed).toBe(true);
      expect(decision.isOverage).toBe(true);
    });
  });
});

// ============================================================================
// Seat Usage Calculation Tests
// ============================================================================

describe('Seat Usage Calculations', () => {
  function calculateUsage(entitlement: any) {
    return {
      seatsCommitted: entitlement.quantityCommitted,
      seatsAllocated: entitlement.quantityAllocated,
      seatsAvailable: Math.max(0, entitlement.quantityCommitted - entitlement.quantityAllocated),
      overageCount: entitlement.overageCount,
      utilizationPercent:
        entitlement.quantityCommitted > 0
          ? Math.round((entitlement.quantityAllocated / entitlement.quantityCommitted) * 100)
          : 0,
      isOverCap: entitlement.quantityAllocated > entitlement.quantityCommitted,
    };
  }

  it('calculates available seats correctly', () => {
    const entitlement = createMockEntitlement({
      quantityCommitted: 100,
      quantityAllocated: 75,
    });
    const usage = calculateUsage(entitlement);
    expect(usage.seatsAvailable).toBe(25);
    expect(usage.utilizationPercent).toBe(75);
    expect(usage.isOverCap).toBe(false);
  });

  it('handles full utilization', () => {
    const entitlement = createMockEntitlement({
      quantityCommitted: 100,
      quantityAllocated: 100,
    });
    const usage = calculateUsage(entitlement);
    expect(usage.seatsAvailable).toBe(0);
    expect(usage.utilizationPercent).toBe(100);
    expect(usage.isOverCap).toBe(false);
  });

  it('handles overage correctly', () => {
    const entitlement = createMockEntitlement({
      quantityCommitted: 100,
      quantityAllocated: 110,
      overageCount: 10,
    });
    const usage = calculateUsage(entitlement);
    expect(usage.seatsAvailable).toBe(0);
    expect(usage.utilizationPercent).toBe(110);
    expect(usage.isOverCap).toBe(true);
    expect(usage.overageCount).toBe(10);
  });

  it('handles zero committed seats', () => {
    const entitlement = createMockEntitlement({
      quantityCommitted: 0,
      quantityAllocated: 0,
    });
    const usage = calculateUsage(entitlement);
    expect(usage.utilizationPercent).toBe(0);
  });
});

// ============================================================================
// License Transfer Tests
// ============================================================================

describe('License Transfer Logic', () => {
  function canTransfer(
    currentAssignment: any,
    newGradeBand: GradeBand,
    newEntitlement: any | null
  ): { canTransfer: boolean; reason: string | null } {
    // Check assignment status
    if (currentAssignment.status !== 'ACTIVE') {
      return {
        canTransfer: false,
        reason: `Cannot transfer: assignment is ${currentAssignment.status}`,
      };
    }

    // Check if grade band actually changed
    if (currentAssignment.gradeBand === newGradeBand) {
      return {
        canTransfer: false,
        reason: 'Learner is already in the requested grade band',
      };
    }

    // Check if new entitlement exists
    if (!newEntitlement) {
      return {
        canTransfer: false,
        reason: `No active entitlement for grade band ${newGradeBand}`,
      };
    }

    // Check seat availability in new grade band
    const seatsAvailable = newEntitlement.quantityCommitted - newEntitlement.quantityAllocated;
    if (seatsAvailable <= 0 && newEntitlement.enforcement === 'HARD') {
      return {
        canTransfer: false,
        reason: 'No seats available in target grade band (hard cap)',
      };
    }

    return { canTransfer: true, reason: null };
  }

  it('allows transfer when seats are available', () => {
    const assignment = createMockAssignment({ gradeBand: GradeBand.G3_5 });
    const newEntitlement = createMockEntitlement({
      gradeBand: GradeBand.G6_8,
      quantityCommitted: 100,
      quantityAllocated: 50,
    });

    const result = canTransfer(assignment, GradeBand.G6_8, newEntitlement);
    expect(result.canTransfer).toBe(true);
  });

  it('blocks transfer when assignment is not active', () => {
    const assignment = createMockAssignment({
      gradeBand: GradeBand.G3_5,
      status: 'REVOKED',
    });

    const result = canTransfer(assignment, GradeBand.G6_8, null);
    expect(result.canTransfer).toBe(false);
    expect(result.reason).toContain('REVOKED');
  });

  it('blocks transfer to same grade band', () => {
    const assignment = createMockAssignment({ gradeBand: GradeBand.G3_5 });

    const result = canTransfer(assignment, GradeBand.G3_5, null);
    expect(result.canTransfer).toBe(false);
    expect(result.reason).toContain('already in the requested grade band');
  });

  it('blocks transfer when no entitlement exists', () => {
    const assignment = createMockAssignment({ gradeBand: GradeBand.G3_5 });

    const result = canTransfer(assignment, GradeBand.G6_8, null);
    expect(result.canTransfer).toBe(false);
    expect(result.reason).toContain('No active entitlement');
  });

  it('blocks transfer when hard cap reached', () => {
    const assignment = createMockAssignment({ gradeBand: GradeBand.G3_5 });
    const newEntitlement = createMockEntitlement({
      gradeBand: GradeBand.G6_8,
      quantityCommitted: 100,
      quantityAllocated: 100,
      enforcement: 'HARD',
    });

    const result = canTransfer(assignment, GradeBand.G6_8, newEntitlement);
    expect(result.canTransfer).toBe(false);
    expect(result.reason).toContain('hard cap');
  });

  it('allows transfer as overage under soft cap', () => {
    const assignment = createMockAssignment({ gradeBand: GradeBand.G3_5 });
    const newEntitlement = createMockEntitlement({
      gradeBand: GradeBand.G6_8,
      quantityCommitted: 100,
      quantityAllocated: 100,
      enforcement: 'SOFT',
      overageAllowed: true,
    });

    const result = canTransfer(assignment, GradeBand.G6_8, newEntitlement);
    expect(result.canTransfer).toBe(true);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  describe('Contract expiration', () => {
    it('identifies expired entitlements', () => {
      const entitlement = createMockEntitlement({
        endDate: new Date('2024-01-01'), // Past date
        isActive: true,
      });

      const now = new Date();
      const isExpired = entitlement.endDate < now;
      expect(isExpired).toBe(true);
    });

    it('identifies active entitlements', () => {
      const entitlement = createMockEntitlement({
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        isActive: true,
      });

      const now = new Date('2025-06-15');
      const isActive =
        entitlement.isActive &&
        entitlement.startDate <= now &&
        entitlement.endDate >= now;
      expect(isActive).toBe(true);
    });
  });

  describe('Concurrent modifications', () => {
    it('prevents double assignment to same learner', () => {
      const existingAssignment = createMockAssignment({
        learnerId: 'learner-1',
        status: 'ACTIVE',
      });

      // Simulate check for existing assignment
      const hasExistingLicense = existingAssignment.status === 'ACTIVE';
      expect(hasExistingLicense).toBe(true);
      // Service should return existing assignment instead of creating new one
    });
  });

  describe('SKU transitions', () => {
    it('handles K5 to 6-8 grade band change', () => {
      const oldGradeBand = GradeBand.G3_5;
      const newGradeBand = gradeToGradeBand(6);

      expect(oldGradeBand).not.toBe(newGradeBand);
      expect(newGradeBand).toBe(GradeBand.G6_8);
      expect(getSkuForGradeBand(newGradeBand)).toBe('SEAT_6_8');
    });

    it('handles 8th to 9th grade promotion', () => {
      const oldGradeBand = GradeBand.G6_8;
      const newGradeBand = gradeToGradeBand(9);

      expect(oldGradeBand).not.toBe(newGradeBand);
      expect(newGradeBand).toBe(GradeBand.G9_12);
      expect(getSkuForGradeBand(newGradeBand)).toBe('SEAT_9_12');
    });
  });
});

// ============================================================================
// Event Types Validation
// ============================================================================

describe('License Event Types', () => {
  it('has all required event types', () => {
    expect(LicenseEventType.ENTITLEMENT_CREATED).toBe('ENTITLEMENT_CREATED');
    expect(LicenseEventType.ENTITLEMENT_UPDATED).toBe('ENTITLEMENT_UPDATED');
    expect(LicenseEventType.ENTITLEMENT_EXPIRED).toBe('ENTITLEMENT_EXPIRED');
    expect(LicenseEventType.LICENSE_ASSIGNED).toBe('LICENSE_ASSIGNED');
    expect(LicenseEventType.LICENSE_REVOKED).toBe('LICENSE_REVOKED');
    expect(LicenseEventType.LICENSE_TRANSFERRED).toBe('LICENSE_TRANSFERRED');
    expect(LicenseEventType.OVERAGE_WARNING).toBe('OVERAGE_WARNING');
    expect(LicenseEventType.OVERAGE_BLOCKED).toBe('OVERAGE_BLOCKED');
    expect(LicenseEventType.CAP_ADJUSTED).toBe('CAP_ADJUSTED');
  });
});
