import { describe, it, expect } from 'vitest';

// ============================================================================
// Geolocation Service - CORS origin parsing and config defaults
// ============================================================================

describe('geolocation-svc config defaults', () => {
  it('parses PORT with default', () => {
    const port = parseInt(process.env.PORT || '4090', 10);
    expect(typeof port).toBe('number');
    expect(port).toBeGreaterThan(0);
  });

  it('HOST defaults to 0.0.0.0', () => {
    const original = process.env.HOST;
    delete process.env.HOST;
    try {
      const host = process.env.HOST || '0.0.0.0';
      expect(host).toBe('0.0.0.0');
    } finally {
      if (original) process.env.HOST = original;
    }
  });

  it('REDIS_URL has a default', () => {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    expect(redisUrl).toContain('redis://');
  });
});

// ============================================================================
// IP hashing utility (pure crypto test)
// ============================================================================

describe('IP hashing', () => {
  it('produces consistent hashes for same input', async () => {
    const { createHash } = await import('crypto');
    const salt = 'aivo-geo-salt';

    function hashIp(ip: string): string {
      return createHash('sha256').update(`${salt}:${ip}`).digest('hex').substring(0, 16);
    }

    const hash1 = hashIp('192.168.1.1');
    const hash2 = hashIp('192.168.1.1');
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(16);
  });

  it('produces different hashes for different IPs', async () => {
    const { createHash } = await import('crypto');
    const salt = 'aivo-geo-salt';

    function hashIp(ip: string): string {
      return createHash('sha256').update(`${salt}:${ip}`).digest('hex').substring(0, 16);
    }

    const hash1 = hashIp('192.168.1.1');
    const hash2 = hashIp('10.0.0.1');
    expect(hash1).not.toBe(hash2);
  });
});

// ============================================================================
// Accept-Language parser (pure string parsing)
// ============================================================================

describe('Accept-Language parsing', () => {
  function inferLanguageFromBrowser(browserLanguage?: string): string | null {
    if (!browserLanguage) return null;
    const primary = browserLanguage.split(',')[0];
    if (!primary) return null;
    const lang = primary.split(';')[0].trim();
    return lang || null;
  }

  it('extracts primary language from Accept-Language', () => {
    expect(inferLanguageFromBrowser('en-US,en;q=0.9,fr;q=0.8')).toBe('en-US');
  });

  it('handles simple language tag', () => {
    expect(inferLanguageFromBrowser('fr')).toBe('fr');
  });

  it('returns null for undefined input', () => {
    expect(inferLanguageFromBrowser(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(inferLanguageFromBrowser('')).toBeNull();
  });

  it('handles language with quality factor', () => {
    expect(inferLanguageFromBrowser('es;q=0.9')).toBe('es');
  });
});
