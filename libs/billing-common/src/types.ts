/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */

/**
 * Billing Common Types
 *
 * Shared type definitions for billing across services.
 */

import { z } from 'zod';

import type { ParentSku } from './skuConfig.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Subscription status values
 */
export const SubscriptionStatusValues = [
  'INCOMPLETE',    // Payment pending/setup
  'ACTIVE',        // Paid and in good standing
  'TRIALING',      // In trial period
  'PAST_DUE',      // Payment failed, grace period
  'CANCELED',      // User canceled
  'UNPAID',        // Unpaid after grace period (limited mode)
] as const;

export type SubscriptionStatus = (typeof SubscriptionStatusValues)[number];

export const SubscriptionStatusSchema = z.enum(SubscriptionStatusValues);

/**
 * Billing period
 */
export const BillingPeriodValues = ['monthly', 'yearly'] as const;
export type BillingPeriod = (typeof BillingPeriodValues)[number];
export const BillingPeriodSchema = z.enum(BillingPeriodValues);

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST/RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Checkout session request
 */
export const CheckoutSessionRequestSchema = z.object({
  learnerIds: z.array(z.string().uuid()).min(1, 'At least one learner is required'),
  selectedSkus: z
    .array(z.string())
    .min(1, 'At least one SKU is required'),
  billingPeriod: BillingPeriodSchema.default('monthly'),
  couponCode: z.string().optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export type CheckoutSessionRequest = z.infer<typeof CheckoutSessionRequestSchema>;

/**
 * Checkout session response
 */
export interface CheckoutSessionResponse {
  checkoutUrl: string;
  sessionId: string;
}

/**
 * Module update action
 */
export const ModuleUpdateActionValues = ['ADD', 'REMOVE'] as const;
export type ModuleUpdateAction = (typeof ModuleUpdateActionValues)[number];

/**
 * Update modules request
 */
export const UpdateModulesRequestSchema = z.object({
  items: z.array(
    z.object({
      learnerId: z.string().uuid(),
      sku: z.string(),
      action: z.enum(ModuleUpdateActionValues),
    })
  ).min(1, 'At least one update is required'),
  couponCode: z.string().optional(),
  preview: z.boolean().default(false),
});

export type UpdateModulesRequest = z.infer<typeof UpdateModulesRequestSchema>;

/**
 * Proration preview
 */
export interface ProrationPreview {
  amountDueCents: number;
  currency: string;
  prorationItems: {
    description: string;
    amountCents: number;
    quantity: number;
  }[];
  nextInvoiceDate: string;
  immediateCharge: boolean;
}

/**
 * Update modules response
 */
export interface UpdateModulesResponse {
  success: boolean;
  subscription: SubscriptionSummary;
  prorationPreview?: ProrationPreview;
}

/**
 * Subscription summary for API responses
 */
export interface SubscriptionSummary {
  id: string;
  status: SubscriptionStatus;
  billingPeriod: BillingPeriod;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  limitedMode: boolean;
  items: SubscriptionItemSummary[];
  totalMonthlyAmountCents: number;
  currency: string;
}

/**
 * Subscription item summary
 */
export interface SubscriptionItemSummary {
  id: string;
  sku: ParentSku;
  displayName: string;
  learnerId: string | null;
  learnerName?: string;
  quantity: number;
  unitPriceCents: number;
  isTrialing: boolean;
  trialEndsAt: string | null;
  active: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVOICE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Invoice status
 */
export const InvoiceStatusValues = [
  'DRAFT',
  'OPEN',
  'PAID',
  'VOID',
  'UNCOLLECTIBLE',
] as const;

export type InvoiceStatus = (typeof InvoiceStatusValues)[number];

/**
 * Invoice summary for API responses
 */
export interface InvoiceSummary {
  id: string;
  invoiceNumber: string | null;
  status: InvoiceStatus;
  amountDueCents: number;
  amountPaidCents: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COUPON TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Discount type
 */
export const DiscountTypeValues = ['PERCENT', 'FIXED'] as const;
export type DiscountType = (typeof DiscountTypeValues)[number];

/**
 * Coupon creation request
 */
export const CreateCouponRequestSchema = z
  .object({
    code: z
      .string()
      .min(3)
      .max(50)
      .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase alphanumeric with hyphens/underscores'),
    discountType: z.enum(DiscountTypeValues),
    percentOff: z.number().min(1).max(100).optional(),
    amountOffCents: z.number().min(1).optional(),
    currency: z.string().length(3).optional(),
    validFrom: z.string().datetime().optional(),
    validTo: z.string().datetime().optional(),
    maxRedemptions: z.number().int().min(1).optional(),
    tenantId: z.string().uuid().optional(), // null for global coupons
    applicableSkus: z.array(z.string()).optional(), // null for all SKUs
    description: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      if (data.discountType === 'PERCENT') {
        return data.percentOff !== undefined && data.percentOff > 0;
      }
      return data.amountOffCents !== undefined && data.amountOffCents > 0;
    },
    {
      message: 'PERCENT discount requires percentOff; FIXED requires amountOffCents',
    }
  )
  .refine(
    (data) => {
      if (data.validFrom && data.validTo) {
        return new Date(data.validFrom) <= new Date(data.validTo);
      }
      return true;
    },
    {
      message: 'validFrom must be before or equal to validTo',
    }
  );

export type CreateCouponRequest = z.infer<typeof CreateCouponRequestSchema>;

/**
 * Coupon summary
 */
export interface CouponSummary {
  id: string;
  code: string;
  discountType: DiscountType;
  percentOff: number | null;
  amountOffCents: number | null;
  currency: string | null;
  validFrom: string | null;
  validTo: string | null;
  maxRedemptions: number | null;
  timesRedeemed: number;
  tenantId: string | null;
  applicableSkus: string[] | null;
  description: string | null;
  stripeCouponId: string | null;
  active: boolean;
  createdAt: string;
}

/**
 * Coupon validation result
 */
export interface CouponValidationResult {
  valid: boolean;
  coupon: CouponSummary | null;
  error?: string;
  discountAmountCents?: number;
  discountPercent?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRIAL TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Trial eligibility check result
 */
export interface TrialEligibility {
  sku: ParentSku;
  learnerId: string;
  eligible: boolean;
  reason?: string;
  previousTrialEndedAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Daily analytics snapshot
 */
export interface AnalyticsDaily {
  date: string;
  tenantId: string | null;
  mrrCents: number;
  activeSubscriptions: number;
  trialsStarted: number;
  trialsConverted: number;
  churnedSubscriptions: number;
}

/**
 * Analytics summary for dashboard
 */
export interface AnalyticsSummary {
  period: {
    from: string;
    to: string;
  };
  totals: {
    mrrCents: number;
    activeSubscriptions: number;
    trialsStarted: number;
    trialsConverted: number;
    churnedSubscriptions: number;
    trialConversionRate: number;
    churnRate: number;
  };
  byDate: AnalyticsDaily[];
  bySku: {
    sku: string;
    activeCount: number;
    mrrCents: number;
  }[];
}
