/* eslint-disable */
/**
 * Type declarations for @aivo/env-validation package
 * Provides type stubs until the package is built with proper declarations.
 */

declare module '@aivo/env-validation' {
  import type { ZodType, ZodObject, ZodRawShape } from 'zod';
  export { z } from 'zod';

  // ============================================================================
  // Environment Detection
  // ============================================================================

  export function isProduction(): boolean;
  export function isDevelopment(): boolean;
  export function isTest(): boolean;

  // ============================================================================
  // Validation Options
  // ============================================================================

  export interface EnvValidationOptions {
    serviceName?: string;
    exitOnError?: boolean;
    onError?: (error: EnvValidationError) => void;
  }

  export class EnvValidationError extends Error {
    public readonly issues: Array<{ path: (string | number)[]; message: string }>;
    public readonly serviceName?: string;
    constructor(error: unknown, serviceName?: string);
  }

  // ============================================================================
  // Core Functions
  // ============================================================================

  export function validateEnv<T extends ZodType>(
    schema: T,
    options?: EnvValidationOptions
  ): import('zod').z.infer<T>;

  export function requiredInProduction(
    defaultValue?: string
  ): import('zod').ZodString | import('zod').ZodDefault<import('zod').ZodString>;

  export function secret(
    defaultValue?: string
  ): import('zod').ZodString | import('zod').ZodDefault<import('zod').ZodString>;

  export function port(
    defaultValue?: number
  ): import('zod').ZodNumber | import('zod').ZodDefault<import('zod').ZodNumber>;

  export function url(
    defaultValue?: string
  ): import('zod').ZodString | import('zod').ZodDefault<import('zod').ZodString>;

  export function databaseUrl(defaultValue?: string): import('zod').ZodString;

  export function redisUrl(defaultValue?: string): import('zod').ZodString;

  export function bool(defaultValue?: boolean): import('zod').ZodBoolean;

  export function duration(
    defaultValue?: string
  ): import('zod').ZodString | import('zod').ZodDefault<import('zod').ZodString>;

  export function list(defaultValue?: string[]): import('zod').ZodArray<import('zod').ZodString>;

  export function optional(defaultValue: string): import('zod').ZodDefault<import('zod').ZodString>;

  export function enumValue<T extends string>(
    values: readonly [T, ...T[]],
    defaultValue?: T
  ):
    | import('zod').ZodEnum<[T, ...T[]]>
    | import('zod').ZodDefault<import('zod').ZodEnum<[T, ...T[]]>>;

  // ============================================================================
  // Common Schemas
  // ============================================================================

  export const commonSchemas: {
    basicService: import('zod').ZodObject<Record<string, unknown>>;
    database: import('zod').ZodObject<Record<string, unknown>>;
    redis: import('zod').ZodObject<Record<string, unknown>>;
    nats: import('zod').ZodObject<Record<string, unknown>>;
    jwt: import('zod').ZodObject<Record<string, unknown>>;
    otel: import('zod').ZodObject<Record<string, unknown>>;
  };

  export function mergeSchemas<T extends ZodRawShape[]>(
    ...schemas: { [K in keyof T]: ZodObject<T[K]> }
  ): ZodObject<T[number]>;

  export function getEnvStatus(schema: ZodType): {
    valid: boolean;
    missing: string[];
    present: string[];
  };
}
