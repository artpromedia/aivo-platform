/**
 * WebSocket Authentication Middleware
 *
 * Handles JWT authentication for WebSocket connections with:
 * - Token validation
 * - User context extraction
 * - Rate limiting for connections
 * - Tenant isolation
 */

import * as jose from 'jose';
import type { Socket } from 'socket.io';

import { config } from '../config.js';
import { logger } from '../logger.js';
import { getRedisClient } from '../redis/index.js';
import type { DeviceType, JWTPayload } from '../types.js';

/**
 * Authentication result
 */
export interface AuthResult {
  success: boolean;
  user?: JWTPayload;
  error?: string;
  errorCode?: string;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * WebSocket Authentication Middleware
 */
export class WsAuthMiddleware {
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- jose.KeyLike type resolution
  private jwtPublicKey: jose.KeyLike | Uint8Array | null = null;
  private readonly CONNECTION_RATE_LIMIT = 10; // Connections per window
  private readonly CONNECTION_RATE_WINDOW = 60; // 60 seconds

  /**
   * Initialize the middleware
   */
  async initialize(): Promise<void> {
    try {
      // Load JWT public key
      if (config.jwt.publicKey) {
        this.jwtPublicKey = await jose.importSPKI(config.jwt.publicKey, 'RS256');
      } else if (config.jwt.secret) {
        this.jwtPublicKey = new TextEncoder().encode(config.jwt.secret);
      }
      logger.info('WebSocket authentication middleware initialized');
    } catch (error) {
      logger.error({ err: error }, 'Failed to initialize authentication');
    }
  }

  /**
   * Authenticate a WebSocket connection
   */
  async authenticate(socket: Socket): Promise<AuthResult> {
    try {
      // Extract token from various sources
      const token = this.extractToken(socket);

      if (!token) {
        return {
          success: false,
          error: 'No authentication token provided',
          errorCode: 'NO_TOKEN',
        };
      }

      // Check connection rate limit
      const ip = this.getClientIP(socket);
      const rateLimit = await this.checkConnectionRateLimit(ip);

      if (!rateLimit.allowed) {
        return {
          success: false,
          error: `Rate limit exceeded. Try again at ${rateLimit.resetAt.toISOString()}`,
          errorCode: 'RATE_LIMITED',
        };
      }

      // Verify JWT token
      const user = await this.verifyToken(token);

      if (!user) {
        return {
          success: false,
          error: 'Invalid or expired token',
          errorCode: 'INVALID_TOKEN',
        };
      }

      // Check if user is blocked
      const isBlocked = await this.isUserBlocked(user.sub);
      if (isBlocked) {
        return {
          success: false,
          error: 'User access is blocked',
          errorCode: 'USER_BLOCKED',
        };
      }

      return {
        success: true,
        user,
      };
    } catch (error) {
      logger.error({ err: error }, 'Authentication error');
      return {
        success: false,
        error: 'Authentication failed',
        errorCode: 'AUTH_ERROR',
      };
    }
  }

  /**
   * Extract token from socket handshake
   */
  private extractToken(socket: Socket): string | null {
    // Check auth object first
    const authToken = socket.handshake.auth?.token;
    if (authToken) {
      return authToken;
    }

    // Check Authorization header
    const authHeader = socket.handshake.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check query parameter (fallback for some clients)
    const queryToken = socket.handshake.query?.token;
    if (typeof queryToken === 'string') {
      return queryToken;
    }

    return null;
  }

  /**
   * Verify JWT token
   */
  private async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      if (!this.jwtPublicKey) {
        // Fallback to HMAC with secret
        const secret = new TextEncoder().encode(config.jwt.secret);
        const { payload } = await jose.jwtVerify(token, secret, {
          issuer: config.jwt.issuer,
          audience: config.jwt.audience,
        });
        return this.mapPayload(payload);
      }

      const { payload } = await jose.jwtVerify(token, this.jwtPublicKey, {
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
      });

