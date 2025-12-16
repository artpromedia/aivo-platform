/**
 * AIVO Platform Authentication Library
 * @module @aivo/ts-shared/auth
 */

// JWT utilities
export { JWTService, getJWTService, resetJWTService } from './jwt.js';
export type { TokenPayload, TokenPair, JWTConfig, ServiceTokenPayload } from './jwt.js';

// Middleware
export {
  createAuthMiddleware,
  createFastifyAuthHook,
  requirePermission,
  requireRole,
  requireTenantMatch,
  createServiceAuthMiddleware,
} from './middleware.js';
export type {
  AuthenticatedRequest,
  AuthenticatedFastifyRequest,
  AuthMiddlewareConfig,
} from './middleware.js';

// Service-to-service auth
export { ServiceClient, createServiceClient } from './service-auth.js';
export type { ServiceClientConfig, ServiceEndpoints } from './service-auth.js';

// Guards
export {
  createGuard,
  allGuards,
  anyGuard,
  isAuthenticated,
  hasRole,
  hasAnyRole,
  hasAllRoles,
  hasPermission,
  hasAnyPermission,
  sameTenant,
  isOwner,
  ownerOrRole,
  isPlatformAdmin,
  isDistrictAdmin,
  isTeacher,
  isParent,
  isLearner,
  hasVerifiedEmail,
} from './guards.js';
export type { GuardOptions, GuardResult, GuardFunction } from './guards.js';

// Types
export type {
  SessionInfo,
  DeviceInfo,
  AuthResult,
  RegisterInput,
  LoginInput,
  PasswordResetRequest,
  PasswordResetCompletion,
  PasswordChangeRequest,
} from './types.js';
