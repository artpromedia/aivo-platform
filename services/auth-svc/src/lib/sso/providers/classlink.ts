/**
 * ClassLink SSO Provider Configuration
 *
 * ClassLink uses OIDC for SSO authentication (LaunchPad).
 * This module provides ClassLink-specific configuration and helpers.
 *
 * ClassLink Documentation:
 * - https://developer.classlink.com/docs/
 * - https://developer.classlink.com/docs/oauth2
 *
 * CRITICAL: This addresses CRIT-002 - Missing ClassLink SSO Integration
 */

import type { OidcIdpConfig, UserRoleEnum } from '../types.js';

// ══════════════════════════════════════════════════════════════════════════════
// CLASSLINK OIDC CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

export const CLASSLINK_ISSUER = 'https://launchpad.classlink.com';
export const CLASSLINK_AUTHORIZATION_ENDPOINT = 'https://launchpad.classlink.com/oauth2/v2/auth';
export const CLASSLINK_TOKEN_ENDPOINT = 'https://launchpad.classlink.com/oauth2/v2/token';
export const CLASSLINK_USERINFO_ENDPOINT = 'https://nodeapi.classlink.com/v2/my/info';
export const CLASSLINK_JWKS_URI = 'https://launchpad.classlink.com/oauth2/v2/jwks';

/**
 * Standard ClassLink OIDC scopes
 */
export const CLASSLINK_SCOPES = [
  'openid',
  'profile',
  'email',
  'oneroster',  // OneRoster API access
] as const;

/**
 * ClassLink scopes for full data access
 */
export const CLASSLINK_EXTENDED_SCOPES = [
  ...CLASSLINK_SCOPES,
  'full',  // Full OneRoster data access
] as const;

// ══════════════════════════════════════════════════════════════════════════════
// CLASSLINK CLAIMS MAPPING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * ClassLink OIDC ID token claims
 * @see https://developer.classlink.com/docs/oauth2
 */
export interface ClassLinkIdTokenClaims {
  /** Unique ClassLink user ID */
  sub: string;

  /** User's email address */
  email?: string;

  /** User's full name */
  name?: string;

  /** First name */
  given_name?: string;

  /** Last name */
  family_name?: string;

  /** ClassLink role: 'student', 'teacher', 'aide', 'administrator', 'parent' */
  role?: string;

  /** Tenant/District ID in ClassLink */
  tenant_id?: string;

  /** Source system ID */
  sourcedId?: string;

  /** Token issue time */
  iat: number;

  /** Token expiration */
  exp: number;

  /** Audience (client ID) */
  aud: string;

  /** Issuer */
  iss: string;
}

/**
 * Default claims mapping for ClassLink OIDC
 */
export const CLASSLINK_CLAIMS_MAPPING = {
  /** ClassLink uses 'sub' for the unique user ID */
  externalIdClaim: 'sub',

  /** Email claim */
  emailClaim: 'email',

  /** Full name claim */
  nameClaim: 'name',

  /** First name */
  firstNameClaim: 'given_name',

  /** Last name */
  lastNameClaim: 'family_name',

  /** ClassLink uses 'role' claim */
  roleClaim: 'role',
};

/**
 * Default role mapping from ClassLink roles to AIVO roles
 */
export const CLASSLINK_ROLE_MAPPING: Record<string, UserRoleEnum> = {
  /** ClassLink students map to LEARNER */
  student: 'LEARNER',

  /** ClassLink teachers map to TEACHER */
  teacher: 'TEACHER',

  /** ClassLink aides map to TEACHER (assistant) */
  aide: 'TEACHER',

  /** ClassLink administrators map to DISTRICT_ADMIN */
  administrator: 'DISTRICT_ADMIN',

  /** ClassLink parents map to PARENT */
  parent: 'PARENT',

  /** Guardian variation */
  guardian: 'PARENT',
};

// ══════════════════════════════════════════════════════════════════════════════
// CLASSLINK CONFIGURATION HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a ClassLink OIDC IdP configuration for a tenant.
 *
 * @param tenantId - The AIVO tenant UUID
 * @param clientId - ClassLink application client ID
 * @param clientSecretRef - Reference to the client secret in KMS/Vault
 * @param options - Additional configuration options
 */
export function createClassLinkIdpConfig(
  tenantId: string,
  clientId: string,
  clientSecretRef: string,
  options: {
    name?: string;
    autoProvisionUsers?: boolean;
    defaultRole?: UserRoleEnum;
    allowedUserTypes?: UserRoleEnum[];
    loginHintTemplate?: string;
    customRoleMapping?: Record<string, UserRoleEnum>;
    customScopes?: string[];
    tenantCode?: string;  // ClassLink tenant code for multi-tenant apps
  } = {}
): Omit<OidcIdpConfig, 'id'> {
  return {
    tenantId,
    protocol: 'OIDC',
    name: options.name ?? 'ClassLink SSO',
    issuer: CLASSLINK_ISSUER,
    enabled: true,

    // OIDC endpoints
    clientId,
    clientSecretRef,
    authorizationEndpoint: CLASSLINK_AUTHORIZATION_ENDPOINT,
    tokenEndpoint: CLASSLINK_TOKEN_ENDPOINT,
    userinfoEndpoint: CLASSLINK_USERINFO_ENDPOINT,
    jwksUri: CLASSLINK_JWKS_URI,
    scopes: options.customScopes ?? [...CLASSLINK_SCOPES],

    // Claims mapping (ClassLink-specific)
    ...CLASSLINK_CLAIMS_MAPPING,

    // Role mapping
    roleMapping: options.customRoleMapping ?? CLASSLINK_ROLE_MAPPING,

    // Auto-provisioning
    autoProvisionUsers: options.autoProvisionUsers ?? true,
    defaultRole: options.defaultRole ?? 'TEACHER',
    loginHintTemplate: options.loginHintTemplate ?? null,
    allowedUserTypes: options.allowedUserTypes ?? [
      'LEARNER',
      'TEACHER',
      'PARENT',
      'DISTRICT_ADMIN',
    ],
  };
}

