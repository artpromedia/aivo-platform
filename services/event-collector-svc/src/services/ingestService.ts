/**
 * AIVO Event Collector Service - Ingest Service
 *
 * High-throughput event ingestion with deduplication and batching.
 */

import { Redis } from 'ioredis';

import { config } from '../config.js';
import { prisma } from '../prisma.js';
import * as batchService from './batchService.js';
import type {
  IngestEventInput,
  IngestBatchInput,
  IngestResult,
  IngestError,
  EventPriority,
} from '../types/index.js';

let redis: Redis | null = null;

/**
 * Initialize Redis connection.
 */
export function initRedis(redisClient: Redis) {
  redis = redisClient;
}

/**
 * Check if an event is a duplicate using Redis.
 */
async function isDuplicate(eventId: string): Promise<boolean> {
  if (!config.deduplication.enabled || !redis) {
    return false;
  }

  const key = `${config.redis.keyPrefix}dedup:${eventId}`;
  const exists = await redis.exists(key);
  return exists === 1;
}

/**
 * Mark an event as seen for deduplication.
 */
async function markAsSeen(eventId: string): Promise<void> {
  if (!config.deduplication.enabled || !redis) {
    return;
  }

  const key = `${config.redis.keyPrefix}dedup:${eventId}`;
  await redis.setex(key, config.deduplication.windowSeconds, '1');
}

/**
 * Validate a single event.
 */
function validateEvent(event: IngestEventInput): string | null {
  if (!event.eventId || typeof event.eventId !== 'string') {
    return 'eventId is required and must be a string';
  }

  if (!event.eventType || typeof event.eventType !== 'string') {
    return 'eventType is required and must be a string';
  }

  if (!event.payload || typeof event.payload !== 'object') {
    return 'payload is required and must be an object';
  }

  const payloadSize = JSON.stringify(event.payload).length;
  if (payloadSize > config.ingestion.maxEventSizeBytes) {
    return `payload exceeds maximum size of ${config.ingestion.maxEventSizeBytes} bytes`;
  }

  return null;
}

/**
 * Ingest a single event.
 */
export async function ingestEvent(
  tenantId: string,
  sourceService: string,
  input: IngestEventInput
): Promise<{ success: boolean; eventId: string; error?: string }> {
  // Validate
  const validationError = validateEvent(input);
  if (validationError) {
    return { success: false, eventId: input.eventId, error: validationError };
  }

  // Check for duplicate
  if (await isDuplicate(input.eventId)) {
    return { success: false, eventId: input.eventId, error: 'duplicate event' };
  }

  const payloadSize = JSON.stringify(input.payload).length;
  const priority = input.priority || 'NORMAL';

  try {
    // Get or create an open batch
    const batch = await batchService.getOrCreateBatch(tenantId, priority, payloadSize);

    // Create the event
    await prisma.event.create({
      data: {
        eventId: input.eventId,
        eventType: input.eventType,
        eventVersion: input.eventVersion || '1.0',
        tenantId,
        sourceService,
        payload: input.payload,
        payloadSize,
        priority,
        category: input.category,
        status: 'PENDING',
        batchId: batch.id,
        destinations: input.destinations || [],
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        correlationId: input.correlationId,
        causationId: input.causationId,
        sessionId: input.sessionId,
        metadata: input.metadata,
        tags: input.tags || [],
      },
    });

    // Update batch counters
    await batchService.incrementBatchCounters(batch.id, 1, payloadSize);

    // Mark as seen for deduplication
    await markAsSeen(input.eventId);

    return { success: true, eventId: input.eventId };
  } catch (error: any) {
    // Handle unique constraint violation (duplicate in DB)
    if (error.code === 'P2002') {
      return { success: false, eventId: input.eventId, error: 'duplicate event' };
    }
    throw error;
  }
}

/**
 * Ingest a batch of events.
 */
