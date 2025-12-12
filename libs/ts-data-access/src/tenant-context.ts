/**
 * Tenant Context Utilities
 *
 * Provides context types and utilities for managing tenant-scoped operations
 * across the AIVO platform.
 *
 * @module @aivo/ts-data-access/tenant-context
 */

import type { Role } from '@aivo/ts-rbac';

/**
 * Tenant context that is extracted from JWT and attached to requests
 */
export interface TenantContext {
  /**
   * The ID of the tenant (district, consumer household, or clinic)
   */
  tenantId: string;

  /**
   * The ID of the authenticated user
   */
  userId: string;

  /**
   * Roles assigned to the user within this tenant
   */
  roles: Role[];

  /**
   * Type of tenant (for applying different policies)
   */
  tenantType?: 'consumer' | 'district' | 'clinic' | undefined;

  /**
   * Whether the tenant is active (should always be true for valid requests)
   */
  isActive?: boolean | undefined;

  /**
   * Learner IDs the user has direct access to (teacher roster, parent's children)
   */
  relatedLearnerIds?: string[] | undefined;
}

/**
 * Extended tenant context with additional metadata
 */
export interface ExtendedTenantContext extends TenantContext {
  /**
   * Learner IDs the user has direct access to (teacher roster, parent's children)
   */
  relatedLearnerIds?: string[] | undefined;

  /**
   * School IDs the user belongs to (for district contexts)
   */
  schoolIds?: string[] | undefined;

  /**
   * Classroom IDs the user has access to
   */
  classroomIds?: string[] | undefined;

  /**
   * Request ID for tracing
   */
  requestId?: string | undefined;

  /**
   * Timestamp when context was created
   */
  timestamp?: Date | undefined;
}

/**
 * System context for operations that need to bypass tenant scoping
 * (e.g., cross-tenant reports, platform admin operations)
 */
export interface SystemContext {
  /**
   * Flag indicating this is a system-level operation
   */
  isSystem: true;

  /**
   * The system service or user performing the operation
   */
  systemId: string;

  /**
   * Reason for system-level access (for audit trail)
   */
  reason: string;

  /**
   * Request ID for tracing
   */
  requestId?: string;
}

/**
 * Union type for request contexts
 */
export type RequestContext = TenantContext | SystemContext;

/**
 * Type guard to check if context is a tenant context
 */
export function isTenantContext(ctx: RequestContext): ctx is TenantContext {
  return 'tenantId' in ctx && !('isSystem' in ctx);
}

/**
 * Type guard to check if context is a system context
 */
export function isSystemContext(ctx: RequestContext): ctx is SystemContext {
  return 'isSystem' in ctx && ctx.isSystem === true;
}

/**
 * Validates that a tenant context is complete and valid
 */
export function validateTenantContext(ctx: unknown): ctx is TenantContext {
  if (!ctx || typeof ctx !== 'object') return false;
  const c = ctx as Record<string, unknown>;
  return (
    typeof c.tenantId === 'string' &&
    c.tenantId.trim() !== '' &&
    typeof c.userId === 'string' &&
    c.userId.trim() !== '' &&
    Array.isArray(c.roles)
  );
}

/**
 * Error thrown when tenant context is missing or invalid
 */
export class TenantContextError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'MISSING_CONTEXT'
      | 'INVALID_CONTEXT'
      | 'INACTIVE_TENANT'
      | 'TENANT_NOT_FOUND'
  ) {
    super(message);
    this.name = 'TenantContextError';
  }
}

/**
 * Creates a tenant context from JWT claims
 */
export function createTenantContextFromClaims(claims: Record<string, unknown>): TenantContext {
  const tenantId = claims.tenant_id ?? claims.tenantId;
  const userId = claims.sub ?? claims.userId;
  const roles = claims.roles;

  if (typeof tenantId !== 'string' || tenantId.trim() === '') {
    throw new TenantContextError('Missing or invalid tenant_id in JWT claims', 'INVALID_CONTEXT');
  }

  if (typeof userId !== 'string' || userId.trim() === '') {
    throw new TenantContextError('Missing or invalid sub/userId in JWT claims', 'INVALID_CONTEXT');
  }

  if (!Array.isArray(roles)) {
    throw new TenantContextError('Missing or invalid roles in JWT claims', 'INVALID_CONTEXT');
  }

  const tenantType = claims.tenant_type as TenantContext['tenantType'];
  return {
    tenantId,
    userId,
    roles: roles as Role[],
    ...(tenantType !== undefined ? { tenantType } : {}),
  };
}

/**
 * AsyncLocalStorage for propagating tenant context through async operations
 */
let asyncLocalStorage: AsyncLocalStorage<TenantContext> | null = null;

/**
 * Gets or creates the AsyncLocalStorage instance for tenant context
 */
function getAsyncLocalStorage(): AsyncLocalStorage<TenantContext> {
  if (!asyncLocalStorage) {
    asyncLocalStorage = new AsyncLocalStorage<TenantContext>();
  }
  return asyncLocalStorage;
}

/**
 * Runs a function within a tenant context
 *
 * @example
 * ```typescript
 * await runWithTenantContext(ctx, async () => {
 *   // All operations here have access to tenant context
 *   const tenantId = getCurrentTenantId();
 * });
 * ```
 */
export function runWithTenantContext<T>(ctx: TenantContext, fn: () => T): T {
  return getAsyncLocalStorage().run(ctx, fn);
}

/**
 * Gets the current tenant context from AsyncLocalStorage
 *
 * @throws TenantContextError if no context is available
 */
export function getCurrentTenantContext(): TenantContext {
  const ctx = getAsyncLocalStorage().getStore();
  if (!ctx) {
    throw new TenantContextError(
      'No tenant context available. Ensure the request is wrapped with runWithTenantContext',
      'MISSING_CONTEXT'
    );
  }
  return ctx;
}

/**
 * Gets the current tenant ID from context, or undefined if not available
 */
export function getCurrentTenantId(): string | undefined {
  return getAsyncLocalStorage().getStore()?.tenantId;
}

/**
 * Gets the current user ID from context, or undefined if not available
 */
export function getCurrentUserId(): string | undefined {
  return getAsyncLocalStorage().getStore()?.userId;
}

/**
 * Checks if the current context has a specific role
 */
export function currentContextHasRole(role: Role): boolean {
  const ctx = getAsyncLocalStorage().getStore();
  return ctx?.roles.includes(role) ?? false;
}

// Node.js AsyncLocalStorage type
import { AsyncLocalStorage } from 'node:async_hooks';
