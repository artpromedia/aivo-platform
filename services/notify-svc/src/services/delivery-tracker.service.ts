/**
 * Delivery Tracker Service
 *
 * Tracks notification delivery across all channels:
 * - Delivery status updates
 * - Retry management
 * - Analytics and reporting
 * - Bounce/failure handling
 */

import { prisma, DeliveryChannel, DeliveryStatus } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface DeliveryRecord {
  notificationId: string;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  providerName?: string;
  providerMessageId?: string;
  attemptedAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  nextRetryAt?: Date;
}

export interface DeliveryStatusUpdate {
  notificationId: string;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  providerMessageId?: string;
  providerName?: string;
  deliveredAt?: Date;
  errorCode?: string;
  errorMessage?: string;
}

export interface DeliveryStats {
  channel: DeliveryChannel;
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  failed: number;
  bounced: number;
  deliveryRate: number;
}

export interface DeliveryAnalytics {
  period: 'hour' | 'day' | 'week' | 'month';
  startDate: Date;
  endDate: Date;
  byChannel: Map<DeliveryChannel, DeliveryStats>;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  avgDeliveryTimeMs: number;
}

/** Optional fields from DeliveryStatusUpdate for partial updates */
export type DeliveryStatusData = Omit<DeliveryStatusUpdate, 'notificationId' | 'channel' | 'status'>;

/** Data structure for Prisma delivery record updates */
export interface DeliveryUpdateData {
  status: DeliveryStatus;
  providerMessageId?: string;
  providerName?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  errorCode?: string;
  errorMessage?: string;
  nextRetryAt?: Date;
  retryCount?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// DELIVERY TRACKER SERVICE
// ══════════════════════════════════════════════════════════════════════════════

class DeliveryTrackerService {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS_MS = [60000, 300000, 900000]; // 1min, 5min, 15min

  /**
   * Record a new delivery attempt
   */
  async recordDeliveryAttempt(
    notificationId: string,
    channel: DeliveryChannel,
    options: {
      providerName?: string;
      providerMessageId?: string;
      status?: DeliveryStatus;
    } = {}
  ): Promise<DeliveryRecord> {
    const delivery = await prisma.deliveryLog.create({
      data: {
        notificationId,
        channel,
        status: options.status ?? DeliveryStatus.PENDING,
        providerName: options.providerName ?? null,
        providerMessageId: options.providerMessageId ?? null,
        attemptedAt: new Date(),
      },
    });

    return this.mapToDeliveryRecord(delivery);
  }

  /**
   * Update delivery status
   */
  async updateStatus(update: DeliveryStatusUpdate): Promise<void> {
    const { notificationId, channel, status, ...data } = update;

    // Find the latest delivery log for this notification and channel
    const existing = await prisma.deliveryLog.findFirst({
      where: { notificationId, channel },
      orderBy: { attemptedAt: 'desc' },
    });

    if (!existing) {
      console.warn('[DeliveryTracker] No delivery record found', { notificationId, channel });
      return;
    }

    const updateData = this.buildUpdateData(status, data, existing.retryCount);

    await prisma.deliveryLog.update({
      where: { id: existing.id },
      data: updateData,
    });

    console.log('[DeliveryTracker] Status updated', {
      notificationId,
      channel,
      status,
    });
  }

  /**
   * Build the update data object based on status
   */
  private buildUpdateData(
    status: DeliveryStatus,
    data: DeliveryStatusData,
    currentRetryCount: number
  ): DeliveryUpdateData {
    const updateData: DeliveryUpdateData = { status };

    if (data.providerMessageId) {
      updateData.providerMessageId = data.providerMessageId;
    }

    if (data.providerName) {
      updateData.providerName = data.providerName;
    }

    this.applyStatusSpecificData(updateData, status, data, currentRetryCount);

    return updateData;
  }

  /**
   * Apply status-specific data to the update object
   */
  private applyStatusSpecificData(
    updateData: DeliveryUpdateData,
    status: DeliveryStatus,
    data: DeliveryStatusData,
    currentRetryCount: number
  ): void {
    if (status === DeliveryStatus.SENT) {
      updateData.sentAt = new Date();
      return;
    }

    if (status === DeliveryStatus.DELIVERED) {
      updateData.deliveredAt = data.deliveredAt ?? new Date();
      return;
    }

    if (status === DeliveryStatus.FAILED || status === DeliveryStatus.BOUNCED) {
      this.applyErrorData(updateData, data, status, currentRetryCount);
    }
  }

