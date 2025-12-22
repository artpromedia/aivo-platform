# SSO Security Remediation Guide

This guide provides detailed remediation steps for vulnerabilities identified in the SSO security audit. Each section includes secure code examples and implementation guidance.

---

## Table of Contents

1. [Critical: SAML Signature Validation](#1-critical-saml-signature-validation)
2. [Critical: Hardcoded Encryption Keys](#2-critical-hardcoded-encryption-keys)
3. [Critical: Redirect URI Validation](#3-critical-redirect-uri-validation)
4. [High: PKCE Implementation](#4-high-pkce-implementation)
5. [High: Token Exposure in URLs](#5-high-token-exposure-in-urls)
6. [High: Secure SAML XML Parsing](#6-high-secure-saml-xml-parsing)
7. [Medium: Session Regeneration](#7-medium-session-regeneration)
8. [Medium: CSRF Protection](#8-medium-csrf-protection)
9. [Medium: Cookie Security Hardening](#9-medium-cookie-security-hardening)
10. [Validation & Testing](#10-validation--testing)

---

## 1. Critical: SAML Signature Validation

### Vulnerability Description

The current SAML validator returns `true` when a signature is missing, allowing attackers to forge unsigned assertions.

**File:** `services/auth-svc/src/sso/saml-validator.ts`

### Vulnerable Code Pattern

```typescript
// ❌ VULNERABLE: Skips validation if no signature present
function validateSamlSignature(assertion: string, cert: string): boolean {
  const signature = extractSignature(assertion);
  if (!signature) {
    // This allows unsigned assertions!
    return true; // ← CRITICAL: Never return true for missing signatures
  }
  return verifySignature(assertion, signature, cert);
}
```

### Secure Implementation

```typescript
// ✅ SECURE: Require signatures always
import { SignedXml } from 'xml-crypto';
import { DOMParser } from '@xmldom/xmldom';

interface SAMLValidationResult {
  valid: boolean;
  error?: string;
  assertions?: Record<string, unknown>;
}

interface SAMLValidatorConfig {
  requireSignature: boolean; // Must be true in production
  trustedIssuers: string[];
  idpCertificates: Map<string, string>;
  maxClockSkewSeconds: number;
  replayProtectionWindowSeconds: number;
}

export class SecureSAMLValidator {
  private config: SAMLValidatorConfig;
  private usedAssertionIds: Set<string> = new Set();

  constructor(config: SAMLValidatorConfig) {
    // Enforce signature requirement
    if (!config.requireSignature) {
      throw new Error('SAML signature validation MUST be enabled');
    }
    this.config = config;
  }

  async validateAssertion(
    samlResponse: string,
    expectedAudience: string
  ): Promise<SAMLValidationResult> {
    try {
      // Parse XML securely (no external entities)
      const doc = new DOMParser({
        errorHandler: {
          error: (msg) => {
            throw new Error(`XML Parse Error: ${msg}`);
          },
          fatalError: (msg) => {
            throw new Error(`XML Fatal Error: ${msg}`);
          },
        },
      }).parseFromString(samlResponse, 'text/xml');

      // 1. Validate signature exists and is valid
      const signatureValidation = this.validateSignature(doc, samlResponse);
      if (!signatureValidation.valid) {
        return signatureValidation;
      }

      // 2. Extract and validate issuer
      const issuer = this.extractIssuer(doc);
      if (!this.config.trustedIssuers.includes(issuer)) {
        return { valid: false, error: `Untrusted issuer: ${issuer}` };
      }

      // 3. Validate audience restriction
      const audience = this.extractAudience(doc);
      if (audience !== expectedAudience) {
        return {
          valid: false,
          error: `Audience mismatch: expected ${expectedAudience}, got ${audience}`,
        };
      }

      // 4. Validate time conditions (NotBefore, NotOnOrAfter)
      const timeValidation = this.validateTimeConditions(doc);
      if (!timeValidation.valid) {
        return timeValidation;
      }

      // 5. Check for replay attacks (InResponseTo, AssertionID)
      const replayCheck = this.checkReplayProtection(doc);
      if (!replayCheck.valid) {
        return replayCheck;
      }

      // 6. Extract user attributes
      const assertions = this.extractAssertions(doc);

      return { valid: true, assertions };
    } catch (error) {
      return {
        valid: false,
        error: `SAML validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private validateSignature(doc: Document, xml: string): SAMLValidationResult {
    // Find signature element
    const signatures = doc.getElementsByTagNameNS(
      'http://www.w3.org/2000/09/xmldsig#',
      'Signature'
    );

    // ✅ CRITICAL: Require signature
    if (signatures.length === 0) {
      return { valid: false, error: 'SAML response must be signed - no signature found' };
    }

    // Get the IdP certificate for this issuer
    const issuer = this.extractIssuer(doc);
    const cert = this.config.idpCertificates.get(issuer);
    if (!cert) {
      return { valid: false, error: `No certificate configured for issuer: ${issuer}` };
    }

    // Use xml-crypto for proper signature validation
    const sig = new SignedXml();
    sig.keyInfoProvider = {
      getKey: () => Buffer.from(cert),
      getKeyInfo: () => '',
    };

    sig.loadSignature(signatures[0].toString());

    // Verify signature covers the assertion
    const isValid = sig.checkSignature(xml);
    if (!isValid) {
      return {
        valid: false,
        error: `Invalid signature: ${sig.validationErrors.join(', ')}`,
      };
    }

    // Verify what was signed (prevent signature wrapping)
    const signedReferences = sig.getReferences().map((ref) => ref.uri);
    const assertionId = this.extractAssertionId(doc);

    if (!signedReferences.some((ref) => ref === '' || ref === `#${assertionId}`)) {
      return {
        valid: false,
        error: 'Signature does not cover the assertion (signature wrapping attack detected)',
      };
    }

    return { valid: true };
  }

  private validateTimeConditions(doc: Document): SAMLValidationResult {
    const conditions = doc.getElementsByTagNameNS(
      'urn:oasis:names:tc:SAML:2.0:assertion',
      'Conditions'
    )[0];

    if (!conditions) {
      return { valid: false, error: 'Missing Conditions element' };
    }

    const now = Date.now();
    const skew = this.config.maxClockSkewSeconds * 1000;

    const notBefore = conditions.getAttribute('NotBefore');
    if (notBefore && new Date(notBefore).getTime() > now + skew) {
      return { valid: false, error: 'Assertion not yet valid (NotBefore)' };
    }

    const notOnOrAfter = conditions.getAttribute('NotOnOrAfter');
    if (notOnOrAfter && new Date(notOnOrAfter).getTime() < now - skew) {
      return { valid: false, error: 'Assertion expired (NotOnOrAfter)' };
    }

    return { valid: true };
  }

  private checkReplayProtection(doc: Document): SAMLValidationResult {
    const assertionId = this.extractAssertionId(doc);

    if (this.usedAssertionIds.has(assertionId)) {
      return { valid: false, error: 'Assertion replay detected' };
    }

    // Store for replay protection window
    this.usedAssertionIds.add(assertionId);

    // Clean up old IDs (in production, use Redis with TTL)
    setTimeout(() => {
      this.usedAssertionIds.delete(assertionId);
    }, this.config.replayProtectionWindowSeconds * 1000);

    return { valid: true };
  }

  // Helper methods (implement based on your SAML structure)
  private extractIssuer(doc: Document): string {
    const issuer = doc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'Issuer')[0];
    return issuer?.textContent || '';
  }

  private extractAudience(doc: Document): string {
    const audience = doc.getElementsByTagNameNS(
      'urn:oasis:names:tc:SAML:2.0:assertion',
      'Audience'
    )[0];
    return audience?.textContent || '';
  }

  private extractAssertionId(doc: Document): string {
    const assertion = doc.getElementsByTagNameNS(
      'urn:oasis:names:tc:SAML:2.0:assertion',
      'Assertion'
    )[0];
    return assertion?.getAttribute('ID') || '';
  }

  private extractAssertions(doc: Document): Record<string, unknown> {
    // Extract attributes from AttributeStatement
    const attributes: Record<string, unknown> = {};
    const attrElements = doc.getElementsByTagNameNS(
      'urn:oasis:names:tc:SAML:2.0:assertion',
      'Attribute'
    );

    for (let i = 0; i < attrElements.length; i++) {
      const attr = attrElements[i];
      const name = attr.getAttribute('Name');
      const values = attr.getElementsByTagNameNS(
        'urn:oasis:names:tc:SAML:2.0:assertion',
        'AttributeValue'
      );

      if (name && values.length > 0) {
        attributes[name] =
          values.length === 1
            ? values[0].textContent
            : Array.from(values).map((v) => v.textContent);
      }
    }

    return attributes;
  }
}
```

### Required Dependencies

```bash
pnpm add xml-crypto @xmldom/xmldom
pnpm add -D @types/xml-crypto
```

---

## 2. Critical: Hardcoded Encryption Keys

### Vulnerability Description

Hardcoded fallback encryption keys in the SSO state handler can be extracted from source code.

**File:** `services/auth-svc/src/sso/state.ts`

### Vulnerable Code Pattern

```typescript
// ❌ VULNERABLE: Hardcoded fallback key
const STATE_ENCRYPTION_KEY =
  process.env.SSO_STATE_KEY || 'aivo-sso-state-fallback-key-CHANGE-IN-PROD';
```

### Secure Implementation

```typescript
// ✅ SECURE: Fail if key not configured
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

interface StateConfig {
  encryptionKey: string;
  maxAgeSeconds: number;
}

function validateEncryptionKey(key: string): Buffer {
  if (!key) {
    throw new Error('SSO_STATE_ENCRYPTION_KEY environment variable is required');
  }

  if (key.includes('fallback') || key.includes('CHANGE') || key.includes('default')) {
    throw new Error('SSO_STATE_ENCRYPTION_KEY appears to be a placeholder value');
  }

  // Derive a 256-bit key using SHA-256 (or use a 32-byte key directly)
  const derivedKey = createHash('sha256').update(key).digest();
  return derivedKey;
}

export class SecureStateManager {
  private readonly key: Buffer;
  private readonly maxAge: number;
  private readonly usedStates: Set<string> = new Set();

  constructor(config: StateConfig) {
    this.key = validateEncryptionKey(config.encryptionKey);
    this.maxAge = config.maxAgeSeconds;
  }

  /**
   * Generate encrypted state parameter
   */
  createState(data: {
    nonce: string;
    redirectUri: string;
    provider: string;
    codeVerifier?: string; // For PKCE
  }): string {
    const payload = JSON.stringify({
      ...data,
      createdAt: Date.now(),
      id: randomBytes(16).toString('hex'),
    });

    // AES-256-GCM provides authenticated encryption
    const iv = randomBytes(12); // 96-bit IV for GCM
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);

    const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Combine: IV (12) + AuthTag (16) + Encrypted
    const combined = Buffer.concat([iv, authTag, encrypted]);
    return combined.toString('base64url');
  }

  /**
   * Decrypt and validate state parameter
   */
  validateState(state: string): {
    valid: boolean;
    error?: string;
    data?: {
      nonce: string;
      redirectUri: string;
      provider: string;
      codeVerifier?: string;
      id: string;
      createdAt: number;
    };
  } {
    try {
      const combined = Buffer.from(state, 'base64url');

      if (combined.length < 28) {
        return { valid: false, error: 'Invalid state format' };
      }

      const iv = combined.subarray(0, 12);
      const authTag = combined.subarray(12, 28);
      const encrypted = combined.subarray(28);

      const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

      const data = JSON.parse(decrypted.toString('utf8'));

      // Check expiration
      const age = Date.now() - data.createdAt;
      if (age > this.maxAge * 1000) {
        return { valid: false, error: 'State expired' };
      }

      // Check for replay
      if (this.usedStates.has(data.id)) {
        return { valid: false, error: 'State already used (replay attack)' };
      }

      // Mark as used
      this.usedStates.add(data.id);
      setTimeout(() => this.usedStates.delete(data.id), this.maxAge * 1000);

      return { valid: true, data };
    } catch (error) {
      return {
        valid: false,
        error: 'State validation failed (tampering detected)',
      };
    }
  }
}

// Factory function for production use
export function createStateManager(): SecureStateManager {
  const key = process.env.SSO_STATE_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      'Missing required environment variable: SSO_STATE_ENCRYPTION_KEY\n' +
        'Generate a secure key with: openssl rand -base64 32'
    );
  }

  return new SecureStateManager({
    encryptionKey: key,
    maxAgeSeconds: 300, // 5 minutes max
  });
}
```

### Environment Configuration

```bash
# Generate a secure key
openssl rand -base64 32

# .env (never commit!)
SSO_STATE_ENCRYPTION_KEY=your-generated-32-byte-key
```

---

## 3. Critical: Redirect URI Validation

### Vulnerability Description

Redirect URIs are not validated against a whitelist, allowing open redirect attacks.

**File:** `services/auth-svc/src/sso/service.ts`

### Vulnerable Code Pattern

```typescript
// ❌ VULNERABLE: No whitelist validation
function validateRedirectUri(uri: string): boolean {
  try {
    new URL(uri); // Only validates URL format
    return true;
  } catch {
    return false;
  }
}
```

### Secure Implementation

```typescript
// ✅ SECURE: Strict whitelist validation
interface RedirectConfig {
  allowedDomains: string[];
  allowedPaths: RegExp[];
  requireHttps: boolean;
}

export class RedirectValidator {
  private config: RedirectConfig;

  constructor(config: RedirectConfig) {
    this.config = config;
  }

  /**
   * Validate redirect URI against whitelist
   */
  validate(redirectUri: string): { valid: boolean; error?: string } {
    try {
      const url = new URL(redirectUri);

      // 1. Require HTTPS in production
      if (this.config.requireHttps && url.protocol !== 'https:') {
        return { valid: false, error: 'Redirect URI must use HTTPS' };
      }

      // 2. Validate domain against whitelist (exact match or subdomain)
      const isAllowedDomain = this.config.allowedDomains.some((domain) => {
        if (domain.startsWith('*.')) {
          const baseDomain = domain.slice(2);
          return url.hostname === baseDomain || url.hostname.endsWith(`.${baseDomain}`);
        }
        return url.hostname === domain;
      });

      if (!isAllowedDomain) {
        return {
          valid: false,
          error: `Domain not allowed: ${url.hostname}`,
        };
      }

      // 3. Validate path if patterns specified
      if (this.config.allowedPaths.length > 0) {
        const isAllowedPath = this.config.allowedPaths.some((pattern) =>
          pattern.test(url.pathname)
        );
        if (!isAllowedPath) {
          return {
            valid: false,
            error: `Path not allowed: ${url.pathname}`,
          };
        }
      }

      // 4. Block dangerous patterns
      if (url.username || url.password) {
        return { valid: false, error: 'Credentials in URL not allowed' };
      }

      // 5. Normalize and return
      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  /**
   * Get validated redirect URI or throw
   */
  getValidatedUri(redirectUri: string): string {
    const result = this.validate(redirectUri);
    if (!result.valid) {
      throw new Error(`Invalid redirect URI: ${result.error}`);
    }
    return redirectUri;
  }
}

// Factory with tenant-specific configuration
export function createRedirectValidator(tenantId: string): RedirectValidator {
  // In production, load from database per tenant
  const tenantConfig = getTenantRedirectConfig(tenantId);

  return new RedirectValidator({
    allowedDomains: tenantConfig.allowedDomains,
    allowedPaths: [/^\/auth\/callback$/, /^\/oauth\/callback$/, /^\/sso\/callback$/],
    requireHttps: process.env.NODE_ENV === 'production',
  });
}

// Example tenant configuration (store in database)
function getTenantRedirectConfig(tenantId: string): {
  allowedDomains: string[];
} {
  // This should be fetched from database
  const configs: Record<string, { allowedDomains: string[] }> = {
    'district-123': {
      allowedDomains: ['app.district123.k12.edu', '*.district123.k12.edu'],
    },
    default: {
      allowedDomains: ['app.aivo.com', 'staging.aivo.com'],
    },
  };

  return configs[tenantId] || configs['default'];
}
```

---

## 4. High: PKCE Implementation

### Vulnerability Description

OAuth authorization code flow without PKCE is vulnerable to authorization code interception.

**File:** `services/auth-svc/src/sso/oidc-validator.ts`

### Secure Implementation

```typescript
// ✅ SECURE: Full PKCE implementation
import { randomBytes, createHash } from 'crypto';

export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

/**
 * Generate PKCE code verifier and challenge
 */
export function generatePKCE(): PKCEChallenge {
  // Generate 32 bytes (256 bits) of randomness
  const codeVerifier = randomBytes(32)
    .toString('base64url')
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 43); // RFC 7636: 43-128 characters

  // S256: BASE64URL(SHA256(verifier))
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256',
  };
}

/**
 * Verify PKCE code verifier matches challenge
 */
export function verifyPKCE(
  codeVerifier: string,
  codeChallenge: string,
  method: 'S256' | 'plain' = 'S256'
): boolean {
  if (method === 'plain') {
    // Plain method should be rejected in production
    console.warn('PKCE plain method is insecure');
    return codeVerifier === codeChallenge;
  }

  // S256 verification
  const computedChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

  return computedChallenge === codeChallenge;
}

// Updated OAuth flow with PKCE
export class SecureOAuthFlow {
  private stateManager: SecureStateManager;
  private redirectValidator: RedirectValidator;

  constructor(stateManager: SecureStateManager, redirectValidator: RedirectValidator) {
    this.stateManager = stateManager;
    this.redirectValidator = redirectValidator;
  }

  /**
   * Start OAuth flow with PKCE
   */
  initiateFlow(params: {
    provider: 'google' | 'microsoft' | 'clever' | 'classlink';
    redirectUri: string;
    scopes: string[];
    tenantId: string;
  }): { authorizationUrl: string; state: string } {
    // Validate redirect URI
    this.redirectValidator.getValidatedUri(params.redirectUri);

    // Generate PKCE challenge
    const pkce = generatePKCE();

    // Generate cryptographic nonce
    const nonce = randomBytes(16).toString('hex');

    // Create encrypted state with PKCE verifier
    const state = this.stateManager.createState({
      nonce,
      redirectUri: params.redirectUri,
      provider: params.provider,
      codeVerifier: pkce.codeVerifier, // Stored securely in state
    });

    // Build authorization URL
    const providerConfig = getProviderConfig(params.provider);
    const authUrl = new URL(providerConfig.authorizationEndpoint);

    authUrl.searchParams.set('client_id', providerConfig.clientId);
    authUrl.searchParams.set('redirect_uri', params.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', params.scopes.join(' '));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);
    authUrl.searchParams.set('code_challenge', pkce.codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    return {
      authorizationUrl: authUrl.toString(),
      state,
    };
  }

  /**
   * Handle OAuth callback with PKCE verification
   */
  async handleCallback(params: {
    code: string;
    state: string;
    returnedRedirectUri: string;
  }): Promise<{ accessToken: string; idToken: string; refreshToken?: string }> {
    // Validate and decrypt state
    const stateResult = this.stateManager.validateState(params.state);
    if (!stateResult.valid || !stateResult.data) {
      throw new Error(`Invalid state: ${stateResult.error}`);
    }

    const { provider, codeVerifier, redirectUri, nonce } = stateResult.data;

    // Verify redirect URI matches
    if (redirectUri !== params.returnedRedirectUri) {
      throw new Error('Redirect URI mismatch');
    }

    // Exchange code for tokens with PKCE verifier
    const providerConfig = getProviderConfig(provider);

    const tokenResponse = await fetch(providerConfig.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: params.code,
        redirect_uri: redirectUri,
        client_id: providerConfig.clientId,
        client_secret: providerConfig.clientSecret,
        code_verifier: codeVerifier!, // PKCE verification
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const tokens = await tokenResponse.json();

    // Validate ID token (including nonce)
    await this.validateIdToken(tokens.id_token, nonce, provider);

    return {
      accessToken: tokens.access_token,
      idToken: tokens.id_token,
      refreshToken: tokens.refresh_token,
    };
  }

  private async validateIdToken(
    idToken: string,
    expectedNonce: string,
    provider: string
  ): Promise<void> {
    // Use jose library for JWT validation
    const { createRemoteJWKSet, jwtVerify } = await import('jose');

    const providerConfig = getProviderConfig(provider);
    const JWKS = createRemoteJWKSet(new URL(providerConfig.jwksUri));

    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: providerConfig.issuer,
      audience: providerConfig.clientId,
    });

    // Verify nonce
    if (payload.nonce !== expectedNonce) {
      throw new Error('ID token nonce mismatch');
    }
  }
}

// Provider configuration (store securely)
function getProviderConfig(provider: string): {
  clientId: string;
  clientSecret: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksUri: string;
  issuer: string;
} {
  const configs: Record<string, any> = {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
      issuer: 'https://accounts.google.com',
    },
    microsoft: {
      clientId: process.env.AZURE_CLIENT_ID!,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
      authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      jwksUri: 'https://login.microsoftonline.com/common/discovery/v2.0/keys',
      issuer: 'https://login.microsoftonline.com/{tenantid}/v2.0',
    },
    // Add clever, classlink configurations
  };

  return configs[provider];
}
```

---

## 5. High: Token Exposure in URLs

### Vulnerability Description

Access and refresh tokens passed in URL query parameters can leak via Referer headers, browser history, and logs.

### Vulnerable Code Pattern

```typescript
// ❌ VULNERABLE: Tokens in URL
res.redirect(`${redirectUri}?access_token=${accessToken}&refresh_token=${refreshToken}`);
```

### Secure Implementation

```typescript
// ✅ SECURE: Use authorization code pattern with secure cookies
import { Response } from 'express';

interface SecureTokenDelivery {
  /**
   * Never pass tokens in URLs. Use one of:
   * 1. Authorization code exchange (backend)
   * 2. Secure HTTP-only cookies
   * 3. POST message to parent frame
   */
  deliverTokens(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
    redirectUri: string
  ): void;
}

export class SecureTokenHandler implements SecureTokenDelivery {
  deliverTokens(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
    redirectUri: string
  ): void {
    // Option 1: Set secure cookies and redirect with code
    const authCode = this.generateOneTimeCode(tokens);

    // Store tokens temporarily with code
    this.storeTokensForCode(authCode, tokens);

    // Set refresh token in HTTP-only cookie
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth',
    });

    // Redirect with only the authorization code
    res.redirect(`${redirectUri}?code=${authCode}`);
  }

  /**
   * Client exchanges code for access token via POST
   */
  async exchangeCode(code: string): Promise<{ accessToken: string }> {
    const tokens = await this.getTokensForCode(code);
    if (!tokens) {
      throw new Error('Invalid or expired code');
    }

    // Code is single-use
    await this.deleteCodeTokens(code);

    return { accessToken: tokens.accessToken };
  }

  private generateOneTimeCode(tokens: { accessToken: string; refreshToken: string }): string {
    return randomBytes(32).toString('hex');
  }

  private async storeTokensForCode(
    code: string,
    tokens: { accessToken: string; refreshToken: string }
  ): Promise<void> {
    // Store in Redis with 60-second TTL
    // await redis.setex(`auth_code:${code}`, 60, JSON.stringify(tokens));
  }

  private async getTokensForCode(
    code: string
  ): Promise<{ accessToken: string; refreshToken: string } | null> {
    // Retrieve from Redis
    // const data = await redis.get(`auth_code:${code}`);
    // return data ? JSON.parse(data) : null;
    return null;
  }

  private async deleteCodeTokens(code: string): Promise<void> {
    // await redis.del(`auth_code:${code}`);
  }
}
```

---

## 6. High: Secure SAML XML Parsing

### Vulnerability Description

Regex-based XML parsing is vulnerable to signature wrapping and XXE attacks.

### Secure Implementation

```typescript
// ✅ SECURE: Proper XML parsing with security controls
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { SignedXml } from 'xml-crypto';

interface SecureXMLParserConfig {
  disableDTD: boolean;
  maxEntityExpansions: number;
  maxDepth: number;
}

export function parseXMLSecurely(
  xml: string,
  config: SecureXMLParserConfig = {
    disableDTD: true,
    maxEntityExpansions: 0,
    maxDepth: 50,
  }
): Document {
  // Reject XML with DTD (XXE prevention)
  if (config.disableDTD && /<!DOCTYPE/i.test(xml)) {
    throw new Error('DTD declarations are not allowed');
  }

  // Reject entity references (XXE prevention)
  if (/<!ENTITY/i.test(xml)) {
    throw new Error('Entity declarations are not allowed');
  }

  // Check for excessive nesting
  let depth = 0;
  let maxFound = 0;
  for (const char of xml) {
    if (char === '<' && xml[xml.indexOf(char) + 1] !== '/') depth++;
    if (char === '<' && xml[xml.indexOf(char) + 1] === '/') depth--;
    maxFound = Math.max(maxFound, depth);
    if (maxFound > config.maxDepth) {
      throw new Error('XML exceeds maximum depth');
    }
  }

  const parser = new DOMParser({
    errorHandler: {
      error: (msg: string) => {
        throw new Error(`XML parsing error: ${msg}`);
      },
      fatalError: (msg: string) => {
        throw new Error(`XML fatal error: ${msg}`);
      },
      warning: () => {}, // Ignore warnings
    },
  });

  return parser.parseFromString(xml, 'text/xml');
}

/**
 * Verify XML signature with wrapping attack prevention
 */
export function verifyXMLSignature(
  doc: Document,
  xml: string,
  certificate: string
): { valid: boolean; error?: string } {
  const signatures = doc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature');

  if (signatures.length === 0) {
    return { valid: false, error: 'No signature found' };
  }

  if (signatures.length > 1) {
    return { valid: false, error: 'Multiple signatures not supported' };
  }

  const sig = new SignedXml();

  sig.keyInfoProvider = {
    getKey: () => Buffer.from(certificate),
    getKeyInfo: () => '',
  };

  sig.loadSignature(signatures[0]);

  // Check what was signed
  const references = sig.getReferences();
  if (references.length === 0) {
    return { valid: false, error: 'No signature references' };
  }

  // Verify the reference points to the assertion
  const assertionElements = doc.getElementsByTagNameNS(
    'urn:oasis:names:tc:SAML:2.0:assertion',
    'Assertion'
  );

  if (assertionElements.length !== 1) {
    return { valid: false, error: 'Expected exactly one Assertion element' };
  }

  const assertionId = assertionElements[0].getAttribute('ID');
  const referenceUri = references[0].uri;

  // Verify signature covers the assertion
  if (referenceUri !== '' && referenceUri !== `#${assertionId}`) {
    return {
      valid: false,
      error: 'Signature does not reference the Assertion',
    };
  }

  // Verify signature
  const isValid = sig.checkSignature(xml);
  if (!isValid) {
    return {
      valid: false,
      error: `Signature invalid: ${sig.validationErrors.join(', ')}`,
    };
  }

  return { valid: true };
}
```

---

## 7. Medium: Session Regeneration

### Vulnerability Description

Session IDs are not regenerated after authentication, enabling session fixation attacks.

### Secure Implementation

```typescript
// ✅ SECURE: Session regeneration on authentication
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

interface SessionData {
  id: string;
  userId?: string;
  createdAt: number;
  authenticatedAt?: number;
  ipAddress: string;
  userAgent: string;
}

export class SecureSessionManager {
  private sessionStore: SessionStore;

  constructor(sessionStore: SessionStore) {
    this.sessionStore = sessionStore;
  }

  /**
   * Regenerate session ID on authentication
   */
  async regenerateOnAuth(req: Request, res: Response, userId: string): Promise<string> {
    const oldSessionId = req.cookies.session_id;

    // 1. Create new session
    const newSessionId = randomUUID();
    const newSession: SessionData = {
      id: newSessionId,
      userId,
      createdAt: Date.now(),
      authenticatedAt: Date.now(),
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
    };

    // 2. Store new session
    await this.sessionStore.set(newSessionId, newSession);

    // 3. Invalidate old session
    if (oldSessionId) {
      await this.sessionStore.delete(oldSessionId);
    }

    // 4. Set new session cookie
    res.cookie('session_id', newSessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return newSessionId;
  }

  /**
   * Regenerate on privilege escalation
   */
  async regenerateOnPrivilegeChange(req: Request, res: Response): Promise<string> {
    const session = await this.getSession(req);
    if (!session?.userId) {
      throw new Error('Not authenticated');
    }

    return this.regenerateOnAuth(req, res, session.userId);
  }

  /**
   * Validate session
   */
  async getSession(req: Request): Promise<SessionData | null> {
    const sessionId = req.cookies.session_id;
    if (!sessionId) return null;

    const session = await this.sessionStore.get(sessionId);
    if (!session) return null;

    // Check session age
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - session.createdAt > maxAge) {
      await this.sessionStore.delete(sessionId);
      return null;
    }

    return session;
  }
}

// Express middleware
export function sessionMiddleware(
  sessionManager: SecureSessionManager
): (req: Request, res: Response, next: NextFunction) => void {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.session = await sessionManager.getSession(req);
      next();
    } catch (error) {
      next(error);
    }
  };
}
```

---

## 8. Medium: CSRF Protection

### Vulnerability Description

State-changing operations rely solely on SameSite cookies without explicit CSRF tokens.

### Secure Implementation

```typescript
// ✅ SECURE: Double-submit cookie CSRF protection
import { Request, Response, NextFunction } from 'express';
import { randomBytes, createHmac } from 'crypto';

interface CSRFConfig {
  secret: string;
  cookieName: string;
  headerName: string;
  maxAgeSeconds: number;
}

export class CSRFProtection {
  private config: CSRFConfig;

  constructor(config: CSRFConfig) {
    this.config = config;
  }

  /**
   * Generate CSRF token and set cookie
   */
  generateToken(res: Response, sessionId: string): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(16).toString('hex');
    const payload = `${sessionId}.${timestamp}.${random}`;

    const signature = createHmac('sha256', this.config.secret).update(payload).digest('hex');

    const token = `${payload}.${signature}`;

    // Set CSRF cookie
    res.cookie(this.config.cookieName, token, {
      httpOnly: false, // JavaScript needs to read this
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: this.config.maxAgeSeconds * 1000,
      path: '/',
    });

    return token;
  }

  /**
   * Validate CSRF token from header matches cookie
   */
  validateToken(req: Request): { valid: boolean; error?: string } {
    const cookieToken = req.cookies[this.config.cookieName];
    const headerToken = req.get(this.config.headerName);

    if (!cookieToken || !headerToken) {
      return { valid: false, error: 'Missing CSRF token' };
    }

    if (cookieToken !== headerToken) {
      return { valid: false, error: 'CSRF token mismatch' };
    }

    // Verify signature
    const parts = cookieToken.split('.');
    if (parts.length !== 4) {
      return { valid: false, error: 'Invalid token format' };
    }

    const [sessionId, timestamp, random, signature] = parts;
    const payload = `${sessionId}.${timestamp}.${random}`;

    const expectedSignature = createHmac('sha256', this.config.secret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid token signature' };
    }

    // Check expiration
    const tokenTime = parseInt(timestamp, 36);
    if (Date.now() - tokenTime > this.config.maxAgeSeconds * 1000) {
      return { valid: false, error: 'Token expired' };
    }

    return { valid: true };
  }

  /**
   * Express middleware for CSRF protection
   */
  middleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      // Skip safe methods
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }

      const result = this.validateToken(req);
      if (!result.valid) {
        return res.status(403).json({
          error: 'CSRF validation failed',
          message: result.error,
        });
      }

      next();
    };
  }
}
```

---

## 9. Medium: Cookie Security Hardening

### Vulnerability Description

Cookies missing `__Host-` prefix and some security attributes.

### Secure Implementation

```typescript
// ✅ SECURE: Hardened cookie configuration
import { CookieOptions, Response } from 'express';

