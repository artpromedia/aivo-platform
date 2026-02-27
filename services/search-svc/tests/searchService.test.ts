/**
 * Tests for search-svc searchService functions (with mocked Prisma).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma client
const mockPrisma = {
  searchIndex: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  searchDocument: {
    upsert: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  searchQuery: {
    create: vi.fn(),
    groupBy: vi.fn(),
    findMany: vi.fn(),
  },
  searchSuggestion: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  synonymRule: {
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  boostRule: {
    create: vi.fn(),
  },
  facetConfig: {
    upsert: vi.fn(),
  },
  reindexJob: {
    create: vi.fn(),
    findFirst: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({
  prisma: mockPrisma,
  Prisma: { JsonNull: null },
}));

describe('searchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createIndex', () => {
    it('creates a search index with required fields', async () => {
      const { createIndex } = await import('../src/services/searchService.js');

      const indexData = {
        name: 'lessons',
        sourceType: 'lesson',
        sourceTable: 'lessons',
        fields: { title: 'text', body: 'text' },
      };

      mockPrisma.searchIndex.create.mockResolvedValue({
        id: 'idx-1',
        tenantId: 'tenant-1',
        ...indexData,
        status: 'BUILDING',
      });

      const result = await createIndex('tenant-1', indexData);
      expect(mockPrisma.searchIndex.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          name: 'lessons',
          status: 'BUILDING',
        }),
      });
      expect(result.status).toBe('BUILDING');
    });
  });

  describe('getIndex', () => {
    it('finds an index by tenantId and indexId', async () => {
      const { getIndex } = await import('../src/services/searchService.js');

      mockPrisma.searchIndex.findFirst.mockResolvedValue({
        id: 'idx-1',
        tenantId: 'tenant-1',
        name: 'lessons',
      });

      const result = await getIndex('tenant-1', 'idx-1');
      expect(mockPrisma.searchIndex.findFirst).toHaveBeenCalledWith({
        where: { id: 'idx-1', tenantId: 'tenant-1' },
        include: expect.objectContaining({
          synonyms: expect.any(Object),
          stopwords: expect.any(Object),
          boostRules: expect.any(Object),
        }),
      });
      expect(result).toBeDefined();
    });
  });

  describe('listIndexes', () => {
    it('lists indexes for a tenant', async () => {
      const { listIndexes } = await import('../src/services/searchService.js');

      mockPrisma.searchIndex.findMany.mockResolvedValue([
        { id: 'idx-1', name: 'lessons' },
        { id: 'idx-2', name: 'users' },
      ]);

      const result = await listIndexes('tenant-1');
      expect(result).toHaveLength(2);
    });

    it('applies status filter', async () => {
      const { listIndexes } = await import('../src/services/searchService.js');

      mockPrisma.searchIndex.findMany.mockResolvedValue([]);

      await listIndexes('tenant-1', { status: 'ACTIVE' as any });
      expect(mockPrisma.searchIndex.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });
  });

  describe('indexDocument', () => {
    it('upserts a document with search vector', async () => {
      const { indexDocument } = await import('../src/services/searchService.js');

      mockPrisma.searchDocument.upsert.mockResolvedValue({
        id: 'doc-1',
        sourceId: 'src-1',
        status: 'INDEXED',
      });

      const result = await indexDocument('tenant-1', 'idx-1', {
        sourceId: 'src-1',
        content: { title: 'Hello World' },
      });

      expect(mockPrisma.searchDocument.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { indexId_sourceId: { indexId: 'idx-1', sourceId: 'src-1' } },
          create: expect.objectContaining({
            tenantId: 'tenant-1',
            searchVector: expect.any(String),
          }),
        }),
      );
      expect(result.status).toBe('INDEXED');
    });
  });

  describe('bulkIndexDocuments', () => {
    it('indexes multiple documents and returns counts', async () => {
      const { bulkIndexDocuments } = await import('../src/services/searchService.js');

      mockPrisma.searchDocument.upsert.mockResolvedValue({ id: 'doc-1' });
      mockPrisma.searchIndex.update.mockResolvedValue({});

      const docs = [
        { sourceId: 'src-1', content: { title: 'Doc 1' } },
        { sourceId: 'src-2', content: { title: 'Doc 2' } },
      ];

      const result = await bulkIndexDocuments('tenant-1', 'idx-1', docs);
      expect(result.total).toBe(2);
      expect(result.indexed).toBe(2);
      expect(result.failed).toBe(0);
    });
  });

  describe('deleteDocument', () => {
    it('deletes a document by sourceId', async () => {
      const { deleteDocument } = await import('../src/services/searchService.js');

      mockPrisma.searchDocument.delete.mockResolvedValue({ id: 'doc-1' });

      await deleteDocument('tenant-1', 'idx-1', 'src-1');
      expect(mockPrisma.searchDocument.delete).toHaveBeenCalledWith({
        where: { indexId_sourceId: { indexId: 'idx-1', sourceId: 'src-1' } },
      });
    });
  });

  describe('getSuggestions', () => {
    it('returns suggestions matching prefix', async () => {
      const { getSuggestions } = await import('../src/services/searchService.js');

      mockPrisma.searchSuggestion.findMany.mockResolvedValue([
        { phrase: 'math homework', frequency: 10 },
        { phrase: 'math test', frequency: 5 },
      ]);

      const result = await getSuggestions('tenant-1', 'lessons', 'math');
      expect(result).toHaveLength(2);
      expect(mockPrisma.searchSuggestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            indexName: 'lessons',
            phrase: { startsWith: 'math' },
          }),
        }),
      );
    });
  });

  describe('addSynonym', () => {
    it('creates or updates synonym rule', async () => {
      const { addSynonym } = await import('../src/services/searchService.js');

      mockPrisma.synonymRule.upsert.mockResolvedValue({
        term: 'math',
        synonyms: ['arithmetic', 'mathematics'],
      });

      const result = await addSynonym('tenant-1', 'idx-1', 'math', ['arithmetic', 'mathematics']);
      expect(mockPrisma.synonymRule.upsert).toHaveBeenCalled();
      expect(result.term).toBe('math');
    });
  });

  describe('addBoostRule', () => {
    it('creates a boost rule', async () => {
      const { addBoostRule } = await import('../src/services/searchService.js');

      mockPrisma.boostRule.create.mockResolvedValue({
        field: 'title',
        boostFactor: 2.0,
      });

      const result = await addBoostRule('tenant-1', 'idx-1', {
        field: 'title',
        boostFactor: 2.0,
      });
      expect(result.boostFactor).toBe(2.0);
    });
  });

  describe('triggerReindex', () => {
    it('creates a reindex job and marks index as REBUILDING', async () => {
      const { triggerReindex } = await import('../src/services/searchService.js');

      mockPrisma.reindexJob.create.mockResolvedValue({ id: 'job-1', status: 'pending' });
      mockPrisma.searchIndex.update.mockResolvedValue({});

      const result = await triggerReindex('tenant-1', 'idx-1');
      expect(result.status).toBe('pending');
      expect(mockPrisma.searchIndex.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'REBUILDING' },
        }),
      );
    });
  });
});
