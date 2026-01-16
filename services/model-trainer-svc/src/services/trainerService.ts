/**
 * AIVO Model Trainer Service - Core Training Service
 */

import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// DATASETS
// ══════════════════════════════════════════════════════════════════════════════

export async function createDataset(tenantId: string, userId: string, input: any) {
  return prisma.trainingDataset.create({
    data: {
      tenantId,
      name: input.name,
      description: input.description,
      version: input.version || '1.0.0',
      sourceType: input.sourceType,
      sourcePath: input.sourcePath,
      sourceConfig: input.sourceConfig,
      schema: input.schema,
      features: input.features || [],
      targetColumn: input.targetColumn,
      trainSplit: input.trainSplit ?? 0.8,
      validationSplit: input.validationSplit ?? 0.1,
      testSplit: input.testSplit ?? 0.1,
      splitSeed: input.splitSeed,
      preprocessingPipeline: input.preprocessingPipeline,
      status: 'PENDING',
      createdBy: userId,
    },
  });
}

export async function getDataset(tenantId: string, datasetId: string) {
  return prisma.trainingDataset.findFirst({ where: { id: datasetId, tenantId } });
}

export async function listDatasets(tenantId: string, options: any = {}) {
  const { status, page = 1, pageSize = 20 } = options;
  const where = { tenantId, ...(status && { status }) };
  const skip = (page - 1) * pageSize;
  const [datasets, totalItems] = await Promise.all([
    prisma.trainingDataset.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
    prisma.trainingDataset.count({ where }),
  ]);
  return { data: datasets, pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) } };
}

export async function validateDataset(tenantId: string, datasetId: string) {
  // In production, this would trigger async validation
  return prisma.trainingDataset.update({
    where: { id: datasetId },
    data: { status: 'READY', validatedAt: new Date() },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPERIMENTS
// ══════════════════════════════════════════════════════════════════════════════

export async function createExperiment(tenantId: string, userId: string, input: any) {
  return prisma.experiment.create({
    data: {
      tenantId,
      name: input.name,
      description: input.description,
      hypothesis: input.hypothesis,
      objective: input.objective,
      primaryMetric: input.primaryMetric,
      optimizeDirection: input.optimizeDirection || 'maximize',
      tags: input.tags || [],
      projectId: input.projectId,
      status: 'ACTIVE',
      createdBy: userId,
    },
  });
}

export async function getExperiment(tenantId: string, experimentId: string) {
  return prisma.experiment.findFirst({
    where: { id: experimentId, tenantId },
    include: {
      jobs: { orderBy: { createdAt: 'desc' }, take: 10, include: { _count: { select: { runs: true } } } },
    },
  });
}

export async function listExperiments(tenantId: string, options: any = {}) {
  const { status, page = 1, pageSize = 20 } = options;
  const where = { tenantId, ...(status && { status }) };
  const skip = (page - 1) * pageSize;
  const [experiments, totalItems] = await Promise.all([
    prisma.experiment.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: pageSize, include: { _count: { select: { jobs: true } } } }),
    prisma.experiment.count({ where }),
  ]);
  return { data: experiments, pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) } };
}

// ══════════════════════════════════════════════════════════════════════════════
// TRAINING JOBS
// ══════════════════════════════════════════════════════════════════════════════

export async function createJob(tenantId: string, userId: string, input: any) {
  const job = await prisma.trainingJob.create({
    data: {
      tenantId,
      name: input.name,
      description: input.description,
      experimentId: input.experimentId,
      datasetId: input.datasetId,
      modelType: input.modelType,
      modelArchitecture: input.modelArchitecture,
      baseModelId: input.baseModelId,
      framework: input.framework,
      frameworkVersion: input.frameworkVersion,
      trainingConfig: input.trainingConfig,
      computeType: input.computeType || 'GPU_SINGLE',
      instanceType: input.instanceType,
      instanceCount: input.instanceCount ?? 1,
      maxRuntimeHours: input.maxRuntimeHours ?? 24,
      priority: input.priority ?? 0,
      status: 'PENDING',
      createdBy: userId,
    },
  });

  // Create default hyperparameter config
  if (input.hyperparameters) {
    await prisma.hyperparameterConfig.create({
      data: { jobId: job.id, name: 'default', parameters: input.hyperparameters, isDefault: true },
    });
  }

  return getJob(tenantId, job.id);
}

