/**
 * JWT Service for AIVO Platform
 * Handles token generation, verification, and management using RS256 algorithm
 * @module @aivo/ts-shared/auth/jwt
 */
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { SignJWT, jwtVerify, importPKCS8, importSPKI, decodeJwt, } from 'jose';
/**
 * Parse TTL string to seconds
 * Supports: '15m', '1h', '7d', '30d'
 */
function parseTTL(ttl) {
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
function loadKey(keyOrPath) {
    if (keyOrPath.includes('-----BEGIN')) {
        return keyOrPath;
    }
    return readFileSync(keyOrPath, 'utf-8');
}
/**
 * JWT Service class for token operations
 */
export class JWTService {
    config;
    privateKeyPromise = null;
    publicKeyPromise = null;
    constructor(config) {
        this.config = config;
    }
    /**
     * Get cached key instances
     */
    async getKeys() {
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
    async generateAccessToken(payload) {
        const { privateKey } = await this.getKeys();
        const token = await new SignJWT({ ...payload, type: 'access' })
            .setProtectedHeader({
            alg: 'RS256',
            kid: this.config.keyId,
        })
            .setSubject(payload.sub)
            .setIssuer(this.config.issuer)
            .setAudience(this.config.audience)
            .setIssuedAt()
            .setExpirationTime(this.config.accessTokenTTL)
            .setJti(payload.jti || randomUUID())
            .sign(privateKey);
        return token;
    }
    /**
     * Generate a refresh token
     */
    async generateRefreshToken(payload) {
        const { privateKey } = await this.getKeys();
        const token = await new SignJWT({
            ...payload,
            type: 'refresh',
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
    async generateTokenPair(payload) {
        const [accessToken, refreshToken] = await Promise.all([
            this.generateAccessToken(payload),
            this.generateRefreshToken({
                sub: payload.sub,
                sessionId: payload.sessionId,
                tenantId: payload.tenantId,
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
    async verifyToken(token, expectedType = 'access') {
        const { publicKey } = await this.getKeys();
        const { payload } = await jwtVerify(token, publicKey, {
            algorithms: ['RS256'],
            issuer: this.config.issuer,
            audience: this.config.audience,
        });
        const typedPayload = payload;
        if (typedPayload.type !== expectedType) {
            throw new Error(`Invalid token type. Expected ${expectedType}, got ${typedPayload.type}`);
        }
        return typedPayload;
    }
    /**
     * Verify access token specifically
     */
    async verifyAccessToken(token) {
        return (await this.verifyToken(token, 'access'));
    }
    /**
     * Verify refresh token specifically
     */
    async verifyRefreshToken(token) {
        return (await this.verifyToken(token, 'refresh'));
    }
    /**
     * Decode token without verification (for debugging/logging)
     */
    decodeToken(token) {
        try {
            return decodeJwt(token);
        }
        catch {
            return null;
        }
    }
    /**
     * Generate service-to-service token
     */
    async generateServiceToken(serviceName, targetService) {
        const { privateKey } = await this.getKeys();
        const token = await new SignJWT({
            type: 'service',
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
    async verifyServiceToken(token, expectedTarget) {
        const { publicKey } = await this.getKeys();
        const { payload } = await jwtVerify(token, publicKey, {
            algorithms: ['RS256'],
            issuer: this.config.issuer,
            ...(expectedTarget && { audience: expectedTarget }),
        });
        const typedPayload = payload;
        if (typedPayload.type !== 'service') {
            throw new Error('Invalid token type. Expected service token.');
        }
        return typedPayload;
    }
    /**
     * Get expiration time in seconds for access token
     */
    getAccessTokenTTLSeconds() {
        return parseTTL(this.config.accessTokenTTL);
    }
    /**
     * Get expiration time in seconds for refresh token
     */
    getRefreshTokenTTLSeconds() {
        return parseTTL(this.config.refreshTokenTTL);
    }
}
// Singleton instance management
let jwtServiceInstance = null;
/**
 * Get or create JWT service singleton
 */
export function getJWTService(config) {
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
export function resetJWTService() {
    jwtServiceInstance = null;
}
//# sourceMappingURL=jwt.js.map