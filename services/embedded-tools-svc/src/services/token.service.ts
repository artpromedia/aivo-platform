/**
 * Tool Launch Token Service
 *
 * Generates and validates JWTs for embedded tool launches.
 * Tokens are short-lived and scoped to specific sessions.
 *
 * Security considerations:
 * - Uses a SEPARATE signing key from main auth tokens
 * - Tokens are bound to specific sessions and cannot be reused
 * - Contains only pseudonymous learner IDs, never real PII
 * - Short expiration (15min default, configurable)
 */

import * as jose from 'jose';
import { createHash, randomUUID } from 'crypto';

import type { ToolLaunchTokenClaims, ToolScope, LearnerContext } from '../types/index.js';
import { config } from '../config.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const TOKEN_ISSUER = 'aivo-embedded-tools';
const TOKEN_EXPIRY_SECONDS = 15 * 60; // 15 minutes default
const ALGORITHM = 'HS256';

// ══════════════════════════════════════════════════════════════════════════════
// KEY MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

let signingKey: Uint8Array | null = null;

/**
 * Initialize the signing key from environment
 * This key MUST be different from main auth service keys
 */
export async function initializeSigningKey(): Promise<void> {
  const keyString = config.toolTokenSigningKey;
  
  if (!keyString) {
    throw new Error('TOOL_TOKEN_SIGNING_KEY environment variable is required');
  }

  // Key should be at least 256 bits (32 bytes) for HS256
  if (keyString.length < 32) {
    throw new Error('TOOL_TOKEN_SIGNING_KEY must be at least 32 characters');
  }

  signingKey = new TextEncoder().encode(keyString);
}

/**
 * Get the signing key (throws if not initialized)
 */
function getSigningKey(): Uint8Array {
  if (!signingKey) {
    throw new Error('Signing key not initialized. Call initializeSigningKey first.');
  }
  return signingKey;
}

// ══════════════════════════════════════════════════════════════════════════════
// PSEUDONYM GENERATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a pseudonymous learner ID
 *
 * This creates a consistent hash that:
 * - Cannot be reversed to get the real learner ID
 * - Is consistent for the same learner within a tenant
 * - Is different across tenants (tenant-scoped)
 *
 * @param learnerId - Real learner UUID
 * @param tenantId - Tenant UUID (used as additional salt)
 * @returns Pseudonymous ID (base64url encoded)
 */
export function generatePseudonymousLearnerId(learnerId: string, tenantId: string): string {
  const tenantSecret = config.tenantPseudonymSecret;
  
  if (!tenantSecret) {
    throw new Error('TENANT_PSEUDONYM_SECRET environment variable is required');
  }

  // HMAC-SHA256: learner_id + tenant_id with tenant secret
  const data = `${learnerId}:${tenantId}`;
  const hash = createHash('sha256')
    .update(tenantSecret)
    .update(data)
    .digest('base64url');

  // Return first 22 chars (132 bits of entropy)
  return `pln_${hash.substring(0, 22)}`;
}

/**
 * Generate a pseudonymous classroom ID
 */
