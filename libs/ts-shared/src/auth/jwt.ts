/**
 * JWT Service for AIVO Platform
 * Handles token generation, verification, and management using RS256 algorithm
 * @module @aivo/ts-shared/auth/jwt
 */

import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';

import {
  SignJWT,
  jwtVerify,
  importPKCS8,
  importSPKI,
  decodeJwt,
  type JWTPayload,
  type CryptoKey,
} from 'jose';

import type { TokenPayload, TokenPair, JWTConfig, ServiceTokenPayload } from './types.js';

/**
 * Parse TTL string to seconds
 * Supports: '15m', '1h', '7d', '30d'
 */
function parseTTL(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) {
    throw new Error(`Invalid TTL format: ${ttl}. Use format like '15m', '1h', '7d'`);
  }

  const value = Number.parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 24 * 60 * 60;
    default:
      throw new Error(`Unknown time unit: ${unit}`);
  }
}

/**
 * Load key from PEM string or file path
 */
function loadKey(keyOrPath: string): string {
  if (keyOrPath.includes('-----BEGIN')) {
    return keyOrPath;
  }
  return readFileSync(keyOrPath, 'utf-8');
}

/**
 * JWT Service class for token operations
 */
export class JWTService {
  private config: JWTConfig;
  private privateKeyPromise: Promise<CryptoKey> | null = null;
  private publicKeyPromise: Promise<CryptoKey> | null = null;

  constructor(config: JWTConfig) {
    this.config = config;
  }

  /**
   * Get cached key instances
   */
  private async getKeys(): Promise<{ privateKey: CryptoKey; publicKey: CryptoKey }> {
    if (!this.privateKeyPromise) {
      const privateKeyPem = loadKey(this.config.privateKey);
      this.privateKeyPromise = importPKCS8(privateKeyPem, 'RS256');
    }

    if (!this.publicKeyPromise) {
      const publicKeyPem = loadKey(this.config.publicKey);
      this.publicKeyPromise = importSPKI(publicKeyPem, 'RS256');
    }

    const [privateKey, publicKey] = await Promise.all([
      this.privateKeyPromise,
      this.publicKeyPromise,
    ]);

    return { privateKey, publicKey };
  }

  /**
   * Generate an access token
   */
  async generateAccessToken(payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>): Promise<string> {
    const { privateKey } = await this.getKeys();

    const token = await new SignJWT({ ...payload, type: 'access' as const })
      .setProtectedHeader({
        alg: 'RS256',
        kid: this.config.keyId,
      })
      .setSubject(payload.sub as string)
      .setIssuer(this.config.issuer)
      .setAudience(this.config.audience)
      .setIssuedAt()
      .setExpirationTime(this.config.accessTokenTTL)
      .setJti((payload.jti as string | undefined) || randomUUID())
      .sign(privateKey);

    return token;
  }

  /**
   * Generate a refresh token
   */
  async generateRefreshToken(
    payload: Pick<TokenPayload, 'sub' | 'sessionId' | 'tenantId'>
  ): Promise<string> {
    const { privateKey } = await this.getKeys();

    const token = await new SignJWT({
      ...payload,
      type: 'refresh' as const,
    })
      .setProtectedHeader({
        alg: 'RS256',
        kid: this.config.keyId,
      })
      .setSubject(payload.sub)
      .setIssuer(this.config.issuer)
      .setAudience(this.config.audience)
      .setIssuedAt()
      .setExpirationTime(this.config.refreshTokenTTL)
      .setJti(randomUUID())
      .sign(privateKey);

    return token;
  }

  /**
   * Generate both access and refresh tokens
   */
  async generateTokenPair(payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(payload),
      this.generateRefreshToken({
        sub: payload.sub as string,
        sessionId: payload.sessionId as string,
        tenantId: payload.tenantId as string,
      }),
    ]);

    const accessDecoded = decodeJwt(accessToken);
    const refreshDecoded = decodeJwt(refreshToken);

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: new Date((accessDecoded.exp ?? 0) * 1000),
      refreshTokenExpiresAt: new Date((refreshDecoded.exp ?? 0) * 1000),
    };
  }

  /**
   * Verify a token and return its payload
   */
  async verifyToken(
    token: string,
    expectedType: 'access' | 'refresh' | 'service' = 'access'
  ): Promise<TokenPayload | ServiceTokenPayload> {
    const { publicKey } = await this.getKeys();

    const { payload } = await jwtVerify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: this.config.issuer,
      audience: this.config.audience,
    });

    const typedPayload = payload as TokenPayload | ServiceTokenPayload;

    if (typedPayload.type !== expectedType) {
      throw new Error(`Invalid token type. Expected ${expectedType}, got ${typedPayload.type}`);
    }

    return typedPayload;
  }

  /**
   * Verify access token specifically
   */
  async verifyAccessToken(token: string): Promise<TokenPayload> {
    return (await this.verifyToken(token, 'access')) as TokenPayload;
  }

  /**
   * Verify refresh token specifically
   */
  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    return (await this.verifyToken(token, 'refresh')) as TokenPayload;
  }

  /**
   * Decode token without verification (for debugging/logging)
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      return decodeJwt(token);
    } catch {
      return null;
    }
  }

  /**
   * Generate service-to-service token
   */
  async generateServiceToken(serviceName: string, targetService: string): Promise<string> {
    const { privateKey } = await this.getKeys();

    const token = await new SignJWT({
      type: 'service' as const,
      service: serviceName,
      target: targetService,
    })
      .setProtectedHeader({
        alg: 'RS256',
        kid: this.config.keyId,
      })
      .setSubject(`service:${serviceName}`)
      .setIssuer(this.config.issuer)
      .setAudience(targetService)
      .setIssuedAt()
      .setExpirationTime('1h')
      .setJti(randomUUID())
      .sign(privateKey);

    return token;
  }

  /**
   * Verify service token
   */
  async verifyServiceToken(token: string, expectedTarget?: string): Promise<ServiceTokenPayload> {
    const { publicKey } = await this.getKeys();

    const { payload } = await jwtVerify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: this.config.issuer,
      ...(expectedTarget && { audience: expectedTarget }),
    });

    const typedPayload = payload as ServiceTokenPayload;

    if (typedPayload.type !== 'service') {
      throw new Error('Invalid token type. Expected service token.');
    }

    return typedPayload;
  }

  /**
   * Get expiration time in seconds for access token
   */
  getAccessTokenTTLSeconds(): number {
    return parseTTL(this.config.accessTokenTTL);
  }

  /**
   * Get expiration time in seconds for refresh token
   */
  getRefreshTokenTTLSeconds(): number {
    return parseTTL(this.config.refreshTokenTTL);
  }
}

// Singleton instance management
let jwtServiceInstance: JWTService | null = null;

/**
 * Get or create JWT service singleton
 */
export function getJWTService(config?: JWTConfig): JWTService {
  if (!jwtServiceInstance && config) {
    jwtServiceInstance = new JWTService(config);
  }

  if (!jwtServiceInstance) {
    throw new Error('JWTService not initialized. Call with config first.');
  }

  return jwtServiceInstance;
}

/**
 * Reset JWT service singleton (for testing)
 */
export function resetJWTService(): void {
  jwtServiceInstance = null;
}

export type { TokenPayload, TokenPair, JWTConfig, ServiceTokenPayload } from './types.js';
