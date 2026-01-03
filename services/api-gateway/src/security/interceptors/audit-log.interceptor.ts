/**
 * Audit Log Interceptor
 * Automatically logs all requests for compliance and security auditing
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import {
  AUDIT_LOG_KEY,
  SKIP_AUDIT_KEY,
  FERPA_PROTECTED_KEY,
  COPPA_COMPLIANT_KEY,
} from '../decorators';
import { AuditLogService } from '../services/audit-log.service';
import { DataMaskingService } from '../services/data-masking.service';
import { AuthenticatedRequest } from '../types';
import { AUDIT } from '../constants';

interface AuditContext {
  resourceType?: string;
  action?: string;
  includeBody?: boolean;
  includeResponse?: boolean;
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);
  
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLog: AuditLogService,
    private readonly dataMasking: DataMaskingService,
  ) {}
  
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const skipAudit = this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (skipAudit) {
      return next.handle();
    }
    
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    
    const startTime = Date.now();
    const correlationId = request.headers['x-correlation-id'] as string || 'unknown';
    
    // Get audit configuration from decorator
    const auditConfig = this.reflector.getAllAndOverride<AuditContext>(AUDIT_LOG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) || {};
    
    // Check for FERPA/COPPA protection
    const isFerpaProtected = this.reflector.getAllAndOverride<boolean>(FERPA_PROTECTED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    const isCoppaCompliant = this.reflector.getAllAndOverride<boolean>(COPPA_COMPLIANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    // Determine action and resource
    const action = auditConfig.action || this.inferAction(request.method);
    const resourceType = auditConfig.resourceType || this.inferResourceType(request.path);
    
    // Build request context
    const requestContext = this.buildRequestContext(request, auditConfig);
    
    return next.handle().pipe(
      tap(async (responseBody) => {
        const duration = Date.now() - startTime;
        
        await this.auditLog.log({
          action,
          actor: this.buildActor(request),
          resource: {
            type: resourceType,
            id: this.extractResourceId(request),
          },
          context: {
            ...requestContext,
            correlationId,
            duration,
            statusCode: response.statusCode,
            responseSize: this.getResponseSize(responseBody),
            ferpaProtected: isFerpaProtected || false,
            coppaCompliant: isCoppaCompliant || false,
          },
          outcome: 'success',
          severity: this.determineSeverity(action, response.statusCode),
        });
      }),
      catchError(async (error) => {
        const duration = Date.now() - startTime;
        
        await this.auditLog.log({
          action,
          actor: this.buildActor(request),
          resource: {
            type: resourceType,
            id: this.extractResourceId(request),
          },
          context: {
            ...requestContext,
            correlationId,
            duration,
            errorCode: error.status || 500,
            errorMessage: error.message,
            ferpaProtected: isFerpaProtected || false,
            coppaCompliant: isCoppaCompliant || false,
          },
          outcome: 'failure',
          severity: this.determineSeverity(action, error.status || 500),
        });
        
        throw error;
      }),
    );
  }
  
  /**
   * Build actor information from request
   */
  private buildActor(request: AuthenticatedRequest): {
    userId?: string;
    type: string;
    tenantId?: string;
    roles?: string[];
    ip?: string;
    userAgent?: string;
  } {
    if (request.user) {
      return {
        userId: request.user.userId,
        type: 'user',
        tenantId: request.user.tenantId,
        roles: request.user.roles,
        ip: this.getClientIP(request),
        userAgent: request.headers['user-agent'],
      };
    }
    
    return {
      type: 'anonymous',
      ip: this.getClientIP(request),
      userAgent: request.headers['user-agent'],
    };
  }
  
  /**
   * Build request context for logging
   */
  private buildRequestContext(request: AuthenticatedRequest, config: AuditContext): Record<string, any> {
    const context: Record<string, any> = {
      method: request.method,
      path: request.path,
      query: Object.keys(request.query).length > 0 
        ? this.dataMasking.maskObject(request.query as Record<string, any>) 
        : undefined,
    };
    
    // Include body if configured and not too large
    if (config.includeBody && request.body) {
      const bodySize = JSON.stringify(request.body).length;
      if (bodySize <= AUDIT.MAX_PAYLOAD_SIZE) {
        context.body = this.dataMasking.maskObject(request.body);
      } else {
        context.bodyTruncated = true;
        context.bodySize = bodySize;
      }
    }
    
    return context;
  }
  
  /**
   * Infer action from HTTP method
   */
  private inferAction(method: string): string {
    const methodActions: Record<string, string> = {
      GET: 'read',
      POST: 'create',
      PUT: 'update',
      PATCH: 'update',
      DELETE: 'delete',
    };
    
    return methodActions[method.toUpperCase()] || 'access';
  }
  
  /**
   * Infer resource type from path
   */
  private inferResourceType(path: string): string {
    // Extract first path segment after /api/v1/
    const match = path.match(/^\/api\/v\d+\/([^\/]+)/);
    return match ? match[1] : 'unknown';
  }
  
  /**
   * Extract resource ID from request
   */
  private extractResourceId(request: Request): string | undefined {
    // Try to extract from params first
    const params = request.params;
    if (params.id) return params.id;
    if (params.userId) return params.userId;
    if (params.resourceId) return params.resourceId;
    
    // Try to extract from path
    const pathMatch = request.path.match(/\/([0-9a-f-]{36}|[0-9]+)(?:\/|$)/);
    return pathMatch ? pathMatch[1] : undefined;
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
  
  /**
   * Get response size
   */
  private getResponseSize(response: any): number | undefined {
    if (!response) return undefined;
    try {
      return JSON.stringify(response).length;
    } catch {
      return undefined;
    }
  }
  
  /**
   * Determine audit severity based on action and status
   */
  private determineSeverity(action: string, statusCode: number): 'info' | 'warning' | 'error' | 'critical' {
    // Error responses
    if (statusCode >= 500) {
      return 'error';
    }
    
    if (statusCode >= 400) {
      if (statusCode === 401 || statusCode === 403) {
        return 'warning';
      }
      return 'info';
    }
    
    // Sensitive actions
    const sensitiveActions = ['delete', 'update_password', 'grant_permission', 'revoke_permission'];
    if (sensitiveActions.includes(action)) {
      return 'warning';
    }
    
    return 'info';
  }
}
