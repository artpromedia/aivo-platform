/**
 * AIVO IEP Service - Compliance Routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { getComplianceCronScheduler } from '../services/compliance-cron.js';
import * as iepService from '../services/iepService.js';

export default async function complianceRoutes(fastify: FastifyInstance): Promise<void> {
  // Get compliance alerts
  fastify.get('/alerts', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const result = await iepService.getComplianceAlerts(tenantId, request.query);
    return reply.send(result);
  });

  // Run compliance check (single tenant)
  fastify.post('/check', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const alerts = await iepService.checkCompliance(tenantId);
    return reply.send({ newAlerts: alerts.length, alerts });
  });

  // Run compliance check across ALL tenants (admin / manual trigger)
  fastify.post('/check-all', async (_request: FastifyRequest, reply: FastifyReply) => {
    const scheduler = getComplianceCronScheduler();
    if (!scheduler) {
      return reply.status(503).send({ error: 'Compliance cron scheduler not initialised' });
    }
    const result = await scheduler.runDailyCheck();
    return reply.send(result);
  });
}
