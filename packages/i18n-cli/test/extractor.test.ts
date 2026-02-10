import { describe, it, expect } from 'vitest';
import { groupByNamespace, sortKeys } from '../src/extractor.js';
import type { ExtractedKey } from '../src/extractor.js';

// =============================================================================
// Helpers
// =============================================================================

function makeKey(
  key: string,
  namespace?: string,
  filePath = 'src/app.tsx',
  line = 1
): ExtractedKey {
  return {
    key,
    namespace,
    filePath,
    line,
    column: 0,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('groupByNamespace', () => {
  it('groups keys by their namespace', () => {
    const keys = [
      makeKey('greeting', 'common'),
      makeKey('title', 'common'),
      makeKey('submit', 'forms'),
      makeKey('cancel', 'forms'),
      makeKey('welcome', 'auth'),
    ];

    const grouped = groupByNamespace(keys);

    expect(grouped.size).toBe(3);
    expect(grouped.get('common')?.length).toBe(2);
    expect(grouped.get('forms')?.length).toBe(2);
    expect(grouped.get('auth')?.length).toBe(1);
  });

  it('assigns keys without namespace to "common"', () => {
    const keys = [makeKey('hello'), makeKey('world')];

    const grouped = groupByNamespace(keys);

    expect(grouped.size).toBe(1);
    expect(grouped.has('common')).toBe(true);
    expect(grouped.get('common')?.length).toBe(2);
  });

  it('handles mixed keys with and without namespaces', () => {
    const keys = [makeKey('a', 'ns1'), makeKey('b'), makeKey('c', 'ns1')];

    const grouped = groupByNamespace(keys);

    expect(grouped.size).toBe(2);
    expect(grouped.get('ns1')?.map((k) => k.key)).toEqual(['a', 'c']);
    expect(grouped.get('common')?.map((k) => k.key)).toEqual(['b']);
  });

  it('returns empty map for empty array', () => {
    const grouped = groupByNamespace([]);
    expect(grouped.size).toBe(0);
  });
});

describe('sortKeys', () => {
  it('sorts keys alphabetically by key name', () => {
    const keys = [makeKey('zebra'), makeKey('apple'), makeKey('mango'), makeKey('banana')];

    const sorted = sortKeys(keys);

    expect(sorted.map((k) => k.key)).toEqual(['apple', 'banana', 'mango', 'zebra']);
  });

  it('does not mutate the original array', () => {
    const keys = [makeKey('b'), makeKey('a')];
    const sorted = sortKeys(keys);

    expect(keys[0]?.key).toBe('b');
    expect(sorted[0]?.key).toBe('a');
    expect(sorted).not.toBe(keys);
  });

  it('handles empty array', () => {
    expect(sortKeys([])).toEqual([]);
  });

  it('handles single element', () => {
    const keys = [makeKey('only')];
    const sorted = sortKeys(keys);
    expect(sorted).toEqual(keys);
  });

  it('handles already sorted input', () => {
    const keys = [makeKey('a'), makeKey('b'), makeKey('c')];
    const sorted = sortKeys(keys);
    expect(sorted.map((k) => k.key)).toEqual(['a', 'b', 'c']);
  });
});
