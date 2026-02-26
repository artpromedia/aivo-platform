import { describe, it, expect, afterEach, vi } from 'vitest';

describe('robots', () => {
  const originalEnv = process.env.NEXT_PUBLIC_MARKETING_URL;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_MARKETING_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_MARKETING_URL;
    }
    vi.resetModules();
  });

  async function loadRobots() {
    const mod = await import('../src/app/robots');
    return mod.default;
  }

  it('returns a robots config object', async () => {
    const robots = await loadRobots();
    const result = robots();
    expect(result).toHaveProperty('rules');
    expect(result).toHaveProperty('sitemap');
  });

  it('has rules array with at least one rule', async () => {
    const robots = await loadRobots();
    const result = robots();
    expect(Array.isArray(result.rules)).toBe(true);
    expect(result.rules.length).toBeGreaterThanOrEqual(1);
  });

  it('first rule applies to all user agents', async () => {
    const robots = await loadRobots();
    const result = robots();
    expect(result.rules[0].userAgent).toBe('*');
  });

  it('allows root path', async () => {
    const robots = await loadRobots();
    const result = robots();
    expect(result.rules[0].allow).toBe('/');
  });

  it('disallows api and admin paths', async () => {
    const robots = await loadRobots();
    const result = robots();
    const disallowed = result.rules[0].disallow;
    expect(disallowed).toContain('/api/');
    expect(disallowed).toContain('/admin/');
  });

  it('sitemap uses fallback URL when env is not set', async () => {
    delete process.env.NEXT_PUBLIC_MARKETING_URL;
    const robots = await loadRobots();
    const result = robots();
    expect(result.sitemap).toBe('https://aivolearning.com/sitemap.xml');
  });

  it('sitemap uses custom base URL from env', async () => {
    process.env.NEXT_PUBLIC_MARKETING_URL = 'https://custom.example.com';
    const robots = await loadRobots();
    const result = robots();
    expect(result.sitemap).toBe('https://custom.example.com/sitemap.xml');
  });

  it('sitemap URL ends with /sitemap.xml', async () => {
    const robots = await loadRobots();
    const result = robots();
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/);
  });
});
