/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/use-unknown-in-catch-callback-variable, @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-unsafe-argument, no-undef */
/// <reference types="node" />
/**
 * Renewal Scheduler
 *
 * Background job scheduler for processing renewals, expired quotes,
 * and overdue invoices. Uses cron-like scheduling for periodic tasks.
 */

import type { PrismaClient } from '../generated/prisma-client';
import { RenewalTaskRepository, DistrictInvoiceRepository, QuoteRepository } from '../repositories';
import type { RenewalTask } from '../types';
import { RenewalTaskStatus } from '../types';

import { ProcurementService } from './procurement.service';

// ============================================================================
// Types
// ============================================================================

export interface SchedulerConfig {
  /**
   * How often to run the renewal check job (in milliseconds)
   * Default: 1 hour
   */
  renewalCheckInterval?: number;

  /**
   * How often to run the overdue invoice check (in milliseconds)
   * Default: 6 hours
   */
  overdueCheckInterval?: number;

  /**
   * How often to run the expired quote check (in milliseconds)
   * Default: 1 hour
   */
  expiredQuoteCheckInterval?: number;

  /**
   * Whether to auto-create renewal quotes
   * Default: false (requires manual trigger)
   */
  autoCreateRenewalQuotes?: boolean;

  /**
   * Days before contract end to create renewal quote
   * Default: 90
   */
  renewalQuoteLeadDays?: number;

  /**
   * Callback for sending notifications
   */
  onNotification?: (notification: RenewalNotification) => Promise<void>;
}

export interface RenewalNotification {
  type: 'RENEWAL_DUE' | 'CONTRACT_EXPIRING' | 'INVOICE_OVERDUE' | 'QUOTE_EXPIRING';
  tenantId: string;
  entityId: string;
  entityType: 'contract' | 'invoice' | 'quote' | 'renewal_task';
  message: string;
  severity: 'info' | 'warning' | 'critical';
  metadata?: Record<string, unknown>;
}

export interface SchedulerMetrics {
  lastRunAt: Date | null;
  renewalsProcessed: number;
  overdueInvoicesMarked: number;
  expiredQuotesMarked: number;
  notificationsSent: number;
  errors: string[];
}

// ============================================================================
// Renewal Scheduler
// ============================================================================

export class RenewalScheduler {
  private procurementService: ProcurementService;
  private renewalRepo: RenewalTaskRepository;
  private invoiceRepo: DistrictInvoiceRepository;
  private quoteRepo: QuoteRepository;

  private renewalTimer: NodeJS.Timeout | null = null;
  private overdueTimer: NodeJS.Timeout | null = null;
  private expiredTimer: NodeJS.Timeout | null = null;

  private isRunning = false;
  private metrics: SchedulerMetrics = {
    lastRunAt: null,
    renewalsProcessed: 0,
    overdueInvoicesMarked: 0,
    expiredQuotesMarked: 0,
    notificationsSent: 0,
    errors: [],
  };

  constructor(
    private prisma: PrismaClient,
    private config: SchedulerConfig = {}
  ) {
    this.procurementService = new ProcurementService(prisma);
    this.renewalRepo = new RenewalTaskRepository(prisma);
    this.invoiceRepo = new DistrictInvoiceRepository(prisma);
    this.quoteRepo = new QuoteRepository(prisma);
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.log('[RenewalScheduler] Already running');
      return;
    }

    console.log('[RenewalScheduler] Starting scheduler...');
    this.isRunning = true;

    // Start renewal check
    const renewalInterval = this.config.renewalCheckInterval ?? 60 * 60 * 1000; // 1 hour
    this.renewalTimer = setInterval(() => {
      this.processRenewals().catch((err) => {
        console.error('[RenewalScheduler] Renewal processing error:', err);
        this.metrics.errors.push(`Renewal: ${String(err)}`);
      });
    }, renewalInterval);

    // Start overdue check
    const overdueInterval = this.config.overdueCheckInterval ?? 6 * 60 * 60 * 1000; // 6 hours
    this.overdueTimer = setInterval(() => {
      this.processOverdueInvoices().catch((err) => {
        console.error('[RenewalScheduler] Overdue processing error:', err);
        this.metrics.errors.push(`Overdue: ${String(err)}`);
      });
    }, overdueInterval);

    // Start expired quote check
    const expiredInterval = this.config.expiredQuoteCheckInterval ?? 60 * 60 * 1000; // 1 hour
    this.expiredTimer = setInterval(() => {
      this.processExpiredQuotes().catch((err) => {
        console.error('[RenewalScheduler] Expired quotes error:', err);
        this.metrics.errors.push(`Expired: ${String(err)}`);
      });
    }, expiredInterval);

    // Run immediately on start
    this.runAll().catch(console.error);

