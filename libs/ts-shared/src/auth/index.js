/**
 * AIVO Platform Authentication Library
 * @module @aivo/ts-shared/auth
 */
// JWT utilities
export { JWTService, getJWTService, resetJWTService } from './jwt.js';
// Middleware
export { createAuthMiddleware, createFastifyAuthHook, requirePermission, requireRole, requireTenantMatch, createServiceAuthMiddleware, } from './middleware.js';
// Service-to-service auth
export { ServiceClient, createServiceClient } from './service-auth.js';
// Guards
export { createGuard, allGuards, anyGuard, isAuthenticated, hasRole, hasAnyRole, hasAllRoles, hasPermission, hasAnyPermission, sameTenant, isOwner, ownerOrRole, isPlatformAdmin, isDistrictAdmin, isTeacher, isParent, isLearner, hasVerifiedEmail, } from './guards.js';
//# sourceMappingURL=index.js.map