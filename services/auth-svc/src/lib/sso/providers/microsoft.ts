/**
 * Microsoft Entra ID (Azure AD) SSO Provider Configuration
 *
 * Microsoft uses OIDC for SSO authentication via Microsoft Entra ID
 * (formerly Azure Active Directory).
 * This module provides Microsoft-specific configuration and helpers.
 *
 * Microsoft Documentation:
 * - https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc
 * - https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference
 *
 * CRITICAL: This addresses RE-AUDIT-001 - Missing Microsoft SSO Integration
 * Required for districts using Microsoft 365 for Education
 */

import type { OidcIdpConfig, UserRoleEnum } from '../types.js';

// ══════════════════════════════════════════════════════════════════════════════
// MICROSOFT ENTRA ID OIDC CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Microsoft Entra ID issuer URL pattern
 * Note: The actual issuer contains the tenant ID
 */
export const MICROSOFT_ISSUER_PATTERN = 'https://login.microsoftonline.com/{tenantId}/v2.0';
export const MICROSOFT_ISSUER_COMMON = 'https://login.microsoftonline.com/common/v2.0';
export const MICROSOFT_ISSUER_ORGANIZATIONS = 'https://login.microsoftonline.com/organizations/v2.0';

/**
 * Authorization endpoint patterns
 */
export const MICROSOFT_AUTHORIZATION_ENDPOINT_PATTERN =
  'https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/authorize';
export const MICROSOFT_AUTHORIZATION_ENDPOINT_COMMON =
  'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';

/**
 * Token endpoint patterns
 */
export const MICROSOFT_TOKEN_ENDPOINT_PATTERN =
  'https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token';
export const MICROSOFT_TOKEN_ENDPOINT_COMMON =
  'https://login.microsoftonline.com/common/oauth2/v2.0/token';

/**
 * UserInfo and JWKS endpoints
 */
export const MICROSOFT_USERINFO_ENDPOINT = 'https://graph.microsoft.com/oidc/userinfo';
export const MICROSOFT_JWKS_URI_PATTERN =
  'https://login.microsoftonline.com/{tenantId}/discovery/v2.0/keys';
export const MICROSOFT_JWKS_URI_COMMON =
  'https://login.microsoftonline.com/common/discovery/v2.0/keys';

/**
 * Microsoft Graph API base URL
 */
export const MICROSOFT_GRAPH_API = 'https://graph.microsoft.com/v1.0';

/**
 * Standard Microsoft OIDC scopes
 */
export const MICROSOFT_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access', // For refresh tokens
] as const;

/**
 * Extended Microsoft scopes for education
 */
export const MICROSOFT_EDUCATION_SCOPES = [
  ...MICROSOFT_SCOPES,
  'User.Read',                              // Basic profile
  'EduRoster.Read',                         // Education roster data
  'EduAssignments.Read',                    // Assignments data
] as const;

/**
 * Microsoft Teams for Education scopes
 */
export const MICROSOFT_TEAMS_SCOPES = [
  ...MICROSOFT_SCOPES,
  'User.Read',
  'Team.ReadBasic.All',
  'TeamMember.Read.All',
  'Channel.ReadBasic.All',
] as const;

// ══════════════════════════════════════════════════════════════════════════════
// MICROSOFT CLAIMS MAPPING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Microsoft Entra ID OIDC ID token claims
 * @see https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference
 */
export interface MicrosoftIdTokenClaims {
  /** Unique object ID for the user in Entra ID */
  oid: string;

  /** Subject identifier (unique, pairwise for public clients) */
  sub: string;

  /** User's email address */
  email?: string;

  /** User's preferred username (often email or UPN) */
  preferred_username?: string;

  /** User's full name */
  name?: string;

  /** Given/first name */
  given_name?: string;

  /** Family/last name */
  family_name?: string;

  /** Tenant ID (Entra ID directory) */
  tid: string;

  /** User Principal Name (UPN) - often email format */
  upn?: string;

  /** Unique name (for compatibility) */
  unique_name?: string;

  /** Groups the user belongs to (if configured) */
  groups?: string[];

