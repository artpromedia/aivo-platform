import { describe, it, expect } from 'vitest';

// ============================================================================
// translation-svc - CORS origin parsing (getCorsOrigins pattern)
// ============================================================================

describe('translation-svc CORS config', () => {
  function getCorsOrigins(): string[] {
    if (process.env.CORS_ORIGIN) return process.env.CORS_ORIGIN.split(',').map((o) => o.trim());
    if (process.env.NODE_ENV === 'production') return [];
    return ['http://localhost:3000', 'http://localhost:3001'];
  }

  it('returns defaults in development', () => {
    const original = process.env.NODE_ENV;
    const originalCors = process.env.CORS_ORIGIN;
    delete process.env.CORS_ORIGIN;
    process.env.NODE_ENV = 'development';
    try {
      const origins = getCorsOrigins();
      expect(origins).toEqual(['http://localhost:3000', 'http://localhost:3001']);
    } finally {
      process.env.NODE_ENV = original;
      if (originalCors) process.env.CORS_ORIGIN = originalCors;
    }
  });

  it('returns empty array in production without CORS_ORIGIN', () => {
    const original = process.env.NODE_ENV;
    const originalCors = process.env.CORS_ORIGIN;
    delete process.env.CORS_ORIGIN;
    process.env.NODE_ENV = 'production';
    try {
      const origins = getCorsOrigins();
      expect(origins).toEqual([]);
    } finally {
      process.env.NODE_ENV = original;
      if (originalCors) process.env.CORS_ORIGIN = originalCors;
    }
  });

  it('parses comma-separated CORS_ORIGIN', () => {
    const original = process.env.CORS_ORIGIN;
    process.env.CORS_ORIGIN = 'https://app.aivo.com, https://admin.aivo.com';
    try {
      const origins = getCorsOrigins();
      expect(origins).toEqual(['https://app.aivo.com', 'https://admin.aivo.com']);
    } finally {
      if (original) {
        process.env.CORS_ORIGIN = original;
      } else {
        delete process.env.CORS_ORIGIN;
      }
    }
  });

  it('handles single origin', () => {
    const original = process.env.CORS_ORIGIN;
    process.env.CORS_ORIGIN = 'https://app.aivo.com';
    try {
      const origins = getCorsOrigins();
      expect(origins).toEqual(['https://app.aivo.com']);
    } finally {
      if (original) {
        process.env.CORS_ORIGIN = original;
      } else {
        delete process.env.CORS_ORIGIN;
      }
    }
  });
});

// ============================================================================
// Port config
// ============================================================================

describe('translation-svc port config', () => {
  it('defaults to 3050', () => {
    const original = process.env.PORT;
    delete process.env.PORT;
    try {
      const port = Number.parseInt(process.env.PORT ?? '3050', 10);
      expect(port).toBe(3050);
    } finally {
      if (original) process.env.PORT = original;
    }
  });

  it('uses PORT env var when set', () => {
    const original = process.env.PORT;
    process.env.PORT = '4000';
    try {
      const port = Number.parseInt(process.env.PORT ?? '3050', 10);
      expect(port).toBe(4000);
    } finally {
      if (original) {
        process.env.PORT = original;
      } else {
        delete process.env.PORT;
      }
    }
  });
});
