/**
 * AIVO Event Collector Service - Processor Service
 *
 * Processes batches of events and routes them to destinations.
 */

import pLimit from 'p-limit';

import { config } from '../config.js';
import { prisma } from '../prisma.js';
import * as batchService from './batchService.js';
import * as routingService from './routingService.js';
import * as deadLetterService from './deadLetterService.js';
import type { ProcessedEvent, BatchProcessingResult } from '../types/index.js';

// Processing state
let isProcessing = false;
let shouldStop = false;

/**
 * Start the batch processor.
 */
export async function startProcessor(): Promise<void> {
  if (isProcessing) {
    console.log('Processor already running');
    return;
  }

  isProcessing = true;
  shouldStop = false;
  console.log(`Starting processor with concurrency ${config.processing.batchConcurrency}`);

  // Start the processing loop
  processingLoop().catch((error) => {
    console.error('Processing loop error:', error);
    isProcessing = false;
  });
}

/**
 * Stop the processor gracefully.
 */
export async function stopProcessor(): Promise<void> {
  console.log('Stopping processor...');
  shouldStop = true;

  // Wait for current processing to complete (with timeout)
  const maxWait = 30000;
  const start = Date.now();

  while (isProcessing && Date.now() - start < maxWait) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (isProcessing) {
    console.warn('Processor did not stop gracefully within timeout');
  } else {
    console.log('Processor stopped');
  }
}

/**
 * Main processing loop.
 */
