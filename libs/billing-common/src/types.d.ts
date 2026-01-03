/**
 * Billing Common Types
 *
 * Shared type definitions for billing across services.
 */
import { z } from 'zod';
import type { ParentSku } from './skuConfig.js';
/**
 * Subscription status values
 */
export declare const SubscriptionStatusValues: readonly ["INCOMPLETE", "ACTIVE", "TRIALING", "PAST_DUE", "CANCELED", "UNPAID"];
export type SubscriptionStatus = (typeof SubscriptionStatusValues)[number];
export declare const SubscriptionStatusSchema: z.ZodEnum<["INCOMPLETE", "ACTIVE", "TRIALING", "PAST_DUE", "CANCELED", "UNPAID"]>;
/**
 * Billing period
 */
export declare const BillingPeriodValues: readonly ["monthly", "yearly"];
export type BillingPeriod = (typeof BillingPeriodValues)[number];
export declare const BillingPeriodSchema: z.ZodEnum<["monthly", "yearly"]>;
/**
 * Checkout session request
 */
export declare const CheckoutSessionRequestSchema: z.ZodObject<{
    learnerIds: z.ZodArray<z.ZodString, "many">;
    selectedSkus: z.ZodArray<z.ZodString, "many">;
    billingPeriod: z.ZodDefault<z.ZodEnum<["monthly", "yearly"]>>;
    couponCode: z.ZodOptional<z.ZodString>;
    successUrl: z.ZodString;
    cancelUrl: z.ZodString;
}, "strip", z.ZodTypeAny, {
    learnerIds?: string[];
    selectedSkus?: string[];
    billingPeriod?: "monthly" | "yearly";
    couponCode?: string;
    successUrl?: string;
    cancelUrl?: string;
}, {
    learnerIds?: string[];
    selectedSkus?: string[];
    billingPeriod?: "monthly" | "yearly";
    couponCode?: string;
    successUrl?: string;
    cancelUrl?: string;
}>;
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
export declare const ModuleUpdateActionValues: readonly ["ADD", "REMOVE"];
export type ModuleUpdateAction = (typeof ModuleUpdateActionValues)[number];
/**
 * Update modules request
 */
export declare const UpdateModulesRequestSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        learnerId: z.ZodString;
        sku: z.ZodString;
        action: z.ZodEnum<["ADD", "REMOVE"]>;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sku?: string;
        action?: "ADD" | "REMOVE";
    }, {
        learnerId?: string;
        sku?: string;
        action?: "ADD" | "REMOVE";
    }>, "many">;
    couponCode: z.ZodOptional<z.ZodString>;
    preview: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    couponCode?: string;
    items?: {
        learnerId?: string;
        sku?: string;
        action?: "ADD" | "REMOVE";
    }[];
    preview?: boolean;
}, {
    couponCode?: string;
    items?: {
        learnerId?: string;
        sku?: string;
        action?: "ADD" | "REMOVE";
    }[];
    preview?: boolean;
}>;
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
/**
 * Invoice status
 */
export declare const InvoiceStatusValues: readonly ["DRAFT", "OPEN", "PAID", "VOID", "UNCOLLECTIBLE"];
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
/**
 * Discount type
 */
export declare const DiscountTypeValues: readonly ["PERCENT", "FIXED"];
export type DiscountType = (typeof DiscountTypeValues)[number];
/**
 * Coupon creation request
 */
export declare const CreateCouponRequestSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    code: z.ZodString;
    discountType: z.ZodEnum<["PERCENT", "FIXED"]>;
    percentOff: z.ZodOptional<z.ZodNumber>;
    amountOffCents: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodOptional<z.ZodString>;
    validFrom: z.ZodOptional<z.ZodString>;
    validTo: z.ZodOptional<z.ZodString>;
    maxRedemptions: z.ZodOptional<z.ZodNumber>;
    tenantId: z.ZodOptional<z.ZodString>;
    applicableSkus: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    code?: string;
    tenantId?: string;
    discountType?: "PERCENT" | "FIXED";
    percentOff?: number;
    amountOffCents?: number;
    currency?: string;
    validFrom?: string;
    validTo?: string;
    maxRedemptions?: number;
    applicableSkus?: string[];
}, {
    description?: string;
    code?: string;
    tenantId?: string;
    discountType?: "PERCENT" | "FIXED";
    percentOff?: number;
    amountOffCents?: number;
    currency?: string;
    validFrom?: string;
    validTo?: string;
    maxRedemptions?: number;
    applicableSkus?: string[];
}>, {
    description?: string;
    code?: string;
    tenantId?: string;
    discountType?: "PERCENT" | "FIXED";
    percentOff?: number;
    amountOffCents?: number;
    currency?: string;
    validFrom?: string;
    validTo?: string;
    maxRedemptions?: number;
    applicableSkus?: string[];
}, {
    description?: string;
    code?: string;
    tenantId?: string;
    discountType?: "PERCENT" | "FIXED";
    percentOff?: number;
    amountOffCents?: number;
    currency?: string;
    validFrom?: string;
    validTo?: string;
    maxRedemptions?: number;
    applicableSkus?: string[];
}>, {
    description?: string;
    code?: string;
    tenantId?: string;
    discountType?: "PERCENT" | "FIXED";
    percentOff?: number;
    amountOffCents?: number;
    currency?: string;
    validFrom?: string;
    validTo?: string;
    maxRedemptions?: number;
    applicableSkus?: string[];
}, {
    description?: string;
    code?: string;
    tenantId?: string;
    discountType?: "PERCENT" | "FIXED";
    percentOff?: number;
    amountOffCents?: number;
    currency?: string;
    validFrom?: string;
    validTo?: string;
    maxRedemptions?: number;
    applicableSkus?: string[];
}>;
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
//# sourceMappingURL=types.d.ts.map