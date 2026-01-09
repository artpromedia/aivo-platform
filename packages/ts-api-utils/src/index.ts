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
 */

export * from './mock-mode.js';
export * from './rate-limit.js';
export * from './logger.js';
export * from './random.js';
export * from './audit.js';
export * from './service-urls.js';
export * from './dataloader.js';
