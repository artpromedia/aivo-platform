import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { z } from 'zod';

/**
 * Tests for the learner-app environment validation schema.
 *
 * The env module calls parseEnv() at import time, so we re-create the schema
 * here and test it directly to avoid side effects from the eager validation.
 */

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_ENABLE_ANALYTICS: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  NEXT_PUBLIC_ENABLE_PWA: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
});

describe('env schema validation', () => {
  it('validates a minimal valid env', () => {
    const result = envSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'some-key',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe('development'); // default
    }
  });

  it('validates a complete env', () => {
    const result = envSchema.safeParse({
      NEXT_PUBLIC_API_URL: 'https://api.example.com',
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-123',
      NEXT_PUBLIC_SENTRY_DSN: 'https://sentry.example.com/123',
      NODE_ENV: 'production',
      NEXT_PUBLIC_ENABLE_ANALYTICS: 'true',
      NEXT_PUBLIC_ENABLE_PWA: 'false',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe('production');
      expect(result.data.NEXT_PUBLIC_ENABLE_ANALYTICS).toBe(true);
      expect(result.data.NEXT_PUBLIC_ENABLE_PWA).toBe(false);
    }
  });

  it('rejects missing SUPABASE_URL', () => {
    const result = envSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'key',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing SUPABASE_ANON_KEY', () => {
    const result = envSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty SUPABASE_ANON_KEY', () => {
    const result = envSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid NODE_ENV value', () => {
    const result = envSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'key',
      NODE_ENV: 'staging',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid URL for NEXT_PUBLIC_API_URL', () => {
    const result = envSchema.safeParse({
      NEXT_PUBLIC_API_URL: 'not-a-url',
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'key',
    });
    expect(result.success).toBe(false);
  });

  it('transforms ENABLE_ANALYTICS string to boolean', () => {
    const result = envSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'key',
      NEXT_PUBLIC_ENABLE_ANALYTICS: 'true',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NEXT_PUBLIC_ENABLE_ANALYTICS).toBe(true);
    }
  });

  it('transforms non-"true" analytics string to false', () => {
    const result = envSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'key',
      NEXT_PUBLIC_ENABLE_ANALYTICS: 'yes',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NEXT_PUBLIC_ENABLE_ANALYTICS).toBe(false);
    }
  });

  it('defaults NODE_ENV to development when not provided', () => {
    const result = envSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'key',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe('development');
    }
  });
});
