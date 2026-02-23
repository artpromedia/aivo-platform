/**
 * Invoice Scheduler
 *
 * Periodic jobs for the enterprise billing pipeline:
 *  1. Daily invoice generation — active contracts with next invoice date ≤ today
 *  2. Daily payment reminders — unpaid invoices approaching due date
 *  3. Overdue invoice detection — mark invoices past due date as OVERDUE
 *
 * Uses setInterval for simplicity (no external cron dependency).
 * Functions are also exported individually for use from tests or NATS handlers.
 */

import { enterpriseBillingService } from '../enterprise/enterprise-billing.service.js';
import { prisma } from '../prisma.js';

const ONE_HOUR_MS = 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * ONE_HOUR_MS;

// Track interval handles so we can tear them down on shutdown
const intervals: NodeJS.Timeout[] = [];

// ══════════════════════════════════════════════════════════════════════════════
// JOB 1: Generate invoices for active contracts
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Find all active contracts that have a `nextInvoiceDate` in their metadata
 * on or before today, and generate the next period invoice.
 */
export async function runInvoiceGeneration(): Promise<number> {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);

  const contracts = await prisma.contract.findMany({
    where: {
      status: 'ACTIVE',
      endDate: { gte: now }, // hasn't expired
    },
  });

  let generated = 0;

  for (const contract of contracts) {
    try {
      const meta = contract.metadataJson as Record<string, unknown> | null;
      if (!meta) continue;

      const nextInvoiceDateStr = meta.nextInvoiceDate as string | undefined;
      if (!nextInvoiceDateStr) continue;

      const nextInvoiceDate = new Date(nextInvoiceDateStr);
      if (nextInvoiceDate > now) continue;

      const contractType = (meta.contractType as string) ?? 'annual';
      const periodMonths = contractType === 'monthly' ? 1 : 12;
      const periodEnd = addMonths(nextInvoiceDate, periodMonths);

      // Generate the invoice
      await enterpriseBillingService.generateInvoice(
        contract.id,
        nextInvoiceDate,
        periodEnd,
      );

      // Advance the next invoice date
      const newNextInvoice = addMonths(nextInvoiceDate, periodMonths);
      await prisma.contract.update({
        where: { id: contract.id },
        data: {
          metadataJson: {
            ...meta,
            nextInvoiceDate: newNextInvoice.toISOString(),
          },
        },
      });

      generated++;
      console.log(
        `[InvoiceScheduler] Generated invoice for contract ${contract.contractNumber}`,
      );
    } catch (err) {
      console.error(
        `[InvoiceScheduler] Failed to generate invoice for contract ${contract.id}:`,
        err,
      );
    }
  }

  console.log(`[InvoiceScheduler] Invoice generation complete: ${generated} invoices created`);
  return generated;
}

// ══════════════════════════════════════════════════════════════════════════════
// JOB 2: Payment reminders
// ══════════════════════════════════════════════════════════════════════════════

/** Days before due date to send reminders */
const REMINDER_THRESHOLDS = [14, 7, 3, 1];

/**
 * Find unpaid invoices approaching their due date and send reminder emails.
 */
