# Phase 4: Data Protection Services - Detailed Chunks

## Chunk 4.1: Data Classification Service

**Time Estimate:** 6-8 hours  
**Priority:** P0 - Critical  
**Dependencies:** None

### Files to Create

**Full implementation provided in original prompt.**

### Implementation Sub-tasks

#### 4.1.1: Classification Types & Patterns (2 hours)
```typescript
// Define classification levels
type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';

// Initialize PII patterns (SSN, email, phone, credit card, etc.)
// Initialize field classifications mapping
// Initialize resource type classifications
```

#### 4.1.2: Core Classification Logic (2-3 hours)
```typescript
// classifyData() method:
// - Check resource type classification
// - Detect PII in content
// - Check field-level classification
// - Apply context-based elevation (minor, health info)
// - Determine requirements (encryption, audit, retention)
// - Get applicable regulations
```

#### 4.1.3: PII Detection (2 hours)
```typescript
// detectPII() method:
// - Regex pattern matching
// - Confidence scoring
// - Position tracking
// - Type identification
```

#### 4.1.4: PII Masking & Redaction (2 hours)
```typescript
// maskPII() method - mask PII in strings
// redactPII() method - redact PII from objects
// Field-specific masking formats (email, SSN, credit card)
```

### Acceptance Criteria
- [ ] 4 classification levels implemented
- [ ] 10+ PII types detected
- [ ] Field-level classification
- [ ] Resource type classification
- [ ] Context-aware elevation
- [ ] Regulation mapping
- [ ] Retention period calculation

---

## Chunk 4.2: PII Detection Service

**Time Estimate:** 6-8 hours  
**Priority:** P0 - Critical  
**Dependencies:** Chunk 4.1

### Files to Create

#### 1. `services/api-gateway/src/security/services/pii-detection.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { logger } from '@aivo/ts-observability';

export interface PIIDetectionResult {
  hasPII: boolean;
  types: PIIType[];
  matches: PIIMatch[];
  riskScore: number;
  recommendations: string[];
}

export interface PIIMatch {
  type: PIIType;
  value: string;
  maskedValue: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
  context?: string;
}

export type PIIType =
  | 'ssn'
  | 'ein'
  | 'email'
  | 'phone'
  | 'credit_card'
  | 'bank_account'
  | 'date_of_birth'
  | 'drivers_license'
  | 'passport'
  | 'address'
  | 'ip_address'
  | 'student_id'
  | 'medical_record'
  | 'name'
  | 'age';

@Injectable()
export class PIIDetectionService {
  private patterns: Map<PIIType, RegExp[]>;
  private contextPatterns: Map<PIIType, RegExp>;

  constructor(private config: ConfigService) {
    this.patterns = this.initializePatterns();
    this.contextPatterns = this.initializeContextPatterns();
  }

  /**
   * Detect all PII in text
   */
  detect(text: string): PIIDetectionResult {
    const matches: PIIMatch[] = [];
    const typesFound = new Set<PIIType>();

    for (const [type, patterns] of this.patterns) {
      for (const pattern of patterns) {
        const regex = new RegExp(pattern.source, pattern.flags + 'g');
        let match;

        while ((match = regex.exec(text)) !== null) {
          const confidence = this.calculateConfidence(type, match[0], text, match.index);
          
          if (confidence >= 0.5) {
            typesFound.add(type);
            matches.push({
              type,
              value: match[0],
              maskedValue: this.mask(type, match[0]),
              startIndex: match.index,
              endIndex: match.index + match[0].length,
              confidence,
              context: this.extractContext(text, match.index, match[0].length),
            });
          }
        }
      }
    }

    const riskScore = this.calculateRiskScore(matches);
    const recommendations = this.generateRecommendations(matches, riskScore);

    return {
      hasPII: matches.length > 0,
      types: Array.from(typesFound),
      matches,
      riskScore,
      recommendations,
    };
  }

