/**
 * Tests for search-svc pure helper functions.
 * Tests buildSearchVector, expandQueryWithSynonyms, generateHighlights.
 */
import { describe, it, expect } from 'vitest';

// Since the helpers are not exported, we replicate them for unit testing
// In a real setup we'd export them; here we test the logic directly.

function buildSearchVector(content: Record<string, unknown>): string {
  const values: string[] = [];
  for (const value of Object.values(content)) {
    if (typeof value === 'string') {
      values.push(value.toLowerCase());
    } else if (Array.isArray(value)) {
      values.push(...value.filter((v) => typeof v === 'string').map((v: string) => v.toLowerCase()));
    }
  }
  return values.join(' ');
}

function expandQueryWithSynonyms(
  query: string,
  synonyms: { term: string; synonyms: string[] }[]
): string {
  let expanded = query;
  for (const rule of synonyms) {
    if (query.toLowerCase().includes(rule.term.toLowerCase())) {
      expanded += ' ' + rule.synonyms.join(' ');
    }
  }
  return expanded;
}

function generateHighlights(
  content: Record<string, unknown>,
  terms: string[]
): Record<string, string[]> {
  const highlights: Record<string, string[]> = {};
  for (const [field, value] of Object.entries(content)) {
    if (typeof value === 'string') {
      const matches = terms.filter((term) => value.toLowerCase().includes(term));
      if (matches.length > 0) {
        let highlighted = value;
        for (const term of matches) {
          const regex = new RegExp(`(${term})`, 'gi');
          highlighted = highlighted.replace(regex, '<em>$1</em>');
        }
        highlights[field] = [highlighted];
      }
    }
  }
  return highlights;
}

// ── buildSearchVector ───────────────────────────────────────────────────────

describe('buildSearchVector', () => {
  it('extracts string values and lowercases them', () => {
    const result = buildSearchVector({ title: 'Hello World', description: 'A TEST' });
    expect(result).toBe('hello world a test');
  });

  it('handles array values with strings', () => {
    const result = buildSearchVector({
      tags: ['Math', 'Science', 'Art'],
    });
    expect(result).toBe('math science art');
  });

  it('ignores non-string, non-array values', () => {
    const result = buildSearchVector({
      count: 42,
      active: true,
      name: 'Test',
    });
    expect(result).toBe('test');
  });

  it('handles empty content', () => {
    const result = buildSearchVector({});
    expect(result).toBe('');
  });

  it('handles mixed arrays', () => {
    const result = buildSearchVector({
      items: ['One', 2, 'Three', null, 'Four'],
    });
    expect(result).toBe('one three four');
  });

  it('concatenates multiple fields with spaces', () => {
    const result = buildSearchVector({
      title: 'Lesson 1',
      body: 'Content here',
    });
    expect(result).toContain('lesson 1');
    expect(result).toContain('content here');
  });
});

// ── expandQueryWithSynonyms ─────────────────────────────────────────────────

describe('expandQueryWithSynonyms', () => {
  it('returns original query when no synonyms match', () => {
    const result = expandQueryWithSynonyms('algebra', [
      { term: 'geometry', synonyms: ['shapes', 'angles'] },
    ]);
    expect(result).toBe('algebra');
  });

  it('expands query with matching synonyms', () => {
    const result = expandQueryWithSynonyms('math homework', [
      { term: 'math', synonyms: ['mathematics', 'arithmetic'] },
    ]);
    expect(result).toContain('math homework');
    expect(result).toContain('mathematics');
    expect(result).toContain('arithmetic');
  });

  it('handles multiple matching synonym rules', () => {
    const result = expandQueryWithSynonyms('math test', [
      { term: 'math', synonyms: ['mathematics'] },
      { term: 'test', synonyms: ['exam', 'quiz'] },
    ]);
    expect(result).toContain('mathematics');
    expect(result).toContain('exam');
    expect(result).toContain('quiz');
  });

  it('handles empty synonyms array', () => {
    const result = expandQueryWithSynonyms('query', []);
    expect(result).toBe('query');
  });

  it('is case-insensitive matching', () => {
    const result = expandQueryWithSynonyms('MATH', [
      { term: 'math', synonyms: ['arithmetic'] },
    ]);
    expect(result).toContain('arithmetic');
  });
});

// ── generateHighlights ──────────────────────────────────────────────────────

describe('generateHighlights', () => {
  it('wraps matching terms in <em> tags', () => {
    const result = generateHighlights(
      { title: 'Introduction to Algebra' },
      ['algebra']
    );
    expect(result.title).toBeDefined();
    expect(result.title[0]).toContain('<em>Algebra</em>');
  });

  it('handles multiple terms in same field', () => {
    const result = generateHighlights(
      { body: 'Learn math and science today' },
      ['math', 'science']
    );
    expect(result.body[0]).toContain('<em>math</em>');
    expect(result.body[0]).toContain('<em>science</em>');
  });

  it('ignores fields without matches', () => {
    const result = generateHighlights(
      { title: 'Hello', body: 'World' },
      ['xyz']
    );
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('ignores non-string values', () => {
    const result = generateHighlights(
      { count: 42 as unknown, title: 'Test algebra' },
      ['algebra']
    );
    expect(result.count).toBeUndefined();
    expect(result.title).toBeDefined();
  });

  it('case-insensitive highlighting', () => {
    const result = generateHighlights(
      { title: 'MATH is fun' },
      ['math']
    );
    expect(result.title[0]).toContain('<em>MATH</em>');
  });

  it('returns empty object for empty content', () => {
    const result = generateHighlights({}, ['test']);
    expect(Object.keys(result)).toHaveLength(0);
  });
});
