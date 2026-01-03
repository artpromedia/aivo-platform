/**
 * Authentication Guard
 * Validates JWT tokens and authenticates requests
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { TokenService } from '../services/token.service';
import { SessionService } from '../services/session.service';
import { ThreatDetectionService } from '../services/threat-detection.service';
import { METADATA_KEYS } from '../decorators';
import { AuthenticatedUser } from '../types';
import { SECURITY_ERROR_CODES } from '../constants';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  private readonly logger = new Logger(AuthenticationGuard.name);
  
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly threatDetection: ThreatDetectionService,
  ) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if endpoint is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      METADATA_KEYS.IS_PUBLIC,
      [context.getHandler(), context.getClass()]
    );
    
    if (isPublic) {
      return true;
    }
    
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    
    if (!token) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required',
        code: SECURITY_ERROR_CODES.AUTH_TOKEN_INVALID,
      });
    }
    
    try {
      // Verify and decode the token
      const payload = await this.tokenService.verifyAccessToken(token);
      
      // Check if token is blacklisted
      const isBlacklisted = await this.tokenService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new UnauthorizedException({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Token has been revoked',
          code: SECURITY_ERROR_CODES.AUTH_TOKEN_INVALID,
        });
      }
      
      // Validate session
      const session = await this.sessionService.getSession(payload.sessionId);
      if (!session) {
        throw new UnauthorizedException({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Session expired',
          code: SECURITY_ERROR_CODES.AUTH_SESSION_EXPIRED,
        });
      }
      
      // Check for session hijacking (IP/User-Agent mismatch)
      const currentIp = request.securityContext?.ip || request.ip;
      const currentUserAgent = request.headers['user-agent'] || '';
      
      if (session.ip !== currentIp || session.userAgent !== currentUserAgent) {
        // Log potential session hijacking
        await this.threatDetection.recordThreat({
          type: 'account_takeover',
          severity: 'high',
          source: {
            ip: currentIp!,
            userId: payload.sub,
            sessionId: payload.sessionId,
          },
          indicators: [
            `IP mismatch: expected ${session.ip}, got ${currentIp}`,
            `UA mismatch: expected ${session.userAgent}, got ${currentUserAgent}`,
          ],
          riskScore: 80,
        });
        
        // Invalidate the session
        await this.sessionService.invalidateSession(payload.sessionId);
        
        throw new UnauthorizedException({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Session invalid',
          code: SECURITY_ERROR_CODES.AUTH_SESSION_EXPIRED,
        });
      }
      
      // Check MFA requirement
      const requireMfa = this.reflector.getAllAndOverride<boolean>(
        METADATA_KEYS.REQUIRE_MFA,
        [context.getHandler(), context.getClass()]
      );
      
      if (requireMfa && !payload.mfaVerified) {
        throw new UnauthorizedException({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'MFA verification required',
          code: SECURITY_ERROR_CODES.AUTH_MFA_REQUIRED,
        });
      }
      
      // Build authenticated user object
      const user: AuthenticatedUser = {
        id: payload.sub,
        email: payload.email,
        tenantId: payload.tenantId,
        roles: payload.roles,
        permissions: payload.permissions,
        sessionId: payload.sessionId,
        isMinor: payload.isMinor || false,
        ageVerified: payload.ageVerified || false,
        consentStatus: payload.consentStatus || 'pending',
        mfaEnabled: payload.mfaEnabled || false,
        mfaVerified: payload.mfaVerified || false,
      };
      
      // Attach user to request
      request.user = user;
      
      // Update security context
      if (request.securityContext) {
        request.securityContext.user = user;
        request.securityContext.isAuthenticated = true;
        request.securityContext.tenantId = user.tenantId;
      }
      
      // Refresh session activity
      await this.sessionService.touchSession(payload.sessionId);
      
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      this.logger.error('Authentication failed', {
        error: error.message,
        correlationId: request.correlationId,
      });
      
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid authentication token',
        code: SECURITY_ERROR_CODES.AUTH_TOKEN_INVALID,
      });
    }
  }
  
  private extractToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      return null;
    }
    
    const [type, token] = authHeader.split(' ');
    
    if (type !== 'Bearer' || !token) {
      return null;
    }
    
    return token;
  }
}
