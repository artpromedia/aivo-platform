/**
 * LTI 1.3 JWT Validation and OIDC Flow
 *
 * Handles:
 * - OIDC login initiation
 * - JWT id_token validation
 * - Nonce replay protection
 * - Platform JWKS verification
 */

import * as jose from 'jose';

import type {
  LtiIdTokenPayload,
  ValidatedLaunch,
  OidcLoginRequest,
  OidcAuthResponse,
} from './types.js';
import { LTI_CLAIMS, LTI_ROLES, LtiUserRole } from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface LtiToolRecord {
  id: string;
  tenantId: string;
  clientId: string;
  deploymentId: string;
  issuer: string;
  jwksUrl: string;
  authLoginUrl: string;
  authTokenUrl: string;
  toolPrivateKeyRef: string;
}

export type JwksCache = Record<
  string,
  {
    keys: jose.JWK[];
    fetchedAt: number;
  }
>;

// ══════════════════════════════════════════════════════════════════════════════
// JWKS CACHE
// ══════════════════════════════════════════════════════════════════════════════

const jwksCache: JwksCache = {};
const JWKS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Fetch and cache platform's JWKS
 */
async function getJwks(jwksUrl: string): Promise<jose.JSONWebKeySet> {
  const cached = jwksCache[jwksUrl];
  const now = Date.now();

  if (cached && now - cached.fetchedAt < JWKS_CACHE_TTL) {
    return { keys: cached.keys };
  }

  const response = await fetch(jwksUrl);
  if (!response.ok) {
    throw new LtiError(
      `Failed to fetch JWKS from ${jwksUrl}: ${response.status}`,
      'JWKS_FETCH_ERROR'
    );
  }

  const jwks = (await response.json()) as jose.JSONWebKeySet;

  jwksCache[jwksUrl] = {
    keys: jwks.keys,
    fetchedAt: now,
  };

  return jwks;
}

// ══════════════════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ══════════════════════════════════════════════════════════════════════════════