export async function getJob(tenantId: string, jobId: string) {
  return prisma.trainingJob.findFirst({
    where: { id: jobId, tenantId },
    include: {
      dataset: { select: { name: true, version: true } },
      experiment: { select: { name: true } },
      hyperparameterConfigs: true,
      runs: { orderBy: { runNumber: 'desc' }, take: 5 },
      _count: { select: { runs: true } },
    },
  });
}

export async function listJobs(tenantId: string, options: any = {}) {
  const { experimentId, status, page = 1, pageSize = 20 } = options;
  const where = { tenantId, ...(experimentId && { experimentId }), ...(status && { status }) };
  const skip = (page - 1) * pageSize;
  const [jobs, totalItems] = await Promise.all([
    prisma.trainingJob.findMany({
      where, orderBy: { createdAt: 'desc' }, skip, take: pageSize,
      include: { dataset: { select: { name: true } }, _count: { select: { runs: true } } },
    }),
    prisma.trainingJob.count({ where }),
  ]);
  return { data: jobs, pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) } };
}

export async function startJob(tenantId: string, jobId: string) {
  const job = await prisma.trainingJob.findFirst({ where: { id: jobId, tenantId } });
  if (!job) throw new Error('Job not found');
  if (job.status !== 'PENDING') throw new Error('Job is not in pending status');

  // Create a new run
  const runCount = await prisma.trainingRun.count({ where: { jobId } });
  const run = await prisma.trainingRun.create({
    data: { tenantId, jobId, runNumber: runCount + 1, status: 'PENDING' },
  });

  // Queue the run
  await prisma.jobQueue.create({
    data: { tenantId, runId: run.id, jobId, priority: job.priority, requestedResources: { computeType: job.computeType, instanceType: job.instanceType } },
  });

  await prisma.trainingJob.update({ where: { id: jobId }, data: { status: 'QUEUED' } });
  return run;
}

export async function cancelJob(tenantId: string, jobId: string) {
  const job = await prisma.trainingJob.findFirst({ where: { id: jobId, tenantId } });
  if (!job) throw new Error('Job not found');

  await Promise.all([
    prisma.trainingJob.update({ where: { id: jobId }, data: { status: 'CANCELLED' } }),
    prisma.trainingRun.updateMany({ where: { jobId, status: { in: ['PENDING', 'INITIALIZING', 'TRAINING'] } }, data: { status: 'CANCELLED' } }),
    prisma.jobQueue.updateMany({ where: { jobId, status: 'WAITING' }, data: { status: 'CANCELLED' } }),
  ]);

  return getJob(tenantId, jobId);
}

// ══════════════════════════════════════════════════════════════════════════════
// TRAINING RUNS
// ══════════════════════════════════════════════════════════════════════════════

export async function getRun(tenantId: string, runId: string) {
  return prisma.trainingRun.findFirst({
    where: { id: runId, tenantId },
    include: {
      job: { select: { name: true, modelType: true, framework: true } },
      hyperparams: true,
      checkpoints: { orderBy: { epoch: 'desc' }, take: 5 },
      metrics: { orderBy: { epoch: 'desc' }, take: 50 },
    },
  });
}

export async function updateRunStatus(runId: string, status: string, updates: any = {}) {
  const data: any = { status, ...updates };
  if (status === 'TRAINING' && !updates.startedAt) data.startedAt = new Date();
  if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(status) && !updates.completedAt) {
    data.completedAt = new Date();
    const run = await prisma.trainingRun.findUnique({ where: { id: runId } });
    if (run?.startedAt) data.durationSeconds = Math.floor((Date.now() - run.startedAt.getTime()) / 1000);
  }
  return prisma.trainingRun.update({ where: { id: runId }, data });
}

export async function recordMetric(runId: string, input: any) {
  return prisma.trainingMetric.create({
    data: { runId, epoch: input.epoch, step: input.step, metricName: input.metricName, metricValue: input.metricValue, phase: input.phase || 'TRAIN' },
  });
}

export async function recordMetrics(runId: string, metrics: any[]) {
  return prisma.trainingMetric.createMany({
    data: metrics.map((m) => ({ runId, epoch: m.epoch, step: m.step, metricName: m.metricName, metricValue: m.metricValue, phase: m.phase || 'TRAIN' })),
  });
}

