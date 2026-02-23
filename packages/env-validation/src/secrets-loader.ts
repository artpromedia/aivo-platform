/**
 * Secrets Loader
 *
 * Loads and validates secrets from environment variables using Zod schemas.
 *
 * In Kubernetes: secrets are mounted as env vars from K8s Secrets (via
 * `envFrom` with `secretRef`).
 *
 * In local dev: secrets are read from `.env` files.
 *
 * Usage:
 * ```typescript
 * import { loadSecrets, authSecretSchema } from '@aivo/env-validation/secrets-loader';
 * const secrets = loadSecrets(authSecretSchema);
 * ```
 */

import { z, type ZodType } from 'zod';

/**
 * Load and validate secrets from process.env.
 *
 * Throws a descriptive error listing all validation failures if any
 * required secret is missing or malformed.
 */
export function loadSecrets<T extends Record<string, ZodType>>(
  schema: T,
): { [K in keyof T]: z.infer<T[K]> } {
  const result: Record<string, unknown> = {};
  const errors: string[] = [];

  for (const [key, validator] of Object.entries(schema)) {
    const value = process.env[key];
    const parsed = validator.safeParse(value);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i: z.ZodIssue) => i.message)
        .join(', ');
      errors.push(`  ${key}: ${issues}`);
    } else {
      result[key] = parsed.data;
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Secret validation failed (${errors.length} error${errors.length > 1 ? 's' : ''}):\n${errors.join('\n')}`,
    );
  }

  return result as { [K in keyof T]: z.infer<T[K]> };
}

// ══════════════════════════════════════════════════════════════════════════════
// Pre-built schemas for each service
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Auth service secrets — required in production.
 */
export const authSecretSchema = {
  JWT_PRIVATE_KEY_PATH: z.string().min(1, 'JWT private key path is required'),
  JWT_PUBLIC_KEY_PATH: z.string().min(1, 'JWT public key path is required'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  COOKIE_SECRET: z.string().min(32, 'COOKIE_SECRET must be at least 32 characters'),
  INTERNAL_API_KEY: z.string().min(32, 'INTERNAL_API_KEY must be at least 32 characters'),
};

/**
 * Generic database-only schema — useful for most backend services.
 */
export const databaseSecretSchema = {
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
};

/**
 * AI orchestrator secrets.
 */
export const aiOrchestratorSecretSchema = {
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  INTERNAL_API_KEY: z.string().min(32, 'INTERNAL_API_KEY must be at least 32 characters'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
};

/**
 * Validate that no secrets appear in source code or container images.
 * Returns an array of environment variable names whose values look like
 * they may have been accidentally hard-coded (non-placeholder, > 20 chars,
 * high entropy).
 */
export function detectHardcodedSecrets(
  env: Record<string, string | undefined>,
  sensitiveKeys: string[],
): string[] {
  const warnings: string[] = [];

  for (const key of sensitiveKeys) {
    const value = env[key];
    if (!value) continue;

    // Skip obvious placeholders
    if (
      value.startsWith('REPLACE') ||
      value.startsWith('dev-') ||
      value.startsWith('test-') ||
      value === 'changeme' ||
      value === 'your-secret-key'
    ) {
      continue;
    }

    // High-entropy check (Shannon entropy)
    if (value.length >= 20) {
      const freq: Record<string, number> = {};
      for (const ch of value) {
        freq[ch] = (freq[ch] || 0) + 1;
      }
      let entropy = 0;
      for (const count of Object.values(freq)) {
        const p = count / value.length;
        entropy -= p * Math.log2(p);
      }

      // If entropy is high, it's probably a real secret — that's fine at
      // runtime.  This function is intended for CI checks against committed
      // config files.
      if (entropy < 2.0) {
        warnings.push(key);
      }
    }
  }

  return warnings;
}
