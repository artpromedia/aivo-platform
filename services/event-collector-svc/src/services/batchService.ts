/**
 * AIVO Event Collector Service - Batch Service
 *
 * Manages event batching for efficient processing.
 */

import { prisma } from '../prisma.js';
import { config } from '../config.js';
import type { EventPriority, BatchStatus, PaginatedResponse } from '../types/index.js';

// In-memory cache for open batches per tenant/priority
const openBatches = new Map<string, string>();

/**
 * Get cache key for open batch.
 */
function getBatchCacheKey(tenantId: string, priority: EventPriority): string {
  return `${tenantId}:${priority}`;
}

/**
 * Get or create an open batch for a tenant.
 */
export async function getOrCreateBatch(
  tenantId: string,
  priority: EventPriority,
  additionalSize: number
): Promise<{ id: string; status: BatchStatus }> {
  const cacheKey = getBatchCacheKey(tenantId, priority);

  // Check cache first
  const cachedBatchId = openBatches.get(cacheKey);
  if (cachedBatchId) {
    // Verify it's still open and has capacity
    const batch = await prisma.eventBatch.findUnique({
      where: { id: cachedBatchId },
      select: {
        id: true,
        status: true,
        currentEvents: true,
        currentSize: true,
        maxEvents: true,
        maxSizeBytes: true,
      },
    });

    if (
      batch &&
      batch.status === 'OPEN' &&
      batch.currentEvents < batch.maxEvents &&
      batch.currentSize + additionalSize <= batch.maxSizeBytes
    ) {
      return { id: batch.id, status: 'OPEN' };
    }

    // Batch is full or closed, remove from cache
    openBatches.delete(cacheKey);
  }

  // Find an existing open batch with capacity
  const existingBatch = await prisma.eventBatch.findFirst({
    where: {
      tenantId,
      priority,
      status: 'OPEN',
      currentEvents: { lt: config.batch.maxEvents },
    },
    select: {
      id: true,
      status: true,
      currentEvents: true,
      currentSize: true,
      maxSizeBytes: true,
    },
  });

  if (
    existingBatch &&
    existingBatch.currentSize + additionalSize <= existingBatch.maxSizeBytes
  ) {
    openBatches.set(cacheKey, existingBatch.id);
    return { id: existingBatch.id, status: 'OPEN' };
  }

  // Create a new batch
  const newBatch = await prisma.eventBatch.create({
    data: {
      tenantId,
      priority,
      status: 'OPEN',
      maxEvents: config.batch.maxEvents,
      maxSizeBytes: config.batch.maxSizeBytes,
    },
    select: { id: true, status: true },
  });

  openBatches.set(cacheKey, newBatch.id);
  return { id: newBatch.id, status: newBatch.status as BatchStatus };
}

/**
 * Increment batch counters atomically.
 */
export async function incrementBatchCounters(
  batchId: string,
  eventCount: number,
  sizeBytes: number
): Promise<void> {
  const batch = await prisma.eventBatch.update({
    where: { id: batchId },
    data: {
      currentEvents: { increment: eventCount },
      currentSize: { increment: sizeBytes },
    },
    select: {
      id: true,
      status: true,
      currentEvents: true,
      currentSize: true,
      maxEvents: true,
      maxSizeBytes: true,
      tenantId: true,
      priority: true,
    },
  });

  // Auto-seal if limits reached
  if (
    batch.currentEvents >= batch.maxEvents ||
    batch.currentSize >= batch.maxSizeBytes
  ) {
    await sealBatch(batchId, batch.currentEvents >= batch.maxEvents ? 'count' : 'size');

    // Clear cache
    if (batch.tenantId) {
      const cacheKey = getBatchCacheKey(batch.tenantId, batch.priority as EventPriority);
      openBatches.delete(cacheKey);
    }
  }
}

/**
 * Seal a batch (no more events can be added).
 */
export async function sealBatch(
  batchId: string,
  reason: string = 'manual'
): Promise<void> {
  await prisma.eventBatch.update({
    where: { id: batchId },
    data: {
      status: 'SEALED',
      sealedAt: new Date(),
      sealReason: reason,
    },
  });
}

/**
 * Seal old batches that have been open too long.
 */
export async function sealStaleBatches(): Promise<number> {
  const maxAge = new Date(Date.now() - config.batch.maxAgeMs);

  const staleBatches = await prisma.eventBatch.findMany({
    where: {
      status: 'OPEN',
      createdAt: { lt: maxAge },
      currentEvents: { gt: 0 }, // Only seal non-empty batches
    },
    select: { id: true, tenantId: true, priority: true },
  });

  for (const batch of staleBatches) {
    await sealBatch(batch.id, 'time');

    // Clear cache
    if (batch.tenantId) {
      const cacheKey = getBatchCacheKey(batch.tenantId, batch.priority as EventPriority);
      openBatches.delete(cacheKey);
    }
  }

  // Also delete empty old batches
  await prisma.eventBatch.deleteMany({
    where: {
      status: 'OPEN',
      createdAt: { lt: maxAge },
      currentEvents: 0,
    },
  });

  return staleBatches.length;
}

