/**
 * OIDC (OpenID Connect) SSO Implementation
 *
 * Handles OIDC authentication flows including:
 * - Authorization URL generation
 * - Token exchange
 * - ID Token validation (via JWKS)
 * - UserInfo fetching
 * - Claims extraction
 *
 * Security: Validates signatures via JWKS, nonce, issuer, audience.
 */

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

import type { OidcIdpConfig, SsoUserClaims, SsoResult } from './types.js';

// ============================================================================
// SECRETS RESOLVER
// ============================================================================

/**
 * Interface for resolving client secrets from KMS/Vault.
 * Implement this based on your secrets management solution.
 */
export interface SecretsResolver {
  getSecret(ref: string): Promise<string>;
}

// Default implementation that expects secrets in env vars
const defaultSecretsResolver: SecretsResolver = {
  async getSecret(ref: string): Promise<string> {
    // Format: env:SECRET_NAME or vault:path/to/secret
    if (ref.startsWith('env:')) {
      const envName = ref.slice(4);
      const value = process.env[envName];
      if (!value) {
        throw new Error(`Secret not found in env: ${envName}`);
      }
      return value;
    }
    throw new Error(`Unsupported secret reference format: ${ref}`);
  },
};

// ============================================================================
// OIDC SERVICE CONFIGURATION
// ============================================================================

export interface OidcServiceConfig {
  /** Secrets resolver for client secrets */
  secretsResolver?: SecretsResolver;
  /** Clock skew tolerance in seconds */
  clockSkewSeconds?: number;
  /** JWKS cache TTL in milliseconds */
  jwksCacheTtlMs?: number;
}

// ============================================================================
// OIDC SERVICE
// ============================================================================

export class OidcService {
  private config: Required<OidcServiceConfig>;
  private jwksCache = new Map<string, { jwks: ReturnType<typeof createRemoteJWKSet>; expiresAt: number }>();

  constructor(config: OidcServiceConfig = {}) {
    this.config = {
      secretsResolver: config.secretsResolver ?? defaultSecretsResolver,
      clockSkewSeconds: config.clockSkewSeconds ?? 300,
      jwksCacheTtlMs: config.jwksCacheTtlMs ?? 3600_000, // 1 hour
    };
  }

  // ==========================================================================
  // AUTHORIZATION URL
  // ==========================================================================

  /**
   * Generate the OIDC authorization URL for initiating SSO.
   */
  generateAuthorizationUrl(
    idpConfig: OidcIdpConfig,
    options: {
      redirectUri: string;
      state: string;
      nonce: string;
      loginHint?: string;
    }
  ): string {
    const url = new URL(idpConfig.authorizationEndpoint);

    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', idpConfig.clientId);
    url.searchParams.set('redirect_uri', options.redirectUri);
    url.searchParams.set('scope', idpConfig.scopes.join(' '));
    url.searchParams.set('state', options.state);
    url.searchParams.set('nonce', options.nonce);

    if (options.loginHint) {
      url.searchParams.set('login_hint', options.loginHint);
    }

    // Request specific claims if needed
    url.searchParams.set('prompt', 'login');

    return url.toString();
  }

  // ==========================================================================
  // TOKEN EXCHANGE
  // ==========================================================================

