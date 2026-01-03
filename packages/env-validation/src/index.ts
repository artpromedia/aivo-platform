/**
 * Environment Variable Validation Package
 *
 * Provides Zod-based validation for environment variables with production-aware
 * fail-fast behavior. Ensures services don't start with invalid configuration.
 */

import type { ZodType, ZodError, ZodIssue } from 'zod';
import { z } from 'zod';

// Re-export zod for convenience
export { z } from 'zod';

/**
 * Environment mode detection
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
}

export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

/**
 * Configuration for environment validation
 */
export interface EnvValidationOptions {
  /**
   * Service name for error messages
   */
  serviceName?: string;

  /**
   * Whether to exit process on validation failure (default: true in production)
   */
  exitOnError?: boolean;

  /**
   * Custom error handler
   */
  onError?: (error: EnvValidationError) => void;
}

/**
 * Custom error class for environment validation failures
 */
export class EnvValidationError extends Error {
  public readonly issues: ZodIssue[];
  public readonly serviceName?: string;

  constructor(error: ZodError, serviceName?: string) {
    const formattedIssues = error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    const message = serviceName
      ? `[${serviceName}] Environment validation failed:\n${formattedIssues}`
      : `Environment validation failed:\n${formattedIssues}`;

    super(message);
    this.name = 'EnvValidationError';
    this.issues = error.issues;
    this.serviceName = serviceName;
  }
}

/**
 * Validates environment variables against a Zod schema
 *
 * @example
 * ```ts
 * const envSchema = z.object({
 *   PORT: port(),
 *   DATABASE_URL: requiredInProduction('postgresql://localhost/dev'),
 *   JWT_SECRET: requiredInProduction(),
 *   LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
 * });
 *
 * export const env = validateEnv(envSchema, { serviceName: 'auth-svc' });
 * ```
 */
export function validateEnv<T extends ZodType>(
  schema: T,
  options: EnvValidationOptions = {}
): z.infer<T> {
  const { serviceName, exitOnError = isProduction(), onError } = options;

  const result = schema.safeParse(process.env);

  if (!result.success) {
    const error = new EnvValidationError(result.error, serviceName);

    if (onError) {
      onError(error);
    } else {
      console.error(error.message);
    }

    if (exitOnError) {
      process.exit(1);
    }

    throw error;
  }

  return result.data;
}

/**
 * Creates a schema that requires a value in production but allows a default in development
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   JWT_SECRET: requiredInProduction(), // Must be set in production, throws in dev if missing
 *   API_KEY: requiredInProduction('dev-key'), // Must be set in production, uses default in dev
 * });
 * ```
 */
export function requiredInProduction(
  defaultValue?: string
): z.ZodString | z.ZodDefault<z.ZodString> {
  if (isProduction()) {
    return z.string().min(1, 'Required in production');
  }

  if (defaultValue !== undefined) {
    return z.string().default(defaultValue);
  }

  // In development without a default, still require but with a clearer message
  return z.string().min(1, 'Required (no default provided)');
}

/**
 * Creates a schema for sensitive values that must be set in production
 * and should not be logged
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   DATABASE_PASSWORD: secret(),
 *   API_SECRET: secret('dev-secret-only'),
 * });
 * ```
 */
export function secret(defaultValue?: string): z.ZodString | z.ZodDefault<z.ZodString> {
  return requiredInProduction(defaultValue);
}

/**
 * Creates a schema for port numbers
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   PORT: port(3000),
 *   METRICS_PORT: port(9090),
 * });
 * ```
 */
export function port(defaultValue?: number): z.ZodNumber | z.ZodDefault<z.ZodNumber> {
  const base = z.coerce
    .number()
    .int()
    .min(1, 'Port must be at least 1')
    .max(65535, 'Port must be at most 65535');

  return defaultValue !== undefined ? base.default(defaultValue) : base;
}

/**
 * Creates a schema for URLs
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   DATABASE_URL: url('postgresql://localhost/dev'),
 *   REDIS_URL: url(),
 * });
 * ```
 */
export function url(defaultValue?: string): z.ZodString | z.ZodDefault<z.ZodString> {
  const base = z.string().url('Must be a valid URL');
  return defaultValue !== undefined ? base.default(defaultValue) : base;
}

/**
 * Creates a schema for database URLs with protocol validation
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   DATABASE_URL: databaseUrl('postgresql://localhost:5432/mydb'),
 * });
 * ```
 */
export function databaseUrl(defaultValue?: string): z.ZodString {
  const base = z
    .string()
    .refine(
      (val) =>
        val.startsWith('postgresql://') ||
        val.startsWith('postgres://') ||
        val.startsWith('mysql://') ||
        val.startsWith('mongodb://') ||
        val.startsWith('mongodb+srv://'),
      'Must be a valid database URL (postgresql://, postgres://, mysql://, mongodb://, mongodb+srv://)'
    );

  return defaultValue !== undefined
    ? (base.default(defaultValue) as unknown as z.ZodString)
    : (base as unknown as z.ZodString);
}

/**
 * Creates a schema for Redis URLs
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   REDIS_URL: redisUrl('redis://localhost:6379'),
 * });
 * ```
 */
export function redisUrl(defaultValue?: string): z.ZodString {
  const base = z
    .string()
    .refine(
      (val) => val.startsWith('redis://') || val.startsWith('rediss://'),
      'Must be a valid Redis URL (redis:// or rediss://)'
    );

  return defaultValue !== undefined
    ? (base.default(defaultValue) as unknown as z.ZodString)
    : (base as unknown as z.ZodString);
}

