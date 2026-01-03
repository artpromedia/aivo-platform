/**
 * Authentication Guards for Route Protection
 * @module @aivo/ts-shared/auth/guards
 */
/**
 * Create a route guard from a guard function
 */
export function createGuard(guardFn, options = {}) {
    return async function guard(req, res, next) {
        const authReq = req;
        if (!authReq.user) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required',
                code: 'AUTH_REQUIRED',
            });
            return;
        }
        try {
            const allowed = await guardFn(authReq);
            if (!allowed) {
                res.status(403).json({
                    error: 'Forbidden',
                    message: options.message || 'Access denied',
                    code: options.code || 'ACCESS_DENIED',
                });
                return;
            }
            next();
        }
        catch (error) {
            res.status(500).json({
                error: 'Internal Server Error',
                message: 'Guard evaluation failed',
            });
        }
    };
}
/**
 * Combine multiple guards (all must pass)
 */
export function allGuards(...guards) {
    return async (req) => {
        for (const guard of guards) {
            const result = await guard(req);
            if (!result)
                return false;
        }
        return true;
    };
}
/**
 * Combine multiple guards (any must pass)
 */
export function anyGuard(...guards) {
    return async (req) => {
        for (const guard of guards) {
            const result = await guard(req);
            if (result)
                return true;
        }
        return false;
    };
}
// ============================================================================
// Common Guards
// ============================================================================
/**
 * Guard: User must be authenticated
 */
export const isAuthenticated = (req) => !!req.user;
/**
 * Guard: User must have specific role
 */
export function hasRole(role) {
    return (req) => req.user?.roles?.includes(role) ?? false;
}
/**
 * Guard: User must have any of the specified roles
 */
export function hasAnyRole(...roles) {
    return (req) => roles.some((role) => req.user?.roles?.includes(role));
}
/**
 * Guard: User must have all specified roles
 */
export function hasAllRoles(...roles) {
    return (req) => roles.every((role) => req.user?.roles?.includes(role));
}
/**
 * Guard: User must have specific permission
 */
export function hasPermission(permission) {
    return (req) => {
        const userPermissions = req.user?.permissions ?? [];
        // Direct match
        if (userPermissions.includes(permission))
            return true;
        // Wildcard match
        if (userPermissions.includes('*'))
            return true;
        // Resource wildcard match
        const [resource] = permission.split(':');
        if (userPermissions.includes(`${resource}:*`))
            return true;
        return false;
    };
}
/**
 * Guard: User must have any of the specified permissions
 */
export function hasAnyPermission(...permissions) {
    return (req) => permissions.some((perm) => hasPermission(perm)(req));
}
/**
 * Guard: User must belong to the same tenant as the resource
 */
export function sameTenant(getTenantId) {
    return (req) => {
        const resourceTenantId = getTenantId(req);
        if (!resourceTenantId)
            return true; // No tenant restriction
        // Platform admins can access any tenant
        if (req.user?.roles?.includes('PLATFORM_ADMIN'))
            return true;
        return req.user?.tenantId === resourceTenantId;
    };
}
/**
 * Guard: User must be the owner of the resource
 */
export function isOwner(getOwnerId) {
    return (req) => {
        const ownerId = getOwnerId(req);
        if (!ownerId)
            return false;
        return req.user?.sub === ownerId;
    };
}
/**
 * Guard: User must be owner OR have specific role
 */
export function ownerOrRole(getOwnerId, role) {
    return anyGuard(isOwner(getOwnerId), hasRole(role));
}
/**
 * Guard: User must be a platform admin
 */
export const isPlatformAdmin = hasRole('PLATFORM_ADMIN');
/**
 * Guard: User must be a district admin
 */
export const isDistrictAdmin = hasAnyRole('DISTRICT_ADMIN', 'PLATFORM_ADMIN');
/**
 * Guard: User must be a teacher
 */
export const isTeacher = hasAnyRole('TEACHER', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN');
/**
 * Guard: User must be a parent
 */
export const isParent = hasRole('PARENT');
/**
 * Guard: User must be a learner
 */
export const isLearner = hasRole('LEARNER');
/**
 * Guard: User has verified email
 */
export const hasVerifiedEmail = (req) => {
    // This would need to be passed in the token or fetched
    // For now, we assume all authenticated users have verified emails
    return true;
};
//# sourceMappingURL=guards.js.map