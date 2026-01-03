/**
 * Response Sanitization Interceptor
 * Sanitizes response data to prevent sensitive information leakage
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
import { map } from 'rxjs/operators';
import { DataMaskingService } from '../services/data-masking.service';
import { DataClassificationService } from '../services/data-classification.service';
import { AuthenticatedRequest, DataClassification } from '../types';
import { FERPA_PROTECTED_KEY, COPPA_COMPLIANT_KEY } from '../decorators';

interface SanitizationConfig {
  maskPII?: boolean;
  removeFields?: string[];
  allowedFields?: string[];
  maxDepth?: number;
}

@Injectable()
export class ResponseSanitizationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ResponseSanitizationInterceptor.name);
  
  // Fields that should never be included in responses
  private readonly blockedFields = new Set([
    'password',
    'passwordHash',
    'hashedPassword',
    'salt',
    'secret',
    'privateKey',
    'apiKey',
    'apiSecret',
    'accessToken',
    'refreshToken',
    'sessionToken',
    'internalId',
    '_internalMetadata',
  ]);
  
  // Fields to mask in responses
  private readonly maskFields = new Set([
    'ssn',
    'socialSecurityNumber',
    'creditCard',
    'cardNumber',
    'cvv',
    'bankAccount',
  ]);
  
  constructor(
    private readonly reflector: Reflector,
    private readonly dataMasking: DataMaskingService,
    private readonly dataClassification: DataClassificationService,
  ) {}
  
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    
    // Check for compliance requirements
    const isFerpaProtected = this.reflector.getAllAndOverride<boolean>(FERPA_PROTECTED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    const isCoppaCompliant = this.reflector.getAllAndOverride<boolean>(COPPA_COMPLIANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    // Determine user's access level
    const userClassificationAccess = this.getUserClassificationAccess(request);
    
    return next.handle().pipe(
      map((data) => {
        if (!data) return data;
        
        // Deep clone to avoid mutating original data
        const sanitized = this.deepClone(data);
        
        // Apply sanitization
        return this.sanitizeData(sanitized, {
          userAccess: userClassificationAccess,
          ferpaProtected: isFerpaProtected || false,
          coppaCompliant: isCoppaCompliant || false,
          userRoles: request.user?.roles || [],
          isMinor: request.user?.isMinor || false,
        });
      }),
    );
  }
  
  /**
   * Sanitize data based on configuration
   */
  private sanitizeData(
    data: any,
    config: {
      userAccess: DataClassification;
      ferpaProtected: boolean;
      coppaCompliant: boolean;
      userRoles: string[];
      isMinor: boolean;
    },
    depth: number = 0,
  ): any {
    // Prevent deep recursion
    if (depth > 20) {
      return '[MAX_DEPTH_EXCEEDED]';
    }
    
    if (data === null || data === undefined) {
      return data;
    }
    
    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item, config, depth + 1));
    }
    
    // Handle primitives
    if (typeof data !== 'object') {
      return data;
    }
    
    // Handle objects
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      // Remove blocked fields entirely
      if (this.blockedFields.has(lowerKey)) {
        continue;
      }
      
      // Mask sensitive fields
      if (this.maskFields.has(lowerKey)) {
        if (typeof value === 'string') {
          result[key] = this.dataMasking.maskValue(value);
        } else {
          result[key] = '[REDACTED]';
        }
        continue;
      }
      
      // Check field classification
      const fieldClassification = this.dataClassification.classifyField(key, value);
      
      // Check if user has access to this classification level
      if (!this.hasAccess(config.userAccess, fieldClassification.classification)) {
        // Either mask or skip based on classification
        if (fieldClassification.classification === 'restricted') {
          continue; // Skip restricted fields entirely
        } else if (fieldClassification.classification === 'confidential') {
          if (typeof value === 'string') {
            result[key] = this.dataMasking.maskValue(value);
          } else {
            result[key] = '[ACCESS_RESTRICTED]';
          }
          continue;
        }
      }
      
      // FERPA-specific handling
      if (config.ferpaProtected && this.isFerpaField(key)) {
        if (!this.hasFerpaAccess(config.userRoles)) {
          continue;
        }
      }
      
      // COPPA-specific handling for minors
      if (config.coppaCompliant && config.isMinor && this.isSensitiveForMinors(key)) {
        continue;
      }
      
      // Recursively sanitize nested objects
      if (typeof value === 'object' && value !== null) {
        result[key] = this.sanitizeData(value, config, depth + 1);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }
  
  /**
   * Get user's maximum classification access level
   */
  private getUserClassificationAccess(request: AuthenticatedRequest): DataClassification {
    if (!request.user) {
      return 'public';
    }
    
    const roles = request.user.roles || [];
    
    // Admin roles get highest access
    if (roles.includes('admin') || roles.includes('super_admin')) {
      return 'restricted';
    }
    
    // Teachers and staff get confidential access
    if (roles.includes('teacher') || roles.includes('staff')) {
      return 'confidential';
    }
    
    // Parents get internal access
    if (roles.includes('parent')) {
      return 'internal';
    }
    
    // Students and others get public access
    return 'public';
  }
  
  /**
   * Check if user has access to classification level
   */
  private hasAccess(userAccess: DataClassification, fieldClassification: DataClassification): boolean {
    const levels: DataClassification[] = ['public', 'internal', 'confidential', 'restricted'];
    return levels.indexOf(userAccess) >= levels.indexOf(fieldClassification);
  }
  
  /**
   * Check if field is FERPA-protected education record
   */
  private isFerpaField(field: string): boolean {
    const ferpaFields = [
      'grade', 'gpa', 'transcript', 'assessment', 'score',
      'attendance', 'behavior', 'disciplinary', 'iep', '504',
      'specialEducation', 'learningDisability', 'accommodation',
    ];
    
    const lowerField = field.toLowerCase();
    return ferpaFields.some(f => lowerField.includes(f));
  }
  
  /**
   * Check if user has FERPA access rights
   */
  private hasFerpaAccess(roles: string[]): boolean {
    const authorizedRoles = ['admin', 'super_admin', 'teacher', 'counselor', 'principal'];
    return roles.some(role => authorizedRoles.includes(role));
  }
  
  /**
   * Check if field is sensitive for minor users
   */
  private isSensitiveForMinors(field: string): boolean {
    const sensitiveFields = [
      'location', 'geolocation', 'address', 'phone',
      'socialMedia', 'externalLinks', 'messaging',
    ];
    
    const lowerField = field.toLowerCase();
    return sensitiveFields.some(f => lowerField.includes(f));
  }
  
  /**
   * Deep clone an object
   */
  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item)) as unknown as T;
    }
    
    const cloned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      cloned[key] = this.deepClone(value);
    }
    
    return cloned as T;
  }
}
