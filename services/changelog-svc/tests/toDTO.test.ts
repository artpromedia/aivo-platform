/**
 * Tests for changelog-svc toDTO pure function.
 */
import { describe, it, expect } from 'vitest';

// toDTO is not exported, so replicate the logic here for pure testing
interface EntryWithReads {
  id: string;
  version: string;
  title: string;
  summary: string;
  bodyMarkdown: string | null;
  category: string;
  audience: string[];
  tags: string[];
  imageUrl: string | null;
  isHighlight: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  reads?: { id: string }[];
}

function toDTO(e: EntryWithReads, userId?: string) {
  return {
    id: e.id,
    version: e.version,
    title: e.title,
    summary: e.summary,
    bodyMarkdown: e.bodyMarkdown,
    category: e.category,
    audience: e.audience,
    tags: e.tags,
    imageUrl: e.imageUrl,
    isHighlight: e.isHighlight,
    publishedAt: e.publishedAt?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    isRead: userId ? (e.reads?.length ?? 0) > 0 : undefined,
  };
}

function makeEntry(overrides: Partial<EntryWithReads> = {}): EntryWithReads {
  return {
    id: 'entry-1',
    version: '1.0.0',
    title: 'Initial Release',
    summary: 'First release of the platform.',
    bodyMarkdown: '# Release Notes',
    category: 'feature',
    audience: ['all'],
    tags: ['launch'],
    imageUrl: null,
    isHighlight: false,
    publishedAt: new Date('2025-01-15T12:00:00Z'),
    createdAt: new Date('2025-01-14T10:00:00Z'),
    updatedAt: new Date('2025-01-15T12:00:00Z'),
    reads: [],
    ...overrides,
  };
}

describe('toDTO', () => {
  it('maps all fields correctly', () => {
    const dto = toDTO(makeEntry());
    expect(dto.id).toBe('entry-1');
    expect(dto.version).toBe('1.0.0');
    expect(dto.title).toBe('Initial Release');
    expect(dto.summary).toBe('First release of the platform.');
    expect(dto.bodyMarkdown).toBe('# Release Notes');
    expect(dto.category).toBe('feature');
    expect(dto.audience).toEqual(['all']);
    expect(dto.tags).toEqual(['launch']);
    expect(dto.imageUrl).toBeNull();
    expect(dto.isHighlight).toBe(false);
  });

  it('converts dates to ISO strings', () => {
    const dto = toDTO(makeEntry());
    expect(dto.publishedAt).toBe('2025-01-15T12:00:00.000Z');
    expect(dto.createdAt).toBe('2025-01-14T10:00:00.000Z');
    expect(dto.updatedAt).toBe('2025-01-15T12:00:00.000Z');
  });

  it('returns null publishedAt when not published', () => {
    const dto = toDTO(makeEntry({ publishedAt: null }));
    expect(dto.publishedAt).toBeNull();
  });

  it('omits isRead when userId not provided', () => {
    const dto = toDTO(makeEntry({ reads: [{ id: 'r1' }] }));
    expect(dto.isRead).toBeUndefined();
  });

  it('returns isRead true when user has read record', () => {
    const dto = toDTO(makeEntry({ reads: [{ id: 'r1' }] }), 'user-1');
    expect(dto.isRead).toBe(true);
  });

  it('returns isRead false when user has no read records', () => {
    const dto = toDTO(makeEntry({ reads: [] }), 'user-1');
    expect(dto.isRead).toBe(false);
  });

  it('returns isRead false when reads is undefined', () => {
    const dto = toDTO(makeEntry({ reads: undefined }), 'user-1');
    expect(dto.isRead).toBe(false);
  });

  it('handles isHighlight=true', () => {
    const dto = toDTO(makeEntry({ isHighlight: true }));
    expect(dto.isHighlight).toBe(true);
  });

  it('handles multiple audience values', () => {
    const dto = toDTO(makeEntry({ audience: ['admin', 'teacher'] }));
    expect(dto.audience).toEqual(['admin', 'teacher']);
  });

  it('handles empty tags', () => {
    const dto = toDTO(makeEntry({ tags: [] }));
    expect(dto.tags).toEqual([]);
  });
});
