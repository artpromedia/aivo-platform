/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-unsafe-argument, import/no-unresolved */
/**
 * Usage Analytics Repository
 *
 * Data access layer for seat usage views, alerts, and notifications.
 */

import { PrismaClient, Prisma } from '../generated/prisma-client';
import {
  SeatUsageEntry,
  SeatUsageAlert,
  SeatUsageNotification,
  SeatUsageAlertStatus,
  SeatUsageAlertContext,
  CreateSeatUsageAlertInput,
  CreateNotificationInput,
  GradeBand,
} from '../types';

// ============================================================================
// Seat Usage View Repository
// ============================================================================

export class SeatUsageRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get seat usage for a tenant.
   * Queries the vw_seat_usage materialized view.
   */
  async getByTenant(tenantId: string): Promise<SeatUsageEntry[]> {
    const results = await this.prisma.$queryRaw<SeatUsageEntry[]>`
      SELECT 
        tenant_id as "tenantId",
        sku,
        grade_band as "gradeBand",
        committed_seats as "committedSeats",
        allocated_seats as "allocatedSeats",
        overage_allowed as "overageAllowed",
        overage_limit as "overageLimit",
        overage_used as "overageUsed",
        utilization_percent as "utilizationPercent",
        contract_id as "contractId",
        start_date as "startDate",
        end_date as "endDate",
        is_active as "isActive",
        enforcement,
        calculated_at as "calculatedAt"
      FROM vw_seat_usage
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY grade_band, sku
    `;
    return results;
  }

  /**
   * Get seat usage entries exceeding a threshold.
   * Used by the alert job to find entries needing alerts.
   */
  async getExceedingThreshold(threshold: number): Promise<SeatUsageEntry[]> {
    const thresholdPercent = threshold * 100;
    const results = await this.prisma.$queryRaw<SeatUsageEntry[]>`
      SELECT 
        tenant_id as "tenantId",
        sku,
        grade_band as "gradeBand",
        committed_seats as "committedSeats",
        allocated_seats as "allocatedSeats",
        overage_allowed as "overageAllowed",
        overage_limit as "overageLimit",
        overage_used as "overageUsed",
        utilization_percent as "utilizationPercent",
        contract_id as "contractId",
        start_date as "startDate",
        end_date as "endDate",
        is_active as "isActive",
        enforcement,
        calculated_at as "calculatedAt"
      FROM vw_seat_usage
      WHERE utilization_percent >= ${thresholdPercent}
      ORDER BY utilization_percent DESC
    `;
    return results;
  }

  /**
   * Get all seat usage entries for alert processing.
   */
  async getAll(): Promise<SeatUsageEntry[]> {
    const results = await this.prisma.$queryRaw<SeatUsageEntry[]>`
      SELECT 
        tenant_id as "tenantId",
        sku,
        grade_band as "gradeBand",
        committed_seats as "committedSeats",
        allocated_seats as "allocatedSeats",
        overage_allowed as "overageAllowed",
        overage_limit as "overageLimit",
        overage_used as "overageUsed",
        utilization_percent as "utilizationPercent",
        contract_id as "contractId",
        start_date as "startDate",
        end_date as "endDate",
        is_active as "isActive",
        enforcement,
        calculated_at as "calculatedAt"
      FROM vw_seat_usage
      ORDER BY tenant_id, grade_band, sku
    `;
    return results;
  }

  /**
   * Refresh the materialized view.
   * Should be called before alert processing.
   */
  async refreshView(): Promise<void> {
    await this.prisma.$executeRaw`SELECT refresh_seat_usage_view()`;
  }

  /**
   * Get aggregated usage stats for a tenant.
   */
  async getAggregatedStats(tenantId: string): Promise<{
    totalCommitted: number;
    totalAllocated: number;
    totalOverage: number;
    overallUtilization: number;
  }> {
    const result = await this.prisma.$queryRaw<Array<{
      totalCommitted: bigint;
      totalAllocated: bigint;
      totalOverage: bigint;
      overallUtilization: number;
    }>>`
      SELECT 
        COALESCE(SUM(committed_seats), 0) as "totalCommitted",
        COALESCE(SUM(allocated_seats), 0) as "totalAllocated",
        COALESCE(SUM(overage_used), 0) as "totalOverage",
        CASE 
          WHEN SUM(committed_seats) = 0 THEN 0
          ELSE ROUND((SUM(allocated_seats)::DECIMAL / SUM(committed_seats)::DECIMAL) * 100, 2)
        END as "overallUtilization"
      FROM vw_seat_usage
      WHERE tenant_id = ${tenantId}::uuid
    `;

    const row = result[0];
    return {
      totalCommitted: Number(row?.totalCommitted ?? 0),
      totalAllocated: Number(row?.totalAllocated ?? 0),
      totalOverage: Number(row?.totalOverage ?? 0),
      overallUtilization: Number(row?.overallUtilization ?? 0),
    };
  }
}

