/**
 * Sync Scheduler
 * 
 * Manages scheduled and manual sync jobs using node-cron.
 * Supports daily scheduled syncs and on-demand "Run sync now" functionality.
 */

import * as cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import type { SisProvider, SyncStatus } from '../providers/types';
import { SyncStatus as SyncStatusValues } from '../providers/types';
import { SyncEngine } from '../sync/engine';
import { EntityTransformer, TransformConfig } from '../sync/transformer';

export interface SchedulerConfig {
  /** Whether to start scheduled jobs on initialization */
  autoStart: boolean;
  /** Maximum concurrent syncs per tenant */
  maxConcurrentSyncs: number;
  /** Lock timeout for preventing duplicate syncs (ms) */
  lockTimeout: number;
}

const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  autoStart: true,
  maxConcurrentSyncs: 2,
  lockTimeout: 30 * 60 * 1000, // 30 minutes
};

interface ScheduledJob {
  providerId: string;
  tenantId: string;
  cronTask: cron.ScheduledTask;
  schedule: string;
}

interface SyncLock {
  providerId: string;
  lockedAt: Date;
  lockedBy: string;
}

export class SyncScheduler {
  private prisma: PrismaClient;
  private syncEngine: SyncEngine;
  private config: SchedulerConfig;
  private scheduledJobs: Map<string, ScheduledJob> = new Map();
  private activeLocks: Map<string, SyncLock> = new Map();
  private instanceId: string;

