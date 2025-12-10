/**
 * Experimentation Service - Routes
 *
 * HTTP API for experiments, assignments, and exposures.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { computeAssignment } from './assignment.js';
import { upsertAssignment } from './assignmentRepository.js';
import { config } from './config.js';
import { getMainPool } from './db.js';
import { logExposure, getExposureStats, listExposures } from './exposureRepository.js';
import { isExperimentationEnabled } from './policy.js';
import {
  createExperiment,
  getExperimentByKey,
  getExperimentById,
  getExperimentWithVariants,
  listExperiments,
  updateExperimentStatus,
  getVariantsByExperimentId,
} from './repository.js';
import {
  CreateExperimentInputSchema,
  LogExposureInputSchema,
  AssignmentQuerySchema,
  type CreateExperimentInput,
  type LogExposureInput,
  type AssignmentQuery,
  type AssignmentResult,
} from './types.js';

// ════════════════════════════════════════════════════════════════════════════════
// EXPERIMENT ROUTES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Register experiment management routes.
 */
export async function registerExperimentRoutes(app: FastifyInstance): Promise<void> {
  const pool = getMainPool();

  // Create experiment
  app.post<{ Body: CreateExperimentInput }>(
    '/experiments',
    async (request: FastifyRequest<{ Body: CreateExperimentInput }>, reply: FastifyReply) => {
      try {
        const input = CreateExperimentInputSchema.parse(request.body);

        // Check for duplicate key
        const existing = await getExperimentByKey(pool, input.key);
        if (existing) {
          return reply.status(409).send({
            error: 'EXPERIMENT_EXISTS',
            message: `Experiment with key '${input.key}' already exists`,
          });
        }

        const experiment = await createExperiment(pool, input);
        return reply.status(201).send(experiment);
      } catch (error) {
        if (error instanceof Error && error.name === 'ZodError') {
          return reply.status(400).send({ error: 'VALIDATION_ERROR', details: error });
        }
        throw error;
      }
    }
  );

  // List experiments
  app.get('/experiments', async (_request, reply: FastifyReply) => {
    const experiments = await listExperiments(pool);
    return reply.send(experiments);
  });

  // Get experiment by key
  app.get<{ Params: { key: string } }>(
    '/experiments/:key',
    async (request: FastifyRequest<{ Params: { key: string } }>, reply: FastifyReply) => {
      const experiment = await getExperimentWithVariants(pool, request.params.key);
      if (!experiment) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Experiment not found' });
      }
      return reply.send(experiment);
    }
  );

  // Start experiment (DRAFT -> RUNNING)
  app.post<{ Params: { id: string } }>(
    '/experiments/:id/start',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const experiment = await getExperimentById(pool, request.params.id);
      if (!experiment) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Experiment not found' });
      }
      if (experiment.status !== 'DRAFT') {
        return reply.status(400).send({
          error: 'INVALID_STATE',
          message: `Cannot start experiment in '${experiment.status}' status`,
        });
      }

      const updated = await updateExperimentStatus(pool, request.params.id, 'RUNNING');
      return reply.send(updated);
    }
  );

  // Pause experiment (RUNNING -> PAUSED)
  app.post<{ Params: { id: string } }>(
    '/experiments/:id/pause',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const experiment = await getExperimentById(pool, request.params.id);
      if (!experiment) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Experiment not found' });
      }
      if (experiment.status !== 'RUNNING') {
        return reply.status(400).send({
          error: 'INVALID_STATE',
          message: `Cannot pause experiment in '${experiment.status}' status`,
        });
      }

      const updated = await updateExperimentStatus(pool, request.params.id, 'PAUSED');
      return reply.send(updated);
    }
  );

  // Resume experiment (PAUSED -> RUNNING)
  app.post<{ Params: { id: string } }>(
    '/experiments/:id/resume',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const experiment = await getExperimentById(pool, request.params.id);
      if (!experiment) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Experiment not found' });
      }
      if (experiment.status !== 'PAUSED') {
        return reply.status(400).send({
          error: 'INVALID_STATE',
          message: `Cannot resume experiment in '${experiment.status}' status`,
        });
      }

      const updated = await updateExperimentStatus(pool, request.params.id, 'RUNNING');
      return reply.send(updated);
    }
  );

  // Complete experiment
  app.post<{ Params: { id: string } }>(
    '/experiments/:id/complete',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const experiment = await getExperimentById(pool, request.params.id);
      if (!experiment) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Experiment not found' });
      }
      if (experiment.status === 'COMPLETED') {
        return reply.status(400).send({
          error: 'INVALID_STATE',
          message: 'Experiment is already completed',
        });
      }

      const updated = await updateExperimentStatus(pool, request.params.id, 'COMPLETED');
      return reply.send(updated);
    }
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// ASSIGNMENT ROUTES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Register assignment routes.
 */
