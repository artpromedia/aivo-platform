/**
 * Seat Licensing & Entitlement Types
 *
 * Type definitions for seat-based licensing, entitlements, and license assignments.
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export const GradeBand = {
  K_2: 'K_2',
  G3_5: 'G3_5',
  G6_8: 'G6_8',
  G9_12: 'G9_12',
  TEACHER: 'TEACHER',
  ALL: 'ALL',
} as const;
export type GradeBand = (typeof GradeBand)[keyof typeof GradeBand];

export const SeatCapEnforcement = {
  SOFT: 'SOFT',
  HARD: 'HARD',
  UNLIMITED: 'UNLIMITED',
} as const;
export type SeatCapEnforcement = (typeof SeatCapEnforcement)[keyof typeof SeatCapEnforcement];

export const LicenseAssignmentStatus = {
  ACTIVE: 'ACTIVE',
  REVOKED: 'REVOKED',
  EXPIRED: 'EXPIRED',
  TRANSFERRED: 'TRANSFERRED',
} as const;
export type LicenseAssignmentStatus = (typeof LicenseAssignmentStatus)[keyof typeof LicenseAssignmentStatus];

export const LicenseEventType = {
  ENTITLEMENT_CREATED: 'ENTITLEMENT_CREATED',
  ENTITLEMENT_UPDATED: 'ENTITLEMENT_UPDATED',
  ENTITLEMENT_EXPIRED: 'ENTITLEMENT_EXPIRED',
  LICENSE_ASSIGNED: 'LICENSE_ASSIGNED',
  LICENSE_REVOKED: 'LICENSE_REVOKED',
  LICENSE_TRANSFERRED: 'LICENSE_TRANSFERRED',
  OVERAGE_WARNING: 'OVERAGE_WARNING',
  OVERAGE_BLOCKED: 'OVERAGE_BLOCKED',
  CAP_ADJUSTED: 'CAP_ADJUSTED',
} as const;
export type LicenseEventType = (typeof LicenseEventType)[keyof typeof LicenseEventType];

// ============================================================================
// SKU to Grade Band Mapping
// ============================================================================

/**
 * Maps seat SKUs to their corresponding grade bands.
 */
export const SKU_TO_GRADE_BAND: Record<string, GradeBand> = {
  SEAT_K2: GradeBand.K_2,
  SEAT_K5: GradeBand.G3_5, // K-5 maps to G3_5 for simplicity (can be split)
  SEAT_3_5: GradeBand.G3_5,
  SEAT_6_8: GradeBand.G6_8,
  SEAT_9_12: GradeBand.G9_12,
  LICENSE_TEACHER: GradeBand.TEACHER,
  // Add-ons apply to all grades
  ADDON_SEL: GradeBand.ALL,
  ADDON_SPEECH: GradeBand.ALL,
  ADDON_SCIENCE: GradeBand.ALL,
};

/**
 * Determines if a SKU is a seat-based SKU (not add-on or base fee).
 */
export function isSeatSku(sku: string): boolean {
  return sku.startsWith('SEAT_') || sku === 'LICENSE_TEACHER';
}

/**
 * Gets the grade band for a SKU.
 */
export function getGradeBandForSku(sku: string): GradeBand | null {
  return SKU_TO_GRADE_BAND[sku] ?? null;
}

/**
 * Maps a learner's grade level to a grade band.
 */
export function gradeToGradeBand(grade: number | string): GradeBand {
  const gradeNum = typeof grade === 'string' ? parseInt(grade, 10) : grade;
  
  if (isNaN(gradeNum) || gradeNum < 0) {
    return GradeBand.K_2;
  }
  if (gradeNum <= 2) {
    return GradeBand.K_2;
  }
  if (gradeNum <= 5) {
    return GradeBand.G3_5;
  }
  if (gradeNum <= 8) {
    return GradeBand.G6_8;
  }
  return GradeBand.G9_12;
}

/**
 * Gets the seat SKU for a grade band.
 */