/**
 * Validate ClassLink-specific configuration
 */
export function validateClassLinkConfig(config: Partial<OidcIdpConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.clientId) {
    errors.push('ClassLink Client ID is required');
  }

  if (!config.clientSecretRef) {
    errors.push('ClassLink Client Secret reference is required');
  }

  if (config.issuer && !config.issuer.includes('classlink.com')) {
    errors.push('Invalid ClassLink issuer. Must be a ClassLink domain.');
  }

  // Validate scopes include required ones
  if (config.scopes) {
    const requiredScopes = ['openid'];
    for (const scope of requiredScopes) {
      if (!config.scopes.includes(scope)) {
        errors.push(`Missing required scope: ${scope}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// CLASSLINK USER TYPE HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Known ClassLink user roles
 */
export const CLASSLINK_USER_ROLES = [
  'student',
  'teacher',
  'aide',
  'administrator',
  'parent',
  'guardian',
] as const;

export type ClassLinkUserRole = (typeof CLASSLINK_USER_ROLES)[number];

/**
 * Check if a role is a known ClassLink role
 */
export function isValidClassLinkRole(role: string): role is ClassLinkUserRole {
  return CLASSLINK_USER_ROLES.includes(role as ClassLinkUserRole);
}

/**
 * Map ClassLink role to AIVO role with custom mapping support
 */
export function mapClassLinkRoleToAivo(
  classLinkRole: string,
  customMapping?: Record<string, UserRoleEnum>
): UserRoleEnum | null {
  const mapping = customMapping ?? CLASSLINK_ROLE_MAPPING;
  return mapping[classLinkRole.toLowerCase()] ?? null;
}

// ══════════════════════════════════════════════════════════════════════════════
// CLASSLINK SSO URL BUILDERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Build ClassLink authorization URL with all required parameters
 */
export function buildClassLinkAuthUrl(options: {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  tenantCode?: string;  // ClassLink tenant code for specific tenant
  loginHint?: string;
  scopes?: string[];
}): string {
  const url = new URL(CLASSLINK_AUTHORIZATION_ENDPOINT);

  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', options.clientId);
  url.searchParams.set('redirect_uri', options.redirectUri);
  url.searchParams.set('scope', (options.scopes ?? CLASSLINK_SCOPES).join(' '));
  url.searchParams.set('state', options.state);
  url.searchParams.set('nonce', options.nonce);

  // ClassLink-specific: tenant code for multi-tenant apps
  if (options.tenantCode) {
    url.searchParams.set('tenant_code', options.tenantCode);
  }

  // Login hint can pre-fill username/email
  if (options.loginHint) {
    url.searchParams.set('login_hint', options.loginHint);
  }

  return url.toString();
}

/**
 * Get ClassLink LaunchPad URL for a tenant (useful for linking users)
 */
export function getClassLinkLaunchPadUrl(tenantCode: string): string {
  return `https://launchpad.classlink.com/${tenantCode}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// CLASSLINK API HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * ClassLink OneRoster API base URL
 */
export const CLASSLINK_ONEROSTER_API = 'https://nodeapi.classlink.com';

/**
 * Fetch user info from ClassLink API
 * Note: This requires a valid access token from the OIDC flow
 */
export async function fetchClassLinkUserInfo(
  accessToken: string
): Promise<ClassLinkIdTokenClaims | null> {
  try {
    const response = await fetch(CLASSLINK_USERINFO_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`ClassLink userinfo failed: ${response.status}`);
      return null;
    }

    return (await response.json()) as ClassLinkIdTokenClaims;
  } catch (error) {
    console.error('ClassLink userinfo error:', error);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export const ClassLinkSso = {
  issuer: CLASSLINK_ISSUER,
  authorizationEndpoint: CLASSLINK_AUTHORIZATION_ENDPOINT,
  tokenEndpoint: CLASSLINK_TOKEN_ENDPOINT,
  userinfoEndpoint: CLASSLINK_USERINFO_ENDPOINT,
  jwksUri: CLASSLINK_JWKS_URI,
  scopes: CLASSLINK_SCOPES,
  extendedScopes: CLASSLINK_EXTENDED_SCOPES,
  claimsMapping: CLASSLINK_CLAIMS_MAPPING,
  roleMapping: CLASSLINK_ROLE_MAPPING,
  userRoles: CLASSLINK_USER_ROLES,
  createConfig: createClassLinkIdpConfig,
  validateConfig: validateClassLinkConfig,
  buildAuthUrl: buildClassLinkAuthUrl,
  mapRole: mapClassLinkRoleToAivo,
  isValidRole: isValidClassLinkRole,
  getLaunchPadUrl: getClassLinkLaunchPadUrl,
  fetchUserInfo: fetchClassLinkUserInfo,
  oneRosterApi: CLASSLINK_ONEROSTER_API,
};
