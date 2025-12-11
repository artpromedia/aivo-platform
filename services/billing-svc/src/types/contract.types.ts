/**
 * District Billing & Contract Types
 *
 * Type definitions for B2B billing, contracts, and entitlements.
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export const ContractBillingPeriod = {
  ANNUAL: 'ANNUAL',
  MULTI_YEAR: 'MULTI_YEAR',
  ONE_TIME: 'ONE_TIME',
} as const;
export type ContractBillingPeriod = (typeof ContractBillingPeriod)[keyof typeof ContractBillingPeriod];

export const ContractStatus = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  RENEWED: 'RENEWED',
} as const;
export type ContractStatus = (typeof ContractStatus)[keyof typeof ContractStatus];

export const ContractPaymentType = {
  INVOICE: 'INVOICE',
  CARD: 'CARD',
  HYBRID: 'HYBRID',
  PO: 'PO',
} as const;
export type ContractPaymentType = (typeof ContractPaymentType)[keyof typeof ContractPaymentType];

export const ProductCategory = {
  BASE: 'BASE',
  SEAT: 'SEAT',
  ADDON: 'ADDON',
} as const;
export type ProductCategory = (typeof ProductCategory)[keyof typeof ProductCategory];

export const InvoiceScheduleStatus = {
  PENDING: 'PENDING',
  INVOICED: 'INVOICED',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
} as const;
export type InvoiceScheduleStatus = (typeof InvoiceScheduleStatus)[keyof typeof InvoiceScheduleStatus];

// ============================================================================
// SKU Constants
// ============================================================================

/**
 * Standard SKU identifiers for district products.
 * These are seeded into the products table.
 */
export const SKU = {
  // Base platform fee
  ORG_BASE: 'ORG_BASE',

  // Learner seats by grade band
  SEAT_K5: 'SEAT_K5',
  SEAT_6_8: 'SEAT_6_8',
  SEAT_9_12: 'SEAT_9_12',

  // Add-on modules (per seat)
  ADDON_SEL: 'ADDON_SEL',
  ADDON_SPEECH: 'ADDON_SPEECH',
  ADDON_SCIENCE: 'ADDON_SCIENCE',

  // Teacher licenses (future)
  LICENSE_TEACHER: 'LICENSE_TEACHER',

  // Setup/professional services
  SETUP_ONBOARDING: 'SETUP_ONBOARDING',
  SETUP_DATA_MIGRATION: 'SETUP_DATA_MIGRATION',
  PROFESSIONAL_SERVICES: 'PROFESSIONAL_SERVICES',
} as const;
export type SKU = (typeof SKU)[keyof typeof SKU];

/**
 * Feature keys for entitlements
 */
export const FeatureKey = {
  // Core platform
  PLATFORM_ACCESS: 'PLATFORM_ACCESS',

  // Grade band access
  GRADE_K5: 'GRADE_K5',
  GRADE_6_8: 'GRADE_6_8',
  GRADE_9_12: 'GRADE_9_12',

  // Module access
  MODULE_ELA: 'MODULE_ELA',
  MODULE_MATH: 'MODULE_MATH',
  MODULE_SEL: 'MODULE_SEL',
  MODULE_SPEECH: 'MODULE_SPEECH',
  MODULE_SCIENCE: 'MODULE_SCIENCE',

  // Seat entitlements
  LEARNER_SEATS_K5: 'LEARNER_SEATS_K5',
  LEARNER_SEATS_6_8: 'LEARNER_SEATS_6_8',
  LEARNER_SEATS_9_12: 'LEARNER_SEATS_9_12',

  // Teacher features
  TEACHER_DASHBOARD: 'TEACHER_DASHBOARD',
  TEACHER_REPORTS: 'TEACHER_REPORTS',
} as const;
export type FeatureKey = (typeof FeatureKey)[keyof typeof FeatureKey];

// ============================================================================
// Address Types
// ============================================================================

export interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export const BillingAddressSchema = z.object({
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  zip: z.string().min(1).max(20),
  country: z.string().length(2).default('US'),
});

// ============================================================================
// Product Types
// ============================================================================

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: ProductCategory;
  isActive: boolean;
  unitOfMeasure: string;
  sortOrder: number;
  metadataJson: ProductMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductMetadata {
  gradeBands?: string[];
  modules?: string[];
  features?: string[];
}

export const CreateProductSchema = z.object({
  sku: z.string().min(1).max(50).regex(/^[A-Z0-9_]+$/),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  category: z.nativeEnum(ProductCategory),
  unitOfMeasure: z.string().default('seat'),
  sortOrder: z.number().int().default(0),
  metadataJson: z.record(z.unknown()).optional(),
});

