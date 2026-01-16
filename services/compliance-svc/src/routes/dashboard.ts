/**
 * AIVO Compliance Service - Dashboard Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import * as dashboardService from '../services/dashboardService.js';

const TrendQuerySchema = z.object({
  framework: z.enum([
    'FERPA', 'COPPA', 'GDPR', 'CCPA', 'SOC2', 'HIPAA',
    'PCI_DSS', 'ISO27001', 'NIST_CSF', 'CIPA', 'IDEA', 'CUSTOM',
  ]).optional(),
  days: z.coerce.number().int().min(7).max(365).default(90),
});

export async function registerDashboardRoutes(fastify: FastifyInstance) {
  /**
   * GET /dashboard - Get compliance dashboard summary
   */
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const summary = await dashboardService.getDashboardSummary(request.tenantId);
      return reply.status(200).send(summary);
    } catch (error) {
      request.log.error({ error }, 'Failed to get dashboard');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * GET /dashboard/trend - Get compliance trend over time
   */
  fastify.get('/trend', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parseResult = TrendQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.errors,
      });
    }

    try {
      const trend = await dashboardService.getComplianceTrend(
        request.tenantId,
        parseResult.data.framework as any,
        parseResult.data.days
      );

      return reply.status(200).send({ data: trend });
    } catch (error) {
      request.log.error({ error }, 'Failed to get compliance trend');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * POST /dashboard/snapshot - Take a compliance snapshot
   */
  fastify.post('/snapshot', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const result = await dashboardService.takeSnapshot(request.tenantId);
      return reply.status(201).send(result);
    } catch (error) {
      request.log.error({ error }, 'Failed to take snapshot');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * GET /dashboard/alerts - Get compliance alerts
   */
  fastify.get('/alerts', async (request: FastifyRequest<{
    Querystring: { all?: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const unreadOnly = request.query.all !== 'true';
      const alerts = await dashboardService.getAlerts(request.tenantId, unreadOnly);
      return reply.status(200).send({ data: alerts });
    } catch (error) {
      request.log.error({ error }, 'Failed to get alerts');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * POST /dashboard/alerts/:alertId/read - Mark alert as read
   */
  fastify.post('/alerts/:alertId/read', async (request: FastifyRequest<{
    Params: { alertId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId || !request.user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const alert = await dashboardService.markAlertRead(
        request.tenantId,
        request.params.alertId,
        request.user.sub
      );

      return reply.status(200).send(alert);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.status(404).send({ error: 'Alert not found' });
      }
      request.log.error({ error }, 'Failed to mark alert read');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * POST /dashboard/alerts/:alertId/dismiss - Dismiss an alert
   */
  fastify.post('/alerts/:alertId/dismiss', async (request: FastifyRequest<{
    Params: { alertId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId || !request.user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const alert = await dashboardService.dismissAlert(
        request.tenantId,
        request.params.alertId,
        request.user.sub
      );

      return reply.status(200).send(alert);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.status(404).send({ error: 'Alert not found' });
      }
      request.log.error({ error }, 'Failed to dismiss alert');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}
