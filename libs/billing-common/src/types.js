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
// ═══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION TYPES
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Subscription status values
 */
export const SubscriptionStatusValues = [
    'INCOMPLETE', // Payment pending/setup
    'ACTIVE', // Paid and in good standing
    'TRIALING', // In trial period
    'PAST_DUE', // Payment failed, grace period
    'CANCELED', // User canceled
    'UNPAID', // Unpaid after grace period (limited mode)
];
export const SubscriptionStatusSchema = z.enum(SubscriptionStatusValues);
/**
 * Billing period
 */
export const BillingPeriodValues = ['monthly', 'yearly'];
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
/**
 * Module update action
 */
export const ModuleUpdateActionValues = ['ADD', 'REMOVE'];
/**
 * Update modules request
 */
export const UpdateModulesRequestSchema = z.object({
    items: z.array(z.object({
        learnerId: z.string().uuid(),
        sku: z.string(),
        action: z.enum(ModuleUpdateActionValues),
    })).min(1, 'At least one update is required'),
    couponCode: z.string().optional(),
    preview: z.boolean().default(false),
});
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
];
// ═══════════════════════════════════════════════════════════════════════════════
// COUPON TYPES
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Discount type
 */
export const DiscountTypeValues = ['PERCENT', 'FIXED'];
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
    .refine((data) => {
    if (data.discountType === 'PERCENT') {
        return data.percentOff !== undefined && data.percentOff > 0;
    }
    return data.amountOffCents !== undefined && data.amountOffCents > 0;
}, {
    message: 'PERCENT discount requires percentOff; FIXED requires amountOffCents',
})
    .refine((data) => {
    if (data.validFrom && data.validTo) {
        return new Date(data.validFrom) <= new Date(data.validTo);
    }
    return true;
}, {
    message: 'validFrom must be before or equal to validTo',
});
//# sourceMappingURL=types.js.map