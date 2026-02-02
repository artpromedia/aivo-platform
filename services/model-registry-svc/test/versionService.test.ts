/**
 * Version Service Unit Tests
 *
 * Tests for ML model version management with Prisma mocking.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock semver
vi.mock('semver', () => ({
  default: {
    valid: vi.fn((v: string) => (/^\d+\.\d+\.\d+/.test(v) ? v : null)),
    parse: vi.fn((v: string) => {
      const match = v.match(/^(\d+)\.(\d+)\.(\d+)/);
      if (match) {
        return { major: parseInt(match[1]), minor: parseInt(match[2]), patch: parseInt(match[3]) };
      }
      return null;
    }),
  },
  valid: vi.fn((v: string) => (/^\d+\.\d+\.\d+/.test(v) ? v : null)),
  parse: vi.fn((v: string) => {
    const match = v.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (match) {
      return { major: parseInt(match[1]), minor: parseInt(match[2]), patch: parseInt(match[3]) };
    }
    return null;
  }),
}));

// Mock Prisma client
const mockPrisma = {
  modelVersion: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  model: {
    findFirst: vi.fn(),
  },
  deployment: {
    findFirst: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({
  prisma: mockPrisma,
  Prisma: {
    InputJsonValue: {},
  },
}));

// Import after mocking
import {
  createVersion,
  getVersionById,
  getVersionByTag,
  listVersions,
  updateVersion,
  transitionStage,
} from '../src/services/versionService.js';

describe('VersionService', () => {
  const modelId = 'model-123';
  const createdBy = 'user-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CREATE VERSION
  // ════════════════════════════════════════════════════════════════════════════

  describe('createVersion', () => {
    it('should create first version as 1.0.0', async () => {
      mockPrisma.modelVersion.findFirst.mockResolvedValue(null); // No existing versions
      mockPrisma.modelVersion.create.mockResolvedValue({
        id: 'version-1',
        version: '1.0.0',
        versionNumber: 1,
        stage: 'DRAFT',
        model: { name: 'test-model', displayName: 'Test Model' },
        artifacts: [],
        _count: { artifacts: 0, metrics: 0 },
      });

      const result = await createVersion(modelId, createdBy, {
        description: 'Initial version',
      });

      expect(result.version).toBe('1.0.0');
      expect(result.versionNumber).toBe(1);
      expect(result.stage).toBe('DRAFT');
    });

    it('should auto-increment patch version', async () => {
      mockPrisma.modelVersion.findFirst.mockResolvedValue({
        versionNumber: 5,
        version: '1.2.3',
      });
      mockPrisma.modelVersion.create.mockResolvedValue({
        id: 'version-6',
        version: '1.2.4',
        versionNumber: 6,
        stage: 'DRAFT',
        model: {},
        artifacts: [],
        _count: { artifacts: 0, metrics: 0 },
      });

      const result = await createVersion(modelId, createdBy, {});

      expect(result.version).toBe('1.2.4');
      expect(result.versionNumber).toBe(6);
    });

    it('should use explicit version when provided', async () => {
      mockPrisma.modelVersion.findFirst.mockResolvedValue({
        versionNumber: 2,
        version: '1.0.1',
      });
      mockPrisma.modelVersion.create.mockResolvedValue({
        id: 'version-3',
        version: '2.0.0',
        versionNumber: 3,
        stage: 'DRAFT',
        model: {},
        artifacts: [],
        _count: { artifacts: 0, metrics: 0 },
      });

      const result = await createVersion(modelId, createdBy, {
        version: '2.0.0',
        description: 'Major release',
      });

      expect(result.version).toBe('2.0.0');
    });

    it('should throw error for invalid semver', async () => {
      mockPrisma.modelVersion.findFirst.mockResolvedValue(null);

      await expect(
        createVersion(modelId, createdBy, {
          version: 'invalid-version',
        })
      ).rejects.toThrow('Invalid semantic version');
    });

    it('should create version with parent reference', async () => {
      mockPrisma.modelVersion.findFirst.mockResolvedValue({
        versionNumber: 1,
        version: '1.0.0',
      });
      mockPrisma.modelVersion.create.mockResolvedValue({
        id: 'version-2',
        version: '1.0.1',
        versionNumber: 2,
        parentVersionId: 'version-1',
        stage: 'DRAFT',
        model: {},
        artifacts: [],
        _count: { artifacts: 0, metrics: 0 },
      });

      await createVersion(modelId, createdBy, {
        parentVersionId: 'version-1',
        changelog: 'Bug fixes',
      });

      expect(mockPrisma.modelVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          parentVersionId: 'version-1',
          changelog: 'Bug fixes',
        }),
        include: expect.any(Object),
      });
    });

    it('should create version with schemas', async () => {
      mockPrisma.modelVersion.findFirst.mockResolvedValue(null);
      mockPrisma.modelVersion.create.mockResolvedValue({
        id: 'version-1',
        version: '1.0.0',
        versionNumber: 1,
        stage: 'DRAFT',
        model: {},
        artifacts: [],
        _count: { artifacts: 0, metrics: 0 },
      });

      const inputSchema = { type: 'object', properties: { text: { type: 'string' } } };
      const outputSchema = { type: 'object', properties: { score: { type: 'number' } } };

      await createVersion(modelId, createdBy, {
        inputSchema,
        outputSchema,
      });

      expect(mockPrisma.modelVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          inputSchema,
          outputSchema,
        }),
        include: expect.any(Object),
      });
    });

    it('should create version with hyperparameters', async () => {
      mockPrisma.modelVersion.findFirst.mockResolvedValue(null);
      mockPrisma.modelVersion.create.mockResolvedValue({
        id: 'version-1',
        version: '1.0.0',
        versionNumber: 1,
        stage: 'DRAFT',
        model: {},
        artifacts: [],
        _count: { artifacts: 0, metrics: 0 },
      });

      const hyperparameters = {
        learningRate: 0.001,
        batchSize: 32,
        epochs: 100,
      };

      await createVersion(modelId, createdBy, {
        hyperparameters,
      });

      expect(mockPrisma.modelVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          hyperparameters,
        }),
        include: expect.any(Object),
      });
    });

    it('should track training job reference', async () => {
      mockPrisma.modelVersion.findFirst.mockResolvedValue(null);
      mockPrisma.modelVersion.create.mockResolvedValue({
        id: 'version-1',
        version: '1.0.0',
        versionNumber: 1,
        trainingJobId: 'job-123',
        sourceType: 'TRAINING_JOB',
        stage: 'DRAFT',
        model: {},
        artifacts: [],
        _count: { artifacts: 0, metrics: 0 },
      });

      await createVersion(modelId, createdBy, {
        sourceType: 'TRAINING_JOB',
        trainingJobId: 'job-123',
      });

      expect(mockPrisma.modelVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sourceType: 'TRAINING_JOB',
          trainingJobId: 'job-123',
        }),
        include: expect.any(Object),
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GET VERSION BY ID
  // ════════════════════════════════════════════════════════════════════════════

  describe('getVersionById', () => {
    it('should return null when version not found', async () => {
      mockPrisma.modelVersion.findFirst.mockResolvedValue(null);

      const result = await getVersionById(modelId, 'nonexistent-id');

      expect(result).toBeNull();
    });

    it('should return version with full details', async () => {
      const mockVersion = {
        id: 'version-1',
        modelId,
        version: '1.0.0',
        versionNumber: 1,
        stage: 'PRODUCTION',
        model: { id: modelId, name: 'test-model', displayName: 'Test', tenantId: 'tenant-1' },
        parentVersion: null,
        artifacts: [{ id: 'art-1', type: 'WEIGHTS', name: 'model.pt', sizeBytes: 1024000 }],
        metrics: [{ id: 'met-1', name: 'accuracy', value: 0.95 }],
        _count: { artifacts: 1, metrics: 1, deployments: 2 },
      };

      mockPrisma.modelVersion.findFirst.mockResolvedValue(mockVersion);

      const result = await getVersionById(modelId, 'version-1');

      expect(result?.id).toBe('version-1');
      expect(result?.model.name).toBe('test-model');
      expect(result?.artifacts).toHaveLength(1);
      expect(result?.metrics).toHaveLength(1);
    });

    it('should enforce model ownership', async () => {
      mockPrisma.modelVersion.findFirst.mockResolvedValue(null);

      await getVersionById('model-A', 'version-1');

      expect(mockPrisma.modelVersion.findFirst).toHaveBeenCalledWith({
        where: { id: 'version-1', modelId: 'model-A' },
        include: expect.any(Object),
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GET VERSION BY TAG
  // ════════════════════════════════════════════════════════════════════════════

  describe('getVersionByTag', () => {
    it('should return latest version for "latest" tag', async () => {
      const mockVersion = {
        id: 'version-5',
        version: '1.4.0',
        versionNumber: 5,
        stage: 'DRAFT',
        model: {},
        artifacts: [],
        _count: { artifacts: 0, metrics: 0, deployments: 0 },
      };

      mockPrisma.modelVersion.findFirst.mockResolvedValue(mockVersion);

      const result = await getVersionByTag(modelId, 'latest');

      expect(result?.versionNumber).toBe(5);
      expect(mockPrisma.modelVersion.findFirst).toHaveBeenCalledWith({
        where: { modelId },
        orderBy: { versionNumber: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should return production version for "production" tag', async () => {
      const mockVersion = {
        id: 'version-3',
        version: '1.2.0',
        versionNumber: 3,
        stage: 'PRODUCTION',
        model: {},
        artifacts: [],
        _count: { artifacts: 0, metrics: 0, deployments: 0 },
      };

      mockPrisma.modelVersion.findFirst.mockResolvedValue(mockVersion);

      const result = await getVersionByTag(modelId, 'production');

      expect(result?.stage).toBe('PRODUCTION');
      expect(mockPrisma.modelVersion.findFirst).toHaveBeenCalledWith({
        where: { modelId, stage: 'PRODUCTION' },
        orderBy: { versionNumber: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should return staging version for "staging" tag', async () => {
      mockPrisma.modelVersion.findFirst.mockResolvedValue({
        id: 'version-4',
        stage: 'STAGING',
        model: {},
        artifacts: [],
        _count: {},
      });

      const result = await getVersionByTag(modelId, 'staging');

      expect(result?.stage).toBe('STAGING');
      expect(mockPrisma.modelVersion.findFirst).toHaveBeenCalledWith({
        where: { modelId, stage: 'STAGING' },
        orderBy: { versionNumber: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should find by exact semantic version', async () => {
      mockPrisma.modelVersion.findFirst.mockResolvedValue({
        id: 'version-2',
        version: '1.1.0',
        model: {},
        artifacts: [],
        _count: {},
      });

      const result = await getVersionByTag(modelId, '1.1.0');

      expect(result?.version).toBe('1.1.0');
      expect(mockPrisma.modelVersion.findFirst).toHaveBeenCalledWith({
        where: { modelId, version: '1.1.0' },
        include: expect.any(Object),
      });
    });

    it('should return null for nonexistent version tag', async () => {
      mockPrisma.modelVersion.findFirst.mockResolvedValue(null);

      const result = await getVersionByTag(modelId, '99.99.99');

      expect(result).toBeNull();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // LIST VERSIONS
  // ════════════════════════════════════════════════════════════════════════════

  describe('listVersions', () => {
    it('should return paginated versions', async () => {
      const mockVersions = [
        { id: 'v3', version: '1.2.0', stage: 'DRAFT' },
        { id: 'v2', version: '1.1.0', stage: 'STAGING' },
        { id: 'v1', version: '1.0.0', stage: 'PRODUCTION' },
      ];

      mockPrisma.modelVersion.findMany.mockResolvedValue(mockVersions);
      mockPrisma.modelVersion.count.mockResolvedValue(3);

      const result = await listVersions(modelId, {});

      expect(result.data).toHaveLength(3);
      expect(result.pagination.totalItems).toBe(3);
    });

    it('should filter by stage', async () => {
      mockPrisma.modelVersion.findMany.mockResolvedValue([]);
      mockPrisma.modelVersion.count.mockResolvedValue(0);

      await listVersions(modelId, { stage: 'PRODUCTION' });

      expect(mockPrisma.modelVersion.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          modelId,
          stage: 'PRODUCTION',
        }),
        include: expect.any(Object),
        orderBy: expect.any(Object),
        skip: expect.any(Number),
        take: expect.any(Number),
      });
    });

    it('should handle pagination', async () => {
      mockPrisma.modelVersion.findMany.mockResolvedValue([]);
      mockPrisma.modelVersion.count.mockResolvedValue(50);

      const result = await listVersions(modelId, { page: 2, pageSize: 10 });

      expect(mockPrisma.modelVersion.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        include: expect.any(Object),
        orderBy: expect.any(Object),
        skip: 10,
        take: 10,
      });
      expect(result.pagination.totalPages).toBe(5);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // UPDATE VERSION
  // ════════════════════════════════════════════════════════════════════════════

  describe('updateVersion', () => {
    it('should update version description', async () => {
      mockPrisma.modelVersion.update.mockResolvedValue({
        id: 'version-1',
        description: 'Updated description',
        _count: { artifacts: 0, metrics: 0 },
      });

      const result = await updateVersion(modelId, 'version-1', {
        description: 'Updated description',
      });

      expect(result.description).toBe('Updated description');
    });

    it('should update version changelog', async () => {
      mockPrisma.modelVersion.update.mockResolvedValue({
        id: 'version-1',
        changelog: '# Changes\n- Fixed bug',
        _count: { artifacts: 0, metrics: 0 },
      });

      await updateVersion(modelId, 'version-1', {
        changelog: '# Changes\n- Fixed bug',
      });

      expect(mockPrisma.modelVersion.update).toHaveBeenCalledWith({
        where: { id: 'version-1', modelId },
        data: expect.objectContaining({
          changelog: '# Changes\n- Fixed bug',
        }),
        include: expect.any(Object),
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // STAGE TRANSITIONS
  // ════════════════════════════════════════════════════════════════════════════

  describe('transitionStage', () => {
    it('should allow valid transition from DRAFT to VALIDATION', async () => {
      mockPrisma.modelVersion.findFirst.mockResolvedValue({
        id: 'version-1',
        stage: 'DRAFT',
        model: { tenantId: 'tenant-1' },
      });
      mockPrisma.modelVersion.update.mockResolvedValue({
        id: 'version-1',
        stage: 'VALIDATION',
        _count: {},
      });

      const result = await transitionStage('version-1', {
        targetStage: 'VALIDATION',
        transitionedBy: 'user-1',
      });

      expect(result.stage).toBe('VALIDATION');
    });

    it('should allow transition from VALIDATION to STAGING', async () => {
      mockPrisma.modelVersion.findFirst.mockResolvedValue({
        id: 'version-1',
        stage: 'VALIDATION',
        model: { tenantId: 'tenant-1' },
      });
      mockPrisma.modelVersion.update.mockResolvedValue({
        id: 'version-1',
        stage: 'STAGING',
        _count: {},
      });

      const result = await transitionStage('version-1', {
        targetStage: 'STAGING',
        transitionedBy: 'user-1',
      });

      expect(result.stage).toBe('STAGING');
    });

    it('should allow transition from STAGING to PRODUCTION', async () => {
      mockPrisma.modelVersion.findFirst.mockResolvedValue({
        id: 'version-1',
        stage: 'STAGING',
        model: { tenantId: 'tenant-1' },
      });
      mockPrisma.modelVersion.update.mockResolvedValue({
        id: 'version-1',
        stage: 'PRODUCTION',
        _count: {},
      });

      const result = await transitionStage('version-1', {
        targetStage: 'PRODUCTION',
        transitionedBy: 'user-1',
        comment: 'Approved for production',
      });

      expect(result.stage).toBe('PRODUCTION');
    });

    it('should reject invalid transition from DRAFT to PRODUCTION', async () => {
      mockPrisma.modelVersion.findFirst.mockResolvedValue({
        id: 'version-1',
        stage: 'DRAFT',
        model: { tenantId: 'tenant-1' },
      });

      await expect(
        transitionStage('version-1', {
          targetStage: 'PRODUCTION',
          transitionedBy: 'user-1',
        })
      ).rejects.toThrow();
    });

    it('should reject invalid transition from PRODUCTION to DRAFT', async () => {
      mockPrisma.modelVersion.findFirst.mockResolvedValue({
        id: 'version-1',
        stage: 'PRODUCTION',
        model: { tenantId: 'tenant-1' },
      });

      await expect(
        transitionStage('version-1', {
          targetStage: 'DRAFT',
          transitionedBy: 'user-1',
        })
      ).rejects.toThrow();
    });

    it('should allow archiving from any stage', async () => {
      mockPrisma.modelVersion.findFirst.mockResolvedValue({
        id: 'version-1',
        stage: 'STAGING',
        model: { tenantId: 'tenant-1' },
      });
      mockPrisma.modelVersion.update.mockResolvedValue({
        id: 'version-1',
        stage: 'ARCHIVED',
        _count: {},
      });

      const result = await transitionStage('version-1', {
        targetStage: 'ARCHIVED',
        transitionedBy: 'user-1',
      });

      expect(result.stage).toBe('ARCHIVED');
    });

    it('should allow deprecating production versions', async () => {
      mockPrisma.modelVersion.findFirst.mockResolvedValue({
        id: 'version-1',
        stage: 'PRODUCTION',
        model: { tenantId: 'tenant-1' },
      });
      mockPrisma.modelVersion.update.mockResolvedValue({
        id: 'version-1',
        stage: 'DEPRECATED',
        _count: {},
      });

      const result = await transitionStage('version-1', {
        targetStage: 'DEPRECATED',
        transitionedBy: 'user-1',
        comment: 'Replaced by v2.0.0',
      });

      expect(result.stage).toBe('DEPRECATED');
    });

    it('should throw error for nonexistent version', async () => {
      mockPrisma.modelVersion.findFirst.mockResolvedValue(null);

      await expect(
        transitionStage('nonexistent', {
          targetStage: 'VALIDATION',
          transitionedBy: 'user-1',
        })
      ).rejects.toThrow();
    });
  });
});