  /**
   * Scan an object for PII
   */
  scanObject(obj: Record<string, any>, path: string = ''): PIIDetectionResult[] {
    const results: PIIDetectionResult[] = [];

    const scan = (value: any, currentPath: string) => {
      if (value === null || value === undefined) return;

      if (typeof value === 'string') {
        const result = this.detect(value);
        if (result.hasPII) {
          results.push({
            ...result,
            matches: result.matches.map(m => ({
              ...m,
              context: currentPath,
            })),
          });
        }
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => scan(item, `${currentPath}[${index}]`));
      } else if (typeof value === 'object') {
        Object.entries(value).forEach(([key, val]) => 
          scan(val, currentPath ? `${currentPath}.${key}` : key)
        );
      }
    };

    scan(obj, path);
    return results;
  }

  /**
   * Sanitize text by removing or masking PII
   */
  sanitize(text: string, options?: { mask?: boolean; replace?: string }): string {
    const { mask = true, replace = '[REDACTED]' } = options || {};
    const result = this.detect(text);
    
    let sanitized = text;
    // Sort matches by position descending to avoid index shifting
    const sortedMatches = [...result.matches].sort((a, b) => b.startIndex - a.startIndex);

    for (const match of sortedMatches) {
      const replacement = mask ? match.maskedValue : replace;
      sanitized = 
        sanitized.substring(0, match.startIndex) +
        replacement +
        sanitized.substring(match.endIndex);
    }

    return sanitized;
  }

  /**
   * Check if a specific field value contains PII
   */
  isPII(fieldName: string, value: string): boolean {
    // Check field name for PII indicators
    const piiFieldPatterns = [
      /ssn/i, /social.*security/i, /tax.*id/i,
      /credit.*card/i, /card.*number/i,
      /date.*birth/i, /dob/i, /birthday/i,
      /phone/i, /mobile/i, /cell/i,
      /email/i, /mail/i,
      /address/i, /street/i, /city/i, /zip/i,
      /license/i, /passport/i,
      /bank.*account/i, /routing/i,
    ];

    if (piiFieldPatterns.some(p => p.test(fieldName))) {
      return true;
    }

    // Check value for PII patterns
    return this.detect(value).hasPII;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private initializePatterns(): Map<PIIType, RegExp[]> {
    return new Map<PIIType, RegExp[]>([
      ['ssn', [
        /\b\d{3}-\d{2}-\d{4}\b/,
        /\b\d{9}\b/,
      ]],
      ['ein', [
        /\b\d{2}-\d{7}\b/,
      ]],
      ['email', [
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/i,
      ]],
      ['phone', [
        /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/,
        /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/,
      ]],
      ['credit_card', [
        /\b4[0-9]{12}(?:[0-9]{3})?\b/, // Visa
        /\b5[1-5][0-9]{14}\b/, // Mastercard
        /\b3[47][0-9]{13}\b/, // Amex
        /\b6(?:011|5[0-9]{2})[0-9]{12}\b/, // Discover
      ]],
      ['date_of_birth', [
        /\b(?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12][0-9]|3[01])[-/](?:19|20)\d{2}\b/,
        /\b(?:19|20)\d{2}[-/](?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12][0-9]|3[01])\b/,
      ]],
      ['ip_address', [
        /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/,
      ]],
      ['address', [
        /\b\d{1,5}\s+\w+\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Circle|Cir)\b/i,
      ]],
      ['drivers_license', [
        /\b[A-Z]{1,2}\d{5,8}\b/i,
      ]],
      ['passport', [
        /\b[A-Z]{1,2}\d{6,9}\b/i,
      ]],
      ['student_id', [
        /\b(?:S|STU|ID)[-]?\d{6,10}\b/i,
      ]],
      ['medical_record', [
        /\b(?:MRN|MED|PAT)[-]?\d{6,12}\b/i,
      ]],
    ]);
  }

  private initializeContextPatterns(): Map<PIIType, RegExp> {
    return new Map([
      ['ssn', /social\s*security|ssn|tax\s*id/i],
      ['email', /email|e-mail|contact/i],
      ['phone', /phone|mobile|cell|tel|fax/i],
      ['credit_card', /card|credit|debit|payment/i],
      ['date_of_birth', /birth|dob|born|age/i],
      ['address', /address|street|city|zip|postal/i],
    ]);
  }

  private calculateConfidence(
    type: PIIType,
    value: string,
    fullText: string,
    index: number
  ): number {
    let confidence = 0.6; // Base confidence

    // Check for contextual keywords
    const contextPattern = this.contextPatterns.get(type);
    if (contextPattern) {
      const context = fullText.substring(Math.max(0, index - 50), index + value.length + 50);
      if (contextPattern.test(context)) {
        confidence += 0.2;
      }
    }

    // Type-specific validation
    switch (type) {
      case 'ssn':
        if (this.validateSSN(value)) confidence += 0.15;
        break;
      case 'credit_card':
        if (this.validateCreditCard(value)) confidence += 0.2;
        break;
      case 'email':
        confidence = 0.95; // Email patterns are very reliable
        break;
    }

    return Math.min(1, confidence);
  }

  private validateSSN(ssn: string): boolean {
    const digits = ssn.replace(/\D/g, '');
    if (digits.length !== 9) return false;
    
    // SSN can't start with 000, 666, or 900-999
    const area = parseInt(digits.substring(0, 3));
    if (area === 0 || area === 666 || area >= 900) return false;
    
    // Group and serial can't be 0000
    const group = parseInt(digits.substring(3, 5));
    const serial = parseInt(digits.substring(5, 9));
    if (group === 0 || serial === 0) return false;
    
    return true;
  }

  private validateCreditCard(number: string): boolean {
    const digits = number.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;
    
    // Luhn algorithm
    let sum = 0;
    let isEven = false;
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  private mask(type: PIIType, value: string): string {
    switch (type) {
      case 'ssn':
        return '***-**-' + value.slice(-4);
      case 'credit_card':
        return '****-****-****-' + value.slice(-4);
      case 'email': {
        const [local, domain] = value.split('@');
        return local[0] + '*'.repeat(local.length - 1) + '@' + domain;
      }
      case 'phone':
        return '***-***-' + value.slice(-4);
      default:
        return '*'.repeat(value.length - 4) + value.slice(-4);
    }
  }

  private extractContext(text: string, index: number, length: number): string {
    const start = Math.max(0, index - 20);
    const end = Math.min(text.length, index + length + 20);
    return text.substring(start, end);
  }

  private calculateRiskScore(matches: PIIMatch[]): number {
    if (matches.length === 0) return 0;

    const typeWeights: Record<PIIType, number> = {
      ssn: 1.0,
      credit_card: 1.0,
      bank_account: 0.9,
      medical_record: 0.9,
      passport: 0.8,
      drivers_license: 0.8,
      date_of_birth: 0.6,
      ein: 0.6,
      address: 0.5,
      phone: 0.4,
      email: 0.3,
      ip_address: 0.2,
      student_id: 0.4,
      name: 0.2,
      age: 0.2,
    };

    const totalWeight = matches.reduce((sum, m) => 
      sum + (typeWeights[m.type] || 0.5) * m.confidence, 0
    );

    return Math.min(1, totalWeight / 2);
  }

  private generateRecommendations(matches: PIIMatch[], riskScore: number): string[] {
    const recommendations: string[] = [];

    if (riskScore >= 0.8) {
      recommendations.push('Critical: Contains highly sensitive PII. Encrypt immediately.');
    }

    if (matches.some(m => m.type === 'ssn')) {
      recommendations.push('SSN detected: Never store in plain text. Use tokenization.');
    }

    if (matches.some(m => m.type === 'credit_card')) {
      recommendations.push('Credit card detected: PCI-DSS compliance required.');
    }

    if (matches.length > 3) {
      recommendations.push('Multiple PII types detected: Review data minimization practices.');
    }

    return recommendations;
  }
}
```

### Acceptance Criteria
- [ ] 15+ PII types detected
- [ ] Confidence scoring
- [ ] Context-aware detection
- [ ] Validation (SSN, credit card Luhn)
- [ ] Object scanning
- [ ] Sanitization
- [ ] Risk scoring
- [ ] Recommendations

---

## Chunk 4.3: Data Masking Interceptor

**Time Estimate:** 4-5 hours  
**Priority:** P0 - Critical  
**Dependencies:** Chunk 4.1, 4.2

### Files to Create

#### 1. `services/api-gateway/src/security/interceptors/data-masking.interceptor.ts`

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { DataClassificationService } from '../services/data-classification.service';
import { PIIDetectionService } from '../services/pii-detection.service';
import { MASKING_OPTIONS_KEY, MaskingOptions } from '../decorators/masking.decorator';

@Injectable()
export class DataMaskingInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private classification: DataClassificationService,
    private piiDetection: PIIDetectionService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const options = this.reflector.getAllAndOverride<MaskingOptions>(
      MASKING_OPTIONS_KEY,
      [context.getHandler(), context.getClass()]
    );

    // If masking explicitly disabled, skip
    if (options?.enabled === false) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    // Admins and certain roles can see unmasked data
    if (this.canViewUnmasked(user, options)) {
      return next.handle();
    }

    return next.handle().pipe(
      map(data => this.maskResponse(data, options)),
    );
  }

  private canViewUnmasked(user: any, options?: MaskingOptions): boolean {
    if (!user) return false;

    const unmaskedRoles = options?.unmaskedRoles || ['super_admin'];
    return user.roles?.some((role: string) => unmaskedRoles.includes(role));
  }

  private maskResponse(data: any, options?: MaskingOptions): any {
    if (data === null || data === undefined) return data;

    if (Array.isArray(data)) {
      return data.map(item => this.maskResponse(item, options));
    }

    if (typeof data === 'object') {
      return this.maskObject(data, options);
    }

    if (typeof data === 'string') {
      return this.piiDetection.sanitize(data);
    }

    return data;
  }

  private maskObject(obj: Record<string, any>, options?: MaskingOptions): Record<string, any> {
    const masked: Record<string, any> = {};
    const fieldsToMask = options?.fields || [];
    const preserveFields = options?.preserveFields || [];

    for (const [key, value] of Object.entries(obj)) {
      // Skip preserved fields
      if (preserveFields.includes(key)) {
        masked[key] = value;
        continue;
      }

      // Check if field should be masked
      if (fieldsToMask.includes(key) || this.isSensitiveField(key)) {
        masked[key] = this.maskValue(key, value);
        continue;
      }

      // Recursively process nested objects
      if (typeof value === 'object' && value !== null) {
        masked[key] = this.maskResponse(value, options);
      } else if (typeof value === 'string') {
        // Check for PII in string values
        if (this.piiDetection.isPII(key, value)) {
          masked[key] = this.piiDetection.sanitize(value);
        } else {
          masked[key] = value;
        }
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }

  private isSensitiveField(fieldName: string): boolean {
    const sensitivePatterns = [
      /password/i, /secret/i, /token/i, /key/i,
      /ssn/i, /social.*security/i,
      /credit.*card/i, /card.*number/i,
      /bank.*account/i, /routing/i,
      /date.*birth/i, /dob/i,
    ];

    return sensitivePatterns.some(p => p.test(fieldName));
  }

  private maskValue(fieldName: string, value: any): string {
    if (value === null || value === undefined) return value;

    const strValue = String(value);

    // Field-specific masking
    if (/email/i.test(fieldName)) {
      const [local, domain] = strValue.split('@');
      if (local && domain) {
        return local[0] + '***@' + domain;
      }
    }

    if (/phone/i.test(fieldName)) {
      return '***-***-' + strValue.slice(-4);
    }

    if (/ssn/i.test(fieldName)) {
      return '***-**-' + strValue.slice(-4);
    }

    // Generic masking
    if (strValue.length <= 4) {
      return '****';
    }

    return '*'.repeat(strValue.length - 4) + strValue.slice(-4);
  }
}
```