export async function createCheckpoint(runId: string, input: any) {
  // Unset previous best if this is best
  if (input.isBest) {
    await prisma.checkpoint.updateMany({ where: { runId, isBest: true }, data: { isBest: false } });
  }
  return prisma.checkpoint.create({
    data: { runId, epoch: input.epoch, step: input.step, checkpointPath: input.checkpointPath, sizeBytes: input.sizeBytes, metrics: input.metrics, isBest: input.isBest ?? false, isFinal: input.isFinal ?? false },
  });
}

export async function getRunMetrics(runId: string, metricName?: string) {
  return prisma.trainingMetric.findMany({
    where: { runId, ...(metricName && { metricName }) },
    orderBy: [{ epoch: 'asc' }, { step: 'asc' }],
  });
}

export async function logTraining(runId: string, level: string, message: string, context?: any) {
  return prisma.trainingLog.create({ data: { runId, level: level as any, message, context } });
}

// ══════════════════════════════════════════════════════════════════════════════
// HYPERPARAMETER TUNING
// ══════════════════════════════════════════════════════════════════════════════

export async function createHyperparameterConfig(tenantId: string, jobId: string, input: any) {
  const job = await prisma.trainingJob.findFirst({ where: { id: jobId, tenantId } });
  if (!job) throw new Error('Job not found');

  return prisma.hyperparameterConfig.create({
    data: { jobId, name: input.name, parameters: input.parameters, searchSpace: input.searchSpace, searchStrategy: input.searchStrategy, maxTrials: input.maxTrials, isDefault: input.isDefault ?? false },
  });
}

export async function startHPOSearch(tenantId: string, jobId: string, configId: string) {
  const config = await prisma.hyperparameterConfig.findFirst({ where: { id: configId, job: { id: jobId, tenantId } } });
  if (!config || !config.searchSpace) throw new Error('HPO config not found or no search space defined');

  // In production, this would launch multiple runs with different hyperparameters
  const trials = config.maxTrials || 10;
  const runs: any[] = [];

  for (let i = 0; i < trials; i++) {
    const runCount = await prisma.trainingRun.count({ where: { jobId } });
    const run = await prisma.trainingRun.create({
      data: { tenantId, jobId, runNumber: runCount + 1, hyperparamsId: configId, status: 'PENDING' },
    });
    runs.push(run);
  }

  return { configId, trials, runs };
}

// ══════════════════════════════════════════════════════════════════════════════
// RESOURCE MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

export async function getQuota(tenantId: string) {
  return prisma.resourceQuota.upsert({
    where: { tenantId },
    create: { tenantId },
    update: {},
  });
}

export async function updateQuotaUsage(tenantId: string, gpuHours: number, storageBytes: bigint) {
  return prisma.resourceQuota.upsert({
    where: { tenantId },
    create: { tenantId, gpuHoursUsed: gpuHours, storageUsed: storageBytes },
    update: { gpuHoursUsed: { increment: gpuHours }, storageUsed: { increment: storageBytes } },
  });
}

export async function getQueueStatus(tenantId: string) {
  const [waiting, running] = await Promise.all([
    prisma.jobQueue.count({ where: { tenantId, status: 'WAITING' } }),
    prisma.jobQueue.count({ where: { tenantId, status: { in: ['ALLOCATED', 'STARTED'] } } }),
  ]);
  return { waiting, running };
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

export async function getDashboard(tenantId: string) {
  const [
    totalExperiments,
    activeJobs,
    jobsByStatus,
    recentRuns,
    quota,
    queueStatus,
  ] = await Promise.all([
    prisma.experiment.count({ where: { tenantId } }),
    prisma.trainingJob.count({ where: { tenantId, status: { in: ['QUEUED', 'RUNNING'] } } }),
    prisma.trainingJob.groupBy({ by: ['status'], where: { tenantId }, _count: { status: true } }),
    prisma.trainingRun.findMany({
      where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 10,
      select: { id: true, runNumber: true, status: true, startedAt: true, completedAt: true, bestMetricValue: true, job: { select: { name: true } } },
    }),
    getQuota(tenantId),
    getQueueStatus(tenantId),
  ]);

  return {
    totalExperiments,
    activeJobs,
    jobsByStatus: Object.fromEntries(jobsByStatus.map((j) => [j.status, j._count.status])),
    recentRuns,
    quota,
    queue: queueStatus,
  };
}
