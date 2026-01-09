/**
 * Clever SSO Provider Configuration
 *
 * Clever uses OIDC for SSO authentication.
 * This module provides Clever-specific configuration and helpers.
 *
 * Clever Documentation:
 * - https://dev.clever.com/docs/oauth
 * - https://dev.clever.com/docs/sso-overview
 *
 * CRITICAL: This addresses CRIT-001 - Missing Clever SSO Integration
 */

import type { OidcIdpConfig, UserRoleEnum } from '../types.js';

// ══════════════════════════════════════════════════════════════════════════════
// CLEVER OIDC CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

export const CLEVER_ISSUER = 'https://clever.com';
export const CLEVER_AUTHORIZATION_ENDPOINT = 'https://clever.com/oauth/authorize';
export const CLEVER_TOKEN_ENDPOINT = 'https://clever.com/oauth/tokens';
export const CLEVER_USERINFO_ENDPOINT = 'https://api.clever.com/v3.0/me';
export const CLEVER_JWKS_URI = 'https://clever.com/oauth/jwks';

/**
 * Standard Clever OIDC scopes
 */
export const CLEVER_SCOPES = [
  'openid',
  'profile',
  'email',
] as const;

/**
 * Extended Clever scopes for full user information
 */
export const CLEVER_EXTENDED_SCOPES = [
  ...CLEVER_SCOPES,
  // These provide additional data access
] as const;

// ══════════════════════════════════════════════════════════════════════════════
// CLEVER CLAIMS MAPPING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Clever OIDC ID token claims
 * @see https://dev.clever.com/docs/identity-api
 */
export interface CleverIdTokenClaims {
  /** Unique Clever user ID */
  sub: string;

  /** User's email address */
  email?: string;

  /** User's full name */
  name?: string;

  /** First name */
  given_name?: string;

  /** Last name */
  family_name?: string;

  /** Clever user type: 'student', 'teacher', 'district_admin', 'school_admin', 'contact' */
  user_type?: string;

