/**
 * Prediction Logging Routes
 * 
 * POST /predictions - Log a prediction
 * POST /predictions/batch - Log multiple predictions
 * GET /predictions - List predictions with filtering
 * GET /predictions/:id - Get prediction details
 * POST /predictions/:id/feedback - Add feedback to prediction
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../prisma.js';

const LogPredictionSchema = z.object({
  modelId: z.string().uuid(),
  modelVersionId: z.string().uuid(),
  deploymentId: z.string().uuid().optional(),
  requestId: z.string(),
  userId: z.string().uuid().optional(),
  sessionId: z.string().optional(),
  input: z.record(z.unknown()),
  output: z.record(z.unknown()),
  features: z.record(z.number()).optional(),
  predictionType: z.string(),
  predictedClass: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  probability: z.number().optional(),
  topKPredictions: z.array(z.any()).optional(),
  latencyMs: z.number().int().positive(),
  tokensUsed: z.number().int().optional(),
  status: z.enum(['SUCCESS', 'ERROR', 'TIMEOUT', 'RATE_LIMITED']).default('SUCCESS'),
  errorMessage: z.string().optional(),
  groundTruth: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).default([]),
});

export async function registerPredictionRoutes(app: FastifyInstance) {
  // Log a single prediction
  app.post('/predictions', async (request, reply) => {
    const tenantId = (request as any).user?.tenantId || 'system';
    const body = LogPredictionSchema.parse(request.body);

    // Create input hash for deduplication
    const inputHash = Buffer.from(JSON.stringify(body.input)).toString('base64').substring(0, 64);

    const prediction = await prisma.prediction.create({
      data: {
        tenantId,
        modelId: body.modelId,
        modelVersionId: body.modelVersionId,
        deploymentId: body.deploymentId,
        requestId: body.requestId,
        userId: body.userId,
        sessionId: body.sessionId,
        input: body.input,
        output: body.output,
        inputHash,
        features: body.features,
        predictionType: body.predictionType,
        predictedClass: body.predictedClass,
        confidence: body.confidence,
        probability: body.probability,
        topKPredictions: body.topKPredictions,
        latencyMs: body.latencyMs,
        tokensUsed: body.tokensUsed,
        status: body.status,
        errorMessage: body.errorMessage,
        groundTruth: body.groundTruth,
        isCorrect: body.groundTruth ? computeCorrectness(body.output, body.groundTruth) : undefined,
        metadata: body.metadata,
        tags: body.tags,
      },
    });

    return reply.status(201).send({ id: prediction.id, predictedAt: prediction.predictedAt });
  });

  // Batch log predictions
  app.post('/predictions/batch', async (request, reply) => {
    const tenantId = (request as any).user?.tenantId || 'system';
    const body = z.object({ predictions: z.array(LogPredictionSchema) }).parse(request.body);

    const predictions = await prisma.prediction.createMany({
      data: body.predictions.map(p => ({
        tenantId,
        ...p,
        inputHash: Buffer.from(JSON.stringify(p.input)).toString('base64').substring(0, 64),
        isCorrect: p.groundTruth ? computeCorrectness(p.output, p.groundTruth) : undefined,
      })),
    });

    return reply.status(201).send({ count: predictions.count });
  });

  // List predictions
  app.get('/predictions', async (request) => {
    const tenantId = (request as any).user?.tenantId || 'system';
    const query = z.object({
      modelId: z.string().uuid().optional(),
      modelVersionId: z.string().uuid().optional(),
      deploymentId: z.string().uuid().optional(),
      status: z.enum(['SUCCESS', 'ERROR', 'TIMEOUT', 'RATE_LIMITED']).optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      limit: z.coerce.number().int().min(1).max(1000).default(100),
      offset: z.coerce.number().int().min(0).default(0),
    }).parse(request.query);

    const where: any = { tenantId };
    if (query.modelId) where.modelId = query.modelId;
    if (query.modelVersionId) where.modelVersionId = query.modelVersionId;
    if (query.deploymentId) where.deploymentId = query.deploymentId;
    if (query.status) where.status = query.status;
    if (query.startDate || query.endDate) {
      where.predictedAt = {};
      if (query.startDate) where.predictedAt.gte = new Date(query.startDate);
      if (query.endDate) where.predictedAt.lte = new Date(query.endDate);
    }

    const [predictions, total] = await Promise.all([
      prisma.prediction.findMany({
        where,
        take: query.limit,
        skip: query.offset,
        orderBy: { predictedAt: 'desc' },
        select: {
          id: true,
          modelId: true,
          modelVersionId: true,
          requestId: true,
          predictionType: true,
          confidence: true,
          latencyMs: true,
          status: true,
          isCorrect: true,
          predictedAt: true,
        },
      }),
      prisma.prediction.count({ where }),
    ]);

    return { predictions, total, limit: query.limit, offset: query.offset };
  });

  // Get prediction details
  app.get('/predictions/:id', async (request) => {
    const tenantId = (request as any).user?.tenantId || 'system';
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    const prediction = await prisma.prediction.findUnique({
      where: { id },
      include: { feedback: true },
    });

    if (!prediction || prediction.tenantId !== tenantId) {
      throw { statusCode: 404, message: 'Prediction not found' };
    }

    return prediction;
  });

  // Add feedback to prediction
  app.post('/predictions/:id/feedback', async (request, reply) => {
    const tenantId = (request as any).user?.tenantId || 'system';
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z.object({
      feedbackType: z.enum(['THUMBS_UP', 'THUMBS_DOWN', 'RATING', 'CORRECT', 'INCORRECT', 'CUSTOM']),
      rating: z.number().int().min(1).max(5).optional(),
      isCorrect: z.boolean().optional(),
      correctValue: z.record(z.unknown()).optional(),
      comment: z.string().optional(),
    }).parse(request.body);

    const prediction = await prisma.prediction.findUnique({ where: { id } });
    if (!prediction || prediction.tenantId !== tenantId) {
      throw { statusCode: 404, message: 'Prediction not found' };
    }

    const feedback = await prisma.predictionFeedback.create({
      data: {
        predictionId: id,
        tenantId,
        feedbackType: body.feedbackType,
        rating: body.rating,
        isCorrect: body.isCorrect,
        correctValue: body.correctValue,
        comment: body.comment,
        userId: (request as any).user?.userId,
      },
    });

    return reply.status(201).send(feedback);
  });
}

function computeCorrectness(output: any, groundTruth: any): boolean | undefined {
  // Simple comparison - can be extended for complex cases
  if (typeof output === 'object' && typeof groundTruth === 'object') {
    return JSON.stringify(output) === JSON.stringify(groundTruth);
  }
  return output === groundTruth;
}
