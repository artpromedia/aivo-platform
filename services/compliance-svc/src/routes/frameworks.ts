/**
 * AIVO Compliance Service - Framework Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import * as frameworkService from '../services/frameworkService.js';
import type { EnableFrameworkInput } from '../types/index.js';

const EnableFrameworkSchema = z.object({
  framework: z.enum([
    'FERPA', 'COPPA', 'GDPR', 'CCPA', 'SOC2', 'HIPAA',
    'PCI_DSS', 'ISO27001', 'NIST_CSF', 'CIPA', 'IDEA', 'CUSTOM',
  ]),
  displayName: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  priority: z.number().int().optional(),
  applicableFrom: z.string().datetime().optional(),
  applicableUntil: z.string().datetime().optional(),
});

const UpdateFrameworkSchema = z.object({
  displayName: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  isActive: z.boolean().optional(),
  priority: z.number().int().optional(),
});

export async function registerFrameworkRoutes(fastify: FastifyInstance) {
  /**
   * POST /frameworks - Enable a framework
   */
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.tenantId || !request.user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parseResult = EnableFrameworkSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.errors,
      });
    }

    try {
      const framework = await frameworkService.enableFramework(
        request.tenantId,
        request.user.sub,
        parseResult.data as EnableFrameworkInput
      );

      request.log.info({ frameworkId: framework.id }, 'Framework enabled');
      return reply.status(201).send(framework);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'This framework is already enabled',
        });
      }
      request.log.error({ error }, 'Failed to enable framework');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * GET /frameworks - List frameworks
   */
  fastify.get('/', async (request: FastifyRequest<{
    Querystring: { includeInactive?: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const includeInactive = request.query.includeInactive === 'true';
      const frameworks = await frameworkService.getFrameworks(
        request.tenantId,
        includeInactive
      );

      return reply.status(200).send({ data: frameworks });
    } catch (error) {
      request.log.error({ error }, 'Failed to list frameworks');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * GET /frameworks/:frameworkId - Get framework details
   */
  fastify.get('/:frameworkId', async (request: FastifyRequest<{
    Params: { frameworkId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const framework = await frameworkService.getFrameworkById(
        request.tenantId,
        request.params.frameworkId
      );

      if (!framework) {
        return reply.status(404).send({ error: 'Framework not found' });
      }

      return reply.status(200).send(framework);
    } catch (error) {
      request.log.error({ error }, 'Failed to get framework');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * GET /frameworks/:frameworkId/summary - Get framework compliance summary
   */
  fastify.get('/:frameworkId/summary', async (request: FastifyRequest<{
    Params: { frameworkId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const summary = await frameworkService.getFrameworkSummary(
        request.tenantId,
        request.params.frameworkId
      );

      return reply.status(200).send(summary);
    } catch (error: any) {
      if (error.message === 'Framework not found') {
        return reply.status(404).send({ error: 'Framework not found' });
      }
      request.log.error({ error }, 'Failed to get framework summary');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * PATCH /frameworks/:frameworkId - Update framework
   */
  fastify.patch('/:frameworkId', async (request: FastifyRequest<{
    Params: { frameworkId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parseResult = UpdateFrameworkSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.errors,
      });
    }

    try {
      const framework = await frameworkService.updateFramework(
        request.tenantId,
        request.params.frameworkId,
        parseResult.data
      );

      return reply.status(200).send(framework);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.status(404).send({ error: 'Framework not found' });
      }
      request.log.error({ error }, 'Failed to update framework');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * DELETE /frameworks/:frameworkId - Delete framework
   */
  fastify.delete('/:frameworkId', async (request: FastifyRequest<{
    Params: { frameworkId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      await frameworkService.deleteFramework(
        request.tenantId,
        request.params.frameworkId
      );

      return reply.status(204).send();
    } catch (error: any) {
      if (error.message?.includes('Cannot delete')) {
        return reply.status(409).send({ error: 'Conflict', message: error.message });
      }
      if (error.code === 'P2025') {
        return reply.status(404).send({ error: 'Framework not found' });
      }
      request.log.error({ error }, 'Failed to delete framework');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}
