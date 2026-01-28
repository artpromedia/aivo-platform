/**
 * Alert Routes
 * 
 * GET /alerts - List alerts
 * GET /alerts/:id - Get alert details
 * PATCH /alerts/:id/acknowledge - Acknowledge alert
 * PATCH /alerts/:id/resolve - Resolve alert
 * 
 * GET /alerts/rules - List alert rules
 * POST /alerts/rules - Create alert rule
 * GET /alerts/rules/:id - Get alert rule
 * PATCH /alerts/rules/:id - Update alert rule
 * DELETE /alerts/rules/:id - Delete alert rule
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../prisma.js';

export async function registerAlertsRoutes(app: FastifyInstance) {
  // List alerts
  app.get('/alerts', async (request) => {
    const tenantId = (request as any).user?.tenantId || 'system';
    const query = z.object({
      status: z.enum(['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'SUPPRESSED']).optional(),
      severity: z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']).optional(),
      modelId: z.string().uuid().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50),
      offset: z.coerce.number().int().min(0).default(0),
    }).parse(request.query);

    const where: any = { tenantId };
    if (query.status) where.status = query.status;
    if (query.severity) where.severity = query.severity;
    if (query.modelId) where.modelId = query.modelId;

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        take: query.limit,
        skip: query.offset,
        orderBy: { triggeredAt: 'desc' },
        include: { rule: { select: { name: true } } },
      }),
      prisma.alert.count({ where }),
    ]);

    return { alerts, total };
  });

  // Acknowledge alert
  app.patch('/alerts/:id/acknowledge', async (request) => {
    const tenantId = (request as any).user?.tenantId || 'system';
    const userId = (request as any).user?.userId;
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    const alert = await prisma.alert.update({
      where: { id, tenantId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
      },
    });

    return alert;
  });

  // Resolve alert
  app.patch('/alerts/:id/resolve', async (request) => {
    const tenantId = (request as any).user?.tenantId || 'system';
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z.object({ notes: z.string().optional() }).parse(request.body);

    const alert = await prisma.alert.update({
      where: { id, tenantId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolutionNotes: body.notes,
      },
    });

    return alert;
  });

  // List alert rules
  app.get('/alerts/rules', async (request) => {
    const tenantId = (request as any).user?.tenantId || 'system';
    const query = z.object({
      modelId: z.string().uuid().optional(),
      isEnabled: z.enum(['true', 'false']).optional(),
    }).parse(request.query);

    const where: any = { tenantId };
    if (query.modelId) where.modelId = query.modelId;
    if (query.isEnabled !== undefined) where.isEnabled = query.isEnabled === 'true';

    const rules = await prisma.alertRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { alerts: true },
        },
      },
    });

    return { rules, count: rules.length };
  });

  // Create alert rule
  app.post('/alerts/rules', async (request, reply) => {
    const tenantId = (request as any).user?.tenantId || 'system';
    const userId = (request as any).user?.userId;
    const body = z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      modelId: z.string().uuid().optional(),
      modelVersionId: z.string().uuid().optional(),
      deploymentId: z.string().uuid().optional(),
      metricName: z.string(),
      operator: z.enum(['gt', 'lt', 'gte', 'lte', 'eq']),
      threshold: z.number(),
      windowDuration: z.number().int().positive(),
      minSamples: z.number().int().positive().default(10),
      severity: z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']).default('WARNING'),
      notifyChannels: z.array(z.string()).default([]),
      webhookUrl: z.string().url().optional(),
      emailRecipients: z.array(z.string().email()).default([]),
      slackChannel: z.string().optional(),
      tags: z.array(z.string()).default([]),
    }).parse(request.body);

    const rule = await prisma.alertRule.create({
      data: {
        ...body,
        tenantId,
        createdBy: userId,
      },
    });

    return reply.status(201).send(rule);
  });
}
