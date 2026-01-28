/**
 * A/B Test Routes
 * 
 * GET /ab-tests - List A/B tests
 * POST /ab-tests - Create A/B test
 * GET /ab-tests/:id - Get A/B test details
 * PATCH /ab-tests/:id/start - Start test
 * PATCH /ab-tests/:id/pause - Pause test
 * PATCH /ab-tests/:id/complete - Complete test
 * GET /ab-tests/:id/results - Get test results
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../prisma.js';

export async function registerABTestRoutes(app: FastifyInstance) {
  // List A/B tests
  app.get('/ab-tests', async (request) => {
    const tenantId = (request as any).user?.tenantId || 'system';
    const query = z.object({
      status: z.enum(['draft', 'running', 'paused', 'completed']).optional(),
    }).parse(request.query);

    const where: any = { tenantId };
    if (query.status) where.status = query.status;

    const tests = await prisma.aBTest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        variants: true,
      },
    });

    return { tests, count: tests.length };
  });

  // Create A/B test
  app.post('/ab-tests', async (request, reply) => {
    const tenantId = (request as any).user?.tenantId || 'system';
    const userId = (request as any).user?.userId;
    const body = z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      hypothesis: z.string().optional(),
      primaryMetric: z.string(),
      secondaryMetrics: z.array(z.string()).default([]),
      confidenceLevel: z.number().min(0.8).max(0.99).default(0.95),
      minSampleSize: z.number().int().positive().default(1000),
      variants: z.array(z.object({
        name: z.string(),
        description: z.string().optional(),
        isControl: z.boolean().default(false),
        modelVersionId: z.string().uuid(),
        deploymentId: z.string().uuid().optional(),
        trafficPercent: z.number().min(0).max(100),
      })).min(2),
    }).parse(request.body);

    // Validate traffic split adds to 100
    const totalTraffic = body.variants.reduce((sum, v) => sum + v.trafficPercent, 0);
    if (Math.abs(totalTraffic - 100) > 0.01) {
      throw { statusCode: 400, message: 'Traffic split must add up to 100%' };
    }

    const test = await prisma.aBTest.create({
      data: {
        tenantId,
        name: body.name,
        description: body.description,
        hypothesis: body.hypothesis,
        primaryMetric: body.primaryMetric,
        secondaryMetrics: body.secondaryMetrics,
        trafficSplit: body.variants.reduce((acc, v) => ({ ...acc, [v.name]: v.trafficPercent }), {}),
        confidenceLevel: body.confidenceLevel,
        minSampleSize: body.minSampleSize,
        createdBy: userId,
        variants: {
          create: body.variants.map(v => ({
            tenantId,
            name: v.name,
            description: v.description,
            isControl: v.isControl,
            modelVersionId: v.modelVersionId,
            deploymentId: v.deploymentId,
            trafficPercent: v.trafficPercent,
          })),
        },
      },
      include: { variants: true },
    });

    return reply.status(201).send(test);
  });

  // Get A/B test results
  app.get('/ab-tests/:id/results', async (request) => {
    const tenantId = (request as any).user?.tenantId || 'system';
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    const test = await prisma.aBTest.findUnique({
      where: { id, tenantId },
      include: { variants: true },
    });

    if (!test) {
      throw { statusCode: 404, message: 'A/B test not found' };
    }

    // Calculate results for each variant
    // This would typically aggregate from predictions table
    // For now, return the test with current variant stats

    return test;
  });

  // Start A/B test
  app.patch('/ab-tests/:id/start', async (request) => {
    const tenantId = (request as any).user?.tenantId || 'system';
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    const test = await prisma.aBTest.update({
      where: { id, tenantId },
      data: {
        status: 'running',
        startedAt: new Date(),
      },
    });

    return test;
  });
}