  /** Roles assigned to the user (from app registration) */
  roles?: string[];

  /** Web/wids - directory role template IDs */
  wids?: string[];

  /** Token issue time */
  iat: number;

  /** Token expiration */
  exp: number;

  /** Not before time */
  nbf: number;

  /** Audience (client ID) */
  aud: string;

  /** Issuer */
  iss: string;

  /** Authentication time */
  auth_time?: number;

  /** Nonce for replay protection */
  nonce?: string;

  /** IP address */
  ipaddr?: string;

  /** Version */
  ver: string;
}

/**
 * Default claims mapping for Microsoft Entra ID OIDC
 */
export const MICROSOFT_CLAIMS_MAPPING = {
  /**
   * Microsoft provides multiple identifiers:
   * - 'oid': Object ID (stable within tenant)
   * - 'sub': Subject (stable within application)
   * We use 'oid' for consistency across applications in same tenant
   */
  externalIdClaim: 'oid',

  /** Email claim - may also use 'preferred_username' or 'upn' */
  emailClaim: 'email',

  /** Full name claim */
  nameClaim: 'name',

  /** First name */
  firstNameClaim: 'given_name',

  /** Last name */
  lastNameClaim: 'family_name',

  /**
   * Role claim - Microsoft provides 'roles' from app registration
   * or 'groups' for group membership-based roles
   */
  roleClaim: 'roles',
};

/**
 * Well-known Microsoft Entra ID directory role template IDs
 * These are returned in the 'wids' claim
 * @see https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference
 */
export const MICROSOFT_DIRECTORY_ROLES = {
  GLOBAL_ADMINISTRATOR: 'b79fbf4d-3ef9-4689-8143-76b194e85509',
  USER_ADMINISTRATOR: '88d8e3e3-8f55-4a1e-953a-9b9898b8876b',
  PRIVILEGED_ROLE_ADMINISTRATOR: 'e8611ab8-c189-46e8-94e1-60213ab1f814',
  GROUPS_ADMINISTRATOR: '0964bb5e-9bdb-4d7b-ac29-58e794862a40',
  LICENSE_ADMINISTRATOR: 'aaf43236-0c0d-4d5f-883a-6955382ac081',
} as const;

/**
 * Default role mapping from Microsoft Entra ID roles to AIVO roles
 * Note: Roles must be configured in the Azure app registration
 */
export const MICROSOFT_ROLE_MAPPING: Record<string, UserRoleEnum> = {
  /** App roles configured in Azure */
  student: 'LEARNER',
  learner: 'LEARNER',
  Student: 'LEARNER',
  Learner: 'LEARNER',

  teacher: 'TEACHER',
  Teacher: 'TEACHER',
  staff: 'TEACHER',
  Staff: 'TEACHER',
  educator: 'TEACHER',
  Educator: 'TEACHER',
  faculty: 'TEACHER',
  Faculty: 'TEACHER',

  parent: 'PARENT',
  Parent: 'PARENT',
  guardian: 'PARENT',
  Guardian: 'PARENT',

  admin: 'DISTRICT_ADMIN',
  Admin: 'DISTRICT_ADMIN',
  administrator: 'DISTRICT_ADMIN',
  Administrator: 'DISTRICT_ADMIN',
  'school-admin': 'DISTRICT_ADMIN',
  'district-admin': 'DISTRICT_ADMIN',
  SchoolAdmin: 'DISTRICT_ADMIN',
  DistrictAdmin: 'DISTRICT_ADMIN',
};

// ══════════════════════════════════════════════════════════════════════════════
// MICROSOFT CONFIGURATION HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get Microsoft Entra ID endpoints for a specific tenant
 */