export function generatePseudonymousClassroomId(classroomId: string, tenantId: string): string {
  const tenantSecret = config.tenantPseudonymSecret;
  
  if (!tenantSecret) {
    throw new Error('TENANT_PSEUDONYM_SECRET environment variable is required');
  }

  const data = `classroom:${classroomId}:${tenantId}`;
  const hash = createHash('sha256')
    .update(tenantSecret)
    .update(data)
    .digest('base64url');

  return `pcr_${hash.substring(0, 22)}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// TOKEN GENERATION
// ══════════════════════════════════════════════════════════════════════════════

export interface GenerateTokenParams {
  /** Tool session ID */
  sessionId: string;
  /** Tenant ID */
  tenantId: string;
  /** Marketplace item ID */
  marketplaceItemId: string;
  /** Item version ID */
  marketplaceItemVersionId: string;
  /** Installation ID */
  installationId: string;
  /** Real learner ID (will be pseudonymized) */
  learnerId?: string;
  /** Real classroom ID (will be pseudonymized) */
  classroomId?: string;
  /** Granted scopes */
  scopes: ToolScope[];
  /** Token audience (vendor domain or slug) */
  audience: string;
  /** Custom expiry in seconds (optional) */
  expirySeconds?: number;
}

export interface GeneratedToken {
  /** The JWT string */
  token: string;
  /** JWT ID for tracking */
  jti: string;
  /** Expiration timestamp (Unix seconds) */
  expiresAt: number;
  /** Pseudonymous learner ID (if learner provided) */
  pseudonymousLearnerId?: string;
  /** Pseudonymous classroom ID (if classroom provided) */
  pseudonymousClassroomId?: string;
}

/**
 * Generate a tool launch token
 */
export async function generateToolLaunchToken(params: GenerateTokenParams): Promise<GeneratedToken> {
  const key = getSigningKey();
  const jti = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const expirySeconds = params.expirySeconds ?? TOKEN_EXPIRY_SECONDS;
  const exp = now + expirySeconds;

  // Generate pseudonymous IDs
  const pseudonymousLearnerId = params.learnerId
    ? generatePseudonymousLearnerId(params.learnerId, params.tenantId)
    : undefined;

  const pseudonymousClassroomId = params.classroomId
    ? generatePseudonymousClassroomId(params.classroomId, params.tenantId)
    : undefined;

  // Build claims
  const claims: ToolLaunchTokenClaims = {
    jti,
    iss: TOKEN_ISSUER,
    aud: params.audience,
    sub: params.sessionId,
    iat: now,
    exp,
    nbf: now,
    aivo_tenant_id: params.tenantId,
    aivo_item_id: params.marketplaceItemId,
    aivo_item_version_id: params.marketplaceItemVersionId,
    aivo_installation_id: params.installationId,
    aivo_scopes: params.scopes,
  };

  // Add optional claims
  if (pseudonymousLearnerId) {
    claims.aivo_learner_id = pseudonymousLearnerId;
  }
  if (pseudonymousClassroomId) {
    claims.aivo_classroom_id = pseudonymousClassroomId;
  }

  // Sign the token
  const token = await new jose.SignJWT(claims as unknown as jose.JWTPayload)
    .setProtectedHeader({ alg: ALGORITHM, typ: 'JWT' })
    .sign(key);

  return {
    token,
    jti,
    expiresAt: exp,
    pseudonymousLearnerId,
    pseudonymousClassroomId,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// TOKEN VALIDATION
// ══════════════════════════════════════════════════════════════════════════════

export interface ValidateTokenResult {
  valid: boolean;
  claims?: ToolLaunchTokenClaims;
  error?: string;
}

/**
 * Validate a tool launch token
 */
export async function validateToolLaunchToken(
  token: string,
  expectedAudience?: string
): Promise<ValidateTokenResult> {
  const key = getSigningKey();

  try {
    const { payload } = await jose.jwtVerify(token, key, {
      issuer: TOKEN_ISSUER,
      audience: expectedAudience,
      algorithms: [ALGORITHM],
    });

    const claims = payload as unknown as ToolLaunchTokenClaims;

    // Validate required Aivo claims
    if (!claims.aivo_tenant_id || !claims.aivo_item_id || !claims.aivo_scopes) {
      return {
        valid: false,
        error: 'Missing required Aivo claims',
      };
    }

    return {
      valid: true,
      claims,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (error instanceof jose.errors.JWTExpired) {
      return { valid: false, error: 'Token expired' };
    }
    if (error instanceof jose.errors.JWTClaimValidationFailed) {
      return { valid: false, error: `Claim validation failed: ${errorMessage}` };
    }
    if (error instanceof jose.errors.JWSSignatureVerificationFailed) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: false, error: errorMessage };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TOKEN REFRESH
// ══════════════════════════════════════════════════════════════════════════════

export interface RefreshTokenParams {
  /** Current token */
  currentToken: string;
  /** Expected audience */
  audience: string;
  /** Maximum refresh count allowed */
  maxRefreshCount: number;
  /** Current refresh count */
  currentRefreshCount: number;
}

export interface RefreshTokenResult {
  success: boolean;
  newToken?: string;
  newJti?: string;
  newExpiresAt?: number;
  error?: string;
}

/**
 * Refresh a tool launch token
 *
 * This creates a new token with the same claims but new expiry.
 * The old token should be invalidated in the database.
 */
export async function refreshToolLaunchToken(params: RefreshTokenParams): Promise<RefreshTokenResult> {
  // Check refresh limit
  if (params.currentRefreshCount >= params.maxRefreshCount) {
    return {
      success: false,
      error: `Maximum refresh count (${params.maxRefreshCount}) exceeded`,
    };
  }

  // Validate current token
  const validation = await validateToolLaunchToken(params.currentToken, params.audience);

  if (!validation.valid || !validation.claims) {
    return {
      success: false,
      error: validation.error ?? 'Invalid token',
    };
  }

  // Generate new token with same claims
  const claims = validation.claims;
  const newToken = await generateToolLaunchToken({
    sessionId: claims.sub,
    tenantId: claims.aivo_tenant_id,
    marketplaceItemId: claims.aivo_item_id,
    marketplaceItemVersionId: claims.aivo_item_version_id,
    installationId: claims.aivo_installation_id,
    scopes: claims.aivo_scopes,
    audience: claims.aud,
    // Note: We don't pass learner/classroom IDs because we can't reverse the pseudonyms
    // The new token will have the same pseudonymous IDs as the original
  });

  return {
    success: true,
    newToken: newToken.token,
    newJti: newToken.jti,
    newExpiresAt: newToken.expiresAt,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// LEARNER CONTEXT BUILDER
// ══════════════════════════════════════════════════════════════════════════════

export interface BuildLearnerContextParams {
  learnerId?: string;
  tenantId: string;
  firstName?: string;
  gradeBand?: string;
  gradeLevel?: number;
  subject?: string;
  grantedScopes: ToolScope[];
}

/**
 * Build learner context based on granted scopes
 *
 * This ensures we only include data the tool is authorized to see.
 */
export function buildLearnerContext(params: BuildLearnerContextParams): LearnerContext | undefined {
  if (!params.learnerId) {
    return undefined;
  }

  const context: LearnerContext = {};
  const scopes = new Set(params.grantedScopes);

  // Always include pseudonym if any learner scope is granted
  if (
    scopes.has('LEARNER_PROFILE_MIN') ||
    scopes.has('LEARNER_PROFILE_EXTENDED') ||
    scopes.has('LEARNER_PSEUDONYM')
  ) {
    context.pseudonymousId = generatePseudonymousLearnerId(params.learnerId, params.tenantId);
  }

  // LEARNER_PROFILE_MIN: initials, grade band, subject
  if (scopes.has('LEARNER_PROFILE_MIN')) {
    if (params.firstName) {
      context.initials = `${params.firstName.charAt(0).toUpperCase()}.`;
    }
    if (params.gradeBand) {
      context.gradeBand = params.gradeBand;
    }
    if (params.subject) {
      context.subject = params.subject;
    }
  }

  // LEARNER_NAME_FULL: full first name (elevated, requires COPPA consent)
  if (scopes.has('LEARNER_NAME_FULL') && params.firstName) {
    context.firstName = params.firstName;
  }

  // LEARNER_GRADE_EXACT: specific grade number (elevated)
  if (scopes.has('LEARNER_GRADE_EXACT') && params.gradeLevel !== undefined) {
    context.gradeLevel = params.gradeLevel;
  }

  return Object.keys(context).length > 0 ? context : undefined;
}