#### 2. `services/api-gateway/src/security/decorators/masking.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';

export const MASKING_OPTIONS_KEY = 'maskingOptions';

export interface MaskingOptions {
  enabled?: boolean;
  fields?: string[];
  preserveFields?: string[];
  unmaskedRoles?: string[];
}

export const Mask = (options: MaskingOptions) =>
  SetMetadata(MASKING_OPTIONS_KEY, options);

export const NoMask = () => Mask({ enabled: false });

export const MaskPII = (fields: string[]) =>
  Mask({ fields });
```

### Acceptance Criteria
- [ ] Automatic PII masking in responses
- [ ] Role-based unmasking
- [ ] Field-specific masking formats
- [ ] Configurable via decorator
- [ ] Recursive object handling
- [ ] Sensitive field detection

---

## Chunk 4.4: Response Sanitizer Interceptor

**Time Estimate:** 3-4 hours  
**Priority:** P1 - High  
**Dependencies:** None

### Files to Create

#### 1. `services/api-gateway/src/security/interceptors/response-sanitizer.interceptor.ts`

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ResponseSanitizerInterceptor implements NestInterceptor {
  private readonly internalFields: string[];
  private readonly isProduction: boolean;

  constructor(private config: ConfigService) {
    this.isProduction = config.get('NODE_ENV') === 'production';
    this.internalFields = [
      // Database internals
      'createdAt', 'updatedAt', 'deletedAt',
      '__v', '_id',
      
      // Internal flags
      'isInternal', 'debugInfo', 'trace',
      
      // Security-sensitive
      'passwordHash', 'salt', 'refreshTokenHash',
      'verificationToken', 'resetToken',
      
      // System fields
      'version', 'schemaVersion',
    ];
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => this.sanitize(data)),
    );
  }

  private sanitize(data: any): any {
    if (data === null || data === undefined) return data;

    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item));
    }

    if (typeof data === 'object') {
      return this.sanitizeObject(data);
    }

    return data;
  }

  private sanitizeObject(obj: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      // Remove internal fields
      if (this.internalFields.includes(key)) {
        continue;
      }

      // Remove fields starting with underscore (internal convention)
      if (key.startsWith('_')) {
        continue;
      }

      // Recursively sanitize nested objects
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
```

