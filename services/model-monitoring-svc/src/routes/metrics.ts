/**
 * Metrics Routes
 * 
 * GET /metrics/performance - Get time-series performance metrics
 * GET /metrics/feature-importance - Get feature importance over time
 * POST /metrics/aggregate - Trigger metrics aggregation
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../prisma.js';

export async function registerMetricsRoutes(app: FastifyInstance) {
  // Get performance metrics
  app.get('/metrics/performance', async (request) => {
    const tenantId = (request as any).user?.tenantId || 'system';
    const query = z.object({
      modelId: z.string().uuid().optional(),
      modelVersionId: z.string().uuid().optional(),
      deploymentId: z.string().uuid().optional(),
      granularity: z.enum(['hour', 'day', 'week', 'month']).default('hour'),
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
    }).parse(request.query);

    const where: any = {
      tenantId,
      granularity: query.granularity,
      windowStart: {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      },
    };
    if (query.modelId) where.modelId = query.modelId;
    if (query.modelVersionId) where.modelVersionId = query.modelVersionId;
    if (query.deploymentId) where.deploymentId = query.deploymentId;

    const metrics = await prisma.modelPerformanceMetric.findMany({
      where,
      orderBy: { windowStart: 'asc' },
    });

    return { metrics, count: metrics.length };
  });

  // Get feature importance
  app.get('/metrics/feature-importance', async (request) => {
    const tenantId = (request as any).user?.tenantId || 'system';
    const query = z.object({
      modelId: z.string().uuid().optional(),
      modelVersionId: z.string().uuid(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      topN: z.coerce.number().int().min(1).max(100).default(20),
    }).parse(request.query);

    const where: any = {
      tenantId,
      modelVersionId: query.modelVersionId,
    };
    if (query.startDate || query.endDate) {
      where.calculatedAt = {};
      if (query.startDate) where.calculatedAt.gte = new Date(query.startDate);
      if (query.endDate) where.calculatedAt.lte = new Date(query.endDate);
    }

    const features = await prisma.featureImportance.findMany({
      where,
      orderBy: [{ calculatedAt: 'desc' }, { rank: 'asc' }],
      take: query.topN,
    });

    return { features, count: features.length };
  });

  // Trigger metrics aggregation (internal endpoint)
  app.post('/metrics/aggregate', async (request, reply) => {
    const body = z.object({
      modelVersionId: z.string().uuid(),
      windowStart: z.string().datetime(),
      windowEnd: z.string().datetime(),
      granularity: z.enum(['hour', 'day', 'week', 'month']),
    }).parse(request.body);

    // This would typically be called by a background job
    // Aggregate predictions into metrics for the specified window
    const windowStart = new Date(body.windowStart);
    const windowEnd = new Date(body.windowEnd);

    const predictions = await prisma.prediction.findMany({
      where: {
        modelVersionId: body.modelVersionId,
        predictedAt: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
      select: {
        status: true,
        latencyMs: true,
        confidence: true,
        isCorrect: true,
        tokensUsed: true,
        feedback: {
          select: {
            feedbackType: true,
            rating: true,
          },
        },
      },
    });

    // Calculate aggregate metrics
    const totalPredictions = predictions.length;
    const successfulPredictions = predictions.filter(p => p.status === 'SUCCESS').length;
    const failedPredictions = predictions.filter(p => p.status === 'ERROR').length;
    const timeoutPredictions = predictions.filter(p => p.status === 'TIMEOUT').length;

    const correctPredictions = predictions.filter(p => p.isCorrect === true).length;
    const accuracy = correctPredictions / totalPredictions || undefined;

    const latencies = predictions.map(p => p.latencyMs).sort((a, b) => a - b);
    const avgLatencyMs = latencies.reduce((sum, l) => sum + l, 0) / latencies.length || undefined;
    const p50LatencyMs = latencies[Math.floor(latencies.length * 0.5)] || undefined;
    const p95LatencyMs = latencies[Math.floor(latencies.length * 0.95)] || undefined;
    const p99LatencyMs = latencies[Math.floor(latencies.length * 0.99)] || undefined;

    const confidences = predictions.map(p => p.confidence).filter(c => c !== null) as number[];
    const avgConfidence = confidences.length ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length : undefined;

    // Create metric record
    const metric = await prisma.modelPerformanceMetric.create({
      data: {
        tenantId: (request as any).user?.tenantId || 'system',
        modelId: '', // Would need to fetch from modelVersion
        modelVersionId: body.modelVersionId,
        windowStart,
        windowEnd,
        windowDuration: Math.floor((windowEnd.getTime() - windowStart.getTime()) / 1000),
        granularity: body.granularity,
        totalPredictions,
        successfulPredictions,
        failedPredictions,
        timeoutPredictions,
        accuracy,
        avgLatencyMs,
        p50LatencyMs,
        p95LatencyMs,
        p99LatencyMs,
        avgConfidence,
      },
    });

    return reply.status(201).send(metric);
  });
}