// ============================================================================
// Seat Usage Alert Repository
// ============================================================================

export class SeatUsageAlertRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new alert.
   */
  async create(input: CreateSeatUsageAlertInput): Promise<SeatUsageAlert> {
    const alert = await this.prisma.seatUsageAlert.create({
      data: {
        tenantId: input.tenantId,
        sku: input.sku,
        gradeBand: input.gradeBand as GradeBand,
        threshold: new Prisma.Decimal(input.threshold),
        status: SeatUsageAlertStatus.OPEN,
        contextJson: input.contextJson as Prisma.InputJsonValue,
      },
    });
    return this.mapToAlert(alert);
  }

  /**
   * Find an existing open alert for a tenant/sku/threshold combination.
   */
  async findOpenAlert(
    tenantId: string,
    sku: string,
    threshold: number
  ): Promise<SeatUsageAlert | null> {
    const alert = await this.prisma.seatUsageAlert.findFirst({
      where: {
        tenantId,
        sku,
        threshold: new Prisma.Decimal(threshold),
        status: SeatUsageAlertStatus.OPEN,
      },
    });
    return alert ? this.mapToAlert(alert) : null;
  }

  /**
   * Get alert by ID.
   */
  async findById(id: string): Promise<SeatUsageAlert | null> {
    const alert = await this.prisma.seatUsageAlert.findUnique({
      where: { id },
    });
    return alert ? this.mapToAlert(alert) : null;
  }

  /**
   * List alerts for a tenant.
   */
  async listByTenant(
    tenantId: string,
    status?: SeatUsageAlertStatus
  ): Promise<SeatUsageAlert[]> {
    const alerts = await this.prisma.seatUsageAlert.findMany({
      where: {
        tenantId,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
    });
    return alerts.map((a) => this.mapToAlert(a));
  }

  /**
   * List all open alerts (for platform admin view).
   */
  async listAllOpen(): Promise<SeatUsageAlert[]> {
    const alerts = await this.prisma.seatUsageAlert.findMany({
      where: { status: SeatUsageAlertStatus.OPEN },
      orderBy: { createdAt: 'desc' },
    });
    return alerts.map((a) => this.mapToAlert(a));
  }

  /**
   * Acknowledge an alert.
   */
  async acknowledge(id: string, acknowledgedBy: string): Promise<SeatUsageAlert> {
    const alert = await this.prisma.seatUsageAlert.update({
      where: { id },
      data: {
        status: SeatUsageAlertStatus.ACKNOWLEDGED,
        acknowledgedAt: new Date(),
        acknowledgedBy,
      },
    });
    return this.mapToAlert(alert);
  }

  /**
   * Resolve an alert.
   */
  async resolve(id: string, resolvedBy: string): Promise<SeatUsageAlert> {
    const alert = await this.prisma.seatUsageAlert.update({
      where: { id },
      data: {
        status: SeatUsageAlertStatus.RESOLVED,
        resolvedAt: new Date(),
        resolvedBy,
      },
    });
    return this.mapToAlert(alert);
  }

  /**
   * Update alert context (e.g., when utilization changes).
   */
  async updateContext(id: string, contextJson: SeatUsageAlertContext): Promise<SeatUsageAlert> {
    const alert = await this.prisma.seatUsageAlert.update({
      where: { id },
      data: {
        contextJson: contextJson as Prisma.InputJsonValue,
      },
    });
    return this.mapToAlert(alert);
  }

  /**
   * Get count of alerts by status for a tenant.
   */
  async countByStatus(tenantId: string): Promise<Record<SeatUsageAlertStatus, number>> {
    const counts = await this.prisma.seatUsageAlert.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: true,
    });

    const result: Record<SeatUsageAlertStatus, number> = {
      [SeatUsageAlertStatus.OPEN]: 0,
      [SeatUsageAlertStatus.ACKNOWLEDGED]: 0,
      [SeatUsageAlertStatus.RESOLVED]: 0,
    };

    for (const count of counts) {
      result[count.status as SeatUsageAlertStatus] = count._count;
    }

    return result;
  }

  /**
   * Auto-resolve alerts where utilization has dropped below threshold.
   */
  async autoResolveStale(entries: SeatUsageEntry[]): Promise<number> {
    // Build a lookup map of current utilization
    const utilizationMap = new Map<string, number>();
    for (const entry of entries) {
      const key = `${entry.tenantId}:${entry.sku}`;
      utilizationMap.set(key, entry.utilizationPercent);
    }

    // Find open alerts that should be resolved
    const openAlerts = await this.prisma.seatUsageAlert.findMany({
      where: { status: SeatUsageAlertStatus.OPEN },
    });

    let resolvedCount = 0;
    for (const alert of openAlerts) {
      const key = `${alert.tenantId}:${alert.sku}`;
      const currentUtilization = utilizationMap.get(key) ?? 0;
      const thresholdPercent = Number(alert.threshold) * 100;

      // If current utilization is below threshold, auto-resolve
      if (currentUtilization < thresholdPercent) {
        await this.prisma.seatUsageAlert.update({
          where: { id: alert.id },
          data: {
            status: SeatUsageAlertStatus.RESOLVED,
            resolvedAt: new Date(),
            // No resolvedBy since it's automatic
          },
        });
        resolvedCount++;
      }
    }

    return resolvedCount;
  }

  private mapToAlert(alert: Prisma.SeatUsageAlertGetPayload<object>): SeatUsageAlert {
    return {
      id: alert.id,
      tenantId: alert.tenantId,
      sku: alert.sku,
      gradeBand: alert.gradeBand as GradeBand,
      threshold: Number(alert.threshold),
      status: alert.status as SeatUsageAlertStatus,
      contextJson: alert.contextJson as SeatUsageAlertContext | null,
      acknowledgedAt: alert.acknowledgedAt,
      acknowledgedBy: alert.acknowledgedBy,
      resolvedAt: alert.resolvedAt,
      resolvedBy: alert.resolvedBy,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
    };
  }
}

