/**
 * AIVO Compliance Service - Legal Hold Module – Custodian Routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import * as custodianService from '../services/custodianService.js';

const CreateCustodianSchema = z.object({
  userId: z.string().optional(),
  employeeId: z.string().optional(),
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  displayName: z.string().optional(),
  department: z.string().optional(),
  title: z.string().optional(),
  location: z.string().optional(),
  manager: z.string().optional(),
  phone: z.string().optional(),
  alternateEmail: z.string().email().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE']).optional(),
  hireDate: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const UpdateCustodianSchema = CreateCustodianSchema.partial().omit({ email: true }).extend({
  terminationDate: z.string().optional(),
});

export default async function custodianRoutes(fastify: FastifyInstance): Promise<void> {
  // List custodians
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const query = request.query as any;
    const result = await custodianService.listCustodians(tenantId, query);
    return reply.send(result);
  });

  // Search custodians
  fastify.get('/search', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { q, limit } = request.query as { q?: string; limit?: number };

    if (!q) {
      return reply.status(400).send({ error: 'Search query (q) is required' });
    }

    const results = await custodianService.searchCustodians(tenantId, q, limit);
    return reply.send(results);
  });

  // Get departments
  fastify.get('/departments', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const departments = await custodianService.getDepartments(tenantId);
    return reply.send(departments);
  });

  // Get pending acknowledgments
  fastify.get('/pending-acknowledgments', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { overdueOnly, page, pageSize } = request.query as any;

    const result = await custodianService.getCustodiansWithPendingAcknowledgments(tenantId, {
      overdueOnly: overdueOnly === 'true',
      page,
      pageSize,
    });
    return reply.send(result);
  });

  // Create custodian
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;

    const parsed = CreateCustodianSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.errors });
    }

    try {
      const custodian = await custodianService.createCustodian(tenantId, parsed.data);
      return reply.status(201).send(custodian);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(409).send({ error: 'Custodian with this email already exists' });
      }
      throw error;
    }
  });

  // Bulk import custodians
  fastify.post('/bulk-import', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { custodians } = request.body as { custodians: any[] };

    if (!Array.isArray(custodians) || custodians.length === 0) {
      return reply.status(400).send({ error: 'custodians array is required' });
    }

    const result = await custodianService.bulkImportCustodians(tenantId, custodians);
    return reply.send(result);
  });

  // Get custodian
  fastify.get('/:custodianId', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { custodianId } = request.params as { custodianId: string };

    const custodian = await custodianService.getCustodian(tenantId, custodianId);
    if (!custodian) {
      return reply.status(404).send({ error: 'Custodian not found' });
    }
    return reply.send(custodian);
  });

  // Update custodian
  fastify.put('/:custodianId', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { custodianId } = request.params as { custodianId: string };

    const parsed = UpdateCustodianSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.errors });
    }

    try {
      const custodian = await custodianService.updateCustodian(tenantId, custodianId, parsed.data);
      return reply.send(custodian);
    } catch (error: any) {
      if (error.message === 'Custodian not found') {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  });

  // Get custodian holds
  fastify.get('/:custodianId/holds', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { custodianId } = request.params as { custodianId: string };
    const { includeReleased } = request.query as { includeReleased?: string };

    try {
      const holds = await custodianService.getCustodianHolds(tenantId, custodianId, {
        includeReleased: includeReleased === 'true',
      });
      return reply.send(holds);
    } catch (error: any) {
      if (error.message === 'Custodian not found') {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  });

  // Get custodian compliance
  fastify.get('/:custodianId/compliance', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { custodianId } = request.params as { custodianId: string };

    try {
      const compliance = await custodianService.getCustodianCompliance(tenantId, custodianId);
      return reply.send(compliance);
    } catch (error: any) {
      if (error.message === 'Custodian not found') {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  });

  // Link data source to custodian
  fastify.post('/:custodianId/data-sources', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { custodianId } = request.params as { custodianId: string };
    const { dataSourceId, identifier, estimatedSize, itemCount } = request.body as any;

    if (!dataSourceId) {
      return reply.status(400).send({ error: 'dataSourceId is required' });
    }

    try {
      const result = await custodianService.linkDataSource(tenantId, custodianId, dataSourceId, {
        identifier,
        estimatedSize,
        itemCount,
      });
      return reply.status(201).send(result);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  });
}