export async function ingestBatch(
  tenantId: string,
  sourceService: string,
  input: IngestBatchInput
): Promise<IngestResult> {
  const result: IngestResult = {
    accepted: 0,
    rejected: 0,
    duplicates: 0,
    errors: [],
  };

  if (input.events.length > config.ingestion.maxEventsPerRequest) {
    throw new Error(
      `Batch size ${input.events.length} exceeds maximum of ${config.ingestion.maxEventsPerRequest}`
    );
  }

  // Process events in parallel with controlled concurrency
  const batchPriority = input.priority || 'NORMAL';

  // Group events by whether they're duplicates
  const duplicateChecks = await Promise.all(
    input.events.map(async (event) => ({
      event,
      isDuplicate: await isDuplicate(event.eventId),
    }))
  );

  const nonDuplicates = duplicateChecks.filter((c) => !c.isDuplicate);
  const duplicates = duplicateChecks.filter((c) => c.isDuplicate);

  result.duplicates = duplicates.length;

  // Validate non-duplicate events
  const validEvents: IngestEventInput[] = [];
  for (const { event } of nonDuplicates) {
    const validationError = validateEvent(event);
    if (validationError) {
      result.rejected++;
      result.errors.push({
        eventId: event.eventId,
        error: validationError,
        code: 'VALIDATION_ERROR',
      });
    } else {
      validEvents.push(event);
    }
  }

  if (validEvents.length === 0) {
    return result;
  }

  // Calculate total payload size
  const totalSize = validEvents.reduce(
    (sum, e) => sum + JSON.stringify(e.payload).length,
    0
  );

  // Get or create batch(es) for these events
  const batch = await batchService.getOrCreateBatch(tenantId, batchPriority, totalSize);

  // Bulk insert events
  try {
    const eventRecords = validEvents.map((event) => ({
      eventId: event.eventId,
      eventType: event.eventType,
      eventVersion: event.eventVersion || '1.0',
      tenantId,
      sourceService,
      payload: event.payload,
      payloadSize: JSON.stringify(event.payload).length,
      priority: event.priority || batchPriority,
      category: event.category,
      status: 'PENDING' as const,
      batchId: batch.id,
      destinations: event.destinations || [],
      occurredAt: event.occurredAt ? new Date(event.occurredAt) : new Date(),
      expiresAt: event.expiresAt ? new Date(event.expiresAt) : null,
      correlationId: event.correlationId,
      causationId: event.causationId,
      sessionId: event.sessionId,
      metadata: event.metadata,
      tags: event.tags || [],
    }));

    await prisma.event.createMany({
      data: eventRecords,
      skipDuplicates: true,
    });

    // Update batch counters
    await batchService.incrementBatchCounters(batch.id, validEvents.length, totalSize);

    // Mark all as seen for deduplication
    await Promise.all(validEvents.map((e) => markAsSeen(e.eventId)));

    result.accepted = validEvents.length;
  } catch (error: any) {
    // If bulk insert fails, try individual inserts
    console.error('Bulk insert failed, falling back to individual inserts:', error);

    for (const event of validEvents) {
      try {
        const singleResult = await ingestEvent(tenantId, sourceService, event);
        if (singleResult.success) {
          result.accepted++;
        } else {
          result.rejected++;
          result.errors.push({
            eventId: event.eventId,
            error: singleResult.error || 'Unknown error',
            code: 'INSERT_ERROR',
          });
        }
      } catch (e: any) {
        result.rejected++;
        result.errors.push({
          eventId: event.eventId,
          error: e.message,
          code: 'INSERT_ERROR',
        });
      }
    }
  }

  return result;
}

/**
 * Get event by ID.
 */
export async function getEventById(tenantId: string, eventId: string) {
  return prisma.event.findFirst({
    where: {
      OR: [
        { id: eventId, tenantId },
        { eventId, tenantId },
      ],
    },
    include: {
      batch: {
        select: { id: true, status: true, batchNumber: true },
      },
    },
  });
}

/**
 * List events with filtering.
 */
export async function listEvents(
  tenantId: string,
  query: {
    eventType?: string;
    status?: string;
    priority?: string;
    fromDate?: string;
    toDate?: string;
    correlationId?: string;
    page?: number;
    pageSize?: number;
  }
) {
  const {
    eventType,
    status,
    priority,
    fromDate,
    toDate,
    correlationId,
    page = 1,
    pageSize = 50,
  } = query;

  const where: any = { tenantId };

  if (eventType) {
    where.eventType = { contains: eventType };
  }

  if (status) {
    where.status = status;
  }

  if (priority) {
    where.priority = priority;
  }

  if (correlationId) {
    where.correlationId = correlationId;
  }

  if (fromDate || toDate) {
    where.receivedAt = {};
    if (fromDate) where.receivedAt.gte = new Date(fromDate);
    if (toDate) where.receivedAt.lte = new Date(toDate);
  }

  const [data, totalItems] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        eventId: true,
        eventType: true,
        tenantId: true,
        status: true,
        priority: true,
        receivedAt: true,
        processedAt: true,
        retryCount: true,
        payloadSize: true,
      },
    }),
    prisma.event.count({ where }),
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
 * Get ingestion statistics.
 */
export async function getIngestionStats(tenantId: string) {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [
    totalEvents,
    recentEvents,
    byStatus,
    byPriority,
  ] = await Promise.all([
    prisma.event.count({ where: { tenantId } }),
    prisma.event.count({
      where: { tenantId, receivedAt: { gte: oneHourAgo } },
    }),
    prisma.event.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { status: true },
    }),
    prisma.event.groupBy({
      by: ['priority'],
      where: { tenantId },
      _count: { priority: true },
    }),
  ]);

  return {
    totalEvents,
    eventsLastHour: recentEvents,
    byStatus: Object.fromEntries(
      byStatus.map((s) => [s.status, s._count.status])
    ),
    byPriority: Object.fromEntries(
      byPriority.map((p) => [p.priority, p._count.priority])
    ),
  };
}