  /** District ID */
  district?: string;

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
 * Default claims mapping for Clever OIDC
 */
export const CLEVER_CLAIMS_MAPPING = {
  /** Clever uses 'sub' for the unique user ID */
  externalIdClaim: 'sub',

  /** Email claim */
  emailClaim: 'email',

  /** Full name claim */
  nameClaim: 'name',

  /** First name */
  firstNameClaim: 'given_name',

  /** Last name */
  lastNameClaim: 'family_name',

  /** Clever uses 'user_type' for role (not 'role') */
  roleClaim: 'user_type',
};

/**
 * Default role mapping from Clever user types to AIVO roles
 */
export const CLEVER_ROLE_MAPPING: Record<string, UserRoleEnum> = {
  /** Clever students map to LEARNER */
  student: 'LEARNER',

  /** Clever teachers map to TEACHER */
  teacher: 'TEACHER',

  /** Clever school admins map to TEACHER (can be changed to SCHOOL_ADMIN if available) */
  school_admin: 'TEACHER',

  /** Clever district admins map to DISTRICT_ADMIN */
  district_admin: 'DISTRICT_ADMIN',

  /** Clever contacts (parents) map to PARENT */
  contact: 'PARENT',
};

// ══════════════════════════════════════════════════════════════════════════════
// CLEVER CONFIGURATION HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a Clever OIDC IdP configuration for a tenant.
 *
 * @param tenantId - The tenant UUID
 * @param clientId - Clever application client ID (from Clever Dashboard)
 * @param clientSecretRef - Reference to the client secret in KMS/Vault
 * @param options - Additional configuration options
 */
export function createCleverIdpConfig(
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
  } = {}
): Omit<OidcIdpConfig, 'id'> {
  return {
    tenantId,
    protocol: 'OIDC',
    name: options.name ?? 'Clever SSO',
    issuer: CLEVER_ISSUER,
    enabled: true,

    // OIDC endpoints
    clientId,
    clientSecretRef,
    authorizationEndpoint: CLEVER_AUTHORIZATION_ENDPOINT,
    tokenEndpoint: CLEVER_TOKEN_ENDPOINT,
    userinfoEndpoint: CLEVER_USERINFO_ENDPOINT,
    jwksUri: CLEVER_JWKS_URI,
    scopes: options.customScopes ?? [...CLEVER_SCOPES],

    // Claims mapping (Clever-specific)
    ...CLEVER_CLAIMS_MAPPING,

    // Role mapping
    roleMapping: options.customRoleMapping ?? CLEVER_ROLE_MAPPING,

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
 * Validate Clever-specific configuration
 */
export function validateCleverConfig(config: Partial<OidcIdpConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.clientId) {
    errors.push('Clever Client ID is required');
  }

  if (!config.clientSecretRef) {
    errors.push('Clever Client Secret reference is required');
  }

  if (config.issuer && config.issuer !== CLEVER_ISSUER) {
    errors.push(`Invalid Clever issuer. Expected ${CLEVER_ISSUER}`);
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
// CLEVER USER TYPE HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Known Clever user types
 */
export const CLEVER_USER_TYPES = [
  'student',
  'teacher',
  'school_admin',
  'district_admin',
  'contact',
] as const;

export type CleverUserType = (typeof CLEVER_USER_TYPES)[number];

/**
 * Check if a user type is a known Clever user type
 */
export function isValidCleverUserType(userType: string): userType is CleverUserType {
  return CLEVER_USER_TYPES.includes(userType as CleverUserType);
}

/**
 * Map Clever user type to AIVO role with custom mapping support
 */
export function mapCleverRoleToAivo(
  cleverUserType: string,
  customMapping?: Record<string, UserRoleEnum>
): UserRoleEnum | null {
  const mapping = customMapping ?? CLEVER_ROLE_MAPPING;
  return mapping[cleverUserType] ?? null;
}

// ══════════════════════════════════════════════════════════════════════════════
// CLEVER SSO URL BUILDERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Build Clever authorization URL with all required parameters
 */
export function buildCleverAuthUrl(options: {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  districtId?: string;
  loginHint?: string;
  scopes?: string[];
}): string {
  const url = new URL(CLEVER_AUTHORIZATION_ENDPOINT);

  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', options.clientId);
  url.searchParams.set('redirect_uri', options.redirectUri);
  url.searchParams.set('scope', (options.scopes ?? CLEVER_SCOPES).join(' '));
  url.searchParams.set('state', options.state);
  url.searchParams.set('nonce', options.nonce);

  // Clever-specific: district_id pre-selects the district in the login flow
  if (options.districtId) {
    url.searchParams.set('district_id', options.districtId);
  }

  // Login hint can pre-fill email
  if (options.loginHint) {
    url.searchParams.set('login_hint', options.loginHint);
  }

  return url.toString();
}

/**
 * Get Clever portal URL for a district (useful for linking users to Clever)
 */
export function getCleverPortalUrl(districtId: string): string {
  return `https://clever.com/in/${districtId}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export const CleverSso = {
  issuer: CLEVER_ISSUER,
  authorizationEndpoint: CLEVER_AUTHORIZATION_ENDPOINT,
  tokenEndpoint: CLEVER_TOKEN_ENDPOINT,
  userinfoEndpoint: CLEVER_USERINFO_ENDPOINT,
  jwksUri: CLEVER_JWKS_URI,
  scopes: CLEVER_SCOPES,
  extendedScopes: CLEVER_EXTENDED_SCOPES,
  claimsMapping: CLEVER_CLAIMS_MAPPING,
  roleMapping: CLEVER_ROLE_MAPPING,
  userTypes: CLEVER_USER_TYPES,
  createConfig: createCleverIdpConfig,
  validateConfig: validateCleverConfig,
  buildAuthUrl: buildCleverAuthUrl,
  mapRole: mapCleverRoleToAivo,
  isValidUserType: isValidCleverUserType,
  getPortalUrl: getCleverPortalUrl,
};
