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
export declare function createGuard(guardFn: GuardFunction, options?: GuardOptions): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Combine multiple guards (all must pass)
 */
export declare function allGuards(...guards: GuardFunction[]): GuardFunction;
/**
 * Combine multiple guards (any must pass)
 */
export declare function anyGuard(...guards: GuardFunction[]): GuardFunction;
/**
 * Guard: User must be authenticated
 */
export declare const isAuthenticated: GuardFunction;
/**
 * Guard: User must have specific role
 */
export declare function hasRole(role: string): GuardFunction;
/**
 * Guard: User must have any of the specified roles
 */
export declare function hasAnyRole(...roles: string[]): GuardFunction;
/**
 * Guard: User must have all specified roles
 */
export declare function hasAllRoles(...roles: string[]): GuardFunction;
/**
 * Guard: User must have specific permission
 */
export declare function hasPermission(permission: string): GuardFunction;
/**
 * Guard: User must have any of the specified permissions
 */
export declare function hasAnyPermission(...permissions: string[]): GuardFunction;
/**
 * Guard: User must belong to the same tenant as the resource
 */
export declare function sameTenant(getTenantId: (req: AuthenticatedRequest) => string | undefined): GuardFunction;
/**
 * Guard: User must be the owner of the resource
 */
export declare function isOwner(getOwnerId: (req: AuthenticatedRequest) => string | undefined): GuardFunction;
/**
 * Guard: User must be owner OR have specific role
 */
export declare function ownerOrRole(getOwnerId: (req: AuthenticatedRequest) => string | undefined, role: string): GuardFunction;
/**
 * Guard: User must be a platform admin
 */
export declare const isPlatformAdmin: GuardFunction;
/**
 * Guard: User must be a district admin
 */
export declare const isDistrictAdmin: GuardFunction;
/**
 * Guard: User must be a teacher
 */
export declare const isTeacher: GuardFunction;
/**
 * Guard: User must be a parent
 */
export declare const isParent: GuardFunction;
/**
 * Guard: User must be a learner
 */
export declare const isLearner: GuardFunction;
/**
 * Guard: User has verified email
 */
export declare const hasVerifiedEmail: GuardFunction;
//# sourceMappingURL=guards.d.ts.map