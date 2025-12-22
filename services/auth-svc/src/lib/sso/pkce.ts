/**
 * PKCE (Proof Key for Code Exchange) Implementation
 *
 * Implements RFC 7636 for OAuth 2.0 public clients.
 * Provides protection against authorization code interception attacks.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7636
 */

import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

// ============================================================================
// TYPES
// ============================================================================

export interface PKCEChallenge {
  /** The code verifier - a cryptographically random string (43-128 chars) */
  codeVerifier: string;
  /** The code challenge - BASE64URL(SHA256(code_verifier)) */
  codeChallenge: string;
  /** Always 'S256' - plain method is not supported for security reasons */
  codeChallengeMethod: 'S256';
}

export interface PKCEVerificationResult {
  valid: boolean;
  error?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Minimum length for code verifier (RFC 7636 Section 4.1)
 * Must be between 43 and 128 characters
 */
const CODE_VERIFIER_MIN_LENGTH = 43;
const CODE_VERIFIER_MAX_LENGTH = 128;

/**
 * Allowed characters for code verifier (RFC 7636 Section 4.1)
 * unreserved = ALPHA / DIGIT / "-" / "." / "_" / "~"
 */
const CODE_VERIFIER_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

// ============================================================================
// PKCE GENERATION
// ============================================================================

/**
 * Generate a PKCE code verifier and challenge pair.
 *
 * The code verifier is a cryptographically random string using the
 * unreserved character set defined in RFC 7636.
 *
 * The code challenge is created by applying SHA-256 to the verifier
 * and base64url encoding the result.
 *
 * @returns PKCE challenge containing verifier, challenge, and method
 *
 * @example
 * ```typescript
 * const pkce = generatePKCE();
 * // Store pkce.codeVerifier securely (e.g., encrypted in state)
 * // Send pkce.codeChallenge and pkce.codeChallengeMethod in auth request
 * ```
 */
export function generatePKCE(): PKCEChallenge {
  // Generate 32 bytes of random data
  const randomData = randomBytes(32);

  // Convert to code verifier using allowed characters
  const codeVerifier = generateCodeVerifier(randomData);

  // Generate challenge using S256 method
  const codeChallenge = createCodeChallenge(codeVerifier);

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256',
  };
}

/**
 * Generate a code verifier from random bytes.
 *
 * Uses the unreserved character set from RFC 7636 Section 4.1.
 * Resulting string is 43 characters (appropriate for 256 bits of entropy).
 */
function generateCodeVerifier(randomData: Buffer): string {
  const chars: string[] = [];
  const charsetLength = CODE_VERIFIER_CHARSET.length;

  for (const byte of randomData) {
    const char = CODE_VERIFIER_CHARSET[byte % charsetLength];
    if (char !== undefined) {
      chars.push(char);
    }
  }

  // Ensure minimum length by adding more characters if needed
  while (chars.length < CODE_VERIFIER_MIN_LENGTH) {
    const extraBytes = randomBytes(4);
    for (const byte of extraBytes) {
      const char = CODE_VERIFIER_CHARSET[byte % charsetLength];
      if (char !== undefined) {
        chars.push(char);
      }
    }
  }

  return chars.slice(0, CODE_VERIFIER_MAX_LENGTH).join('');
}

/**
 * Create a code challenge from a code verifier.
 *
 * S256: BASE64URL(SHA256(code_verifier))
 *
 * The plain method is intentionally not supported as it provides
 * no security benefit over not using PKCE at all.
 */
function createCodeChallenge(codeVerifier: string): string {
  return createHash('sha256').update(codeVerifier, 'ascii').digest('base64url');
}

// ============================================================================
// PKCE VERIFICATION
// ============================================================================