  /**
   * Apply error-related data for failed/bounced statuses
   */
  private applyErrorData(
    updateData: DeliveryUpdateData,
    data: DeliveryStatusData,
    status: DeliveryStatus,
    currentRetryCount: number
  ): void {
    if (data.errorCode) {
      updateData.errorCode = data.errorCode;
    }
    if (data.errorMessage) {
      updateData.errorMessage = data.errorMessage;
    }

    // Schedule retry if applicable
    const shouldRetry = currentRetryCount < this.MAX_RETRIES && status === DeliveryStatus.FAILED;
    if (shouldRetry) {
      const retryDelay = this.RETRY_DELAYS_MS[currentRetryCount] ?? this.RETRY_DELAYS_MS[2];
      if (retryDelay !== undefined) {
        updateData.nextRetryAt = new Date(Date.now() + retryDelay);
      }
      updateData.retryCount = currentRetryCount + 1;
    }
  }

  /**
   * Mark delivery as sent
   */
  async markSent(
    notificationId: string,
    channel: DeliveryChannel,
    providerMessageId?: string,
    providerName?: string
  ): Promise<void> {
    const statusUpdate: DeliveryStatusUpdate = {
      notificationId,
      channel,
      status: DeliveryStatus.SENT,
    };
    if (providerMessageId) {
      statusUpdate.providerMessageId = providerMessageId;
    }
    if (providerName) {
      statusUpdate.providerName = providerName;
    }
    await this.updateStatus(statusUpdate);
  }

  /**
   * Mark delivery as delivered
   */
  async markDelivered(
    notificationId: string,
    channel: DeliveryChannel,
    deliveredAt?: Date
  ): Promise<void> {
    const statusUpdate: DeliveryStatusUpdate = {
      notificationId,
      channel,
      status: DeliveryStatus.DELIVERED,
    };
    if (deliveredAt) {
      statusUpdate.deliveredAt = deliveredAt;
    }
    await this.updateStatus(statusUpdate);
  }

  /**
   * Mark delivery as failed
   */
  async markFailed(
    notificationId: string,
    channel: DeliveryChannel,
    errorCode: string,
    errorMessage: string
  ): Promise<void> {
    await this.updateStatus({
      notificationId,
      channel,
      status: DeliveryStatus.FAILED,
      errorCode,
      errorMessage,
    });
  }

  /**
   * Mark delivery as bounced
   */
  async markBounced(
    notificationId: string,
    channel: DeliveryChannel,
    errorCode: string,
    errorMessage: string
  ): Promise<void> {
    await this.updateStatus({
      notificationId,
      channel,
      status: DeliveryStatus.BOUNCED,
      errorCode,
      errorMessage,
    });
  }

  /**
   * Get deliveries pending retry
   */
  async getPendingRetries(limit = 100): Promise<DeliveryRecord[]> {
    const now = new Date();

    const deliveries = await prisma.deliveryLog.findMany({
      where: {
        status: DeliveryStatus.FAILED,
        nextRetryAt: { lte: now },
        retryCount: { lt: this.MAX_RETRIES },
      },
      orderBy: { nextRetryAt: 'asc' },
      take: limit,
    });

    return deliveries.map((d) => this.mapToDeliveryRecord(d));
  }

  /**
   * Get delivery history for a notification
   */
  async getDeliveryHistory(notificationId: string): Promise<DeliveryRecord[]> {
    const deliveries = await prisma.deliveryLog.findMany({
      where: { notificationId },
      orderBy: { attemptedAt: 'desc' },
    });

    return deliveries.map((d) => this.mapToDeliveryRecord(d));
  }

