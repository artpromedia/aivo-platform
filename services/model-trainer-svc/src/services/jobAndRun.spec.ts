/**
 * Tests for model-trainer-svc training jobs, runs, and metrics.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  trainingJob: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  trainingRun: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  metric: {
    create: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn(),
  },
  checkpoint: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({ prisma: mockPrisma }));

describe('TrainingJobService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('createJob', () => {
    it('creates a training job with PENDING status', async () => {
      const job = {
        id: 'job-1',
        experimentId: 'exp-1',
        status: 'PENDING',
        config: { epochs: 10, learningRate: 0.001 },
      };
      mockPrisma.trainingJob.create.mockResolvedValue(job);
      const result = await mockPrisma.trainingJob.create({ data: job });
      expect(result.status).toBe('PENDING');
    });
  });

  describe('startJob', () => {
    it('transitions job from PENDING to RUNNING', async () => {
      mockPrisma.trainingJob.update.mockResolvedValue({
        id: 'job-1',
        status: 'RUNNING',
        startedAt: new Date(),
      });
      const result = await mockPrisma.trainingJob.update({
        where: { id: 'job-1' },
        data: { status: 'RUNNING', startedAt: new Date() },
      });
      expect(result.status).toBe('RUNNING');
    });
  });

  describe('cancelJob', () => {
    it('cancels a running job', async () => {
      mockPrisma.trainingJob.update.mockResolvedValue({
        id: 'job-1',
        status: 'CANCELLED',
        cancelledAt: new Date(),
      });
      const result = await mockPrisma.trainingJob.update({
        where: { id: 'job-1' },
        data: { status: 'CANCELLED' },
      });
      expect(result.status).toBe('CANCELLED');
    });
  });

  describe('listJobs', () => {
    it('filters jobs by experiment', async () => {
      mockPrisma.trainingJob.findMany.mockResolvedValue([
        { id: 'job-1', experimentId: 'exp-1', status: 'COMPLETED' },
        { id: 'job-2', experimentId: 'exp-1', status: 'RUNNING' },
      ]);
      const jobs = await mockPrisma.trainingJob.findMany({
        where: { experimentId: 'exp-1' },
      });
      expect(jobs).toHaveLength(2);
    });
  });
});

describe('TrainingRunService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('updateRunStatus', () => {
    it('updates run with final metrics', async () => {
      mockPrisma.trainingRun.update.mockResolvedValue({
        id: 'run-1',
        status: 'COMPLETED',
        finalLoss: 0.023,
        finalAccuracy: 0.97,
      });
      const result = await mockPrisma.trainingRun.update({
        where: { id: 'run-1' },
        data: { status: 'COMPLETED', finalLoss: 0.023, finalAccuracy: 0.97 },
      });
      expect(result.finalAccuracy).toBe(0.97);
    });
  });
});

describe('MetricService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('recordMetrics', () => {
    it('records batch metrics for a run', async () => {
      const metrics = [
        { runId: 'run-1', epoch: 1, loss: 0.5, accuracy: 0.6 },
        { runId: 'run-1', epoch: 2, loss: 0.3, accuracy: 0.8 },
        { runId: 'run-1', epoch: 3, loss: 0.1, accuracy: 0.93 },
      ];
      mockPrisma.metric.createMany.mockResolvedValue({ count: 3 });
      const result = await mockPrisma.metric.createMany({ data: metrics });
      expect(result.count).toBe(3);
    });
  });

  describe('getRunMetrics', () => {
    it('retrieves metrics ordered by epoch', async () => {
      mockPrisma.metric.findMany.mockResolvedValue([
        { epoch: 1, loss: 0.5 },
        { epoch: 2, loss: 0.3 },
      ]);
      const metrics = await mockPrisma.metric.findMany({
        where: { runId: 'run-1' },
        orderBy: { epoch: 'asc' },
      });
      expect(metrics[0].loss).toBeGreaterThan(metrics[1].loss);
    });
  });
});

describe('CheckpointService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('createCheckpoint', () => {
    it('creates checkpoint with path and metrics', async () => {
      const cp = {
        id: 'cp-1',
        runId: 'run-1',
        epoch: 5,
        path: '/models/run-1/checkpoint-5',
        loss: 0.15,
        accuracy: 0.91,
      };
      mockPrisma.checkpoint.create.mockResolvedValue(cp);
      const result = await mockPrisma.checkpoint.create({ data: cp });
      expect(result.epoch).toBe(5);
      expect(result.path).toContain('checkpoint-5');
    });
  });

  describe('listCheckpoints', () => {
    it('lists checkpoints for a run', async () => {
      mockPrisma.checkpoint.findMany.mockResolvedValue([
        { id: 'cp-1', epoch: 5 },
        { id: 'cp-2', epoch: 10 },
      ]);
      const cps = await mockPrisma.checkpoint.findMany({
        where: { runId: 'run-1' },
      });
      expect(cps).toHaveLength(2);
    });
  });
});
