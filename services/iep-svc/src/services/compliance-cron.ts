/**
 * AIVO IEP Service — Compliance Cron Scheduler
 *
 * Runs two scheduled jobs:
 *  1. **Daily 6 AM UTC** — for every tenant with active IEPs, runs
 *     `checkCompliance()` and emails case managers / district admins.
 *  2. **Weekly Monday 6 AM UTC** — sends a summary report per tenant.
 *
 * Follows the SyncScheduler class pattern from sis-sync-svc.
 */

import cron, { type ScheduledTask } from 'node-cron';

import { config } from '../config.js';
import { prisma } from '../prisma.js';

import type { ComplianceAlertPayload } from './compliance-notifications.js';
import { sendComplianceNotifications, sendWeeklySummary } from './compliance-notifications.js';
import { checkCompliance } from './iepService.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface Logger {
  info: (...a: unknown[]) => void;
  warn: (...a: unknown[]) => void;
  error: (...a: unknown[]) => void;
  child: (bindings: Record<string, unknown>) => Logger;
}

export interface CronRunResult {
  tenantCount: number;
  totalAlerts: number;
  notifications: { sent: number; failed: number };
  errors: string[];
  durationMs: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHEDULER
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON ACCESSOR — used by the /compliance/check-all route
// ══════════════════════════════════════════════════════════════════════════════

let _instance: ComplianceCronScheduler | null = null;

export function setComplianceCronScheduler(s: ComplianceCronScheduler): void {
  _instance = s;
}

export function getComplianceCronScheduler(): ComplianceCronScheduler | null {
  return _instance;
}

// ══════════════════════════════════════════════════════════════════════════════

export class ComplianceCronScheduler {
  private dailyTask: ScheduledTask | null = null;
  private weeklyTask: ScheduledTask | null = null;
  private readonly logger: Logger;
  private running = false;

  constructor(logger: Logger) {
    this.logger = logger.child({ module: 'ComplianceCron' });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Start the cron tasks. Safe to call multiple times — subsequent calls are
   * no-ops until `shutdown()` is invoked.
   */
  initialize(): void {
    if (this.dailyTask || this.weeklyTask) {
      this.logger.warn('ComplianceCron already initialised');
      return;
    }

    const dailySchedule = process.env.COMPLIANCE_CRON_DAILY ?? '0 6 * * *';
    const weeklySchedule = process.env.COMPLIANCE_CRON_WEEKLY ?? '0 6 * * 1';

    if (!cron.validate(dailySchedule)) {
      this.logger.error({ schedule: dailySchedule }, 'Invalid daily cron expression');
      return;
    }
    if (!cron.validate(weeklySchedule)) {
      this.logger.error({ schedule: weeklySchedule }, 'Invalid weekly cron expression');
      return;
    }

    this.dailyTask = cron.schedule(
      dailySchedule,
      () => {
        void this.runDailyCheck();
      },
      { timezone: 'UTC' }
    );

    this.weeklyTask = cron.schedule(
      weeklySchedule,
      () => {
        void this.runWeeklySummary();
      },
      { timezone: 'UTC' }
    );

    this.logger.info(
      { dailySchedule, weeklySchedule },
      'ComplianceCron initialised — daily & weekly jobs scheduled'
    );
  }

  /**
   * Stop all cron tasks gracefully.
   */
  shutdown(): void {
    this.dailyTask?.stop();
    this.weeklyTask?.stop();
    this.dailyTask = null;
    this.weeklyTask = null;
    this.logger.info('ComplianceCron shut down');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Daily compliance check
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Run the daily compliance check across all tenants.
   * Also exposed publicly so the `/compliance/check-all` endpoint can call it.
   */
  async runDailyCheck(): Promise<CronRunResult> {
    if (this.running) {
      this.logger.warn('Daily compliance check already running — skipping');
      return {
        tenantCount: 0,
        totalAlerts: 0,
        notifications: { sent: 0, failed: 0 },
        errors: ['Skipped — previous run still in progress'],
        durationMs: 0,
      };
    }

    this.running = true;
    const start = Date.now();
    const result: CronRunResult = {
      tenantCount: 0,
      totalAlerts: 0,
      notifications: { sent: 0, failed: 0 },
      errors: [],
      durationMs: 0,
    };

    try {
      // Get distinct tenant IDs from active IEPs (avoids cross-service call)
      const tenantRows = await prisma.iEP.findMany({
        where: { status: 'ACTIVE' },
        select: { tenantId: true },
        distinct: ['tenantId'],
      });

      const tenantIds = tenantRows.map((r) => r.tenantId);
      result.tenantCount = tenantIds.length;

      this.logger.info({ tenantCount: tenantIds.length }, 'Starting daily compliance check');

      const batchSize = config.notifications.batchSize;

      for (let i = 0; i < tenantIds.length; i += batchSize) {
        const batch = tenantIds.slice(i, i + batchSize);

        await Promise.allSettled(
          batch.map(async (tenantId) => {
            try {
              const alerts = (await checkCompliance(tenantId)) as ComplianceAlertPayload[];
              result.totalAlerts += alerts.length;

              if (alerts.length > 0) {
                const { sent, failed } = await sendComplianceNotifications(
                  tenantId,
                  alerts,
                  this.logger
                );
                result.notifications.sent += sent;
                result.notifications.failed += failed;
              }

              this.logger.info(
                { tenantId, alertCount: alerts.length },
                'Tenant compliance check complete'
              );
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : String(err);
              result.errors.push(`tenant=${tenantId}: ${message}`);
              this.logger.error({ tenantId, err }, 'Compliance check failed for tenant');
            }
          })
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push(message);
      this.logger.error({ err }, 'Daily compliance check failed globally');
    } finally {
      this.running = false;
      result.durationMs = Date.now() - start;
      this.logger.info(
        {
          tenantCount: result.tenantCount,
          totalAlerts: result.totalAlerts,
          sent: result.notifications.sent,
          failed: result.notifications.failed,
          errors: result.errors.length,
          durationMs: result.durationMs,
        },
        'Daily compliance check finished'
      );
    }

    return result;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Weekly summary
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Send weekly summary emails for every tenant that has active IEPs.
   */
  async runWeeklySummary(): Promise<void> {
    this.logger.info('Starting weekly compliance summary');
    const start = Date.now();

    try {
      const tenantRows = await prisma.iEP.findMany({
        where: { status: 'ACTIVE' },
        select: { tenantId: true },
        distinct: ['tenantId'],
      });

      for (const { tenantId } of tenantRows) {
        try {
          await sendWeeklySummary(tenantId, this.logger);
          this.logger.info({ tenantId }, 'Weekly summary sent');
        } catch (err: unknown) {
          this.logger.error({ tenantId, err }, 'Weekly summary failed for tenant');
        }
      }
    } catch (err: unknown) {
      this.logger.error({ err }, 'Weekly summary failed globally');
    }

    this.logger.info({ durationMs: Date.now() - start }, 'Weekly compliance summary finished');
  }
}
