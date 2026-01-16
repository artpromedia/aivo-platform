/**
 * AIVO Model Registry Service - Model Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import * as modelService from '../services/modelService.js';

// Validation schemas
const CreateModelSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  displayName: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  framework: z.enum([
    'PYTORCH', 'TENSORFLOW', 'ONNX', 'SKLEARN', 'XGBOOST',
    'LIGHTGBM', 'HUGGINGFACE', 'OPENAI', 'ANTHROPIC', 'CUSTOM',
  ]),
  task: z.enum([
    'TEXT_CLASSIFICATION', 'TEXT_GENERATION', 'TEXT_EMBEDDING',
    'QUESTION_ANSWERING', 'SUMMARIZATION', 'TRANSLATION',
    'SENTIMENT_ANALYSIS', 'NER', 'IMAGE_CLASSIFICATION',
    'OBJECT_DETECTION', 'SPEECH_TO_TEXT', 'TEXT_TO_SPEECH',
    'RECOMMENDATION', 'REGRESSION', 'CLUSTERING', 'CUSTOM',
  ]),
  tags: z.array(z.string()).optional(),
  teamId: z.string().uuid().optional(),
  isPublic: z.boolean().optional(),
  allowFineTune: z.boolean().optional(),
});

const UpdateModelSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
  allowFineTune: z.boolean().optional(),
});

const ListModelsQuerySchema = z.object({
  framework: z.string().optional(),
  task: z.string().optional(),
  tags: z.string().optional(), // Comma-separated
  ownerId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export async function registerModelRoutes(fastify: FastifyInstance) {
  /**
   * POST /models - Create a new model
   */
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.tenantId || !request.user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parseResult = CreateModelSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.errors,
      });
    }

    try {
      const model = await modelService.createModel(
        request.tenantId,
        request.user.sub,
        request.user.email,
        parseResult.data
      );

      request.log.info({ modelId: model.id }, 'Model created');
      return reply.status(201).send(model);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'A model with this name already exists',
        });
      }
      request.log.error({ error }, 'Failed to create model');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * GET /models - List models
   */
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parseResult = ListModelsQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.errors,
      });
    }

    const query = {
      ...parseResult.data,
      tags: parseResult.data.tags?.split(',').filter(Boolean),
    };

    try {
      const result = await modelService.listModels(request.tenantId, query as any);
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error }, 'Failed to list models');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * GET /models/stats - Get model statistics
   */
  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const stats = await modelService.getModelStats(request.tenantId);
      return reply.status(200).send(stats);
    } catch (error) {
      request.log.error({ error }, 'Failed to get model stats');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * GET /models/:modelId - Get model by ID
   */
  fastify.get('/:modelId', async (request: FastifyRequest<{
    Params: { modelId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const model = await modelService.getModelById(
        request.tenantId,
        request.params.modelId
      );

      if (!model) {
        return reply.status(404).send({ error: 'Model not found' });
      }

      return reply.status(200).send(model);
    } catch (error) {
      request.log.error({ error }, 'Failed to get model');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * PATCH /models/:modelId - Update model
   */
  fastify.patch('/:modelId', async (request: FastifyRequest<{
    Params: { modelId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parseResult = UpdateModelSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.errors,
      });
    }

    try {
      const model = await modelService.updateModel(
        request.tenantId,
        request.params.modelId,
        parseResult.data
      );

      return reply.status(200).send(model);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.status(404).send({ error: 'Model not found' });
      }
      request.log.error({ error }, 'Failed to update model');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * DELETE /models/:modelId - Delete model
   */
  fastify.delete('/:modelId', async (request: FastifyRequest<{
    Params: { modelId: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      await modelService.deleteModel(request.tenantId, request.params.modelId);
      return reply.status(204).send();
    } catch (error: any) {
      if (error.message?.includes('active deployments')) {
        return reply.status(409).send({
          error: 'Conflict',
          message: error.message,
        });
      }
      if (error.code === 'P2025') {
        return reply.status(404).send({ error: 'Model not found' });
      }
      request.log.error({ error }, 'Failed to delete model');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}
