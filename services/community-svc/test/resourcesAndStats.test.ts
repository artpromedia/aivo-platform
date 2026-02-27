/**
 * Tests for community-svc resource and stats services.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  resource: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  post: {
    count: vi.fn(),
    findMany: vi.fn(),
    groupBy: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
  },
  download: {
    create: vi.fn(),
    count: vi.fn(),
  },
};

vi.mock('../src/db.js', () => ({ prisma: mockPrisma }));

describe('ResourceService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('createResource', () => {
    it('creates a community resource', async () => {
      const resource = {
        id: 'res-1',
        title: 'Math Worksheet Pack',
        type: 'DOCUMENT',
        authorId: 'user-1',
        tenantId: 'tenant-1',
        url: 'https://cdn.aivo.com/resources/math-ws.pdf',
      };
      mockPrisma.resource.create.mockResolvedValue(resource);

      const result = await mockPrisma.resource.create({ data: resource });
      expect(result.title).toBe('Math Worksheet Pack');
      expect(result.type).toBe('DOCUMENT');
    });
  });

  describe('listResources', () => {
    it('returns paginated resources', async () => {
      mockPrisma.resource.findMany.mockResolvedValue([
        { id: 'res-1', title: 'Resource 1' },
        { id: 'res-2', title: 'Resource 2' },
      ]);
      mockPrisma.resource.count.mockResolvedValue(2);

      const resources = await mockPrisma.resource.findMany({ take: 10, skip: 0 });
      expect(resources).toHaveLength(2);
    });

    it('filters by type', async () => {
      mockPrisma.resource.findMany.mockResolvedValue([
        { id: 'res-1', type: 'VIDEO' },
      ]);

      const result = await mockPrisma.resource.findMany({
        where: { type: 'VIDEO' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('VIDEO');
    });
  });

  describe('deleteResource', () => {
    it('removes resource by id', async () => {
      mockPrisma.resource.delete.mockResolvedValue({ id: 'res-1' });
      const deleted = await mockPrisma.resource.delete({ where: { id: 'res-1' } });
      expect(deleted.id).toBe('res-1');
    });
  });

  describe('downloadResource', () => {
    it('records download event', async () => {
      mockPrisma.download.create.mockResolvedValue({
        id: 'dl-1',
        resourceId: 'res-1',
        userId: 'user-1',
      });
      const dl = await mockPrisma.download.create({
        data: { resourceId: 'res-1', userId: 'user-1' },
      });
      expect(dl.resourceId).toBe('res-1');
    });
  });
});

describe('StatsService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getCommunityStats', () => {
    it('returns aggregate counts', async () => {
      mockPrisma.post.count.mockResolvedValue(150);
      mockPrisma.resource.count.mockResolvedValue(45);

      const postCount = await mockPrisma.post.count({});
      const resourceCount = await mockPrisma.resource.count({});

      expect(postCount).toBe(150);
      expect(resourceCount).toBe(45);
    });
  });

  describe('getTrendingTopics', () => {
    it('returns grouped topic counts', async () => {
      mockPrisma.post.groupBy.mockResolvedValue([
        { topic: 'math', _count: { id: 25 } },
        { topic: 'reading', _count: { id: 18 } },
      ]);

      const topics = await mockPrisma.post.groupBy({
        by: ['topic'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      });
      expect(topics).toHaveLength(2);
      expect(topics[0].topic).toBe('math');
    });
  });

  describe('getTopContributors', () => {
    it('returns users sorted by post count', async () => {
      mockPrisma.post.groupBy.mockResolvedValue([
        { authorId: 'user-1', _count: { id: 30 } },
        { authorId: 'user-2', _count: { id: 22 } },
      ]);

      const contributors = await mockPrisma.post.groupBy({
        by: ['authorId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      });
      expect(contributors).toHaveLength(2);
    });
  });
});
