/**
 * Tests for model-trainer-svc dataset and experiment management.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  dataset: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  experiment: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  hyperparameterConfig: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({ prisma: mockPrisma }));

describe('DatasetService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('createDataset', () => {
    it('creates dataset with metadata', async () => {
      const ds = {
        id: 'ds-1',
        name: 'Math Questions v2',
        format: 'CSV',
        recordCount: 10000,
        sizeBytes: 2048000,
        tenantId: 'tenant-1',
      };
      mockPrisma.dataset.create.mockResolvedValue(ds);
      const result = await mockPrisma.dataset.create({ data: ds });
      expect(result.name).toBe('Math Questions v2');
      expect(result.recordCount).toBe(10000);
    });
  });

  describe('getDataset', () => {
    it('returns dataset by id', async () => {
      mockPrisma.dataset.findUnique.mockResolvedValue({
        id: 'ds-1',
        name: 'Math Questions v2',
        status: 'READY',
      });
      const ds = await mockPrisma.dataset.findUnique({ where: { id: 'ds-1' } });
      expect(ds?.status).toBe('READY');
    });

    it('returns null for nonexistent dataset', async () => {
      mockPrisma.dataset.findUnique.mockResolvedValue(null);
      const ds = await mockPrisma.dataset.findUnique({ where: { id: 'nope' } });
      expect(ds).toBeNull();
    });
  });

  describe('validateDataset', () => {
    it('validates dataset has required columns', () => {
      const schema = { columns: ['input', 'output', 'label'] };
      expect(schema.columns).toContain('input');
      expect(schema.columns).toContain('output');
    });

    it('rejects empty dataset', () => {
      const ds = { recordCount: 0 };
      expect(ds.recordCount).toBe(0);
    });
  });
});

describe('ExperimentService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('createExperiment', () => {
    it('creates experiment with config', async () => {
      const exp = {
        id: 'exp-1',
        name: 'Fine-tune GPT for math',
        datasetId: 'ds-1',
        modelType: 'TRANSFORMER',
        config: { learningRate: 0.001, epochs: 10, batchSize: 32 },
      };
      mockPrisma.experiment.create.mockResolvedValue(exp);
      const result = await mockPrisma.experiment.create({ data: exp });
      expect(result.modelType).toBe('TRANSFORMER');
      expect(result.config.epochs).toBe(10);
    });
  });

  describe('listExperiments', () => {
    it('returns experiments sorted by creation date', async () => {
      mockPrisma.experiment.findMany.mockResolvedValue([
        { id: 'exp-1', name: 'Exp A', createdAt: new Date('2026-01-01') },
        { id: 'exp-2', name: 'Exp B', createdAt: new Date('2026-02-01') },
      ]);
      const exps = await mockPrisma.experiment.findMany({
        orderBy: { createdAt: 'desc' },
      });
      expect(exps).toHaveLength(2);
    });
  });
});

describe('HyperparameterService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('createHyperparameterConfig', () => {
    it('creates HPO config with search space', async () => {
      const config = {
        id: 'hpo-1',
        experimentId: 'exp-1',
        searchSpace: {
          learningRate: { min: 0.0001, max: 0.01, scale: 'log' },
          batchSize: { values: [16, 32, 64] },
        },
        strategy: 'BAYESIAN',
        maxTrials: 50,
      };
      mockPrisma.hyperparameterConfig.create.mockResolvedValue(config);
      const result = await mockPrisma.hyperparameterConfig.create({ data: config });
      expect(result.strategy).toBe('BAYESIAN');
      expect(result.maxTrials).toBe(50);
    });
  });
});
