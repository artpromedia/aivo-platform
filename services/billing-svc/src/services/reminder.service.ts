/**
 * Trial & Pilot Reminder Service
 *
 * Manages scheduled reminders for:
 * - Trial ending notifications (14 days, 7 days, 48 hours before)
 * - Pilot ending notifications (14 days, 7 days, 48 hours before)
 * - Payment charge notices (48 hours before first charge)
 * - Conversion opportunities
 */

import { billingEventPublisher, BillingEventType } from '../events/billing.publisher.js';
import { config } from '../config.js';
import { prisma } from '../prisma.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ReminderType =
  | 'TRIAL_ENDING_14_DAYS'
  | 'TRIAL_ENDING_7_DAYS'
  | 'TRIAL_ENDING_48_HOURS'
  | 'PILOT_ENDING_14_DAYS'
  | 'PILOT_ENDING_7_DAYS'
  | 'PILOT_ENDING_48_HOURS'
  | 'PAYMENT_CHARGE_NOTICE'
  | 'CONVERSION_OPPORTUNITY';

export type ReminderStatus = 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED' | 'SKIPPED';

interface TrialReminderData {
  subscriptionId: string;
  tenantId: string;
  userId: string;
  trialEndDate: Date;
  hasPaymentMethod: boolean;
  chargeAmountCents?: number;
  emailAddress?: string;
  metadata?: Record<string, unknown>;
}

interface PilotReminderData {
  pilotId: string;
  type: ReminderType;
  emailAddress?: string;
  hasPaymentMethod: boolean;
  chargeAmountCents?: number;
  metadata?: Record<string, unknown>;
}

interface ReminderScheduleResult {
  success: boolean;
  remindersCreated: number;
  reminderIds: string[];
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

// Reminder intervals in milliseconds
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

// ═══════════════════════════════════════════════════════════════════════════════
// REMINDER SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

class ReminderService {
  // ─────────────────────────────────────────────────────────────────────────────
  // TRIAL REMINDERS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Schedule all trial reminders for a new subscription
   */
  async scheduleTrialReminders(data: TrialReminderData): Promise<ReminderScheduleResult> {
    const {
      subscriptionId,
      tenantId,
      userId,
      trialEndDate,
      hasPaymentMethod,
      chargeAmountCents,
      emailAddress,
      metadata,
    } = data;

    const reminderIds: string[] = [];
    const now = new Date();

    // Calculate reminder times
    const fourteenDaysBefore = new Date(trialEndDate.getTime() - FOURTEEN_DAYS_MS);
    const sevenDaysBefore = new Date(trialEndDate.getTime() - SEVEN_DAYS_MS);
    const fortyEightHoursBefore = new Date(trialEndDate.getTime() - FORTY_EIGHT_HOURS_MS);

    const remindersToCreate: {
      type: ReminderType;
      scheduledFor: Date;
    }[] = [];

    // 14 days before (if trial is long enough)
    if (fourteenDaysBefore > now) {
      remindersToCreate.push({
        type: 'TRIAL_ENDING_14_DAYS',
        scheduledFor: fourteenDaysBefore,
      });
    }

    // 7 days before
    if (sevenDaysBefore > now) {
      remindersToCreate.push({
        type: 'TRIAL_ENDING_7_DAYS',
        scheduledFor: sevenDaysBefore,
      });
    }

    // 48 hours before (payment charge notice if payment method on file)
    if (fortyEightHoursBefore > now) {
      remindersToCreate.push({
        type: hasPaymentMethod ? 'PAYMENT_CHARGE_NOTICE' : 'TRIAL_ENDING_48_HOURS',
        scheduledFor: fortyEightHoursBefore,
      });
    }

    // Create reminders
    for (const reminder of remindersToCreate) {
      const result = await prisma.trialReminder.create({
        data: {
          subscriptionId,
          tenantId,
          userId,
          type: reminder.type,
          status: 'PENDING',
          scheduledFor: reminder.scheduledFor,
          hasPaymentMethod,
          chargeAmountCents,
          emailAddress,
          trialEndDate,
          metadataJson: (metadata ?? {}) as Record<string, string>,
        },
      });
      reminderIds.push(result.id);
    }

    return {
      success: true,
      remindersCreated: reminderIds.length,
      reminderIds,
    };
  }

  /**
   * Update reminders when payment method is added/removed
   */
  async updateTrialRemindersPaymentStatus(
    subscriptionId: string,
    hasPaymentMethod: boolean,
    chargeAmountCents?: number
  ): Promise<void> {
    // Update all pending 48-hour reminders
    await prisma.trialReminder.updateMany({
      where: {
        subscriptionId,
        status: 'PENDING',
        type: { in: ['TRIAL_ENDING_48_HOURS', 'PAYMENT_CHARGE_NOTICE'] },
      },
      data: {
        hasPaymentMethod,
        chargeAmountCents,
        type: hasPaymentMethod ? 'PAYMENT_CHARGE_NOTICE' : 'TRIAL_ENDING_48_HOURS',
      },
    });
  }

