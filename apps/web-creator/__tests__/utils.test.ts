import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn (class name merge utility)', () => {
  it('merges multiple class name strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('returns single class name', () => {
    expect(cn('foo')).toBe('foo');
  });

  it('returns empty string for no args', () => {
    expect(cn()).toBe('');
  });

  it('filters out undefined values', () => {
    expect(cn('foo', undefined, 'bar')).toBe('foo bar');
  });

  it('filters out null values', () => {
    expect(cn('foo', null, 'bar')).toBe('foo bar');
  });

  it('filters out false values', () => {
    expect(cn('foo', false, 'bar')).toBe('foo bar');
  });

  it('handles all falsy values together', () => {
    expect(cn(undefined, null, false)).toBe('');
  });

  it('handles conditional class pattern', () => {
    const isActive = true;
    const isDisabled = false;
    const result = cn('base', isActive && 'active', isDisabled && 'disabled');
    expect(result).toBe('base active');
  });

  it('preserves whitespace in individual class names', () => {
    // If someone passes a multi-class string, it should be preserved
    expect(cn('foo bar', 'baz')).toBe('foo bar baz');
  });

  it('handles empty string inputs', () => {
    // empty strings are falsy and should be filtered
    expect(cn('foo', '', 'bar')).toBe('foo bar');
  });
});