### Acceptance Criteria
- [ ] Internal fields removed from responses
- [ ] Security-sensitive fields removed
- [ ] Recursive sanitization
- [ ] Configurable field list
- [ ] Production-only options

---

## Chunk 4.5: Security Exception Filter

**Time Estimate:** 3-4 hours  
**Priority:** P1 - High  
**Dependencies:** Chunk 3.4

### Files to Create

#### 1. `services/api-gateway/src/security/filters/security-exception.filter.ts`

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuditLogService } from '../services/audit-log.service';
import { logger } from '@aivo/ts-observability';

interface SecurityErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  correlationId?: string;
  timestamp: string;
}

@Catch()
export class SecurityExceptionFilter implements ExceptionFilter {
  private readonly isProduction: boolean;

  constructor(
    private config: ConfigService,
    private auditLog: AuditLogService,
  ) {
    this.isProduction = config.get('NODE_ENV') === 'production';
  }

  async catch(exception: any, host: ArgumentsHost): Promise<void> {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = this.getStatus(exception);
    const errorResponse = this.buildErrorResponse(exception, request, status);

    // Log security-relevant exceptions
    if (this.isSecurityException(status, exception)) {
      await this.logSecurityEvent(exception, request, status);
    }

    // Log error for debugging
    this.logError(exception, request, status);

    response.status(status).json(errorResponse);
  }

