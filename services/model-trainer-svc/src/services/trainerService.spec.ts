/**
 * Model Trainer Service Unit Tests
 *
 * Tests for ML training pipeline: datasets, experiments, jobs,
 * training runs, metrics, checkpoints, and resource management.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ══════════════════════════════════════════════════════════════════════════════
// MOCK TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface TrainingDataset {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  version: string;
  sourceType: 'S3' | 'GCS' | 'AZURE_BLOB' | 'LOCAL';
  sourcePath: string;
  schema?: Record<string, unknown>;
  features: string[];
  targetColumn?: string;
  trainSplit: number;
  validationSplit: number;
  testSplit: number;
  status: 'PENDING' | 'VALIDATING' | 'READY' | 'ERROR';
  createdBy: string;
  createdAt: Date;
}

interface Experiment {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  hypothesis?: string;
  objective?: string;
  primaryMetric: string;
  optimizeDirection: 'maximize' | 'minimize';
  tags: string[];
  projectId?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  createdBy: string;
}

interface TrainingJob {
  id: string;
  tenantId: string;
  name: string;
  experimentId?: string;
  datasetId: string;
  modelType: string;
  modelArchitecture?: string;
  framework: 'PYTORCH' | 'TENSORFLOW' | 'SKLEARN' | 'XGBOOST';
  computeType: 'CPU' | 'GPU_SINGLE' | 'GPU_MULTI' | 'DISTRIBUTED';
  instanceType?: string;
  instanceCount: number;
  maxRuntimeHours: number;
  priority: number;
  status: 'PENDING' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  createdBy: string;
}

interface TrainingRun {
  id: string;
  tenantId: string;
  jobId: string;
  runNumber: number;
  hyperparamsId?: string;
  status: 'PENDING' | 'INITIALIZING' | 'TRAINING' | 'EVALUATING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  startedAt?: Date;
  completedAt?: Date;
  durationSeconds?: number;
  bestMetricValue?: number;
}

interface TrainingMetric {
  id: string;
  runId: string;
  epoch: number;
  step?: number;
  metricName: string;
  metricValue: number;
  phase: 'TRAIN' | 'VALIDATION' | 'TEST';
}

interface Checkpoint {
  id: string;
  runId: string;
  epoch: number;
  step?: number;
  checkpointPath: string;
  sizeBytes: number;
  metrics?: Record<string, number>;
  isBest: boolean;
  isFinal: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// MOCK PRISMA
// ══════════════════════════════════════════════════════════════════════════════

const mockPrisma = {
  trainingDataset: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  experiment: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  trainingJob: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  trainingRun: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  trainingMetric: {
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
  },
  checkpoint: {
    findMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  hyperparameterConfig: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  jobQueue: {
    findMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  resourceQuota: {
    upsert: vi.fn(),
  },
  trainingLog: {
    create: vi.fn(),
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// MOCK TRAINER SERVICE
// ══════════════════════════════════════════════════════════════════════════════

// Datasets
async function createDataset(tenantId: string, userId: string, input: {
  name: string;
  description?: string;
  version?: string;
  sourceType: string;
  sourcePath: string;
  sourceConfig?: Record<string, unknown>;
  schema?: Record<string, unknown>;
  features?: string[];
  targetColumn?: string;
  trainSplit?: number;
  validationSplit?: number;
  testSplit?: number;
  splitSeed?: number;
  preprocessingPipeline?: Record<string, unknown>;
}) {
  return mockPrisma.trainingDataset.create({
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

async function getDataset(tenantId: string, datasetId: string) {
  return mockPrisma.trainingDataset.findFirst({ where: { id: datasetId, tenantId } });
}

async function listDatasets(tenantId: string, options: { status?: string; page?: number; pageSize?: number } = {}) {
  const { status, page = 1, pageSize = 20 } = options;
  const where = { tenantId, ...(status && { status }) };
  const skip = (page - 1) * pageSize;
  const [datasets, totalItems] = await Promise.all([
    mockPrisma.trainingDataset.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
    mockPrisma.trainingDataset.count({ where }),
  ]);
  return { data: datasets, pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) } };
}

async function validateDataset(tenantId: string, datasetId: string) {
  return mockPrisma.trainingDataset.update({
    where: { id: datasetId },
    data: { status: 'READY', validatedAt: new Date() },
  });
}

// Experiments
async function createExperiment(tenantId: string, userId: string, input: {
  name: string;
  description?: string;
  hypothesis?: string;
  objective?: string;
  primaryMetric: string;
  optimizeDirection?: 'maximize' | 'minimize';
  tags?: string[];
  projectId?: string;
}) {
  return mockPrisma.experiment.create({
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

async function getExperiment(tenantId: string, experimentId: string) {
  return mockPrisma.experiment.findFirst({
    where: { id: experimentId, tenantId },
    include: {
      jobs: { orderBy: { createdAt: 'desc' }, take: 10, include: { _count: { select: { runs: true } } } },
    },
  });
}

async function listExperiments(tenantId: string, options: { status?: string; page?: number; pageSize?: number } = {}) {
  const { status, page = 1, pageSize = 20 } = options;
  const where = { tenantId, ...(status && { status }) };
  const skip = (page - 1) * pageSize;
  const [experiments, totalItems] = await Promise.all([
    mockPrisma.experiment.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: pageSize, include: { _count: { select: { jobs: true } } } }),
    mockPrisma.experiment.count({ where }),
  ]);
  return { data: experiments, pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) } };
}

// Training Jobs
async function createJob(tenantId: string, userId: string, input: {
  name: string;
  description?: string;
  experimentId?: string;
  datasetId: string;
  modelType: string;
  modelArchitecture?: string;
  baseModelId?: string;
  framework: string;
  frameworkVersion?: string;
  trainingConfig?: Record<string, unknown>;
  computeType?: string;
  instanceType?: string;
  instanceCount?: number;
  maxRuntimeHours?: number;
  priority?: number;
  hyperparameters?: Record<string, unknown>;
}) {
  const job = await mockPrisma.trainingJob.create({
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

  if (input.hyperparameters) {
    await mockPrisma.hyperparameterConfig.create({
      data: { jobId: job.id, name: 'default', parameters: input.hyperparameters, isDefault: true },
    });
  }

  return getJob(tenantId, job.id);
}

async function getJob(tenantId: string, jobId: string) {
  return mockPrisma.trainingJob.findFirst({
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

async function listJobs(tenantId: string, options: { experimentId?: string; status?: string; page?: number; pageSize?: number } = {}) {
  const { experimentId, status, page = 1, pageSize = 20 } = options;
  const where = { tenantId, ...(experimentId && { experimentId }), ...(status && { status }) };
  const skip = (page - 1) * pageSize;
  const [jobs, totalItems] = await Promise.all([
    mockPrisma.trainingJob.findMany({
      where, orderBy: { createdAt: 'desc' }, skip, take: pageSize,
      include: { dataset: { select: { name: true } }, _count: { select: { runs: true } } },
    }),
    mockPrisma.trainingJob.count({ where }),
  ]);
  return { data: jobs, pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) } };
}

async function startJob(tenantId: string, jobId: string) {
  const job = await mockPrisma.trainingJob.findFirst({ where: { id: jobId, tenantId } });
  if (!job) throw new Error('Job not found');
  if (job.status !== 'PENDING') throw new Error('Job is not in pending status');

  const runCount = await mockPrisma.trainingRun.count({ where: { jobId } });
  const run = await mockPrisma.trainingRun.create({
    data: { tenantId, jobId, runNumber: runCount + 1, status: 'PENDING' },
  });

  await mockPrisma.jobQueue.create({
    data: { tenantId, runId: run.id, jobId, priority: job.priority, requestedResources: { computeType: job.computeType, instanceType: job.instanceType } },
  });

  await mockPrisma.trainingJob.update({ where: { id: jobId }, data: { status: 'QUEUED' } });
  return run;
}

async function cancelJob(tenantId: string, jobId: string) {
  const job = await mockPrisma.trainingJob.findFirst({ where: { id: jobId, tenantId } });
  if (!job) throw new Error('Job not found');

  await Promise.all([
    mockPrisma.trainingJob.update({ where: { id: jobId }, data: { status: 'CANCELLED' } }),
    mockPrisma.trainingRun.updateMany({ where: { jobId, status: { in: ['PENDING', 'INITIALIZING', 'TRAINING'] } }, data: { status: 'CANCELLED' } }),
    mockPrisma.jobQueue.updateMany({ where: { jobId, status: 'WAITING' }, data: { status: 'CANCELLED' } }),
  ]);

  return getJob(tenantId, jobId);
}

// Training Runs
async function getRun(tenantId: string, runId: string) {
  return mockPrisma.trainingRun.findFirst({
    where: { id: runId, tenantId },
    include: {
      job: { select: { name: true, modelType: true, framework: true } },
      hyperparams: true,
      checkpoints: { orderBy: { epoch: 'desc' }, take: 5 },
      metrics: { orderBy: { epoch: 'desc' }, take: 50 },
    },
  });
}

async function updateRunStatus(runId: string, status: string, updates: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = { status, ...updates };
  if (status === 'TRAINING' && !updates.startedAt) data.startedAt = new Date();
  if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(status) && !updates.completedAt) {
    data.completedAt = new Date();
    const run = await mockPrisma.trainingRun.findUnique({ where: { id: runId } });
    if (run?.startedAt) data.durationSeconds = Math.floor((Date.now() - run.startedAt.getTime()) / 1000);
  }
  return mockPrisma.trainingRun.update({ where: { id: runId }, data });
}

async function recordMetric(runId: string, input: {
  epoch: number;
  step?: number;
  metricName: string;
  metricValue: number;
  phase?: 'TRAIN' | 'VALIDATION' | 'TEST';
}) {
  return mockPrisma.trainingMetric.create({
    data: { runId, epoch: input.epoch, step: input.step, metricName: input.metricName, metricValue: input.metricValue, phase: input.phase || 'TRAIN' },
  });
}

async function recordMetrics(runId: string, metrics: Array<{
  epoch: number;
  step?: number;
  metricName: string;
  metricValue: number;
  phase?: string;
}>) {
  return mockPrisma.trainingMetric.createMany({
    data: metrics.map((m) => ({ runId, epoch: m.epoch, step: m.step, metricName: m.metricName, metricValue: m.metricValue, phase: m.phase || 'TRAIN' })),
  });
}

async function createCheckpoint(runId: string, input: {
  epoch: number;
  step?: number;
  checkpointPath: string;
  sizeBytes: number;
  metrics?: Record<string, number>;
  isBest?: boolean;
  isFinal?: boolean;
}) {
  if (input.isBest) {
    await mockPrisma.checkpoint.updateMany({ where: { runId, isBest: true }, data: { isBest: false } });
  }
  return mockPrisma.checkpoint.create({
    data: { runId, epoch: input.epoch, step: input.step, checkpointPath: input.checkpointPath, sizeBytes: input.sizeBytes, metrics: input.metrics, isBest: input.isBest ?? false, isFinal: input.isFinal ?? false },
  });
}

async function getRunMetrics(runId: string, metricName?: string) {
  return mockPrisma.trainingMetric.findMany({
    where: { runId, ...(metricName && { metricName }) },
    orderBy: [{ epoch: 'asc' }, { step: 'asc' }],
  });
}

async function logTraining(runId: string, level: string, message: string, context?: Record<string, unknown>) {
  return mockPrisma.trainingLog.create({ data: { runId, level, message, context } });
}

// Hyperparameter Tuning
async function createHyperparameterConfig(tenantId: string, jobId: string, input: {
  name: string;
  parameters: Record<string, unknown>;
  searchSpace?: Record<string, unknown>;
  searchStrategy?: string;
  maxTrials?: number;
  isDefault?: boolean;
}) {
  const job = await mockPrisma.trainingJob.findFirst({ where: { id: jobId, tenantId } });
  if (!job) throw new Error('Job not found');

  return mockPrisma.hyperparameterConfig.create({
    data: { jobId, name: input.name, parameters: input.parameters, searchSpace: input.searchSpace, searchStrategy: input.searchStrategy, maxTrials: input.maxTrials, isDefault: input.isDefault ?? false },
  });
}

async function startHPOSearch(tenantId: string, jobId: string, configId: string) {
  const config = await mockPrisma.hyperparameterConfig.findFirst({ where: { id: configId, job: { id: jobId, tenantId } } });
  if (!config || !config.searchSpace) throw new Error('HPO config not found or no search space defined');

  const trials = config.maxTrials || 10;
  const runs: TrainingRun[] = [];

  for (let i = 0; i < trials; i++) {
    const runCount = await mockPrisma.trainingRun.count({ where: { jobId } });
    const run = await mockPrisma.trainingRun.create({
      data: { tenantId, jobId, runNumber: runCount + 1, hyperparamsId: configId, status: 'PENDING' },
    });
    runs.push(run);
  }

  return { configId, trials, runs };
}

// Resource Management
async function getQuota(tenantId: string) {
  return mockPrisma.resourceQuota.upsert({
    where: { tenantId },
    create: { tenantId },
    update: {},
  });
}

async function updateQuotaUsage(tenantId: string, gpuHours: number, storageBytes: bigint) {
  return mockPrisma.resourceQuota.upsert({
    where: { tenantId },
    create: { tenantId, gpuHoursUsed: gpuHours, storageUsed: storageBytes },
    update: { gpuHoursUsed: { increment: gpuHours }, storageUsed: { increment: storageBytes } },
  });
}

async function getQueueStatus(tenantId: string) {
  const [waiting, running] = await Promise.all([
    mockPrisma.jobQueue.count({ where: { tenantId, status: 'WAITING' } }),
    mockPrisma.jobQueue.count({ where: { tenantId, status: { in: ['ALLOCATED', 'STARTED'] } } }),
  ]);
  return { waiting, running };
}

// Dashboard
async function getDashboard(tenantId: string) {
  const [
    totalExperiments,
    activeJobs,
    jobsByStatus,
    recentRuns,
    quota,
    queueStatus,
  ] = await Promise.all([
    mockPrisma.experiment.count({ where: { tenantId } }),
    mockPrisma.trainingJob.count({ where: { tenantId, status: { in: ['QUEUED', 'RUNNING'] } } }),
    mockPrisma.trainingJob.groupBy({ by: ['status'], where: { tenantId }, _count: { status: true } }),
    mockPrisma.trainingRun.findMany({
      where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 10,
      select: { id: true, runNumber: true, status: true, startedAt: true, completedAt: true, bestMetricValue: true, job: { select: { name: true } } },
    }),
    getQuota(tenantId),
    getQueueStatus(tenantId),
  ]);

  return {
    totalExperiments,
    activeJobs,
    jobsByStatus: Object.fromEntries(jobsByStatus.map((j: { status: string; _count: { status: number } }) => [j.status, j._count.status])),
    recentRuns,
    quota,
    queue: queueStatus,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FACTORIES
// ══════════════════════════════════════════════════════════════════════════════

function createMockDataset(overrides: Partial<TrainingDataset> = {}): TrainingDataset {
  return {
    id: 'dataset-123',
    tenantId: 'tenant-123',
    name: 'Student Performance Dataset',
    description: 'Historical student performance data',
    version: '1.0.0',
    sourceType: 'S3',
    sourcePath: 's3://bucket/datasets/student-performance',
    features: ['attendance_rate', 'homework_completion', 'quiz_scores', 'prior_grade'],
    targetColumn: 'final_grade',
    trainSplit: 0.8,
    validationSplit: 0.1,
    testSplit: 0.1,
    status: 'READY',
    createdBy: 'user-123',
    createdAt: new Date(),
    ...overrides,
  };
}

function createMockExperiment(overrides: Partial<Experiment> = {}): Experiment {
  return {
    id: 'exp-123',
    tenantId: 'tenant-123',
    name: 'Grade Prediction Experiment',
    description: 'Experiment to predict student final grades',
    hypothesis: 'Random Forest will outperform linear models',
    objective: 'Maximize prediction accuracy',
    primaryMetric: 'accuracy',
    optimizeDirection: 'maximize',
    tags: ['education', 'prediction', 'classification'],
    status: 'ACTIVE',
    createdBy: 'user-123',
    ...overrides,
  };
}

function createMockJob(overrides: Partial<TrainingJob> = {}): TrainingJob {
  return {
    id: 'job-123',
    tenantId: 'tenant-123',
    name: 'Random Forest Training',
    datasetId: 'dataset-123',
    modelType: 'RANDOM_FOREST',
    modelArchitecture: 'n_estimators=100, max_depth=10',
    framework: 'SKLEARN',
    computeType: 'CPU',
    instanceCount: 1,
    maxRuntimeHours: 4,
    priority: 0,
    status: 'PENDING',
    createdBy: 'user-123',
    ...overrides,
  };
}

function createMockRun(overrides: Partial<TrainingRun> = {}): TrainingRun {
  return {
    id: 'run-123',
    tenantId: 'tenant-123',
    jobId: 'job-123',
    runNumber: 1,
    status: 'COMPLETED',
    startedAt: new Date('2024-01-15T10:00:00Z'),
    completedAt: new Date('2024-01-15T11:30:00Z'),
    durationSeconds: 5400,
    bestMetricValue: 0.92,
    ...overrides,
  };
}

function createMockMetric(overrides: Partial<TrainingMetric> = {}): TrainingMetric {
  return {
    id: 'metric-123',
    runId: 'run-123',
    epoch: 1,
    metricName: 'accuracy',
    metricValue: 0.85,
    phase: 'VALIDATION',
    ...overrides,
  };
}

function createMockCheckpoint(overrides: Partial<Checkpoint> = {}): Checkpoint {
  return {
    id: 'ckpt-123',
    runId: 'run-123',
    epoch: 10,
    checkpointPath: 's3://bucket/checkpoints/run-123/epoch-10',
    sizeBytes: 52428800,
    metrics: { accuracy: 0.92, loss: 0.15 },
    isBest: true,
    isFinal: false,
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITES
// ══════════════════════════════════════════════════════════════════════════════

describe('TrainerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Datasets', () => {
    describe('createDataset', () => {
      it('should create dataset with defaults', async () => {
        const dataset = createMockDataset({ status: 'PENDING' });
        mockPrisma.trainingDataset.create.mockResolvedValueOnce(dataset);

        const result = await createDataset('tenant-123', 'user-123', {
          name: 'Student Performance Dataset',
          sourceType: 'S3',
          sourcePath: 's3://bucket/data',
        });

        expect(result.name).toBe('Student Performance Dataset');
        expect(mockPrisma.trainingDataset.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            version: '1.0.0',
            trainSplit: 0.8,
            validationSplit: 0.1,
            testSplit: 0.1,
            status: 'PENDING',
          }),
        });
      });

      it('should create dataset with custom splits', async () => {
        mockPrisma.trainingDataset.create.mockResolvedValueOnce(createMockDataset());

        await createDataset('tenant-123', 'user-123', {
          name: 'Dataset',
          sourceType: 'S3',
          sourcePath: 's3://bucket/data',
          trainSplit: 0.7,
          validationSplit: 0.15,
          testSplit: 0.15,
        });

        expect(mockPrisma.trainingDataset.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            trainSplit: 0.7,
            validationSplit: 0.15,
            testSplit: 0.15,
          }),
        });
      });
    });

    describe('listDatasets', () => {
      it('should list datasets with pagination', async () => {
        mockPrisma.trainingDataset.findMany.mockResolvedValueOnce([createMockDataset()]);
        mockPrisma.trainingDataset.count.mockResolvedValueOnce(25);

        const result = await listDatasets('tenant-123', { page: 2, pageSize: 10 });

        expect(result.data).toHaveLength(1);
        expect(result.pagination.totalPages).toBe(3);
      });

      it('should filter by status', async () => {
        mockPrisma.trainingDataset.findMany.mockResolvedValueOnce([]);
        mockPrisma.trainingDataset.count.mockResolvedValueOnce(0);

        await listDatasets('tenant-123', { status: 'READY' });

        expect(mockPrisma.trainingDataset.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { tenantId: 'tenant-123', status: 'READY' },
          })
        );
      });
    });

    describe('validateDataset', () => {
      it('should mark dataset as ready', async () => {
        mockPrisma.trainingDataset.update.mockResolvedValueOnce(createMockDataset({ status: 'READY' }));

        const result = await validateDataset('tenant-123', 'dataset-123');

        expect(result.status).toBe('READY');
        expect(mockPrisma.trainingDataset.update).toHaveBeenCalledWith({
          where: { id: 'dataset-123' },
          data: expect.objectContaining({
            status: 'READY',
          }),
        });
      });
    });
  });

  describe('Experiments', () => {
    describe('createExperiment', () => {
      it('should create experiment with defaults', async () => {
        const experiment = createMockExperiment();
        mockPrisma.experiment.create.mockResolvedValueOnce(experiment);

        const result = await createExperiment('tenant-123', 'user-123', {
          name: 'Grade Prediction Experiment',
          primaryMetric: 'accuracy',
        });

        expect(result.name).toBe('Grade Prediction Experiment');
        expect(mockPrisma.experiment.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            optimizeDirection: 'maximize',
            tags: [],
            status: 'ACTIVE',
          }),
        });
      });

      it('should create experiment with minimize direction', async () => {
        mockPrisma.experiment.create.mockResolvedValueOnce(createMockExperiment({ optimizeDirection: 'minimize' }));

        await createExperiment('tenant-123', 'user-123', {
          name: 'Loss Minimization',
          primaryMetric: 'mse',
          optimizeDirection: 'minimize',
        });

        expect(mockPrisma.experiment.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            optimizeDirection: 'minimize',
          }),
        });
      });
    });

    describe('listExperiments', () => {
      it('should list experiments with job counts', async () => {
        mockPrisma.experiment.findMany.mockResolvedValueOnce([
          { ...createMockExperiment(), _count: { jobs: 5 } },
        ]);
        mockPrisma.experiment.count.mockResolvedValueOnce(1);

        const result = await listExperiments('tenant-123');

        expect(result.data[0]._count.jobs).toBe(5);
      });
    });
  });

  describe('Training Jobs', () => {
    describe('createJob', () => {
      it('should create job with defaults', async () => {
        const job = createMockJob();
        mockPrisma.trainingJob.create.mockResolvedValueOnce(job);
        mockPrisma.trainingJob.findFirst.mockResolvedValueOnce(job);

        const result = await createJob('tenant-123', 'user-123', {
          name: 'Random Forest Training',
          datasetId: 'dataset-123',
          modelType: 'RANDOM_FOREST',
          framework: 'SKLEARN',
        });

        expect(result?.name).toBe('Random Forest Training');
        expect(mockPrisma.trainingJob.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            computeType: 'GPU_SINGLE',
            instanceCount: 1,
            maxRuntimeHours: 24,
            priority: 0,
            status: 'PENDING',
          }),
        });
      });

      it('should create hyperparameter config if provided', async () => {
        const job = createMockJob();
        mockPrisma.trainingJob.create.mockResolvedValueOnce(job);
        mockPrisma.hyperparameterConfig.create.mockResolvedValueOnce({});
        mockPrisma.trainingJob.findFirst.mockResolvedValueOnce(job);

        await createJob('tenant-123', 'user-123', {
          name: 'Job',
          datasetId: 'dataset-123',
          modelType: 'NEURAL_NET',
          framework: 'PYTORCH',
          hyperparameters: { learning_rate: 0.001, batch_size: 32 },
        });

        expect(mockPrisma.hyperparameterConfig.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            jobId: job.id,
            name: 'default',
            isDefault: true,
          }),
        });
      });
    });

    describe('startJob', () => {
      it('should start pending job', async () => {
        const job = createMockJob();
        mockPrisma.trainingJob.findFirst.mockResolvedValueOnce(job);
        mockPrisma.trainingRun.count.mockResolvedValueOnce(0);
        mockPrisma.trainingRun.create.mockResolvedValueOnce(createMockRun({ runNumber: 1, status: 'PENDING' }));
        mockPrisma.jobQueue.create.mockResolvedValueOnce({});
        mockPrisma.trainingJob.update.mockResolvedValueOnce({ ...job, status: 'QUEUED' });

        const result = await startJob('tenant-123', 'job-123');

        expect(result.runNumber).toBe(1);
        expect(mockPrisma.trainingJob.update).toHaveBeenCalledWith({
          where: { id: 'job-123' },
          data: { status: 'QUEUED' },
        });
      });

      it('should throw error for non-pending job', async () => {
        mockPrisma.trainingJob.findFirst.mockResolvedValueOnce(createMockJob({ status: 'RUNNING' }));

        await expect(startJob('tenant-123', 'job-123')).rejects.toThrow('Job is not in pending status');
      });

      it('should throw error for non-existent job', async () => {
        mockPrisma.trainingJob.findFirst.mockResolvedValueOnce(null);

        await expect(startJob('tenant-123', 'job-123')).rejects.toThrow('Job not found');
      });
    });

    describe('cancelJob', () => {
      it('should cancel job and associated runs', async () => {
        const job = createMockJob({ status: 'RUNNING' });
        mockPrisma.trainingJob.findFirst.mockResolvedValue(job);
        mockPrisma.trainingJob.update.mockResolvedValueOnce({ ...job, status: 'CANCELLED' });
        mockPrisma.trainingRun.updateMany.mockResolvedValueOnce({ count: 2 });
        mockPrisma.jobQueue.updateMany.mockResolvedValueOnce({ count: 0 });

        await cancelJob('tenant-123', 'job-123');

        expect(mockPrisma.trainingJob.update).toHaveBeenCalledWith({
          where: { id: 'job-123' },
          data: { status: 'CANCELLED' },
        });
        expect(mockPrisma.trainingRun.updateMany).toHaveBeenCalled();
        expect(mockPrisma.jobQueue.updateMany).toHaveBeenCalled();
      });
    });
  });

  describe('Training Runs', () => {
    describe('updateRunStatus', () => {
      it('should set startedAt when transitioning to TRAINING', async () => {
        mockPrisma.trainingRun.update.mockResolvedValueOnce(createMockRun({ status: 'TRAINING' }));

        await updateRunStatus('run-123', 'TRAINING');

        expect(mockPrisma.trainingRun.update).toHaveBeenCalledWith({
          where: { id: 'run-123' },
          data: expect.objectContaining({
            status: 'TRAINING',
            startedAt: expect.any(Date),
          }),
        });
      });

      it('should calculate duration when completing', async () => {
        const startedAt = new Date(Date.now() - 3600000); // 1 hour ago
        mockPrisma.trainingRun.findUnique.mockResolvedValueOnce(createMockRun({ startedAt }));
        mockPrisma.trainingRun.update.mockResolvedValueOnce(createMockRun({ status: 'COMPLETED' }));

        await updateRunStatus('run-123', 'COMPLETED');

        expect(mockPrisma.trainingRun.update).toHaveBeenCalledWith({
          where: { id: 'run-123' },
          data: expect.objectContaining({
            status: 'COMPLETED',
            completedAt: expect.any(Date),
            durationSeconds: expect.any(Number),
          }),
        });
      });
    });

    describe('recordMetric', () => {
      it('should record single metric', async () => {
        mockPrisma.trainingMetric.create.mockResolvedValueOnce(createMockMetric());

        const result = await recordMetric('run-123', {
          epoch: 5,
          metricName: 'accuracy',
          metricValue: 0.89,
          phase: 'VALIDATION',
        });

        expect(result.metricName).toBe('accuracy');
        expect(mockPrisma.trainingMetric.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            runId: 'run-123',
            epoch: 5,
            phase: 'VALIDATION',
          }),
        });
      });

      it('should use TRAIN as default phase', async () => {
        mockPrisma.trainingMetric.create.mockResolvedValueOnce(createMockMetric({ phase: 'TRAIN' }));

        await recordMetric('run-123', {
          epoch: 1,
          metricName: 'loss',
          metricValue: 0.5,
        });

        expect(mockPrisma.trainingMetric.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            phase: 'TRAIN',
          }),
        });
      });
    });

    describe('recordMetrics', () => {
      it('should batch record multiple metrics', async () => {
        mockPrisma.trainingMetric.createMany.mockResolvedValueOnce({ count: 4 });

        await recordMetrics('run-123', [
          { epoch: 1, metricName: 'loss', metricValue: 0.8 },
          { epoch: 1, metricName: 'accuracy', metricValue: 0.6 },
          { epoch: 2, metricName: 'loss', metricValue: 0.5 },
          { epoch: 2, metricName: 'accuracy', metricValue: 0.75 },
        ]);

        expect(mockPrisma.trainingMetric.createMany).toHaveBeenCalledWith({
          data: expect.arrayContaining([
            expect.objectContaining({ epoch: 1, metricName: 'loss' }),
            expect.objectContaining({ epoch: 2, metricName: 'accuracy' }),
          ]),
        });
      });
    });

    describe('createCheckpoint', () => {
      it('should create checkpoint', async () => {
        mockPrisma.checkpoint.create.mockResolvedValueOnce(createMockCheckpoint());

        const result = await createCheckpoint('run-123', {
          epoch: 10,
          checkpointPath: 's3://bucket/ckpt',
          sizeBytes: 52428800,
        });

        expect(result.epoch).toBe(10);
      });

      it('should unset previous best when creating new best', async () => {
        mockPrisma.checkpoint.updateMany.mockResolvedValueOnce({ count: 1 });
        mockPrisma.checkpoint.create.mockResolvedValueOnce(createMockCheckpoint({ isBest: true }));

        await createCheckpoint('run-123', {
          epoch: 15,
          checkpointPath: 's3://bucket/ckpt-best',
          sizeBytes: 52428800,
          isBest: true,
        });

        expect(mockPrisma.checkpoint.updateMany).toHaveBeenCalledWith({
          where: { runId: 'run-123', isBest: true },
          data: { isBest: false },
        });
      });
    });

    describe('getRunMetrics', () => {
      it('should get all metrics for run', async () => {
        mockPrisma.trainingMetric.findMany.mockResolvedValueOnce([
          createMockMetric({ epoch: 1 }),
          createMockMetric({ epoch: 2 }),
        ]);

        const result = await getRunMetrics('run-123');

        expect(result).toHaveLength(2);
      });

      it('should filter by metric name', async () => {
        mockPrisma.trainingMetric.findMany.mockResolvedValueOnce([createMockMetric()]);

        await getRunMetrics('run-123', 'accuracy');

        expect(mockPrisma.trainingMetric.findMany).toHaveBeenCalledWith({
          where: { runId: 'run-123', metricName: 'accuracy' },
          orderBy: [{ epoch: 'asc' }, { step: 'asc' }],
        });
      });
    });
  });

  describe('Hyperparameter Tuning', () => {
    describe('createHyperparameterConfig', () => {
      it('should create HPO config', async () => {
        mockPrisma.trainingJob.findFirst.mockResolvedValueOnce(createMockJob());
        mockPrisma.hyperparameterConfig.create.mockResolvedValueOnce({
          id: 'hpo-123',
          jobId: 'job-123',
          name: 'Grid Search',
          searchSpace: { learning_rate: [0.001, 0.01, 0.1] },
        });

        const result = await createHyperparameterConfig('tenant-123', 'job-123', {
          name: 'Grid Search',
          parameters: { learning_rate: 0.01 },
          searchSpace: { learning_rate: [0.001, 0.01, 0.1] },
        });

        expect(result.name).toBe('Grid Search');
      });

      it('should throw error for non-existent job', async () => {
        mockPrisma.trainingJob.findFirst.mockResolvedValueOnce(null);

        await expect(
          createHyperparameterConfig('tenant-123', 'job-123', {
            name: 'Config',
            parameters: {},
          })
        ).rejects.toThrow('Job not found');
      });
    });

    describe('startHPOSearch', () => {
      it('should create multiple runs for HPO trials', async () => {
        mockPrisma.hyperparameterConfig.findFirst.mockResolvedValueOnce({
          id: 'hpo-123',
          searchSpace: { learning_rate: [0.001, 0.01] },
          maxTrials: 5,
        });
        mockPrisma.trainingRun.count.mockResolvedValue(0);
        mockPrisma.trainingRun.create.mockResolvedValue(createMockRun({ status: 'PENDING' }));

        const result = await startHPOSearch('tenant-123', 'job-123', 'hpo-123');

        expect(result.trials).toBe(5);
        expect(result.runs).toHaveLength(5);
        expect(mockPrisma.trainingRun.create).toHaveBeenCalledTimes(5);
      });

      it('should throw error if no search space', async () => {
        mockPrisma.hyperparameterConfig.findFirst.mockResolvedValueOnce({
          id: 'hpo-123',
          searchSpace: null,
        });

        await expect(
          startHPOSearch('tenant-123', 'job-123', 'hpo-123')
        ).rejects.toThrow('HPO config not found or no search space defined');
      });
    });
  });

  describe('Resource Management', () => {
    describe('getQuota', () => {
      it('should return existing quota', async () => {
        mockPrisma.resourceQuota.upsert.mockResolvedValueOnce({
          tenantId: 'tenant-123',
          gpuHoursLimit: 100,
          gpuHoursUsed: 25,
        });

        const result = await getQuota('tenant-123');

        expect(result.gpuHoursUsed).toBe(25);
      });

      it('should create quota if not exists', async () => {
        mockPrisma.resourceQuota.upsert.mockResolvedValueOnce({
          tenantId: 'tenant-123',
          gpuHoursLimit: 100,
          gpuHoursUsed: 0,
        });

        await getQuota('tenant-123');

        expect(mockPrisma.resourceQuota.upsert).toHaveBeenCalledWith({
          where: { tenantId: 'tenant-123' },
          create: { tenantId: 'tenant-123' },
          update: {},
        });
      });
    });

    describe('getQueueStatus', () => {
      it('should return queue statistics', async () => {
        mockPrisma.jobQueue.count
          .mockResolvedValueOnce(5) // waiting
          .mockResolvedValueOnce(2); // running

        const result = await getQueueStatus('tenant-123');

        expect(result.waiting).toBe(5);
        expect(result.running).toBe(2);
      });
    });
  });

  describe('Dashboard', () => {
    describe('getDashboard', () => {
      it('should return comprehensive dashboard', async () => {
        mockPrisma.experiment.count.mockResolvedValueOnce(10);
        mockPrisma.trainingJob.count.mockResolvedValueOnce(3);
        mockPrisma.trainingJob.groupBy.mockResolvedValueOnce([
          { status: 'COMPLETED', _count: { status: 15 } },
          { status: 'RUNNING', _count: { status: 3 } },
          { status: 'PENDING', _count: { status: 5 } },
        ]);
        mockPrisma.trainingRun.findMany.mockResolvedValueOnce([
          createMockRun(),
        ]);
        mockPrisma.resourceQuota.upsert.mockResolvedValueOnce({ tenantId: 'tenant-123' });
        mockPrisma.jobQueue.count
          .mockResolvedValueOnce(2)
          .mockResolvedValueOnce(1);

        const result = await getDashboard('tenant-123');

        expect(result.totalExperiments).toBe(10);
        expect(result.activeJobs).toBe(3);
        expect(result.jobsByStatus).toEqual({
          COMPLETED: 15,
          RUNNING: 3,
          PENDING: 5,
        });
        expect(result.recentRuns).toHaveLength(1);
        expect(result.queue.waiting).toBe(2);
        expect(result.queue.running).toBe(1);
      });
    });
  });

  describe('Logging', () => {
    describe('logTraining', () => {
      it('should create training log entry', async () => {
        mockPrisma.trainingLog.create.mockResolvedValueOnce({
          id: 'log-123',
          runId: 'run-123',
          level: 'INFO',
          message: 'Training started',
        });

        await logTraining('run-123', 'INFO', 'Training started', { epoch: 1 });

        expect(mockPrisma.trainingLog.create).toHaveBeenCalledWith({
          data: {
            runId: 'run-123',
            level: 'INFO',
            message: 'Training started',
            context: { epoch: 1 },
          },
        });
      });

      it('should log errors with context', async () => {
        mockPrisma.trainingLog.create.mockResolvedValueOnce({});

        await logTraining('run-123', 'ERROR', 'Out of memory', { gpuMemory: '16GB' });

        expect(mockPrisma.trainingLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            level: 'ERROR',
            message: 'Out of memory',
          }),
        });
      });
    });
  });
});
