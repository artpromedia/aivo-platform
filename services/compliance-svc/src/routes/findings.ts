/**
 * AIVO Compliance Service - Finding Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import * as findingService from '../services/findingService.js';
import type { CreateFindingInput, UpdateFindingStatusInput } from '../types/index.js';

const CreateFindingSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().min(1).max(5000),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL']),
  assessmentId: z.string().uuid().optional(),
  controlId: z.string().uuid().optional(),
  rootCause: z.string().max(2000).optional(),
  impact: z.string().max(2000).optional(),
  likelihood: z.string().max(500).optional(),
  affectedSystems: z.array(z.string()).optional(),
  dueDate: z.string().datetime().optional(),
});

const UpdateFindingSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().min(1).max(5000).optional(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL']).optional(),
  rootCause: z.string().max(2000).optional(),
  impact: z.string().max(2000).optional(),
  likelihood: z.string().max(500).optional(),
  affectedSystems: z.array(z.string()).optional(),
  dueDate: z.string().datetime().optional(),
});

const UpdateStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_REMEDIATION', 'REMEDIATED', 'ACCEPTED_RISK', 'FALSE_POSITIVE', 'CLOSED']),
  resolution: z.string().max(2000).optional(),
  riskAcceptReason: z.string().max(2000).optional(),
});

const ListFindingsQuerySchema = z.object({
  assessmentId: z.string().uuid().optional(),
  controlId: z.string().uuid().optional(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL']).optional(),
  status: z.enum(['OPEN', 'IN_REMEDIATION', 'REMEDIATED', 'ACCEPTED_RISK', 'FALSE_POSITIVE', 'CLOSED']).optional(),
  overdue: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export async function registerFindingRoutes(fastify: FastifyInstance) {
  /**
   * POST /findings - Create a finding
   */
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.tenantId || !request.user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parseResult = CreateFindingSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.errors,
      });
    }

    try {
      const finding = await findingService.createFinding(
        request.tenantId,
        request.user.sub,
        parseResult.data as CreateFindingInput
      );

      request.log.info({ findingId: finding.id }, 'Finding created');
      return reply.status(201).send(finding);
    } catch (error) {
      request.log.error({ error }, 'Failed to create finding');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * GET /findings - List findings
   */
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parseResult = ListFindingsQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.errors,
      });
    }

    try {
      const result = await findingService.listFindings(
        request.tenantId,
        parseResult.data
      );

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error }, 'Failed to list findings');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * GET /findings/stats - Get finding statistics
   */
  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const stats = await findingService.getFindingStats(request.tenantId);
      return reply.status(200).send(stats);
    } catch (error) {
      request.log.error({ error }, 'Failed to get finding stats');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * GET /findings/:findingId - Get finding by ID
   */
  fastify.get('/:findingId', async (request: FastifyRequest<{
    Params: { findingId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const finding = await findingService.getFindingById(
        request.tenantId,
        request.params.findingId
      );

      if (!finding) {
        return reply.status(404).send({ error: 'Finding not found' });
      }

      return reply.status(200).send(finding);
    } catch (error) {
      request.log.error({ error }, 'Failed to get finding');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * PATCH /findings/:findingId - Update finding
   */
  fastify.patch('/:findingId', async (request: FastifyRequest<{
    Params: { findingId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parseResult = UpdateFindingSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.errors,
      });
    }

    try {
      const finding = await findingService.updateFinding(
        request.tenantId,
        request.params.findingId,
        parseResult.data
      );

      return reply.status(200).send(finding);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.status(404).send({ error: 'Finding not found' });
      }
      request.log.error({ error }, 'Failed to update finding');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * POST /findings/:findingId/status - Update finding status
   */
  fastify.post('/:findingId/status', async (request: FastifyRequest<{
    Params: { findingId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId || !request.user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parseResult = UpdateStatusSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.errors,
      });
    }

    try {
      const finding = await findingService.updateFindingStatus(
        request.tenantId,
        request.params.findingId,
        request.user.sub,
        parseResult.data as UpdateFindingStatusInput
      );

      request.log.info({
        findingId: finding.id,
        status: finding.status,
      }, 'Finding status updated');

      return reply.status(200).send(finding);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.status(404).send({ error: 'Finding not found' });
      }
      request.log.error({ error }, 'Failed to update finding status');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * POST /findings/:findingId/verify - Verify remediated finding
   */
  fastify.post('/:findingId/verify', async (request: FastifyRequest<{
    Params: { findingId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId || !request.user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const finding = await findingService.verifyFinding(
        request.tenantId,
        request.params.findingId,
        request.user.sub
      );

      request.log.info({ findingId: finding.id }, 'Finding verified');
      return reply.status(200).send(finding);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.status(404).send({ error: 'Finding not found' });
      }
      request.log.error({ error }, 'Failed to verify finding');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * DELETE /findings/:findingId - Delete finding
   */
  fastify.delete('/:findingId', async (request: FastifyRequest<{
    Params: { findingId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      await findingService.deleteFinding(
        request.tenantId,
        request.params.findingId
      );

      return reply.status(204).send();
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.status(404).send({ error: 'Finding not found' });
      }
      request.log.error({ error }, 'Failed to delete finding');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}