/**
 * Get the next batch ready for processing.
 */
export async function getNextBatchForProcessing(
  processorId: string
): Promise<{
  id: string;
  priority: EventPriority;
  eventCount: number;
} | null> {
  // Use a transaction to atomically claim a batch
  const result = await prisma.$transaction(async (tx) => {
    // Find next sealed batch, prioritizing by priority then age
    const batch = await tx.eventBatch.findFirst({
      where: { status: 'SEALED' },
      orderBy: [
        { priority: 'asc' }, // CRITICAL = 0, HIGH = 1, etc.
        { sealedAt: 'asc' }, // Oldest first
      ],
      select: { id: true, priority: true, currentEvents: true },
    });

    if (!batch) {
      return null;
    }

    // Claim the batch
    await tx.eventBatch.update({
      where: { id: batch.id },
      data: {
        status: 'PROCESSING',
        processorId,
        startedAt: new Date(),
      },
    });

    return batch;
  });

  if (!result) {
    return null;
  }

  return {
    id: result.id,
    priority: result.priority as EventPriority,
    eventCount: result.currentEvents,
  };
}

/**
 * Get events for a batch.
 */
export async function getBatchEvents(batchId: string) {
  return prisma.event.findMany({
    where: { batchId },
    orderBy: { receivedAt: 'asc' },
  });
}

/**
 * Mark batch as completed.
 */
export async function completeBatch(
  batchId: string,
  results: {
    processedCount: number;
    failedCount: number;
    skippedCount: number;
  }
) {
  const batch = await prisma.eventBatch.findUnique({
    where: { id: batchId },
    select: { startedAt: true },
  });

  const processingTime = batch?.startedAt
    ? Date.now() - batch.startedAt.getTime()
    : null;

  const status = results.failedCount > 0
    ? (results.processedCount > 0 ? 'PARTIAL' : 'FAILED')
    : 'COMPLETED';

  return prisma.eventBatch.update({
    where: { id: batchId },
    data: {
      status,
      completedAt: new Date(),
      processingTime,
      processedCount: results.processedCount,
      failedCount: results.failedCount,
      skippedCount: results.skippedCount,
    },
  });
}

/**
 * Get batch by ID.
 */
export async function getBatchById(batchId: string) {
  return prisma.eventBatch.findUnique({
    where: { id: batchId },
    include: {
      _count: {
        select: { events: true },
      },
    },
  });
}

/**
 * List batches with filtering.
 */
export async function listBatches(
  tenantId: string | null,
  query: {
    status?: BatchStatus;
    priority?: EventPriority;
    fromDate?: string;
    toDate?: string;
    page?: number;
    pageSize?: number;
  }
): Promise<PaginatedResponse<any>> {
  const {
    status,
    priority,
    fromDate,
    toDate,
    page = 1,
    pageSize = 20,
  } = query;

  const where: any = {};

  if (tenantId) {
    where.tenantId = tenantId;
  }

  if (status) {
    where.status = status;
  }

  if (priority) {
    where.priority = priority;
  }

  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt.gte = new Date(fromDate);
    if (toDate) where.createdAt.lte = new Date(toDate);
  }

  const [data, totalItems] = await Promise.all([
    prisma.eventBatch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: { events: true },
        },
      },
    }),
    prisma.eventBatch.count({ where }),
  ]);

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  };
}

/**
 * Get batch statistics.
 */
export async function getBatchStats(tenantId?: string) {
  const where = tenantId ? { tenantId } : {};

  const [
    total,
    byStatus,
    avgProcessingTime,
    recentBatches,
  ] = await Promise.all([
    prisma.eventBatch.count({ where }),
    prisma.eventBatch.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    }),
    prisma.eventBatch.aggregate({
      where: { ...where, status: 'COMPLETED' },
      _avg: { processingTime: true },
    }),
    prisma.eventBatch.findMany({
      where: { ...where, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        processedCount: true,
        failedCount: true,
        processingTime: true,
        completedAt: true,
      },
    }),
  ]);

  return {
    total,
    byStatus: Object.fromEntries(
      byStatus.map((s) => [s.status, s._count.status])
    ),
    avgProcessingTimeMs: avgProcessingTime._avg.processingTime,
    recentBatches,
  };
}
