/**
 * Model Service Unit Tests
 *
 * Tests for ML model management with Prisma mocking.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma client
const mockPrisma = {
  model: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  deployment: {
    findFirst: vi.fn(),
    count: vi.fn(),
  },
  modelVersion: {
    deleteMany: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({
  prisma: mockPrisma,
}));

// Import after mocking
import {
  createModel,
  getModelById,
  getModelByName,
  listModels,
  updateModel,
  deleteModel,
} from '../src/services/modelService.js';

describe('ModelService', () => {
  const tenantId = 'tenant-123';
  const ownerId = 'user-456';
  const ownerEmail = 'user@example.com';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CREATE MODEL
  // ════════════════════════════════════════════════════════════════════════════

  describe('createModel', () => {
    it('should create model with required fields', async () => {
      const input = {
        name: 'aivo-reading-comprehension',
        displayName: 'AIVO Reading Comprehension Model',
        description: 'NLP model for reading comprehension assessment',
        framework: 'pytorch',
        task: 'text-classification',
      };

      const createdModel = {
        id: 'model-1',
        tenantId,
        name: input.name,
        displayName: input.displayName,
        description: input.description,
        framework: input.framework,
        task: input.task,
        tags: [],
        ownerId,
        ownerEmail,
        teamId: null,
        isPublic: false,
        allowFineTune: false,
        versions: [],
        _count: { versions: 0, deployments: 0 },
      };

      mockPrisma.model.create.mockResolvedValue(createdModel);

      const result = await createModel(tenantId, ownerId, ownerEmail, input);

      expect(result.id).toBe('model-1');
      expect(result.name).toBe(input.name);
      expect(mockPrisma.model.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          name: input.name,
          displayName: input.displayName,
          description: input.description,
          framework: input.framework,
          task: input.task,
          tags: [],
          ownerId,
          ownerEmail,
          isPublic: false,
          allowFineTune: false,
        }),
        include: expect.any(Object),
      });
    });

    it('should create model with tags', async () => {
      const input = {
        name: 'math-model',
        displayName: 'Math Model',
        framework: 'tensorflow',
        task: 'regression',
        tags: ['math', 'elementary', 'addition'],
      };

      mockPrisma.model.create.mockResolvedValue({
        id: 'model-1',
        tags: input.tags,
      });

      await createModel(tenantId, ownerId, ownerEmail, input);

      expect(mockPrisma.model.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tags: ['math', 'elementary', 'addition'],
        }),
        include: expect.any(Object),
      });
    });

    it('should create model with team assignment', async () => {
      const input = {
        name: 'team-model',
        displayName: 'Team Model',
        framework: 'pytorch',
        task: 'sequence-labeling',
        teamId: 'team-ml-1',
      };

      mockPrisma.model.create.mockResolvedValue({
        id: 'model-1',
        teamId: input.teamId,
      });

      await createModel(tenantId, ownerId, ownerEmail, input);

      expect(mockPrisma.model.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          teamId: 'team-ml-1',
        }),
        include: expect.any(Object),
      });
    });

    it('should create public model when specified', async () => {
      const input = {
        name: 'public-model',
        displayName: 'Public Model',
        framework: 'huggingface',
        task: 'text-generation',
        isPublic: true,
        allowFineTune: true,
      };

      mockPrisma.model.create.mockResolvedValue({
        id: 'model-1',
        isPublic: true,
        allowFineTune: true,
      });

      await createModel(tenantId, ownerId, ownerEmail, input);

      expect(mockPrisma.model.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isPublic: true,
          allowFineTune: true,
        }),
        include: expect.any(Object),
      });
    });

    it('should include recent versions in response', async () => {
      mockPrisma.model.create.mockResolvedValue({
        id: 'model-1',
        versions: [{ id: 'v1', version: '1.0.0', stage: 'DRAFT' }],
        _count: { versions: 1, deployments: 0 },
      });

      const result = await createModel(tenantId, ownerId, ownerEmail, {
        name: 'test',
        displayName: 'Test',
        framework: 'pytorch',
        task: 'classification',
      });

      expect(mockPrisma.model.create).toHaveBeenCalledWith({
        data: expect.any(Object),
        include: {
          versions: {
            select: { id: true, version: true, stage: true },
            orderBy: { versionNumber: 'desc' },
            take: 5,
          },
          _count: {
            select: { versions: true, deployments: true },
          },
        },
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GET MODEL BY ID
  // ════════════════════════════════════════════════════════════════════════════

  describe('getModelById', () => {
    it('should return null when model not found', async () => {
      mockPrisma.model.findFirst.mockResolvedValue(null);

      const result = await getModelById(tenantId, 'nonexistent-id');

      expect(result).toBeNull();
      expect(mockPrisma.model.findFirst).toHaveBeenCalledWith({
        where: { id: 'nonexistent-id', tenantId },
        include: expect.any(Object),
      });
    });

    it('should return model with versions', async () => {
      const mockModel = {
        id: 'model-1',
        tenantId,
        name: 'aivo-model',
        versions: [
          {
            id: 'v3',
            version: '1.2.0',
            versionNumber: 3,
            stage: 'PRODUCTION',
            createdAt: new Date(),
          },
          {
            id: 'v2',
            version: '1.1.0',
            versionNumber: 2,
            stage: 'DEPRECATED',
            createdAt: new Date(),
          },
          {
            id: 'v1',
            version: '1.0.0',
            versionNumber: 1,
            stage: 'ARCHIVED',
            createdAt: new Date(),
          },
        ],
        _count: { versions: 3, deployments: 2 },
      };

      mockPrisma.model.findFirst.mockResolvedValue(mockModel);

      const result = await getModelById(tenantId, 'model-1');

      expect(result?.id).toBe('model-1');
      expect(result?.versions).toHaveLength(3);
      expect(result?._count.versions).toBe(3);
    });

    it('should enforce tenant isolation', async () => {
      mockPrisma.model.findFirst.mockResolvedValue(null);

      await getModelById('tenant-A', 'model-1');

      expect(mockPrisma.model.findFirst).toHaveBeenCalledWith({
        where: { id: 'model-1', tenantId: 'tenant-A' },
        include: expect.any(Object),
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GET MODEL BY NAME
  // ════════════════════════════════════════════════════════════════════════════

  describe('getModelByName', () => {
    it('should return null when model not found', async () => {
      mockPrisma.model.findFirst.mockResolvedValue(null);

      const result = await getModelByName(tenantId, 'nonexistent-model');

      expect(result).toBeNull();
    });

    it('should find model by name within tenant', async () => {
      const mockModel = {
        id: 'model-1',
        name: 'reading-model',
        versions: [],
        _count: { versions: 0, deployments: 0 },
      };

      mockPrisma.model.findFirst.mockResolvedValue(mockModel);

      const result = await getModelByName(tenantId, 'reading-model');

      expect(result?.name).toBe('reading-model');
      expect(mockPrisma.model.findFirst).toHaveBeenCalledWith({
        where: { tenantId, name: 'reading-model' },
        include: expect.any(Object),
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // LIST MODELS
  // ════════════════════════════════════════════════════════════════════════════

  describe('listModels', () => {
    it('should return paginated results with defaults', async () => {
      const mockModels = [
        { id: 'model-1', name: 'model-a', _count: { versions: 2, deployments: 1 } },
        { id: 'model-2', name: 'model-b', _count: { versions: 1, deployments: 0 } },
      ];

      mockPrisma.model.findMany.mockResolvedValue(mockModels);
      mockPrisma.model.count.mockResolvedValue(2);

      const result = await listModels(tenantId, {});

      expect(result.data).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 20,
        totalItems: 2,
        totalPages: 1,
      });
    });

    it('should filter by framework', async () => {
      mockPrisma.model.findMany.mockResolvedValue([]);
      mockPrisma.model.count.mockResolvedValue(0);

      await listModels(tenantId, { framework: 'pytorch' });

      expect(mockPrisma.model.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenantId,
          framework: 'pytorch',
        }),
        include: expect.any(Object),
        orderBy: expect.any(Object),
        skip: 0,
        take: 20,
      });
    });

    it('should filter by task', async () => {
      mockPrisma.model.findMany.mockResolvedValue([]);
      mockPrisma.model.count.mockResolvedValue(0);

      await listModels(tenantId, { task: 'text-classification' });

      expect(mockPrisma.model.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          task: 'text-classification',
        }),
        include: expect.any(Object),
        orderBy: expect.any(Object),
        skip: expect.any(Number),
        take: expect.any(Number),
      });
    });

    it('should filter by tags using hasSome', async () => {
      mockPrisma.model.findMany.mockResolvedValue([]);
      mockPrisma.model.count.mockResolvedValue(0);

      await listModels(tenantId, { tags: ['math', 'reading'] });

      expect(mockPrisma.model.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tags: { hasSome: ['math', 'reading'] },
        }),
        include: expect.any(Object),
        orderBy: expect.any(Object),
        skip: expect.any(Number),
        take: expect.any(Number),
      });
    });

    it('should filter by owner', async () => {
      mockPrisma.model.findMany.mockResolvedValue([]);
      mockPrisma.model.count.mockResolvedValue(0);

      await listModels(tenantId, { ownerId: 'user-123' });

      expect(mockPrisma.model.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          ownerId: 'user-123',
        }),
        include: expect.any(Object),
        orderBy: expect.any(Object),
        skip: expect.any(Number),
        take: expect.any(Number),
      });
    });

    it('should search across multiple fields', async () => {
      mockPrisma.model.findMany.mockResolvedValue([]);
      mockPrisma.model.count.mockResolvedValue(0);

      await listModels(tenantId, { search: 'reading' });

      expect(mockPrisma.model.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          OR: [
            { name: { contains: 'reading', mode: 'insensitive' } },
            { displayName: { contains: 'reading', mode: 'insensitive' } },
            { description: { contains: 'reading', mode: 'insensitive' } },
          ],
        }),
        include: expect.any(Object),
        orderBy: expect.any(Object),
        skip: expect.any(Number),
        take: expect.any(Number),
      });
    });

    it('should handle pagination', async () => {
      mockPrisma.model.findMany.mockResolvedValue([]);
      mockPrisma.model.count.mockResolvedValue(100);

      const result = await listModels(tenantId, { page: 3, pageSize: 10 });

      expect(mockPrisma.model.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        include: expect.any(Object),
        orderBy: expect.any(Object),
        skip: 20, // (3-1) * 10
        take: 10,
      });

      expect(result.pagination).toEqual({
        page: 3,
        pageSize: 10,
        totalItems: 100,
        totalPages: 10,
      });
    });

    it('should support custom sorting', async () => {
      mockPrisma.model.findMany.mockResolvedValue([]);
      mockPrisma.model.count.mockResolvedValue(0);

      await listModels(tenantId, { sortBy: 'name', sortOrder: 'asc' });

      expect(mockPrisma.model.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        include: expect.any(Object),
        orderBy: { name: 'asc' },
        skip: expect.any(Number),
        take: expect.any(Number),
      });
    });

    it('should combine multiple filters', async () => {
      mockPrisma.model.findMany.mockResolvedValue([]);
      mockPrisma.model.count.mockResolvedValue(0);

      await listModels(tenantId, {
        framework: 'pytorch',
        task: 'text-classification',
        ownerId: 'user-1',
        tags: ['nlp'],
      });

      expect(mockPrisma.model.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          framework: 'pytorch',
          task: 'text-classification',
          ownerId: 'user-1',
          tags: { hasSome: ['nlp'] },
        },
        include: expect.any(Object),
        orderBy: expect.any(Object),
        skip: expect.any(Number),
        take: expect.any(Number),
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // UPDATE MODEL
  // ════════════════════════════════════════════════════════════════════════════

  describe('updateModel', () => {
    it('should update model display name', async () => {
      mockPrisma.model.update.mockResolvedValue({
        id: 'model-1',
        displayName: 'Updated Name',
        _count: { versions: 1, deployments: 0 },
      });

      const result = await updateModel(tenantId, 'model-1', {
        displayName: 'Updated Name',
      });

      expect(result.displayName).toBe('Updated Name');
      expect(mockPrisma.model.update).toHaveBeenCalledWith({
        where: { id: 'model-1', tenantId },
        data: {
          displayName: 'Updated Name',
          description: undefined,
          tags: undefined,
          isPublic: undefined,
          allowFineTune: undefined,
        },
        include: {
          _count: {
            select: { versions: true, deployments: true },
          },
        },
      });
    });

    it('should update model tags', async () => {
      mockPrisma.model.update.mockResolvedValue({
        id: 'model-1',
        tags: ['new-tag-1', 'new-tag-2'],
        _count: { versions: 1, deployments: 0 },
      });

      await updateModel(tenantId, 'model-1', {
        tags: ['new-tag-1', 'new-tag-2'],
      });

      expect(mockPrisma.model.update).toHaveBeenCalledWith({
        where: { id: 'model-1', tenantId },
        data: expect.objectContaining({
          tags: ['new-tag-1', 'new-tag-2'],
        }),
        include: expect.any(Object),
      });
    });

    it('should update visibility settings', async () => {
      mockPrisma.model.update.mockResolvedValue({
        id: 'model-1',
        isPublic: true,
        allowFineTune: true,
        _count: { versions: 1, deployments: 0 },
      });

      await updateModel(tenantId, 'model-1', {
        isPublic: true,
        allowFineTune: true,
      });

      expect(mockPrisma.model.update).toHaveBeenCalledWith({
        where: { id: 'model-1', tenantId },
        data: expect.objectContaining({
          isPublic: true,
          allowFineTune: true,
        }),
        include: expect.any(Object),
      });
    });

    it('should enforce tenant isolation', async () => {
      mockPrisma.model.update.mockResolvedValue({
        id: 'model-1',
        _count: { versions: 0, deployments: 0 },
      });

      await updateModel('tenant-B', 'model-1', { displayName: 'New Name' });

      expect(mockPrisma.model.update).toHaveBeenCalledWith({
        where: { id: 'model-1', tenantId: 'tenant-B' },
        data: expect.any(Object),
        include: expect.any(Object),
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // DELETE MODEL
  // ════════════════════════════════════════════════════════════════════════════

  describe('deleteModel', () => {
    it('should throw error if model has active deployments', async () => {
      mockPrisma.deployment.findFirst.mockResolvedValue({
        id: 'deployment-1',
        status: 'RUNNING',
      });

      await expect(deleteModel(tenantId, 'model-1')).rejects.toThrow();
    });

    it('should delete model and versions when no active deployments', async () => {
      mockPrisma.deployment.findFirst.mockResolvedValue(null);
      mockPrisma.modelVersion.deleteMany.mockResolvedValue({ count: 3 });
      mockPrisma.model.delete.mockResolvedValue({ id: 'model-1' });

      await deleteModel(tenantId, 'model-1');

      // First delete versions
      expect(mockPrisma.modelVersion.deleteMany).toHaveBeenCalledWith({
        where: { modelId: 'model-1' },
      });

      // Then delete model
      expect(mockPrisma.model.delete).toHaveBeenCalledWith({
        where: { id: 'model-1', tenantId },
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // TENANT ISOLATION
  // ════════════════════════════════════════════════════════════════════════════

  describe('tenant isolation', () => {
    it('should include tenantId in create', async () => {
      mockPrisma.model.create.mockResolvedValue({ id: 'model-1' });

      await createModel('tenant-isolated', 'user-1', 'user@test.com', {
        name: 'test',
        displayName: 'Test',
        framework: 'pytorch',
        task: 'classification',
      });

      expect(mockPrisma.model.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-isolated',
        }),
        include: expect.any(Object),
      });
    });

    it('should filter by tenantId in list', async () => {
      mockPrisma.model.findMany.mockResolvedValue([]);
      mockPrisma.model.count.mockResolvedValue(0);

      await listModels('tenant-filter-test', {});

      expect(mockPrisma.model.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenantId: 'tenant-filter-test',
        }),
        include: expect.any(Object),
        orderBy: expect.any(Object),
        skip: expect.any(Number),
        take: expect.any(Number),
      });
    });
  });
});
