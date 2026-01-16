/**
 * AIVO Event Collector Service - Batch Routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { prisma } from '../prisma.js';
import * as batchService from '../services/batchService.js';
import * as processorService from '../services/processorService.js';
import type { ListBatchesQuery, PaginatedResponse } from '../types/index.js';

export default async function batchRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /batches - List batches
   */
  fastify.get('/', {
    schema: {
      description: 'List event batches',
      tags: ['Batches'],
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          priority: { type: 'string' },
          fromDate: { type: 'string' },
          toDate: { type: 'string' },
          page: { type: 'number', default: 1 },
          pageSize: { type: 'number', default: 20 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const query = request.query as ListBatchesQuery;

    const {
      status,
      priority,
      fromDate,
      toDate,
      page = 1,
      pageSize = 20,
    } = query;

    const where = {
      tenantId,
      ...(status && { status }),
      ...(priority && { priority }),
      ...(fromDate || toDate ? {
        createdAt: {
          ...(fromDate && { gte: new Date(fromDate) }),
          ...(toDate && { lte: new Date(toDate) }),
        },
      } : {}),
    };

    const skip = (page - 1) * pageSize;

    const [batches, totalItems] = await Promise.all([
      prisma.eventBatch.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          status: true,
          priority: true,
          eventCount: true,
          processedCount: true,
          failedCount: true,
          processingTimeMs: true,
          processorId: true,
          createdAt: true,
          sealedAt: true,
          startedAt: true,
          completedAt: true,
        },
      }),
      prisma.eventBatch.count({ where }),
    ]);

    const response: PaginatedResponse<typeof batches[0]> = {
      data: batches,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };

    return reply.send(response);
  });

  /**
   * GET /batches/:batchId - Get batch details
   */
  fastify.get('/:batchId', {
    schema: {
      description: 'Get batch details',
      tags: ['Batches'],
      params: {
        type: 'object',
        properties: {
          batchId: { type: 'string' },
        },
        required: ['batchId'],
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { batchId } = request.params as { batchId: string };

    const batch = await prisma.eventBatch.findFirst({
      where: { id: batchId, tenantId },
      include: {
        events: {
          select: {
            id: true,
            eventId: true,
            eventType: true,
            status: true,
            priority: true,
            processingTime: true,
            retryCount: true,
            lastError: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!batch) {
      return reply.status(404).send({ error: 'Batch not found' });
    }

    return reply.send(batch);
  });

  /**
   * POST /batches/:batchId/reprocess - Reprocess a batch
   */
  fastify.post('/:batchId/reprocess', {
    schema: {
      description: 'Reprocess all events in a batch',
      tags: ['Batches'],
      params: {
        type: 'object',
        properties: {
          batchId: { type: 'string' },
        },
        required: ['batchId'],
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { batchId } = request.params as { batchId: string };

    const batch = await prisma.eventBatch.findFirst({
      where: { id: batchId, tenantId },
    });

    if (!batch) {
      return reply.status(404).send({ error: 'Batch not found' });
    }

    // Reset the batch for reprocessing
    await prisma.$transaction([
      prisma.eventBatch.update({
        where: { id: batchId },
        data: {
          status: 'SEALED',
          processorId: null,
          processedCount: 0,
          failedCount: 0,
          startedAt: null,
          completedAt: null,
          processingTimeMs: null,
        },
      }),
      prisma.event.updateMany({
        where: { batchId },
        data: {
          status: 'PENDING',
          processedAt: null,
          lastError: null,
        },
      }),
    ]);

    // Process the batch immediately
    const result = await processorService.processBatch(batchId);

    return reply.send({
      batchId,
      processedCount: result.processedCount,
      failedCount: result.failedCount,
      skippedCount: result.skippedCount,
      totalTimeMs: result.totalTimeMs,
    });
  });

  /**
   * GET /batches/stats - Get batch statistics
   */
  fastify.get('/stats', {
    schema: {
      description: 'Get batch processing statistics',
      tags: ['Batches'],
      querystring: {
        type: 'object',
        properties: {
          hours: { type: 'number', default: 24 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { hours = 24 } = request.query as { hours?: number };

    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [statusCounts, completedBatches, totalEvents] = await Promise.all([
      prisma.eventBatch.groupBy({
        by: ['status'],
        where: { tenantId, createdAt: { gte: since } },
        _count: { status: true },
      }),
      prisma.eventBatch.findMany({
        where: {
          tenantId,
          completedAt: { gte: since },
          processingTimeMs: { not: null },
        },
        select: {
          eventCount: true,
          processedCount: true,
          failedCount: true,
          processingTimeMs: true,
        },
      }),
      prisma.event.count({
        where: { tenantId, createdAt: { gte: since } },
      }),
    ]);

    const avgProcessingTime = completedBatches.length > 0
      ? completedBatches.reduce((sum, b) => sum + (b.processingTimeMs || 0), 0) / completedBatches.length
      : 0;

    const totalProcessed = completedBatches.reduce((sum, b) => sum + b.processedCount, 0);
    const totalFailed = completedBatches.reduce((sum, b) => sum + b.failedCount, 0);

    return reply.send({
      byStatus: Object.fromEntries(statusCounts.map((s) => [s.status, s._count.status])),
      completedBatches: completedBatches.length,
      totalEvents,
      totalProcessed,
      totalFailed,
      successRate: totalProcessed + totalFailed > 0
        ? ((totalProcessed / (totalProcessed + totalFailed)) * 100).toFixed(2)
        : 100,
      avgProcessingTimeMs: Math.round(avgProcessingTime),
      period: { hours, since: since.toISOString() },
    });
  });

  /**
   * POST /batches/seal-stale - Manually seal stale batches
   */
  fastify.post('/seal-stale', {
    schema: {
      description: 'Manually trigger sealing of stale batches',
      tags: ['Batches'],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const sealedCount = await batchService.sealStaleBatches();

    return reply.send({
      success: true,
      sealedCount,
      message: `Sealed ${sealedCount} stale batches`,
    });
  });

  /**
   * GET /batches/processor/status - Get processor status
   */
  fastify.get('/processor/status', {
    schema: {
      description: 'Get batch processor status',
      tags: ['Batches'],
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const status = processorService.getProcessorStatus();
    return reply.send(status);
  });
}
