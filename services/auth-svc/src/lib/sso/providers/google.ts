/**
 * Google Workspace for Education SSO Provider Configuration
 *
 * Google uses OIDC for SSO authentication.
 * This module provides Google-specific configuration and helpers.
 *
 * Google Documentation:
 * - https://developers.google.com/identity/protocols/oauth2/openid-connect
 * - https://developers.google.com/identity/openid-connect/openid-connect
 *
 * CRITICAL: This addresses RE-AUDIT-001 - Missing Google SSO Integration
 * Required for districts using Google Workspace for Education
 */

import type { OidcIdpConfig, UserRoleEnum } from '../types.js';

// ══════════════════════════════════════════════════════════════════════════════
// GOOGLE OIDC CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

export const GOOGLE_ISSUER = 'https://accounts.google.com';
export const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
export const GOOGLE_USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';
export const GOOGLE_JWKS_URI = 'https://www.googleapis.com/oauth2/v3/certs';
export const GOOGLE_REVOCATION_ENDPOINT = 'https://oauth2.googleapis.com/revoke';

/**
 * Standard Google OIDC scopes for education
 */
export const GOOGLE_SCOPES = [
  'openid',
  'profile',
  'email',
] as const;

/**
 * Extended Google scopes for Classroom integration
 */
export const GOOGLE_CLASSROOM_SCOPES = [
  ...GOOGLE_SCOPES,
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.profile.emails',
] as const;

/**
 * Admin scopes for district administrators
 */
export const GOOGLE_ADMIN_SCOPES = [
  ...GOOGLE_SCOPES,
  'https://www.googleapis.com/auth/admin.directory.user.readonly',
  'https://www.googleapis.com/auth/admin.directory.group.readonly',
] as const;

// ══════════════════════════════════════════════════════════════════════════════
// GOOGLE CLAIMS MAPPING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Google OIDC ID token claims
 * @see https://developers.google.com/identity/protocols/oauth2/openid-connect#obtainuserinfo
 */
export interface GoogleIdTokenClaims {
  /** Unique Google user ID (persistent across sessions) */
  sub: string;

  /** User's email address */
  email: string;

  /** Whether email is verified */
  email_verified: boolean;

  /** User's full name */
  name?: string;

  /** First name */
  given_name?: string;

  /** Last name */
  family_name?: string;

  /** Profile picture URL */
  picture?: string;

  /** Locale preference */
  locale?: string;

  /** Hosted domain (for Google Workspace) - e.g., 'school.edu' */
  hd?: string;

  /** Token issue time */
  iat: number;

  /** Token expiration */
  exp: number;

  /** Audience (client ID) */
  aud: string;

  /** Issuer */
  iss: string;

  /** Authorized presenter (azp) */
  azp?: string;

  /** Authentication time */
  auth_time?: number;

  /** Nonce for replay protection */
  nonce?: string;
}

/**
 * Default claims mapping for Google OIDC
 */
export const GOOGLE_CLAIMS_MAPPING = {
  /** Google uses 'sub' for the unique user ID */
  externalIdClaim: 'sub',

  /** Email claim */
  emailClaim: 'email',

  /** Full name claim */
  nameClaim: 'name',

  /** First name */
  firstNameClaim: 'given_name',

  /** Last name */
  lastNameClaim: 'family_name',

  /**
   * Google doesn't provide a role claim directly.
   * Role mapping is typically done via:
   * 1. Hosted domain (hd) - identifies the organization
   * 2. Google Groups membership (requires Admin SDK)
   * 3. Custom attributes in Google Workspace
   * 4. AIVO tenant configuration
   *
   * By default, we use 'hd' and require tenant-level role configuration.
   */
  roleClaim: 'hd',
};

/**
 * Default role mapping from Google Workspace organizational attributes
 * Note: Google doesn't have built-in education roles like Clever/ClassLink.
 * Role determination is typically done via:
 * 1. Organizational Unit (OU) in Google Workspace
 * 2. Google Groups membership
 * 3. Custom user attributes
 * 4. Email domain patterns
 */
export const GOOGLE_ROLE_MAPPING: Record<string, UserRoleEnum> = {
  /** Default role for authenticated Google users */
  default: 'TEACHER',

  /** Role patterns based on email or group conventions */
  student: 'LEARNER',
  students: 'LEARNER',
  learner: 'LEARNER',
  learners: 'LEARNER',
  pupil: 'LEARNER',
  pupils: 'LEARNER',

  teacher: 'TEACHER',
  teachers: 'TEACHER',
  staff: 'TEACHER',
  faculty: 'TEACHER',
  educator: 'TEACHER',
  educators: 'TEACHER',

  parent: 'PARENT',
  parents: 'PARENT',
  guardian: 'PARENT',
  guardians: 'PARENT',
  family: 'PARENT',

  admin: 'DISTRICT_ADMIN',
  administrator: 'DISTRICT_ADMIN',
  administrators: 'DISTRICT_ADMIN',
  'district-admin': 'DISTRICT_ADMIN',
  'school-admin': 'DISTRICT_ADMIN',
};

