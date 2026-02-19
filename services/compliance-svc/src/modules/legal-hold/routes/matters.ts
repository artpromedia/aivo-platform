/**
 * AIVO Compliance Service - Legal Hold Module – Matter Routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import * as matterService from '../services/matterService.js';

const CreateMatterSchema = z.object({
  matterNumber: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  matterType: z.enum(['LITIGATION', 'REGULATORY', 'INVESTIGATION', 'AUDIT', 'ARBITRATION', 'COMPLIANCE', 'OTHER']),
  anticipatedEnd: z.string().optional(),
  leadCounsel: z.string().optional(),
  outsideCounsel: z.string().optional(),
  paralegal: z.string().optional(),
  jurisdiction: z.string().optional(),
  caseNumber: z.string().optional(),
  opposingParty: z.string().optional(),
  claimAmount: z.number().optional(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  riskNotes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const UpdateMatterSchema = CreateMatterSchema.partial().extend({
  status: z.enum(['ACTIVE', 'ON_HOLD', 'SETTLED', 'CLOSED', 'ARCHIVED']).optional(),
});

export default async function matterRoutes(fastify: FastifyInstance): Promise<void> {
  // List matters
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const query = request.query as any;
    const result = await matterService.listMatters(tenantId, query);
    return reply.send(result);
  });

  // Get dashboard
  fastify.get('/dashboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const dashboard = await matterService.getMatterDashboard(tenantId);
    return reply.send(dashboard);
  });

  // Create matter
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const userId = (request as any).userId;

    const parsed = CreateMatterSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.errors });
    }

    try {
      const matter = await matterService.createMatter(tenantId, userId, parsed.data as any);
      return reply.status(201).send(matter);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(409).send({ error: 'Matter number already exists' });
      }
      throw error;
    }
  });

  // Get matter
  fastify.get('/:matterId', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { matterId } = request.params as { matterId: string };

    const matter = await matterService.getMatter(tenantId, matterId);
    if (!matter) {
      return reply.status(404).send({ error: 'Matter not found' });
    }
    return reply.send(matter);
  });

  // Update matter
  fastify.put('/:matterId', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const userId = (request as any).userId;
    const { matterId } = request.params as { matterId: string };

    const parsed = UpdateMatterSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.errors });
    }

    try {
      const matter = await matterService.updateMatter(tenantId, matterId, userId, parsed.data);
      return reply.send(matter);
    } catch (error: any) {
      if (error.message === 'Matter not found') {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  });

  // Close matter
  fastify.post('/:matterId/close', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const userId = (request as any).userId;
    const { matterId } = request.params as { matterId: string };
    const { reason } = (request.body as any) || {};

    try {
      const matter = await matterService.closeMatter(tenantId, matterId, userId, reason);
      return reply.send(matter);
    } catch (error: any) {
      if (error.message === 'Matter not found') {
        return reply.status(404).send({ error: error.message });
      }
      if (error.message.includes('active holds')) {
        return reply.status(409).send({ error: error.message });
      }
      throw error;
    }
  });

  // Get matter summary
  fastify.get('/:matterId/summary', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { matterId } = request.params as { matterId: string };

    const summary = await matterService.getMatterSummary(tenantId, matterId);
    if (!summary) {
      return reply.status(404).send({ error: 'Matter not found' });
    }
    return reply.send(summary);
  });

  // Get matter activity
  fastify.get('/:matterId/activity', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { matterId } = request.params as { matterId: string };
    const { page, pageSize } = request.query as any;

    try {
      const activity = await matterService.getMatterActivity(tenantId, matterId, { page, pageSize });
      return reply.send(activity);
    } catch (error: any) {
      if (error.message === 'Matter not found') {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  });

  // Add custodian to matter
  fastify.post('/:matterId/custodians', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const userId = (request as any).userId;
    const { matterId } = request.params as { matterId: string };
    const { custodianId, role, relevance, notes } = request.body as any;

    if (!custodianId) {
      return reply.status(400).send({ error: 'custodianId is required' });
    }

    try {
      const result = await matterService.addCustodianToMatter(tenantId, matterId, custodianId, userId, {
        role, relevance, notes,
      });
      return reply.status(201).send(result);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  });

  // Remove custodian from matter
  fastify.delete('/:matterId/custodians/:custodianId', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const userId = (request as any).userId;
    const { matterId, custodianId } = request.params as { matterId: string; custodianId: string };

    try {
      await matterService.removeCustodianFromMatter(tenantId, matterId, custodianId, userId);
      return reply.status(204).send();
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  });

  // Add note to matter
  fastify.post('/:matterId/notes', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const userId = (request as any).userId;
    const { matterId } = request.params as { matterId: string };
    const { content, isPrivate } = request.body as any;

    if (!content) {
      return reply.status(400).send({ error: 'content is required' });
    }

    try {
      const note = await matterService.addMatterNote(tenantId, matterId, userId, content, isPrivate);
      return reply.status(201).send(note);
    } catch (error: any) {
      if (error.message === 'Matter not found') {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  });
}