// ============================================================================
// Price Book Types
// ============================================================================

export interface PriceBook {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  isDefault: boolean;
  isActive: boolean;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  metadataJson: PriceBookMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PriceBookMetadata {
  region?: string;
  customerSegment?: string;
  notes?: string;
}

export interface PriceBookEntry {
  id: string;
  priceBookId: string;
  productId: string;
  sku: string;
  unitPrice: number; // Decimal as number
  billingPeriod: ContractBillingPeriod;
  minQuantity: number;
  maxQuantity: number | null;
  metadataJson: PriceBookEntryMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PriceBookEntryMetadata {
  volumeTiers?: VolumeTier[];
  bundleDiscount?: number;
}

export interface VolumeTier {
  minSeats: number;
  maxSeats?: number;
  discountPct: number;
}

export const CreatePriceBookSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  currency: z.string().length(3).default('USD'),
  isDefault: z.boolean().default(false),
  effectiveFrom: z.coerce.date().default(() => new Date()),
  effectiveUntil: z.coerce.date().optional(),
  metadataJson: z.record(z.unknown()).optional(),
});

export const CreatePriceBookEntrySchema = z.object({
  priceBookId: z.string().uuid(),
  productId: z.string().uuid(),
  sku: z.string(),
  unitPrice: z.number().positive(),
  billingPeriod: z.nativeEnum(ContractBillingPeriod).default('ANNUAL'),
  minQuantity: z.number().int().positive().default(1),
  maxQuantity: z.number().int().positive().optional(),
  metadataJson: z.record(z.unknown()).optional(),
});

// ============================================================================
// District Billing Profile Types
// ============================================================================

