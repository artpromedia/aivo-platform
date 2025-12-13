/**
 * Parent Billing Service
 *
 * Core business logic for parent (consumer) billing:
 * - Checkout session creation
 * - Subscription management
 * - Module updates with proration
 * - Trial management
 * - Invoice retrieval
 */

import Stripe from 'stripe';

import type {
  BillingPeriod,
  CheckoutSessionRequest,
  CheckoutSessionResponse,
  ParentSku,
  ProrationPreview,
  SubscriptionItemSummary,
  SubscriptionSummary,
  UpdateModulesRequest,
  UpdateModulesResponse,
} from '@aivo/billing-common';

import {
  getSkuCatalog,
  getSkuConfig,
  getStripePriceId,
  isAddonSku,
  isBaseSku,
  isTrialEligible,
  ParentSkuSchema,
  validateSkuSelection,
} from '@aivo/billing-common';

import { config } from '../config.js';
import { prisma } from '../prisma.js';
import { CouponService } from './coupon.service.js';
import { TrialService } from './trial.service.js';

// ═══════════════════════════════════════════════════════════════════════════════
// STRIPE CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion,
  typescript: true,
});

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ServiceContext {
  tenantId: string;
  userId: string;
  correlationId: string;
}

interface StripeLineItem {
  price: string;
  quantity: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARENT BILLING SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class ParentBillingService {
  private trialService: TrialService;
  private couponService: CouponService;

  constructor() {
    this.trialService = new TrialService();
    this.couponService = new CouponService();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CHECKOUT SESSION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a Stripe Checkout session for subscription purchase
   */
  async createCheckoutSession(
    ctx: ServiceContext,
    request: CheckoutSessionRequest
  ): Promise<CheckoutSessionResponse> {
    const { tenantId, userId, correlationId } = ctx;
    const { learnerIds, selectedSkus, billingPeriod, couponCode, successUrl, cancelUrl } = request;

    // Validate SKU selection
    const parsedSkus = selectedSkus.map((sku) => {
      const result = ParentSkuSchema.safeParse(sku);
      if (!result.success) {
        throw new Error(`Invalid SKU: ${sku}`);
      }
      return result.data;
    });

    const validation = validateSkuSelection(parsedSkus);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Get or create billing account
    const billingAccount = await this.getOrCreateBillingAccount(tenantId, userId);

    // Get or create Stripe customer
    const stripeCustomerId = await this.getOrCreateStripeCustomer(
      billingAccount.id,
      billingAccount.billingEmail ?? undefined,
      tenantId
    );

    // Build line items for Stripe
    const lineItems = await this.buildCheckoutLineItems(
      tenantId,
      learnerIds,
      parsedSkus,
      billingPeriod
    );

    // Check for trial eligibility
    const trialEligibleItems = await this.getTrialEligibleItems(tenantId, learnerIds, parsedSkus);

    // Validate and resolve coupon
    let stripeCouponId: string | undefined;
    if (couponCode) {
      const couponResult = await this.couponService.validateCoupon(tenantId, couponCode, parsedSkus);
      if (!couponResult.valid) {
        throw new Error(couponResult.error ?? 'Invalid coupon');
      }
      stripeCouponId = couponResult.coupon?.stripeCouponId ?? undefined;
    }

    // Determine trial settings
    // If any add-on is trial-eligible, we apply trial to the subscription
    // (Stripe handles item-level trials via subscription_items)
    const hasTrialItems = trialEligibleItems.length > 0;
    const trialDays = hasTrialItems ? 30 : undefined;

    // Create Stripe Checkout Session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: lineItems.map((item) => ({
        price: item.price,
        quantity: item.quantity,
      })),
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        tenantId,
        userId,
        correlationId,
        learnerIds: JSON.stringify(learnerIds),
        skus: JSON.stringify(parsedSkus),
        billingPeriod,
      },
      subscription_data: {
        metadata: {
          tenantId,
          userId,
          learnerIds: JSON.stringify(learnerIds),
        },
        ...(trialDays ? { trial_period_days: trialDays } : {}),
      },
      allow_promotion_codes: !stripeCouponId, // Allow codes if no specific coupon
      ...(stripeCouponId
        ? {
            discounts: [{ coupon: stripeCouponId }],
          }
        : {}),
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return {
      checkoutUrl: session.url!,
      sessionId: session.id,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBSCRIPTION RETRIEVAL
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get current subscription for tenant
   */
  async getSubscription(ctx: ServiceContext): Promise<SubscriptionSummary | null> {
    const { tenantId } = ctx;

    // Find billing account
    const billingAccount = await prisma.billingAccount.findFirst({
      where: {
        tenantId,
        accountType: 'PARENT_CONSUMER',
      },
      include: {
        subscriptions: {
          where: {
            status: { in: ['ACTIVE', 'IN_TRIAL', 'PAST_DUE'] },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            subscriptionItems: {
              include: {
                plan: true,
              },
            },
            plan: true,
          },
        },
      },
    });

    if (!billingAccount?.subscriptions.length) {
      return null;
    }

    const subscription = billingAccount.subscriptions[0];
    const metadata = subscription.metadataJson as Record<string, unknown> | null;

    // Map subscription items
    const items: SubscriptionItemSummary[] = subscription.subscriptionItems.map((item) => {
      const skuConfig = getSkuConfig(item.sku as ParentSku);
      const itemMetadata = item.metadataJson as Record<string, unknown> | null;
      const trialEndsAt = itemMetadata?.['trialEndsAt'] as string | null;
      const isTrialing = trialEndsAt ? new Date(trialEndsAt) > new Date() : false;

      return {
        id: item.id,
        sku: item.sku as ParentSku,
        displayName: skuConfig?.displayName ?? item.sku,
        learnerId: item.learnerId,
        quantity: item.quantity,
        unitPriceCents: skuConfig?.monthlyPriceCents ?? 0,
        isTrialing,
        trialEndsAt,
        active: true, // Based on subscription status
      };
    });

    // Calculate total monthly amount
    const catalog = getSkuCatalog();
    const totalMonthlyAmountCents = items.reduce((sum, item) => {
      const config = catalog.skus[item.sku];
      return sum + (config?.monthlyPriceCents ?? 0) * item.quantity;
    }, 0);

    return {
      id: subscription.id,
      status: this.mapSubscriptionStatus(subscription.status),
      billingPeriod: (metadata?.['billingPeriod'] as BillingPeriod) ?? 'monthly',
      currentPeriodStart: subscription.currentPeriodStart.toISOString(),
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      limitedMode: (metadata?.['limitedMode'] as boolean) ?? false,
      items,
      totalMonthlyAmountCents,
      currency: 'usd',
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MODULE UPDATES WITH PRORATION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Update subscription modules (add/remove) with proration preview
   */
  async updateModules(
    ctx: ServiceContext,
    request: UpdateModulesRequest
  ): Promise<UpdateModulesResponse> {
    const { tenantId } = ctx;
    const { items, couponCode, preview } = request;

    // Get active subscription
    const subscription = await this.getActiveSubscription(tenantId);
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    const stripeSubscriptionId = subscription.providerSubscriptionId;
    if (!stripeSubscriptionId) {
      throw new Error('Subscription not linked to Stripe');
    }

    // Build Stripe subscription items update
    const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
      expand: ['items'],
    });

    const updateItems: Stripe.SubscriptionUpdateParams.Item[] = [];
    const billingPeriod = this.detectBillingPeriod(stripeSubscription);

    for (const update of items) {
      const sku = ParentSkuSchema.parse(update.sku);
      const priceId = getStripePriceId(sku, billingPeriod);

      if (update.action === 'ADD') {
        // Check trial eligibility for add-ons
        const trialEligible = isAddonSku(sku) && isTrialEligible(sku);
        let hasUsedTrial = false;

        if (trialEligible) {
          const eligibility = await this.trialService.checkEligibility(
            tenantId,
            update.learnerId,
            sku
          );
          hasUsedTrial = !eligibility.eligible;
        }

        updateItems.push({
          price: priceId,
          quantity: 1,
          metadata: {
            learnerId: update.learnerId,
            sku,
          },
          // Item-level trial if eligible and not used
          ...(trialEligible && !hasUsedTrial
            ? {
                trial_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
              }
            : {}),
        });
      } else {
        // REMOVE: Find existing item and mark for deletion
        const existingItem = stripeSubscription.items.data.find(
          (item) =>
            item.price.id === priceId &&
            item.metadata?.['learnerId'] === update.learnerId
        );

        if (existingItem) {
          updateItems.push({
            id: existingItem.id,
            deleted: true,
          });
        }
      }
    }

    // Generate proration preview
    const prorationPreview = await this.getProrationPreview(
      stripeSubscriptionId,
      updateItems
    );

    // If preview-only, return without applying changes
    if (preview) {
      const currentSummary = await this.getSubscription(ctx);
      return {
        success: true,
        subscription: currentSummary!,
        prorationPreview,
      };
    }

    // Apply coupon if provided
    let discountId: string | undefined;
    if (couponCode) {
      const couponResult = await this.couponService.validateCoupon(
        tenantId,
        couponCode,
        items.filter((i) => i.action === 'ADD').map((i) => i.sku as ParentSku)
      );
      if (couponResult.valid && couponResult.coupon?.stripeCouponId) {
        discountId = couponResult.coupon.stripeCouponId;
      }
    }

    // Apply the update to Stripe
    await stripe.subscriptions.update(stripeSubscriptionId, {
      items: updateItems,
      proration_behavior: 'create_prorations',
      ...(discountId ? { coupon: discountId } : {}),
    });

    // Record trial usage for added items
    for (const update of items) {
      if (update.action === 'ADD') {
        const sku = ParentSkuSchema.parse(update.sku);
        if (isAddonSku(sku) && isTrialEligible(sku)) {
          await this.trialService.recordTrialStart(
            tenantId,
            update.learnerId,
            sku,
            subscription.id
          );
        }
      }
    }

    // Sync subscription items to local DB
    await this.syncSubscriptionFromStripe(subscription.id, stripeSubscriptionId);

    // Return updated subscription
    const updatedSummary = await this.getSubscription(ctx);
    return {
      success: true,
      subscription: updatedSummary!,
      prorationPreview,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UPCOMING INVOICE
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get upcoming invoice preview
   */
  async getUpcomingInvoice(ctx: ServiceContext): Promise<ProrationPreview | null> {
    const { tenantId } = ctx;

    const subscription = await this.getActiveSubscription(tenantId);
    if (!subscription?.providerSubscriptionId) {
      return null;
    }

    const billingAccount = await prisma.billingAccount.findFirst({
      where: { tenantId, accountType: 'PARENT_CONSUMER' },
    });

    if (!billingAccount?.providerCustomerId) {
      return null;
    }

    try {
      const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
        customer: billingAccount.providerCustomerId,
        subscription: subscription.providerSubscriptionId,
      });

      return {
        amountDueCents: upcomingInvoice.amount_due,
        currency: upcomingInvoice.currency,
        prorationItems: upcomingInvoice.lines.data.map((line) => ({
          description: line.description ?? 'Line item',
          amountCents: line.amount,
          quantity: line.quantity ?? 1,
        })),
        nextInvoiceDate: upcomingInvoice.next_payment_attempt
          ? new Date(upcomingInvoice.next_payment_attempt * 1000).toISOString()
          : new Date(upcomingInvoice.period_end * 1000).toISOString(),
        immediateCharge: false,
      };
    } catch (_error: unknown) {
      // No upcoming invoice (e.g., subscription ending)
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // INVOICE HISTORY
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get paginated invoice history
   */
  async getInvoices(
    ctx: ServiceContext,
    limit = 10,
    startingAfter?: string
  ): Promise<{
    invoices: Array<{
      id: string;
      stripeInvoiceId: string;
      invoiceNumber: string | null;
      status: string;
      amountDueCents: number;
      amountPaidCents: number;
      currency: string;
      periodStart: string;
      periodEnd: string;
      hostedInvoiceUrl: string | null;
      invoicePdfUrl: string | null;
      createdAt: string;
    }>;
    hasMore: boolean;
  }> {
    const { tenantId } = ctx;

    const billingAccount = await prisma.billingAccount.findFirst({
      where: { tenantId, accountType: 'PARENT_CONSUMER' },
    });

    if (!billingAccount?.providerCustomerId) {
      return { invoices: [], hasMore: false };
    }

    // Fetch from Stripe for most up-to-date data
    const stripeInvoices = await stripe.invoices.list({
      customer: billingAccount.providerCustomerId,
      limit: limit + 1, // Fetch one extra to determine hasMore
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    const hasMore = stripeInvoices.data.length > limit;
    const invoices = stripeInvoices.data.slice(0, limit).map((inv) => ({
      id: inv.id,
      stripeInvoiceId: inv.id,
      invoiceNumber: inv.number,
      status: inv.status ?? 'draft',
      amountDueCents: inv.amount_due,
      amountPaidCents: inv.amount_paid,
      currency: inv.currency,
      periodStart: new Date(inv.period_start * 1000).toISOString(),
      periodEnd: new Date(inv.period_end * 1000).toISOString(),
      hostedInvoiceUrl: inv.hosted_invoice_url,
      invoicePdfUrl: inv.invoice_pdf,
      createdAt: new Date(inv.created * 1000).toISOString(),
    }));

    return { invoices, hasMore };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CANCEL SUBSCRIPTION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Cancel subscription at period end
   */
  async cancelSubscription(
    ctx: ServiceContext,
    immediate = false
  ): Promise<{ success: boolean; effectiveDate: string }> {
    const { tenantId } = ctx;

    const subscription = await this.getActiveSubscription(tenantId);
    if (!subscription?.providerSubscriptionId) {
      throw new Error('No active subscription found');
    }

    if (immediate) {
      await stripe.subscriptions.cancel(subscription.providerSubscriptionId);
    } else {
      await stripe.subscriptions.update(subscription.providerSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    // Update local record
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: !immediate,
        canceledAt: new Date(),
        ...(immediate ? { status: 'CANCELED' } : {}),
      },
    });

    return {
      success: true,
      effectiveDate: immediate
        ? new Date().toISOString()
        : subscription.currentPeriodEnd.toISOString(),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // BILLING PORTAL
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create Stripe Billing Portal session for self-service
   */
  async createBillingPortalSession(
    ctx: ServiceContext,
    returnUrl: string
  ): Promise<{ url: string }> {
    const { tenantId } = ctx;

    const billingAccount = await prisma.billingAccount.findFirst({
      where: { tenantId, accountType: 'PARENT_CONSUMER' },
    });

    if (!billingAccount?.providerCustomerId) {
      throw new Error('No billing account found');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: billingAccount.providerCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  private async getOrCreateBillingAccount(
    tenantId: string,
    userId: string
  ): Promise<{ id: string; billingEmail: string | null; providerCustomerId: string | null }> {
    let account = await prisma.billingAccount.findFirst({
      where: { tenantId, accountType: 'PARENT_CONSUMER' },
    });

    if (!account) {
      account = await prisma.billingAccount.create({
        data: {
          tenantId,
          accountType: 'PARENT_CONSUMER',
          ownerUserId: userId,
          displayName: `Parent Account ${tenantId.slice(0, 8)}`,
          provider: 'STRIPE',
        },
      });
    }

    return {
      id: account.id,
      billingEmail: account.billingEmail,
      providerCustomerId: account.providerCustomerId,
    };
  }

  private async getOrCreateStripeCustomer(
    billingAccountId: string,
    email?: string,
    tenantId?: string
  ): Promise<string> {
    const account = await prisma.billingAccount.findUnique({
      where: { id: billingAccountId },
    });

    if (account?.providerCustomerId) {
      return account.providerCustomerId;
    }

    const customer = await stripe.customers.create({
      email,
      metadata: {
        billingAccountId,
        tenantId: tenantId ?? '',
      },
    });

    await prisma.billingAccount.update({
      where: { id: billingAccountId },
      data: { providerCustomerId: customer.id },
    });

    return customer.id;
  }

  private async buildCheckoutLineItems(
    tenantId: string,
    learnerIds: string[],
    skus: ParentSku[],
    billingPeriod: BillingPeriod
  ): Promise<StripeLineItem[]> {
    const lineItems: StripeLineItem[] = [];
    const catalog = getSkuCatalog();

    for (const sku of skus) {
      const skuConfig = catalog.skus[sku];
      const priceId = getStripePriceId(sku, billingPeriod);

      if (isBaseSku(sku)) {
        // Base product: one per subscription
        lineItems.push({ price: priceId, quantity: 1 });
      } else {
        // Add-ons: one per learner
        lineItems.push({ price: priceId, quantity: learnerIds.length });
      }
    }

    return lineItems;
  }

  private async getTrialEligibleItems(
    tenantId: string,
    learnerIds: string[],
    skus: ParentSku[]
  ): Promise<Array<{ learnerId: string; sku: ParentSku }>> {
    const eligible: Array<{ learnerId: string; sku: ParentSku }> = [];

    for (const sku of skus) {
      if (!isTrialEligible(sku)) continue;

      for (const learnerId of learnerIds) {
        const eligibility = await this.trialService.checkEligibility(tenantId, learnerId, sku);
        if (eligibility.eligible) {
          eligible.push({ learnerId, sku });
        }
      }
    }

    return eligible;
  }

  private async getActiveSubscription(tenantId: string) {
    const billingAccount = await prisma.billingAccount.findFirst({
      where: { tenantId, accountType: 'PARENT_CONSUMER' },
      include: {
        subscriptions: {
          where: {
            status: { in: ['ACTIVE', 'IN_TRIAL', 'PAST_DUE'] },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return billingAccount?.subscriptions[0] ?? null;
  }

  private async getProrationPreview(
    subscriptionId: string,
    items: Stripe.SubscriptionUpdateParams.Item[]
  ): Promise<ProrationPreview> {
    const preview = await stripe.invoices.retrieveUpcoming({
      subscription: subscriptionId,
      subscription_items: items,
      subscription_proration_behavior: 'create_prorations',
    });

    return {
      amountDueCents: preview.amount_due,
      currency: preview.currency,
      prorationItems: preview.lines.data
        .filter((line) => line.proration)
        .map((line) => ({
          description: line.description ?? 'Proration',
          amountCents: line.amount,
          quantity: line.quantity ?? 1,
        })),
      nextInvoiceDate: preview.next_payment_attempt
        ? new Date(preview.next_payment_attempt * 1000).toISOString()
        : new Date().toISOString(),
      immediateCharge: preview.amount_due > 0,
    };
  }

  private async syncSubscriptionFromStripe(
    localSubscriptionId: string,
    stripeSubscriptionId: string
  ): Promise<void> {
    const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
      expand: ['items.data.price'],
    });

    // Update local subscription
    await prisma.subscription.update({
      where: { id: localSubscriptionId },
      data: {
        status: this.mapStripeStatus(stripeSubscription.status),
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      },
    });

    // Sync subscription items
    // (In production, do a more sophisticated diff)
    await prisma.subscriptionItem.deleteMany({
      where: { subscriptionId: localSubscriptionId },
    });

    for (const item of stripeSubscription.items.data) {
      const price = item.price as Stripe.Price;
      const metadata = item.metadata ?? {};

      // Find or create plan for this SKU
      const sku = metadata['sku'] ?? 'BASE';
      let plan = await prisma.plan.findFirst({ where: { sku } });

      if (!plan) {
        plan = await prisma.plan.create({
          data: {
            sku,
            planType: sku === 'BASE' ? 'PARENT_BASE' : 'PARENT_ADDON',
            name: sku,
            unitPriceCents: price.unit_amount ?? 0,
          },
        });
      }

      await prisma.subscriptionItem.create({
        data: {
          subscriptionId: localSubscriptionId,
          planId: plan.id,
          sku,
          quantity: item.quantity ?? 1,
          learnerId: metadata['learnerId'] ?? null,
          metadataJson: {
            stripeSubscriptionItemId: item.id,
            stripePriceId: price.id,
            trialEndsAt: item.trial_end
              ? new Date(item.trial_end * 1000).toISOString()
              : null,
          },
        },
      });
    }
  }

  private detectBillingPeriod(subscription: Stripe.Subscription): BillingPeriod {
    const firstItem = subscription.items.data[0];
    if (!firstItem) return 'monthly';

    const price = firstItem.price;
    if (price.recurring?.interval === 'year') {
      return 'yearly';
    }
    return 'monthly';
  }

  private mapSubscriptionStatus(
    status: string
  ): 'INCOMPLETE' | 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'UNPAID' {
    switch (status) {
      case 'IN_TRIAL':
        return 'TRIALING';
      case 'ACTIVE':
        return 'ACTIVE';
      case 'PAST_DUE':
        return 'PAST_DUE';
      case 'CANCELED':
      case 'EXPIRED':
        return 'CANCELED';
      default:
        return 'ACTIVE';
    }
  }

  private mapStripeStatus(
    status: Stripe.Subscription.Status
  ): 'IN_TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED' {
    switch (status) {
      case 'trialing':
        return 'IN_TRIAL';
      case 'active':
        return 'ACTIVE';
      case 'past_due':
        return 'PAST_DUE';
      case 'canceled':
        return 'CANCELED';
      case 'incomplete':
      case 'incomplete_expired':
      case 'unpaid':
      case 'paused':
        return 'EXPIRED';
      default:
        return 'EXPIRED';
    }
  }
}

// Export singleton
export const parentBillingService = new ParentBillingService();