  private getStatus(exception: any): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    // Check for known error types
    if (exception.name === 'TokenExpiredError') return HttpStatus.UNAUTHORIZED;
    if (exception.name === 'JsonWebTokenError') return HttpStatus.UNAUTHORIZED;
    if (exception.name === 'ValidationError') return HttpStatus.BAD_REQUEST;

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private buildErrorResponse(
    exception: any,
    request: Request,
    status: number
  ): SecurityErrorResponse {
    const baseResponse: SecurityErrorResponse = {
      statusCode: status,
      error: this.getErrorName(status),
      message: this.getSafeMessage(exception, status),
      correlationId: (request as any).correlationId,
      timestamp: new Date().toISOString(),
    };

    return baseResponse;
  }

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

  private getSafeMessage(exception: any, status: number): string {
    // In production, return generic messages for security
    if (this.isProduction && status >= 500) {
      return 'An unexpected error occurred. Please try again later.';
    }

    // For security exceptions, always use safe messages
    if (status === 401) {
      return 'Authentication required';
    }

    if (status === 403) {
      return 'Access denied';
    }

    // Use exception message for client errors
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        return response;
      }
      if (typeof response === 'object' && 'message' in response) {
        return Array.isArray(response.message) 
          ? response.message[0] 
          : response.message;
      }
    }

    return exception.message || 'An error occurred';
  }

  private isSecurityException(status: number, exception: any): boolean {
    // Authentication/Authorization failures
    if (status === 401 || status === 403) return true;

    // Rate limiting
    if (status === 429) return true;

    // Specific security exceptions
    const securityExceptions = [
      'CsrfException',
      'SecurityException',
      'TokenExpiredError',
      'JsonWebTokenError',
    ];

    return securityExceptions.includes(exception.name);
  }

  private async logSecurityEvent(
    exception: any,
    request: Request,
    status: number
  ): Promise<void> {
    const user = (request as any).user;

    await this.auditLog.logSecurityEvent(
      'suspicious_activity',
      {
        id: user?.sub || 'anonymous',
        type: user ? 'user' : 'anonymous',
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      },
      {
        threatType: this.getErrorName(status),
        indicators: [
          request.method,
          request.path,
          exception.name,
        ],
        riskScore: status === 401 ? 0.3 : 0.5,
        blocked: true,
      }
    );
  }

  private logError(exception: any, request: Request, status: number): void {
    const logData = {
      status,
      method: request.method,
      path: request.path,
      correlationId: (request as any).correlationId,
      userId: (request as any).userId,
      error: {
        name: exception.name,
        message: exception.message,
        stack: this.isProduction ? undefined : exception.stack,
      },
    };

    if (status >= 500) {
      logger.error('Unhandled exception', logData);
    } else if (status >= 400) {
      logger.warn('Client error', logData);
    }
  }
}
```

### Acceptance Criteria
- [ ] All exceptions handled consistently
- [ ] Security events logged
- [ ] Safe error messages in production
- [ ] Stack traces hidden in production
- [ ] Correlation ID in responses
- [ ] Proper status code mapping

---

## Phase 4 Integration Testing

```typescript
describe('Data Protection', () => {
  describe('DataClassificationService', () => {
    it('should classify student records as confidential');
    it('should classify SSN as restricted');
    it('should detect applicable regulations');
  });

  describe('PIIDetectionService', () => {
    it('should detect SSN patterns');
    it('should detect email addresses');
    it('should calculate risk scores');
    it('should validate credit cards with Luhn');
  });

  describe('DataMaskingInterceptor', () => {
    it('should mask PII in responses');
    it('should allow admins to see unmasked data');
    it('should handle nested objects');
  });
});
```