export function getSkuForGradeBand(gradeBand: GradeBand): string {
  switch (gradeBand) {
    case GradeBand.K_2:
      return 'SEAT_K5'; // Using K5 for K-2 as well
    case GradeBand.G3_5:
      return 'SEAT_K5';
    case GradeBand.G6_8:
      return 'SEAT_6_8';
    case GradeBand.G9_12:
      return 'SEAT_9_12';
    case GradeBand.TEACHER:
      return 'LICENSE_TEACHER';
    default:
      throw new Error(`No seat SKU for grade band: ${gradeBand}`);
  }
}

// ============================================================================
// Seat Entitlement Types
// ============================================================================

export interface SeatEntitlement {
  id: string;
  tenantId: string;
  contractId: string;
  lineItemId: string;
  sku: string;
  gradeBand: GradeBand;
  quantityCommitted: number;
  quantityAllocated: number;
  overageAllowed: boolean;
  overageLimit: number | null;
  overageCount: number;
  enforcement: SeatCapEnforcement;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  metadataJson: SeatEntitlementMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SeatEntitlementMetadata {
  schoolAllocations?: Record<string, number>;
  usageHistory?: SeatUsageSnapshot[];
  notes?: string;
}

export interface SeatUsageSnapshot {
  date: string;
  allocated: number;
  overage: number;
}

export interface SeatEntitlementWithAssignments extends SeatEntitlement {
  licenseAssignments: LicenseAssignment[];
}

export const CreateSeatEntitlementSchema = z.object({
  tenantId: z.string().uuid(),
  contractId: z.string().uuid(),
  lineItemId: z.string().uuid(),
  sku: z.string(),
  gradeBand: z.nativeEnum(GradeBand),
  quantityCommitted: z.number().int().positive(),
  overageAllowed: z.boolean().default(false),
  overageLimit: z.number().int().positive().optional(),
  enforcement: z.nativeEnum(SeatCapEnforcement).default('SOFT'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  metadataJson: z.record(z.unknown()).optional(),
});

export const UpdateSeatEntitlementSchema = z.object({
  quantityCommitted: z.number().int().positive().optional(),
  overageAllowed: z.boolean().optional(),
  overageLimit: z.number().int().positive().nullable().optional(),
  enforcement: z.nativeEnum(SeatCapEnforcement).optional(),
  isActive: z.boolean().optional(),
  metadataJson: z.record(z.unknown()).optional(),
});

// ============================================================================
// License Assignment Types
// ============================================================================

export interface LicenseAssignment {
  id: string;
  tenantId: string;
  entitlementId: string;
  learnerId: string | null;
  teacherId: string | null;
  sku: string;
  gradeBand: GradeBand;
  schoolId: string | null;
  status: LicenseAssignmentStatus;
  isOverage: boolean;
  assignedAt: Date;
  revokedAt: Date | null;
  revokedReason: string | null;
  assignedBy: string | null;
  revokedBy: string | null;
  previousAssignmentId: string | null;
  metadataJson: LicenseAssignmentMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LicenseAssignmentMetadata {
  sourceSystem?: string;
  rosterSyncId?: string;
  notes?: string;
}

export interface LicenseAssignmentWithEntitlement extends LicenseAssignment {
  entitlement: SeatEntitlement;
}

export const CreateLicenseAssignmentSchema = z.object({
  tenantId: z.string().uuid(),
  entitlementId: z.string().uuid(),
  learnerId: z.string().uuid().optional(),
  teacherId: z.string().uuid().optional(),
  sku: z.string(),
  gradeBand: z.nativeEnum(GradeBand),
  schoolId: z.string().uuid().optional(),
  assignedBy: z.string().uuid().optional(),
  metadataJson: z.record(z.unknown()).optional(),
});

export const RevokeLicenseAssignmentSchema = z.object({
  revokedReason: z.string().max(500).optional(),
  revokedBy: z.string().uuid().optional(),
});

// ============================================================================
// License Event Types
// ============================================================================

export interface LicenseEvent {
  id: string;
  tenantId: string;
  eventType: LicenseEventType;
  entitlementId: string | null;
  assignmentId: string | null;
  learnerId: string | null;
  actorId: string | null;
  actorType: string;
  description: string;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  metadataJson: Record<string, unknown> | null;
  createdAt: Date;
}

export const CreateLicenseEventSchema = z.object({
  tenantId: z.string().uuid(),
  eventType: z.nativeEnum(LicenseEventType),
  entitlementId: z.string().uuid().optional(),
  assignmentId: z.string().uuid().optional(),
  learnerId: z.string().uuid().optional(),
  actorId: z.string().uuid().optional(),
  actorType: z.string().default('SYSTEM'),
  description: z.string(),
  previousValue: z.record(z.unknown()).optional(),
  newValue: z.record(z.unknown()).optional(),
  metadataJson: z.record(z.unknown()).optional(),
});

// ============================================================================
// API & Service Types
// ============================================================================

/**
 * Result of attempting to assign a license.
 */
export interface LicenseAssignmentResult {
  success: boolean;
  assignment: LicenseAssignment | null;
  isOverage: boolean;
  warning: string | null;
  error: string | null;
  entitlementStatus: {
    committed: number;
    allocated: number;
    remaining: number;
    overageLimit: number | null;
    enforcement: SeatCapEnforcement;
  };
}

/**
 * Result of checking if a license can be assigned.
 */
export interface LicenseAvailabilityResult {
  canAssign: boolean;
  wouldBeOverage: boolean;
  entitlement: SeatEntitlement | null;
  seatsRemaining: number;
  overageRemaining: number | null;
  enforcement: SeatCapEnforcement;
  blockReason: string | null;
}

/**
 * Seat usage statistics for a tenant.
 */
export interface TenantSeatUsage {
  tenantId: string;
  gradeBand: GradeBand;
  sku: string;
  seatsCommitted: number;
  seatsAllocated: number;
  seatsAvailable: number;
  overageCount: number;
  overageLimit: number | null;
  utilizationPercent: number;
  isOverCap: boolean;
  enforcement: SeatCapEnforcement;
}

/**
 * Aggregated seat usage across all grade bands for a tenant.
 */
export interface TenantSeatUsageSummary {
  tenantId: string;
  totalCommitted: number;
  totalAllocated: number;
  totalOverage: number;
  utilizationPercent: number;
  byGradeBand: TenantSeatUsage[];
  contracts: Array<{
    contractId: string;
    contractNumber: string;
    status: string;
    endDate: string;
  }>;
}

/**
 * Request to sync entitlements from a contract.
 */
export interface SyncEntitlementsRequest {
  contractId: string;
  forceRecreate?: boolean;
}

/**
 * Result of syncing entitlements from a contract.
 */
export interface SyncEntitlementsResult {
  contractId: string;
  created: number;
  updated: number;
  deactivated: number;
  entitlements: SeatEntitlement[];
  errors: string[];
}

/**
 * Request to transfer a license to a different grade band.
 */
export interface TransferLicenseRequest {
  assignmentId: string;
  newGradeBand: GradeBand;
  newSchoolId?: string;
  transferredBy?: string;
}

/**
 * Result of transferring a license.
 */
export interface TransferLicenseResult {
  success: boolean;
  previousAssignment: LicenseAssignment | null;
  newAssignment: LicenseAssignment | null;
  error: string | null;
}

/**
 * Enforcement decision for a seat assignment request.
 */
export interface EnforcementDecision {
  allowed: boolean;
  isOverage: boolean;
  warning: string | null;
  blockMessage: string | null;
  enforcement: SeatCapEnforcement;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Tenant-level licensing configuration.
 */
export interface TenantLicensingConfig {
  tenantId: string;
  defaultEnforcement: SeatCapEnforcement;
  globalOverageAllowed: boolean;
  globalOverageLimit: number | null;
  notifyOnOverage: boolean;
  notifyEmails: string[];
  gracePercentage: number; // e.g., 5% grace before warnings
}

export const TenantLicensingConfigSchema = z.object({
  tenantId: z.string().uuid(),
  defaultEnforcement: z.nativeEnum(SeatCapEnforcement).default('SOFT'),
  globalOverageAllowed: z.boolean().default(true),
  globalOverageLimit: z.number().int().positive().optional(),
  notifyOnOverage: z.boolean().default(true),
  notifyEmails: z.array(z.string().email()).default([]),
  gracePercentage: z.number().min(0).max(100).default(5),
});
