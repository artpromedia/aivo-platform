/**
 * AIVO Event Collector Service - Dead Letter Service
 *
 * Manages dead letter queue for failed events.
 */

import { prisma } from '../prisma.js';
import type { ListDeadLetterQuery, ResolveDeadLetterInput, PaginatedResponse } from '../types/index.js';

interface DeadLetterEvent {
  id: string;
  originalEventId: string;
  eventId: string;
  eventType: string;
  tenantId: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
  failureReason: string;
  failedAt: Date;
  retryCount: number;
  isResolved: boolean;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  resolution: string | null;
  resolutionNotes: string | null;
  createdAt: Date;
}

/**
 * Get dead letter events for a tenant.
 */
export async function listDeadLetterEvents(
  tenantId: string,
  query: ListDeadLetterQuery
): Promise<PaginatedResponse<DeadLetterEvent>> {
  const {
    eventType,
    isResolved,
    fromDate,
    toDate,
    page = 1,
    pageSize = 20,
  } = query;

  const where = {
    tenantId,
    ...(eventType && { eventType }),
    ...(isResolved !== undefined && { isResolved }),
    ...(fromDate || toDate
      ? {
          failedAt: {
            ...(fromDate && { gte: new Date(fromDate) }),
            ...(toDate && { lte: new Date(toDate) }),
          },
        }
      : {}),
  };

  const skip = (page - 1) * pageSize;

  const [events, totalItems] = await Promise.all([
    prisma.deadLetterEvent.findMany({
      where,
      orderBy: { failedAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.deadLetterEvent.count({ where }),
  ]);

  return {
    data: events as unknown as DeadLetterEvent[],
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  };
}

/**
 * Get a single dead letter event.
 */
export async function getDeadLetterEvent(
  tenantId: string,
  deadLetterId: string
): Promise<DeadLetterEvent | null> {
  const event = await prisma.deadLetterEvent.findFirst({
    where: { id: deadLetterId, tenantId },
  });

  return event as unknown as DeadLetterEvent | null;
}

/**
 * Resolve a dead letter event.
 */
export async function resolveDeadLetterEvent(
  tenantId: string,
  deadLetterId: string,
  userId: string,
  input: ResolveDeadLetterInput
): Promise<DeadLetterEvent> {
  const deadLetter = await prisma.deadLetterEvent.findFirst({
    where: { id: deadLetterId, tenantId },
  });

  if (!deadLetter) {
    throw new Error('Dead letter event not found');
  }

  if (deadLetter.isResolved) {
    throw new Error('Dead letter event is already resolved');
  }

  // Update the dead letter event
  const updated = await prisma.deadLetterEvent.update({
    where: { id: deadLetterId },
    data: {
      isResolved: true,
      resolvedAt: new Date(),
      resolvedBy: userId,
      resolution: input.resolution,
      resolutionNotes: input.notes,
    },
  });

  // Handle based on resolution type
  if (input.resolution === 'reprocess') {
    // Reset the original event for reprocessing
    await prisma.event.update({
      where: { id: deadLetter.originalEventId },
      data: {
        status: 'PENDING',
        retryCount: 0,
        batchId: null,
        lastError: null,
        deadLetteredAt: null,
      },
    });
  } else if (input.resolution === 'discard') {
    // Mark the original event as discarded
    await prisma.event.update({
      where: { id: deadLetter.originalEventId },
      data: {
        status: 'SKIPPED',
        lastError: `Discarded: ${input.notes || 'No reason provided'}`,
      },
    });
  }
  // For 'manual' resolution, no automatic action is taken

  return updated as unknown as DeadLetterEvent;
}

/**
 * Bulk resolve dead letter events.
 */
export async function bulkResolveDeadLetterEvents(
  tenantId: string,
  deadLetterIds: string[],
  userId: string,
  input: ResolveDeadLetterInput
): Promise<{ resolved: number; failed: number; errors: Array<{ id: string; error: string }> }> {
  const result = {
    resolved: 0,
    failed: 0,
    errors: [] as Array<{ id: string; error: string }>,
  };

  for (const id of deadLetterIds) {
    try {
      await resolveDeadLetterEvent(tenantId, id, userId, input);
      result.resolved++;
    } catch (error: any) {
      result.failed++;
      result.errors.push({ id, error: error.message });
    }
  }

  return result;
}

/**
 * Get dead letter statistics.
 */
export async function getDeadLetterStats(tenantId: string): Promise<{
  total: number;
  unresolved: number;
  resolved: number;
  byEventType: Array<{ eventType: string; count: number }>;
  byFailureReason: Array<{ reason: string; count: number }>;
  recentTrend: Array<{ date: string; count: number }>;
}> {
  const [total, unresolved, byEventType, byFailureReason, recentEvents] = await Promise.all([
    prisma.deadLetterEvent.count({ where: { tenantId } }),
    prisma.deadLetterEvent.count({ where: { tenantId, isResolved: false } }),
    prisma.deadLetterEvent.groupBy({
      by: ['eventType'],
      where: { tenantId },
      _count: { eventType: true },
      orderBy: { _count: { eventType: 'desc' } },
      take: 10,
    }),
    prisma.deadLetterEvent.groupBy({
      by: ['failureReason'],
      where: { tenantId },
      _count: { failureReason: true },
      orderBy: { _count: { failureReason: 'desc' } },
      take: 10,
    }),
    prisma.deadLetterEvent.findMany({
      where: {
        tenantId,
        failedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: { failedAt: true },
    }),
  ]);

  // Calculate daily trend
  const dailyCounts = new Map<string, number>();
  for (const event of recentEvents) {
    const date = event.failedAt.toISOString().split('T')[0];
    dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1);
  }

  const recentTrend = Array.from(dailyCounts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    total,
    unresolved,
    resolved: total - unresolved,
    byEventType: byEventType.map((e) => ({ eventType: e.eventType, count: e._count.eventType })),
    byFailureReason: byFailureReason.map((e) => ({
      reason: e.failureReason.substring(0, 100),
      count: e._count.failureReason,
    })),
    recentTrend,
  };
}

/**
 * Purge old resolved dead letter events.
 */
export async function purgeResolvedEvents(
  tenantId: string,
  olderThanDays: number = 30
): Promise<number> {
  const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  const result = await prisma.deadLetterEvent.deleteMany({
    where: {
      tenantId,
      isResolved: true,
      resolvedAt: { lt: cutoffDate },
    },
  });

  return result.count;
}

/**
 * Export dead letter events for analysis.
 */
export async function exportDeadLetterEvents(
  tenantId: string,
  options: {
    fromDate?: string;
    toDate?: string;
    eventTypes?: string[];
    includeResolved?: boolean;
    format?: 'json' | 'csv';
  }
): Promise<string> {
  const where = {
    tenantId,
    ...(options.eventTypes?.length && { eventType: { in: options.eventTypes } }),
    ...(options.includeResolved === false && { isResolved: false }),
    ...(options.fromDate || options.toDate
      ? {
          failedAt: {
            ...(options.fromDate && { gte: new Date(options.fromDate) }),
            ...(options.toDate && { lte: new Date(options.toDate) }),
          },
        }
      : {}),
  };

  const events = await prisma.deadLetterEvent.findMany({
    where,
    orderBy: { failedAt: 'desc' },
    take: 10000, // Limit export size
  });

  if (options.format === 'csv') {
    const headers = [
      'id',
      'eventId',
      'eventType',
      'failureReason',
      'failedAt',
      'retryCount',
      'isResolved',
      'resolution',
    ];
    const rows = events.map((e) => [
      e.id,
      e.eventId,
      e.eventType,
      `"${e.failureReason.replace(/"/g, '""')}"`,
      e.failedAt.toISOString(),
      e.retryCount.toString(),
      e.isResolved.toString(),
      e.resolution || '',
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  return JSON.stringify(events, null, 2);
}

/**
 * Auto-retry events that match certain criteria.
 */
export async function autoRetryEvents(
  tenantId: string,
  criteria: {
    eventTypes?: string[];
    maxRetryCount?: number;
    failureReasonPattern?: string;
  }
): Promise<{ retried: number; skipped: number }> {
  const where: any = {
    tenantId,
    isResolved: false,
  };

  if (criteria.eventTypes?.length) {
    where.eventType = { in: criteria.eventTypes };
  }

  if (criteria.maxRetryCount !== undefined) {
    where.retryCount = { lte: criteria.maxRetryCount };
  }

  if (criteria.failureReasonPattern) {
    where.failureReason = { contains: criteria.failureReasonPattern };
  }

  const candidates = await prisma.deadLetterEvent.findMany({
    where,
    take: 100, // Process in batches
  });

  let retried = 0;
  let skipped = 0;

  for (const candidate of candidates) {
    try {
      // Reset the original event
      await prisma.$transaction([
        prisma.event.update({
          where: { id: candidate.originalEventId },
          data: {
            status: 'PENDING',
            retryCount: 0,
            batchId: null,
            lastError: null,
            deadLetteredAt: null,
          },
        }),
        prisma.deadLetterEvent.update({
          where: { id: candidate.id },
          data: {
            isResolved: true,
            resolvedAt: new Date(),
            resolvedBy: 'system:auto-retry',
            resolution: 'reprocess',
            resolutionNotes: 'Auto-retry based on criteria',
          },
        }),
      ]);
      retried++;
    } catch {
      skipped++;
    }
  }

  return { retried, skipped };
}
