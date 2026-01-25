/**
 * Trial Conversion Service
 *
 * Manages trial-to-subscription conversion including:
 * - Trial period tracking
 * - Payment method attachment (store without charging)
 * - Auto-conversion when trial ends
 * - Promotional pricing for conversions
 */

import Stripe from 'stripe';

import { billingEventPublisher } from '../events/billing-event-publisher.js';
import { prisma } from '../prisma.js';

import { reminderService } from './reminder.service.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface TrialSubscriptionData {
  subscriptionId: string;
  tenantId: string;
  customerId: string;
  userEmail?: string;
  trialEndDate: Date;
  planId?: string;
  priceId?: string;
  quantity?: number;
}

interface AttachPaymentMethodParams {
  subscriptionId: string;
  paymentMethodId: string; // Stripe payment method ID
  setupForAutoCharge?: boolean;
}

interface ConvertTrialParams {
  subscriptionId: string;
  applyPromotionalPricing?: boolean;
  promoCode?: string;
  convertedBy?: string;
}

interface TrialConversionResult {
  success: boolean;
  subscriptionId?: string;
  invoiceId?: string;
  amountCharged?: number;
  discountApplied?: number;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRIAL CONVERSION SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

class TrialConversionService {
  private readonly stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
      apiVersion: '2025-04-30.basil',
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TRIAL SETUP
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a trial subscription with reminders scheduled
   */
  async setupTrialWithReminders(data: TrialSubscriptionData): Promise<{
    success: boolean;
    remindersScheduled: number;
    error?: string;
  }> {
    try {
      // Schedule reminders for this trial
      const reminderResult = await reminderService.scheduleTrialReminders({
        subscriptionId: data.subscriptionId,
        tenantId: data.tenantId,
        customerId: data.customerId,
        userEmail: data.userEmail,
        trialEndDate: data.trialEndDate,
        hasPaymentMethodOnFile: false,
      });

      return {
        success: true,
        remindersScheduled: reminderResult.remindersCreated,
      };
    } catch (error) {
      return {
        success: false,
        remindersScheduled: 0,
        error: error instanceof Error ? error.message : 'Failed to setup trial reminders',
      };
    }
  }

