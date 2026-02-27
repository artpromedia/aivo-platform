/**
 * Tests for changelog-svc service functions with mocked Prisma.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  changelogEntry: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  changelogRead: {
    upsert: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({
  prisma: mockPrisma,
}));

function makeFakeEntry(overrides: Record<string, any> = {}) {
  return {
    id: 'entry-1',
    version: '1.0.0',
    title: 'Feature X',
    summary: 'Summary of Feature X.',
    bodyMarkdown: '# Feature X',
    category: 'feature',
    audience: ['all'],
    tags: ['release'],
    imageUrl: null,
    isHighlight: false,
    publishedAt: new Date('2025-01-01'),
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    reads: [],
    ...overrides,
  };
}

describe('changelog service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listEntries', () => {
    it('returns paginated list', async () => {
      const { listEntries } = await import('../src/service.js');
      mockPrisma.changelogEntry.findMany.mockResolvedValue([makeFakeEntry()]);
      mockPrisma.changelogEntry.count.mockResolvedValue(1);

      const result = await listEntries({ page: 1, limit: 10 });
      expect(result).toBeDefined();
    });

    it('applies category filter', async () => {
      const { listEntries } = await import('../src/service.js');
      mockPrisma.changelogEntry.findMany.mockResolvedValue([]);
      mockPrisma.changelogEntry.count.mockResolvedValue(0);

      await listEntries({ page: 1, limit: 10, category: 'fix' });
      const call = mockPrisma.changelogEntry.findMany.mock.calls[0][0];
      expect(call.where).toBeDefined();
    });
  });

  describe('getEntry', () => {
    it('returns entry DTO', async () => {
      const { getEntry } = await import('../src/service.js');
      mockPrisma.changelogEntry.findUnique.mockResolvedValue(makeFakeEntry());

      const result = await getEntry('entry-1');
      expect(result).toBeDefined();
      expect(result?.id).toBe('entry-1');
    });

    it('returns null for missing entry', async () => {
      const { getEntry } = await import('../src/service.js');
      mockPrisma.changelogEntry.findUnique.mockResolvedValue(null);

      const result = await getEntry('nope');
      expect(result).toBeNull();
    });
  });

  describe('getUnreadCount', () => {
    it('counts entries not read by user', async () => {
      const { getUnreadCount } = await import('../src/service.js');
      mockPrisma.changelogEntry.count.mockResolvedValue(5);

      const result = await getUnreadCount('user-1');
      expect(result).toBe(5);
    });
  });

  describe('markRead', () => {
    it('upserts changelog read record', async () => {
      const { markRead } = await import('../src/service.js');
      mockPrisma.changelogRead.upsert.mockResolvedValue({
        userId: 'user-1',
        entryId: 'entry-1',
      });

      await markRead('user-1', 'entry-1');
      expect(mockPrisma.changelogRead.upsert).toHaveBeenCalled();
    });
  });

  describe('markAllRead', () => {
    it('marks all entries as read for user', async () => {
      const { markAllRead } = await import('../src/service.js');
      mockPrisma.changelogEntry.findMany.mockResolvedValue([
        { id: 'e1' },
        { id: 'e2' },
      ]);
      mockPrisma.changelogRead.upsert.mockResolvedValue({});

      await markAllRead('user-1');
      // should upsert for each entry
      expect(mockPrisma.changelogRead.upsert).toHaveBeenCalled();
    });
  });

  describe('createEntry', () => {
    it('creates entry with all fields', async () => {
      const { createEntry } = await import('../src/service.js');
      const input = {
        title: 'New',
        body: 'body',
        summary: 'summary',
        category: 'feature' as any,
        audience: ['all'],
        version: '2.0.0',
        tags: ['tag'],
      };
      mockPrisma.changelogEntry.create.mockResolvedValue(
        makeFakeEntry({ title: 'New', version: '2.0.0' }),
      );

      const result = await createEntry(input);
      expect(result).toBeDefined();
    });
  });

  describe('updateEntry', () => {
    it('updates existing entry', async () => {
      const { updateEntry } = await import('../src/service.js');
      mockPrisma.changelogEntry.update.mockResolvedValue(
        makeFakeEntry({ title: 'Updated' }),
      );

      const result = await updateEntry('entry-1', { title: 'Updated' });
      expect(result).toBeDefined();
    });
  });

  describe('deleteEntry', () => {
    it('deletes entry by id', async () => {
      const { deleteEntry } = await import('../src/service.js');
      mockPrisma.changelogEntry.delete.mockResolvedValue({ id: 'entry-1' });

      await deleteEntry('entry-1');
      expect(mockPrisma.changelogEntry.delete).toHaveBeenCalledWith({
        where: { id: 'entry-1' },
      });
    });
  });
});