export async function registerAssignmentRoutes(app: FastifyInstance): Promise<void> {
  const pool = getMainPool();

  // Get assignment for a specific experiment
  app.get<{ Params: { experimentKey: string }; Querystring: AssignmentQuery }>(
    '/assignment/:experimentKey',
    async (
      request: FastifyRequest<{ Params: { experimentKey: string }; Querystring: AssignmentQuery }>,
      reply: FastifyReply
    ) => {
      try {
        const query = AssignmentQuerySchema.parse(request.query);
        const { tenantId, learnerId, force } = query;

        // Get experiment
        const experiment = await getExperimentWithVariants(pool, request.params.experimentKey);
        if (!experiment) {
          return reply.status(404).send({
            error: 'NOT_FOUND',
            message: `Experiment '${request.params.experimentKey}' not found`,
          });
        }

        // Check policy
        const experimentationEnabled = await isExperimentationEnabled(tenantId);

        // Compute assignment
        const result = computeAssignment({
          experiment,
          variants: experiment.variants,
          tenantId,
          ...(learnerId && { learnerId }),
          experimentationEnabled,
          ...(force && { forceVariant: force }),
        });

        // Cache assignment if enabled
        if (config.assignment.cacheAssignments && result.assigned) {
          await upsertAssignment(
            pool,
            experiment.id,
            tenantId,
            learnerId,
            result.variantKey,
            result.reason
          );
        }

        return reply.send(result);
      } catch (error) {
        if (error instanceof Error && error.name === 'ZodError') {
          return reply.status(400).send({ error: 'VALIDATION_ERROR', details: error });
        }
        throw error;
      }
    }
  );

  // Batch assignment (get all running experiments for a subject)
  app.get<{ Querystring: AssignmentQuery }>(
    '/assignments',
    async (request: FastifyRequest<{ Querystring: AssignmentQuery }>, reply: FastifyReply) => {
      try {
        const query = AssignmentQuerySchema.parse(request.query);
        const { tenantId, learnerId } = query;

        // Check policy once for all experiments
        const experimentationEnabled = await isExperimentationEnabled(tenantId);

        // Get all running experiments
        const experiments = await listExperiments(pool, 'RUNNING');

        const assignments: AssignmentResult[] = [];
        for (const experiment of experiments) {
          const variants = await getVariantsByExperimentId(pool, experiment.id);

          const result = computeAssignment({
            experiment,
            variants,
            tenantId,
            ...(learnerId && { learnerId }),
            experimentationEnabled,
          });

          assignments.push(result);

          // Cache assignment if enabled
          if (config.assignment.cacheAssignments && result.assigned) {
            await upsertAssignment(
              pool,
              experiment.id,
              tenantId,
              learnerId,
              result.variantKey,
              result.reason
            );
          }
        }

        return reply.send({
          tenantId,
          learnerId,
          assignments,
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'ZodError') {
          return reply.status(400).send({ error: 'VALIDATION_ERROR', details: error });
        }
        throw error;
      }
    }
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPOSURE ROUTES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Register exposure logging routes.
 */
export async function registerExposureRoutes(app: FastifyInstance): Promise<void> {
  const pool = getMainPool();

  // Log exposure
  app.post<{ Body: LogExposureInput }>(
    '/exposures',
    async (request: FastifyRequest<{ Body: LogExposureInput }>, reply: FastifyReply) => {
      try {
        const input = LogExposureInputSchema.parse(request.body);

        // Get experiment
        const experiment = await getExperimentByKey(pool, input.experimentKey);
        if (!experiment) {
          return reply.status(404).send({
            error: 'NOT_FOUND',
            message: `Experiment '${input.experimentKey}' not found`,
          });
        }

        // Log exposure
        const exposure = await logExposure(pool, experiment.id, input);
        return reply.status(201).send(exposure);
      } catch (error) {
        if (error instanceof Error && error.name === 'ZodError') {
          return reply.status(400).send({ error: 'VALIDATION_ERROR', details: error });
        }
        throw error;
      }
    }
  );

  // Get exposure stats for an experiment
  app.get<{ Params: { experimentKey: string } }>(
    '/exposures/:experimentKey/stats',
    async (request: FastifyRequest<{ Params: { experimentKey: string } }>, reply: FastifyReply) => {
      const experiment = await getExperimentByKey(pool, request.params.experimentKey);
      if (!experiment) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Experiment not found' });
      }

      const stats = await getExposureStats(pool, experiment.id, experiment.key);
      return reply.send(stats);
    }
  );

  // List exposures for an experiment
  app.get<{ Params: { experimentKey: string }; Querystring: { limit?: string; offset?: string } }>(
    '/exposures/:experimentKey',
    async (
      request: FastifyRequest<{
        Params: { experimentKey: string };
        Querystring: { limit?: string; offset?: string };
      }>,
      reply: FastifyReply
    ) => {
      const experiment = await getExperimentByKey(pool, request.params.experimentKey);
      if (!experiment) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Experiment not found' });
      }

      const limit = parseInt(request.query.limit ?? '100', 10);
      const offset = parseInt(request.query.offset ?? '0', 10);

      const exposures = await listExposures(pool, experiment.id, limit, offset);
      return reply.send({
        experimentKey: experiment.key,
        exposures,
        pagination: { limit, offset, hasMore: exposures.length === limit },
      });
    }
  );
}