export class LtiError extends Error {
  constructor(
    message: string,
    public code: string,
    public httpStatus = 400
  ) {
    super(message);
    this.name = 'LtiError';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// OIDC LOGIN FLOW
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a cryptographically secure random string
 */
function generateRandomString(length = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Handle OIDC login initiation from LMS
 *
 * This is the first step in LTI 1.3 launch:
 * 1. LMS sends login request to tool
 * 2. Tool redirects back to LMS auth endpoint with OIDC params
 * 3. LMS redirects to tool's launch endpoint with id_token
 */
export function createOidcAuthRequest(
  loginRequest: OidcLoginRequest,
  tool: LtiToolRecord,
  redirectUri: string
): { authUrl: string; state: string; nonce: string } {
  // Validate issuer matches tool configuration
  if (loginRequest.iss !== tool.issuer) {
    throw new LtiError(
      `Issuer mismatch: expected ${tool.issuer}, got ${loginRequest.iss}`,
      'ISSUER_MISMATCH',
      401
    );
  }

  // Generate state and nonce for OIDC flow
  const state = generateRandomString();
  const nonce = generateRandomString();

  // Build OIDC authorization request
  const authParams: OidcAuthResponse = {
    scope: 'openid',
    response_type: 'id_token',
    response_mode: 'form_post',
    prompt: 'none',
    client_id: tool.clientId,
    redirect_uri: redirectUri,
    state,
    nonce,
    login_hint: loginRequest.login_hint,
    ...(loginRequest.lti_message_hint ? { lti_message_hint: loginRequest.lti_message_hint } : {}),
  };

  const authUrl = new URL(tool.authLoginUrl);
  Object.entries(authParams).forEach(([key, value]) => {
    if (value !== undefined) {
      authUrl.searchParams.set(key, String(value));
    }
  });

  return {
    authUrl: authUrl.toString(),
    state,
    nonce,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// JWT VALIDATION
// ══════════════════════════════════════════════════════════════════════════════

export interface ValidationOptions {
  /** Expected nonce (for replay protection) */
  expectedNonce?: string;
  /** Expected state (for CSRF protection) */
  expectedState?: string;
  /** Maximum age of token in seconds */
  maxAge?: number;
  /** Function to check if nonce was already used */
  checkNonceUsed?: (nonce: string) => Promise<boolean>;
  /** Function to mark nonce as used */
  markNonceUsed?: (nonce: string, expiresAt: Date) => Promise<void>;
}

/**
 * Validate LTI 1.3 id_token JWT
 *
 * Performs:
 * - Signature verification using platform JWKS
 * - Issuer validation
 * - Audience validation
 * - Expiration check
 * - Nonce replay protection
 * - Required LTI claims validation
 */
export async function validateIdToken(
  idToken: string,
  tool: LtiToolRecord,
  options: ValidationOptions = {}
): Promise<LtiIdTokenPayload> {
  // Fetch platform's JWKS for signature verification
  const jwks = await getJwks(tool.jwksUrl);
  const JWKS = jose.createLocalJWKSet(jwks);

  // Verify signature and decode token
  let payload: jose.JWTPayload;
  try {
    const result = await jose.jwtVerify(idToken, JWKS, {
      issuer: tool.issuer,
      audience: tool.clientId,
      maxTokenAge: options.maxAge ? `${options.maxAge}s` : '1h',
    });
    payload = result.payload;
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      throw new LtiError('Token expired', 'TOKEN_EXPIRED', 401);
    }
    if (error instanceof jose.errors.JWTClaimValidationFailed) {
      throw new LtiError(
        `Token validation failed: ${error.message}`,
        'TOKEN_VALIDATION_FAILED',
        401
      );
    }
    if (error instanceof jose.errors.JWSSignatureVerificationFailed) {
      throw new LtiError('Invalid token signature', 'INVALID_SIGNATURE', 401);
    }
    throw new LtiError(`Token verification failed: ${String(error)}`, 'VERIFICATION_FAILED', 401);
  }

  const ltiPayload = payload as unknown as LtiIdTokenPayload;

  // Validate required claims
  if (!ltiPayload.sub) {
    throw new LtiError('Missing required claim: sub', 'MISSING_CLAIM', 400);
  }

  if (!ltiPayload.nonce) {
    throw new LtiError('Missing required claim: nonce', 'MISSING_CLAIM', 400);
  }

  // Validate LTI-specific claims
  const deploymentId = ltiPayload[LTI_CLAIMS.DEPLOYMENT_ID];
  if (!deploymentId) {
    throw new LtiError('Missing LTI deployment_id claim', 'MISSING_LTI_CLAIM', 400);
  }

  if (deploymentId !== tool.deploymentId) {
    throw new LtiError(
      `Deployment ID mismatch: expected ${tool.deploymentId}, got ${deploymentId}`,
      'DEPLOYMENT_MISMATCH',
      401
    );
  }

  const messageType = ltiPayload[LTI_CLAIMS.MESSAGE_TYPE];
  if (!messageType) {
    throw new LtiError('Missing LTI message_type claim', 'MISSING_LTI_CLAIM', 400);
  }

  const version = ltiPayload[LTI_CLAIMS.VERSION];
  if (version !== '1.3.0') {
    throw new LtiError(`Unsupported LTI version: ${version}`, 'UNSUPPORTED_VERSION', 400);
  }

  // Nonce replay protection
  if (options.expectedNonce && ltiPayload.nonce !== options.expectedNonce) {
    throw new LtiError('Nonce mismatch', 'NONCE_MISMATCH', 401);
  }

  if (options.checkNonceUsed) {
    const used = await options.checkNonceUsed(ltiPayload.nonce);
    if (used) {
      throw new LtiError('Nonce already used (replay attack detected)', 'NONCE_REUSED', 401);
    }
  }

  if (options.markNonceUsed) {
    // Nonce expires 1 hour after token expiration
    const expiresAt = new Date((ltiPayload.exp + 3600) * 1000);
    await options.markNonceUsed(ltiPayload.nonce, expiresAt);
  }

  return ltiPayload;
}

// ══════════════════════════════════════════════════════════════════════════════
// ROLE MAPPING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Map LTI role URIs to simplified Aivo role
 */
export function mapLtiRole(roles: string[]): LtiUserRole {
  // Check for instructor roles first
  for (const role of roles) {
    if (
      role.includes('Instructor') ||
      role.includes('Faculty') ||
      role.includes('Staff') ||
      role === LTI_ROLES.CONTEXT_INSTRUCTOR ||
      role === LTI_ROLES.INSTITUTION_INSTRUCTOR
    ) {
      return LtiUserRole.INSTRUCTOR;
    }
  }

  // Check for teaching assistant
  for (const role of roles) {
    if (role.includes('TeachingAssistant') || role === LTI_ROLES.CONTEXT_TEACHING_ASSISTANT) {
      return LtiUserRole.TEACHING_ASSISTANT;
    }
  }

  // Check for content developer
  for (const role of roles) {
    if (role.includes('ContentDeveloper') || role === LTI_ROLES.CONTEXT_CONTENT_DEVELOPER) {
      return LtiUserRole.CONTENT_DEVELOPER;
    }
  }

  // Check for administrator
  for (const role of roles) {
    if (
      role.includes('Administrator') ||
      role === LTI_ROLES.SYSTEM_ADMINISTRATOR ||
      role === LTI_ROLES.INSTITUTION_ADMINISTRATOR
    ) {
      return LtiUserRole.ADMINISTRATOR;
    }
  }

  // Check for mentor
  for (const role of roles) {
    if (role.includes('Mentor') || role === LTI_ROLES.CONTEXT_MENTOR) {
      return LtiUserRole.MENTOR;
    }
  }

  // Default to learner
  return LtiUserRole.LEARNER;
}

// ══════════════════════════════════════════════════════════════════════════════
// LAUNCH PROCESSING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Process validated LTI payload into structured launch data
 */
export function processLaunchPayload(
  payload: LtiIdTokenPayload,
  tool: LtiToolRecord
): Omit<
  ValidatedLaunch,
  'linkId' | 'aivoUserId' | 'aivoLearnerId' | 'targetActivityId' | 'targetLoVersionId'
> {
  const roles = payload[LTI_CLAIMS.ROLES] || [];
  const context = payload[LTI_CLAIMS.CONTEXT];
  const resourceLink = payload[LTI_CLAIMS.RESOURCE_LINK];
  const agsEndpoint = payload[LTI_CLAIMS.AGS];

  return {
    toolId: tool.id,
    tenantId: tool.tenantId,

    // User info from token
    lmsUserId: payload.sub,
    lmsUserEmail: payload.email ?? undefined,
    lmsUserName:
      payload.name ||
      [payload.given_name, payload.family_name].filter(Boolean).join(' ') ||
      undefined,
    userRole: mapLtiRole(roles),

    // Context info
    lmsContextId: context?.id ?? undefined,
    lmsContextTitle: (context?.title || context?.label) ?? undefined,
    lmsResourceLinkId: resourceLink?.id ?? undefined,

    // Services
    agsEndpoint: agsEndpoint ?? undefined,

    // Full payload
    payload,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL JWKS GENERATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate tool's public JWKS from private key
 * This is exposed at the tool's JWKS endpoint for platforms to verify tool messages
 */
export async function generateToolJwks(
  privateKeyPem: string,
  keyId: string
): Promise<jose.JSONWebKeySet> {
  const privateKey = await jose.importPKCS8(privateKeyPem, 'RS256');
  const publicKey = await jose.exportJWK(privateKey);

  if (!publicKey.n || !publicKey.e) {
    throw new LtiError('Failed to export public key components', 'KEY_EXPORT_ERROR', 500);
  }

  // Only include public components
  const publicJwk: jose.JWK = {
    kty: publicKey.kty,
    n: publicKey.n,
    e: publicKey.e,
    kid: keyId,
    alg: 'RS256',
    use: 'sig',
  };

  return {
    keys: [publicJwk],
  };
}

/**
 * Sign a JWT for sending messages to the platform
 */
export async function signToolJwt(
  payload: Record<string, unknown>,
  privateKeyPem: string,
  keyId: string,
  expiresIn = '1h'
): Promise<string> {
  const privateKey = await jose.importPKCS8(privateKeyPem, 'RS256');

  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: keyId })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(privateKey);

  return jwt;
}