  /**
   * Cancel all pending reminders for a subscription (e.g., on conversion or cancellation)
   */
  async cancelTrialReminders(subscriptionId: string): Promise<void> {
    await prisma.trialReminder.updateMany({
      where: {
        subscriptionId,
        status: 'PENDING',
      },
      data: {
        status: 'CANCELLED',
      },
    });
  }

  /**
   * Get pending trial reminders that should be sent now
   */
  async getPendingTrialReminders(): Promise<
    {
      id: string;
      subscriptionId: string;
      tenantId: string;
      userId: string;
      type: ReminderType;
      emailAddress: string | null;
      hasPaymentMethod: boolean;
      chargeAmountCents: number | null;
      trialEndDate: Date;
      metadataJson: unknown;
    }[]
  > {
    const now = new Date();

    const reminders = await prisma.trialReminder.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lte: now },
      },
      orderBy: { scheduledFor: 'asc' },
      take: 100, // Process in batches
    });

    return reminders.map((r) => ({
      id: r.id,
      subscriptionId: r.subscriptionId,
      tenantId: r.tenantId,
      userId: r.userId,
      type: r.type as ReminderType,
      emailAddress: r.emailAddress,
      hasPaymentMethod: r.hasPaymentMethod,
      chargeAmountCents: r.chargeAmountCents,
      trialEndDate: r.trialEndDate,
      metadataJson: r.metadataJson,
    }));
  }

  /**
   * Mark a trial reminder as sent
   */
  async markTrialReminderSent(reminderId: string): Promise<void> {
    await prisma.trialReminder.update({
      where: { id: reminderId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });
  }

  /**
   * Mark a trial reminder as failed
   */
  async markTrialReminderFailed(reminderId: string, errorMessage: string): Promise<void> {
    await prisma.trialReminder.update({
      where: { id: reminderId },
      data: {
        status: 'FAILED',
        errorMessage,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PILOT REMINDERS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Schedule all pilot reminders for a new pilot program
   */
  async schedulePilotReminders(
    pilotId: string,
    endDate: Date,
    emailAddress?: string,
    hasPaymentMethod?: boolean,
    chargeAmountCents?: number
  ): Promise<ReminderScheduleResult> {
    const reminderIds: string[] = [];
    const now = new Date();

    // Calculate reminder times
    const fourteenDaysBefore = new Date(endDate.getTime() - FOURTEEN_DAYS_MS);
    const sevenDaysBefore = new Date(endDate.getTime() - SEVEN_DAYS_MS);
    const fortyEightHoursBefore = new Date(endDate.getTime() - FORTY_EIGHT_HOURS_MS);

    const remindersToCreate: {
      type: ReminderType;
      scheduledFor: Date;
    }[] = [];

    // 14 days before
    if (fourteenDaysBefore > now) {
      remindersToCreate.push({
        type: 'PILOT_ENDING_14_DAYS',
        scheduledFor: fourteenDaysBefore,
      });
    }

    // 7 days before
    if (sevenDaysBefore > now) {
      remindersToCreate.push({
        type: 'PILOT_ENDING_7_DAYS',
        scheduledFor: sevenDaysBefore,
      });
    }

    // 48 hours before
    if (fortyEightHoursBefore > now) {
      remindersToCreate.push({
        type: hasPaymentMethod ? 'PAYMENT_CHARGE_NOTICE' : 'PILOT_ENDING_48_HOURS',
        scheduledFor: fortyEightHoursBefore,
      });
    }

    // Create reminders
    for (const reminder of remindersToCreate) {
      const result = await prisma.pilotReminder.create({
        data: {
          pilotId,
          type: reminder.type,
          status: 'PENDING',
          scheduledFor: reminder.scheduledFor,
          hasPaymentMethod: hasPaymentMethod ?? false,
          chargeAmountCents,
          emailAddress,
        },
      });
      reminderIds.push(result.id);
    }

    return {
      success: true,
      remindersCreated: reminderIds.length,
      reminderIds,
    };
  }

  /**
   * Reschedule pilot reminders when pilot is extended
   */
  async reschedulePilotReminders(
    pilotId: string,
    newEndDate: Date
  ): Promise<ReminderScheduleResult> {
    // Cancel existing pending reminders
    await prisma.pilotReminder.updateMany({
      where: {
        pilotId,
        status: 'PENDING',
      },
      data: {
        status: 'CANCELLED',
      },
    });

    // Get pilot details
    const pilot = await prisma.pilotProgram.findUnique({
      where: { id: pilotId },
    });

    if (!pilot) {
      return {
        success: false,
        remindersCreated: 0,
        reminderIds: [],
        error: 'Pilot program not found',
      };
    }

    // Schedule new reminders
    return this.schedulePilotReminders(
      pilotId,
      newEndDate,
      pilot.primaryContactEmail ?? undefined,
      pilot.hasPaymentMethodOnFile,
      pilot.conversionPricePerSeatCents ?? undefined
    );
  }

  /**
   * Cancel all pending pilot reminders
   */
  async cancelPilotReminders(pilotId: string): Promise<void> {
    await prisma.pilotReminder.updateMany({
      where: {
        pilotId,
        status: 'PENDING',
      },
      data: {
        status: 'CANCELLED',
      },
    });
  }

  /**
   * Get pending pilot reminders that should be sent now
   */
  async getPendingPilotReminders(): Promise<
    {
      id: string;
      pilotId: string;
      type: ReminderType;
      emailAddress: string | null;
      hasPaymentMethod: boolean;
      chargeAmountCents: number | null;
      metadataJson: unknown;
    }[]
  > {
    const now = new Date();

    const reminders = await prisma.pilotReminder.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lte: now },
      },
      orderBy: { scheduledFor: 'asc' },
      take: 100,
    });

    return reminders.map((r) => ({
      id: r.id,
      pilotId: r.pilotId,
      type: r.type as ReminderType,
      emailAddress: r.emailAddress,
      hasPaymentMethod: r.hasPaymentMethod,
      chargeAmountCents: r.chargeAmountCents,
      metadataJson: r.metadataJson,
    }));
  }

  /**
   * Mark a pilot reminder as sent
   */
  async markPilotReminderSent(reminderId: string): Promise<void> {
    await prisma.pilotReminder.update({
      where: { id: reminderId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });
  }

  /**
   * Mark a pilot reminder as failed
   */
  async markPilotReminderFailed(reminderId: string, errorMessage: string): Promise<void> {
    await prisma.pilotReminder.update({
      where: { id: reminderId },
      data: {
        status: 'FAILED',
        errorMessage,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REMINDER PROCESSING
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Process all pending reminders and send notifications
   * This should be called periodically (e.g., every hour) by a cron job
   */
  async processReminders(): Promise<{
    trialRemindersSent: number;
    pilotRemindersSent: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let trialRemindersSent = 0;
    let pilotRemindersSent = 0;

    // Process trial reminders
    const trialReminders = await this.getPendingTrialReminders();
    for (const reminder of trialReminders) {
      try {
        await this.sendTrialReminderNotification(reminder);
        await this.markTrialReminderSent(reminder.id);
        trialRemindersSent++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await this.markTrialReminderFailed(reminder.id, errorMessage);
        errors.push(`Trial reminder ${reminder.id}: ${errorMessage}`);
      }
    }

    // Process pilot reminders
    const pilotReminders = await this.getPendingPilotReminders();
    for (const reminder of pilotReminders) {
      try {
        await this.sendPilotReminderNotification(reminder);
        await this.markPilotReminderSent(reminder.id);
        pilotRemindersSent++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await this.markPilotReminderFailed(reminder.id, errorMessage);
        errors.push(`Pilot reminder ${reminder.id}: ${errorMessage}`);
      }
    }

    return {
      trialRemindersSent,
      pilotRemindersSent,
      errors,
    };
  }

  /**
   * Send trial reminder notification via email (notify-svc) and event bus
   */
  private async sendTrialReminderNotification(reminder: {
    id: string;
    subscriptionId: string;
    tenantId: string;
    userId: string;
    type: ReminderType;
    emailAddress: string | null;
    hasPaymentMethod: boolean;
    chargeAmountCents: number | null;
    trialEndDate: Date;
    metadataJson: unknown;
  }): Promise<void> {
    const daysRemaining = Math.ceil(
      (reminder.trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    // Determine human-readable label for days remaining
    const daysRemainingLabel =
      daysRemaining > 2 ? `in ${daysRemaining} Days` : 'in Less Than 48 Hours';

    // Format charge amount for display
    const chargeAmount = reminder.chargeAmountCents
      ? `$${(reminder.chargeAmountCents / 100).toFixed(2)}`
      : '';

    // Format trial end date for display
    const trialEndDateFormatted = reminder.trialEndDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    // Send email directly via notify-svc
    if (reminder.emailAddress) {
      try {
        const response = await fetch(`${config.services.notify}/api/v1/email/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Service-Name': 'billing-svc',
          },
          body: JSON.stringify({
            templateName: 'billing/trial-ending',
            to: reminder.emailAddress,
            context: {
              recipientName: reminder.emailAddress.split('@')[0],
              daysRemaining,
              daysRemainingLabel,
              trialEndDate: trialEndDateFormatted,
              hasPaymentMethod: reminder.hasPaymentMethod,
              chargeAmount,
              billingPortalUrl: `${config.services.auth}/billing/portal`,
            },
            category: 'billing',
            tags: ['trial-reminder', reminder.type.toLowerCase()],
          }),
        });

        if (!response.ok) {
          console.error(`[Reminder] Email send failed:`, {
            status: response.status,
            reminderId: reminder.id,
          });
        }
      } catch (error) {
        // Non-blocking — don't fail the reminder if email fails
        console.error(`[Reminder] Failed to send email:`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          reminderId: reminder.id,
        });
      }
    }

    // Also publish event for other consumers (analytics, push notifications, etc.)
    await billingEventPublisher.publish(
      BillingEventType.REMINDER_TRIAL_ENDING,
      { tenantId: reminder.tenantId },
      {
        reminderId: reminder.id,
        subscriptionId: reminder.subscriptionId,
        userId: reminder.userId,
        type: reminder.type,
        template: 'billing/trial-ending',
        emailAddress: reminder.emailAddress,
        hasPaymentMethod: reminder.hasPaymentMethod,
        chargeAmountCents: reminder.chargeAmountCents,
        trialEndDate: reminder.trialEndDate.toISOString(),
        daysRemaining,
        metadata: reminder.metadataJson,
      },
      { idempotencyKey: `reminder-${reminder.id}` }
    );
  }

  /**
   * Send pilot reminder notification via event bus
   */
  private async sendPilotReminderNotification(reminder: {
    id: string;
    pilotId: string;
    type: ReminderType;
    emailAddress: string | null;
    hasPaymentMethod: boolean;
    chargeAmountCents: number | null;
    metadataJson: unknown;
  }): Promise<void> {
    // Get pilot details
    const pilot = await prisma.pilotProgram.findUnique({
      where: { id: reminder.pilotId },
    });

    if (!pilot) {
      throw new Error(`Pilot program not found: ${reminder.pilotId}`);
    }

    const daysRemaining = Math.ceil((pilot.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    const templateMap: Record<ReminderType, string> = {
      TRIAL_ENDING_14_DAYS: 'trial-ending-14-days',
      TRIAL_ENDING_7_DAYS: 'trial-ending-7-days',
      TRIAL_ENDING_48_HOURS: 'trial-ending-48-hours',
      PAYMENT_CHARGE_NOTICE: 'payment-charge-notice-48-hours',
      PILOT_ENDING_14_DAYS: 'pilot-ending-14-days',
      PILOT_ENDING_7_DAYS: 'pilot-ending-7-days',
      PILOT_ENDING_48_HOURS: 'pilot-ending-48-hours',
      CONVERSION_OPPORTUNITY: 'conversion-opportunity',
    };

    // Publish event for notify-svc to pick up
    await billingEventPublisher.publish(
      BillingEventType.REMINDER_PILOT_ENDING,
      { tenantId: pilot.tenantId },
      {
        reminderId: reminder.id,
        pilotId: reminder.pilotId,
        pilotName: pilot.name,
        type: reminder.type,
        template: templateMap[reminder.type],
        emailAddress: reminder.emailAddress ?? pilot.primaryContactEmail,
        hasPaymentMethod: reminder.hasPaymentMethod,
        chargeAmountCents: reminder.chargeAmountCents,
        pilotEndDate: pilot.endDate.toISOString(),
        daysRemaining,
        seats: pilot.seats,
        seatsUsed: pilot.seatsUsed,
        conversionDiscountPct: pilot.conversionDiscountPct,
        metadata: reminder.metadataJson,
      },
      { idempotencyKey: `reminder-${reminder.id}` }
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ANALYTICS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get reminder statistics
   */
  async getReminderStats(): Promise<{
    trialReminders: {
      pending: number;
      sent: number;
      failed: number;
      cancelled: number;
    };
    pilotReminders: {
      pending: number;
      sent: number;
      failed: number;
      cancelled: number;
    };
  }> {
    const [trialStats, pilotStats] = await Promise.all([
      prisma.trialReminder.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.pilotReminder.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    const formatStats = (stats: { status: string; _count: number }[]) => {
      const result = { pending: 0, sent: 0, failed: 0, cancelled: 0 };
      for (const stat of stats) {
        if (stat.status === 'PENDING') result.pending = stat._count;
        else if (stat.status === 'SENT') result.sent = stat._count;
        else if (stat.status === 'FAILED') result.failed = stat._count;
        else if (stat.status === 'CANCELLED') result.cancelled = stat._count;
      }
      return result;
    };

    return {
      trialReminders: formatStats(trialStats),
      pilotReminders: formatStats(pilotStats),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const reminderService = new ReminderService();