interface SecureCookieConfig {
  name: string;
  value: string;
  maxAgeSeconds?: number;
  path?: string;
}

export class SecureCookieHandler {
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Set session cookie with __Host- prefix (most secure)
   */
  setSessionCookie(res: Response, config: SecureCookieConfig): void {
    const cookieName = this.isProduction ? `__Host-${config.name}` : config.name;

    const options: CookieOptions = {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'strict',
      path: '/', // Required for __Host- prefix
      maxAge: config.maxAgeSeconds ? config.maxAgeSeconds * 1000 : undefined,
    };

    res.cookie(cookieName, config.value, options);
  }

  /**
   * Set refresh token cookie with __Secure- prefix
   */
  setRefreshTokenCookie(res: Response, config: SecureCookieConfig): void {
    const cookieName = this.isProduction ? `__Secure-${config.name}` : config.name;

    const options: CookieOptions = {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'strict',
      path: config.path || '/api/auth/refresh',
      maxAge: config.maxAgeSeconds ? config.maxAgeSeconds * 1000 : 7 * 24 * 60 * 60 * 1000, // 7 days default
    };

    res.cookie(cookieName, config.value, options);
  }

  /**
   * Clear all auth cookies
   */
  clearAuthCookies(res: Response): void {
    const prefixes = this.isProduction ? ['__Host-', '__Secure-', ''] : [''];
    const cookieNames = ['session_id', 'refresh_token', 'csrf_token'];

    for (const prefix of prefixes) {
      for (const name of cookieNames) {
        res.clearCookie(`${prefix}${name}`, {
          httpOnly: true,
          secure: this.isProduction,
          sameSite: 'strict',
          path: '/',
        });
      }
    }
  }
}
```

---

## 10. Validation & Testing

### Running the Vulnerability Scanner

```bash
# Run scanner
pnpm tsx scripts/security/sso-vulnerability-scan.ts

