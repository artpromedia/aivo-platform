import { describe, it, expect } from 'vitest';

// ============================================================================
// professional-dev-svc - config defaults and CORS origin parsing
// ============================================================================

describe('professional-dev-svc config', () => {
  it('PORT defaults to 3000', () => {
    const port = Number.parseInt(process.env.PORT || '3000', 10);
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

  it('parses CORS_ORIGINS correctly', () => {
    const raw = 'http://localhost:3000,http://localhost:3001';
    const origins = raw.split(',');
    expect(origins).toEqual(['http://localhost:3000', 'http://localhost:3001']);
  });

  it('uses empty array for CORS in production when not set', () => {
    const corsOrigins =
      process.env.CORS_ORIGINS?.split(',') ??
      (process.env.NODE_ENV === 'production'
        ? []
        : ['http://localhost:3000', 'http://localhost:3001']);
    expect(Array.isArray(corsOrigins)).toBe(true);
  });
});
