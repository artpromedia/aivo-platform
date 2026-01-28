/**
 * Data Drift Routes
 * 
 * GET /drift/reports - List drift reports
 * GET /drift/reports/:id - Get drift report details
 * POST /drift/detect - Trigger drift detection
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../prisma.js';

export async function registerDriftRoutes(app: FastifyInstance) {
  // List drift reports
  app.get('/drift/reports', async (request) => {
    const tenantId = (request as any).user?.tenantId || 'system';
    const query = z.object({
      modelId: z.string().uuid().optional(),
      modelVersionId: z.string().uuid().optional(),
      driftDetected: z.enum(['true', 'false']).optional(),
      severity: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      offset: z.coerce.number().int().min(0).default(0),
    }).parse(request.query);

    const where: any = { tenantId };
    if (query.modelId) where.modelId = query.modelId;
    if (query.modelVersionId) where.modelVersionId = query.modelVersionId;
    if (query.driftDetected) where.driftDetected = query.driftDetected === 'true';
    if (query.severity) where.driftSeverity = query.severity;

    const [reports, total] = await Promise.all([
      prisma.dataDriftReport.findMany({
        where,
        take: query.limit,
        skip: query.offset,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.dataDriftReport.count({ where }),
    ]);

    return { reports, total };
  });

  // Get drift report details
  app.get('/drift/reports/:id', async (request) => {
    const tenantId = (request as any).user?.tenantId || 'system';
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    const report = await prisma.dataDriftReport.findUnique({ where: { id } });

    if (!report || report.tenantId !== tenantId) {
      throw { statusCode: 404, message: 'Drift report not found' };
    }

    return report;
  });

  // Trigger drift detection
  app.post('/drift/detect', async (request, reply) => {
    const tenantId = (request as any).user?.tenantId || 'system';
    const body = z.object({
      modelId: z.string().uuid(),
      modelVersionId: z.string().uuid(),
      referenceStart: z.string().datetime(),
      referenceEnd: z.string().datetime(),
      currentStart: z.string().datetime(),
      currentEnd: z.string().datetime(),
    }).parse(request.body);

    // This would typically call a separate service or background job
    // For now, create a placeholder report
    const report = await prisma.dataDriftReport.create({
      data: {
        tenantId,
        modelId: body.modelId,
        modelVersionId: body.modelVersionId,
        referenceStart: new Date(body.referenceStart),
        referenceEnd: new Date(body.referenceEnd),
        currentStart: new Date(body.currentStart),
        currentEnd: new Date(body.currentEnd),
        overallDriftScore: 0.15, // Placeholder
        driftSeverity: 'LOW',
        driftDetected: false,
        testMethod: 'ks_test',
        featureDrift: {},
        referenceStats: {},
        currentStats: {},
        referenceSamples: 1000,
        currentSamples: 1000,
      },
    });

    return reply.status(201).send(report);
  });
}