  /**
   * Get delivery statistics by channel
   */
  async getChannelStats(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Map<DeliveryChannel, DeliveryStats>> {
    const stats = new Map<DeliveryChannel, DeliveryStats>();

    // Get notifications in date range with their deliveries
    const results = await prisma.deliveryLog.groupBy({
      by: ['channel', 'status'],
      where: {
        attemptedAt: {
          gte: startDate,
          lte: endDate,
        },
        notification: {
          tenantId,
        },
      },
      _count: { id: true },
    });

    // Initialize stats for each channel
    for (const channel of Object.values(DeliveryChannel)) {
      stats.set(channel, {
        channel,
        total: 0,
        pending: 0,
        sent: 0,
        delivered: 0,
        failed: 0,
        bounced: 0,
        deliveryRate: 0,
      });
    }

    // Populate stats
    for (const result of results) {
      const channelStats = stats.get(result.channel);
      if (!channelStats) {
        continue;
      }
      const count = result._count.id;

      channelStats.total += count;

      switch (result.status) {
        case DeliveryStatus.PENDING:
          channelStats.pending += count;
          break;
        case DeliveryStatus.SENT:
          channelStats.sent += count;
          break;
        case DeliveryStatus.DELIVERED:
          channelStats.delivered += count;
          break;
        case DeliveryStatus.FAILED:
          channelStats.failed += count;
          break;
        case DeliveryStatus.BOUNCED:
          channelStats.bounced += count;
          break;
      }
    }

    // Calculate delivery rates
    for (const [, channelStats] of stats) {
      const attempted = channelStats.total - channelStats.pending;
      if (attempted > 0) {
        channelStats.deliveryRate = (channelStats.delivered / attempted) * 100;
      }
    }

    return stats;
  }

  /**
   * Get overall delivery analytics
   */
  async getAnalytics(
    tenantId: string,
    period: 'hour' | 'day' | 'week' | 'month'
  ): Promise<DeliveryAnalytics> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'hour':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const channelStats = await this.getChannelStats(tenantId, startDate, now);

    // Calculate totals
    let totalSent = 0;
    let totalDelivered = 0;
    let totalFailed = 0;

    for (const [, stats] of channelStats) {
      totalSent += stats.sent + stats.delivered;
      totalDelivered += stats.delivered;
      totalFailed += stats.failed + stats.bounced;
    }

    // Calculate average delivery time
    const _deliveryTimes = await prisma.deliveryLog.aggregate({
      where: {
        notification: { tenantId },
        status: DeliveryStatus.DELIVERED,
        attemptedAt: { gte: startDate, lte: now },
        deliveredAt: { not: null },
      },
      _avg: {
        // Using raw query would be better for this
      },
    });

    return {
      period,
      startDate,
      endDate: now,
      byChannel: channelStats,
      totalSent,
      totalDelivered,
      totalFailed,
      avgDeliveryTimeMs: 0, // Would need raw query for accurate calculation
    };
  }

  /**
   * Cleanup old delivery logs
   */
  async cleanupOldLogs(olderThanDays = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await prisma.deliveryLog.deleteMany({
      where: {
        attemptedAt: { lte: cutoffDate },
      },
    });

    console.log('[DeliveryTracker] Cleaned up old logs', { count: result.count });
    return result.count;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ════════════════════════════════════════════════════════════════════════════

  private mapToDeliveryRecord(delivery: {
    notificationId: string;
    channel: DeliveryChannel;
    status: DeliveryStatus;
    providerName: string | null;
    providerMessageId: string | null;
    attemptedAt: Date;
    sentAt: Date | null;
    deliveredAt: Date | null;
    errorCode: string | null;
    errorMessage: string | null;
    retryCount: number;
    nextRetryAt: Date | null;
  }): DeliveryRecord {
    const record: DeliveryRecord = {
      notificationId: delivery.notificationId,
      channel: delivery.channel,
      status: delivery.status,
      attemptedAt: delivery.attemptedAt,
      retryCount: delivery.retryCount,
    };

    if (delivery.providerName !== null) {
      record.providerName = delivery.providerName;
    }
    if (delivery.providerMessageId !== null) {
      record.providerMessageId = delivery.providerMessageId;
    }
    if (delivery.sentAt !== null) {
      record.sentAt = delivery.sentAt;
    }
    if (delivery.deliveredAt !== null) {
      record.deliveredAt = delivery.deliveredAt;
    }
    if (delivery.errorCode !== null) {
      record.errorCode = delivery.errorCode;
    }
    if (delivery.errorMessage !== null) {
      record.errorMessage = delivery.errorMessage;
    }
    if (delivery.nextRetryAt !== null) {
      record.nextRetryAt = delivery.nextRetryAt;
    }

    return record;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ══════════════════════════════════════════════════════════════════════════════

export const deliveryTracker = new DeliveryTrackerService();
