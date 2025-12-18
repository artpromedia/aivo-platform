/**
 * @aivo/ts-shared
 * Shared TypeScript utilities for AIVO platform
 */

// Auth exports
export * from './auth/index.js';

// Sensory exports - ND-2.1
export * from './sensory/index.js';

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

// Re-export sensory types
export type {
  SensorySensitivity,
  SensoryProfile,
  ContentSensoryMetadata,
  SensoryMatchResult,
  SensoryWarning,
  ContentAdaptation,
  SensoryContentFilter,
  SensoryIncident,
  SensoryIncidentInput,
  SensoryIncidentResolution,
} from './sensory/types.js';
