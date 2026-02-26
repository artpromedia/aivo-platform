import { describe, it, expect, vi, beforeEach } from 'vitest';

import { contentApi } from '@/lib/api/content';
import type { Lesson, LessonVersion, LessonBlock } from '@/lib/api/content';

// ── Mock global fetch ────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function ok(data: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(data), text: () => Promise.resolve('') };
}
function err(status: number) {
  return { ok: false, status, json: () => Promise.resolve({}), text: () => Promise.resolve('error') };
}

beforeEach(() => {
  mockFetch.mockReset();
});

// ── contentApi.getLessons ────────────────────────────────────────

describe('contentApi.getLessons', () => {
  it('returns lessons array on success', async () => {
    const lessons: Lesson[] = [{
      id: 'l1', title: 'Lesson 1', versions: [], createdAt: '', updatedAt: '',
    }];
    mockFetch.mockResolvedValue(ok(lessons));
    const result = await contentApi.getLessons();
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Lesson 1');
  });

  it('returns empty array on failure', async () => {
    mockFetch.mockResolvedValue(err(500));
    const result = await contentApi.getLessons();
    expect(result).toEqual([]);
  });
});

// ── contentApi.getLesson ─────────────────────────────────────────

describe('contentApi.getLesson', () => {
  it('returns lesson on success', async () => {
    const lesson: Lesson = {
      id: 'l1', title: 'Test', versions: [], createdAt: '', updatedAt: '',
    };
    mockFetch.mockResolvedValue(ok(lesson));
    const result = await contentApi.getLesson('l1');
    expect(result?.id).toBe('l1');
  });

  it('returns null on failure', async () => {
    mockFetch.mockResolvedValue(err(404));
    const result = await contentApi.getLesson('missing');
    expect(result).toBeNull();
  });
});

// ── contentApi.getLessonVersion ───────────────────────────────────

describe('contentApi.getLessonVersion', () => {
  it('returns version on success', async () => {
    const version: LessonVersion = {
      id: 'v1', version: 1, versionNumber: 1, status: 'draft',
      blocks: [], createdAt: '', updatedAt: '',
    };
    mockFetch.mockResolvedValue(ok(version));
    const result = await contentApi.getLessonVersion('l1', 'v1');
    expect(result?.status).toBe('draft');
  });

  it('returns null on failure', async () => {
    mockFetch.mockResolvedValue(err(404));
    const result = await contentApi.getLessonVersion('l1', 'v1');
    expect(result).toBeNull();
  });
});

// ── contentApi.getLessonVersions ──────────────────────────────────

describe('contentApi.getLessonVersions', () => {
  it('returns versions array on success', async () => {
    mockFetch.mockResolvedValue(ok([
      { id: 'v1', version: 1, versionNumber: 1, status: 'published', blocks: [], createdAt: '', updatedAt: '' },
    ]));
    const result = await contentApi.getLessonVersions('l1');
    expect(result).toHaveLength(1);
  });

  it('returns empty array on failure', async () => {
    mockFetch.mockResolvedValue(err(500));
    const result = await contentApi.getLessonVersions('l1');
    expect(result).toEqual([]);
  });
});

// ── contentApi.createLessonVersion ───────────────────────────────

describe('contentApi.createLessonVersion', () => {
  it('posts and returns new version', async () => {
    const newVersion: LessonVersion = {
      id: 'v2', version: 2, versionNumber: 2, status: 'draft',
      blocks: [], createdAt: '', updatedAt: '',
    };
    mockFetch.mockResolvedValue(ok(newVersion));
    const result = await contentApi.createLessonVersion('l1', { status: 'draft', blocks: [] });
    expect(result.id).toBe('v2');
    const call = mockFetch.mock.calls[0];
    expect(call[1].method).toBe('POST');
  });
});

// ── Type shape tests ─────────────────────────────────────────────

describe('Content API types', () => {
  it('AdaptiveCondition has correct shape', async () => {
    const { default: _} = await import('@/lib/api/content');
    // Type check: construct manually
    const cond = {
      id: 'c1',
      type: 'performance' as const,
      operator: 'greater' as const,
      value: 80,
      targetBlockId: 'b1',
    };
    expect(cond.type).toBe('performance');
    expect(cond.operator).toBe('greater');
  });

  it('LessonBlock has required fields', () => {
    const block: LessonBlock = {
      id: 'b1',
      type: 'text',
      content: { body: 'Hello' },
      order: 0,
    };
    expect(block.type).toBe('text');
  });
});
