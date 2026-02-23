/**
 * Type declarations for @aivo/billing-common package
 * This is a stub file until the shared package is properly set up.
 */

declare module '@aivo/billing-common' {
  import type { z } from 'zod';

  // ============================================================================
  // SKU Types
  // ============================================================================

  export type ParentSku =
    | 'BASE'
    | 'ADDON_SPEECH'
    | 'ADDON_SEL'
    | 'ADDON_SCIENCE'
    | 'ADDON_TUTORING';

  export const ParentSkuSchema: z.ZodEnum<
    ['BASE', 'ADDON_SPEECH', 'ADDON_SEL', 'ADDON_SCIENCE', 'ADDON_TUTORING']
  >;

  // ============================================================================
  // Billing Types
  // ============================================================================

  export type BillingPeriod = 'monthly' | 'yearly';

  export type DiscountType = 'PERCENT' | 'FIXED';

  // ============================================================================
  // Checkout Types
  // ============================================================================

  export interface CheckoutSessionRequest {
    learnerIds: string[];
    selectedSkus: string[];
    billingPeriod: BillingPeriod;
    couponCode?: string;
    successUrl: string;
    cancelUrl: string;
  }

  export interface CheckoutSessionResponse {
    checkoutUrl: string;
    sessionId: string;
  }

  // ============================================================================
  // Subscription Types
  // ============================================================================

  export interface SubscriptionSummary {
    id: string;
    status: string;
    billingPeriod: BillingPeriod;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    limitedMode: boolean;
    items: SubscriptionItemSummary[];
    totalMonthlyAmountCents: number;
    currency: string;
  }

  export interface SubscriptionItemSummary {
    id: string;
    sku: ParentSku;
    displayName: string;
    learnerId: string | null;
    quantity: number;
    unitPriceCents: number;
    isTrialing: boolean;
    trialEndsAt: string | null;
    active: boolean;
  }

  // ============================================================================
  // Module Update Types
  // ============================================================================

  export interface UpdateModulesRequest {
    items: {
      sku: string;
      learnerId: string;
      action: 'ADD' | 'REMOVE';
    }[];
    couponCode?: string;
    preview?: boolean;
  }

  export interface UpdateModulesResponse {
    success: boolean;
    subscription: SubscriptionSummary;
    prorationPreview?: ProrationPreview;
  }

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

  // ============================================================================
  // Coupon Types
  // ============================================================================

  export interface CreateCouponRequest {
    code: string;
    discountType: DiscountType;
    percentOff?: number;
    amountOffCents?: number;
    currency?: string;
    validFrom?: string;
    validTo?: string;
    maxRedemptions?: number;
    tenantId?: string;
    applicableSkus?: string[];
    description?: string;
  }

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

  export interface CouponValidationResult {
    valid: boolean;
    coupon: CouponSummary | null;
    error?: string;
    discountAmountCents?: number;
    discountPercent?: number;
  }

  // ============================================================================
  // SKU Helper Functions
  // ============================================================================

  export interface SkuConfig {
    sku: ParentSku;
    displayName: string;
    description: string;
    monthlyPriceCents: number;
    yearlyPriceCents: number;
    trialDays: number;
    stripePriceIds: {
      monthly: string;
      yearly: string;
    };
  }

  export interface SkuCatalog {
    skus: Record<ParentSku, SkuConfig>;
  }

  export function getSkuCatalog(): SkuCatalog;
  export function getSkuConfig(sku: ParentSku): SkuConfig | undefined;
  export function getStripePriceId(sku: ParentSku, period: BillingPeriod): string;
  export function isBaseSku(sku: ParentSku): boolean;
  export function isAddonSku(sku: ParentSku): boolean;
  export function isTrialEligible(sku: ParentSku): boolean;
  export function validateSkuSelection(skus: ParentSku[]): {
    valid: boolean;
    error?: string;
  };
}