# Generate reports
pnpm tsx scripts/security/sso-vulnerability-scan.ts --json=scan-results.json
pnpm tsx scripts/security/sso-vulnerability-scan.ts --md=docs/security/scan-report.md
```

### Security Test Checklist

After implementing fixes, verify:

- [ ] SAML assertions without signatures are rejected
- [ ] State parameter tampering is detected
- [ ] Redirect URIs outside whitelist are rejected
- [ ] PKCE code verifier is required for token exchange
- [ ] Tokens are not visible in URL or logs
- [ ] Session IDs change after authentication
- [ ] CSRF tokens are validated on state-changing operations
- [ ] Cookies have appropriate security flags

### CI/CD Integration

```yaml
# .github/workflows/security-scan.yml
name: SSO Security Scan

on:
  push:
    paths:
      - 'services/auth-svc/**'
      - 'services/lti-svc/**'
      - 'libs/ts-shared/src/auth/**'

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: pnpm install

      - name: Run SSO vulnerability scan
        run: pnpm tsx scripts/security/sso-vulnerability-scan.ts --json=scan-results.json

      - name: Upload scan results
        uses: actions/upload-artifact@v4
        with:
          name: security-scan-results
          path: scan-results.json

      - name: Fail on critical findings
        run: |
          CRITICAL=$(jq '.summary.critical' scan-results.json)
          if [ "$CRITICAL" -gt 0 ]; then
            echo "❌ Critical vulnerabilities found!"
            exit 1
          fi
```

---

## References

- [OWASP OAuth Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OAuth_Cheat_Sheet.html)
- [OWASP SAML Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SAML_Security_Cheat_Sheet.html)
- [RFC 7636 - PKCE](https://datatracker.ietf.org/doc/html/rfc7636)
- [IMS Global LTI 1.3 Security](https://www.imsglobal.org/spec/security/v1p0/)
- [NIST SP 800-63B - Authentication Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
