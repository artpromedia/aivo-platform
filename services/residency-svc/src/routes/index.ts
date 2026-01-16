/**
 * AIVO Residency Service - Routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as residencyService from '../services/residencyService.js';

export default async function routes(fastify: FastifyInstance): Promise<void> {
  // Dashboard
  fastify.get('/dashboard', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    return reply.send(await residencyService.getDashboard(tenantId));
  });

  // Regions
  fastify.get('/regions', async (req: FastifyRequest, reply: FastifyReply) => {
    return reply.send(await residencyService.listRegions(req.query));
  });

  fastify.get('/regions/:regionId', async (req: FastifyRequest, reply: FastifyReply) => {
    const { regionId } = req.params as { regionId: string };
    const region = await residencyService.getRegion(regionId);
    if (!region) return reply.status(404).send({ error: 'Region not found' });
    return reply.send(region);
  });

  // Classifications
  fastify.get('/classifications', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    return reply.send(await residencyService.listClassifications(tenantId));
  });

  fastify.post('/classifications', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const classification = await residencyService.createClassification(tenantId, req.body);
    return reply.status(201).send(classification);
  });

  // Policies
  fastify.get('/policies', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    return reply.send(await residencyService.listPolicies(tenantId, req.query));
  });

  fastify.post('/policies', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const policy = await residencyService.createPolicy(tenantId, userId, req.body);
    return reply.status(201).send(policy);
  });

  fastify.get('/policies/:policyId', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const { policyId } = req.params as { policyId: string };
    const policy = await residencyService.getPolicy(tenantId, policyId);
    if (!policy) return reply.status(404).send({ error: 'Policy not found' });
    return reply.send(policy);
  });

  fastify.put('/policies/:policyId', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { policyId } = req.params as { policyId: string };
    const policy = await residencyService.updatePolicy(tenantId, policyId, userId, req.body);
    return reply.send(policy);
  });

  // Routing Rules
  fastify.post('/routing-rules', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const rule = await residencyService.createRoutingRule(tenantId, req.body);
    return reply.status(201).send(rule);
  });

  fastify.get('/routing/resolve', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const { dataType, serviceName } = req.query as { dataType: string; serviceName?: string };
    const region = await residencyService.getTargetRegion(tenantId, dataType, serviceName);
    return reply.send({ targetRegion: region });
  });

  // Data Locations
  fastify.post('/data-locations', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const location = await residencyService.recordDataLocation(tenantId, req.body);
    return reply.status(201).send(location);
  });

  fastify.get('/data-locations/:dataId', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const { dataId } = req.params as { dataId: string };
    return reply.send(await residencyService.getDataLocations(tenantId, dataId));
  });

  fastify.get('/regions/:regionId/data', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const { regionId } = req.params as { regionId: string };
    return reply.send(await residencyService.listDataByRegion(tenantId, regionId, req.query));
  });

  // Cross-Border Transfers
  fastify.get('/transfers', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    return reply.send(await residencyService.listTransfers(tenantId, req.query));
  });

  fastify.post('/transfers', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    try {
      const transfer = await residencyService.requestTransfer(tenantId, userId, req.body);
      return reply.status(201).send(transfer);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  fastify.post('/transfers/:transferId/approve', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { transferId } = req.params as { transferId: string };
    const { approved, notes } = req.body as { approved: boolean; notes?: string };
    const transfer = await residencyService.approveTransfer(tenantId, transferId, userId, approved, notes);
    return reply.send(transfer);
  });

  fastify.post('/transfers/:transferId/complete', async (req: FastifyRequest, reply: FastifyReply) => {
    const { transferId } = req.params as { transferId: string };
    const transfer = await residencyService.completeTransfer(transferId);
    return reply.send(transfer);
  });

  // Compliance
  fastify.get('/compliance', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    return reply.send(await residencyService.listComplianceChecks(tenantId, req.query));
  });

  fastify.post('/compliance/check', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { checkType, scope } = req.body as { checkType: string; scope?: string };
    const check = await residencyService.runComplianceCheck(tenantId, userId, checkType, scope);
    return reply.status(201).send(check);
  });

  // Audit Log
  fastify.get('/audit-log', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    return reply.send(await residencyService.getAuditLog(tenantId, req.query));
  });
}