// ============================================================================
// Seat Usage Notification Repository
// ============================================================================

export class SeatUsageNotificationRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a notification.
   */
  async create(input: CreateNotificationInput): Promise<SeatUsageNotification> {
    const notification = await this.prisma.seatUsageNotification.create({
      data: {
        alertId: input.alertId,
        tenantId: input.tenantId,
        userId: input.userId ?? null,
        title: input.title,
        message: input.message,
        severity: input.severity,
      },
    });
    return this.mapToNotification(notification);
  }

  /**
   * Get notifications for a user.
   */
  async getForUser(
    tenantId: string,
    userId?: string,
    includeRead = false
  ): Promise<SeatUsageNotification[]> {
    const notifications = await this.prisma.seatUsageNotification.findMany({
      where: {
        tenantId,
        ...(userId && { OR: [{ userId }, { userId: null }] }),
        ...(!includeRead && { isRead: false }),
      },
      orderBy: { createdAt: 'desc' },
    });
    return notifications.map((n) => this.mapToNotification(n));
  }

  /**
   * Get all notifications for a tenant (admin view).
   */
  async getForTenant(tenantId: string): Promise<SeatUsageNotification[]> {
    const notifications = await this.prisma.seatUsageNotification.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return notifications.map((n) => this.mapToNotification(n));
  }

  /**
   * Mark notification as read.
   */
  async markRead(id: string): Promise<SeatUsageNotification> {
    const notification = await this.prisma.seatUsageNotification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    return this.mapToNotification(notification);
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllRead(tenantId: string, userId?: string): Promise<number> {
    const result = await this.prisma.seatUsageNotification.updateMany({
      where: {
        tenantId,
        ...(userId && { OR: [{ userId }, { userId: null }] }),
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    return result.count;
  }

  /**
   * Get unread count for a user.
   */
  async getUnreadCount(tenantId: string, userId?: string): Promise<number> {
    return this.prisma.seatUsageNotification.count({
      where: {
        tenantId,
        ...(userId && { OR: [{ userId }, { userId: null }] }),
        isRead: false,
      },
    });
  }

  /**
   * Delete notifications for a resolved alert.
   */
  async deleteForAlert(alertId: string): Promise<number> {
    const result = await this.prisma.seatUsageNotification.deleteMany({
      where: { alertId },
    });
    return result.count;
  }

  private mapToNotification(
    notification: Prisma.SeatUsageNotificationGetPayload<object>
  ): SeatUsageNotification {
    return {
      id: notification.id,
      alertId: notification.alertId,
      tenantId: notification.tenantId,
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      severity: notification.severity as 'INFO' | 'WARNING' | 'CRITICAL',
      isRead: notification.isRead,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    };
  }
}