/**
 * Verify that a code verifier matches the original code challenge.
 *
 * This should be called during token exchange to ensure the party
 * exchanging the authorization code is the same party that initiated
 * the authorization request.
 *
 * @param codeVerifier - The code verifier sent during token exchange
 * @param codeChallenge - The original code challenge from the auth request
 * @param method - The code challenge method (only 'S256' is supported)
 *
 * @returns Verification result with valid flag and optional error
 *
 * @example
 * ```typescript
 * const result = verifyPKCE(
 *   req.body.code_verifier,
 *   storedCodeChallenge,
 *   'S256'
 * );
 *
 * if (!result.valid) {
 *   throw new Error(result.error);
 * }
 * ```
 */
export function verifyPKCE(
  codeVerifier: string,
  codeChallenge: string,
  method: string
): PKCEVerificationResult {
  // Validate code verifier format
  if (!codeVerifier || typeof codeVerifier !== 'string') {
    return { valid: false, error: 'Missing code_verifier' };
  }

  if (codeVerifier.length < CODE_VERIFIER_MIN_LENGTH) {
    return { valid: false, error: 'Code verifier too short' };
  }

  if (codeVerifier.length > CODE_VERIFIER_MAX_LENGTH) {
    return { valid: false, error: 'Code verifier too long' };
  }

  // Validate code challenge format
  if (!codeChallenge || typeof codeChallenge !== 'string') {
    return { valid: false, error: 'Missing code_challenge' };
  }

  // Reject plain method
  if (method === 'plain') {
    return {
      valid: false,
      error: 'Plain code challenge method is not allowed for security reasons',
    };
  }

  // Only support S256
  if (method !== 'S256') {
    return { valid: false, error: `Unsupported code challenge method: ${method}` };
  }

  // Compute the expected challenge from the verifier
  const computedChallenge = createHash('sha256').update(codeVerifier, 'ascii').digest('base64url');

  // Constant-time comparison to prevent timing attacks
  const bufA = Buffer.from(computedChallenge, 'utf8');
  const bufB = Buffer.from(codeChallenge, 'utf8');

  if (bufA.length !== bufB.length) {
    return { valid: false, error: 'Code verifier does not match code challenge' };
  }

  if (!timingSafeEqual(bufA, bufB)) {
    return { valid: false, error: 'Code verifier does not match code challenge' };
  }

  return { valid: true };
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate that a code challenge was provided in the authorization request.
 *
 * This should be called at the start of the authorization flow to ensure
 * PKCE is being used.
 *
 * @param codeChallenge - The code challenge from the auth request
 * @param codeChallengeMethod - The method used (should be 'S256')
 *
 * @returns Validation result
 */
export function validatePKCERequest(
  codeChallenge: string | undefined,
  codeChallengeMethod: string | undefined
): PKCEVerificationResult {
  // Require code challenge
  if (!codeChallenge) {
    return {
      valid: false,
      error: 'Missing code_challenge parameter. PKCE is required for all OAuth flows.',
    };
  }

  // Require code challenge method
  if (!codeChallengeMethod) {
    return {
      valid: false,
      error: 'Missing code_challenge_method parameter',
    };
  }

  // Reject plain method
  if (codeChallengeMethod === 'plain') {
    return {
      valid: false,
      error: 'Plain code challenge method is not allowed. Use S256.',
    };
  }

  // Only support S256
  if (codeChallengeMethod !== 'S256') {
    return {
      valid: false,
      error: `Unsupported code_challenge_method: ${codeChallengeMethod}. Use S256.`,
    };
  }

  // Validate code challenge format (should be base64url encoded SHA-256)
  // SHA-256 produces 32 bytes, base64url encoded = 43 characters
  if (codeChallenge.length !== 43) {
    return {
      valid: false,
      error: 'Invalid code_challenge format. Expected 43 character base64url encoded value.',
    };
  }

  // Check for valid base64url characters
  const base64urlPattern = /^[A-Za-z0-9_-]+$/;
  if (!base64urlPattern.test(codeChallenge)) {
    return {
      valid: false,
      error: 'Invalid code_challenge format. Must be base64url encoded.',
    };
  }

  return { valid: true };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const pkce = {
  generate: generatePKCE,
  verify: verifyPKCE,
  validateRequest: validatePKCERequest,
};
