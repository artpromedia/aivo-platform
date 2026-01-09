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

// Google Workspace for Education SSO (RE-AUDIT-001)
export {
  GoogleSso,
  GOOGLE_ISSUER,
  GOOGLE_AUTHORIZATION_ENDPOINT,
  GOOGLE_TOKEN_ENDPOINT,
  GOOGLE_USERINFO_ENDPOINT,
  GOOGLE_JWKS_URI,
  GOOGLE_SCOPES,
  GOOGLE_CLASSROOM_SCOPES,
  GOOGLE_ADMIN_SCOPES,
  GOOGLE_CLAIMS_MAPPING,
  GOOGLE_ROLE_MAPPING,
  createGoogleIdpConfig,
  validateGoogleConfig,
  buildGoogleAuthUrl,
  extractHostedDomain,
  isAllowedHostedDomain,
  inferRoleFromEmail,
  getGoogleAdminConsoleUrl,
  getGoogleClassroomUrl,
  type GoogleIdTokenClaims,
} from './google.js';

// Microsoft Entra ID (Azure AD) SSO (RE-AUDIT-001)
export {
  MicrosoftSso,
  MICROSOFT_ISSUER_PATTERN,
  MICROSOFT_ISSUER_COMMON,
  MICROSOFT_ISSUER_ORGANIZATIONS,
  MICROSOFT_AUTHORIZATION_ENDPOINT_PATTERN,
  MICROSOFT_TOKEN_ENDPOINT_PATTERN,
  MICROSOFT_USERINFO_ENDPOINT,
  MICROSOFT_JWKS_URI_PATTERN,
  MICROSOFT_GRAPH_API,
  MICROSOFT_SCOPES,
  MICROSOFT_EDUCATION_SCOPES,
  MICROSOFT_TEAMS_SCOPES,
  MICROSOFT_CLAIMS_MAPPING,
  MICROSOFT_ROLE_MAPPING,
  MICROSOFT_DIRECTORY_ROLES,
  MICROSOFT_EDUCATION_USER_TYPES,
  getMicrosoftEndpoints,
  createMicrosoftIdpConfig,
  validateMicrosoftConfig,
  buildMicrosoftAuthUrl,
  mapMicrosoftRoleToAivo,
  extractTenantIdFromIssuer,
  inferRoleFromUpn,
  isValidMicrosoftEducationUserType,
  getMicrosoft365AdminUrl,
  getEntraIdPortalUrl,
  getMicrosoftTeamsUrl,
  type MicrosoftIdTokenClaims,
  type MicrosoftEducationUserType,
} from './microsoft.js';

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
import { createGoogleIdpConfig } from './google.js';
import { createMicrosoftIdpConfig } from './microsoft.js';

/**
 * Options for creating provider configurations
 */
export interface CreateProviderConfigOptions {
  name?: string;
  autoProvisionUsers?: boolean;
  defaultRole?: UserRoleEnum;
  allowedUserTypes?: UserRoleEnum[];
  /** Google-specific: Restrict login to these domains */
  hostedDomains?: string[];
  /** Google-specific: Include Classroom scopes */
  includeClassroomScopes?: boolean;
  /** Microsoft-specific: The Microsoft Entra tenant ID */
  microsoftTenantId?: string;
  /** Microsoft-specific: Use group claims for role mapping */
  useGroupClaims?: boolean;
  /** Microsoft-specific: Include education scopes */
  includeEducationScopes?: boolean;
  /** Microsoft-specific: Include Teams scopes */
  includeTeamsScopes?: boolean;
}

/**
 * Create IdP configuration for a known provider
 */
export function createProviderConfig(
  provider: SsoProviderType,
  tenantId: string,
  clientId: string,
  clientSecretRef: string,
  options?: CreateProviderConfigOptions
): Omit<OidcIdpConfig, 'id'> | null {
  switch (provider) {
    case 'CLEVER':
      return createCleverIdpConfig(tenantId, clientId, clientSecretRef, options);

    case 'CLASSLINK':
      return createClassLinkIdpConfig(tenantId, clientId, clientSecretRef, options);

    case 'GOOGLE':
      return createGoogleIdpConfig(tenantId, clientId, clientSecretRef, {
        name: options?.name,
        autoProvisionUsers: options?.autoProvisionUsers,
        defaultRole: options?.defaultRole,
        allowedUserTypes: options?.allowedUserTypes,
        hostedDomains: options?.hostedDomains,
        includeClassroomScopes: options?.includeClassroomScopes,
      });

    case 'MICROSOFT':
      if (!options?.microsoftTenantId) {
        console.warn('Microsoft SSO requires microsoftTenantId in options');
        return null;
      }
      return createMicrosoftIdpConfig(
        tenantId,
        clientId,
        clientSecretRef,
        options.microsoftTenantId,
        {
          name: options?.name,
          autoProvisionUsers: options?.autoProvisionUsers,
          defaultRole: options?.defaultRole,
          allowedUserTypes: options?.allowedUserTypes,
          useGroupClaims: options?.useGroupClaims,
          includeEducationScopes: options?.includeEducationScopes,
          includeTeamsScopes: options?.includeTeamsScopes,
        }
      );

    case 'GENERIC_OIDC':
    case 'GENERIC_SAML':
    default:
      // Generic providers require full manual configuration
      return null;
  }
}
