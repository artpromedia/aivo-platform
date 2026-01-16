/**
 * AIVO Model Registry Service - Deployment Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import * as deploymentService from '../services/deploymentService.js';

const CreateDeploymentSchema = z.object({
  name: z.string().min(1).max(100),
  versionId: z.string().uuid(),
  environment: z.enum(['DEVELOPMENT', 'STAGING', 'PRODUCTION']),
  instanceType: z.string().optional(),
  replicas: z.number().int().min(0).max(100).optional(),
  minReplicas: z.number().int().min(0).max(100).optional(),
  maxReplicas: z.number().int().min(1).max(100).optional(),
  config: z.record(z.unknown()).optional(),
});

const UpdateDeploymentSchema = z.object({
  replicas: z.number().int().min(0).max(100).optional(),
  minReplicas: z.number().int().min(0).max(100).optional(),
  maxReplicas: z.number().int().min(1).max(100).optional(),
  config: z.record(z.unknown()).optional(),
});

const ListDeploymentsQuerySchema = z.object({
  modelId: z.string().uuid().optional(),
  versionId: z.string().uuid().optional(),
  environment: z.enum(['DEVELOPMENT', 'STAGING', 'PRODUCTION']).optional(),
  status: z.enum(['PENDING', 'DEPLOYING', 'RUNNING', 'FAILED', 'STOPPED', 'SCALING']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export async function registerDeploymentRoutes(fastify: FastifyInstance) {
  /**
   * POST /models/:modelId/deployments - Create deployment
   */
  fastify.post('/:modelId/deployments', async (request: FastifyRequest<{
    Params: { modelId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId || !request.user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parseResult = CreateDeploymentSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.errors,
      });
    }

    try {
      const deployment = await deploymentService.createDeployment(
        request.tenantId,
        request.params.modelId,
        request.user.sub,
        parseResult.data
      );

      request.log.info({ deploymentId: deployment.id }, 'Deployment created');
      return reply.status(201).send(deployment);
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        return reply.status(404).send({ error: 'Not Found', message: error.message });
      }
      if (error.message?.includes('Only')) {
        return reply.status(400).send({ error: 'Validation Error', message: error.message });
      }
      if (error.code === 'P2002') {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'A deployment with this name already exists in this environment',
        });
      }
      request.log.error({ error }, 'Failed to create deployment');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * GET /deployments - List all deployments
   */
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parseResult = ListDeploymentsQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.errors,
      });
    }

    try {
      const result = await deploymentService.listDeployments(
        request.tenantId,
        parseResult.data
      );

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error }, 'Failed to list deployments');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * GET /deployments/stats - Get deployment statistics
   */
  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const stats = await deploymentService.getDeploymentStats(request.tenantId);
      return reply.status(200).send(stats);
    } catch (error) {
      request.log.error({ error }, 'Failed to get deployment stats');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * GET /deployments/:deploymentId - Get deployment
   */
  fastify.get('/:deploymentId', async (request: FastifyRequest<{
    Params: { deploymentId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const deployment = await deploymentService.getDeploymentById(
        request.tenantId,
        request.params.deploymentId
      );

      if (!deployment) {
        return reply.status(404).send({ error: 'Deployment not found' });
      }

      return reply.status(200).send(deployment);
    } catch (error) {
      request.log.error({ error }, 'Failed to get deployment');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * PATCH /deployments/:deploymentId - Update deployment
   */
  fastify.patch('/:deploymentId', async (request: FastifyRequest<{
    Params: { deploymentId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parseResult = UpdateDeploymentSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.errors,
      });
    }

    try {
      const deployment = await deploymentService.updateDeployment(
        request.tenantId,
        request.params.deploymentId,
        parseResult.data
      );

      return reply.status(200).send(deployment);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.status(404).send({ error: 'Deployment not found' });
      }
      request.log.error({ error }, 'Failed to update deployment');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * POST /deployments/:deploymentId/stop - Stop deployment
   */
  fastify.post('/:deploymentId/stop', async (request: FastifyRequest<{
    Params: { deploymentId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId || !request.user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const deployment = await deploymentService.stopDeployment(
        request.tenantId,
        request.params.deploymentId,
        request.user.sub
      );

      request.log.info({ deploymentId: deployment.id }, 'Deployment stopped');
      return reply.status(200).send(deployment);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.status(404).send({ error: 'Deployment not found' });
      }
      request.log.error({ error }, 'Failed to stop deployment');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * DELETE /deployments/:deploymentId - Delete deployment
   */
  fastify.delete('/:deploymentId', async (request: FastifyRequest<{
    Params: { deploymentId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      await deploymentService.deleteDeployment(
        request.tenantId,
        request.params.deploymentId
      );

      return reply.status(204).send();
    } catch (error: any) {
      if (error.message?.includes('Cannot delete')) {
        return reply.status(409).send({ error: 'Conflict', message: error.message });
      }
      if (error.message?.includes('not found')) {
        return reply.status(404).send({ error: 'Deployment not found' });
      }
      request.log.error({ error }, 'Failed to delete deployment');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}
