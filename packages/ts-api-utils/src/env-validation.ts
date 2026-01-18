/**
 * Environment Validation Utilities
 *
 * Production-safe environment variable handling to prevent
 * localhost fallbacks and missing configuration in production.
 *
 * CRITICAL: Addresses production configuration gaps
 *
 * Usage:
 * ```typescript
 * import { requireEnvInProduction, validateProductionConfig } from '@aivo/ts-api-utils/env-validation';
 *
 * // In service config
 * const databaseUrl = requireEnvInProduction('DATABASE_URL', 'postgresql://localhost:5432/dev');
 *
 * // In service startup
 * validateProductionConfig({
 *   DATABASE_URL: true,
 *   JWT_SECRET: true,
 *   REDIS_URL: true,
 * });
 * ```
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface EnvValidationConfig {
  /** Environment variables that MUST be set in production */
  required?: string[];
  /** Environment variables that should NOT contain localhost in production */
  noLocalhostVars?: string[];
  /** Environment variables that should NOT be default values in production */
  noDefaultVars?: Record<string, string>;
  /** Custom validation functions */
  custom?: Record<string, (value: string) => boolean>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_TEST = process.env.NODE_ENV === 'test';

/** Common environment variables that should be validated in production */
export const COMMON_PRODUCTION_VARS = {
  database: ['DATABASE_URL'],
  auth: ['JWT_SECRET', 'JWT_PRIVATE_KEY', 'JWT_PUBLIC_KEY'],
  redis: ['REDIS_URL'],
  nats: ['NATS_URL'],
  secrets: ['ENCRYPTION_KEY', 'SESSION_SECRET'],
  aws: ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
};

// ══════════════════════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get an environment variable, throwing in production if not set.
 *
 * @param name - Environment variable name
 * @param devDefault - Default value for development only
 * @returns The environment variable value
 * @throws Error if not set in production
 *
 * @example
 * const dbUrl = requireEnvInProduction('DATABASE_URL', 'postgresql://localhost:5432/dev');
 */
export function requireEnvInProduction(name: string, devDefault: string): string {
  const value = process.env[name];

  if (value !== undefined && value !== '') {
    return value;
  }

  if (IS_PRODUCTION) {
    throw new Error(
      `PRODUCTION ERROR: Required environment variable '${name}' is not set.\n` +
      `This variable is required for production deployment.`
    );
  }

  // Log warning in non-production environments
  if (!IS_TEST) {
    console.warn(`⚠️  Using development default for ${name}. Set this in production.`);
  }

  return devDefault;
}

/**
 * Get an optional environment variable with a default value.
 * Does NOT throw in production if missing.
 */
export function getEnvWithDefault(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

/**
 * Check if a URL contains localhost references.
 */
export function isLocalhostUrl(url: string): boolean {
  return (
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.includes('0.0.0.0') ||
    url.includes('host.docker.internal')
  );
}

/**
 * Validate that a URL does not point to localhost in production.
 *
 * @param name - Variable name for error messages
 * @param url - The URL to validate
 * @throws Error if localhost URL detected in production
 */
export function validateNoLocalhostInProduction(name: string, url: string): void {
  if (IS_PRODUCTION && isLocalhostUrl(url)) {
    throw new Error(
      `PRODUCTION ERROR: '${name}' contains localhost URL: ${url}\n` +
      `This is not allowed in production. Set the proper production URL.`
    );
  }
}

/**
 * Validate that a secret is not a default/placeholder value in production.
 */
export function validateSecretNotDefault(
  name: string,
  value: string,
  defaultValues: string[] = ['dev-secret', 'changeme', 'your-secret-here', 'placeholder']
): void {
  if (!IS_PRODUCTION) return;

  const isDefault = defaultValues.some(
    (d) => value.toLowerCase().includes(d.toLowerCase())
  );

  if (isDefault) {
    throw new Error(
      `PRODUCTION ERROR: '${name}' appears to contain a default/placeholder value.\n` +
      `Generate a secure secret for production deployment.`
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE VALIDATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Validate production configuration comprehensively.
 *
 * @param config - Validation configuration
 * @returns ValidationResult with any errors/warnings
 *
 * @example
 * const result = validateProductionConfig({
 *   required: ['DATABASE_URL', 'JWT_SECRET'],
 *   noLocalhostVars: ['DATABASE_URL', 'REDIS_URL', 'AUTH_SVC_URL'],
 *   noDefaultVars: { JWT_SECRET: 'dev-secret' },
 * });
 *
 * if (!result.valid) {
 *   console.error('Configuration errors:', result.errors);
 *   process.exit(1);
 * }
 */
export function validateProductionConfig(config: EnvValidationConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!IS_PRODUCTION) {
    return { valid: true, errors: [], warnings: ['Skipping validation in non-production'] };
  }

  // Check required variables
  if (config.required) {
    for (const name of config.required) {
      const value = process.env[name];
      if (!value || value === '') {
        errors.push(`Missing required variable: ${name}`);
      }
    }
  }

  // Check for localhost URLs
  if (config.noLocalhostVars) {
    for (const name of config.noLocalhostVars) {
      const value = process.env[name];
      if (value && isLocalhostUrl(value)) {
        errors.push(`Localhost URL not allowed in production for ${name}: ${value}`);
      }
    }
  }

  // Check for default/placeholder values
  if (config.noDefaultVars) {
    for (const [name, defaultValue] of Object.entries(config.noDefaultVars)) {
      const value = process.env[name];
      if (value === defaultValue) {
        errors.push(`${name} appears to be using a default value. Set a production value.`);
      }
    }
  }

  // Run custom validators
  if (config.custom) {
    for (const [name, validator] of Object.entries(config.custom)) {
      const value = process.env[name] ?? '';
      if (!validator(value)) {
        errors.push(`Custom validation failed for ${name}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate and throw if production config is invalid.
 * Call during service startup to fail fast on misconfiguration.
 */
export function assertProductionConfig(config: EnvValidationConfig): void {
  const result = validateProductionConfig(config);

  if (!result.valid) {
    throw new Error(
      'PRODUCTION CONFIGURATION ERRORS:\n' +
      result.errors.map((e) => `  ❌ ${e}`).join('\n') +
      '\n\nFix these issues before deploying to production.'
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export const EnvValidation = {
  require: requireEnvInProduction,
  get: getEnvWithDefault,
  isLocalhost: isLocalhostUrl,
  validateNoLocalhost: validateNoLocalhostInProduction,
  validateNotDefault: validateSecretNotDefault,
  validate: validateProductionConfig,
  assert: assertProductionConfig,
  commonVars: COMMON_PRODUCTION_VARS,
};
