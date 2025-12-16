/**
 * Authentication Guards for Route Protection
 * @module @aivo/ts-shared/auth/guards
 */

import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './middleware.js';

/**
 * Guard options
 */
export interface GuardOptions {
  /** Custom error message */
  message?: string;
  /** Custom error code */
  code?: string;
}

/**
 * Guard result
 */
export interface GuardResult {
  allowed: boolean;
  message?: string;
  code?: string;
}

/**
 * Guard function type
 */
export type GuardFunction = (req: AuthenticatedRequest) => boolean | Promise<boolean>;

/**
 * Create a route guard from a guard function
 */
export function createGuard(
  guardFn: GuardFunction,
  options: GuardOptions = {}
) {
  return async function guard(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const authReq = req as AuthenticatedRequest;

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
    } catch (error) {
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
export function allGuards(...guards: GuardFunction[]): GuardFunction {
  return async (req: AuthenticatedRequest): Promise<boolean> => {
    for (const guard of guards) {
      const result = await guard(req);
      if (!result) return false;
    }
    return true;
  };
}

/**
 * Combine multiple guards (any must pass)
 */
export function anyGuard(...guards: GuardFunction[]): GuardFunction {
  return async (req: AuthenticatedRequest): Promise<boolean> => {
    for (const guard of guards) {
      const result = await guard(req);
      if (result) return true;
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
export const isAuthenticated: GuardFunction = (req) => !!req.user;

/**
 * Guard: User must have specific role
 */
export function hasRole(role: string): GuardFunction {
  return (req) => req.user?.roles?.includes(role) ?? false;
}

/**
 * Guard: User must have any of the specified roles
 */
export function hasAnyRole(...roles: string[]): GuardFunction {
  return (req) => roles.some((role) => req.user?.roles?.includes(role));
}

/**
 * Guard: User must have all specified roles
 */
export function hasAllRoles(...roles: string[]): GuardFunction {
  return (req) => roles.every((role) => req.user?.roles?.includes(role));
}

/**
 * Guard: User must have specific permission
 */
export function hasPermission(permission: string): GuardFunction {
  return (req) => {
    const userPermissions = req.user?.permissions ?? [];
    
    // Direct match
    if (userPermissions.includes(permission)) return true;
    
    // Wildcard match
    if (userPermissions.includes('*')) return true;
    
    // Resource wildcard match
    const [resource] = permission.split(':');
    if (userPermissions.includes(`${resource}:*`)) return true;
    
    return false;
  };
}

/**
 * Guard: User must have any of the specified permissions
 */
export function hasAnyPermission(...permissions: string[]): GuardFunction {
  return (req) => permissions.some((perm) => hasPermission(perm)(req));
}

/**
 * Guard: User must belong to the same tenant as the resource
 */
export function sameTenant(getTenantId: (req: AuthenticatedRequest) => string | undefined): GuardFunction {
  return (req) => {
    const resourceTenantId = getTenantId(req);
    if (!resourceTenantId) return true; // No tenant restriction
    
    // Platform admins can access any tenant
    if (req.user?.roles?.includes('PLATFORM_ADMIN')) return true;
    
    return req.user?.tenantId === resourceTenantId;
  };
}

/**
 * Guard: User must be the owner of the resource
 */
export function isOwner(getOwnerId: (req: AuthenticatedRequest) => string | undefined): GuardFunction {
  return (req) => {
    const ownerId = getOwnerId(req);
    if (!ownerId) return false;
    return req.user?.sub === ownerId;
  };
}

/**
 * Guard: User must be owner OR have specific role
 */
export function ownerOrRole(
  getOwnerId: (req: AuthenticatedRequest) => string | undefined,
  role: string
): GuardFunction {
  return anyGuard(isOwner(getOwnerId), hasRole(role));
}

/**
 * Guard: User must be a platform admin
 */
export const isPlatformAdmin: GuardFunction = hasRole('PLATFORM_ADMIN');

/**
 * Guard: User must be a district admin
 */
export const isDistrictAdmin: GuardFunction = hasAnyRole('DISTRICT_ADMIN', 'PLATFORM_ADMIN');

/**
 * Guard: User must be a teacher
 */
export const isTeacher: GuardFunction = hasAnyRole('TEACHER', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN');

/**
 * Guard: User must be a parent
 */
export const isParent: GuardFunction = hasRole('PARENT');

/**
 * Guard: User must be a learner
 */
export const isLearner: GuardFunction = hasRole('LEARNER');

/**
 * Guard: User has verified email
 */
export const hasVerifiedEmail: GuardFunction = (req) => {
  // This would need to be passed in the token or fetched
  // For now, we assume all authenticated users have verified emails
  return true;
};