async function processingLoop(): Promise<void> {
  const limit = pLimit(config.processing.batchConcurrency);

  while (!shouldStop) {
    try {
      // First, seal any stale batches
      const sealedCount = await batchService.sealStaleBatches();
      if (sealedCount > 0) {
        console.log(`Sealed ${sealedCount} stale batches`);
      }

      // Get batches to process
      const batches: Array<{ id: string; priority: string; eventCount: number }> = [];

      for (let i = 0; i < config.processing.batchConcurrency; i++) {
        const batch = await batchService.getNextBatchForProcessing(config.instanceId);
        if (batch) {
          batches.push(batch);
        } else {
          break; // No more batches available
        }
      }

      if (batches.length === 0) {
        // No batches to process, wait before checking again
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      // Process batches concurrently
      await Promise.all(
        batches.map((batch) =>
          limit(async () => {
            try {
              const result = await processBatch(batch.id);
              console.log(
                `Batch ${batch.id}: processed=${result.processedCount}, ` +
                `failed=${result.failedCount}, time=${result.totalTimeMs}ms`
              );
            } catch (error) {
              console.error(`Failed to process batch ${batch.id}:`, error);
            }
          })
        )
      );
    } catch (error) {
      console.error('Error in processing loop:', error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  isProcessing = false;
}

/**
 * Process a single batch.
 */
export async function processBatch(batchId: string): Promise<BatchProcessingResult> {
  const startTime = Date.now();
  const result: BatchProcessingResult = {
    batchId,
    processedCount: 0,
    failedCount: 0,
    skippedCount: 0,
    totalTimeMs: 0,
    errors: [],
  };

  // Get all events in the batch
  const events = await batchService.getBatchEvents(batchId);

  if (events.length === 0) {
    await batchService.completeBatch(batchId, result);
    result.totalTimeMs = Date.now() - startTime;
    return result;
  }

  // Process events with concurrency limit
  const limit = pLimit(config.processing.workerConcurrency);

  const processedEvents = await Promise.all(
    events.map((event) =>
      limit(async (): Promise<ProcessedEvent> => {
        return processEvent(event);
      })
    )
  );

  // Update results
  for (const processed of processedEvents) {
    if (processed.success) {
      result.processedCount++;
    } else if (processed.error === 'skipped') {
      result.skippedCount++;
    } else {
      result.failedCount++;
      result.errors.push({
        eventId: processed.eventId,
        error: processed.error || 'Unknown error',
      });
    }
  }

  // Complete the batch
  await batchService.completeBatch(batchId, result);

  result.totalTimeMs = Date.now() - startTime;
  return result;
}

/**
 * Process a single event.
 */
async function processEvent(event: any): Promise<ProcessedEvent> {
  const startTime = Date.now();
  const result: ProcessedEvent = {
    eventId: event.eventId,
    success: false,
    deliveredTo: [],
    failedDestinations: [],
    processingTimeMs: 0,
  };

  try {
    // Check if event has expired
    if (event.expiresAt && new Date(event.expiresAt) < new Date()) {
      await updateEventStatus(event.id, 'SKIPPED');
      result.error = 'skipped';
      result.processingTimeMs = Date.now() - startTime;
      return result;
    }

    // Mark as processing
    await updateEventStatus(event.id, 'PROCESSING');

    // Get routes for this event
    const routes = await routingService.getRoutesForEvent(
      event.tenantId,
      event.eventType,
      event.sourceService
    );

    // If event has specific destinations, filter routes
    const effectiveRoutes = event.destinations?.length > 0
      ? routes.filter((r) => event.destinations.includes(r.name))
      : routes;

    if (effectiveRoutes.length === 0) {
      // No routes, just mark as processed
      await updateEventStatus(event.id, 'PROCESSED', [], Date.now() - startTime);
      result.success = true;
      result.processingTimeMs = Date.now() - startTime;
      return result;
    }

    // Deliver to each route
    for (const route of effectiveRoutes) {
      try {
        await routingService.deliverEvent(event, route);
        result.deliveredTo.push(route.name);
      } catch (error: any) {
        result.failedDestinations.push(route.name);
        console.error(`Failed to deliver event ${event.eventId} to ${route.name}:`, error);
      }
    }

    // Determine final status
    if (result.failedDestinations.length === 0) {
      await updateEventStatus(
        event.id,
        'PROCESSED',
        result.deliveredTo,
        Date.now() - startTime
      );
      result.success = true;
    } else if (result.deliveredTo.length > 0) {
      // Partial success
      await updateEventStatus(
        event.id,
        'PROCESSED',
        result.deliveredTo,
        Date.now() - startTime,
        `Failed destinations: ${result.failedDestinations.join(', ')}`
      );
      result.success = true;
    } else {
      // Complete failure - check retry
      if (event.retryCount < event.maxRetries) {
        await updateEventForRetry(event.id);
        result.error = 'Will retry';
      } else {
        // Move to dead letter
        await moveToDeadLetter(event, 'Max retries exceeded');
        result.error = 'Moved to dead letter queue';
      }
    }
  } catch (error: any) {
    result.error = error.message;

    if (event.retryCount < event.maxRetries) {
      await updateEventForRetry(event.id);
    } else {
      await moveToDeadLetter(event, error.message);
    }
  }

  result.processingTimeMs = Date.now() - startTime;
  return result;
}

/**
 * Update event status.
 */
async function updateEventStatus(
  eventId: string,
  status: string,
  deliveredTo?: string[],
  processingTime?: number,
  lastError?: string
): Promise<void> {
  await prisma.event.update({
    where: { id: eventId },
    data: {
      status: status as any,
      processedAt: status === 'PROCESSED' ? new Date() : undefined,
      deliveredTo: deliveredTo,
      processingTime,
      lastError,
    },
  });
}

/**
 * Update event for retry.
 */
async function updateEventForRetry(eventId: string): Promise<void> {
  await prisma.event.update({
    where: { id: eventId },
    data: {
      status: 'PENDING',
      retryCount: { increment: 1 },
      batchId: null, // Remove from current batch
    },
  });
}

/**
 * Move event to dead letter queue.
 */
async function moveToDeadLetter(event: any, reason: string): Promise<void> {
  await prisma.$transaction([
    prisma.event.update({
      where: { id: event.id },
      data: {
        status: 'DEAD_LETTER',
        deadLetteredAt: new Date(),
        lastError: reason,
      },
    }),
    prisma.deadLetterEvent.create({
      data: {
        originalEventId: event.id,
        eventId: event.eventId,
        eventType: event.eventType,
        tenantId: event.tenantId,
        payload: event.payload,
        metadata: event.metadata,
        failureReason: reason,
        failedAt: new Date(),
        retryCount: event.retryCount,
      },
    }),
  ]);
}

/**
 * Get processor status.
 */
export function getProcessorStatus() {
  return {
    isRunning: isProcessing,
    instanceId: config.instanceId,
    concurrency: config.processing.batchConcurrency,
    workerConcurrency: config.processing.workerConcurrency,
  };
}

/**
 * Reprocess a specific event.
 */
export async function reprocessEvent(eventId: string): Promise<ProcessedEvent> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error('Event not found');
  }

  // Reset event status
  await prisma.event.update({
    where: { id: eventId },
    data: {
      status: 'PENDING',
      retryCount: 0,
      processedAt: null,
      lastError: null,
    },
  });

  // Get fresh event
  const freshEvent = await prisma.event.findUnique({
    where: { id: eventId },
  });

  return processEvent(freshEvent);
}
