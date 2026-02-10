import { describe, it, expect } from 'vitest';

// ============================================================================
// Community Service - config requireEnv pattern
// ============================================================================

describe('community-svc config', () => {
  function requireEnv(name: string, devDefault?: string): string {
    const value = process.env[name];
    if (!value) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Environment variable ${name} is required in production`);
      }
      if (devDefault !== undefined) {
        return devDefault;
      }
      throw new Error(`Environment variable ${name} is required`);
    }
    return value;
  }

  it('returns environment variable value when set', () => {
    process.env.TEST_COMMUNITY_VAR = 'test-value';
    try {
      expect(requireEnv('TEST_COMMUNITY_VAR')).toBe('test-value');
    } finally {
      delete process.env.TEST_COMMUNITY_VAR;
    }
  });

  it('returns devDefault in non-production when env var missing', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      expect(requireEnv('NOT_SET_COMMUNITY', 'fallback')).toBe('fallback');
    } finally {
      process.env.NODE_ENV = original;
    }
  });

  it('throws in production when env var missing', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(() => requireEnv('NOT_SET_COMMUNITY', 'ignored')).toThrow(
        'Environment variable NOT_SET_COMMUNITY is required in production'
      );
    } finally {
      process.env.NODE_ENV = original;
    }
  });

  it('throws when no devDefault provided and env var missing', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      expect(() => requireEnv('NOT_SET_COMMUNITY_NO_DEFAULT')).toThrow(
        'Environment variable NOT_SET_COMMUNITY_NO_DEFAULT is required'
      );
    } finally {
      process.env.NODE_ENV = original;
    }
  });
});
