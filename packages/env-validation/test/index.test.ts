import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import {
  isProduction,
  isDevelopment,
  isTest,
  validateEnv,
  EnvValidationError,
  requiredInProduction,
  port,
  url,
  databaseUrl,
  redisUrl,
  bool,
  duration,
  list,
  optional,
} from '../src/index';

describe('env-validation', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('environment detection', () => {
    it('isProduction returns true when NODE_ENV=production', () => {
      process.env.NODE_ENV = 'production';
      expect(isProduction()).toBe(true);
      expect(isDevelopment()).toBe(false);
      expect(isTest()).toBe(false);
    });

    it('isDevelopment returns true when NODE_ENV=development', () => {
      process.env.NODE_ENV = 'development';
      expect(isDevelopment()).toBe(true);
      expect(isProduction()).toBe(false);
    });

    it('isTest returns true when NODE_ENV=test', () => {
      process.env.NODE_ENV = 'test';
      expect(isTest()).toBe(true);
    });
  });

  describe('EnvValidationError', () => {
    it('formats error message with service name', () => {
      const zodError = new z.ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'undefined',
          path: ['DATABASE_URL'],
          message: 'Required',
        },
      ]);
      const error = new EnvValidationError(zodError, 'auth-svc');
      expect(error.message).toContain('[auth-svc]');
      expect(error.message).toContain('DATABASE_URL');
      expect(error.issues).toHaveLength(1);
      expect(error.serviceName).toBe('auth-svc');
    });

    it('formats error message without service name', () => {
      const zodError = new z.ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'undefined',
          path: ['PORT'],
          message: 'Required',
        },
      ]);
      const error = new EnvValidationError(zodError);
      expect(error.message).toContain('Environment validation failed');
      expect(error.message).not.toContain('[');
    });
  });

  describe('validateEnv', () => {
    it('returns parsed env when valid', () => {
      process.env.TEST_VAR = 'hello';
      const schema = z.object({
        TEST_VAR: z.string(),
      });
      const result = validateEnv(schema, { exitOnError: false });
      expect(result.TEST_VAR).toBe('hello');
      delete process.env.TEST_VAR;
    });

    it('throws EnvValidationError when invalid (non-production)', () => {
      process.env.NODE_ENV = 'test';
      const schema = z.object({
        MISSING_VAR_12345: z.string(),
      });
      expect(() => validateEnv(schema, { exitOnError: false })).toThrow(EnvValidationError);
    });

    it('calls onError callback when validation fails', () => {
      const onError = vi.fn();
      const schema = z.object({
        MISSING_VAR_99999: z.string(),
      });
      expect(() => validateEnv(schema, { exitOnError: false, onError })).toThrow();
      expect(onError).toHaveBeenCalledWith(expect.any(EnvValidationError));
    });
  });

  describe('schema helpers', () => {
    describe('port()', () => {
      it('accepts valid port numbers', () => {
        const schema = z.object({ PORT: port() });
        expect(schema.parse({ PORT: '3000' }).PORT).toBe(3000);
        expect(schema.parse({ PORT: '80' }).PORT).toBe(80);
        expect(schema.parse({ PORT: '65535' }).PORT).toBe(65535);
      });

      it('rejects invalid ports', () => {
        const schema = z.object({ PORT: port() });
        expect(() => schema.parse({ PORT: '0' })).toThrow();
        expect(() => schema.parse({ PORT: '70000' })).toThrow();
        expect(() => schema.parse({ PORT: 'abc' })).toThrow();
      });

      it('uses default value', () => {
        const schema = z.object({ PORT: port(3000) });
        expect(schema.parse({}).PORT).toBe(3000);
      });
    });

    describe('url()', () => {
      it('accepts valid URLs', () => {
        const schema = z.object({ U: url() });
        expect(schema.parse({ U: 'https://example.com' }).U).toBe('https://example.com');
      });

      it('rejects invalid URLs', () => {
        const schema = z.object({ U: url() });
        expect(() => schema.parse({ U: 'not-a-url' })).toThrow();
      });
    });

    describe('databaseUrl()', () => {
      it('accepts postgresql URLs', () => {
        const schema = z.object({ DB: databaseUrl() });
        expect(schema.parse({ DB: 'postgresql://localhost/db' }).DB).toBe(
          'postgresql://localhost/db'
        );
      });

      it('accepts postgres URLs', () => {
        const schema = z.object({ DB: databaseUrl() });
        expect(schema.parse({ DB: 'postgres://localhost/db' }).DB).toBe('postgres://localhost/db');
      });

      it('accepts mongodb URLs', () => {
        const schema = z.object({ DB: databaseUrl() });
        expect(schema.parse({ DB: 'mongodb://localhost/db' }).DB).toBeDefined();
      });

      it('rejects non-database URLs', () => {
        const schema = z.object({ DB: databaseUrl() });
        expect(() => schema.parse({ DB: 'https://example.com' })).toThrow();
      });
    });

    describe('redisUrl()', () => {
      it('accepts redis:// URLs', () => {
        const schema = z.object({ R: redisUrl() });
        expect(schema.parse({ R: 'redis://localhost:6379' }).R).toBeDefined();
      });

      it('accepts rediss:// URLs', () => {
        const schema = z.object({ R: redisUrl() });
        expect(schema.parse({ R: 'rediss://secure.redis.io' }).R).toBeDefined();
      });

      it('rejects non-redis URLs', () => {
        const schema = z.object({ R: redisUrl() });
        expect(() => schema.parse({ R: 'https://example.com' })).toThrow();
      });
    });

    describe('bool()', () => {
      it('converts truthy strings to true', () => {
        const schema = z.object({ B: bool() });
        expect(schema.parse({ B: 'true' }).B).toBe(true);
        expect(schema.parse({ B: '1' }).B).toBe(true);
        expect(schema.parse({ B: 'yes' }).B).toBe(true);
        expect(schema.parse({ B: 'YES' }).B).toBe(true);
      });

      it('converts other strings to false', () => {
        const schema = z.object({ B: bool() });
        expect(schema.parse({ B: 'false' }).B).toBe(false);
        expect(schema.parse({ B: '0' }).B).toBe(false);
        expect(schema.parse({ B: 'no' }).B).toBe(false);
      });
    });

    describe('duration()', () => {
      it('accepts valid duration strings', () => {
        const schema = z.object({ D: duration() });
        expect(schema.parse({ D: '15m' }).D).toBe('15m');
        expect(schema.parse({ D: '1h' }).D).toBe('1h');
        expect(schema.parse({ D: '7d' }).D).toBe('7d');
        expect(schema.parse({ D: '30s' }).D).toBe('30s');
        expect(schema.parse({ D: '1w' }).D).toBe('1w');
      });

      it('rejects invalid duration strings', () => {
        const schema = z.object({ D: duration() });
        expect(() => schema.parse({ D: 'abc' })).toThrow();
        expect(() => schema.parse({ D: '15' })).toThrow();
      });
    });

    describe('list()', () => {
      it('splits comma-separated values', () => {
        const schema = z.object({ L: list() });
        expect(schema.parse({ L: 'a,b,c' }).L).toEqual(['a', 'b', 'c']);
      });

      it('trims whitespace', () => {
        const schema = z.object({ L: list() });
        expect(schema.parse({ L: ' a , b , c ' }).L).toEqual(['a', 'b', 'c']);
      });

      it('filters empty entries', () => {
        const schema = z.object({ L: list() });
        expect(schema.parse({ L: 'a,,b' }).L).toEqual(['a', 'b']);
      });
    });

    describe('optional()', () => {
      it('uses default value when not set', () => {
        const schema = z.object({ O: optional('fallback') });
        expect(schema.parse({}).O).toBe('fallback');
      });

      it('uses provided value when set', () => {
        const schema = z.object({ O: optional('fallback') });
        expect(schema.parse({ O: 'custom' }).O).toBe('custom');
      });
    });
  });
});

// Need to import vi for onError mock test
import { vi } from 'vitest';
