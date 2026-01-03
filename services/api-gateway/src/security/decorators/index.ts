/**
 * Security Decorators
 * Custom decorators for security-related functionality
 */

import { 
  SetMetadata, 
  createParamDecorator, 
  ExecutionContext,
  applyDecorators,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { 
  AuthenticatedUser, 
  Permission, 
  DataClassification,
  ConsentPurpose,
} from '../types';

// ============================================================================
// METADATA KEYS
// ============================================================================

export const METADATA_KEYS = {
  IS_PUBLIC: 'isPublic',
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
  REQUIRE_MFA: 'requireMfa',
  REQUIRE_CONSENT: 'requireConsent',
  DATA_CLASSIFICATION: 'dataClassification',
  AUDIT_ACTION: 'auditAction',
  RATE_LIMIT: 'rateLimit',
  AGE_RESTRICTION: 'ageRestriction',
  SKIP_AUDIT: 'skipAudit',
  TENANT_AWARE: 'tenantAware',
} as const;

// ============================================================================
// AUTHENTICATION DECORATORS
// ============================================================================

/**
 * Mark endpoint as public (no authentication required)
 */
export const Public = () => SetMetadata(METADATA_KEYS.IS_PUBLIC, true);

/**
 * Require MFA verification for this endpoint
 */
export const RequireMfa = () => SetMetadata(METADATA_KEYS.REQUIRE_MFA, true);

/**
 * Get the current authenticated user from request
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser;
    return data ? user?.[data] : user;
  },
);

/**
 * Get the current tenant ID
 */
export const CurrentTenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user?.tenantId || request.securityContext?.tenantId;
  },
);

/**
 * Get the correlation ID for request tracing
 */
export const CorrelationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.correlationId || request.headers['x-correlation-id'];
  },
);

// ============================================================================
// AUTHORIZATION DECORATORS
// ============================================================================

/**
 * Require specific roles to access endpoint
 */
export const Roles = (...roles: string[]) => 
  SetMetadata(METADATA_KEYS.ROLES, roles);

/**
 * Require specific permissions to access endpoint
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(METADATA_KEYS.PERMISSIONS, permissions);

/**
 * Define detailed permission requirements
 */
export const RequirePermission = (permission: Permission) =>
  SetMetadata(METADATA_KEYS.PERMISSIONS, [permission]);

/**
 * Mark endpoint as tenant-aware (enforces tenant isolation)
 */
export const TenantAware = () => SetMetadata(METADATA_KEYS.TENANT_AWARE, true);

// ============================================================================
// CONSENT DECORATORS
// ============================================================================

/**
 * Require user consent for specific purposes
 */
export const RequireConsent = (...purposes: ConsentPurpose[]) =>
  SetMetadata(METADATA_KEYS.REQUIRE_CONSENT, purposes);

/**
 * Age restriction decorator for COPPA compliance
 */
export const AgeRestriction = (minAge: number) =>
  SetMetadata(METADATA_KEYS.AGE_RESTRICTION, minAge);

// ============================================================================
// DATA PROTECTION DECORATORS
// ============================================================================

/**
 * Mark endpoint's data classification level
 */
export const DataClassificationLevel = (level: DataClassification) =>
  SetMetadata(METADATA_KEYS.DATA_CLASSIFICATION, level);

/**
 * Classify endpoint as handling confidential data
 */
export const Confidential = () => 
  DataClassificationLevel('confidential');

/**
 * Classify endpoint as handling restricted data
 */
export const Restricted = () => 
  DataClassificationLevel('restricted');

// ============================================================================
// AUDIT DECORATORS
// ============================================================================

/**
 * Specify audit action name for logging
 */
export const AuditAction = (action: string) =>
  SetMetadata(METADATA_KEYS.AUDIT_ACTION, action);

/**
 * Skip audit logging for this endpoint
 */
export const SkipAudit = () => SetMetadata(METADATA_KEYS.SKIP_AUDIT, true);

// ============================================================================
// RATE LIMITING DECORATORS
// ============================================================================

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix?: string;
}

/**
 * Apply custom rate limit to endpoint
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(METADATA_KEYS.RATE_LIMIT, options);

/**
 * Apply strict rate limit (for sensitive operations)
 */
export const StrictRateLimit = () => 
  RateLimit({ windowMs: 60000, max: 10 });

// ============================================================================
// COMPOSITE DECORATORS
// ============================================================================

/**
 * Admin-only endpoint (combines multiple guards)
 */
export const AdminOnly = () => 
  applyDecorators(
    Roles('admin', 'super_admin'),
    RequireMfa(),
    AuditAction('admin_action'),
  );

/**
 * Sensitive data endpoint (combines classification + audit)
 */
export const SensitiveData = () =>
  applyDecorators(
    Confidential(),
    AuditAction('sensitive_data_access'),
    RequireConsent('educational_services'),
  );

/**
 * FERPA-protected endpoint
 */
export const FerpaProtected = () =>
  applyDecorators(
    Restricted(),
    AuditAction('ferpa_data_access'),
    RequireConsent('educational_services'),
    TenantAware(),
  );

/**
 * COPPA-compliant endpoint (for minors)
 */
export const CoppaCompliant = () =>
  applyDecorators(
    Confidential(),
    AuditAction('minor_data_access'),
    RequireConsent('educational_services', 'personalization'),
    AgeRestriction(13),
  );
