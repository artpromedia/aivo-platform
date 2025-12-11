/**
 * SSO Types for Identity Federation
 *
 * Common types shared between SAML and OIDC implementations.
 */

import type { IdpProtocol, UserRoleEnum } from '../../generated/prisma-client/index.js';

// ============================================================================
// SSO CONFIGURATION
// ============================================================================

export interface IdpConfigBase {
  id: string;
  tenantId: string;
  protocol: IdpProtocol;
  name: string;
  issuer: string;
  enabled: boolean;
  emailClaim: string;
  nameClaim: string;
  firstNameClaim: string;
  lastNameClaim: string;
  roleClaim: string;
  externalIdClaim: string;
  roleMapping: Record<string, UserRoleEnum>;
  autoProvisionUsers: boolean;
  defaultRole: UserRoleEnum;
  loginHintTemplate: string | null;
  allowedUserTypes: UserRoleEnum[];
}

export interface SamlIdpConfig extends IdpConfigBase {
  protocol: 'SAML';
  ssoUrl: string;
  sloUrl: string | null;
  x509Certificate: string;
  metadataXml: string | null;
}

export interface OidcIdpConfig extends IdpConfigBase {
  protocol: 'OIDC';
  clientId: string;
  clientSecretRef: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint: string | null;
  jwksUri: string;
  scopes: string[];
}

export type IdpConfig = SamlIdpConfig | OidcIdpConfig;

// ============================================================================
// SSO FLOW STATE
// ============================================================================

export interface SsoState {
  tenantId: string;
  idpConfigId: string;
  protocol: IdpProtocol;
  nonce: string;
  redirectUri: string;
  initiatedAt: number;
  loginHint?: string;
  clientType: 'web' | 'mobile';
}

// ============================================================================
// SSO ASSERTION / TOKEN CLAIMS
// ============================================================================

export interface SsoUserClaims {
  /** External ID from IdP (SAML NameID or OIDC sub) */
  externalId: string;
  /** User's email address */
  email: string;
  /** Full name (if available) */
  name?: string;
  /** First name (if available) */
  firstName?: string;
  /** Last name (if available) */
  lastName?: string;
  /** Roles from IdP (raw values before mapping) */
  rawRoles: string[];
  /** Additional claims from IdP */
  additionalClaims?: Record<string, unknown>;
}

export interface MappedSsoUser {
  externalId: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  /** Mapped Aivo roles */
  roles: UserRoleEnum[];
}

// ============================================================================
// SSO RESULT
// ============================================================================

export interface SsoSuccessResult {
  success: true;
  user: MappedSsoUser;
  idpConfigId: string;
  tenantId: string;
  sessionIndex?: string; // For SAML SLO
}

export interface SsoErrorResult {
  success: false;
  error: SsoErrorCode;
  message: string;
  idpConfigId?: string;
  tenantId?: string;
}

export type SsoResult = SsoSuccessResult | SsoErrorResult;

export type SsoErrorCode =
  | 'IDP_NOT_FOUND'
  | 'IDP_DISABLED'
  | 'INVALID_STATE'
  | 'STATE_EXPIRED'
  | 'INVALID_SIGNATURE'
  | 'INVALID_ISSUER'
  | 'INVALID_AUDIENCE'
  | 'ASSERTION_EXPIRED'
  | 'TOKEN_EXPIRED'
  | 'INVALID_TOKEN'
  | 'MISSING_CLAIMS'
  | 'USER_NOT_ALLOWED'
  | 'USER_NOT_FOUND'
  | 'PROVISION_DISABLED'
  | 'PROVISION_FAILED'
  | 'UNKNOWN_ERROR';

// ============================================================================
// SSO ATTEMPT LOG
// ============================================================================

export interface SsoAttemptLog {
  idpConfigId: string;
  tenantId: string;
  userIdentifier: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  userId: string | null;
  errorCode: SsoErrorCode | null;
  errorMessage: string | null;
  completedAt: Date | null;
}

// ============================================================================
// SERVICE PROVIDER METADATA
// ============================================================================

export interface SpMetadata {
  entityId: string;
  acsUrl: string;
  sloUrl?: string;
  certificate?: string;
}

// ============================================================================
// CALLBACK URLS
// ============================================================================

export function getSamlAcsUrl(baseUrl: string, tenantSlug: string): string {
  return `${baseUrl}/auth/saml/acs/${tenantSlug}`;
}

export function getOidcCallbackUrl(baseUrl: string, tenantSlug: string): string {
  return `${baseUrl}/auth/oidc/callback/${tenantSlug}`;
}

export function getSsoInitiateUrl(baseUrl: string, tenantSlug: string): string {
  return `${baseUrl}/auth/sso/${tenantSlug}`;
}