/**
 * Creates a schema for boolean environment variables
 * Accepts: true, false, 1, 0, yes, no (case-insensitive)
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   ENABLE_FEATURE: bool(false),
 *   DEBUG_MODE: bool(),
 * });
 * ```
 */
export function bool(defaultValue?: boolean): z.ZodBoolean {
  const base = z
    .string()
    .transform((val) => {
      const lower = val.toLowerCase();
      return lower === 'true' || lower === '1' || lower === 'yes';
    })
    .pipe(z.boolean());

  return defaultValue !== undefined
    ? (base.default(String(defaultValue)) as unknown as z.ZodBoolean)
    : (base as unknown as z.ZodBoolean);
}

/**
 * Creates a schema for duration strings (e.g., '15m', '1h', '7d')
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   ACCESS_TOKEN_TTL: duration('15m'),
 *   REFRESH_TOKEN_TTL: duration('7d'),
 * });
 * ```
 */
export function duration(defaultValue?: string): z.ZodString | z.ZodDefault<z.ZodString> {
  const base = z
    .string()
    .regex(/^\d+[smhdw]$/, 'Must be a duration string (e.g., 15m, 1h, 7d, 1w)');

  return defaultValue !== undefined ? base.default(defaultValue) : base;
}

/**
 * Creates a schema for comma-separated lists
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   ALLOWED_ORIGINS: list(['http://localhost:3000']),
 *   ENABLED_FEATURES: list(),
 * });
 * ```
 */
export function list(defaultValue?: string[]): z.ZodArray<z.ZodString> {
  const base = z
    .string()
    .transform((val) =>
      val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    )
    .pipe(z.array(z.string()));

  return defaultValue !== undefined
    ? (base.default(defaultValue.join(',')) as unknown as z.ZodArray<z.ZodString>)
    : (base as unknown as z.ZodArray<z.ZodString>);
}

/**
 * Creates a schema for optional values with a fallback
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   LOG_LEVEL: optional('info'),
 *   FEATURE_FLAG: optional('false'),
 * });
 * ```
 */
export function optional(defaultValue: string): z.ZodDefault<z.ZodString> {
  return z.string().default(defaultValue);
}

/**
 * Creates a schema for enum values
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   LOG_LEVEL: enumValue(['debug', 'info', 'warn', 'error'], 'info'),
 *   ENV: enumValue(['development', 'staging', 'production']),
 * });
 * ```
 */
export function enumValue<T extends string>(
  values: readonly [T, ...T[]],
  defaultValue?: T
): z.ZodEnum<[T, ...T[]]> | z.ZodDefault<z.ZodEnum<[T, ...T[]]>> {
  const base = z.enum(values);
  return defaultValue !== undefined ? base.default(defaultValue) : base;
}

/**
 * Pre-built schemas for common service configurations
 */
export const commonSchemas = {
  /**
   * Basic service configuration
   */
  basicService: z.object({
    NODE_ENV: enumValue(['development', 'staging', 'production'], 'development'),
    PORT: port(3000),
    HOST: z.string().default('0.0.0.0'),
    LOG_LEVEL: enumValue(['debug', 'info', 'warn', 'error'], 'info'),
  }),

  /**
   * Database configuration
   */
  database: z.object({
    DATABASE_URL: databaseUrl(),
  }),

  /**
   * Redis configuration
   */
  redis: z.object({
    REDIS_URL: redisUrl('redis://localhost:6379'),
  }),

  /**
   * NATS configuration
   */
  nats: z.object({
    NATS_URL: z.string().default('nats://localhost:4222'),
    NATS_ENABLED: bool(true),
  }),

  /**
   * JWT configuration
   */
  jwt: z.object({
    JWT_SECRET: secret('dev-jwt-secret'),
    JWT_EXPIRES_IN: duration('24h'),
    REFRESH_TOKEN_EXPIRES_IN: duration('7d'),
  }),

  /**
   * OpenTelemetry configuration
   */
  otel: z.object({
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
    OTEL_SERVICE_NAME: z.string().optional(),
    OTEL_ENABLED: bool(false),
  }),
};

/**
 * Utility to merge multiple schemas
 *
 * @example
 * ```ts
 * const schema = mergeSchemas(
 *   commonSchemas.basicService,
 *   commonSchemas.database,
 *   commonSchemas.jwt,
 *   z.object({
 *     CUSTOM_VAR: z.string(),
 *   })
 * );
 * ```
 */
export function mergeSchemas<T extends z.ZodRawShape[]>(
  ...schemas: { [K in keyof T]: z.ZodObject<T[K]> }
): z.ZodObject<T[number]> {
  return schemas.reduce((acc, schema) => acc.merge(schema), z.object({})) as z.ZodObject<T[number]>;
}

/**
 * Validates and returns a summary of which required variables are missing
 * Useful for debugging and health checks
 */
export function getEnvStatus(schema: ZodType): {
  valid: boolean;
  missing: string[];
  present: string[];
} {
  const result = schema.safeParse(process.env);

  if (result.success) {
    return {
      valid: true,
      missing: [],
      present: Object.keys(result.data as object),
    };
  }

  const missing = result.error.issues
    .filter((issue) => issue.code === 'invalid_type' && issue.received === 'undefined')
    .map((issue) => issue.path.join('.'));

  const present = Object.keys(process.env).filter((key) => !missing.includes(key));

  return {
    valid: false,
    missing,
    present,
  };
}