export async function runPaymentReminders(): Promise<number> {
  const now = new Date();
  let sent = 0;

  for (const daysBefore of REMINDER_THRESHOLDS) {
    const targetDate = new Date(now);
    targetDate.setUTCDate(targetDate.getUTCDate() + daysBefore);
    // Match invoices whose dueDate falls on targetDate (same calendar day)
    const dayStart = new Date(targetDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const invoices = await prisma.districtInvoice.findMany({
      where: {
        status: 'SENT',
        dueDate: { gte: dayStart, lte: dayEnd },
      },
      include: {
        contract: { include: { billingProfile: true } },
      },
    });

    for (const invoice of invoices) {
      try {
        const meta = invoice.contract.metadataJson as Record<string, unknown> | null;
        const contactEmail =
          (meta?.contactEmail as string) ??
          invoice.contract.billingProfile.billingContactEmail;
        const contactName =
          (meta?.contactName as string) ??
          invoice.contract.billingProfile.billingContactName;

        await sendReminderEmail(contactEmail, {
          contactName,
          invoiceNumber: invoice.invoiceNumber,
          amountDue: (Number(invoice.amountDueCents) / 100).toFixed(2),
          dueDate: invoice.dueDate.toISOString().split('T')[0]!,
          daysBefore,
        });
        sent++;
      } catch (err) {
        console.error(
          `[InvoiceScheduler] Failed to send reminder for invoice ${invoice.id}:`,
          err,
        );
      }
    }
  }

  console.log(`[InvoiceScheduler] Payment reminders sent: ${sent}`);
  return sent;
}

// ══════════════════════════════════════════════════════════════════════════════
// JOB 3: Overdue invoice detection
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Mark invoices past due date as OVERDUE and notify billing contacts.
 */
export async function runOverdueDetection(): Promise<number> {
  const now = new Date();

  const overdueInvoices = await prisma.districtInvoice.findMany({
    where: {
      status: 'SENT',
      dueDate: { lt: now },
    },
    include: {
      contract: { include: { billingProfile: true } },
    },
  });

  for (const invoice of overdueInvoices) {
    await prisma.districtInvoice.update({
      where: { id: invoice.id },
      data: { status: 'OVERDUE' },
    });

    try {
      const meta = invoice.contract.metadataJson as Record<string, unknown> | null;
      const contactEmail =
        (meta?.contactEmail as string) ??
        invoice.contract.billingProfile.billingContactEmail;

      await sendReminderEmail(contactEmail, {
        contactName:
          (meta?.contactName as string) ??
          invoice.contract.billingProfile.billingContactName,
        invoiceNumber: invoice.invoiceNumber,
        amountDue: (Number(invoice.amountDueCents) / 100).toFixed(2),
        dueDate: invoice.dueDate.toISOString().split('T')[0]!,
        daysBefore: 0,
        isOverdue: true,
      });
    } catch {
      // Non-critical
    }
  }

  console.log(
    `[InvoiceScheduler] Overdue detection: ${overdueInvoices.length} invoices marked overdue`,
  );
  return overdueInvoices.length;
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHEDULER LIFECYCLE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Start all scheduled invoice jobs.
 * Called after the application is fully initialized.
 */
export function startInvoiceSchedulers(): void {
  console.log('[InvoiceScheduler] Starting scheduled jobs');

  // Run invoice generation once a day (first run after 5 minutes, then every 24h)
  const invoiceTimer = setTimeout(() => {
    void runInvoiceGeneration();
    const iv = setInterval(() => void runInvoiceGeneration(), TWENTY_FOUR_HOURS_MS);
    intervals.push(iv);
  }, 5 * 60 * 1000);

  // Cast setTimeout result for compatibility
  intervals.push(invoiceTimer as unknown as NodeJS.Timeout);

  // Run payment reminders once a day (first run after 10 minutes, then every 24h)
  const reminderTimer = setTimeout(() => {
    void runPaymentReminders();
    const iv = setInterval(() => void runPaymentReminders(), TWENTY_FOUR_HOURS_MS);
    intervals.push(iv);
  }, 10 * 60 * 1000);

  intervals.push(reminderTimer as unknown as NodeJS.Timeout);

  // Run overdue detection once a day (first run after 15 minutes, then every 24h)
  const overdueTimer = setTimeout(() => {
    void runOverdueDetection();
    const iv = setInterval(() => void runOverdueDetection(), TWENTY_FOUR_HOURS_MS);
    intervals.push(iv);
  }, 15 * 60 * 1000);

  intervals.push(overdueTimer as unknown as NodeJS.Timeout);
}

/**
 * Stop all scheduled invoice jobs.
 * Called during graceful shutdown.
 */
export function stopInvoiceSchedulers(): void {
  console.log('[InvoiceScheduler] Stopping scheduled jobs');
  for (const id of intervals) {
    clearInterval(id);
    clearTimeout(id);
  }
  intervals.length = 0;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

const NOTIFY_SVC_URL =
  process.env.NOTIFY_SVC_URL ?? 'http://notify-svc:3000';

async function sendReminderEmail(
  to: string,
  data: Record<string, unknown>,
): Promise<void> {
  const template = data.isOverdue
    ? 'district-invoice-overdue'
    : 'district-payment-reminder';

  try {
    await fetch(`${NOTIFY_SVC_URL}/notify/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, template, data }),
    });
  } catch (err) {
    console.error(`[InvoiceScheduler] Email send failed:`, err);
  }
}