      return this.mapPayload(payload);
    } catch (error) {
      if (error instanceof jose.errors.JWTExpired) {
        logger.debug('Token expired');
      } else if (error instanceof jose.errors.JWTClaimValidationFailed) {
        logger.debug({ message: error.message }, 'Token claim validation failed');
      } else {
        logger.error({ err: error }, 'Token verification failed');
      }
      return null;
    }
  }

  /**
   * Map JWT payload to our format
   */
  private mapPayload(payload: jose.JWTPayload): JWTPayload {
    return {
      sub: payload.sub as string,
      tenantId: (payload.tenantId || payload.tenant_id) as string,
      role: (payload.role || payload.roles?.[0] || 'user') as string,
      displayName: (payload.displayName ||
        payload.display_name ||
        payload.name ||
        'User') as string,
      email: payload.email as string | undefined,
      avatarUrl: (payload.avatarUrl || payload.avatar_url || payload.picture) as string | undefined,
      permissions: (payload.permissions || []) as string[],
      iat: payload.iat,
      exp: payload.exp,
    };
  }

  /**
   * Check connection rate limit
   */
  private async checkConnectionRateLimit(ip: string): Promise<RateLimitResult> {
    const redis = getRedisClient();
    const key = `ws:ratelimit:conn:${ip}`;
    const now = Date.now();
    const windowStart = now - this.CONNECTION_RATE_WINDOW * 1000;

    // Remove old entries
    await redis.zremrangebyscore(key, 0, windowStart);

    // Count current entries
    const count = await redis.zcard(key);

    if (count >= this.CONNECTION_RATE_LIMIT) {
      // Get oldest entry to calculate reset time
      const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetAt =
        oldest.length >= 2
          ? new Date(parseInt(oldest[1], 10) + this.CONNECTION_RATE_WINDOW * 1000)
          : new Date(now + this.CONNECTION_RATE_WINDOW * 1000);

      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    // Add new entry
    await redis.zadd(key, now, `${now}-${Math.random()}`);
    await redis.expire(key, this.CONNECTION_RATE_WINDOW);

    return {
      allowed: true,
      remaining: this.CONNECTION_RATE_LIMIT - count - 1,
      resetAt: new Date(now + this.CONNECTION_RATE_WINDOW * 1000),
    };
  }

  /**
   * Check if user is blocked
   */
  private async isUserBlocked(userId: string): Promise<boolean> {
    const redis = getRedisClient();
    const blocked = await redis.get(`ws:blocked:${userId}`);
    return blocked === 'true';
  }

  /**
   * Block a user from WebSocket connections
   */
  async blockUser(userId: string, durationSeconds = 3600): Promise<void> {
    const redis = getRedisClient();
    await redis.setex(`ws:blocked:${userId}`, durationSeconds, 'true');
    logger.info({ userId, durationSeconds }, 'User blocked');
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string): Promise<void> {
    const redis = getRedisClient();
    await redis.del(`ws:blocked:${userId}`);
    logger.info({ userId }, 'User unblocked');
  }

  /**
   * Get client IP address
   */
  private getClientIP(socket: Socket): string {
    // Check various headers for real IP (behind proxies)
    const headers = socket.handshake.headers;
    const forwardedFor = headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
      return ips.trim();
    }

    const realIP = headers['x-real-ip'];
    if (realIP) {
      return Array.isArray(realIP) ? realIP[0] : realIP;
    }

    return socket.handshake.address || 'unknown';
  }

  /**
   * Detect device type from user agent
   */
  detectDevice(socket: Socket): DeviceType {
    const userAgent = socket.handshake.headers['user-agent'] || '';

    if (/mobile|android|iphone|ipad|ipod/i.test(userAgent)) {
      if (/ipad|tablet/i.test(userAgent)) {
        return 'tablet';
      }
      return 'mobile';
    }

    return 'web';
  }

  /**
   * Validate tenant access
   */
  async validateTenantAccess(_userId: string, _tenantId: string): Promise<boolean> {
    // In a real implementation, this would check the database
    // For now, we trust the JWT claims
    return true;
  }

  /**
   * Refresh token (for long-lived connections)
   */
  async refreshToken(oldToken: string): Promise<string | null> {
    try {
      const user = await this.verifyToken(oldToken);
      if (!user) {
        return null;
      }

      // In a real implementation, this would call the auth service
      // to issue a new token
      return null;
    } catch (error) {
      logger.error({ err: error }, 'Token refresh failed');
      return null;
    }
  }
}

// Export singleton instance
export const wsAuthMiddleware = new WsAuthMiddleware();
