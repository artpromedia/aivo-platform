/**
 * @aivo/ts-api-utils
 *
 * Shared API utilities for AIVO platform services.
 *
 * This package provides production-ready utilities addressing:
 * - CRIT-010: Production-safe mock mode
 * - HIGH-002: Service URL configuration (no localhost in prod)
 * - HIGH-003: Structured logging (no console.log in prod)
 * - HIGH-005: DataLoader for N+1 query prevention
 * - HIGH-007: Crypto-safe random utilities (no Math.random)
 * - HIGH-008: Rate limiting for public endpoints
 * - HIGH-009: Admin audit logging
 * - Production environment validation
 */

// Mock mode utilities - contains primary env validation functions
export * from './mock-mode.js';
export * from './rate-limit.js';
export * from './logger.js';
export * from './random.js';
export * from './audit.js';
export * from './service-urls.js';
export * from './dataloader.js';

// DataLoader factory - exclude duplicate exports already in dataloader.js
export { DataLoaderFactory, type PrismaLike, type BaseEntity } from './dataloader-factory.js';

// Env validation - only export items not already in mock-mode.js
export {
  type EnvValidationConfig,
  type ValidationResult,
  COMMON_PRODUCTION_VARS,
  validateNoLocalhostInProduction,
  validateSecretNotDefault,
  validateProductionConfig,
  assertProductionConfig,
  EnvValidation,
} from './env-validation.js';

// API versioning (also available as deep imports)
export { apiVersioning, type ApiVersion, type VersioningOptions } from './versioning.js';
export { registerVersionedRoutes, versionedRoute, type VersionedRoute } from './versioned-routes.js';
export {
  internalVersioning,
  INTERNAL_API_VERSION_HEADER,
  INTERNAL_VERSION_LATEST,
  isVersionAtLeast,
  withInternalVersion,
  type InternalVersioningOptions,
} from './internal-versioning.js';

export * from './soft-delete.js';

// Fastify plugin type helpers
export { asPlugin, fastifyPlugin } from './fastify-helpers.js';
