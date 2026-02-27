import { describe, it, expect } from 'vitest';

import {
  cn,
  formatRelativeTime,
  truncate,
  getInitials,
  formatDuration,
  formatNumber,
  delay,
  isDev,
  generateId,
} from '@/lib/utils';

// ── cn (class name merge) ────────────────────────────────────────

describe('cn', () => {
  it('merges class names', () => {
    const result = cn('px-2', 'py-4');
    expect(result).toContain('px-2');
    expect(result).toContain('py-4');
  });

  it('handles conditional classes', () => {
    const result = cn('base', false && 'skip', 'end');
    expect(result).not.toContain('skip');
    expect(result).toContain('base');
    expect(result).toContain('end');
  });
});

// ── formatRelativeTime ───────────────────────────────────────────

describe('formatRelativeTime', () => {
  it('returns "just now" for recent timestamps', () => {
    const now = new Date().toISOString();
    const result = formatRelativeTime(now);
    expect(result).toMatch(/just now|seconds? ago/i);
  });

  it('returns time string for older timestamps', () => {
    const past = new Date(Date.now() - 3600_000).toISOString(); // 1 hr ago
    const result = formatRelativeTime(past);
    expect(result).toBe('1h ago');
  });
});

// ── truncate ─────────────────────────────────────────────────────

describe('truncate', () => {
  it('returns original if within limit', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates and adds ellipsis', () => {
    const result = truncate('hello world', 8);
    expect(result).toBe('hello...');
    expect(result.length).toBe(8);
  });
});

// ── getInitials ──────────────────────────────────────────────────

describe('getInitials', () => {
  it('gets initials from full name', () => {
    expect(getInitials('John Doe')).toBe('JD');
  });

  it('gets single initial from single name', () => {
    expect(getInitials('Alice')).toMatch(/^A/);
  });

  it('handles empty string gracefully', () => {
    // Edge case - empty string split gives [''], accessing [0] yields undefined
    const result = getInitials('');
    expect(typeof result).toBe('string');
  });
});

// ── formatDuration ───────────────────────────────────────────────

describe('formatDuration', () => {
  it('formats minutes under 60', () => {
    const result = formatDuration(45);
    expect(result).toBe('45m');
  });

  it('formats hours', () => {
    const result = formatDuration(120);
    expect(result).toBe('2h');
  });

  it('formats hours and minutes', () => {
    const result = formatDuration(90);
    expect(result).toBe('1h 30m');
  });
});

// ── formatNumber ─────────────────────────────────────────────────

describe('formatNumber', () => {
  it('formats thousands with K suffix', () => {
    const result = formatNumber(1234);
    expect(result).toBe('1.2K');
  });

  it('formats millions with M suffix', () => {
    expect(formatNumber(2500000)).toBe('2.5M');
  });

  it('returns small numbers as-is', () => {
    expect(formatNumber(42)).toBe('42');
  });
});

// ── delay ────────────────────────────────────────────────────────

describe('delay', () => {
  it('returns a promise that resolves', async () => {
    const start = Date.now();
    await delay(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });
});

// ── isDev ────────────────────────────────────────────────────────

describe('isDev', () => {
  it('returns a boolean', () => {
    expect(typeof isDev()).toBe('boolean');
  });
});

// ── generateId ───────────────────────────────────────────────────

describe('generateId', () => {
  it('generates unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('returns alphanumeric string', () => {
    const id = generateId();
    expect(id).toMatch(/^[a-z0-9]+$/);
  });
});
