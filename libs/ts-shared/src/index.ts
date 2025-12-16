/**
 * @aivo/ts-shared
 * Shared TypeScript utilities for AIVO platform
 */

// Auth exports
export * from './auth/index.js';

// Re-export common types
export type {
  TokenPayload,
  ServiceTokenPayload,
  TokenPair,
  JWTConfig,
  AuthenticatedRequest,
  SessionInfo,
  DeviceInfo,
  AuthResult,
  RegisterInput,
  LoginInput,
  PasswordResetRequest,
  Guard,
  GuardContext,
} from './auth/types.js';
