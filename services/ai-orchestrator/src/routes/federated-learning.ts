/**
 * Federated Learning API Routes
 *
 * Provides endpoints for managing federated learning rounds,
 * tenant participation, and model distribution.
 */

import { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import type { Pool } from 'pg';
import type { Redis } from 'ioredis';
import { z } from 'zod';
import {
  FederatedAggregationServer,
  TenantLearningAgent,
  type FederatedModelType,
  type PrivacyLevel,
  PRIVACY_CONFIGS,
} from '../federated/index.js';

// ════════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ════════════════════════════════════════════════════════════════════════════════

const modelTypeSchema = z.enum([
  'prompt_embeddings',
  'prompt_effectiveness',
  'action_preferences',
  'pattern_weights',
]);

const privacyLevelSchema = z.enum(['standard', 'enhanced', 'maximum']);

const startRoundSchema = z.object({
  modelType: modelTypeSchema,
  minParticipants: z.number().int().min(2).default(3),
  maxParticipants: z.number().int().min(3).max(1000).default(100),
  minSamplesPerTenant: z.number().int().min(10).default(50),
  roundTimeoutHours: z.number().min(0.5).max(168).default(24),
  privacyLevel: privacyLevelSchema.default('standard'),
  aggregationMethod: z.enum(['fedavg', 'fedprox', 'scaffold']).default('fedavg'),
  learningRate: z.number().min(0.0001).max(1).default(0.01),
  selectionCriteria: z
    .object({
      minTrainingExamples: z.number().int().min(10).optional(),
      minDataQuality: z.number().min(0).max(1).optional(),
      minRecentActivity: z.number().int().min(1).optional(),
      tenantTypes: z.array(z.string()).optional(),
      excludeTenants: z.array(z.string().uuid()).optional(),
    })
    .optional(),
});

const tenantConfigSchema = z.object({
  enabled: z.boolean(),
  autoParticipate: z.boolean().default(false),
  privacyLevel: privacyLevelSchema.default('standard'),
  maxPrivacyBudget: z.number().min(1).max(1000).default(100),
  sharePatterns: z.boolean().default(true),
  shareEffectiveness: z.boolean().default(true),
  shareEmbeddings: z.boolean().default(false),
  enabledModelTypes: z.array(modelTypeSchema).default(['prompt_effectiveness', 'pattern_weights']),
  minLocalExamples: z.number().int().min(10).default(100),
  autoApplyUpdates: z.boolean().default(false),
  requireApproval: z.boolean().default(true),
});

const contributeSchema = z.object({
  roundId: z.string().uuid(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ════════════════════════════════════════════════════════════════════════════════
// ROUTES
// ════════════════════════════════════════════════════════════════════════════════

interface FederatedLearningRoutesOptions {
  pool: Pool;
  redis: Redis;
}

export const registerFederatedLearningRoutes: FastifyPluginAsync<FederatedLearningRoutesOptions> =
  async (fastify: FastifyInstance, opts) => {
    const { pool, redis } = opts;

    // Initialize server
    const server = new FederatedAggregationServer(pool, redis);

    // Set up event logging
    server.onEvent(async (event) => {
      fastify.log.info({ event }, 'Federated learning event');
    });

    // ──────────────────────────────────────────────────────────────────────────────
    // Round Management (Admin)
    // ──────────────────────────────────────────────────────────────────────────────

    /**
     * POST /federated/rounds
     *
     * Start a new federated learning round (admin only)
     */
    fastify.post('/federated/rounds', async (request, reply) => {
      try {
        const body = startRoundSchema.parse(request.body);

        const privacyConfig = PRIVACY_CONFIGS[body.privacyLevel];

        const round = await server.startRound(body.modelType as FederatedModelType, {
          minParticipants: body.minParticipants,
          maxParticipants: body.maxParticipants,
          minSamplesPerTenant: body.minSamplesPerTenant,
          roundTimeout: body.roundTimeoutHours * 3600000,
          privacyLevel: body.privacyLevel as PrivacyLevel,
          targetEpsilon: privacyConfig.epsilon,
          targetDelta: privacyConfig.delta,
          aggregationMethod: body.aggregationMethod,
          learningRate: body.learningRate,
          selectionCriteria: body.selectionCriteria,
        });

        reply.code(201).send({
          message: 'Federated learning round started',
          round: {
            roundId: round.config.roundId,
            modelType: round.config.modelType,
            status: round.status,
            eligibleTenants: round.eligibleTenants.length,
            deadline: round.config.collectionDeadline,
            startedAt: round.startedAt,
          },
        });
      } catch (error) {
        fastify.log.error(error, 'Failed to start federated round');

        if (error instanceof z.ZodError) {
          reply.code(400).send({ error: 'Invalid request', details: error.errors });
          return;
        }

        reply.code(500).send({ error: (error as Error).message });
      }
    });

    /**
     * GET /federated/rounds
     *
     * List federated learning rounds
     */
    fastify.get('/federated/rounds', async (request, reply) => {
      try {
        const query = paginationSchema.parse(request.query);
        const { page, limit } = query;
        const offset = (page - 1) * limit;

        const result = await pool.query(
          `
          SELECT
            round_id,
            model_type,
            status,
            config,
            ARRAY_LENGTH(eligible_tenants, 1) as eligible_count,
            ARRAY_LENGTH(participating_tenants, 1) as participant_count,
            contribution_count,
            distributed_count,
            started_at,
            completed_at,
            errors
          FROM federated_rounds
          ORDER BY started_at DESC
          LIMIT $1 OFFSET $2
        `,
          [limit, offset]
        );

        const countResult = await pool.query(`SELECT COUNT(*) FROM federated_rounds`);

        reply.code(200).send({
          data: result.rows.map((row: Record<string, unknown>) => ({
            roundId: row.round_id,
            modelType: row.model_type,
            status: row.status,
            eligibleTenants: (row.eligible_count as number) || 0,
            participatingTenants: (row.participant_count as number) || 0,
            contributions: (row.contribution_count as number) || 0,
            distributed: (row.distributed_count as number) || 0,
            startedAt: row.started_at,
            completedAt: row.completed_at,
            hasErrors: ((row.errors as unknown[]) || []).length > 0,
          })),
          pagination: {
            page,
            limit,
            total: parseInt(String((countResult.rows[0] as Record<string, unknown>).count)),
            totalPages: Math.ceil(parseInt(String((countResult.rows[0] as Record<string, unknown>).count)) / limit),
          },
        });
      } catch (error) {
        fastify.log.error(error, 'Failed to list rounds');
        reply.code(500).send({ error: 'Failed to list rounds' });
      }
    });

    /**
     * GET /federated/rounds/:roundId
     *
     * Get details of a specific round
     */
    fastify.get('/federated/rounds/:roundId', async (request, reply) => {
      const { roundId } = z.object({ roundId: z.string().uuid() }).parse(request.params);

      try {
        // Check active rounds first
        const activeRound = server.getRound(roundId);
        if (activeRound) {
          reply.code(200).send({
            roundId: activeRound.config.roundId,
            modelType: activeRound.config.modelType,
            status: activeRound.status,
            config: activeRound.config,
            eligibleTenants: activeRound.eligibleTenants.length,
            participatingTenants: activeRound.participatingTenants.length,
            contributions: activeRound.receivedContributions.size,
            distributed: activeRound.distributedTo.length,
            startedAt: activeRound.startedAt,
            errors: activeRound.errors,
          });
          return;
        }

        // Check database
        const result = await pool.query(
          `SELECT * FROM federated_rounds WHERE round_id = $1`,
          [roundId]
        );

        if (result.rows.length === 0) {
          reply.code(404).send({ error: 'Round not found' });
          return;
        }

        const row = result.rows[0] as Record<string, unknown>;
        reply.code(200).send({
          roundId: row.round_id,
          modelType: row.model_type,
          status: row.status,
          config: row.config,
          eligibleTenants: ((row.eligible_tenants as unknown[]) || []).length,
          participatingTenants: ((row.participating_tenants as unknown[]) || []).length,
          contributions: (row.contribution_count as number) || 0,
          distributed: (row.distributed_count as number) || 0,
          startedAt: row.started_at,
          completedAt: row.completed_at,
          errors: (row.errors as unknown[]) || [],
        });
      } catch (error) {
        fastify.log.error(error, 'Failed to get round');
        reply.code(500).send({ error: 'Failed to get round' });
      }
    });

    // ──────────────────────────────────────────────────────────────────────────────
    // Tenant Participation
    // ──────────────────────────────────────────────────────────────────────────────

    /**
     * GET /federated/tenant/config
     *
     * Get tenant's federated learning configuration
     */
    fastify.get('/federated/tenant/config', async (request, reply) => {
      // In a real implementation, tenantId would come from auth context
      const tenantId = (request.headers['x-tenant-id'] as string | undefined) ?? 'default';

      try {
        const result = await pool.query(
          `SELECT * FROM tenant_federated_config WHERE tenant_id = $1`,
          [tenantId]
        );

        if (result.rows.length === 0) {
          reply.code(200).send({
            tenantId,
            enabled: false,
            configured: false,
          });
          return;
        }

        const row = result.rows[0] as Record<string, unknown>;
        reply.code(200).send({
          tenantId: row.tenant_id,
          enabled: row.enabled,
          autoParticipate: row.auto_participate,
          privacyLevel: row.privacy_level,
          maxPrivacyBudget: parseFloat(String(row.max_privacy_budget)),
          currentPrivacyBudget: parseFloat(String(row.current_privacy_budget)),
          remainingBudget:
            parseFloat(String(row.max_privacy_budget)) - parseFloat(String(row.current_privacy_budget)),
          sharePatterns: row.share_patterns,
          shareEffectiveness: row.share_effectiveness,
          shareEmbeddings: row.share_embeddings,
          enabledModelTypes: row.enabled_model_types,
          minLocalExamples: row.min_local_examples,
          autoApplyUpdates: row.auto_apply_updates,
          requireApproval: row.require_approval,
          configured: true,
        });
      } catch (error) {
        fastify.log.error(error, 'Failed to get tenant config');
        reply.code(500).send({ error: 'Failed to get tenant config' });
      }
    });

    /**
     * PUT /federated/tenant/config
     *
     * Update tenant's federated learning configuration
     */
    fastify.put('/federated/tenant/config', async (request, reply) => {
      const tenantId = (request.headers['x-tenant-id'] as string | undefined) ?? 'default';

      try {
        const body = tenantConfigSchema.parse(request.body);

        await pool.query(
          `
          INSERT INTO tenant_federated_config (
            tenant_id, enabled, auto_participate, privacy_level,
            max_privacy_budget, share_patterns, share_effectiveness,
            share_embeddings, enabled_model_types, min_local_examples,
            auto_apply_updates, require_approval
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (tenant_id)
          DO UPDATE SET
            enabled = EXCLUDED.enabled,
            auto_participate = EXCLUDED.auto_participate,
            privacy_level = EXCLUDED.privacy_level,
            max_privacy_budget = EXCLUDED.max_privacy_budget,
            share_patterns = EXCLUDED.share_patterns,
            share_effectiveness = EXCLUDED.share_effectiveness,
            share_embeddings = EXCLUDED.share_embeddings,
            enabled_model_types = EXCLUDED.enabled_model_types,
            min_local_examples = EXCLUDED.min_local_examples,
            auto_apply_updates = EXCLUDED.auto_apply_updates,
            require_approval = EXCLUDED.require_approval,
            updated_at = NOW()
        `,
          [
            tenantId,
            body.enabled,
            body.autoParticipate,
            body.privacyLevel,
            body.maxPrivacyBudget,
            body.sharePatterns,
            body.shareEffectiveness,
            body.shareEmbeddings,
            body.enabledModelTypes,
            body.minLocalExamples,
            body.autoApplyUpdates,
            body.requireApproval,
          ]
        );

        reply.code(200).send({ message: 'Configuration updated successfully' });
      } catch (error) {
        fastify.log.error(error, 'Failed to update tenant config');

        if (error instanceof z.ZodError) {
          reply.code(400).send({ error: 'Invalid configuration', details: error.errors });
          return;
        }

        reply.code(500).send({ error: 'Failed to update configuration' });
      }
    });

    /**
     * POST /federated/tenant/contribute
     *
     * Contribute to an active round
     */
    fastify.post('/federated/tenant/contribute', async (request, reply) => {
      const tenantId = (request.headers['x-tenant-id'] as string | undefined) ?? 'default';

      try {
        const body = contributeSchema.parse(request.body);

        // Get the round
        const round = server.getRound(body.roundId);
        if (!round) {
          reply.code(404).send({ error: 'Round not found or not active' });
          return;
        }

        // Create tenant agent
        const agent = new TenantLearningAgent(pool, redis, tenantId);
        await agent.loadConfiguration();

        // Check eligibility
        const eligibility = await agent.checkEligibility(round.config);
        if (!eligibility.eligible) {
          reply.code(403).send({
            error: 'Not eligible to participate',
            reason: eligibility.reason,
          });
          return;
        }

        // Train local model
        const localModel = await agent.trainLocalModel(round.config);

        // Compute gradient update
        const contribution = await agent.computeGradientUpdate(round.config, localModel);

        // Submit contribution
        const accepted = await server.receiveContribution(contribution);

        if (!accepted) {
          reply.code(400).send({ error: 'Contribution not accepted' });
          return;
        }

        reply.code(200).send({
          message: 'Contribution submitted successfully',
          roundId: body.roundId,
          sampleWeight: contribution.sampleWeight,
          privacyEpsilonUsed: contribution.privacyEpsilon,
          remainingBudget: agent.getRemainingPrivacyBudget(),
        });
      } catch (error) {
        fastify.log.error(error, 'Failed to contribute');
        reply.code(500).send({ error: (error as Error).message });
      }
    });

    /**
     * GET /federated/tenant/participation
     *
     * Get tenant's participation history
     */
    fastify.get('/federated/tenant/participation', async (request, reply) => {
      const tenantId = (request.headers['x-tenant-id'] as string | undefined) ?? 'default';
      const query = paginationSchema.parse(request.query);

      try {
        const result = await pool.query(
          `
          SELECT
            fr.round_id,
            fr.model_type,
            fr.status as round_status,
            fr.started_at,
            fr.completed_at,
            tp.contributed,
            tp.sample_weight,
            tp.privacy_epsilon_used,
            tp.local_metrics
          FROM federated_rounds fr
          JOIN tenant_participation tp ON tp.round_id = fr.round_id
          WHERE tp.tenant_id = $1
          ORDER BY fr.started_at DESC
          LIMIT $2 OFFSET $3
        `,
          [tenantId, query.limit, (query.page - 1) * query.limit]
        );

        const countResult = await pool.query(
          `SELECT COUNT(*) FROM tenant_participation WHERE tenant_id = $1`,
          [tenantId]
        );

        reply.code(200).send({
          data: result.rows.map((row: Record<string, unknown>) => ({
            roundId: row.round_id,
            modelType: row.model_type,
            roundStatus: row.round_status,
            contributed: row.contributed,
            sampleWeight: row.sample_weight,
            privacyEpsilonUsed: parseFloat(String(row.privacy_epsilon_used)),
            localMetrics: row.local_metrics,
            startedAt: row.started_at,
            completedAt: row.completed_at,
          })),
          pagination: {
            page: query.page,
            limit: query.limit,
            total: parseInt(String((countResult.rows[0] as Record<string, unknown>).count)),
            totalPages: Math.ceil(parseInt(String((countResult.rows[0] as Record<string, unknown>).count)) / query.limit),
          },
        });
      } catch (error) {
        fastify.log.error(error, 'Failed to get participation history');
        reply.code(500).send({ error: 'Failed to get participation history' });
      }
    });

    // ──────────────────────────────────────────────────────────────────────────────
    // Models
    // ──────────────────────────────────────────────────────────────────────────────

    /**
     * GET /federated/models
     *
     * List aggregated federated models
     */
    fastify.get('/federated/models', async (request, reply) => {
      const query = paginationSchema.parse(request.query);
      const filterSchema = z.object({
        modelType: modelTypeSchema.optional(),
      });
      const filters = filterSchema.parse(request.query);

      try {
        let whereClause = '';
        const params: unknown[] = [];
        let paramIndex = 1;

        if (filters.modelType) {
          whereClause = `WHERE model_type = $${paramIndex++}`;
          params.push(filters.modelType);
        }

        params.push(query.limit, (query.page - 1) * query.limit);

        const result = await pool.query(
          `
          SELECT
            id,
            round_id,
            model_type,
            version,
            contributing_tenants,
            total_samples,
            privacy_epsilon,
            metrics,
            aggregated_at
          FROM federated_models
          ${whereClause}
          ORDER BY aggregated_at DESC
          LIMIT $${paramIndex++} OFFSET $${paramIndex}
        `,
          params
        );

        const countResult = await pool.query(
          `SELECT COUNT(*) FROM federated_models ${whereClause}`,
          params.slice(0, -2)
        );

        reply.code(200).send({
          data: result.rows.map((row: Record<string, unknown>) => ({
            id: row.id,
            roundId: row.round_id,
            modelType: row.model_type,
            version: row.version,
            contributingTenants: row.contributing_tenants,
            totalSamples: row.total_samples,
            privacyEpsilon: parseFloat(String(row.privacy_epsilon)),
            metrics: row.metrics,
            aggregatedAt: row.aggregated_at,
          })),
          pagination: {
            page: query.page,
            limit: query.limit,
            total: parseInt(String((countResult.rows[0] as Record<string, unknown>).count)),
            totalPages: Math.ceil(parseInt(String((countResult.rows[0] as Record<string, unknown>).count)) / query.limit),
          },
        });
      } catch (error) {
        fastify.log.error(error, 'Failed to list models');
        reply.code(500).send({ error: 'Failed to list models' });
      }
    });

    /**
     * GET /federated/models/latest
     *
     * Get the latest model for each type
     */
    fastify.get('/federated/models/latest', async (_request, reply) => {
      try {
        const result = await pool.query(`
          SELECT DISTINCT ON (model_type)
            id,
            round_id,
            model_type,
            version,
            contributing_tenants,
            total_samples,
            privacy_epsilon,
            metrics,
            aggregated_at
          FROM federated_models
          ORDER BY model_type, version DESC
        `);

        reply.code(200).send({
          models: result.rows.map((row: Record<string, unknown>) => ({
            id: row.id,
            roundId: row.round_id,
            modelType: row.model_type,
            version: row.version,
            contributingTenants: row.contributing_tenants,
            totalSamples: row.total_samples,
            privacyEpsilon: parseFloat(String(row.privacy_epsilon)),
            metrics: row.metrics,
            aggregatedAt: row.aggregated_at,
          })),
        });
      } catch (error) {
        fastify.log.error(error, 'Failed to get latest models');
        reply.code(500).send({ error: 'Failed to get latest models' });
      }
    });

    // ──────────────────────────────────────────────────────────────────────────────
    // Statistics
    // ──────────────────────────────────────────────────────────────────────────────

    /**
     * GET /federated/stats
     *
     * Get federated learning statistics
     */
    fastify.get('/federated/stats', async (_request, reply) => {
      try {
        const [roundStats, tenantStats, modelStats] = await Promise.all([
          pool.query(`
            SELECT
              COUNT(*) as total_rounds,
              COUNT(*) FILTER (WHERE status = 'completed') as completed_rounds,
              COUNT(*) FILTER (WHERE status = 'failed') as failed_rounds,
              AVG(contribution_count) as avg_contributions,
              SUM(distributed_count) as total_distributions
            FROM federated_rounds
          `),
          pool.query(`
            SELECT
              COUNT(*) as total_tenants,
              COUNT(*) FILTER (WHERE enabled = true) as enabled_tenants,
              COUNT(*) FILTER (WHERE auto_participate = true) as auto_participate_tenants,
              AVG(current_privacy_budget) as avg_privacy_used,
              AVG(max_privacy_budget - current_privacy_budget) as avg_privacy_remaining
            FROM tenant_federated_config
          `),
          pool.query(`
            SELECT
              COUNT(*) as total_models,
              COUNT(DISTINCT model_type) as model_types,
              SUM(total_samples) as total_training_samples,
              AVG(contributing_tenants) as avg_contributors
            FROM federated_models
          `),
        ]);

        const rounds = (roundStats.rows[0] || {}) as Record<string, unknown>;
        const tenants = (tenantStats.rows[0] || {}) as Record<string, unknown>;
        const models = (modelStats.rows[0] || {}) as Record<string, unknown>;

        reply.code(200).send({
          rounds: {
            total: parseInt(String(rounds.total_rounds)) || 0,
            completed: parseInt(String(rounds.completed_rounds)) || 0,
            failed: parseInt(String(rounds.failed_rounds)) || 0,
            avgContributions: parseFloat(String(rounds.avg_contributions)) || 0,
            totalDistributions: parseInt(String(rounds.total_distributions)) || 0,
          },
          tenants: {
            total: parseInt(String(tenants.total_tenants)) || 0,
            enabled: parseInt(String(tenants.enabled_tenants)) || 0,
            autoParticipate: parseInt(String(tenants.auto_participate_tenants)) || 0,
            avgPrivacyUsed: parseFloat(String(tenants.avg_privacy_used)) || 0,
            avgPrivacyRemaining: parseFloat(String(tenants.avg_privacy_remaining)) || 0,
          },
          models: {
            total: parseInt(String(models.total_models)) || 0,
            types: parseInt(String(models.model_types)) || 0,
            totalTrainingSamples: parseInt(String(models.total_training_samples)) || 0,
            avgContributors: parseFloat(String(models.avg_contributors)) || 0,
          },
          activeRounds: server.getActiveRounds().length,
        });
      } catch (error) {
        fastify.log.error(error, 'Failed to get stats');
        reply.code(500).send({ error: 'Failed to get statistics' });
      }
    });
  };