    console.log('[RenewalScheduler] Scheduler started');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) return;

    console.log('[RenewalScheduler] Stopping scheduler...');

    if (this.renewalTimer) {
      clearInterval(this.renewalTimer);
      this.renewalTimer = null;
    }
    if (this.overdueTimer) {
      clearInterval(this.overdueTimer);
      this.overdueTimer = null;
    }
    if (this.expiredTimer) {
      clearInterval(this.expiredTimer);
      this.expiredTimer = null;
    }

    this.isRunning = false;
    console.log('[RenewalScheduler] Scheduler stopped');
  }

  /**
   * Run all scheduled tasks immediately
   */
  async runAll(): Promise<void> {
    console.log('[RenewalScheduler] Running all scheduled tasks...');

    await Promise.all([
      this.processRenewals(),
      this.processOverdueInvoices(),
      this.processExpiredQuotes(),
    ]);

    this.metrics.lastRunAt = new Date();
    console.log('[RenewalScheduler] All tasks completed');
  }

  /**
   * Get scheduler metrics
   */
  getMetrics(): SchedulerMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      lastRunAt: null,
      renewalsProcessed: 0,
      overdueInvoicesMarked: 0,
      expiredQuotesMarked: 0,
      notificationsSent: 0,
      errors: [],
    };
  }

  // ==========================================================================
  // Renewal Processing
  // ==========================================================================

  /**
   * Process renewal tasks
   */
  private async processRenewals(): Promise<void> {
    console.log('[RenewalScheduler] Processing renewals...');

    // Mark due tasks
    const markedCount = await this.renewalRepo.markDue();
    console.log(`[RenewalScheduler] Marked ${markedCount} tasks as due`);

    // Get due tasks
    const dueTasks = await this.renewalRepo.listByStatus(RenewalTaskStatus.DUE, {
      limit: 100,
    });

    for (const task of dueTasks) {
      try {
        await this.processRenewalTask(task);
        this.metrics.renewalsProcessed++;
      } catch (err) {
        console.error(`[RenewalScheduler] Error processing task ${task.id}:`, err);
        this.metrics.errors.push(`Task ${task.id}: ${String(err)}`);
      }
    }

    // Check for contracts expiring soon (warning notifications)
    await this.checkExpiringContracts();
  }

  /**
   * Process a single renewal task
   */
  private async processRenewalTask(task: RenewalTask): Promise<void> {
    // Get contract details
    const contract = await this.prisma.contract.findUnique({
      where: { id: task.contractId },
      include: { billingProfile: true },
    });

    if (!contract) {
      console.warn(`[RenewalScheduler] Contract ${task.contractId} not found`);
      return;
    }

    // Send notification
    await this.sendNotification({
      type: 'RENEWAL_DUE',
      tenantId: task.tenantId,
      entityId: task.id,
      entityType: 'renewal_task',
      message: `Contract ${contract.contractNumber} is due for renewal. Expires on ${contract.endDate.toLocaleDateString()}.`,
      severity: 'warning',
      metadata: {
        contractNumber: contract.contractNumber,
        endDate: contract.endDate.toISOString(),
        totalValueCents: Number(contract.totalValueCents),
      },
    });

    // Auto-create renewal quote if configured
    if (this.config.autoCreateRenewalQuotes && !task.renewalQuoteId) {
      try {
        const quote = await this.procurementService.createRenewalQuote(task.contractId);
        console.log(
          `[RenewalScheduler] Created renewal quote ${quote.quoteNumber} for contract ${contract.contractNumber}`
        );
      } catch (err) {
        console.error(`[RenewalScheduler] Failed to create renewal quote:`, err);
      }
    }

    // Update task to show it was processed
    await this.renewalRepo.addActivity(task.id, {
      action: 'Renewal task became due',
      by: 'SCHEDULER',
      notes: 'Notification sent',
    });
  }

  /**
   * Check for contracts expiring soon and send warnings
   */
  private async checkExpiringContracts(): Promise<void> {
    // Find contracts expiring in the next 30 days without renewal progress
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringContracts = await this.prisma.contract.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          gte: new Date(),
          lte: thirtyDaysFromNow,
        },
      },
      include: {
        renewalTask: true,
      },
    });

    for (const contract of expiringContracts) {
      // Only warn if renewal is not in progress
      if (
        contract.renewalTask &&
        contract.renewalTask.status !== RenewalTaskStatus.SCHEDULED &&
        contract.renewalTask.status !== RenewalTaskStatus.DUE
      ) {
        continue; // Renewal already being handled
      }

      const daysUntilExpiry = Math.ceil(
        (contract.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      await this.sendNotification({
        type: 'CONTRACT_EXPIRING',
        tenantId: contract.tenantId,
        entityId: contract.id,
        entityType: 'contract',
        message: `Contract ${contract.contractNumber} expires in ${daysUntilExpiry} days.`,
        severity: daysUntilExpiry <= 7 ? 'critical' : 'warning',
        metadata: {
          contractNumber: contract.contractNumber,
          endDate: contract.endDate.toISOString(),
          daysUntilExpiry,
        },
      });
    }
  }

  // ==========================================================================
  // Invoice Processing
  // ==========================================================================

  /**
   * Process overdue invoices
   */
  private async processOverdueInvoices(): Promise<void> {
    console.log('[RenewalScheduler] Processing overdue invoices...');

    // Mark overdue
    const markedCount = await this.invoiceRepo.markOverdue();
    this.metrics.overdueInvoicesMarked += markedCount;
    console.log(`[RenewalScheduler] Marked ${markedCount} invoices as overdue`);

    // Get overdue invoices for notifications
    const overdueInvoices = await this.invoiceRepo.listOverdue();

    for (const invoice of overdueInvoices) {
      // Get contract for tenant info
      const contract = await this.prisma.contract.findUnique({
        where: { id: invoice.contractId },
      });

      if (!contract) continue;

      const daysOverdue = Math.ceil(
        (Date.now() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      await this.sendNotification({
        type: 'INVOICE_OVERDUE',
        tenantId: contract.tenantId,
        entityId: invoice.id,
        entityType: 'invoice',
        message: `Invoice ${invoice.invoiceNumber} is ${daysOverdue} days overdue. Amount: $${Number(invoice.amountDueCents) / 100}`,
        severity: daysOverdue > 30 ? 'critical' : 'warning',
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          dueDate: invoice.dueDate.toISOString(),
          amountDueCents: Number(invoice.amountDueCents),
          daysOverdue,
        },
      });
    }
  }

  // ==========================================================================
  // Quote Processing
  // ==========================================================================

  /**
   * Process expired quotes
   */
  private async processExpiredQuotes(): Promise<void> {
    console.log('[RenewalScheduler] Processing expired quotes...');

    const markedCount = await this.quoteRepo.markExpired();
    this.metrics.expiredQuotesMarked += markedCount;
    console.log(`[RenewalScheduler] Marked ${markedCount} quotes as expired`);
  }

  // ==========================================================================
  // Notifications
  // ==========================================================================

  /**
   * Send a notification
   */
  private async sendNotification(notification: RenewalNotification): Promise<void> {
    if (this.config.onNotification) {
      try {
        await this.config.onNotification(notification);
        this.metrics.notificationsSent++;
      } catch (err) {
        console.error('[RenewalScheduler] Failed to send notification:', err);
      }
    } else {
      // Default: just log
      console.log('[RenewalScheduler] Notification:', notification);
      this.metrics.notificationsSent++;
    }
  }
}

// ============================================================================
// Renewal Cron Jobs (for external schedulers like node-cron)
// ============================================================================

/**
 * Create standalone renewal processing function for use with external schedulers
 */
export function createRenewalProcessor(prisma: PrismaClient) {
  const service = new ProcurementService(prisma);
  const renewalRepo = new RenewalTaskRepository(prisma);

  return {
    /**
     * Process all due renewal tasks
     */
    async processRenewals(): Promise<{ marked: number; processed: number }> {
      const marked = await renewalRepo.markDue();
      const dueTasks = await renewalRepo.listDue();

      // Process each task
      for (const task of dueTasks) {
        await renewalRepo.addActivity(task.id, {
          action: 'Renewal task processed by scheduler',
          by: 'CRON_JOB',
        });
      }

      return { marked, processed: dueTasks.length };
    },

    /**
     * Process overdue invoices
     */
    async processOverdueInvoices(): Promise<number> {
      return service.processOverdueInvoices();
    },

    /**
     * Process expired quotes
     */
    async processExpiredQuotes(): Promise<number> {
      return service.processExpiredQuotes();
    },

    /**
     * Create renewal quotes for contracts nearing expiry
     */
    async createRenewalQuotesForExpiring(leadDays = 90): Promise<string[]> {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + leadDays);

      const contracts = await prisma.contract.findMany({
        where: {
          status: 'ACTIVE',
          endDate: {
            gte: new Date(),
            lte: targetDate,
          },
        },
        include: {
          renewalTask: true,
        },
      });

      const createdQuotes: string[] = [];

      for (const contract of contracts) {
        // Skip if already has a renewal quote
        if (contract.renewalTask?.renewalQuoteId) {
          continue;
        }

        try {
          const quote = await service.createRenewalQuote(contract.id);
          createdQuotes.push(quote.quoteNumber);
        } catch (err) {
          console.error(`Failed to create renewal quote for ${contract.contractNumber}:`, err);
        }
      }

      return createdQuotes;
    },

    /**
     * Get renewal metrics
     */
    async getMetrics(): Promise<{
      scheduled: number;
      due: number;
      inProgress: number;
      completedThisMonth: number;
      churnedThisMonth: number;
    }> {
      return renewalRepo.getMetrics();
    },
  };
}
