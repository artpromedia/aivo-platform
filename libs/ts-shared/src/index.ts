/**
 * @aivo/ts-shared
 * Shared TypeScript utilities for AIVO platform
 */

// Auth exports
export * from './auth/index.js';

// Sensory exports - ND-2.1
export * from './sensory/index.js';

// Motor exports - ND-3.3
export * from './motor/index.js';

// Re-export common types
export type {
  TokenPayload,
  ServiceTokenPayload,
  TokenPair,
  JWTConfig,
  SessionInfo,
  DeviceInfo,
  AuthResult,
  RegisterInput,
  LoginInput,
  PasswordResetRequest,
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
} from './sensory/types.js';
