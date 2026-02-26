import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We test the pure logic by importing the source directly.
// These functions rely on process.env.NODE_ENV.

// Mock module before imports
const ENV_BACKUP: Record<string, string | undefined> = {};

function setNodeEnv(val: string | undefined) {
  if (val === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = val;
  }
}

// Dynamic import helper — we re-import the module after resetting env
// Because the module reads NODE_ENV at import time for some exports,
// we test the function-call behavior which reads process.env at call time.

describe('mock-mode', () => {
  beforeEach(() => {
    ENV_BACKUP.NODE_ENV = process.env.NODE_ENV;
    ENV_BACKUP.MOCK_MODE = process.env.MOCK_MODE;
  });

  afterEach(() => {
    process.env.NODE_ENV = ENV_BACKUP.NODE_ENV;
    process.env.MOCK_MODE = ENV_BACKUP.MOCK_MODE;
  });

  describe('isDevelopment()', () => {
    it('returns true when NODE_ENV is development', async () => {
      setNodeEnv('development');
      const { isDevelopment } = await import('../src/mock-mode.js');
      expect(isDevelopment()).toBe(true);
    });

    it('returns false when NODE_ENV is production', async () => {
      setNodeEnv('production');
      const { isDevelopment } = await import('../src/mock-mode.js');
      expect(isDevelopment()).toBe(false);
    });
  });

  describe('isProduction()', () => {
    it('returns true when NODE_ENV is production', async () => {
      setNodeEnv('production');
      const { isProduction } = await import('../src/mock-mode.js');
      expect(isProduction()).toBe(true);
    });

    it('returns false when NODE_ENV is development', async () => {
      setNodeEnv('development');
      const { isProduction } = await import('../src/mock-mode.js');
      expect(isProduction()).toBe(false);
    });
  });

  describe('isTest()', () => {
    it('returns true when NODE_ENV is test', async () => {
      setNodeEnv('test');
      const { isTest } = await import('../src/mock-mode.js');
      expect(isTest()).toBe(true);
    });
  });

  describe('isMockEnabled()', () => {
    it('returns true when MOCK_MODE is true', async () => {
      setNodeEnv('development');
      process.env.MOCK_MODE = 'true';
      const { isMockEnabled } = await import('../src/mock-mode.js');
      expect(isMockEnabled()).toBe(true);
    });

    it('returns false when MOCK_MODE is not set', async () => {
      setNodeEnv('development');
      delete process.env.MOCK_MODE;
      const { isMockEnabled } = await import('../src/mock-mode.js');
      expect(isMockEnabled()).toBe(false);
    });
  });

  describe('withMockFallback()', () => {
    it('returns real result in production', async () => {
      setNodeEnv('production');
      const { withMockFallback } = await import('../src/mock-mode.js');
      const result = await withMockFallback(
        async () => 'real-data',
        () => 'mock-data',
      );
      expect(result).toBe('real-data');
    });

    it('returns mock data in dev when mock enabled', async () => {
      setNodeEnv('development');
      process.env.MOCK_MODE = 'true';
      const { withMockFallback } = await import('../src/mock-mode.js');
      const result = await withMockFallback(
        async () => 'real-data',
        () => 'mock-data',
      );
      expect(result).toBe('mock-data');
    });
  });

  describe('developmentOnly()', () => {
    it('returns value in development', async () => {
      setNodeEnv('development');
      const { developmentOnly } = await import('../src/mock-mode.js');
      const result = developmentOnly(() => 'dev-val');
      expect(result).toBe('dev-val');
    });

    it('returns undefined in production', async () => {
      setNodeEnv('production');
      const { developmentOnly } = await import('../src/mock-mode.js');
      const result = developmentOnly(() => 'dev-val');
      expect(result).toBeUndefined();
    });
  });

  describe('MockRegistry', () => {
    it('can register and retrieve mocks in dev mode', async () => {
      setNodeEnv('development');
      const { MockRegistry } = await import('../src/mock-mode.js');
      const registry = new MockRegistry();
      registry.register('feature-x', () => ({ data: 42 }));
      registry.enable('feature-x');
      const result = registry.getMock<{ data: number }>('feature-x');
      expect(result).toEqual({ data: 42 });
    });

    it('returns null when feature not enabled', async () => {
      setNodeEnv('development');
      const { MockRegistry } = await import('../src/mock-mode.js');
      const registry = new MockRegistry();
      registry.register('feature-y', () => 'value');
      const result = registry.getMock('feature-y');
      expect(result).toBeNull();
    });

    it('disables a feature', async () => {
      setNodeEnv('development');
      const { MockRegistry } = await import('../src/mock-mode.js');
      const registry = new MockRegistry();
      registry.register('feat', () => 'val');
      registry.enable('feat');
      registry.disable('feat');
      expect(registry.isEnabled('feat')).toBe(false);
    });

    it('clears all mocks', async () => {
      setNodeEnv('development');
      const { MockRegistry } = await import('../src/mock-mode.js');
      const registry = new MockRegistry();
      registry.register('a', () => 1);
      registry.enable('a');
      registry.clear();
      expect(registry.isEnabled('a')).toBe(false);
      expect(registry.getMock('a')).toBeNull();
    });
  });

  describe('recordMockUsage() and getMockUsageMetrics()', () => {
    it('records usage and returns metrics', async () => {
      setNodeEnv('development');
      const {
        recordMockUsage,
        getMockUsageMetrics,
        clearMockUsageMetrics,
      } = await import('../src/mock-mode.js');
      clearMockUsageMetrics();
      recordMockUsage('test-feature');
      recordMockUsage('test-feature');
      const metrics = getMockUsageMetrics();
      expect(metrics['test-feature']).toBe(2);
    });
  });

  describe('MockMode namespace', () => {
    it('has expected convenience properties', async () => {
      const { MockMode } = await import('../src/mock-mode.js');
      expect(typeof MockMode.isDevelopment).toBe('function');
      expect(typeof MockMode.isProduction).toBe('function');
      expect(typeof MockMode.isTest).toBe('function');
      expect(typeof MockMode.isEnabled).toBe('function');
      expect(typeof MockMode.withFallback).toBe('function');
      expect(typeof MockMode.developmentOnly).toBe('function');
    });
  });
});