export function getMicrosoftEndpoints(tenantId: string): {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksUri: string;
  userinfoEndpoint: string;
} {
  return {
    issuer: MICROSOFT_ISSUER_PATTERN.replace('{tenantId}', tenantId),
    authorizationEndpoint: MICROSOFT_AUTHORIZATION_ENDPOINT_PATTERN.replace(
      '{tenantId}',
      tenantId
    ),
    tokenEndpoint: MICROSOFT_TOKEN_ENDPOINT_PATTERN.replace('{tenantId}', tenantId),
    jwksUri: MICROSOFT_JWKS_URI_PATTERN.replace('{tenantId}', tenantId),
    userinfoEndpoint: MICROSOFT_USERINFO_ENDPOINT,
  };
}

/**
 * Create a Microsoft Entra ID OIDC IdP configuration for a tenant.
 *
 * @param aivoTenantId - The AIVO tenant UUID
 * @param clientId - Microsoft application (client) ID (from Azure portal)
 * @param clientSecretRef - Reference to the client secret in KMS/Vault
 * @param microsoftTenantId - The Microsoft Entra ID tenant ID (directory ID)
 * @param options - Additional configuration options
 */
export function createMicrosoftIdpConfig(
  aivoTenantId: string,
  clientId: string,
  clientSecretRef: string,
  microsoftTenantId: string,
  options: {
    name?: string;
    autoProvisionUsers?: boolean;
    defaultRole?: UserRoleEnum;
    allowedUserTypes?: UserRoleEnum[];
    loginHintTemplate?: string;
    customRoleMapping?: Record<string, UserRoleEnum>;
    customScopes?: string[];
    /**
     * Use group claims for role mapping
     * Requires: GroupMember.Read.All permission or groups claim configuration
     */
    useGroupClaims?: boolean;
    /**
     * Map specific Entra ID groups to AIVO roles
     * Key: Group Object ID, Value: AIVO role
     */
    groupRoleMapping?: Record<string, UserRoleEnum>;
    /**
     * Include education-specific scopes
     */
    includeEducationScopes?: boolean;
    /**
     * Include Teams scopes for Teams for Education integration
     */
    includeTeamsScopes?: boolean;
  } = {}
): Omit<OidcIdpConfig, 'id'> {
  const endpoints = getMicrosoftEndpoints(microsoftTenantId);

  // Determine scopes based on options
  let scopes: string[] = [...MICROSOFT_SCOPES];
  if (options.customScopes) {
    scopes = options.customScopes;
  } else if (options.includeEducationScopes) {
    scopes = [...MICROSOFT_EDUCATION_SCOPES];
  } else if (options.includeTeamsScopes) {
    scopes = [...MICROSOFT_TEAMS_SCOPES];
  }

  // Determine role claim based on group usage
  const claimsMapping = { ...MICROSOFT_CLAIMS_MAPPING };
  if (options.useGroupClaims) {
    claimsMapping.roleClaim = 'groups';
  }

  return {
    tenantId: aivoTenantId,
    protocol: 'OIDC',
    name: options.name ?? 'Microsoft Entra SSO',
    issuer: endpoints.issuer,
    enabled: true,

    // OIDC endpoints
    clientId,
    clientSecretRef,
    authorizationEndpoint: endpoints.authorizationEndpoint,
    tokenEndpoint: endpoints.tokenEndpoint,
    userinfoEndpoint: endpoints.userinfoEndpoint,
    jwksUri: endpoints.jwksUri,
    scopes,

    // Claims mapping (Microsoft-specific)
    ...claimsMapping,

    // Role mapping
    roleMapping: options.groupRoleMapping ?? options.customRoleMapping ?? MICROSOFT_ROLE_MAPPING,

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
 * Validate Microsoft-specific configuration
 */
export function validateMicrosoftConfig(config: Partial<OidcIdpConfig>): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config.clientId) {
    errors.push('Microsoft Application (Client) ID is required');
  }

  if (!config.clientSecretRef) {
    errors.push('Microsoft Client Secret reference is required');
  }

  // Validate issuer format
  if (config.issuer) {
    if (!config.issuer.includes('microsoftonline.com') && !config.issuer.includes('microsoft.com')) {
      errors.push('Invalid Microsoft issuer. Must be a Microsoft domain.');
    }

    // Check for common/organizations (less secure for education)
    if (config.issuer.includes('/common/') || config.issuer.includes('/organizations/')) {
      warnings.push(
        'Using multi-tenant endpoint (common/organizations). Consider restricting to specific tenant for education environments.'
      );
    }
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

  // Warnings for education deployments
  if (!config.scopes?.some((s) => s.includes('EduRoster'))) {
    warnings.push(
      'Consider adding EduRoster.Read scope for full education integration'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MICROSOFT EDUCATION HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Education user account types in Microsoft 365
 */
export const MICROSOFT_EDUCATION_USER_TYPES = [
  'student',
  'teacher',
  'faculty',
  'staff',
  'administrator',
  'parent',
  'guardian',
] as const;

export type MicrosoftEducationUserType = (typeof MICROSOFT_EDUCATION_USER_TYPES)[number];

/**
 * Check if a value is a valid Microsoft education user type
 */
export function isValidMicrosoftEducationUserType(
  userType: string
): userType is MicrosoftEducationUserType {
  return MICROSOFT_EDUCATION_USER_TYPES.includes(
    userType.toLowerCase() as MicrosoftEducationUserType
  );
}

/**
 * Map Microsoft Entra ID role/group to AIVO role
 */
export function mapMicrosoftRoleToAivo(
  role: string,
  customMapping?: Record<string, UserRoleEnum>
): UserRoleEnum | null {
  const mapping = customMapping ?? MICROSOFT_ROLE_MAPPING;
  return mapping[role] ?? mapping[role.toLowerCase()] ?? null;
}

/**
 * Extract tenant ID from Microsoft issuer URL
 */
export function extractTenantIdFromIssuer(issuer: string): string | null {
  const match = issuer.match(
    /login\.microsoftonline\.com\/([a-f0-9-]+)\/v2\.0/i
  );
  return match ? match[1] : null;
}

/**
 * Determine role from UPN (User Principal Name) pattern
 * Common patterns in Microsoft 365 for Education:
 * - Students: studentid@school.edu or s.lastname.firstname@school.edu
 * - Teachers: t.lastname.firstname@school.edu or lastname.firstname@school.edu
 * - Staff: staff.lastname@school.edu
 */
export function inferRoleFromUpn(
  upn: string,
  patterns: {
    studentPatterns?: RegExp[];
    teacherPatterns?: RegExp[];
    staffPatterns?: RegExp[];
    adminPatterns?: RegExp[];
  } = {}
): UserRoleEnum | null {
  const normalizedUpn = upn.toLowerCase();

  // Default patterns commonly used in M365 Education
  const defaultStudentPatterns = [
    /^s\./,                             // s. prefix
    /^student\./,                       // student. prefix
    /^\d+@/,                            // Numeric ID prefix
    /@students?\./,                     // @student. subdomain
  ];

  const defaultAdminPatterns = [
    /^admin\./,
    /^administrator\./,
    /^it\./,
    /^principal\./,
    /^superintendent\./,
  ];

  const defaultStaffPatterns = [
    /^staff\./,
    /^office\./,
    /@staff\./,
  ];

  // Check admin patterns first (most specific)
  const adminPatterns = patterns.adminPatterns ?? defaultAdminPatterns;
  if (adminPatterns.some((p) => p.test(normalizedUpn))) {
    return 'DISTRICT_ADMIN';
  }

  // Check student patterns
  const studentPatterns = patterns.studentPatterns ?? defaultStudentPatterns;
  if (studentPatterns.some((p) => p.test(normalizedUpn))) {
    return 'LEARNER';
  }

  // Check staff patterns (before teacher since staff is more specific)
  const staffPatterns = patterns.staffPatterns ?? defaultStaffPatterns;
  if (staffPatterns.some((p) => p.test(normalizedUpn))) {
    return 'TEACHER'; // Staff maps to TEACHER role
  }

  // Check teacher patterns
  if (patterns.teacherPatterns) {
    if (patterns.teacherPatterns.some((p) => p.test(normalizedUpn))) {
      return 'TEACHER';
    }
  }

  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// MICROSOFT SSO URL BUILDERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Build Microsoft Entra ID authorization URL with all required parameters
 */
export function buildMicrosoftAuthUrl(options: {
  tenantId: string;
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
  loginHint?: string;
  domainHint?: string;
  scopes?: string[];
  prompt?: 'none' | 'login' | 'consent' | 'select_account';
  responseMode?: 'query' | 'fragment' | 'form_post';
}): string {
  const endpoint = MICROSOFT_AUTHORIZATION_ENDPOINT_PATTERN.replace(
    '{tenantId}',
    options.tenantId
  );
  const url = new URL(endpoint);

  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', options.clientId);
  url.searchParams.set('redirect_uri', options.redirectUri);
  url.searchParams.set('scope', (options.scopes ?? MICROSOFT_SCOPES).join(' '));
  url.searchParams.set('state', options.state);
  url.searchParams.set('nonce', options.nonce);

  // Response mode (form_post is recommended for security)
  if (options.responseMode) {
    url.searchParams.set('response_mode', options.responseMode);
  }

  // PKCE support (required for public clients, recommended for all)
  if (options.codeChallenge) {
    url.searchParams.set('code_challenge', options.codeChallenge);
    url.searchParams.set(
      'code_challenge_method',
      options.codeChallengeMethod ?? 'S256'
    );
  }

  // Login hint pre-fills username
  if (options.loginHint) {
    url.searchParams.set('login_hint', options.loginHint);
  }

  // Domain hint for federated authentication
  if (options.domainHint) {
    url.searchParams.set('domain_hint', options.domainHint);
  }

  // Prompt behavior
  if (options.prompt) {
    url.searchParams.set('prompt', options.prompt);
  }

  return url.toString();
}

/**
 * Get Microsoft 365 admin center URL
 */
export function getMicrosoft365AdminUrl(): string {
  return 'https://admin.microsoft.com';
}

/**
 * Get Microsoft Entra ID portal URL
 */
export function getEntraIdPortalUrl(tenantId?: string): string {
  const base = 'https://entra.microsoft.com';
  return tenantId ? `${base}/#view/Microsoft_AAD_IAM/TenantOverview.ReactView` : base;
}

/**
 * Get Microsoft Teams URL
 */
export function getMicrosoftTeamsUrl(): string {
  return 'https://teams.microsoft.com';
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export const MicrosoftSso = {
  issuerPattern: MICROSOFT_ISSUER_PATTERN,
  issuerCommon: MICROSOFT_ISSUER_COMMON,
  issuerOrganizations: MICROSOFT_ISSUER_ORGANIZATIONS,
  authorizationEndpointPattern: MICROSOFT_AUTHORIZATION_ENDPOINT_PATTERN,
  tokenEndpointPattern: MICROSOFT_TOKEN_ENDPOINT_PATTERN,
  userinfoEndpoint: MICROSOFT_USERINFO_ENDPOINT,
  jwksUriPattern: MICROSOFT_JWKS_URI_PATTERN,
  graphApi: MICROSOFT_GRAPH_API,
  scopes: MICROSOFT_SCOPES,
  educationScopes: MICROSOFT_EDUCATION_SCOPES,
  teamsScopes: MICROSOFT_TEAMS_SCOPES,
  claimsMapping: MICROSOFT_CLAIMS_MAPPING,
  roleMapping: MICROSOFT_ROLE_MAPPING,
  directoryRoles: MICROSOFT_DIRECTORY_ROLES,
  educationUserTypes: MICROSOFT_EDUCATION_USER_TYPES,
  getEndpoints: getMicrosoftEndpoints,
  createConfig: createMicrosoftIdpConfig,
  validateConfig: validateMicrosoftConfig,
  buildAuthUrl: buildMicrosoftAuthUrl,
  mapRole: mapMicrosoftRoleToAivo,
  extractTenantId: extractTenantIdFromIssuer,
  inferRoleFromUpn,
  isValidEducationUserType: isValidMicrosoftEducationUserType,
  getM365AdminUrl: getMicrosoft365AdminUrl,
  getEntraIdPortalUrl,
  getTeamsUrl: getMicrosoftTeamsUrl,
};
