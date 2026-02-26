import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const ENV_BACKUP: Record<string, string | undefined> = {};

function backupEnv(...keys: string[]) {
  for (const k of keys) ENV_BACKUP[k] = process.env[k];
}

function restoreEnv(...keys: string[]) {
  for (const k of keys) {
    if (ENV_BACKUP[k] === undefined) delete process.env[k];
    else process.env[k] = ENV_BACKUP[k];
  }
}

describe('env-validation', () => {
  const envVars = ['NODE_ENV', 'DATABASE_URL', 'JWT_SECRET', 'REDIS_URL', 'AUTH_SVC_URL'];

  beforeEach(() => backupEnv(...envVars));
  afterEach(() => restoreEnv(...envVars));

  describe('isLocalhostUrl()', () => {
    it('detects localhost', async () => {
      const { isLocalhostUrl } = await import('../src/env-validation.js');
      expect(isLocalhostUrl('http://localhost:5432/db')).toBe(true);
    });

    it('detects 127.0.0.1', async () => {
      const { isLocalhostUrl } = await import('../src/env-validation.js');
      expect(isLocalhostUrl('http://127.0.0.1:3000')).toBe(true);
    });

    it('detects 0.0.0.0', async () => {
      const { isLocalhostUrl } = await import('../src/env-validation.js');
      expect(isLocalhostUrl('http://0.0.0.0:8080')).toBe(true);
    });

    it('detects host.docker.internal', async () => {
      const { isLocalhostUrl } = await import('../src/env-validation.js');
      expect(isLocalhostUrl('http://host.docker.internal:5432')).toBe(true);
    });

    it('returns false for production URLs', async () => {
      const { isLocalhostUrl } = await import('../src/env-validation.js');
      expect(isLocalhostUrl('https://db.example.com:5432/mydb')).toBe(false);
    });
  });

  describe('requireEnvInProduction()', () => {
    it('returns env value when set', async () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgres://prod-host/db';
      const { requireEnvInProduction } = await import('../src/mock-mode.js');
      const val = requireEnvInProduction('DATABASE_URL', 'fallback');
      expect(val).toBe('postgres://prod-host/db');
    });

    it('throws when missing in production', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.DATABASE_URL;
      const { requireEnvInProduction } = await import('../src/mock-mode.js');
      expect(() =>
        requireEnvInProduction('DATABASE_URL', 'postgres://localhost/dev'),
      ).toThrow(/required in production/i);
    });

    it('returns fallback in development', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.DATABASE_URL;
      const { requireEnvInProduction } = await import('../src/mock-mode.js');
      const val = requireEnvInProduction('DATABASE_URL', 'postgres://localhost/dev');
      expect(val).toBe('postgres://localhost/dev');
    });
  });

  describe('getEnvWithDefault()', () => {
    it('returns env value when set', async () => {
      process.env.REDIS_URL = 'redis://prod:6379';
      const { getEnvWithDefault } = await import('../src/mock-mode.js');
      expect(getEnvWithDefault('REDIS_URL', 'redis://localhost:6379')).toBe('redis://prod:6379');
    });

    it('returns default when not set', async () => {
      delete process.env.REDIS_URL;
      const { getEnvWithDefault } = await import('../src/mock-mode.js');
      expect(getEnvWithDefault('REDIS_URL', 'redis://localhost:6379')).toBe('redis://localhost:6379');
    });
  });

  describe('getEnvInt()', () => {
    it('parses integer from env', async () => {
      process.env.PORT = '3000';
      const { getEnvInt } = await import('../src/mock-mode.js');
      expect(getEnvInt('PORT', 8080)).toBe(3000);
    });

    it('returns fallback for invalid value', async () => {
      process.env.PORT = 'not-a-number';
      const { getEnvInt } = await import('../src/mock-mode.js');
      expect(getEnvInt('PORT', 8080)).toBe(8080);
    });

    it('returns fallback when not set', async () => {
      delete process.env.PORT;
      const { getEnvInt } = await import('../src/mock-mode.js');
      expect(getEnvInt('PORT', 8080)).toBe(8080);
    });
  });

  describe('getEnvBool()', () => {
    it('parses true values', async () => {
      const { getEnvBool } = await import('../src/mock-mode.js');
      process.env.FEATURE_FLAG = 'true';
      expect(getEnvBool('FEATURE_FLAG', false)).toBe(true);
      process.env.FEATURE_FLAG = '1';
      expect(getEnvBool('FEATURE_FLAG', false)).toBe(true);
      process.env.FEATURE_FLAG = 'yes';
      expect(getEnvBool('FEATURE_FLAG', false)).toBe(true);
    });

    it('parses false values', async () => {
      const { getEnvBool } = await import('../src/mock-mode.js');
      process.env.FEATURE_FLAG = 'false';
      expect(getEnvBool('FEATURE_FLAG', true)).toBe(false);
    });

    it('returns fallback when not set', async () => {
      const { getEnvBool } = await import('../src/mock-mode.js');
      delete process.env.FEATURE_FLAG;
      expect(getEnvBool('FEATURE_FLAG', true)).toBe(true);
    });
  });

  describe('validateRequiredEnv()', () => {
    it('does nothing in non-production', async () => {
      process.env.NODE_ENV = 'development';
      const { validateRequiredEnv } = await import('../src/mock-mode.js');
      expect(() => validateRequiredEnv(['MISSING_VAR'])).not.toThrow();
    });

    it('throws listing missing variables in production', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;
      delete process.env.DATABASE_URL;
      const { validateRequiredEnv } = await import('../src/mock-mode.js');
      expect(() => validateRequiredEnv(['JWT_SECRET', 'DATABASE_URL'])).toThrow(
        /missing required/i,
      );
    });
  });

  describe('EnvUtils namespace', () => {
    it('has all expected properties', async () => {
      const { EnvUtils } = await import('../src/mock-mode.js');
      expect(typeof EnvUtils.requireInProduction).toBe('function');
      expect(typeof EnvUtils.getWithDefault).toBe('function');
      expect(typeof EnvUtils.getInt).toBe('function');
      expect(typeof EnvUtils.getBool).toBe('function');
      expect(typeof EnvUtils.validateRequired).toBe('function');
      expect(typeof EnvUtils.isDevelopment).toBe('function');
      expect(typeof EnvUtils.isProduction).toBe('function');
      expect(typeof EnvUtils.isTest).toBe('function');
    });
  });
});
