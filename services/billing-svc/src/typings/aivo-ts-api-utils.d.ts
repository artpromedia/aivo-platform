/* eslint-disable */
/**
 * Type declarations for @aivo/ts-api-utils package
 * Provides type stubs until the package is built with proper declarations.
 */

declare module '@aivo/ts-api-utils' {
  // ============================================================================
  // Rate Limiting Types
  // ============================================================================

  export interface RateLimitOptions {
    max: number;
    windowMs: number;
    keyPrefix?: string;
    keyExtractor?: (request: unknown) => string;
    message?: string;
    skip?: (request: unknown) => boolean;
    onRateLimitExceeded?: (info: RateLimitInfo) => void;
  }

  export interface RateLimitInfo {
    limit: number;
    remaining: number;
    resetAt: number;
    retryAfter: number;
  }

  export interface RateLimitResult {
    allowed: boolean;
    info: RateLimitInfo;
  }

  export type ServiceRateLimitType =
    | 'public-api'
    | 'internal-api'
    | 'auth-service'
    | 'ai-service'
    | 'data-ingestion'
    | 'messaging'
    | 'analytics'
    | 'search'
    | 'content'
    | 'billing';

  export interface FastifyRateLimitConfig {
    global: boolean;
    max: number;
    timeWindow: string;
    keyGenerator: (request: unknown) => string;
    errorResponseBuilder: (
      request: unknown,
      context: { after: string; max: number; ttl: number }
    ) => Record<string, unknown>;
    allowList: (request: unknown) => boolean;
  }

  export interface FastifyRateLimitOptions {
    serviceType: ServiceRateLimitType;
    serviceName: string;
    max?: number;
    timeWindow?: string;
    message?: string;
    additionalSkipPaths?: string[];
    keyGenerator?: (request: unknown) => string;
    global?: boolean;
  }

  export function getFastifyRateLimitConfig(
    options: FastifyRateLimitOptions
  ): FastifyRateLimitConfig;

  export const FastifyRateLimitPresets: {
    publicApi: (
      serviceName: string,
      overrides?: Partial<FastifyRateLimitOptions>
    ) => FastifyRateLimitConfig;
    internalApi: (
      serviceName: string,
      overrides?: Partial<FastifyRateLimitOptions>
    ) => FastifyRateLimitConfig;
    authService: (
      serviceName: string,
      overrides?: Partial<FastifyRateLimitOptions>
    ) => FastifyRateLimitConfig;
    aiService: (
      serviceName: string,
      overrides?: Partial<FastifyRateLimitOptions>
    ) => FastifyRateLimitConfig;
    dataIngestion: (
      serviceName: string,
      overrides?: Partial<FastifyRateLimitOptions>
    ) => FastifyRateLimitConfig;
    messaging: (
      serviceName: string,
      overrides?: Partial<FastifyRateLimitOptions>
    ) => FastifyRateLimitConfig;
    analytics: (
      serviceName: string,
      overrides?: Partial<FastifyRateLimitOptions>
    ) => FastifyRateLimitConfig;
    search: (
      serviceName: string,
      overrides?: Partial<FastifyRateLimitOptions>
    ) => FastifyRateLimitConfig;
    content: (
      serviceName: string,
      overrides?: Partial<FastifyRateLimitOptions>
    ) => FastifyRateLimitConfig;
    billing: (
      serviceName: string,
      overrides?: Partial<FastifyRateLimitOptions>
    ) => FastifyRateLimitConfig;
  };

  export function createRateLimiter(
    options: RateLimitOptions
  ): (...args: unknown[]) => Promise<void>;

  export const RateLimitPresets: {
    LOGIN: RateLimitOptions;
    REGISTRATION: RateLimitOptions;
    PASSWORD_RESET: RateLimitOptions;
    TOKEN_REFRESH: RateLimitOptions;
    SSO: RateLimitOptions;
    API_GENERAL: RateLimitOptions;
    PUBLIC_READ: RateLimitOptions;
    API_WRITE: RateLimitOptions;
    AI_REQUEST: RateLimitOptions;
    HEALTH_CHECK: RateLimitOptions;
    REPORT_GENERATION: RateLimitOptions;
    FILE_UPLOAD: RateLimitOptions;
    CONTACT_FORM: RateLimitOptions;
  };

  // ============================================================================
  // Fastify Plugin Helpers
  // ============================================================================

  export function asPlugin(plugin: unknown): import('fastify').FastifyPluginAsync;
  export function fastifyPlugin(plugin: unknown): import('fastify').FastifyPluginAsync;

  // ============================================================================
  // Mock Mode
  // ============================================================================

  export function isMockMode(): boolean;
  export function assertNotMockMode(operation: string): void;

  // ============================================================================
  // Logger
  // ============================================================================

  export function createLogger(name: string): {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    debug: (...args: unknown[]) => void;
  };

  // ============================================================================
  // Service URLs
  // ============================================================================

  export function getServiceUrl(serviceName: string): string;

  // ============================================================================
  // Random
  // ============================================================================

  export function cryptoRandomString(length: number): string;
  export function cryptoRandomInt(min: number, max: number): number;

  // ============================================================================
  // DataLoader
  // ============================================================================

  export class DataLoaderFactory {
    constructor(prisma: unknown);
  }

  export interface PrismaLike {
    [key: string]: unknown;
  }

  export interface BaseEntity {
    id: string;
  }

  // ============================================================================
  // Env Validation
  // ============================================================================

  export interface EnvValidationConfig {
    serviceName: string;
    requiredVars: string[];
  }

  export interface ValidationResult {
    valid: boolean;
    errors: string[];
  }

  export const COMMON_PRODUCTION_VARS: string[];
  export function validateNoLocalhostInProduction(url: string): void;
  export function validateSecretNotDefault(secret: string, name: string): void;
  export function validateProductionConfig(config: EnvValidationConfig): ValidationResult;
  export function assertProductionConfig(config: EnvValidationConfig): void;
  export const EnvValidation: {
    validate: (config: EnvValidationConfig) => ValidationResult;
    assert: (config: EnvValidationConfig) => void;
  };

  // ============================================================================
  // Soft Delete
  // ============================================================================

  export function withSoftDelete<T>(model: T): T;

  // ============================================================================
  // Audit
  // ============================================================================

  export function createAuditLogger(config: { serviceName: string; prisma?: unknown }): {
    log: (event: {
      action: string;
      userId?: string;
      tenantId?: string;
      resourceType?: string;
      resourceId?: string;
      metadata?: Record<string, unknown>;
    }) => Promise<void>;
  };
}
