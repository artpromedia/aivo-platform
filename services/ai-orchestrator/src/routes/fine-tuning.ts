/**
 * RLHF Fine-Tuning API Routes
 *
 * Provides endpoints for managing fine-tuning jobs and models.
 */

import { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import type { Pool } from 'pg';
import type { Redis } from 'ioredis';
import { z } from 'zod';
import {
  FineTuningManager,
  type FineTuningJobConfig,
  type FineTuningManagerConfig,
} from '../rlhf/fine-tuning-manager.js';

// ════════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ════════════════════════════════════════════════════════════════════════════════

const createJobSchema = z.object({
  provider: z.enum(['openai', 'anthropic']),
  baseModel: z.string().min(1),
  trainingDataQuery: z.object({
    minQualityScore: z.number().min(0).max(1).optional(),
    agentTypes: z.array(z.string()).optional(),
    taskCategories: z.array(z.string()).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    limit: z.number().int().min(10).max(100000).optional(),
    excludeExported: z.boolean().optional(),
  }).optional(),
  hyperparameters: z.object({
    nEpochs: z.number().int().min(1).max(50).optional(),
    batchSize: z.number().int().min(1).max(256).optional(),
    learningRateMultiplier: z.number().min(0.01).max(10).optional(),
    warmupRatio: z.number().min(0).max(0.5).optional(),
    weightDecay: z.number().min(0).max(1).optional(),
  }).optional(),
  validationSplit: z.number().min(0).max(0.5).optional(),
  suffix: z.string().max(40).optional(),
  metadata: z.record(z.string()).optional(),
});

const deployModelSchema = z.object({
  displayName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const jobFilterSchema = z.object({
  status: z.enum(['pending', 'validating', 'queued', 'running', 'succeeded', 'failed', 'cancelled']).optional(),
  provider: z.enum(['openai', 'anthropic']).optional(),
});

const modelFilterSchema = z.object({
  status: z.enum(['active', 'deprecated', 'deleted']).optional(),
  provider: z.enum(['openai', 'anthropic']).optional(),
});

// ════════════════════════════════════════════════════════════════════════════════
// ROUTES
// ════════════════════════════════════════════════════════════════════════════════

interface FineTuningRoutesOptions {
  pool: Pool;
  redis: Redis;
  config?: Partial<FineTuningManagerConfig>;
}

export const registerFineTuningRoutes: FastifyPluginAsync<FineTuningRoutesOptions> = async (
  fastify: FastifyInstance,
  opts
) => {
  const { pool, redis, config = {} } = opts;

  // Initialize manager with config from environment
  const managerConfig: FineTuningManagerConfig = {
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    defaultProvider: 'openai',
    pollIntervalMs: 60000,
    maxConcurrentJobs: 3,
    autoDeployOnSuccess: false,
    ...config,
  };

  const manager = new FineTuningManager(pool, redis, managerConfig);

  // Start polling for job updates
  manager.startPolling();

  // Clean up on shutdown
  fastify.addHook('onClose', async () => {
    manager.stopPolling();
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Job Management
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * POST /fine-tuning/jobs
   *
   * Create a new fine-tuning job.
   */
  fastify.post('/fine-tuning/jobs', async (request, reply) => {
    try {
      const body = createJobSchema.parse(request.body);

      const jobConfig: FineTuningJobConfig = {
        provider: body.provider,
        baseModel: body.baseModel,
        trainingDataQuery: {
          minQualityScore: body.trainingDataQuery?.minQualityScore,
          agentTypes: body.trainingDataQuery?.agentTypes,
          taskCategories: body.trainingDataQuery?.taskCategories,
          startDate: body.trainingDataQuery?.startDate
            ? new Date(body.trainingDataQuery.startDate)
            : undefined,
          endDate: body.trainingDataQuery?.endDate
            ? new Date(body.trainingDataQuery.endDate)
            : undefined,
          limit: body.trainingDataQuery?.limit,
          excludeExported: body.trainingDataQuery?.excludeExported,
        },
        hyperparameters: body.hyperparameters,
        validationSplit: body.validationSplit,
        suffix: body.suffix,
        metadata: body.metadata,
      };

      const job = await manager.createJob(jobConfig);

      reply.code(201).send({
        message: 'Fine-tuning job created successfully',
        job: {
          id: job.id,
          provider: job.provider,
          providerJobId: job.providerJobId,
          baseModel: job.baseModel,
          status: job.status,
          trainingExampleCount: job.trainingExampleCount,
          validationExampleCount: job.validationExampleCount,
          createdAt: job.createdAt,
          startedAt: job.startedAt,
        },
      });
    } catch (error) {
      fastify.log.error(error, 'Failed to create fine-tuning job');

      if (error instanceof z.ZodError) {
        reply.code(400).send({ error: 'Invalid request body', details: error.errors });
        return;
      }

      reply.code(500).send({ error: (error as Error).message });
    }
  });

  /**
   * GET /fine-tuning/jobs
   *
   * List fine-tuning jobs.
   */
  fastify.get('/fine-tuning/jobs', async (request, reply) => {
    try {
      const pagination = paginationSchema.parse(request.query);
      const filters = jobFilterSchema.parse(request.query);

      const { jobs, total } = await manager.listJobs({
        status: filters.status,
        provider: filters.provider,
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit,
      });

      reply.code(200).send({
        data: jobs.map((job) => ({
          id: job.id,
          provider: job.provider,
          providerJobId: job.providerJobId,
          baseModel: job.baseModel,
          fineTunedModel: job.fineTunedModel,
          status: job.status,
          trainingExampleCount: job.trainingExampleCount,
          validationExampleCount: job.validationExampleCount,
          metrics: job.metrics,
          error: job.error,
          createdAt: job.createdAt,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
        })),
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit),
        },
      });
    } catch (error) {
      fastify.log.error(error, 'Failed to list fine-tuning jobs');
      reply.code(500).send({ error: 'Failed to list jobs' });
    }
  });

  /**
   * GET /fine-tuning/jobs/:jobId
   *
   * Get a specific fine-tuning job.
   */
  fastify.get('/fine-tuning/jobs/:jobId', async (request, reply) => {
    const { jobId } = z.object({ jobId: z.string().uuid() }).parse(request.params);

    try {
      const job = await manager.getJob(jobId);

      if (!job) {
        reply.code(404).send({ error: 'Job not found' });
        return;
      }

      reply.code(200).send({ job });
    } catch (error) {
      fastify.log.error(error, 'Failed to get job');
      reply.code(500).send({ error: 'Failed to get job' });
    }
  });

  /**
   * POST /fine-tuning/jobs/:jobId/cancel
   *
   * Cancel a running job.
   */
  fastify.post('/fine-tuning/jobs/:jobId/cancel', async (request, reply) => {
    const { jobId } = z.object({ jobId: z.string().uuid() }).parse(request.params);

    try {
      await manager.cancelJob(jobId);
      reply.code(200).send({ message: 'Job cancelled successfully' });
    } catch (error) {
      fastify.log.error(error, 'Failed to cancel job');
      reply.code(500).send({ error: (error as Error).message });
    }
  });

  /**
   * POST /fine-tuning/jobs/:jobId/deploy
   *
   * Deploy a completed job's model.
   */
  fastify.post('/fine-tuning/jobs/:jobId/deploy', async (request, reply) => {
    const { jobId } = z.object({ jobId: z.string().uuid() }).parse(request.params);

    try {
      const body = deployModelSchema.parse(request.body);

      const model = await manager.deployModel(jobId, body.displayName, body.description);

      reply.code(201).send({
        message: 'Model deployed successfully',
        model: {
          id: model.id,
          provider: model.provider,
          providerModelId: model.providerModelId,
          displayName: model.displayName,
          status: model.status,
          deployedAt: model.deployedAt,
        },
      });
    } catch (error) {
      fastify.log.error(error, 'Failed to deploy model');

      if (error instanceof z.ZodError) {
        reply.code(400).send({ error: 'Invalid request body', details: error.errors });
        return;
      }

      reply.code(500).send({ error: (error as Error).message });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Model Management
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * GET /fine-tuning/models
   *
   * List deployed models.
   */
  fastify.get('/fine-tuning/models', async (request, reply) => {
    try {
      const pagination = paginationSchema.parse(request.query);
      const filters = modelFilterSchema.parse(request.query);

      const { models, total } = await manager.listModels({
        status: filters.status,
        provider: filters.provider,
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit,
      });

      reply.code(200).send({
        data: models.map((model) => ({
          id: model.id,
          provider: model.provider,
          providerModelId: model.providerModelId,
          baseModel: model.baseModel,
          displayName: model.displayName,
          description: model.description,
          status: model.status,
          trainingExamples: model.trainingExamples,
          metrics: model.metrics,
          deployedAt: model.deployedAt,
          createdAt: model.createdAt,
        })),
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit),
        },
      });
    } catch (error) {
      fastify.log.error(error, 'Failed to list models');
      reply.code(500).send({ error: 'Failed to list models' });
    }
  });

  /**
   * POST /fine-tuning/models/:modelId/deprecate
   *
   * Deprecate a model.
   */
  fastify.post('/fine-tuning/models/:modelId/deprecate', async (request, reply) => {
    const { modelId } = z.object({ modelId: z.string().uuid() }).parse(request.params);

    try {
      await manager.deprecateModel(modelId);
      reply.code(200).send({ message: 'Model deprecated successfully' });
    } catch (error) {
      fastify.log.error(error, 'Failed to deprecate model');
      reply.code(500).send({ error: (error as Error).message });
    }
  });

  /**
   * DELETE /fine-tuning/models/:modelId
   *
   * Delete a model.
   */
  fastify.delete('/fine-tuning/models/:modelId', async (request, reply) => {
    const { modelId } = z.object({ modelId: z.string().uuid() }).parse(request.params);

    try {
      await manager.deleteModel(modelId);
      reply.code(200).send({ message: 'Model deleted successfully' });
    } catch (error) {
      fastify.log.error(error, 'Failed to delete model');
      reply.code(500).send({ error: (error as Error).message });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Training Data Stats
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * GET /fine-tuning/training-data/stats
   *
   * Get statistics about available training data.
   */
  fastify.get('/fine-tuning/training-data/stats', async (_request, reply) => {
    try {
      const statsQuery = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
          COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
          COUNT(*) FILTER (WHERE status = 'exported') as exported_count,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
          AVG(quality_score) as avg_quality,
          COUNT(DISTINCT agent_type) as agent_type_count,
          COUNT(DISTINCT task_category) as category_count
        FROM training_examples
      `);

      const byAgentQuery = await pool.query(`
        SELECT
          agent_type,
          COUNT(*) as count,
          AVG(quality_score) as avg_quality
        FROM training_examples
        WHERE status IN ('pending', 'approved')
        GROUP BY agent_type
        ORDER BY count DESC
      `);

      const stats = statsQuery.rows[0];

      reply.code(200).send({
        totals: {
          pending: parseInt(stats.pending_count) || 0,
          approved: parseInt(stats.approved_count) || 0,
          exported: parseInt(stats.exported_count) || 0,
          rejected: parseInt(stats.rejected_count) || 0,
          available: (parseInt(stats.pending_count) || 0) + (parseInt(stats.approved_count) || 0),
        },
        quality: {
          average: parseFloat(stats.avg_quality) || 0,
        },
        diversity: {
          agentTypes: parseInt(stats.agent_type_count) || 0,
          categories: parseInt(stats.category_count) || 0,
        },
        byAgentType: byAgentQuery.rows.map((row) => ({
          agentType: row.agent_type,
          count: parseInt(row.count),
          avgQuality: parseFloat(row.avg_quality),
        })),
      });
    } catch (error) {
      fastify.log.error(error, 'Failed to get training data stats');
      reply.code(500).send({ error: 'Failed to get training data stats' });
    }
  });

  /**
   * GET /fine-tuning/training-data/preview
   *
   * Preview training data that would be used for a job.
   */
  fastify.get('/fine-tuning/training-data/preview', async (request, reply) => {
    try {
      const querySchema = z.object({
        minQualityScore: z.coerce.number().min(0).max(1).optional(),
        agentTypes: z.string().optional(), // comma-separated
        limit: z.coerce.number().int().min(1).max(50).default(10),
      });

      const query = querySchema.parse(request.query);

      const conditions: string[] = ['status IN (\'pending\', \'approved\')'];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (query.minQualityScore !== undefined) {
        conditions.push(`quality_score >= $${paramIndex++}`);
        params.push(query.minQualityScore);
      }
      if (query.agentTypes) {
        conditions.push(`agent_type = ANY($${paramIndex++})`);
        params.push(query.agentTypes.split(','));
      }

      params.push(query.limit);

      const result = await pool.query(
        `
        SELECT
          id,
          agent_type,
          task_category,
          input_text,
          output_text,
          system_prompt,
          quality_score,
          human_validated
        FROM training_examples
        WHERE ${conditions.join(' AND ')}
        ORDER BY quality_score DESC
        LIMIT $${paramIndex}
      `,
        params
      );

      // Get total count
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM training_examples WHERE ${conditions.join(' AND ')}`,
        params.slice(0, -1)
      );

      reply.code(200).send({
        totalAvailable: parseInt(countResult.rows[0].count),
        preview: result.rows.map((row) => ({
          id: row.id,
          agentType: row.agent_type,
          taskCategory: row.task_category,
          inputPreview: row.input_text.substring(0, 200) + (row.input_text.length > 200 ? '...' : ''),
          outputPreview: row.output_text.substring(0, 200) + (row.output_text.length > 200 ? '...' : ''),
          hasSystemPrompt: !!row.system_prompt,
          qualityScore: parseFloat(row.quality_score),
          humanValidated: row.human_validated,
        })),
      });
    } catch (error) {
      fastify.log.error(error, 'Failed to preview training data');
      reply.code(500).send({ error: 'Failed to preview training data' });
    }
  });
};
