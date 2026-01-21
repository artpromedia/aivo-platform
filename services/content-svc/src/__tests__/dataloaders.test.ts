/**
 * DataLoader Unit Tests
 *
 * Tests for content-svc DataLoader functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createContentDataLoaders } from '../dataloaders/index.js';

// Mock Prisma client
vi.mock('../prisma.js', () => ({
  prisma: {
    learningObject: {
      findMany: vi.fn(),
    },
    version: {
      findMany: vi.fn(),
    },
    learningObjectTag: {
      findMany: vi.fn(),
    },
    file: {
      findMany: vi.fn(),
    },
    lesson: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../prisma.js';

describe('ContentDataLoaders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('learningObjectById', () => {
    it('should batch multiple load calls into single query', async () => {
      const mockLearningObjects = [
        { id: 'lo-1', slug: 'test-1', title: 'Test 1', subject: 'MATH', gradeBand: 'K_2' },
        { id: 'lo-2', slug: 'test-2', title: 'Test 2', subject: 'ELA', gradeBand: 'G3_5' },
      ];

      (prisma.learningObject.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockLearningObjects);

      const loaders = createContentDataLoaders('tenant-123');

      // Load in parallel - should batch
      const [lo1, lo2] = await Promise.all([
        loaders.learningObjectById.load('lo-1'),
        loaders.learningObjectById.load('lo-2'),
      ]);

      // Should only call findMany once
      expect(prisma.learningObject.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.learningObject.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['lo-1', 'lo-2'] },
          OR: [{ tenantId: 'tenant-123' }, { tenantId: null }],
        },
      });

      expect(lo1?.id).toBe('lo-1');
      expect(lo2?.id).toBe('lo-2');
    });

    it('should cache repeated loads', async () => {
      const mockLearningObjects = [
        { id: 'lo-1', slug: 'test-1', title: 'Test 1', subject: 'MATH', gradeBand: 'K_2' },
      ];

      (prisma.learningObject.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockLearningObjects);

      const loaders = createContentDataLoaders('tenant-123');

      // First load
      const first = await loaders.learningObjectById.load('lo-1');
      // Second load of same ID
      const second = await loaders.learningObjectById.load('lo-1');

      // Should only query once due to caching
      expect(prisma.learningObject.findMany).toHaveBeenCalledTimes(1);
      expect(first).toBe(second);
    });

    it('should return null for missing items', async () => {
      (prisma.learningObject.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const loaders = createContentDataLoaders('tenant-123');
      const result = await loaders.learningObjectById.load('missing-id');

      expect(result).toBeNull();
    });
  });

  describe('versionsByLearningObjectId', () => {
    it('should load versions grouped by learning object', async () => {
      const mockVersions = [
        { id: 'v-1', learningObjectId: 'lo-1', versionNumber: 2, state: 'PUBLISHED' },
        { id: 'v-2', learningObjectId: 'lo-1', versionNumber: 1, state: 'ARCHIVED' },
        { id: 'v-3', learningObjectId: 'lo-2', versionNumber: 1, state: 'PUBLISHED' },
      ];

      (prisma.learningObjectVersion.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockVersions);

      const loaders = createContentDataLoaders('tenant-123');

      const [versions1, versions2] = await Promise.all([
        loaders.versionsByLearningObjectId.load('lo-1'),
        loaders.versionsByLearningObjectId.load('lo-2'),
      ]);

      expect(prisma.learningObjectVersion.findMany).toHaveBeenCalledTimes(1);
      expect(versions1).toHaveLength(2);
      expect(versions2).toHaveLength(1);
    });

    it('should return empty array for learning objects without versions', async () => {
      (prisma.learningObjectVersion.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const loaders = createContentDataLoaders('tenant-123');
      const versions = await loaders.versionsByLearningObjectId.load('lo-no-versions');

      expect(versions).toEqual([]);
    });
  });

  describe('tagsByLearningObjectId', () => {
    it('should batch tag loads for multiple learning objects', async () => {
      const mockTags = [
        { id: 't-1', learningObjectId: 'lo-1', tag: 'math' },
        { id: 't-2', learningObjectId: 'lo-1', tag: 'algebra' },
        { id: 't-3', learningObjectId: 'lo-2', tag: 'reading' },
      ];

      (prisma.learningObjectTag.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockTags);

      const loaders = createContentDataLoaders('tenant-123');

      const [tags1, tags2] = await Promise.all([
        loaders.tagsByLearningObjectId.load('lo-1'),
        loaders.tagsByLearningObjectId.load('lo-2'),
      ]);

      expect(prisma.learningObjectTag.findMany).toHaveBeenCalledTimes(1);
      expect(tags1).toHaveLength(2);
      expect(tags2).toHaveLength(1);
    });
  });

  describe('request-scoped caching', () => {
    it('should not share cache between loader instances', async () => {
      const mockLearningObjects = [
        { id: 'lo-1', slug: 'test-1', title: 'Test 1', subject: 'MATH', gradeBand: 'K_2' },
      ];

      (prisma.learningObject.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockLearningObjects);

      // Simulate two different requests
      const loaders1 = createContentDataLoaders('tenant-1');
      const loaders2 = createContentDataLoaders('tenant-2');

      await loaders1.learningObjectById.load('lo-1');
      await loaders2.learningObjectById.load('lo-1');

      // Each loader instance should query independently
      expect(prisma.learningObject.findMany).toHaveBeenCalledTimes(2);
    });
  });
});