  /**
   * Exchange authorization code for tokens.
   */
  async exchangeCode(
    idpConfig: OidcIdpConfig,
    options: {
      code: string;
      redirectUri: string;
    }
  ): Promise<OidcTokenResponse> {
    const clientSecret = await this.config.secretsResolver.getSecret(idpConfig.clientSecretRef);

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: options.code,
      redirect_uri: options.redirectUri,
      client_id: idpConfig.clientId,
      client_secret: clientSecret,
    });

    const response = await fetch(idpConfig.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new OidcError('TOKEN_EXCHANGE_FAILED', `Token exchange failed: ${error}`);
    }

    const data = (await response.json()) as OidcTokenResponse;

    if (!data.id_token) {
      throw new OidcError('MISSING_ID_TOKEN', 'No ID token in response');
    }

    return data;
  }

  // ==========================================================================
  // ID TOKEN VALIDATION
  // ==========================================================================

  /**
   * Validate an OIDC ID token and extract claims.
   */
  async validateIdToken(
    idToken: string,
    idpConfig: OidcIdpConfig,
    options: {
      nonce: string;
    }
  ): Promise<SsoResult> {
    try {
      // Get JWKS
      const jwks = await this.getJwks(idpConfig.jwksUri);

      // Verify the token
      const { payload } = await jwtVerify(idToken, jwks, {
        issuer: idpConfig.issuer,
        audience: idpConfig.clientId,
        clockTolerance: this.config.clockSkewSeconds,
      });

      // Validate nonce
      if (payload.nonce !== options.nonce) {
        return {
          success: false,
          error: 'INVALID_TOKEN',
          message: 'Nonce mismatch',
        };
      }

      // Extract claims
      const claims = this.extractClaims(payload, idpConfig);
      if (!claims) {
        return {
          success: false,
          error: 'MISSING_CLAIMS',
          message: 'Required claims not found in ID token',
        };
      }

      // Map roles
      const mappedUser = this.mapUserClaims(claims, idpConfig);

      return {
        success: true,
        user: mappedUser,
        idpConfigId: idpConfig.id,
        tenantId: idpConfig.tenantId,
      };
    } catch (error) {
      if (error instanceof OidcError) {
        return {
          success: false,
          error: 'INVALID_TOKEN',
          message: error.message,
        };
      }

      // jose library errors
      const message = error instanceof Error ? error.message : 'Token validation failed';
      
      if (message.includes('expired')) {
        return {
          success: false,
          error: 'TOKEN_EXPIRED',
          message: 'ID token has expired',
        };
      }

      if (message.includes('issuer') || message.includes('iss')) {
        return {
          success: false,
          error: 'INVALID_ISSUER',
          message: 'Invalid token issuer',
        };
      }

      if (message.includes('audience') || message.includes('aud')) {
        return {
          success: false,
          error: 'INVALID_AUDIENCE',
          message: 'Invalid token audience',
        };
      }

      if (message.includes('signature')) {
        return {
          success: false,
          error: 'INVALID_SIGNATURE',
          message: 'Invalid token signature',
        };
      }

      return {
        success: false,
        error: 'UNKNOWN_ERROR',
        message,
      };
    }
  }

  // ==========================================================================
  // USERINFO
  // ==========================================================================

  /**
   * Fetch additional user info from the UserInfo endpoint.
   */
  async fetchUserInfo(
    idpConfig: OidcIdpConfig,
    accessToken: string
  ): Promise<Record<string, unknown> | null> {
    if (!idpConfig.userinfoEndpoint) {
      return null;
    }

    try {
      const response = await fetch(idpConfig.userinfoEndpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        console.warn('[OIDC] UserInfo fetch failed:', response.status);
        return null;
      }

      return (await response.json()) as Record<string, unknown>;
    } catch (error) {
      console.warn('[OIDC] UserInfo fetch error:', error);
      return null;
    }
  }

  // ==========================================================================
  // DISCOVERY
  // ==========================================================================

  /**
   * Discover OIDC configuration from well-known endpoint.
   */
  static async discover(issuerUrl: string): Promise<OidcDiscoveryDocument | null> {
    try {
      // Ensure URL doesn't end with slash
      const baseUrl = issuerUrl.replace(/\/$/, '');
      const discoveryUrl = `${baseUrl}/.well-known/openid-configuration`;

      const response = await fetch(discoveryUrl, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        return null;
      }

      return (await response.json()) as OidcDiscoveryDocument;
    } catch {
      return null;
    }
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private async getJwks(jwksUri: string): ReturnType<typeof createRemoteJWKSet> {
    const now = Date.now();
    const cached = this.jwksCache.get(jwksUri);

    if (cached && now < cached.expiresAt) {
      return cached.jwks;
    }

    const jwks = createRemoteJWKSet(new URL(jwksUri));
    this.jwksCache.set(jwksUri, {
      jwks,
      expiresAt: now + this.config.jwksCacheTtlMs,
    });

    return jwks;
  }

  private extractClaims(payload: JWTPayload, idpConfig: OidcIdpConfig): SsoUserClaims | null {
    // External ID (usually 'sub')
    const externalId = this.getClaimValue(payload, idpConfig.externalIdClaim);
    if (!externalId) {
      return null;
    }

    // Email
    const email = this.getClaimValue(payload, idpConfig.emailClaim);
    if (!email) {
      return null;
    }

    // Optional claims
    const name = this.getClaimValue(payload, idpConfig.nameClaim);
    const firstName = this.getClaimValue(payload, idpConfig.firstNameClaim);
    const lastName = this.getClaimValue(payload, idpConfig.lastNameClaim);

    // Roles (can be string or array)
    const rawRoles = this.getClaimValues(payload, idpConfig.roleClaim);

    return {
      externalId,
      email,
      name,
      firstName,
      lastName,
      rawRoles,
      additionalClaims: payload as Record<string, unknown>,
    };
  }

  private getClaimValue(payload: JWTPayload, claimName: string): string | undefined {
    const value = payload[claimName];
    if (typeof value === 'string') {
      return value;
    }
    if (Array.isArray(value) && value.length > 0) {
      return String(value[0]);
    }
    return undefined;
  }

  private getClaimValues(payload: JWTPayload, claimName: string): string[] {
    const value = payload[claimName];
    if (typeof value === 'string') {
      return [value];
    }
    if (Array.isArray(value)) {
      return value.map(String);
    }
    return [];
  }

  private mapUserClaims(
    claims: SsoUserClaims,
    idpConfig: OidcIdpConfig
  ): SsoUserClaims & { roles: string[] } {
    const roleMapping = idpConfig.roleMapping as Record<string, string>;
    const mappedRoles: string[] = [];

    for (const rawRole of claims.rawRoles) {
      const mapped = roleMapping[rawRole];
      if (mapped && !mappedRoles.includes(mapped)) {
        mappedRoles.push(mapped);
      }
    }

    // Default role if no roles mapped
    if (mappedRoles.length === 0) {
      mappedRoles.push(idpConfig.defaultRole);
    }

    return {
      ...claims,
      roles: mappedRoles,
    };
  }
}

// ============================================================================
// TYPES
// ============================================================================

export interface OidcTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
}

export interface OidcDiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  jwks_uri: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  claims_supported?: string[];
}

// ============================================================================
// ERRORS
// ============================================================================

export class OidcError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'OidcError';
  }
}
