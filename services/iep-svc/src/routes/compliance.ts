/**
 * AIVO IEP Service - Compliance Routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import * as iepService from '../services/iepService.js';

export default async function complianceRoutes(fastify: FastifyInstance): Promise<void> {
  // Get compliance alerts
  fastify.get('/alerts', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const result = await iepService.getComplianceAlerts(tenantId, request.query);
    return reply.send(result);
  });

  // Run compliance check
  fastify.post('/check', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const alerts = await iepService.checkCompliance(tenantId);
    return reply.send({ newAlerts: alerts.length, alerts });
  });
}