export interface DistrictBillingProfile {
  id: string;
  billingAccountId: string;
  tenantId: string;
  billingContactName: string;
  billingContactEmail: string;
  billingContactPhone: string | null;
  billingAddressJson: BillingAddress;
  paymentTermsDays: number;
  isTaxExempt: boolean;
  taxExemptionNumber: string | null;
  requiresPO: boolean;
  creditLimitCents: number | null;
  metadataJson: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export const CreateDistrictBillingProfileSchema = z.object({
  billingAccountId: z.string().uuid(),
  tenantId: z.string().uuid(),
  billingContactName: z.string().min(1).max(200),
  billingContactEmail: z.string().email(),
  billingContactPhone: z.string().max(50).optional(),
  billingAddressJson: BillingAddressSchema,
  paymentTermsDays: z.number().int().min(0).max(180).default(30),
  isTaxExempt: z.boolean().default(true),
  taxExemptionNumber: z.string().max(100).optional(),
  requiresPO: z.boolean().default(true),
  creditLimitCents: z.number().int().positive().optional(),
  metadataJson: z.record(z.unknown()).optional(),
});

// ============================================================================
// Contract Types
// ============================================================================

export interface Contract {
  id: string;
  billingProfileId: string;
  tenantId: string;
  contractNumber: string;
  name: string | null;
  startDate: Date;
  endDate: Date;
  status: ContractStatus;
  priceBookId: string;
  poNumber: string | null;
  paymentType: ContractPaymentType;
  totalValueCents: bigint;
  currency: string;
  signedAt: Date | null;
  createdBy: string | null;
  autoRenewal: boolean;
  renewalNoticeDays: number;
  parentContractId: string | null;
  metadataJson: ContractMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContractMetadata {
  legalTerms?: string;
  specialConditions?: string[];
  amendmentHistory?: ContractAmendment[];
  salesRep?: string;
  opportunityId?: string;
}

export interface ContractAmendment {
  date: string;
  description: string;
  changedBy: string;
}

export interface ContractWithRelations extends Contract {
  billingProfile: DistrictBillingProfile;
  priceBook: PriceBook;
  lineItems: ContractLineItem[];
  entitlements: ContractEntitlement[];
  invoiceSchedules: ContractInvoiceSchedule[];
}

export const CreateContractSchema = z.object({
  billingProfileId: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().max(200).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  priceBookId: z.string().uuid(),
  poNumber: z.string().max(100).optional(),
  paymentType: z.nativeEnum(ContractPaymentType).default('INVOICE'),
  autoRenewal: z.boolean().default(false),
  renewalNoticeDays: z.number().int().min(0).max(365).default(90),
  metadataJson: z.record(z.unknown()).optional(),
});

export const UpdateContractStatusSchema = z.object({
  status: z.nativeEnum(ContractStatus),
  signedAt: z.coerce.date().optional(),
});

// ============================================================================
// Contract Line Item Types
// ============================================================================

export interface ContractLineItem {
  id: string;
  contractId: string;
  productId: string;
  sku: string;
  description: string;
  billingPeriod: ContractBillingPeriod;
  quantityCommitted: number;
  quantityMinimum: number | null;
  quantityMaximum: number | null;
  listPricePerUnit: number;
  unitPrice: number;
  discountPercent: number | null;
  discountReason: string | null;
  totalValueCents: bigint;
  startDate: Date | null;
  endDate: Date | null;
  metadataJson: LineItemMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LineItemMetadata {
  gradeBands?: string[];
  schoolAllocations?: Record<string, number>;
  notes?: string;
}

export const CreateContractLineItemSchema = z.object({
  contractId: z.string().uuid(),
  productId: z.string().uuid(),
  sku: z.string(),
  description: z.string().min(1).max(500),
  billingPeriod: z.nativeEnum(ContractBillingPeriod).default('ANNUAL'),
  quantityCommitted: z.number().int().positive(),
  quantityMinimum: z.number().int().positive().optional(),
  quantityMaximum: z.number().int().positive().optional(),
  listPricePerUnit: z.number().nonnegative(),
  unitPrice: z.number().nonnegative(),
  discountPercent: z.number().min(0).max(100).optional(),
  discountReason: z.string().max(500).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  metadataJson: z.record(z.unknown()).optional(),
});

// ============================================================================
// Contract Allocation Types
// ============================================================================

export interface ContractAllocation {
  id: string;
  lineItemId: string;
  schoolId: string;
  quantityAllocated: number;
  quantityUsed: number;
  metadataJson: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export const CreateContractAllocationSchema = z.object({
  lineItemId: z.string().uuid(),
  schoolId: z.string().uuid(),
  quantityAllocated: z.number().int().positive(),
  metadataJson: z.record(z.unknown()).optional(),
});

// ============================================================================
// Contract Entitlement Types
// ============================================================================

export interface ContractEntitlement {
  id: string;
  contractId: string;
  tenantId: string;
  featureKey: string;
  isActive: boolean;
  quantity: number | null;
  startDate: Date;
  endDate: Date;
  metadataJson: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export const CreateContractEntitlementSchema = z.object({
  contractId: z.string().uuid(),
  tenantId: z.string().uuid(),
  featureKey: z.string().min(1).max(100),
  quantity: z.number().int().positive().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  metadataJson: z.record(z.unknown()).optional(),
});

// ============================================================================
// Invoice Schedule Types
// ============================================================================

export interface ContractInvoiceSchedule {
  id: string;
  contractId: string;
  scheduledDate: Date;
  amountCents: bigint;
  description: string | null;
  invoiceId: string | null;
  status: InvoiceScheduleStatus;
  metadataJson: InvoiceScheduleMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceScheduleMetadata {
  periodStart?: string;
  periodEnd?: string;
  lineItemBreakdown?: Record<string, number>;
}

export const CreateInvoiceScheduleSchema = z.object({
  contractId: z.string().uuid(),
  scheduledDate: z.coerce.date(),
  amountCents: z.bigint().or(z.number().int().positive()),
  description: z.string().max(500).optional(),
  metadataJson: z.record(z.unknown()).optional(),
});

// ============================================================================
// API Response Types
// ============================================================================

export interface ContractSummary {
  id: string;
  contractNumber: string;
  name: string | null;
  tenantId: string;
  tenantName: string;
  status: ContractStatus;
  startDate: string;
  endDate: string;
  totalValueCents: string; // bigint as string
  lineItemCount: number;
  seatCount: number;
}

export interface ContractDetailResponse {
  contract: ContractWithRelations;
  summary: {
    totalSeats: number;
    seatsByGrade: Record<string, number>;
    addons: string[];
    totalAnnualValue: number;
  };
}

export interface EntitlementCheckResult {
  hasAccess: boolean;
  featureKey: string;
  quantity: number | null;
  expiresAt: string | null;
  contractId: string | null;
}

// ============================================================================
// Seed Data Types
// ============================================================================

export interface ProductSeedData {
  sku: string;
  name: string;
  description: string;
  category: ProductCategory;
  unitOfMeasure: string;
  sortOrder: number;
  metadataJson?: ProductMetadata;
}

export interface PriceBookSeedData {
  name: string;
  description: string;
  currency: string;
  isDefault: boolean;
  entries: PriceBookEntrySeedData[];
}

export interface PriceBookEntrySeedData {
  sku: string;
  unitPrice: number;
  billingPeriod: ContractBillingPeriod;
  minQuantity?: number;
  maxQuantity?: number;
  metadataJson?: PriceBookEntryMetadata;
}
