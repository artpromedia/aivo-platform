/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, import/no-unresolved */
/**
 * Usage Analytics Service
 *
 * Business logic for seat utilization reporting, threshold alerts, and notifications.
 */

import type { PrismaClient } from '../generated/prisma-client';
import {
  SeatUsageRepository,
  SeatUsageAlertRepository,
  SeatUsageNotificationRepository,
} from '../repositories';
import type {
  SeatUsageEntry,
  SeatUsageAlert,
  SeatUsageNotification,
  SeatUsageAlertContext,
  SeatUsageAlertSummary,
  SeatUsageBySku,
  SeatUsageResponse,
  AlertsResponse,
  NotificationsResponse,
} from '../types';
import {
  SeatUsageAlertStatus,
  UTILIZATION_THRESHOLDS,
  getUsageStatus,
  getUtilizationSeverity,
  generateAlertMessage,
  getGradeBandLabel,
} from '../types';

// ============================================================================
// Usage Analytics Service
// ============================================================================

export class UsageAnalyticsService {
  private usageRepo: SeatUsageRepository;
  private alertRepo: SeatUsageAlertRepository;
  private notificationRepo: SeatUsageNotificationRepository;

  constructor(private prisma: PrismaClient) {
    this.usageRepo = new SeatUsageRepository(prisma);
    this.alertRepo = new SeatUsageAlertRepository(prisma);
    this.notificationRepo = new SeatUsageNotificationRepository(prisma);
  }

  // ==========================================================================
  // Seat Usage Queries
  // ==========================================================================

