import { describe, it, expect } from 'vitest';

import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from '../src/types.js';
import type {
  ChangelogCategory,
  ChangelogAudience,
  ChangelogEntry,
  PaginatedChangelog,
} from '../src/types.js';

// ── ChangelogCategory tests ──────────────────────────────────────

describe('CATEGORY_LABELS', () => {
  it('has label for feature', () => {
    expect(CATEGORY_LABELS.feature).toBe('New Feature');
  });

  it('has label for improvement', () => {
    expect(CATEGORY_LABELS.improvement).toBe('Improvement');
  });

  it('has label for fix', () => {
    expect(CATEGORY_LABELS.fix).toBe('Bug Fix');
  });

  it('has label for security', () => {
    expect(CATEGORY_LABELS.security).toBe('Security');
  });

  it('has label for deprecation', () => {
    expect(CATEGORY_LABELS.deprecation).toBe('Deprecation');
  });

  it('covers all 5 categories', () => {
    expect(Object.keys(CATEGORY_LABELS)).toHaveLength(5);
  });
});

// ── CATEGORY_COLORS tests ────────────────────────────────────────

describe('CATEGORY_COLORS', () => {
  const categories: ChangelogCategory[] = ['feature', 'improvement', 'fix', 'security', 'deprecation'];

  it('has bg and text for all categories', () => {
    for (const cat of categories) {
      expect(CATEGORY_COLORS[cat].bg).toBeTruthy();
      expect(CATEGORY_COLORS[cat].text).toBeTruthy();
    }
  });

  it('bg values are hex colors', () => {
    for (const cat of categories) {
      expect(CATEGORY_COLORS[cat].bg).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('text values are hex colors', () => {
    for (const cat of categories) {
      expect(CATEGORY_COLORS[cat].text).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('each category has distinct colors', () => {
    const bgs = new Set(categories.map(c => CATEGORY_COLORS[c].bg));
    expect(bgs.size).toBe(5);
  });
});

// ── ChangelogEntry shape tests ───────────────────────────────────

describe('ChangelogEntry interface', () => {
  it('constructs a valid entry', () => {
    const entry: ChangelogEntry = {
      id: 'cl-001',
      version: '2.5.0',
      title: 'New Dashboard',
      summary: 'Redesigned analytics dashboard.',
      bodyMarkdown: '# Dashboard\nNew widgets.',
      category: 'feature',
      audience: ['district_admin', 'teacher'],
      tags: ['analytics', 'dashboard'],
      imageUrl: 'https://img.example.com/dashboard.png',
      isHighlight: true,
      publishedAt: '2024-03-15T00:00:00Z',
      createdAt: '2024-03-10T00:00:00Z',
      updatedAt: '2024-03-15T00:00:00Z',
    };
    expect(entry.id).toBe('cl-001');
    expect(entry.category).toBe('feature');
    expect(entry.audience).toContain('teacher');
    expect(entry.isHighlight).toBe(true);
  });

  it('supports null bodyMarkdown and imageUrl', () => {
    const entry: ChangelogEntry = {
      id: 'cl-002',
      version: '2.4.1',
      title: 'Bug fix',
      summary: 'Fixed login issue.',
      bodyMarkdown: null,
      category: 'fix',
      audience: ['developer'],
      tags: [],
      imageUrl: null,
      isHighlight: false,
      publishedAt: null,
      createdAt: '2024-02-01T00:00:00Z',
      updatedAt: '2024-02-01T00:00:00Z',
    };
    expect(entry.bodyMarkdown).toBeNull();
    expect(entry.imageUrl).toBeNull();
    expect(entry.publishedAt).toBeNull();
  });

  it('supports isRead flag', () => {
    const entry: ChangelogEntry = {
      id: 'cl-003',
      version: '2.6.0',
      title: 'Read test',
      summary: 'Testing isRead.',
      bodyMarkdown: null,
      category: 'improvement',
      audience: ['parent'],
      tags: [],
      imageUrl: null,
      isHighlight: false,
      publishedAt: null,
      createdAt: '2024-04-01T00:00:00Z',
      updatedAt: '2024-04-01T00:00:00Z',
      isRead: true,
    };
    expect(entry.isRead).toBe(true);
  });
});

// ── PaginatedChangelog shape tests ───────────────────────────────

describe('PaginatedChangelog interface', () => {
  it('constructs a valid paginated response', () => {
    const page: PaginatedChangelog = {
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    };
    expect(page.data).toHaveLength(0);
    expect(page.page).toBe(1);
    expect(page.limit).toBe(10);
  });

  it('supports data with entries', () => {
    const entry: ChangelogEntry = {
      id: 'e1',
      version: '1.0.0',
      title: 'First',
      summary: 'First release.',
      bodyMarkdown: null,
      category: 'feature',
      audience: ['learner'],
      tags: ['release'],
      imageUrl: null,
      isHighlight: false,
      publishedAt: '2024-01-01T00:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    const page: PaginatedChangelog = {
      data: [entry],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    };
    expect(page.data).toHaveLength(1);
    expect(page.total).toBe(1);
    expect(page.totalPages).toBe(1);
  });
});