  /**
   * Get trial status for a subscription
   */
  async getTrialStatus(subscriptionId: string): Promise<{
    isInTrial: boolean;
    trialEndDate: Date | null;
    daysRemaining: number;
    hasPaymentMethodOnFile: boolean;
    willAutoConvert: boolean;
    pendingReminders: number;
  } | null> {
    // Get from Stripe
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

      if (!subscription.trial_end) {
        return {
          isInTrial: false,
          trialEndDate: null,
          daysRemaining: 0,
          hasPaymentMethodOnFile: !!subscription.default_payment_method,
          willAutoConvert: false,
          pendingReminders: 0,
        };
      }

      const trialEndDate = new Date(subscription.trial_end * 1000);
      const now = new Date();
      const daysRemaining = Math.max(
        0,
        Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      );

      // Count pending reminders
      const pendingReminders = await prisma.trialReminder.count({
        where: {
          subscriptionId,
          status: 'PENDING',
        },
      });

      return {
        isInTrial: subscription.status === 'trialing',
        trialEndDate,
        daysRemaining,
        hasPaymentMethodOnFile: !!subscription.default_payment_method,
        willAutoConvert: !!subscription.default_payment_method,
        pendingReminders,
      };
    } catch (error) {
      console.error(`Failed to get trial status for ${subscriptionId}:`, error);
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PAYMENT METHOD MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Attach payment method to trial subscription WITHOUT charging
   *
   * This stores the payment method on file so it can be charged
   * automatically when the trial ends, but does NOT charge it immediately.
   */
  async attachPaymentMethodToTrial(params: AttachPaymentMethodParams): Promise<{
    success: boolean;
    reminderType?: string;
    error?: string;
  }> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(params.subscriptionId);

      // Attach payment method to customer
      await this.stripe.paymentMethods.attach(params.paymentMethodId, {
        customer: subscription.customer as string,
      });

      // Set as default payment method for subscription
      await this.stripe.subscriptions.update(params.subscriptionId, {
        default_payment_method: params.paymentMethodId,
        // Important: Don't change trial settings - payment happens when trial ends
      });

      // Update reminders to show "payment will be charged" notices
      await reminderService.updateTrialRemindersPaymentStatus(params.subscriptionId, true);

      // Publish event
      await billingEventPublisher.publish('PAYMENT_METHOD_ATTACHED', {
        subscriptionId: params.subscriptionId,
        customerId: subscription.customer as string,
        paymentMethodId: params.paymentMethodId,
        isTrialSubscription: subscription.status === 'trialing',
        trialEndDate: subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
      });

      return {
        success: true,
        reminderType: 'PAYMENT_CHARGE_NOTICE',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to attach payment method';
      console.error(`Failed to attach payment method to ${params.subscriptionId}:`, error);
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Remove payment method from trial (cancel auto-conversion)
   */
  async removePaymentMethodFromTrial(subscriptionId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.stripe.subscriptions.update(subscriptionId, {
        default_payment_method: null as unknown as string,
      });

      // Update reminders back to trial-ending notices
      await reminderService.updateTrialRemindersPaymentStatus(subscriptionId, false);

      await billingEventPublisher.publish('PAYMENT_METHOD_REMOVED', {
        subscriptionId,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove payment method',
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TRIAL CONVERSION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Convert trial to paid subscription
   *
   * Can be called:
   * 1. Manually by user before trial ends
   * 2. Automatically when trial ends (if payment method on file)
   */
  async convertTrial(params: ConvertTrialParams): Promise<TrialConversionResult> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(params.subscriptionId);

      if (!subscription.default_payment_method) {
        return {
          success: false,
          error: 'No payment method on file. Please add a payment method first.',
        };
      }

      // Check for promotional pricing
      let couponId: string | undefined;

      if (params.promoCode) {
        // Validate and apply promo code
        const promoResult = await this.applyPromoCode(
          params.subscriptionId,
          params.promoCode,
          subscription.customer as string
        );
        if (promoResult.couponId) {
          couponId = promoResult.couponId;
        }
      } else if (params.applyPromotionalPricing) {
        // Check for automatic trial conversion pricing
        const promoRule = await prisma.promotionalPricing.findFirst({
          where: {
            type: 'TRIAL_CONVERSION',
            isActive: true,
            OR: [{ validFrom: null }, { validFrom: { lte: new Date() } }],
            AND: [{ OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }] }],
          },
          orderBy: { priority: 'desc' },
        });

        if (promoRule?.stripeCouponId) {
          couponId = promoRule.stripeCouponId;

          // Record redemption
          await prisma.promotionalPricingRedemption.create({
            data: {
              pricingId: promoRule.id,
              tenantId: subscription.metadata.tenantId ?? 'unknown',
              subscriptionId: params.subscriptionId,
              redeemedBy: params.convertedBy ?? 'system',
            },
          });

          await prisma.promotionalPricing.update({
            where: { id: promoRule.id },
            data: { redemptionCount: { increment: 1 } },
          });
        }
      }

      // End trial immediately and start billing
      const updateParams: Stripe.SubscriptionUpdateParams = {
        trial_end: 'now', // End trial immediately
      };

      if (couponId) {
        updateParams.coupon = couponId;
      }

      const updatedSubscription = await this.stripe.subscriptions.update(
        params.subscriptionId,
        updateParams
      );

      // Cancel any pending reminders
      await prisma.trialReminder.updateMany({
        where: {
          subscriptionId: params.subscriptionId,
          status: 'PENDING',
        },
        data: {
          status: 'CANCELLED',
        },
      });

      // Get the invoice created
      const invoices = await this.stripe.invoices.list({
        subscription: params.subscriptionId,
        limit: 1,
      });

      const invoice = invoices.data[0];

      // Publish conversion event
      await billingEventPublisher.publish('TRIAL_CONVERTED', {
        subscriptionId: params.subscriptionId,
        customerId: subscription.customer as string,
        invoiceId: invoice?.id,
        amountCents: invoice?.total,
        discountApplied: invoice?.discount ? (invoice.discount.coupon?.amount_off ?? 0) : 0,
      });

      return {
        success: true,
        subscriptionId: updatedSubscription.id,
        invoiceId: invoice?.id,
        amountCharged: invoice?.total,
        discountApplied: invoice?.discount ? (invoice.discount.coupon?.amount_off ?? 0) : 0,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Conversion failed';
      console.error(`Trial conversion failed for ${params.subscriptionId}:`, error);

      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Apply a promo code to get a coupon ID
   */
  private async applyPromoCode(
    subscriptionId: string,
    promoCode: string,
    customerId: string
  ): Promise<{ couponId?: string; error?: string }> {
    try {
      // Look up promotion code in Stripe
      const promoCodes = await this.stripe.promotionCodes.list({
        code: promoCode,
        active: true,
      });

      if (promoCodes.data.length === 0) {
        return { error: 'Invalid or expired promo code' };
      }

      const promotionCode = promoCodes.data[0];

      // Validate restrictions
      if (promotionCode.restrictions) {
        if (promotionCode.restrictions.first_time_transaction) {
          const charges = await this.stripe.charges.list({
            customer: customerId,
            limit: 1,
          });
          if (charges.data.length > 0) {
            return { error: 'Promo code is only valid for first-time customers' };
          }
        }
      }

      return { couponId: promotionCode.coupon.id };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to validate promo code',
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // AUTO-CONVERSION PROCESSING
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Process trials that need automatic conversion
   * Called by a scheduled job
   */
  async processAutoConversions(): Promise<{
    processed: number;
    converted: number;
    failed: number;
    errors: { subscriptionId: string; error: string }[];
  }> {
    // Note: Stripe handles auto-conversion automatically when trial ends
    // This method is for processing any that failed or need retry

    const result = {
      processed: 0,
      converted: 0,
      failed: 0,
      errors: [] as { subscriptionId: string; error: string }[],
    };

    // Find reminders that should have been processed but weren't
    const missedReminders = await prisma.trialReminder.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lt: new Date() },
        type: 'PAYMENT_CHARGE_NOTICE',
      },
      take: 100,
    });

    for (const reminder of missedReminders) {
      result.processed++;

      try {
        const status = await this.getTrialStatus(reminder.subscriptionId);

        if (!status) {
          // Subscription doesn't exist, cancel reminder
          await prisma.trialReminder.update({
            where: { id: reminder.id },
            data: { status: 'CANCELLED' },
          });
          continue;
        }

        if (!status.isInTrial) {
          // Already converted
          await prisma.trialReminder.update({
            where: { id: reminder.id },
            data: { status: 'SENT' },
          });
          result.converted++;
          continue;
        }

        // Still in trial but reminder was missed - send it now
        await billingEventPublisher.publish('TRIAL_PAYMENT_CHARGE_NOTICE', {
          subscriptionId: reminder.subscriptionId,
          userId: reminder.userId,
          emailAddress: reminder.emailAddress,
          daysRemaining: status.daysRemaining,
          trialEndDate: status.trialEndDate?.toISOString(),
        });

        await prisma.trialReminder.update({
          where: { id: reminder.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
          },
        });
      } catch (error) {
        result.failed++;
        result.errors.push({
          subscriptionId: reminder.subscriptionId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TRIAL CANCELLATION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Cancel a trial subscription
   */
  async cancelTrial(
    subscriptionId: string,
    reason?: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.stripe.subscriptions.cancel(subscriptionId);

      // Cancel all reminders
      await prisma.trialReminder.updateMany({
        where: {
          subscriptionId,
          status: 'PENDING',
        },
        data: {
          status: 'CANCELLED',
        },
      });

      await billingEventPublisher.publish('TRIAL_CANCELLED', {
        subscriptionId,
        reason,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel trial',
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ANALYTICS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get trial conversion statistics
   */
  async getTrialStats(): Promise<{
    activeTrials: number;
    trialsWithPaymentMethod: number;
    trialsEndingThisWeek: number;
    conversionRate30Day: number;
  }> {
    // This would integrate with your analytics system
    // For now, we'll query Stripe

    const subscriptions = await this.stripe.subscriptions.list({
      status: 'trialing',
      limit: 100,
    });

    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let trialsWithPayment = 0;
    let endingThisWeek = 0;

    for (const sub of subscriptions.data) {
      if (sub.default_payment_method) trialsWithPayment++;
      if (sub.trial_end) {
        const trialEnd = new Date(sub.trial_end * 1000);
        if (trialEnd <= oneWeekFromNow && trialEnd > now) {
          endingThisWeek++;
        }
      }
    }

    // For conversion rate, we'd need to track historical data
    // This is a placeholder
    const conversionRate =
      trialsWithPayment > 0 && subscriptions.data.length > 0
        ? (trialsWithPayment / subscriptions.data.length) * 100
        : 0;

    return {
      activeTrials: subscriptions.data.length,
      trialsWithPaymentMethod: trialsWithPayment,
      trialsEndingThisWeek: endingThisWeek,
      conversionRate30Day: conversionRate,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const trialConversionService = new TrialConversionService();
