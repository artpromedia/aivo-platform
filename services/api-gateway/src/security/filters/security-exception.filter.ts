/**
 * Security Exception Filter
 * Handles security-related exceptions with proper error responses
 * and audit logging for compliance
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuditLogService } from '../services/audit-log.service';
import { DataMaskingService } from '../services/data-masking.service';
import { ThreatDetectionService } from '../services/threat-detection.service';
import { AuthenticatedRequest } from '../types';

// Custom security exceptions
export class SecurityException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.FORBIDDEN,
  ) {
    super({ code, message }, status);
  }
}

export class AuthenticationException extends SecurityException {
  constructor(message: string = 'Authentication failed') {
    super('AUTH_FAILED', message, HttpStatus.UNAUTHORIZED);
  }
}

export class AuthorizationException extends SecurityException {
  constructor(message: string = 'Access denied') {
    super('ACCESS_DENIED', message, HttpStatus.FORBIDDEN);
  }
}

export class RateLimitException extends SecurityException {
  constructor(public readonly retryAfter: number) {
    super('RATE_LIMIT_EXCEEDED', 'Too many requests', HttpStatus.TOO_MANY_REQUESTS);
  }
}

export class ConsentRequiredException extends SecurityException {
  constructor(public readonly consentTypes: string[]) {
    super('CONSENT_REQUIRED', 'User consent is required', HttpStatus.FORBIDDEN);
  }
}

export class AgeVerificationException extends SecurityException {
  constructor(message: string = 'Age verification required') {
    super('AGE_VERIFICATION_REQUIRED', message, HttpStatus.FORBIDDEN);
  }
}

export class MFARequiredException extends SecurityException {
  constructor() {
    super('MFA_REQUIRED', 'Multi-factor authentication required', HttpStatus.UNAUTHORIZED);
  }
}

export class SessionExpiredException extends SecurityException {
  constructor() {
    super('SESSION_EXPIRED', 'Session has expired', HttpStatus.UNAUTHORIZED);
  }
}

export class AccountLockedException extends SecurityException {
  constructor(public readonly unlockAt?: Date) {
    super('ACCOUNT_LOCKED', 'Account is temporarily locked', HttpStatus.FORBIDDEN);
  }
}

export class DataClassificationException extends SecurityException {
  constructor(classification: string) {
    super(
      'CLASSIFICATION_DENIED',
      `Access to ${classification} data is not permitted`,
      HttpStatus.FORBIDDEN,
    );
  }
}

@Catch()
export class SecurityExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SecurityExceptionFilter.name);
  
  constructor(
    private readonly auditLog: AuditLogService,
    private readonly dataMasking: DataMaskingService,
    private readonly threatDetection: ThreatDetectionService,
  ) {}
  
  async catch(exception: Error, host: ArgumentsHost): Promise<void> {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<AuthenticatedRequest>();
    const response = ctx.getResponse<Response>();
    
    const correlationId = request.headers['x-correlation-id'] as string || 'unknown';
    const clientIp = this.getClientIP(request);
    
    // Determine status and error details
    const { status, errorResponse } = this.buildErrorResponse(exception);
    
    // Log security events
    await this.logSecurityEvent(request, exception, status, correlationId);
    
    // Check for potential attacks based on exception type
    if (this.isSecurityThreat(exception)) {
      await this.threatDetection.analyzeRequest({
        ip: clientIp,
        userId: request.user?.userId,
        userAgent: request.headers['user-agent'],
        path: request.path,
        method: request.method,
      });
    }
    
    // Track failed authentication attempts
    if (exception instanceof UnauthorizedException || exception instanceof AuthenticationException) {
      await this.threatDetection.recordFailedLogin(clientIp, request.user?.userId);
    }
    
    // Build safe response (no internal details exposed)
    const safeResponse = {
      statusCode: status,
      error: errorResponse.error,
      message: errorResponse.message,
      code: errorResponse.code,
      correlationId,
      timestamp: new Date().toISOString(),
      ...(errorResponse.retryAfter && { retryAfter: errorResponse.retryAfter }),
      ...(errorResponse.consentTypes && { requiredConsent: errorResponse.consentTypes }),
    };
    
    // Set security headers on error responses
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Correlation-ID', correlationId);
    
    // Set Retry-After header for rate limiting
    if (exception instanceof RateLimitException) {
      response.setHeader('Retry-After', exception.retryAfter.toString());
    }
    
    response.status(status).json(safeResponse);
  }
  
  /**
   * Build appropriate error response based on exception type
   */
  private buildErrorResponse(exception: Error): {
    status: number;
    errorResponse: {
      error: string;
      message: string;
      code?: string;
      retryAfter?: number;
      consentTypes?: string[];
    };
  } {
    // Custom security exceptions
    if (exception instanceof SecurityException) {
      const status = exception.getStatus();
      const response = exception.getResponse() as { code: string; message: string };
      
      return {
        status,
        errorResponse: {
          error: this.getErrorName(status),
          message: response.message,
          code: response.code,
          ...(exception instanceof RateLimitException && { retryAfter: exception.retryAfter }),
          ...(exception instanceof ConsentRequiredException && { consentTypes: exception.consentTypes }),
        },
      };
    }
    
    // Standard NestJS HTTP exceptions
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      
      const message = typeof response === 'string' 
        ? response 
        : (response as any).message || 'An error occurred';
      
      return {
        status,
        errorResponse: {
          error: this.getErrorName(status),
          message: Array.isArray(message) ? message[0] : message,
          code: this.getErrorCode(status),
        },
      };
    }
    
    // Unknown errors - don't expose internal details
    this.logger.error('Unhandled exception', exception.stack);
    
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      errorResponse: {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      },
    };
  }
  
  /**
   * Get error name from status code
   */
  private getErrorName(status: number): string {
    const errorNames: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };
    
    return errorNames[status] || 'Error';
  }
  
  /**
   * Get error code from status code
   */
  private getErrorCode(status: number): string {
    const errorCodes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMIT_EXCEEDED',
      500: 'INTERNAL_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };
    
    return errorCodes[status] || 'ERROR';
  }
  
  /**
   * Log security event to audit service
   */
  private async logSecurityEvent(
    request: AuthenticatedRequest,
    exception: Error,
    status: number,
    correlationId: string,
  ): Promise<void> {
    const severity = this.getSeverity(status, exception);
    
    const maskedBody = request.body 
      ? this.dataMasking.maskObject(request.body) 
      : undefined;
    
    await this.auditLog.log({
      action: 'security_exception',
      actor: request.user 
        ? { userId: request.user.userId, type: 'user' }
        : { type: 'anonymous' },
      resource: {
        type: 'endpoint',
        id: request.path,
      },
      context: {
        correlationId,
        method: request.method,
        path: request.path,
        statusCode: status,
        errorType: exception.constructor.name,
        errorMessage: exception.message,
        ip: this.getClientIP(request),
        userAgent: request.headers['user-agent'],
        body: maskedBody,
      },
      outcome: 'failure',
      severity,
    });
  }
  
  /**
   * Determine audit severity based on error
   */
  private getSeverity(status: number, exception: Error): 'info' | 'warning' | 'error' | 'critical' {
    // Critical security events
    if (exception instanceof AccountLockedException ||
        exception instanceof MFARequiredException) {
      return 'critical';
    }
    
    // High severity security events
    if (status === 401 || status === 403) {
      return 'warning';
    }
    
    // Rate limiting
    if (status === 429) {
      return 'warning';
    }
    
    // Server errors
    if (status >= 500) {
      return 'error';
    }
    
    return 'info';
  }
  
  /**
   * Check if exception indicates potential security threat
   */
  private isSecurityThreat(exception: Error): boolean {
    if (exception instanceof SecurityException) {
      return true;
    }
    
    if (exception instanceof UnauthorizedException ||
        exception instanceof ForbiddenException) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Get client IP address
   */
  private getClientIP(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',');
      return ips[0].trim();
    }
    return request.ip || request.socket.remoteAddress || 'unknown';
  }
}