  constructor(
    prisma: PrismaClient,
    config: Partial<SchedulerConfig> = {}
  ) {
    this.prisma = prisma;
    this.syncEngine = new SyncEngine(prisma);
    this.config = { ...DEFAULT_SCHEDULER_CONFIG, ...config };
    this.instanceId = `scheduler-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize the scheduler and start all enabled scheduled jobs
   */
  async initialize(): Promise<void> {
    if (!this.config.autoStart) return;

    const providers = await this.prisma.sisProvider.findMany({
      where: {
        enabled: true,
        syncSchedule: { not: null },
      },
    });

    for (const provider of providers) {
      if (provider.syncSchedule) {
        this.scheduleProvider(provider);
      }
    }

    console.log(`[SyncScheduler] Initialized with ${this.scheduledJobs.size} scheduled jobs`);
  }

  /**
   * Schedule a provider for automatic syncs
   */
  scheduleProvider(provider: SisProvider): void {
    if (!provider.syncSchedule || !provider.enabled) {
      return;
    }

    // Validate cron expression
    if (!cron.validate(provider.syncSchedule)) {
      console.error(`[SyncScheduler] Invalid cron expression for provider ${provider.id}: ${provider.syncSchedule}`);
      return;
    }

    // Stop existing job if any
    this.unscheduleProvider(provider.id);

    // Create new scheduled task
    const task = cron.schedule(provider.syncSchedule, async () => {
      console.log(`[SyncScheduler] Starting scheduled sync for provider ${provider.id}`);
      try {
        await this.runSync(provider.tenantId, provider.id, undefined, false);
      } catch (error) {
        console.error(`[SyncScheduler] Scheduled sync failed for provider ${provider.id}:`, error);
      }
    });

    this.scheduledJobs.set(provider.id, {
      providerId: provider.id,
      tenantId: provider.tenantId,
      cronTask: task,
      schedule: provider.syncSchedule,
    });

    console.log(`[SyncScheduler] Scheduled provider ${provider.id} with cron: ${provider.syncSchedule}`);
  }

  /**
   * Remove a provider from scheduled syncs
   */
  unscheduleProvider(providerId: string): void {
    const job = this.scheduledJobs.get(providerId);
    if (job) {
      job.cronTask.stop();
      this.scheduledJobs.delete(providerId);
      console.log(`[SyncScheduler] Unscheduled provider ${providerId}`);
    }
  }

  /**
   * Run a sync immediately (manual trigger)
   */
  async runSync(
    tenantId: string,
    providerId: string,
    triggeredBy?: string,
    isManual = true
  ): Promise<{ success: boolean; syncRunId?: string; error?: string }> {
    // Check for active lock
    const existingLock = this.activeLocks.get(providerId);
    if (existingLock) {
      const lockAge = Date.now() - existingLock.lockedAt.getTime();
      if (lockAge < this.config.lockTimeout) {
        return {
          success: false,
          error: `Sync already in progress for this provider (started ${Math.round(lockAge / 1000)}s ago)`,
        };
      }
      // Lock expired, release it
      this.activeLocks.delete(providerId);
    }

    // Check concurrent sync limit for tenant
    const tenantSyncs = Array.from(this.activeLocks.values()).filter(
      (lock) => this.scheduledJobs.get(lock.providerId)?.tenantId === tenantId
    );
    if (tenantSyncs.length >= this.config.maxConcurrentSyncs) {
      return {
        success: false,
        error: `Maximum concurrent syncs (${this.config.maxConcurrentSyncs}) reached for tenant`,
      };
    }

    // Acquire lock
    this.activeLocks.set(providerId, {
      providerId,
      lockedAt: new Date(),
      lockedBy: this.instanceId,
    });

    try {
      // Run the sync
      const result = await this.syncEngine.executeSync(
        tenantId,
        providerId,
        triggeredBy,
        isManual
      );

      // Get the sync run ID
      const latestRun = await this.prisma.sisSyncRun.findFirst({
        where: { providerId },
        orderBy: { startedAt: 'desc' },
      });

      // Optionally run transformation
      if (result.success) {
        const transformConfig: TransformConfig = {
          tenantId,
          providerId,
          createNewUsers: true,
          sendWelcomeEmails: false,
          autoActivateUsers: true,
        };
        const transformer = new EntityTransformer(this.prisma, transformConfig);
        await transformer.transformAll();
      }

      return {
        success: result.success,
        syncRunId: latestRun?.id,
        error: result.errors.length > 0 ? result.errors[0] : undefined,
      };
    } finally {
      // Release lock
      this.activeLocks.delete(providerId);
    }
  }

  /**
   * Cancel a running sync
   */
  async cancelSync(providerId: string): Promise<boolean> {
    const lock = this.activeLocks.get(providerId);
    if (!lock) {
      return false; // No sync running
    }

    // Mark current sync run as cancelled
    const latestRun = await this.prisma.sisSyncRun.findFirst({
      where: {
        providerId,
        status: SyncStatusValues.IN_PROGRESS,
      },
      orderBy: { startedAt: 'desc' },
    });

    if (latestRun) {
      await this.prisma.sisSyncRun.update({
        where: { id: latestRun.id },
        data: {
          status: SyncStatusValues.CANCELLED,
          completedAt: new Date(),
          errorMessage: 'Cancelled by user',
        },
      });
    }

    // Release lock
    this.activeLocks.delete(providerId);
    return true;
  }

  /**
   * Get sync status for a provider
   */
  async getSyncStatus(providerId: string): Promise<{
    isRunning: boolean;
    lastSync?: Date;
    lastStatus?: SyncStatus;
    nextScheduledRun?: Date;
    runningFor?: number;
  }> {
    const provider = await this.prisma.sisProvider.findUnique({
      where: { id: providerId },
    });

    const lock = this.activeLocks.get(providerId);
    const job = this.scheduledJobs.get(providerId);

    const lastRun = await this.prisma.sisSyncRun.findFirst({
      where: { providerId },
      orderBy: { startedAt: 'desc' },
    });

    let nextScheduledRun: Date | undefined;
    if (job && provider?.syncSchedule) {
      const cronExpression = cron.schedule(provider.syncSchedule, () => {});
      // Note: node-cron doesn't expose next run time directly
      // In production, use a library like cron-parser for this
      nextScheduledRun = undefined;
      cronExpression.stop();
    }

    return {
      isRunning: !!lock,
      lastSync: provider?.lastSyncAt ?? undefined,
      lastStatus: lastRun?.status,
      nextScheduledRun,
      runningFor: lock ? Date.now() - lock.lockedAt.getTime() : undefined,
    };
  }

  /**
   * Update schedule for a provider
   */
  async updateSchedule(providerId: string, schedule: string | null): Promise<void> {
    await this.prisma.sisProvider.update({
      where: { id: providerId },
      data: { syncSchedule: schedule },
    });

    if (schedule) {
      const provider = await this.prisma.sisProvider.findUnique({
        where: { id: providerId },
      });
      if (provider) {
        this.scheduleProvider(provider);
      }
    } else {
      this.unscheduleProvider(providerId);
    }
  }

  /**
   * Stop all scheduled jobs
   */
  shutdown(): void {
    for (const [providerId, job] of this.scheduledJobs) {
      job.cronTask.stop();
      console.log(`[SyncScheduler] Stopped job for provider ${providerId}`);
    }
    this.scheduledJobs.clear();
  }

  /**
   * Get all scheduled jobs
   */
  getScheduledJobs(): Array<{
    providerId: string;
    tenantId: string;
    schedule: string;
  }> {
    return Array.from(this.scheduledJobs.values()).map((job) => ({
      providerId: job.providerId,
      tenantId: job.tenantId,
      schedule: job.schedule,
    }));
  }
}

/**
 * Helper to parse common schedule presets
 */
export function getSchedulePreset(preset: string): string | null {
  const presets: Record<string, string> = {
    // Every day at 2 AM
    daily: '0 2 * * *',
    // Every day at 2 AM and 2 PM
    'twice-daily': '0 2,14 * * *',
    // Every 6 hours
    'every-6-hours': '0 */6 * * *',
    // Every weekday at 6 AM
    weekdays: '0 6 * * 1-5',
    // Every hour
    hourly: '0 * * * *',
    // Every Sunday at midnight
    weekly: '0 0 * * 0',
  };
  return presets[preset] || null;
}

/**
 * Validate a cron expression
 */
export function isValidCronExpression(expression: string): boolean {
  return cron.validate(expression);
}
