/**
 * AIVO Model Trainer Service - Routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as trainerService from '../services/trainerService.js';

export default async function routes(fastify: FastifyInstance): Promise<void> {
  // Dashboard
  fastify.get('/dashboard', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    return reply.send(await trainerService.getDashboard(tenantId));
  });

  // Datasets
  fastify.get('/datasets', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    return reply.send(await trainerService.listDatasets(tenantId, req.query));
  });

  fastify.post('/datasets', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const dataset = await trainerService.createDataset(tenantId, userId, req.body);
    return reply.status(201).send(dataset);
  });

  fastify.get('/datasets/:datasetId', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const { datasetId } = req.params as { datasetId: string };
    const dataset = await trainerService.getDataset(tenantId, datasetId);
    if (!dataset) return reply.status(404).send({ error: 'Dataset not found' });
    return reply.send(dataset);
  });

  fastify.post('/datasets/:datasetId/validate', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const { datasetId } = req.params as { datasetId: string };
    const dataset = await trainerService.validateDataset(tenantId, datasetId);
    return reply.send(dataset);
  });

  // Experiments
  fastify.get('/experiments', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    return reply.send(await trainerService.listExperiments(tenantId, req.query));
  });

  fastify.post('/experiments', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const experiment = await trainerService.createExperiment(tenantId, userId, req.body);
    return reply.status(201).send(experiment);
  });

  fastify.get('/experiments/:experimentId', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const { experimentId } = req.params as { experimentId: string };
    const experiment = await trainerService.getExperiment(tenantId, experimentId);
    if (!experiment) return reply.status(404).send({ error: 'Experiment not found' });
    return reply.send(experiment);
  });

  // Jobs
  fastify.get('/jobs', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    return reply.send(await trainerService.listJobs(tenantId, req.query));
  });

  fastify.post('/jobs', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const job = await trainerService.createJob(tenantId, userId, req.body);
    return reply.status(201).send(job);
  });

  fastify.get('/jobs/:jobId', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const { jobId } = req.params as { jobId: string };
    const job = await trainerService.getJob(tenantId, jobId);
    if (!job) return reply.status(404).send({ error: 'Job not found' });
    return reply.send(job);
  });

  fastify.post('/jobs/:jobId/start', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const { jobId } = req.params as { jobId: string };
    try {
      const run = await trainerService.startJob(tenantId, jobId);
      return reply.send(run);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  fastify.post('/jobs/:jobId/cancel', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const { jobId } = req.params as { jobId: string };
    const job = await trainerService.cancelJob(tenantId, jobId);
    return reply.send(job);
  });

  // Hyperparameter configs
  fastify.post('/jobs/:jobId/hyperparameters', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const { jobId } = req.params as { jobId: string };
    const config = await trainerService.createHyperparameterConfig(tenantId, jobId, req.body);
    return reply.status(201).send(config);
  });

  fastify.post('/jobs/:jobId/hyperparameters/:configId/search', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const { jobId, configId } = req.params as { jobId: string; configId: string };
    try {
      const result = await trainerService.startHPOSearch(tenantId, jobId, configId);
      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // Runs
  fastify.get('/runs/:runId', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const { runId } = req.params as { runId: string };
    const run = await trainerService.getRun(tenantId, runId);
    if (!run) return reply.status(404).send({ error: 'Run not found' });
    return reply.send(run);
  });

  fastify.get('/runs/:runId/metrics', async (req: FastifyRequest, reply: FastifyReply) => {
    const { runId } = req.params as { runId: string };
    const { metricName } = req.query as { metricName?: string };
    return reply.send(await trainerService.getRunMetrics(runId, metricName));
  });

  fastify.post('/runs/:runId/metrics', async (req: FastifyRequest, reply: FastifyReply) => {
    const { runId } = req.params as { runId: string };
    const metrics = Array.isArray(req.body) ? req.body : [req.body];
    if (metrics.length === 1) {
      const metric = await trainerService.recordMetric(runId, metrics[0]);
      return reply.status(201).send(metric);
    }
    await trainerService.recordMetrics(runId, metrics);
    return reply.status(201).send({ recorded: metrics.length });
  });

  fastify.post('/runs/:runId/checkpoints', async (req: FastifyRequest, reply: FastifyReply) => {
    const { runId } = req.params as { runId: string };
    const checkpoint = await trainerService.createCheckpoint(runId, req.body);
    return reply.status(201).send(checkpoint);
  });

  fastify.post('/runs/:runId/logs', async (req: FastifyRequest, reply: FastifyReply) => {
    const { runId } = req.params as { runId: string };
    const { level, message, context } = req.body as any;
    const log = await trainerService.logTraining(runId, level, message, context);
    return reply.status(201).send(log);
  });

  fastify.put('/runs/:runId/status', async (req: FastifyRequest, reply: FastifyReply) => {
    const { runId } = req.params as { runId: string };
    const { status, ...updates } = req.body as any;
    const run = await trainerService.updateRunStatus(runId, status, updates);
    return reply.send(run);
  });

  // Quota
  fastify.get('/quota', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    return reply.send(await trainerService.getQuota(tenantId));
  });

  fastify.get('/queue', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    return reply.send(await trainerService.getQueueStatus(tenantId));
  });
}
