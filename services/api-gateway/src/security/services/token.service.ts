/**
 * Token Service
 * JWT token generation, validation, and management
 */

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { TokenPayload, AuthToken, AuthenticatedUser } from '../types';
import { AUTH, SECURITY_ERROR_CODES } from '../constants';

interface TokenBlacklistEntry {
  token: string;
  reason: string;
  revokedAt: Date;
  expiresAt: Date;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly redis: Redis;
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly issuer: string;
  private readonly audience: string[];
  
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_TOKEN_DB', 2),
      keyPrefix: 'token:',
    });
    
    this.accessSecret = this.configService.getOrThrow('JWT_ACCESS_SECRET');
    this.refreshSecret = this.configService.getOrThrow('JWT_REFRESH_SECRET');
    this.issuer = this.configService.get('JWT_ISSUER', 'aivo.edu');
    this.audience = this.configService.get('JWT_AUDIENCE', 'aivo-api').split(',');
  }
  
  /**
   * Generate access and refresh token pair
   */
  async generateTokenPair(
    user: Partial<AuthenticatedUser>,
    sessionId: string,
    options?: { mfaVerified?: boolean }
  ): Promise<AuthToken> {
    const now = Math.floor(Date.now() / 1000);
    
    const accessPayload: Partial<TokenPayload> = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles || [],
      permissions: user.permissions || [],
      sessionId,
      iat: now,
      exp: now + AUTH.TOKEN_EXPIRY.ACCESS,
      iss: this.issuer,
      aud: this.audience,
      mfaVerified: options?.mfaVerified || false,
      isMinor: user.isMinor,
      ageVerified: user.ageVerified,
      consentStatus: user.consentStatus,
      mfaEnabled: user.mfaEnabled,
    };
    
    const refreshPayload = {
      sub: user.id,
      sessionId,
      tokenId: randomUUID(),
      iat: now,
      exp: now + AUTH.TOKEN_EXPIRY.REFRESH,
      iss: this.issuer,
      aud: this.audience,
    };
    
    const accessToken = this.jwtService.sign(accessPayload as any, {
      secret: this.accessSecret,
      expiresIn: AUTH.TOKEN_EXPIRY.ACCESS,
    });
    
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.refreshSecret,
      expiresIn: AUTH.TOKEN_EXPIRY.REFRESH,
    });
    
    // Store refresh token ID for validation
    await this.redis.set(
      `refresh:${refreshPayload.tokenId}`,
      JSON.stringify({
        userId: user.id,
        sessionId,
        createdAt: new Date().toISOString(),
      }),
      'EX',
      AUTH.TOKEN_EXPIRY.REFRESH
    );
    
    return {
      accessToken,
      refreshToken,
      expiresIn: AUTH.TOKEN_EXPIRY.ACCESS,
      tokenType: 'Bearer',
      scope: user.permissions || [],
    };
  }
  
  /**
   * Verify access token
   */
  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const payload = this.jwtService.verify<TokenPayload>(token, {
        secret: this.accessSecret,
        issuer: this.issuer,
        audience: this.audience,
      });
      
      return payload;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Token has expired',
          code: SECURITY_ERROR_CODES.AUTH_TOKEN_EXPIRED,
        });
      }
      
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid token',
        code: SECURITY_ERROR_CODES.AUTH_TOKEN_INVALID,
      });
    }
  }
  
  /**
   * Verify refresh token and get new token pair
   */
  async refreshTokens(refreshToken: string): Promise<AuthToken> {
    try {
      const payload = this.jwtService.verify<{
        sub: string;
        sessionId: string;
        tokenId: string;
      }>(refreshToken, {
        secret: this.refreshSecret,
        issuer: this.issuer,
        audience: this.audience,
      });
      
      // Check if token is in our store
      const storedData = await this.redis.get(`refresh:${payload.tokenId}`);
      if (!storedData) {
        throw new UnauthorizedException({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Refresh token not found or revoked',
          code: SECURITY_ERROR_CODES.AUTH_TOKEN_INVALID,
        });
      }
      
      const stored = JSON.parse(storedData);
      
      // Revoke old refresh token (one-time use)
      await this.redis.del(`refresh:${payload.tokenId}`);
      
      // TODO: Fetch fresh user data from database
      // For now, generate with stored data
      return this.generateTokenPair(
        { id: payload.sub },
        payload.sessionId
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid refresh token',
        code: SECURITY_ERROR_CODES.AUTH_TOKEN_INVALID,
      });
    }
  }
  
  /**
   * Blacklist a token
   */
  async blacklistToken(
    token: string,
    reason: string = 'manual_revocation'
  ): Promise<void> {
    try {
      const decoded = this.jwtService.decode(token) as TokenPayload;
      if (!decoded) return;
      
      // Calculate remaining TTL
      const now = Math.floor(Date.now() / 1000);
      const ttl = decoded.exp - now;
      
      if (ttl > 0) {
        const hash = this.hashToken(token);
        await this.redis.set(
          `blacklist:${hash}`,
          JSON.stringify({
            reason,
            revokedAt: new Date().toISOString(),
            userId: decoded.sub,
          }),
          'EX',
          ttl
        );
      }
    } catch (error) {
      this.logger.error('Failed to blacklist token', { error: error.message });
    }
  }
  
  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const hash = this.hashToken(token);
    const exists = await this.redis.exists(`blacklist:${hash}`);
    return exists === 1;
  }
  
  /**
   * Revoke all tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    // Find all refresh tokens for user
    const pattern = 'token:refresh:*';
    const stream = this.redis.scanStream({ match: pattern });
    
    for await (const keys of stream) {
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.userId === userId) {
            await this.redis.del(key);
          }
        }
      }
    }
    
    this.logger.log('Revoked all tokens for user', { userId });
  }
  
  /**
   * Revoke tokens for a specific session
   */
  async revokeSessionTokens(sessionId: string): Promise<void> {
    const pattern = 'token:refresh:*';
    const stream = this.redis.scanStream({ match: pattern });
    
    for await (const keys of stream) {
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.sessionId === sessionId) {
            await this.redis.del(key);
          }
        }
      }
    }
  }
  
  /**
   * Hash token for storage (to avoid storing full tokens)
   */
  private hashToken(token: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }
  
  async onModuleDestroy() {
    await this.redis.quit();
  }
}
