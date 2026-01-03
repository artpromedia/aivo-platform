/**
 * Authorization Guard
 * Enforces role-based and permission-based access control
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { METADATA_KEYS } from '../decorators';
import { AuthenticatedUser, Permission } from '../types';
import { SECURITY_ERROR_CODES } from '../constants';
import { AuditLogService } from '../services/audit-log.service';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  private readonly logger = new Logger(AuthorizationGuard.name);
  
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditLogService,
  ) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if public endpoint
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      METADATA_KEYS.IS_PUBLIC,
      [context.getHandler(), context.getClass()]
    );
    
    if (isPublic) {
      return true;
    }
    
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser;
    
    if (!user) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Access denied',
        code: SECURITY_ERROR_CODES.AUTHZ_FORBIDDEN,
      });
    }
    
    // Check roles
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      METADATA_KEYS.ROLES,
      [context.getHandler(), context.getClass()]
    );
    
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = this.checkRoles(user.roles, requiredRoles);
      if (!hasRole) {
        await this.logAccessDenied(request, user, 'roles', requiredRoles);
        throw new ForbiddenException({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Insufficient role permissions',
          code: SECURITY_ERROR_CODES.AUTHZ_INSUFFICIENT_PERMISSIONS,
        });
      }
    }
    
    // Check permissions
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      METADATA_KEYS.PERMISSIONS,
      [context.getHandler(), context.getClass()]
    );
    
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasPermission = this.checkPermissions(
        user.permissions,
        requiredPermissions
      );
      if (!hasPermission) {
        await this.logAccessDenied(request, user, 'permissions', requiredPermissions);
        throw new ForbiddenException({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Insufficient permissions',
          code: SECURITY_ERROR_CODES.AUTHZ_INSUFFICIENT_PERMISSIONS,
        });
      }
    }
    
    // Check tenant isolation
    const isTenantAware = this.reflector.getAllAndOverride<boolean>(
      METADATA_KEYS.TENANT_AWARE,
      [context.getHandler(), context.getClass()]
    );
    
    if (isTenantAware) {
      const resourceTenantId = this.extractResourceTenantId(request);
      if (resourceTenantId && resourceTenantId !== user.tenantId) {
        // Check if user is super admin (can access any tenant)
        if (!user.roles.includes('super_admin')) {
          await this.logAccessDenied(request, user, 'tenant', [resourceTenantId]);
          throw new ForbiddenException({
            statusCode: 403,
            error: 'Forbidden',
            message: 'Access denied to resource',
            code: SECURITY_ERROR_CODES.AUTHZ_TENANT_MISMATCH,
          });
        }
      }
    }
    
    return true;
  }
  
  private checkRoles(userRoles: string[], requiredRoles: string[]): boolean {
    // Super admin has access to everything
    if (userRoles.includes('super_admin')) {
      return true;
    }
    
    // Check if user has at least one required role
    return requiredRoles.some(role => userRoles.includes(role));
  }
  
  private checkPermissions(
    userPermissions: string[],
    requiredPermissions: string[]
  ): boolean {
    // Check if user has all required permissions
    return requiredPermissions.every(permission => {
      // Handle wildcard permissions
      return userPermissions.some(userPerm => {
        if (userPerm === '*') return true;
        if (userPerm.endsWith(':*')) {
          const resource = userPerm.replace(':*', '');
          return permission.startsWith(resource);
        }
        return userPerm === permission;
      });
    });
  }
  
  private extractResourceTenantId(request: Request): string | null {
    // Try to get tenant ID from various sources
    return (
      request.params?.tenantId ||
      request.query?.tenantId as string ||
      request.body?.tenantId ||
      null
    );
  }
  
  private async logAccessDenied(
    request: Request,
    user: AuthenticatedUser,
    type: string,
    required: string[]
  ): Promise<void> {
    await this.auditService.log({
      eventType: 'authorization.access_denied',
      eventCategory: 'authorization',
      severity: 'medium',
      actor: {
        id: user.id,
        type: 'user',
        ip: request.securityContext?.ip,
        userAgent: request.securityContext?.userAgent,
        sessionId: user.sessionId,
      },
      action: {
        name: 'access_denied',
        method: request.method,
        path: request.path,
      },
      result: {
        status: 'failure',
        statusCode: 403,
        errorMessage: `Missing ${type}: ${required.join(', ')}`,
      },
      context: {
        correlationId: request.correlationId || 'unknown',
        requestId: (request as any).requestId || 'unknown',
        environment: process.env.NODE_ENV || 'development',
        service: 'api-gateway',
      },
    });
  }
}
