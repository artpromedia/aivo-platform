/**
 * Tests for changelog-svc Zod schemas.
 */
import { describe, it, expect } from 'vitest';
import {
  ChangelogCategoryEnum,
  AudienceEnum,
  CreateEntrySchema,
  UpdateEntrySchema,
  ListEntriesQuerySchema,
} from '../src/schemas.js';

describe('ChangelogCategoryEnum', () => {
  it.each(['feature', 'improvement', 'fix', 'security', 'deprecation'])(
    'accepts valid category "%s"',
    (cat) => {
      expect(ChangelogCategoryEnum.parse(cat)).toBe(cat);
    },
  );

  it('rejects invalid category', () => {
    expect(() => ChangelogCategoryEnum.parse('bug')).toThrow();
  });
});

describe('AudienceEnum', () => {
  it.each(['all', 'admin', 'teacher', 'student', 'parent'])(
    'accepts valid audience "%s"',
    (aud) => {
      expect(AudienceEnum.parse(aud)).toBe(aud);
    },
  );

  it('rejects invalid audience', () => {
    expect(() => AudienceEnum.parse('staff')).toThrow();
  });
});

describe('CreateEntrySchema', () => {
  const validEntry = {
    title: 'New Feature',
    body: 'Detailed description of the feature.',
    category: 'feature',
    audience: ['all'],
  };

  it('accepts valid entry', () => {
    const result = CreateEntrySchema.safeParse(validEntry);
    expect(result.success).toBe(true);
  });

  it('requires title', () => {
    const { title, ...rest } = validEntry;
    const result = CreateEntrySchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('requires body', () => {
    const { body, ...rest } = validEntry;
    const result = CreateEntrySchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('requires category', () => {
    const { category, ...rest } = validEntry;
    const result = CreateEntrySchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('requires audience array', () => {
    const { audience, ...rest } = validEntry;
    const result = CreateEntrySchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects invalid category in create', () => {
    const result = CreateEntrySchema.safeParse({
      ...validEntry,
      category: 'hotfix',
    });
    expect(result.success).toBe(false);
  });

  it('accepts multiple audiences', () => {
    const result = CreateEntrySchema.safeParse({
      ...validEntry,
      audience: ['admin', 'teacher'],
    });
    expect(result.success).toBe(true);
  });
});

describe('UpdateEntrySchema', () => {
  it('accepts partial update with just title', () => {
    const result = UpdateEntrySchema.safeParse({ title: 'Updated Title' });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (all fields optional)', () => {
    const result = UpdateEntrySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts category update', () => {
    const result = UpdateEntrySchema.safeParse({ category: 'fix' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid category', () => {
    const result = UpdateEntrySchema.safeParse({ category: 'invalid' });
    expect(result.success).toBe(false);
  });
});

describe('ListEntriesQuerySchema', () => {
  it('accepts empty query (all optional)', () => {
    const result = ListEntriesQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts category filter', () => {
    const result = ListEntriesQuerySchema.safeParse({ category: 'feature' });
    expect(result.success).toBe(true);
  });

  it('accepts pagination params', () => {
    const result = ListEntriesQuerySchema.safeParse({
      page: '2',
      limit: '10',
    });
    expect(result.success).toBe(true);
  });

  it('accepts audience filter', () => {
    const result = ListEntriesQuerySchema.safeParse({ audience: 'teacher' });
    expect(result.success).toBe(true);
  });
});
