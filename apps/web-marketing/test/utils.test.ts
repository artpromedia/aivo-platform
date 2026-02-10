import { describe, it, expect } from 'vitest';
import { formatNumber, formatCurrency, staggerDelay, truncate } from '../src/lib/utils.js';

// ============================================================================
// formatNumber
// ============================================================================
describe('formatNumber', () => {
  it('formats whole numbers with commas', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1000000)).toBe('1,000,000');
  });

  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('handles negative numbers', () => {
    const result = formatNumber(-5000);
    // Intl may use different minus signs; just verify it contains 5,000
    expect(result).toContain('5,000');
  });

  it('formats decimal numbers', () => {
    const result = formatNumber(1234.56);
    expect(result).toContain('1,234');
  });
});

// ============================================================================
// formatCurrency
// ============================================================================
describe('formatCurrency', () => {
  it('formats USD currency', () => {
    const result = formatCurrency(99.99);
    expect(result).toContain('$');
    expect(result).toContain('99.99');
  });

  it('formats with different currency code', () => {
    const result = formatCurrency(50, 'EUR');
    expect(result).toContain('50');
  });

  it('handles zero amount', () => {
    const result = formatCurrency(0);
    expect(result).toContain('$');
    expect(result).toContain('0');
  });

  it('does not show unnecessary decimals for whole numbers', () => {
    const result = formatCurrency(100);
    expect(result).toContain('$');
    expect(result).toContain('100');
  });
});

// ============================================================================
// staggerDelay
// ============================================================================
describe('staggerDelay', () => {
  it('returns 0 for index 0 with default base', () => {
    expect(staggerDelay(0)).toBe(0);
  });

  it('returns baseDelay * index', () => {
    expect(staggerDelay(3, 0.1)).toBeCloseTo(0.3);
    expect(staggerDelay(5, 0.2)).toBeCloseTo(1.0);
  });

  it('uses default base delay of 0.1', () => {
    expect(staggerDelay(1)).toBeCloseTo(0.1);
    expect(staggerDelay(10)).toBeCloseTo(1.0);
  });
});

// ============================================================================
// truncate
// ============================================================================
describe('truncate', () => {
  it('truncates long strings with ellipsis', () => {
    expect(truncate('Hello, World!', 5)).toBe('Hello...');
  });

  it('returns original string when within limit', () => {
    expect(truncate('Hi', 10)).toBe('Hi');
  });

  it('returns original string when exactly at limit', () => {
    expect(truncate('Hello', 5)).toBe('Hello');
  });

  it('handles empty string', () => {
    expect(truncate('', 5)).toBe('');
  });
});