  /**
   * Get seat usage for a tenant.
   * Returns usage data with summaries and active alerts.
   */
  async getSeatUsage(tenantId: string): Promise<SeatUsageResponse> {
    // Refresh the view first to get latest data
    await this.usageRepo.refreshView();

    // Fetch usage data and alerts in parallel
    const [entries, alerts, stats] = await Promise.all([
      this.usageRepo.getByTenant(tenantId),
      this.alertRepo.listByTenant(tenantId, SeatUsageAlertStatus.OPEN),
      this.usageRepo.getAggregatedStats(tenantId),
    ]);

    // Transform entries to API format
    const usage: SeatUsageBySku[] = entries.map((entry) => ({
      sku: entry.sku,
      gradeBand: entry.gradeBand,
      committedSeats: entry.committedSeats,
      allocatedSeats: entry.allocatedSeats,
      overageAllowed: entry.overageAllowed,
      overageLimit: entry.overageLimit,
      overageUsed: entry.overageUsed,
      utilizationPercent: Number(entry.utilizationPercent),
      status: getUsageStatus(Number(entry.utilizationPercent)),
    }));

    // Transform alerts to summary format
    const alertSummaries: SeatUsageAlertSummary[] = alerts.map((alert) =>
      this.mapAlertToSummary(alert)
    );

    return {
      tenantId,
      usage,
      summary: {
        totalCommitted: stats.totalCommitted,
        totalAllocated: stats.totalAllocated,
        totalOverage: stats.totalOverage,
        overallUtilization: stats.overallUtilization,
      },
      alerts: alertSummaries,
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get raw seat usage entries for a tenant.
   */
  async getRawUsage(tenantId: string): Promise<SeatUsageEntry[]> {
    return this.usageRepo.getByTenant(tenantId);
  }

  // ==========================================================================
  // Alert Management
  // ==========================================================================

  /**
   * Get alerts for a tenant.
   */
  async getAlerts(tenantId: string, status?: SeatUsageAlertStatus): Promise<AlertsResponse> {
    const alerts = await this.alertRepo.listByTenant(tenantId, status);
    const counts = await this.alertRepo.countByStatus(tenantId);

    return {
      alerts,
      total: alerts.length,
      unacknowledged: counts[SeatUsageAlertStatus.OPEN],
    };
  }

  /**
   * Get all open alerts (platform admin view).
   */
  async getAllOpenAlerts(): Promise<AlertsResponse> {
    const alerts = await this.alertRepo.listAllOpen();

    return {
      alerts,
      total: alerts.length,
      unacknowledged: alerts.length,
    };
  }

  /**
   * Acknowledge an alert.
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<SeatUsageAlert> {
    const alert = await this.alertRepo.findById(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }
    if (alert.status !== SeatUsageAlertStatus.OPEN) {
      throw new Error(`Alert is not open: ${alertId}`);
    }

    return this.alertRepo.acknowledge(alertId, userId);
  }

  /**
   * Resolve an alert.
   */
  async resolveAlert(alertId: string, userId: string): Promise<SeatUsageAlert> {
    const alert = await this.alertRepo.findById(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }
    if (alert.status === SeatUsageAlertStatus.RESOLVED) {
      throw new Error(`Alert is already resolved: ${alertId}`);
    }

    return this.alertRepo.resolve(alertId, userId);
  }

  // ==========================================================================
  // Notification Management
  // ==========================================================================

  /**
   * Get notifications for a user.
   */
  async getNotifications(
    tenantId: string,
    userId?: string,
    includeRead = false
  ): Promise<NotificationsResponse> {
    const notifications = await this.notificationRepo.getForUser(tenantId, userId, includeRead);
    const unreadCount = await this.notificationRepo.getUnreadCount(tenantId, userId);

    return {
      notifications,
      total: notifications.length,
      unread: unreadCount,
    };
  }

  /**
   * Mark a notification as read.
   */
  async markNotificationRead(notificationId: string): Promise<SeatUsageNotification> {
    return this.notificationRepo.markRead(notificationId);
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllNotificationsRead(tenantId: string, userId?: string): Promise<number> {
    return this.notificationRepo.markAllRead(tenantId, userId);
  }

  // ==========================================================================
  // Alert Processing (called by scheduler)
  // ==========================================================================

  /**
   * Process all usage entries and generate alerts.
   * Should be called by a daily scheduled job.
   */
  async processAlerts(): Promise<AlertProcessingResult> {
    console.log('[UsageAnalytics] Starting alert processing...');

    // Refresh the view first
    await this.usageRepo.refreshView();

    // Get all usage entries
    const entries = await this.usageRepo.getAll();
    console.log(`[UsageAnalytics] Processing ${entries.length} usage entries`);

    const result: AlertProcessingResult = {
      processed: entries.length,
      alertsCreated: 0,
      alertsUpdated: 0,
      alertsAutoResolved: 0,
      notificationsSent: 0,
      errors: [],
    };

    // Process each entry against thresholds
    const thresholds = [
      UTILIZATION_THRESHOLDS.WARNING,
      UTILIZATION_THRESHOLDS.CRITICAL,
      UTILIZATION_THRESHOLDS.OVERAGE,
    ];

    for (const entry of entries) {
      try {
        const utilization = Number(entry.utilizationPercent);

        for (const threshold of thresholds) {
          const thresholdPercent = threshold * 100;

          if (utilization >= thresholdPercent) {
            const alertResult = await this.processAlertForEntry(entry, threshold);
            if (alertResult.created) {
              result.alertsCreated++;
              result.notificationsSent++;
            } else if (alertResult.updated) {
              result.alertsUpdated++;
            }
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push({
          tenantId: entry.tenantId,
          sku: entry.sku,
          error: errorMessage,
        });
      }
    }

    // Auto-resolve alerts where utilization has dropped below threshold
    result.alertsAutoResolved = await this.alertRepo.autoResolveStale(entries);

    console.log('[UsageAnalytics] Alert processing complete:', result);
    return result;
  }

  /**
   * Process alert for a specific entry and threshold.
   */
  private async processAlertForEntry(
    entry: SeatUsageEntry,
    threshold: number
  ): Promise<{ created: boolean; updated: boolean }> {
    // Check if an open alert already exists
    const existingAlert = await this.alertRepo.findOpenAlert(
      entry.tenantId,
      entry.sku,
      threshold
    );

    const context: SeatUsageAlertContext = {
      committed: entry.committedSeats,
      allocated: entry.allocatedSeats,
      utilization: Number(entry.utilizationPercent),
      overage: entry.overageUsed,
      overageAllowed: entry.overageAllowed,
      overageLimit: entry.overageLimit,
      contractId: entry.contractId,
      contractEndDate: entry.endDate.toISOString(),
    };

    if (existingAlert) {
      // Update existing alert context
      await this.alertRepo.updateContext(existingAlert.id, context);
      return { created: false, updated: true };
    }

    // Create new alert
    const alert = await this.alertRepo.create({
      tenantId: entry.tenantId,
      sku: entry.sku,
      gradeBand: entry.gradeBand,
      threshold,
      contextJson: context,
    });

    // Create notification for the alert
    const severity = getUtilizationSeverity(Number(entry.utilizationPercent));
    const message = generateAlertMessage(
      entry.sku,
      entry.gradeBand,
      Number(entry.utilizationPercent),
      threshold
    );

    await this.notificationRepo.create({
      alertId: alert.id,
      tenantId: entry.tenantId,
      title: `Seat Utilization Alert: ${getGradeBandLabel(entry.gradeBand)}`,
      message,
      severity,
    });

    return { created: true, updated: false };
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private mapAlertToSummary(alert: SeatUsageAlert): SeatUsageAlertSummary {
    const utilization = alert.contextJson?.utilization ?? 0;
    return {
      id: alert.id,
      sku: alert.sku,
      gradeBand: alert.gradeBand,
      threshold: alert.threshold,
      utilizationPercent: utilization,
      status: alert.status,
      severity: getUtilizationSeverity(utilization),
      createdAt: alert.createdAt,
      message: generateAlertMessage(alert.sku, alert.gradeBand, utilization, alert.threshold),
    };
  }
}

// ============================================================================
// Alert Processing Result
// ============================================================================

export interface AlertProcessingResult {
  processed: number;
  alertsCreated: number;
  alertsUpdated: number;
  alertsAutoResolved: number;
  notificationsSent: number;
  errors: {
    tenantId: string;
    sku: string;
    error: string;
  }[];
}

// ============================================================================
// Alert Scheduler
// ============================================================================

/**
 * Scheduler for processing seat usage alerts.
 * Runs daily to check utilization and generate alerts.
 */
export class UsageAlertScheduler {
  private service: UsageAnalyticsService;
  private timer: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  constructor(prisma: PrismaClient) {
    this.service = new UsageAnalyticsService(prisma);
  }

  /**
   * Start the scheduler.
   * Runs immediately and then every 24 hours.
   */
  start(intervalMs = 24 * 60 * 60 * 1000): void {
    if (this.isRunning) {
      console.log('[UsageAlertScheduler] Already running');
      return;
    }

    console.log('[UsageAlertScheduler] Starting scheduler...');
    this.isRunning = true;

    // Run immediately
    this.runJob().catch(console.error);

    // Schedule recurring job
    this.timer = setInterval(() => {
      this.runJob().catch(console.error);
    }, intervalMs);
  }

  /**
   * Stop the scheduler.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('[UsageAlertScheduler] Stopped');
  }

  /**
   * Run the alert processing job.
   */
  private async runJob(): Promise<void> {
    console.log('[UsageAlertScheduler] Running alert job...');
    const startTime = Date.now();

    try {
      const result = await this.service.processAlerts();
      const duration = Date.now() - startTime;

      console.log(`[UsageAlertScheduler] Job completed in ${duration}ms:`, {
        processed: result.processed,
        created: result.alertsCreated,
        updated: result.alertsUpdated,
        autoResolved: result.alertsAutoResolved,
        notifications: result.notificationsSent,
        errors: result.errors.length,
      });
    } catch (error) {
      console.error('[UsageAlertScheduler] Job failed:', error);
    }
  }

  /**
   * Manually trigger alert processing.
   */
  async triggerNow(): Promise<AlertProcessingResult> {
    return this.service.processAlerts();
  }
}
