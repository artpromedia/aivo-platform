/**
 * HTTP Authentication Middleware
 *
 * Provides JWT authentication for HTTP routes in the realtime service.
 * Used for protecting sensitive endpoints like metrics and admin routes.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import * as jose from 'jose';

import { config } from '../config.js';
import { logger } from '../logger.js';
import type { JWTPayload } from '../types.js';

/**
 * Authenticated request type
 */
export interface AuthenticatedRequest extends FastifyRequest {
  user?: JWTPayload;
}

/**
 * HTTP Authentication Middleware
 */
export class HttpAuthMiddleware {
  private jwtPublicKey: jose.KeyLike | Uint8Array | null = null;
  private initialized = false;

  /**
   * Initialize the middleware (load JWT keys)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      if (config.jwt.publicKey) {
        this.jwtPublicKey = await jose.importSPKI(config.jwt.publicKey, 'RS256');
      } else if (config.jwt.secret) {
        this.jwtPublicKey = new TextEncoder().encode(config.jwt.secret);
      }
      this.initialized = true;
      logger.info('HTTP authentication middleware initialized');
    } catch (error) {
      logger.error({ err: error }, 'Failed to initialize HTTP auth');
      throw error;
    }
  }

  /**
   * Verify JWT token from Authorization header
   */
  async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      if (!this.jwtPublicKey) {
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
        logger.debug('HTTP token expired');
      } else if (error instanceof jose.errors.JWTClaimValidationFailed) {
        logger.debug({ message: (error as Error).message }, 'HTTP token claim validation failed');
      }
      return null;
    }
  }

  /**
   * Map JWT payload to our format
   */
  private mapPayload(payload: jose.JWTPayload): JWTPayload {
    return {
      sub: payload.sub!,
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
   * Fastify preHandler hook for authentication
   * Requires valid JWT token in Authorization header
   */
  requireAuth = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      });
    }

    const token = authHeader.substring(7);
    const user = await this.verifyToken(token);

    if (!user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }

    (request as AuthenticatedRequest).user = user;
  };

  /**
   * Fastify preHandler hook for admin-only routes
   * Requires valid JWT with admin role
   */
  requireAdmin = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    await this.requireAuth(request, reply);

    const user = (request as AuthenticatedRequest).user;
    if (!user) return; // Already handled by requireAuth

    const adminRoles = ['admin', 'platform_admin', 'super_admin', 'ADMIN', 'PLATFORM_ADMIN'];
    if (!adminRoles.includes(user.role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Admin access required',
      });
    }
  };

  /**
   * Fastify preHandler hook for service-to-service authentication
   * Accepts either JWT token or service API key
   */
  requireServiceAuth = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Check for service API key first (for internal services)
    const apiKey = request.headers['x-api-key'] as string | undefined;
    const serviceKey = process.env.INTERNAL_SERVICE_KEY;

    if (apiKey && serviceKey && apiKey === serviceKey) {
      // Service-level auth, no user context
      return;
    }

    // Fall back to JWT auth
    await this.requireAuth(request, reply);
  };

  /**
   * Fastify preHandler hook for metrics endpoint
   * Accepts service key, admin JWT, or internal network check
   */
  requireMetricsAuth = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Check for metrics-specific auth token
    const metricsToken = request.headers['x-metrics-token'] as string | undefined;
    const expectedToken = process.env.METRICS_AUTH_TOKEN;

    if (metricsToken && expectedToken && metricsToken === expectedToken) {
      return; // Prometheus/Grafana scraping with token
    }

    // Check for service API key
    const apiKey = request.headers['x-api-key'] as string | undefined;
    const serviceKey = process.env.INTERNAL_SERVICE_KEY;

    if (apiKey && serviceKey && apiKey === serviceKey) {
      return;
    }

    // Check if request is from internal network (localhost, pod network)
    const clientIP = this.getClientIP(request);
    if (this.isInternalIP(clientIP)) {
      return; // Allow internal network access (e.g., Kubernetes probes)
    }

    // Require admin auth for external requests
    await this.requireAdmin(request, reply);
  };

  /**
   * Get client IP from request headers
   */
  private getClientIP(request: FastifyRequest): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
      return ips.trim();
    }

    const realIP = request.headers['x-real-ip'];
    if (realIP) {
      return Array.isArray(realIP) ? realIP[0] : realIP;
    }

    return request.ip || 'unknown';
  }

  /**
   * Check if IP is internal (localhost or private network)
   */
  private isInternalIP(ip: string): boolean {
    return (
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip === 'localhost' ||
      ip.startsWith('10.') ||
      ip.startsWith('172.16.') ||
      ip.startsWith('172.17.') ||
      ip.startsWith('172.18.') ||
      ip.startsWith('172.19.') ||
      ip.startsWith('172.2') ||
      ip.startsWith('172.3') ||
      ip.startsWith('192.168.')
    );
  }
}

// Export singleton instance
export const httpAuthMiddleware = new HttpAuthMiddleware();
