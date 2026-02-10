import { describe, it, expect } from 'vitest';

// ============================================================================
// life-skills-svc config - requireEnvInProduction pattern
// ============================================================================

describe('life-skills-svc config', () => {
  function requireEnvInProduction(name: string, defaultValue?: string): string {
    const value = process.env[name];
    if (!value && process.env.NODE_ENV === 'production') {
      throw new Error(`${name} is required in production`);
    }
    return value || defaultValue || '';
  }

  it('returns env var value when set', () => {
    process.env.TEST_LIFE_SKILLS_VAR = 'actual-value';
    try {
      expect(requireEnvInProduction('TEST_LIFE_SKILLS_VAR', 'default')).toBe('actual-value');
    } finally {
      delete process.env.TEST_LIFE_SKILLS_VAR;
    }
  });

  it('returns default in non-production when env var missing', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      expect(requireEnvInProduction('NOT_SET_LS', 'fallback')).toBe('fallback');
    } finally {
      process.env.NODE_ENV = original;
    }
  });

  it('throws in production when env var missing', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(() => requireEnvInProduction('NOT_SET_LS')).toThrow(
        'NOT_SET_LS is required in production'
      );
    } finally {
      process.env.NODE_ENV = original;
    }
  });

  it('returns empty string when no default and not production', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
      expect(requireEnvInProduction('NOT_SET_LS_NO_DEFAULT')).toBe('');
    } finally {
      process.env.NODE_ENV = original;
    }
  });
});
