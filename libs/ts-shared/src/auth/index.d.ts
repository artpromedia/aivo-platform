/**
 * AIVO Platform Authentication Library
 * @module @aivo/ts-shared/auth
 */
export { JWTService, getJWTService, resetJWTService } from './jwt.js';
export type { TokenPayload, TokenPair, JWTConfig, ServiceTokenPayload } from './jwt.js';
export { createAuthMiddleware, createFastifyAuthHook, requirePermission, requireRole, requireTenantMatch, createServiceAuthMiddleware, } from './middleware.js';
export type { AuthenticatedRequest, AuthenticatedFastifyRequest, AuthMiddlewareConfig, } from './middleware.js';
export { ServiceClient, createServiceClient } from './service-auth.js';
export type { ServiceClientConfig, ServiceEndpoints } from './service-auth.js';
export { createGuard, allGuards, anyGuard, isAuthenticated, hasRole, hasAnyRole, hasAllRoles, hasPermission, hasAnyPermission, sameTenant, isOwner, ownerOrRole, isPlatformAdmin, isDistrictAdmin, isTeacher, isParent, isLearner, hasVerifiedEmail, } from './guards.js';
export type { GuardOptions, GuardResult, GuardFunction } from './guards.js';
export type { SessionInfo, DeviceInfo, AuthResult, RegisterInput, LoginInput, PasswordResetRequest, PasswordResetCompletion, PasswordChangeRequest, } from './types.js';
//# sourceMappingURL=index.d.ts.map