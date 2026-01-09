/**
 * SSO Provider Configurations
 *
 * This module exports pre-configured SSO providers for common
 * K-12 education identity providers.
 *
 * Supported providers:
 * - Clever (OIDC) - Most common in US K-12
 * - ClassLink (OIDC) - Major player in education SSO
 *
 * Each provider module includes:
 * - Endpoint constants
 * - Claims mapping
 * - Role mapping
 * - Configuration helpers
 * - Validation utilities
 */

// Clever SSO (CRIT-001)
export {
  CleverSso,
  CLEVER_ISSUER,
  CLEVER_AUTHORIZATION_ENDPOINT,
  CLEVER_TOKEN_ENDPOINT,
  CLEVER_USERINFO_ENDPOINT,
  CLEVER_JWKS_URI,
  CLEVER_SCOPES,
  CLEVER_CLAIMS_MAPPING,
  CLEVER_ROLE_MAPPING,
  CLEVER_USER_TYPES,
  createCleverIdpConfig,
  validateCleverConfig,
  buildCleverAuthUrl,
  mapCleverRoleToAivo,
  isValidCleverUserType,
  getCleverPortalUrl,
  type CleverIdTokenClaims,
  type CleverUserType,
} from './clever.js';

// ClassLink SSO (CRIT-002)
export {
  ClassLinkSso,
  CLASSLINK_ISSUER,
  CLASSLINK_AUTHORIZATION_ENDPOINT,
  CLASSLINK_TOKEN_ENDPOINT,
  CLASSLINK_USERINFO_ENDPOINT,
  CLASSLINK_JWKS_URI,
  CLASSLINK_SCOPES,
  CLASSLINK_CLAIMS_MAPPING,
  CLASSLINK_ROLE_MAPPING,
  CLASSLINK_USER_ROLES,
  createClassLinkIdpConfig,
  validateClassLinkConfig,
  buildClassLinkAuthUrl,
  mapClassLinkRoleToAivo,
  isValidClassLinkRole,
  getClassLinkLaunchPadUrl,
  fetchClassLinkUserInfo,
  type ClassLinkIdTokenClaims,
  type ClassLinkUserRole,
} from './classlink.js';

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDER DETECTION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Known SSO provider types
 */
export type SsoProviderType = 'CLEVER' | 'CLASSLINK' | 'GOOGLE' | 'MICROSOFT' | 'GENERIC_OIDC' | 'GENERIC_SAML';

/**
 * Detect SSO provider type from issuer URL
 */
export function detectProviderFromIssuer(issuer: string): SsoProviderType {
  const normalizedIssuer = issuer.toLowerCase();

  if (normalizedIssuer.includes('clever.com')) {
    return 'CLEVER';
  }

  if (normalizedIssuer.includes('classlink.com')) {
    return 'CLASSLINK';
  }

  if (normalizedIssuer.includes('google.com') || normalizedIssuer.includes('googleapis.com')) {
    return 'GOOGLE';
  }

  if (normalizedIssuer.includes('microsoft.com') || normalizedIssuer.includes('microsoftonline.com')) {
    return 'MICROSOFT';
  }

  return 'GENERIC_OIDC';
}

/**
 * Get display name for a provider type
 */
export function getProviderDisplayName(providerType: SsoProviderType): string {
  const names: Record<SsoProviderType, string> = {
    CLEVER: 'Clever',
    CLASSLINK: 'ClassLink',
    GOOGLE: 'Google Workspace',
    MICROSOFT: 'Microsoft Entra',
    GENERIC_OIDC: 'OIDC',
    GENERIC_SAML: 'SAML 2.0',
  };
  return names[providerType];
}

/**
 * Get provider icon/logo URL (for UI display)
 */
export function getProviderLogoUrl(providerType: SsoProviderType): string {
  const logos: Record<SsoProviderType, string> = {
    CLEVER: '/assets/sso/clever-logo.svg',
    CLASSLINK: '/assets/sso/classlink-logo.svg',
    GOOGLE: '/assets/sso/google-logo.svg',
    MICROSOFT: '/assets/sso/microsoft-logo.svg',
    GENERIC_OIDC: '/assets/sso/oidc-logo.svg',
    GENERIC_SAML: '/assets/sso/saml-logo.svg',
  };
  return logos[providerType];
}

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDER CONFIGURATION FACTORY
// ══════════════════════════════════════════════════════════════════════════════

import type { OidcIdpConfig, UserRoleEnum } from '../types.js';
import { createCleverIdpConfig } from './clever.js';
import { createClassLinkIdpConfig } from './classlink.js';

/**
 * Create IdP configuration for a known provider
 */
export function createProviderConfig(
  provider: SsoProviderType,
  tenantId: string,
  clientId: string,
  clientSecretRef: string,
  options?: {
    name?: string;
    autoProvisionUsers?: boolean;
    defaultRole?: UserRoleEnum;
    allowedUserTypes?: UserRoleEnum[];
  }
): Omit<OidcIdpConfig, 'id'> | null {
  switch (provider) {
    case 'CLEVER':
      return createCleverIdpConfig(tenantId, clientId, clientSecretRef, options);

    case 'CLASSLINK':
      return createClassLinkIdpConfig(tenantId, clientId, clientSecretRef, options);

    // Other providers can be added here
    case 'GOOGLE':
    case 'MICROSOFT':
    case 'GENERIC_OIDC':
    case 'GENERIC_SAML':
    default:
      // Not implemented yet - return null
      return null;
  }
}
