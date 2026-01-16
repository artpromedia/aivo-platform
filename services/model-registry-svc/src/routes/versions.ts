/**
 * AIVO Model Registry Service - Version Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import * as versionService from '../services/versionService.js';
import * as modelService from '../services/modelService.js';

const CreateVersionSchema = z.object({
  version: z.string().optional(),
  description: z.string().max(2000).optional(),
  changelog: z.string().max(5000).optional(),
  parentVersionId: z.string().uuid().optional(),
  sourceType: z.string().optional(),
  trainingJobId: z.string().optional(),
  inputSchema: z.record(z.unknown()).optional(),
  outputSchema: z.record(z.unknown()).optional(),
  hyperparameters: z.record(z.unknown()).optional(),
  modelConfig: z.record(z.unknown()).optional(),
});

const UpdateVersionSchema = z.object({
  description: z.string().max(2000).optional(),
  changelog: z.string().max(5000).optional(),
  inputSchema: z.record(z.unknown()).optional(),
  outputSchema: z.record(z.unknown()).optional(),
});

const TransitionStageSchema = z.object({
  targetStage: z.enum(['DRAFT', 'VALIDATION', 'STAGING', 'PRODUCTION', 'ARCHIVED', 'DEPRECATED']),
  notes: z.string().max(2000).optional(),
});

const ListVersionsQuerySchema = z.object({
  stage: z.enum(['DRAFT', 'VALIDATION', 'STAGING', 'PRODUCTION', 'ARCHIVED', 'DEPRECATED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export async function registerVersionRoutes(fastify: FastifyInstance) {
  /**
   * POST /models/:modelId/versions - Create version
   */
  fastify.post('/:modelId/versions', async (request: FastifyRequest<{
    Params: { modelId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId || !request.user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    // Verify model exists and belongs to tenant
    const model = await modelService.getModelById(request.tenantId, request.params.modelId);
    if (!model) {
      return reply.status(404).send({ error: 'Model not found' });
    }

    const parseResult = CreateVersionSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.errors,
      });
    }

    try {
      const version = await versionService.createVersion(
        request.params.modelId,
        request.user.sub,
        parseResult.data
      );

      request.log.info({ versionId: version.id, version: version.version }, 'Version created');
      return reply.status(201).send(version);
    } catch (error: any) {
      if (error.message?.includes('Invalid semantic version')) {
        return reply.status(400).send({ error: 'Validation Error', message: error.message });
      }
      if (error.code === 'P2002') {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'A version with this number already exists',
        });
      }
      request.log.error({ error }, 'Failed to create version');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * GET /models/:modelId/versions - List versions
   */
  fastify.get('/:modelId/versions', async (request: FastifyRequest<{
    Params: { modelId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parseResult = ListVersionsQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.errors,
      });
    }

    try {
      const result = await versionService.listVersions(
        request.params.modelId,
        parseResult.data
      );

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error }, 'Failed to list versions');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * GET /models/:modelId/versions/:versionId - Get version by ID or tag
   */
  fastify.get('/:modelId/versions/:versionId', async (request: FastifyRequest<{
    Params: { modelId: string; versionId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      // Check if versionId is a UUID or a tag (latest, production, staging, or semver)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        request.params.versionId
      );

      const version = isUuid
        ? await versionService.getVersionById(request.params.modelId, request.params.versionId)
        : await versionService.getVersionByTag(request.params.modelId, request.params.versionId);

      if (!version) {
        return reply.status(404).send({ error: 'Version not found' });
      }

      return reply.status(200).send(version);
    } catch (error) {
      request.log.error({ error }, 'Failed to get version');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * PATCH /models/:modelId/versions/:versionId - Update version
   */
  fastify.patch('/:modelId/versions/:versionId', async (request: FastifyRequest<{
    Params: { modelId: string; versionId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parseResult = UpdateVersionSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.errors,
      });
    }

    try {
      const version = await versionService.updateVersion(
        request.params.modelId,
        request.params.versionId,
        parseResult.data
      );

      return reply.status(200).send(version);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.status(404).send({ error: 'Version not found' });
      }
      request.log.error({ error }, 'Failed to update version');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * POST /models/:modelId/versions/:versionId/transition - Transition stage
   */
  fastify.post('/:modelId/versions/:versionId/transition', async (request: FastifyRequest<{
    Params: { modelId: string; versionId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId || !request.user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parseResult = TransitionStageSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.errors,
      });
    }

    try {
      const version = await versionService.transitionStage(
        request.params.modelId,
        request.params.versionId,
        request.user.sub,
        parseResult.data
      );

      request.log.info({
        versionId: version.id,
        stage: version.stage,
      }, 'Version stage transitioned');

      return reply.status(200).send(version);
    } catch (error: any) {
      if (error.message?.includes('Invalid stage transition')) {
        return reply.status(400).send({ error: 'Validation Error', message: error.message });
      }
      if (error.message?.includes('Cannot promote')) {
        return reply.status(400).send({ error: 'Validation Error', message: error.message });
      }
      if (error.message === 'Version not found') {
        return reply.status(404).send({ error: 'Version not found' });
      }
      request.log.error({ error }, 'Failed to transition version stage');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * GET /models/:modelId/versions/:v1/compare/:v2 - Compare versions
   */
  fastify.get('/:modelId/versions/:v1/compare/:v2', async (request: FastifyRequest<{
    Params: { modelId: string; v1: string; v2: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const comparison = await versionService.compareVersions(
        request.params.modelId,
        request.params.v1,
        request.params.v2
      );

      return reply.status(200).send(comparison);
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        return reply.status(404).send({ error: error.message });
      }
      request.log.error({ error }, 'Failed to compare versions');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * DELETE /models/:modelId/versions/:versionId - Delete version
   */
  fastify.delete('/:modelId/versions/:versionId', async (request: FastifyRequest<{
    Params: { modelId: string; versionId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      await versionService.deleteVersion(
        request.params.modelId,
        request.params.versionId
      );

      return reply.status(204).send();
    } catch (error: any) {
      if (error.message?.includes('Cannot delete')) {
        return reply.status(409).send({ error: 'Conflict', message: error.message });
      }
      if (error.code === 'P2025') {
        return reply.status(404).send({ error: 'Version not found' });
      }
      request.log.error({ error }, 'Failed to delete version');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}