// ══════════════════════════════════════════════════════════════════════════════
// GOOGLE CONFIGURATION HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a Google Workspace OIDC IdP configuration for a tenant.
 *
 * @param tenantId - The AIVO tenant UUID
 * @param clientId - Google OAuth 2.0 client ID (from Google Cloud Console)
 * @param clientSecretRef - Reference to the client secret in KMS/Vault
 * @param options - Additional configuration options
 */
export function createGoogleIdpConfig(
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
    /**
     * Restrict login to specific hosted domain(s).
     * Essential for Google Workspace for Education.
     * Example: ['school.edu', 'district.k12.ca.us']
     */
    hostedDomains?: string[];
    /**
     * Google Workspace organizational unit path for role mapping.
     * Example: '/Students', '/Staff/Teachers'
     */
    orgUnitPath?: string;
    /**
     * Include Classroom scopes for Google Classroom integration
     */
    includeClassroomScopes?: boolean;
  } = {}
): Omit<OidcIdpConfig, 'id'> {
  // Determine scopes based on options
  let scopes: string[] = [...GOOGLE_SCOPES];
  if (options.customScopes) {
    scopes = options.customScopes;
  } else if (options.includeClassroomScopes) {
    scopes = [...GOOGLE_CLASSROOM_SCOPES];
  }

  return {
    tenantId,
    protocol: 'OIDC',
    name: options.name ?? 'Google Workspace SSO',
    issuer: GOOGLE_ISSUER,
    enabled: true,

    // OIDC endpoints
    clientId,
    clientSecretRef,
    authorizationEndpoint: GOOGLE_AUTHORIZATION_ENDPOINT,
    tokenEndpoint: GOOGLE_TOKEN_ENDPOINT,
    userinfoEndpoint: GOOGLE_USERINFO_ENDPOINT,
    jwksUri: GOOGLE_JWKS_URI,
    scopes,

    // Claims mapping (Google-specific)
    ...GOOGLE_CLAIMS_MAPPING,

    // Role mapping
    roleMapping: options.customRoleMapping ?? GOOGLE_ROLE_MAPPING,

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
 * Validate Google-specific configuration
 */
export function validateGoogleConfig(config: Partial<OidcIdpConfig>): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config.clientId) {
    errors.push('Google Client ID is required');
  }

  if (!config.clientSecretRef) {
    errors.push('Google Client Secret reference is required');
  }

  if (config.issuer && config.issuer !== GOOGLE_ISSUER) {
    errors.push(`Invalid Google issuer. Expected ${GOOGLE_ISSUER}`);
  }

  // Validate scopes include required ones
  if (config.scopes) {
    const requiredScopes = ['openid', 'email'];
    for (const scope of requiredScopes) {
      if (!config.scopes.includes(scope)) {
        errors.push(`Missing required scope: ${scope}`);
      }
    }
  }

  // Warnings for education deployments
  if (!config.scopes?.some((s) => s.includes('classroom'))) {
    warnings.push(
      'Consider adding Google Classroom scopes for full education integration'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// GOOGLE WORKSPACE HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Extract hosted domain from email address
 */
export function extractHostedDomain(email: string): string | null {
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : null;
}

/**
 * Check if email belongs to an allowed hosted domain
 */
export function isAllowedHostedDomain(
  email: string,
  allowedDomains: string[]
): boolean {
  const domain = extractHostedDomain(email);
  if (!domain) return false;
  return allowedDomains.some(
    (allowed) => domain === allowed.toLowerCase()
  );
}

/**
 * Determine role from email pattern
 * Common patterns in Google Workspace for Education:
 * - Students: studentid@school.edu or firstname.lastname.grad2025@school.edu
 * - Teachers: firstname.lastname@school.edu
 * - Parents: Often on a different subdomain or with specific prefix
 */
export function inferRoleFromEmail(
  email: string,
  patterns: {
    studentPatterns?: RegExp[];
    teacherPatterns?: RegExp[];
    parentPatterns?: RegExp[];
    adminPatterns?: RegExp[];
  } = {}
): UserRoleEnum | null {
  const normalizedEmail = email.toLowerCase();

  // Default patterns commonly used in K-12
  const defaultStudentPatterns = [
    /^\d+@/,                           // Numeric ID prefix
    /\.grad\d{4}@/,                    // .grad2025@ pattern
    /^student\./,                       // student. prefix
    /@students?\./,                     // @student. or @students. subdomain
  ];

  const defaultAdminPatterns = [
    /^admin@/,
    /^administrator@/,
    /^superintendent@/,
    /^principal@/,
    /^it[-.]?admin@/,
  ];

  const defaultParentPatterns = [
    /@parents?\./,                      // @parent. or @parents. subdomain
    /^guardian\./,                      // guardian. prefix
    /^parent\./,                        // parent. prefix
  ];

  // Check admin patterns first (most specific)
  const adminPatterns = patterns.adminPatterns ?? defaultAdminPatterns;
  if (adminPatterns.some((p) => p.test(normalizedEmail))) {
    return 'DISTRICT_ADMIN';
  }

  // Check student patterns
  const studentPatterns = patterns.studentPatterns ?? defaultStudentPatterns;
  if (studentPatterns.some((p) => p.test(normalizedEmail))) {
    return 'LEARNER';
  }

  // Check parent patterns
  const parentPatterns = patterns.parentPatterns ?? defaultParentPatterns;
  if (parentPatterns.some((p) => p.test(normalizedEmail))) {
    return 'PARENT';
  }

  // Check teacher patterns
  if (patterns.teacherPatterns) {
    if (patterns.teacherPatterns.some((p) => p.test(normalizedEmail))) {
      return 'TEACHER';
    }
  }

  // No pattern matched - return null to use default
  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// GOOGLE SSO URL BUILDERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Build Google authorization URL with all required parameters
 */
export function buildGoogleAuthUrl(options: {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
  hostedDomain?: string;
  loginHint?: string;
  scopes?: string[];
  prompt?: 'none' | 'consent' | 'select_account';
  accessType?: 'online' | 'offline';
  includeGrantedScopes?: boolean;
}): string {
  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);

  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', options.clientId);
  url.searchParams.set('redirect_uri', options.redirectUri);
  url.searchParams.set('scope', (options.scopes ?? GOOGLE_SCOPES).join(' '));
  url.searchParams.set('state', options.state);
  url.searchParams.set('nonce', options.nonce);

  // PKCE support (recommended for mobile and SPA)
  if (options.codeChallenge) {
    url.searchParams.set('code_challenge', options.codeChallenge);
    url.searchParams.set(
      'code_challenge_method',
      options.codeChallengeMethod ?? 'S256'
    );
  }

  // Hosted domain restriction (critical for education)
  if (options.hostedDomain) {
    url.searchParams.set('hd', options.hostedDomain);
  }

  // Login hint pre-fills email
  if (options.loginHint) {
    url.searchParams.set('login_hint', options.loginHint);
  }

  // Prompt behavior
  if (options.prompt) {
    url.searchParams.set('prompt', options.prompt);
  }

  // Access type for refresh tokens
  if (options.accessType) {
    url.searchParams.set('access_type', options.accessType);
  }

  // Include previously granted scopes
  if (options.includeGrantedScopes) {
    url.searchParams.set('include_granted_scopes', 'true');
  }

  return url.toString();
}

/**
 * Get Google Workspace admin console URL
 */
export function getGoogleAdminConsoleUrl(domain: string): string {
  return `https://admin.google.com/u/0/ac/domains/details/${domain}`;
}

/**
 * Get Google Classroom URL
 */
export function getGoogleClassroomUrl(): string {
  return 'https://classroom.google.com';
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export const GoogleSso = {
  issuer: GOOGLE_ISSUER,
  authorizationEndpoint: GOOGLE_AUTHORIZATION_ENDPOINT,
  tokenEndpoint: GOOGLE_TOKEN_ENDPOINT,
  userinfoEndpoint: GOOGLE_USERINFO_ENDPOINT,
  jwksUri: GOOGLE_JWKS_URI,
  revocationEndpoint: GOOGLE_REVOCATION_ENDPOINT,
  scopes: GOOGLE_SCOPES,
  classroomScopes: GOOGLE_CLASSROOM_SCOPES,
  adminScopes: GOOGLE_ADMIN_SCOPES,
  claimsMapping: GOOGLE_CLAIMS_MAPPING,
  roleMapping: GOOGLE_ROLE_MAPPING,
  createConfig: createGoogleIdpConfig,
  validateConfig: validateGoogleConfig,
  buildAuthUrl: buildGoogleAuthUrl,
  extractHostedDomain,
  isAllowedHostedDomain,
  inferRoleFromEmail,
  getAdminConsoleUrl: getGoogleAdminConsoleUrl,
  getClassroomUrl: getGoogleClassroomUrl,
};
