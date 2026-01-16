/**
 * AIVO Model Registry Service - Artifact Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import * as artifactService from '../services/artifactService.js';
import * as versionService from '../services/versionService.js';

const InitiateUploadSchema = z.object({
  type: z.enum([
    'MODEL_WEIGHTS', 'CONFIG', 'TOKENIZER', 'VOCABULARY', 'METADATA',
    'ONNX_EXPORT', 'TENSORRT', 'CHECKPOINT', 'EVALUATION', 'SAMPLE_DATA',
  ]),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  sizeBytes: z.number().int().positive(),
  checksum: z.string().min(1),
  mimeType: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const ListArtifactsQuerySchema = z.object({
  type: z.enum([
    'MODEL_WEIGHTS', 'CONFIG', 'TOKENIZER', 'VOCABULARY', 'METADATA',
    'ONNX_EXPORT', 'TENSORRT', 'CHECKPOINT', 'EVALUATION', 'SAMPLE_DATA',
  ]).optional(),
});

export async function registerArtifactRoutes(fastify: FastifyInstance) {
  /**
   * POST /models/:modelId/versions/:versionId/artifacts/upload - Initiate upload
   */
  fastify.post('/:modelId/versions/:versionId/artifacts/upload', async (request: FastifyRequest<{
    Params: { modelId: string; versionId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId || !request.user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    // Verify version exists
    const version = await versionService.getVersionById(
      request.params.modelId,
      request.params.versionId
    );
    if (!version) {
      return reply.status(404).send({ error: 'Version not found' });
    }

    // Cannot upload to production versions
    if (version.stage === 'PRODUCTION') {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'Cannot modify artifacts of production versions',
      });
    }

    const parseResult = InitiateUploadSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.errors,
      });
    }

    try {
      const result = await artifactService.initiateUpload(
        request.tenantId,
        request.params.modelId,
        request.params.versionId,
        request.user.sub,
        parseResult.data
      );

      return reply.status(200).send(result);
    } catch (error: any) {
      if (error.message?.includes('exceeds maximum')) {
        return reply.status(413).send({ error: 'Payload Too Large', message: error.message });
      }
      if (error.message?.includes('already exists')) {
        return reply.status(409).send({ error: 'Conflict', message: error.message });
      }
      request.log.error({ error }, 'Failed to initiate upload');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * POST /models/:modelId/versions/:versionId/artifacts/:artifactId/complete - Complete upload
   */
  fastify.post('/:modelId/versions/:versionId/artifacts/:artifactId/complete', async (request: FastifyRequest<{
    Params: { modelId: string; versionId: string; artifactId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const artifact = await artifactService.completeUpload(request.params.artifactId);

      request.log.info({ artifactId: artifact.id }, 'Artifact upload completed');
      return reply.status(200).send(artifact);
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        return reply.status(404).send({ error: 'Not Found', message: error.message });
      }
      if (error.message?.includes('Size mismatch')) {
        return reply.status(400).send({ error: 'Validation Error', message: error.message });
      }
      request.log.error({ error }, 'Failed to complete upload');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * GET /models/:modelId/versions/:versionId/artifacts - List artifacts
   */
  fastify.get('/:modelId/versions/:versionId/artifacts', async (request: FastifyRequest<{
    Params: { modelId: string; versionId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parseResult = ListArtifactsQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.errors,
      });
    }

    try {
      const artifacts = await artifactService.listArtifacts(
        request.params.versionId,
        parseResult.data.type
      );

      return reply.status(200).send({ data: artifacts });
    } catch (error) {
      request.log.error({ error }, 'Failed to list artifacts');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * GET /models/:modelId/versions/:versionId/artifacts/:artifactId - Get artifact
   */
  fastify.get('/:modelId/versions/:versionId/artifacts/:artifactId', async (request: FastifyRequest<{
    Params: { modelId: string; versionId: string; artifactId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const artifact = await artifactService.getArtifactById(request.params.artifactId);

      if (!artifact) {
        return reply.status(404).send({ error: 'Artifact not found' });
      }

      return reply.status(200).send(artifact);
    } catch (error) {
      request.log.error({ error }, 'Failed to get artifact');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * GET /models/:modelId/versions/:versionId/artifacts/:artifactId/download - Get download URL
   */
  fastify.get('/:modelId/versions/:versionId/artifacts/:artifactId/download', async (request: FastifyRequest<{
    Params: { modelId: string; versionId: string; artifactId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const result = await artifactService.getDownloadUrl(request.params.artifactId);

      return reply.status(200).send(result);
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        return reply.status(404).send({ error: 'Artifact not found' });
      }
      request.log.error({ error }, 'Failed to get download URL');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * DELETE /models/:modelId/versions/:versionId/artifacts/:artifactId - Delete artifact
   */
  fastify.delete('/:modelId/versions/:versionId/artifacts/:artifactId', async (request: FastifyRequest<{
    Params: { modelId: string; versionId: string; artifactId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      await artifactService.deleteArtifact(request.params.artifactId);

      return reply.status(204).send();
    } catch (error: any) {
      if (error.message?.includes('production')) {
        return reply.status(409).send({ error: 'Conflict', message: error.message });
      }
      if (error.message?.includes('not found')) {
        return reply.status(404).send({ error: 'Artifact not found' });
      }
      request.log.error({ error }, 'Failed to delete artifact');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}
