/**
 * Dunning Service
 *
 * Handles payment failure recovery (dunning) and limited mode enforcement.
 *
 * DUNNING STRATEGY:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Day 0 (Payment Failure):
 *   - Mark subscription as PAST_DUE
 *   - Send first reminder notification
 *   - Log dunning record
 *
 * Day 3 (Second Reminder):
 *   - Send second reminder notification
 *   - Update dunning record
 *
 * Day 7 (Grace Period End):
 *   - Set limitedMode = true on subscription
 *   - Send final warning notification
 *   - Features restricted but data accessible
 *
 * On Payment Success:
 *   - Clear limitedMode
 *   - Mark subscription as ACTIVE
 *   - Send confirmation notification
 *
 */

import type { FastifyBaseLogger } from 'fastify';

import { config } from '../config.js';
import { prisma } from '../prisma.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface DunningContext {
  subscriptionId: string;
  billingAccountId: string;
  tenantId: string;
  stripeInvoiceId?: string;
  correlationId: string;
  log: FastifyBaseLogger;
}

export type DunningStage = 'day0' | 'day3' | 'day7';

export interface DunningResult {
  success: boolean;
  action:
    | 'dunning_started'
    | 'reminder_sent'
    | 'limited_mode_activated'
    | 'resolved'
    | 'none';
  newLimitedMode?: boolean;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DUNNING SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class DunningService {
  /**
   * Handle payment failure (Day 0)
   * Called when invoice.payment_failed webhook is received
   */
  async handlePaymentFailure(ctx: DunningContext): Promise<DunningResult> {
    const { subscriptionId, tenantId, stripeInvoiceId, correlationId, log } = ctx;

    log.info(
      { correlationId, subscriptionId, tenantId, stripeInvoiceId },
      'Dunning: Processing payment failure'
    );

    try {
      // Check for existing dunning record
      const existingDunning = await prisma.$queryRaw<Array<{ id: string; failure_count: number }>>`
        SELECT id, failure_count FROM dunning_records
        WHERE subscription_id = ${subscriptionId}::uuid
          AND resolved_at IS NULL
        LIMIT 1
      `;

      if (existingDunning.length > 0) {
        // Update existing dunning record
        await prisma.$executeRaw`
          UPDATE dunning_records SET
            latest_failure_at = now(),
            failure_count = failure_count + 1,
            stripe_invoice_id = COALESCE(${stripeInvoiceId}, stripe_invoice_id),
            updated_at = now()
          WHERE id = ${existingDunning[0].id}::uuid
        `;

        // Check if we should escalate
        const stage = await this.determineDunningStage(existingDunning[0].id);
        return this.handleDunningStage(ctx, stage, existingDunning[0].id);
      }

      // Create new dunning record
      const newDunning = await prisma.$queryRaw<Array<{ id: string }>>`
        INSERT INTO dunning_records (
          subscription_id, tenant_id, first_failure_at, latest_failure_at,
          day0_notified_at, stripe_invoice_id
        ) VALUES (
          ${subscriptionId}::uuid,
          ${tenantId}::uuid,
          now(),
          now(),
          now(),
          ${stripeInvoiceId ?? null}
        )
        RETURNING id
      `;

      // Update subscription to PAST_DUE
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: { status: 'PAST_DUE' },
      });

      // Send Day 0 notification
      await this.sendDunningNotification(tenantId, 'day0', subscriptionId);

      log.info(
        { correlationId, subscriptionId, dunningId: newDunning[0].id },
        'Dunning: Started dunning process'
      );

      return { success: true, action: 'dunning_started', newLimitedMode: false };
    } catch (error) {
      log.error({ correlationId, subscriptionId, error }, 'Dunning: Failed to process payment failure');
      return { success: false, action: 'none', error: String(error) };
    }
  }

  /**
   * Handle payment success
   * Called when invoice.payment_succeeded webhook is received
   */
  async handlePaymentSuccess(ctx: DunningContext): Promise<DunningResult> {
    const { subscriptionId, tenantId, correlationId, log } = ctx;

    log.info(
      { correlationId, subscriptionId, tenantId },
      'Dunning: Processing payment success'
    );

    try {
      // Resolve any active dunning records
      await prisma.$executeRaw`
        UPDATE dunning_records SET
          resolved_at = now(),
          resolution_type = 'PAYMENT_SUCCEEDED',
          updated_at = now()
        WHERE subscription_id = ${subscriptionId}::uuid
          AND resolved_at IS NULL
      `;

      // Clear limited mode and update status
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'ACTIVE',
          metadataJson: {
            limitedMode: false,
          },
        },
      });

      // Send resolution notification
      await this.sendDunningNotification(tenantId, 'resolved', subscriptionId);

      log.info({ correlationId, subscriptionId }, 'Dunning: Resolved, subscription active');

      return { success: true, action: 'resolved', newLimitedMode: false };
    } catch (error) {
      log.error({ correlationId, subscriptionId, error }, 'Dunning: Failed to process payment success');
      return { success: false, action: 'none', error: String(error) };
    }
  }

  /**
   * Check and update dunning status (called by scheduler)
   */
  async processDunningEscalations(log: FastifyBaseLogger): Promise<void> {
    // Find all unresolved dunning records
    const activeDunnings = await prisma.$queryRaw<
      Array<{
        id: string;
        subscription_id: string;
        tenant_id: string;
        first_failure_at: Date;
        day0_notified_at: Date | null;
        day3_notified_at: Date | null;
        day7_notified_at: Date | null;
        limited_mode_at: Date | null;
      }>
    >`
      SELECT id, subscription_id, tenant_id, first_failure_at,
             day0_notified_at, day3_notified_at, day7_notified_at, limited_mode_at
      FROM dunning_records
      WHERE resolved_at IS NULL
      ORDER BY first_failure_at ASC
    `;

    const now = new Date();

    for (const dunning of activeDunnings) {
      const daysSinceFailure = Math.floor(
        (now.getTime() - dunning.first_failure_at.getTime()) / (1000 * 60 * 60 * 24)
      );

      const ctx: DunningContext = {
        subscriptionId: dunning.subscription_id,
        billingAccountId: '', // Not needed for escalation
        tenantId: dunning.tenant_id,
        correlationId: `dunning-escalation-${dunning.id}`,
        log,
      };

      // Day 3: Second reminder
      if (daysSinceFailure >= 3 && !dunning.day3_notified_at) {
        await this.handleDunningStage(ctx, 'day3', dunning.id);
      }

      // Day 7: Limited mode
      if (daysSinceFailure >= 7 && !dunning.day7_notified_at) {
        await this.handleDunningStage(ctx, 'day7', dunning.id);
      }
    }
  }

  /**
   * Check if a tenant is in limited mode
   */
  async isInLimitedMode(tenantId: string): Promise<boolean> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        billingAccount: {
          tenantId,
          accountType: 'PARENT_CONSUMER',
        },
        status: { in: ['ACTIVE', 'PAST_DUE', 'IN_TRIAL'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return false; // No subscription = no limited mode (might be free tier)
    }

    const metadata = subscription.metadataJson as Record<string, unknown> | null;
    const limitedMode = metadata?.['limitedMode'];
    return typeof limitedMode === 'boolean' ? limitedMode : false;
  }

  /**
   * Get dunning status for a subscription
   */
  async getDunningStatus(subscriptionId: string): Promise<{
    inDunning: boolean;
    stage: DunningStage | null;
    daysSinceFailure: number | null;
    limitedMode: boolean;
  } | null> {
    const dunning = await prisma.$queryRaw<
      Array<{
        id: string;
        first_failure_at: Date;
        limited_mode_at: Date | null;
      }>
    >`
      SELECT id, first_failure_at, limited_mode_at
      FROM dunning_records
      WHERE subscription_id = ${subscriptionId}::uuid
        AND resolved_at IS NULL
      LIMIT 1
    `;

    if (dunning.length === 0) {
      return { inDunning: false, stage: null, daysSinceFailure: null, limitedMode: false };
    }

    const now = new Date();
    const daysSinceFailure = Math.floor(
      (now.getTime() - dunning[0].first_failure_at.getTime()) / (1000 * 60 * 60 * 24)
    );

    let stage: DunningStage;
    if (daysSinceFailure >= 7) {
      stage = 'day7';
    } else if (daysSinceFailure >= 3) {
      stage = 'day3';
    } else {
      stage = 'day0';
    }

    return {
      inDunning: true,
      stage,
      daysSinceFailure,
      limitedMode: dunning[0].limited_mode_at !== null,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  private async determineDunningStage(dunningId: string): Promise<DunningStage> {
    const dunning = await prisma.$queryRaw<Array<{ first_failure_at: Date }>>`
      SELECT first_failure_at FROM dunning_records WHERE id = ${dunningId}::uuid
    `;

    if (dunning.length === 0) return 'day0';

    const now = new Date();
    const daysSinceFailure = Math.floor(
      (now.getTime() - dunning[0].first_failure_at.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceFailure >= 7) return 'day7';
    if (daysSinceFailure >= 3) return 'day3';
    return 'day0';
  }

  private async handleDunningStage(
    ctx: DunningContext,
    stage: DunningStage,
    dunningId: string
  ): Promise<DunningResult> {
    const { subscriptionId, tenantId, correlationId, log } = ctx;

    log.info({ correlationId, subscriptionId, stage }, `Dunning: Processing ${stage}`);

    switch (stage) {
      case 'day0':
        // Already handled in handlePaymentFailure
        return { success: true, action: 'dunning_started', newLimitedMode: false };

      case 'day3':
        await prisma.$executeRaw`
          UPDATE dunning_records SET day3_notified_at = now(), updated_at = now()
          WHERE id = ${dunningId}::uuid
        `;
        await this.sendDunningNotification(tenantId, 'day3', subscriptionId);
        return { success: true, action: 'reminder_sent', newLimitedMode: false };

      case 'day7':
        // Activate limited mode
        await prisma.$executeRaw`
          UPDATE dunning_records SET
            day7_notified_at = now(),
            limited_mode_at = now(),
            updated_at = now()
          WHERE id = ${dunningId}::uuid
        `;

        // Update subscription metadata
        await prisma.subscription.update({
          where: { id: subscriptionId },
          data: {
            metadataJson: {
              limitedMode: true,
              limitedModeAt: new Date().toISOString(),
            },
          },
        });

        await this.sendDunningNotification(tenantId, 'day7', subscriptionId);

        log.warn({ correlationId, subscriptionId }, 'Dunning: Limited mode activated');

        return { success: true, action: 'limited_mode_activated', newLimitedMode: true };

      default:
        return { success: true, action: 'none' };
    }
  }

  private async sendDunningNotification(
    tenantId: string,
    stage: DunningStage | 'resolved',
    subscriptionId: string
  ): Promise<void> {
    const notificationTypes: Record<string, {
      type: string;
      subject: string;
      message: string;
      priority: 'high' | 'normal';
      template: string;
    }> = {
      day0: {
        type: 'PAYMENT_FAILED',
        subject: 'Action Required: Payment Failed',
        message: "We couldn't process your payment. Please update your payment method to continue your subscription.",
        priority: 'high',
        template: 'payment-failed',
      },
      day3: {
        type: 'PAYMENT_REMINDER',
        subject: 'Reminder: Payment Still Pending',
        message: 'Your payment is still pending. Please update your payment method within 4 days to avoid service interruption.',
        priority: 'high',
        template: 'payment-reminder',
      },
      day7: {
        type: 'LIMITED_MODE_ACTIVATED',
        subject: 'Service Limited: Payment Required',
        message: 'Your subscription is now in limited mode due to unpaid balance. Some features are restricted until payment is resolved.',
        priority: 'high',
        template: 'limited-mode-activated',
      },
      resolved: {
        type: 'PAYMENT_SUCCEEDED',
        subject: 'Payment Successful - Full Access Restored',
        message: 'Your payment was successful! Full access to all features has been restored.',
        priority: 'normal',
        template: 'payment-succeeded',
      },
    };

    const notification = notificationTypes[stage];
    if (!notification) {
      console.warn(`[Dunning] Unknown notification stage: ${stage}`);
      return;
    }

    console.log(`[Dunning Notification] tenant=${tenantId} type=${notification.type} subscription=${subscriptionId}`);

    // Get billing account owner for notification targeting
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        billingAccount: {
          select: {
            ownerUserId: true,
            email: true,
          },
        },
      },
    });

    if (!subscription?.billingAccount) {
      console.warn(`[Dunning] No billing account found for subscription: ${subscriptionId}`);
      return;
    }

    try {
      // Call notify-svc to send the notification
      const response = await fetch(`${config.services.notify}/internal/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Name': 'billing-svc',
        },
        body: JSON.stringify({
          tenantId,
          userId: subscription.billingAccount.ownerUserId,
          type: notification.type,
          channels: ['EMAIL', 'PUSH'], // Send via both email and push
          priority: notification.priority,
          payload: {
            subject: notification.subject,
            message: notification.message,
            template: notification.template,
            subscriptionId,
            billingPortalUrl: `${config.services.auth}/billing/portal`,
          },
          metadata: {
            source: 'dunning',
            stage,
            subscriptionId,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Dunning] Notification failed:`, {
          status: response.status,
          error: errorText,
          tenantId,
          stage,
        });
      } else {
        console.log(`[Dunning] Notification sent successfully`, {
          tenantId,
          type: notification.type,
          stage,
        });
      }
    } catch (error) {
      // Log but don't fail the dunning process if notification fails
      console.error(`[Dunning] Failed to send notification:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
        stage,
      });
    }
  }
}

// Export singleton
export const dunningService = new DunningService();
