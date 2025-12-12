// Core types and access control
export type { AuthContext, FieldClassification } from './types.js';
export {
  canViewLearnerField,
  filterLearnerPayloadForCaller,
  learnerFieldPolicy,
} from './learnerAccess.js';

// Tenant scoping exports
export {
  createTenantScopedClient,
  getCachedTenantClient,
  isTenantScopedModel,
  TENANT_SCOPED_MODELS,
  CrossTenantAccessError,
  RawQueryBlockedError,
  defaultTenantScopeLogger,
} from './tenant-scoped-client.js';

export type {
  TenantScopedModel,
  CrossTenantAccessLogEntry,
  TenantScopeLogger,
  TenantScopedClientOptions,
  TenantScopedPrismaClient,
} from './tenant-scoped-client.js';

// Tenant context exports
export {
  validateTenantContext,
  isTenantContext,
  isSystemContext,
  createTenantContextFromClaims,
  runWithTenantContext,
  getCurrentTenantContext,
  getCurrentTenantId,
  getCurrentUserId,
  currentContextHasRole,
  TenantContextError,
} from './tenant-context.js';

export type {
  TenantContext,
  ExtendedTenantContext,
  SystemContext,
  RequestContext,
} from './tenant-context.js';

// Tenant scope middleware exports
export {
  tenantScopeMiddleware,
  createTenantScopeHook,
  withRequestTenantContext,
} from './tenant-scope-middleware.js';

export type { TenantScopeMiddlewareOptions } from './tenant-scope-middleware.js';