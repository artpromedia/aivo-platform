/**
 * JWT Service for AIVO Platform
 * Handles token generation, verification, and management using RS256 algorithm
 * @module @aivo/ts-shared/auth/jwt
 */
import { type JWTPayload } from 'jose';
import type { TokenPayload, TokenPair, JWTConfig, ServiceTokenPayload } from './types.js';
/**
 * JWT Service class for token operations
 */
export declare class JWTService {
    private config;
    private privateKeyPromise;
    private publicKeyPromise;
    constructor(config: JWTConfig);
    /**
     * Get cached key instances
     */
    private getKeys;
    /**
     * Generate an access token
     */
    generateAccessToken(payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>): Promise<string>;
    /**
     * Generate a refresh token
     */
    generateRefreshToken(payload: Pick<TokenPayload, 'sub' | 'sessionId' | 'tenantId'>): Promise<string>;
    /**
     * Generate both access and refresh tokens
     */
    generateTokenPair(payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>): Promise<TokenPair>;
    /**
     * Verify a token and return its payload
     */
    verifyToken(token: string, expectedType?: 'access' | 'refresh' | 'service'): Promise<TokenPayload | ServiceTokenPayload>;
    /**
     * Verify access token specifically
     */
    verifyAccessToken(token: string): Promise<TokenPayload>;
    /**
     * Verify refresh token specifically
     */
    verifyRefreshToken(token: string): Promise<TokenPayload>;
    /**
     * Decode token without verification (for debugging/logging)
     */
    decodeToken(token: string): JWTPayload | null;
    /**
     * Generate service-to-service token
     */
    generateServiceToken(serviceName: string, targetService: string): Promise<string>;
    /**
     * Verify service token
     */
    verifyServiceToken(token: string, expectedTarget?: string): Promise<ServiceTokenPayload>;
    /**
     * Get expiration time in seconds for access token
     */
    getAccessTokenTTLSeconds(): number;
    /**
     * Get expiration time in seconds for refresh token
     */
    getRefreshTokenTTLSeconds(): number;
}
/**
 * Get or create JWT service singleton
 */
export declare function getJWTService(config?: JWTConfig): JWTService;
/**
 * Reset JWT service singleton (for testing)
 */
export declare function resetJWTService(): void;
export type { TokenPayload, TokenPair, JWTConfig, ServiceTokenPayload } from './types.js';
//# sourceMappingURL=jwt.d.ts.map