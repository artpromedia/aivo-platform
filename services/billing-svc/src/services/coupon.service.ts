/**
 * Coupon Service
 *
 * Manages discount coupons for parent subscriptions.
 * Supports global and tenant-specific coupons, syncs with Stripe.
 */

import Stripe from 'stripe';

import type {
  CouponSummary,
  CouponValidationResult,
  CreateCouponRequest,
  DiscountType,
  ParentSku,
} from '@aivo/billing-common';

import { config } from '../config.js';
import { prisma } from '../prisma.js';

// ═══════════════════════════════════════════════════════════════════════════════
// STRIPE CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion,
  typescript: true,
});

// ═══════════════════════════════════════════════════════════════════════════════
// COUPON SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class CouponService {
  /**
   * Create a new coupon
   */
  async createCoupon(request: CreateCouponRequest, createdBy?: string): Promise<CouponSummary> {
    // Create Stripe coupon first
    const stripeCouponParams: Stripe.CouponCreateParams = {
      id: request.code.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name: request.code,
      ...(request.discountType === 'PERCENT'
        ? { percent_off: request.percentOff }
        : { amount_off: request.amountOffCents, currency: request.currency ?? 'usd' }),
      ...(request.maxRedemptions ? { max_redemptions: request.maxRedemptions } : {}),
      ...(request.validTo
        ? { redeem_by: Math.floor(new Date(request.validTo).getTime() / 1000) }
        : {}),
      metadata: {
        aivoCode: request.code,
        tenantId: request.tenantId ?? 'global',
        applicableSkus: request.applicableSkus?.join(',') ?? 'all',
      },
    };

    const stripeCoupon = await stripe.coupons.create(stripeCouponParams);

    // Create promotion code for the coupon (allows code-based redemption)
    const promoCode = await stripe.promotionCodes.create({
      coupon: stripeCoupon.id,
      code: request.code,
      active: true,
      ...(request.maxRedemptions ? { max_redemptions: request.maxRedemptions } : {}),
    });

    // Create local record
    const coupon = await prisma.$queryRaw<
      Array<{
        id: string;
        code: string;
        discount_type: string;
        percent_off: number | null;
        amount_off_cents: number | null;
        currency: string | null;
        valid_from: Date | null;
        valid_to: Date | null;
        max_redemptions: number | null;
        times_redeemed: number;
        tenant_id: string | null;
        applicable_skus: string[] | null;
        description: string | null;
        stripe_coupon_id: string | null;
        stripe_promotion_code_id: string | null;
        is_active: boolean;
        created_at: Date;
      }>
    >`
      INSERT INTO coupons (
        code, discount_type, percent_off, amount_off_cents, currency,
        valid_from, valid_to, max_redemptions, tenant_id, applicable_skus,
        description, stripe_coupon_id, stripe_promotion_code_id, created_by
      ) VALUES (
        ${request.code},
        ${request.discountType},
        ${request.percentOff ?? null},
        ${request.amountOffCents ?? null},
        ${request.currency ?? null},
        ${request.validFrom ? new Date(request.validFrom) : null},
        ${request.validTo ? new Date(request.validTo) : null},
        ${request.maxRedemptions ?? null},
        ${request.tenantId ?? null}::uuid,
        ${request.applicableSkus ?? null},
        ${request.description ?? null},
        ${stripeCoupon.id},
        ${promoCode.id},
        ${createdBy ?? null}::uuid
      )
      RETURNING *
    `;

    return this.mapCouponToSummary(coupon[0]);
  }

  /**
   * Get coupon by ID
   */
  async getCoupon(couponId: string): Promise<CouponSummary | null> {
    const coupons = await prisma.$queryRaw<Array<CouponRow>>`
      SELECT * FROM coupons WHERE id = ${couponId}::uuid
    `;

    if (coupons.length === 0) return null;
    return this.mapCouponToSummary(coupons[0]);
  }

  /**
   * Get coupon by code
   */
  async getCouponByCode(code: string): Promise<CouponSummary | null> {
    const coupons = await prisma.$queryRaw<Array<CouponRow>>`
      SELECT * FROM coupons WHERE code = ${code.toUpperCase()}
    `;

    if (coupons.length === 0) return null;
    return this.mapCouponToSummary(coupons[0]);
  }

  /**
   * List coupons with optional filters
   */
  async listCoupons(filters?: {
    tenantId?: string | null;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ coupons: CouponSummary[]; total: number }> {
    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    const coupons = await prisma.$queryRaw<CouponRow[]>`
      SELECT * FROM coupons
      WHERE 1=1
      ${filters?.isActive !== undefined ? prisma.$queryRaw`AND is_active = ${filters.isActive}` : prisma.$queryRaw``}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM coupons WHERE 1=1
    `;

    return {
      coupons: coupons.map((row) => this.mapCouponToSummary(row)),
      total: Number(countResult[0].count),
    };
  }

  /**
   * Validate a coupon code for a tenant
   */
  async validateCoupon(
    tenantId: string,
    code: string,
    skus?: ParentSku[]
  ): Promise<CouponValidationResult> {
    const coupon = await this.getCouponByCode(code);

    if (!coupon) {
      return { valid: false, coupon: null, error: 'Coupon not found' };
    }

    // Check if active
    if (!coupon.active) {
      return { valid: false, coupon, error: 'Coupon is no longer active' };
    }

    // Check validity period
    const now = new Date();
    if (coupon.validFrom && new Date(coupon.validFrom) > now) {
      return { valid: false, coupon, error: 'Coupon is not yet valid' };
    }
    if (coupon.validTo && new Date(coupon.validTo) < now) {
      return { valid: false, coupon, error: 'Coupon has expired' };
    }

    // Check redemption limit
    if (coupon.maxRedemptions && coupon.timesRedeemed >= coupon.maxRedemptions) {
      return { valid: false, coupon, error: 'Coupon has reached maximum redemptions' };
    }

    // Check tenant restriction
    if (coupon.tenantId && coupon.tenantId !== tenantId) {
      return { valid: false, coupon, error: 'Coupon is not valid for this account' };
    }

    // Check SKU restriction
    if (coupon.applicableSkus && skus) {
      const hasApplicableSku = skus.some((sku) => coupon.applicableSkus!.includes(sku));
      if (!hasApplicableSku) {
        return { valid: false, coupon, error: 'Coupon is not valid for selected products' };
      }
    }

    return {
      valid: true,
      coupon,
      discountAmountCents: coupon.amountOffCents ?? undefined,
      discountPercent: coupon.percentOff ?? undefined,
    };
  }

  /**
   * Update coupon
   */
  async updateCoupon(
    couponId: string,
    updates: Partial<{
      isActive: boolean;
      validTo: string;
      maxRedemptions: number;
      description: string;
    }>
  ): Promise<CouponSummary | null> {
    const existing = await this.getCoupon(couponId);
    if (!existing) return null;

    // Update Stripe coupon if needed
    if (existing.stripeCouponId) {
      const stripeUpdates: Stripe.CouponUpdateParams = {};
      if (updates.description) {
        stripeUpdates.name = updates.description;
      }
      if (Object.keys(stripeUpdates).length > 0) {
        await stripe.coupons.update(existing.stripeCouponId, stripeUpdates);
      }
    }

    // Update local record
    await prisma.$executeRaw`
      UPDATE coupons SET
        is_active = COALESCE(${updates.isActive ?? null}, is_active),
        valid_to = COALESCE(${updates.validTo ? new Date(updates.validTo) : null}, valid_to),
        max_redemptions = COALESCE(${updates.maxRedemptions ?? null}, max_redemptions),
        description = COALESCE(${updates.description ?? null}, description),
        updated_at = now()
      WHERE id = ${couponId}::uuid
    `;

    return this.getCoupon(couponId);
  }

  /**
   * Deactivate a coupon
   */
  async deactivateCoupon(couponId: string): Promise<void> {
    const coupon = await this.getCoupon(couponId);
    if (!coupon) return;

    // Deactivate in Stripe
    if (coupon.stripeCouponId) {
      await stripe.coupons.del(coupon.stripeCouponId);
    }

    // Deactivate locally
    await prisma.$executeRaw`
      UPDATE coupons SET is_active = false, updated_at = now()
      WHERE id = ${couponId}::uuid
    `;
  }

  /**
   * Record a coupon redemption
   */
  async recordRedemption(
    couponId: string,
    tenantId: string,
    billingAccountId: string,
    subscriptionId: string | null,
    discountAmountCents: number,
    currency: string,
    stripeInvoiceId?: string
  ): Promise<void> {
    await prisma.$executeRaw`
      INSERT INTO coupon_redemptions (
        coupon_id, tenant_id, billing_account_id, subscription_id,
        discount_amount_cents, currency, stripe_invoice_id
      ) VALUES (
        ${couponId}::uuid,
        ${tenantId}::uuid,
        ${billingAccountId}::uuid,
        ${subscriptionId}::uuid,
        ${discountAmountCents},
        ${currency},
        ${stripeInvoiceId ?? null}
      )
    `;
    // Trigger increments times_redeemed automatically
  }

  /**
   * Get redemption history for a coupon
   */
  async getRedemptionHistory(
    couponId: string,
    limit = 50
  ): Promise<
    Array<{
      id: string;
      tenantId: string;
      discountAmountCents: number;
      currency: string;
      appliedAt: Date;
    }>
  > {
    return prisma.$queryRaw<
      Array<{
        id: string;
        tenantId: string;
        discountAmountCents: number;
        currency: string;
        appliedAt: Date;
      }>
    >`
      SELECT id, tenant_id as "tenantId", discount_amount_cents as "discountAmountCents",
             currency, applied_at as "appliedAt"
      FROM coupon_redemptions
      WHERE coupon_id = ${couponId}::uuid
      ORDER BY applied_at DESC
      LIMIT ${limit}
    `;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  private mapCouponToSummary(row: CouponRow): CouponSummary {
    return {
      id: row.id,
      code: row.code,
      discountType: row.discount_type as DiscountType,
      percentOff: row.percent_off,
      amountOffCents: row.amount_off_cents,
      currency: row.currency,
      validFrom: row.valid_from?.toISOString() ?? null,
      validTo: row.valid_to?.toISOString() ?? null,
      maxRedemptions: row.max_redemptions,
      timesRedeemed: row.times_redeemed,
      tenantId: row.tenant_id,
      applicableSkus: row.applicable_skus,
      description: row.description,
      stripeCouponId: row.stripe_coupon_id,
      active: row.is_active,
      createdAt: row.created_at.toISOString(),
    };
  }
}

// Row type from database
interface CouponRow {
  id: string;
  code: string;
  discount_type: string;
  percent_off: number | null;
  amount_off_cents: number | null;
  currency: string | null;
  valid_from: Date | null;
  valid_to: Date | null;
  max_redemptions: number | null;
  times_redeemed: number;
  tenant_id: string | null;
  applicable_skus: string[] | null;
  description: string | null;
  stripe_coupon_id: string | null;
  stripe_promotion_code_id: string | null;
  is_active: boolean;
  created_at: Date;
}

// Export singleton
export const couponService = new CouponService();
