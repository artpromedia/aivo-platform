import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// We need to test the default export function
// Since it reads process.env, we manage env in tests

describe('sitemap', () => {
  const originalEnv = process.env.NEXT_PUBLIC_MARKETING_URL;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_MARKETING_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_MARKETING_URL;
    }
    vi.resetModules();
  });

  async function loadSitemap() {
    const mod = await import('../src/app/sitemap');
    return mod.default;
  }

  it('returns an array of sitemap entries', async () => {
    const sitemap = await loadSitemap();
    const result = sitemap();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(15);
  });

  it('uses fallback base URL when env is not set', async () => {
    delete process.env.NEXT_PUBLIC_MARKETING_URL;
    const sitemap = await loadSitemap();
    const result = sitemap();
    expect(result[0].url).toBe('https://aivolearning.com');
  });

  it('uses custom base URL from env', async () => {
    process.env.NEXT_PUBLIC_MARKETING_URL = 'https://custom.example.com';
    const sitemap = await loadSitemap();
    const result = sitemap();
    for (const entry of result) {
      expect(entry.url).toContain('https://custom.example.com');
    }
  });

  it('homepage has highest priority', async () => {
    const sitemap = await loadSitemap();
    const result = sitemap();
    const homepage = result.find((e: { url: string }) => !e.url.replace(/https?:\/\/[^/]+/, '').replace(/^\//, ''));
    // First entry should be the base URL with priority 1
    expect(result[0].priority).toBe(1);
  });

  it('all entries have required fields', async () => {
    const sitemap = await loadSitemap();
    const result = sitemap();
    for (const entry of result) {
      expect(entry).toHaveProperty('url');
      expect(entry).toHaveProperty('lastModified');
      expect(entry).toHaveProperty('changeFrequency');
      expect(entry).toHaveProperty('priority');
    }
  });

  it('priorities are between 0 and 1', async () => {
    const sitemap = await loadSitemap();
    const result = sitemap();
    for (const entry of result) {
      expect(entry.priority).toBeGreaterThanOrEqual(0);
      expect(entry.priority).toBeLessThanOrEqual(1);
    }
  });

  it('changeFrequency values are valid', async () => {
    const validFrequencies = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];
    const sitemap = await loadSitemap();
    const result = sitemap();
    for (const entry of result) {
      expect(validFrequencies).toContain(entry.changeFrequency);
    }
  });

  it('includes key pages', async () => {
    const sitemap = await loadSitemap();
    const result = sitemap();
    const urls = result.map((e: { url: string }) => e.url);
    const baseUrl = process.env.NEXT_PUBLIC_MARKETING_URL || 'https://aivolearning.com';
    const expectedPages = [
      baseUrl,
      `${baseUrl}/about`,
      `${baseUrl}/features/parents`,
      `${baseUrl}/features/teachers`,
      `${baseUrl}/aivo-pad`,
      `${baseUrl}/faq`,
      `${baseUrl}/knowledge-base`,
      `${baseUrl}/demo`,
      `${baseUrl}/pricing`,
      `${baseUrl}/privacy`,
      `${baseUrl}/terms`,
    ];
    for (const page of expectedPages) {
      expect(urls).toContain(page);
    }
  });

  it('legal pages have yearly frequency and lower priority', async () => {
    const sitemap = await loadSitemap();
    const result = sitemap();
    const baseUrl = process.env.NEXT_PUBLIC_MARKETING_URL || 'https://aivolearning.com';
    const legalPages = result.filter(
      (e: { url: string }) => e.url.includes('/privacy') || e.url.includes('/terms') || e.url.includes('/accessibility')
    );
    for (const page of legalPages) {
      expect(page.changeFrequency).toBe('yearly');
      expect(page.priority).toBeLessThanOrEqual(0.5);
    }
  });

  it('lastModified is a Date for all entries', async () => {
    const sitemap = await loadSitemap();
    const result = sitemap();
    for (const entry of result) {
      expect(entry.lastModified).toBeInstanceOf(Date);
    }
  });
});
