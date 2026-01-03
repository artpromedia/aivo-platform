# Phase 3: Core Security Services - Detailed Chunks

## Chunk 3.1: Encryption Service

**Time Estimate:** 6-8 hours  
**Priority:** P0 - Critical  
**Dependencies:** None

### Files to Create

#### 1. `services/api-gateway/src/security/services/encryption.service.ts`

**Full implementation provided in original prompt. Key sections:**

```typescript
// Core encryption functionality:
// 1. AES-256-GCM encryption/decryption
// 2. AWS KMS key management integration
// 3. Envelope encryption pattern
// 4. Field-level encryption helpers
// 5. Data key caching with TTL
// 6. Secure random token generation
```

### Implementation Checklist

- [ ] KMS client initialization
- [ ] `encrypt(plaintext, context)` method
- [ ] `decrypt(encryptedData, context)` method
- [ ] `encryptFields(data, fields, context)` method
- [ ] `decryptFields(data, fields, context)` method
- [ ] `generateSecureToken(length)` method
- [ ] `generateSecureId()` method
- [ ] Data key caching (1 hour TTL)
- [ ] Key validation on module init

### Configuration Required

```typescript
interface EncryptionConfig {
  AWS_REGION: string;
  KMS_MASTER_KEY_ID: string;
  KEY_CACHE_TTL: number; // milliseconds
}
```

### Testing Requirements

```typescript
describe('EncryptionService', () => {
  it('should encrypt and decrypt string data');
  it('should encrypt and decrypt with context');
  it('should encrypt specific fields');
  it('should decrypt specific fields');
  it('should generate secure tokens');
  it('should cache data keys');
  it('should handle KMS errors gracefully');
});
```

---

## Chunk 3.2: Hashing Service

**Time Estimate:** 3-4 hours  
**Priority:** P0 - Critical  
**Dependencies:** None

### Files to Create

#### 1. `services/api-gateway/src/security/services/hashing.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

export interface HashOptions {
  memoryCost?: number;
  timeCost?: number;
  parallelism?: number;
}

@Injectable()
export class HashingService {
  private readonly defaultOptions: argon2.Options;

  constructor(private config: ConfigService) {
    this.defaultOptions = {
      type: argon2.argon2id,
      memoryCost: config.get('HASH_MEMORY_COST', 65536), // 64 MB
      timeCost: config.get('HASH_TIME_COST', 3),
      parallelism: config.get('HASH_PARALLELISM', 4),
    };
  }

  /**
   * Hash a password using Argon2id
   */
  async hashPassword(password: string, options?: HashOptions): Promise<string> {
    return argon2.hash(password, {
      ...this.defaultOptions,
      ...options,
    });
  }

  /**
   * Verify a password against a hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  /**
   * Check if a hash needs rehashing (parameters changed)
   */
  async needsRehash(hash: string): Promise<boolean> {
    return argon2.needsRehash(hash, this.defaultOptions);
  }

  /**
   * Generate HMAC signature
   */
  hmac(data: string, key: string, algorithm: string = 'sha256'): string {
    return crypto
      .createHmac(algorithm, key)
      .update(data)
      .digest('hex');
  }

  /**
   * Verify HMAC signature (timing-safe)
   */
  verifyHmac(data: string, signature: string, key: string): boolean {
    const expected = this.hmac(data, key);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  }

  /**
   * Generate a SHA-256 hash
   */
  sha256(data: string): string {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  /**
   * Generate a secure comparison hash for sensitive data lookup
   */
  blindIndex(data: string, salt: string): string {
    return this.hmac(data.toLowerCase().trim(), salt);
  }
}
```

### Acceptance Criteria
- [ ] Argon2id used for password hashing
- [ ] Configurable memory/time/parallelism costs
- [ ] Rehash detection for parameter updates
- [ ] HMAC generation and verification
- [ ] Timing-safe comparisons
- [ ] Blind index generation for encrypted field search

---

## Chunk 3.3: Token Service

**Time Estimate:** 4-5 hours  
**Priority:** P0 - Critical  
**Dependencies:** Chunk 3.1

### Files to Create

#### 1. `services/api-gateway/src/security/services/token.service.ts`

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { v4 as uuidv4 } from 'uuid';

export interface TokenPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
  tenantId: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

@Injectable()
export class TokenService {
  private readonly accessTokenTTL: number;
  private readonly refreshTokenTTL: number;
  private readonly issuer: string;
  private readonly audience: string;

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    @InjectRedis() private redis: Redis,
  ) {
    this.accessTokenTTL = config.get('ACCESS_TOKEN_TTL', 900); // 15 minutes
    this.refreshTokenTTL = config.get('REFRESH_TOKEN_TTL', 604800); // 7 days
    this.issuer = config.get('JWT_ISSUER', 'aivo.edu');
    this.audience = config.get('JWT_AUDIENCE', 'aivo.edu');
  }

  /**
   * Generate access and refresh token pair
   */
  async generateTokenPair(payload: Omit<TokenPayload, 'sessionId'>): Promise<TokenPair> {
    const sessionId = uuidv4();
    const fullPayload: TokenPayload = { ...payload, sessionId };

    const accessToken = this.jwt.sign(fullPayload, {
      expiresIn: this.accessTokenTTL,
      issuer: this.issuer,
      audience: this.audience,
    });

    const refreshToken = await this.generateRefreshToken(sessionId, payload.sub);

    // Store session
    await this.storeSession(sessionId, payload.sub, this.refreshTokenTTL);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenTTL,
      tokenType: 'Bearer',
    };
  }

  /**
   * Verify access token
   */
  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const payload = this.jwt.verify<TokenPayload>(token, {
        issuer: this.issuer,
        audience: this.audience,
      });

      // Check if session is still valid (not revoked)
      const isValid = await this.isSessionValid(payload.sessionId);
      if (!isValid) {
        throw new UnauthorizedException('Session has been revoked');
      }

      return payload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Refresh tokens using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const { sessionId, userId } = await this.verifyRefreshToken(refreshToken);

    // Get user data for new token
    const user = await this.getUserForToken(userId);

    // Revoke old session
    await this.revokeSession(sessionId);

    // Generate new token pair
    return this.generateTokenPair(user);
  }

  /**
   * Revoke a session (logout)
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.redis.del(`session:${sessionId}`);
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllSessions(userId: string): Promise<void> {
    const keys = await this.redis.keys(`session:*:${userId}`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // Private methods...
  private async generateRefreshToken(sessionId: string, userId: string): Promise<string> {
    const token = uuidv4();
    const key = `refresh:${token}`;
    
    await this.redis.setex(key, this.refreshTokenTTL, JSON.stringify({
      sessionId,
      userId,
    }));

    return token;
  }

  private async verifyRefreshToken(token: string): Promise<{ sessionId: string; userId: string }> {
    const key = `refresh:${token}`;
    const data = await this.redis.get(key);
    
    if (!data) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Delete used refresh token (rotation)
    await this.redis.del(key);

    return JSON.parse(data);
  }

  private async storeSession(sessionId: string, userId: string, ttl: number): Promise<void> {
    await this.redis.setex(
      `session:${sessionId}:${userId}`,
      ttl,
      JSON.stringify({ createdAt: new Date().toISOString() })
    );
  }

  private async isSessionValid(sessionId: string): Promise<boolean> {
    const keys = await this.redis.keys(`session:${sessionId}:*`);
    return keys.length > 0;
  }

  private async getUserForToken(userId: string): Promise<Omit<TokenPayload, 'sessionId'>> {
    // This would typically fetch from database
    // Placeholder implementation
    throw new Error('Implement getUserForToken');
  }
}
```

### Acceptance Criteria
- [ ] JWT access tokens with configurable TTL
- [ ] Secure refresh token storage in Redis
- [ ] Token pair generation
- [ ] Token verification with session check
- [ ] Session revocation (single and all)
- [ ] Refresh token rotation
- [ ] Configurable issuer/audience

---

## Chunk 3.4: Audit Log Service

**Time Estimate:** 8-10 hours  
**Priority:** P0 - Critical  
**Dependencies:** None

### Files to Create

**Full implementation provided in original prompt.**

### Implementation Phases

#### Phase 3.4.1: Core Types and Interface (1-2 hours)
- [ ] Define `AuditEvent` interface
- [ ] Define `AuditEventType` union type
- [ ] Define `AuditEventCategory` union type
- [ ] Export types

#### Phase 3.4.2: Core Logging (2-3 hours)
- [ ] Implement `log()` method
- [ ] Event buffering
- [ ] Automatic buffer flush
- [ ] Critical event immediate flush

#### Phase 3.4.3: Specialized Logging Methods (2-3 hours)
- [ ] `logAuthentication()` method
- [ ] `logDataAccess()` method
- [ ] `logSecurityEvent()` method
- [ ] `logConsentEvent()` method
- [ ] `logPrivacyRequest()` method

#### Phase 3.4.4: Storage Integrations (2-3 hours)
- [ ] Kinesis streaming
- [ ] CloudWatch Logs
- [ ] Database persistence
- [ ] Query interface

### Acceptance Criteria
- [ ] All event types supported
- [ ] Buffered writes for performance
- [ ] Multiple storage backends
- [ ] Queryable audit trail
- [ ] Compliance metadata (regulations, retention)
- [ ] Metrics tracking

---

## Chunk 3.5: Audit Log Interceptor

**Time Estimate:** 3-4 hours  
**Priority:** P0 - Critical  
**Dependencies:** Chunk 3.4

### Files to Create

#### 1. `services/api-gateway/src/security/interceptors/audit-log.interceptor.ts`

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { Reflector } from '@nestjs/core';
import { AuditLogService, AuditEventType } from '../services/audit-log.service';
import { DataClassificationService } from '../services/data-classification.service';
import { AUDIT_OPTIONS_KEY, AuditOptions } from '../decorators/audit.decorator';

const DEFAULT_OPTIONS: AuditOptions = {
  enabled: true,
  includeRequest: false,
  includeResponse: false,
  sensitiveFields: ['password', 'token', 'secret', 'key', 'authorization'],
};

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private auditLog: AuditLogService,
    private dataClassification: DataClassificationService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const options = {
      ...DEFAULT_OPTIONS,
      ...this.reflector.getAllAndOverride<AuditOptions>(AUDIT_OPTIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]),
    };

    if (!options.enabled) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();
    const correlationId = (request as any).correlationId;

    return next.handle().pipe(
      tap(async (responseBody) => {
        const response = context.switchToHttp().getResponse<Response>();
        await this.logSuccess(request, response, responseBody, startTime, options, correlationId);
      }),
      catchError(async (error) => {
        await this.logError(request, error, startTime, options, correlationId);
        throw error;
      }),
    );
  }

  private async logSuccess(
    request: Request,
    response: Response,
    responseBody: any,
    startTime: number,
    options: AuditOptions,
    correlationId: string,
  ): Promise<void> {
    const user = (request as any).user;
    const duration = Date.now() - startTime;

    // Determine event type from HTTP method
    const eventType = this.getEventType(request.method);

    await this.auditLog.log({
      eventType,
      eventCategory: this.getEventCategory(request.method),
      severity: 'low',
      actor: {
        id: user?.sub || 'anonymous',
        type: user ? 'user' : 'anonymous',
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        sessionId: user?.sessionId,
      },
      resource: options.resourceType ? {
        type: options.resourceType,
        id: request.params.id,
        tenantId: user?.tenantId,
      } : undefined,
      action: {
        name: `${request.method} ${request.route?.path || request.path}`,
        method: request.method,
        path: request.path,
        query: options.includeRequest ? this.redact(request.query, options.sensitiveFields) : undefined,
        body: options.includeRequest ? this.redact(request.body, options.sensitiveFields) : undefined,
      },
      result: {
        status: 'success',
        statusCode: response.statusCode,
      },
      context: {
        correlationId,
        requestId: (request as any).requestId,
      },
      metadata: {
        duration,
        responseSize: options.includeResponse ? JSON.stringify(responseBody).length : undefined,
      },
    });
  }

  private async logError(
    request: Request,
    error: any,
    startTime: number,
    options: AuditOptions,
    correlationId: string,
  ): Promise<void> {
    const user = (request as any).user;
    const duration = Date.now() - startTime;

    await this.auditLog.log({
      eventType: 'system.error',
      eventCategory: 'system',
      severity: 'high',
      actor: {
        id: user?.sub || 'anonymous',
        type: user ? 'user' : 'anonymous',
        ip: request.ip,
      },
      action: {
        name: `${request.method} ${request.path}`,
        method: request.method,
        path: request.path,
      },
      result: {
        status: 'failure',
        statusCode: error.status || 500,
        errorCode: error.code,
        errorMessage: error.message,
      },
      context: {
        correlationId,
        requestId: (request as any).requestId,
      },
      metadata: {
        duration,
        errorStack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      },
    });
  }

  private getEventType(method: string): AuditEventType {
    const methodMap: Record<string, AuditEventType> = {
      GET: 'data.read',
      POST: 'data.create',
      PUT: 'data.update',
      PATCH: 'data.update',
      DELETE: 'data.delete',
    };
    return methodMap[method] || 'data.read';
  }

  private getEventCategory(method: string): 'data_access' | 'data_modification' {
    return method === 'GET' ? 'data_access' : 'data_modification';
  }

  private redact(data: any, sensitiveFields: string[]): any {
    if (!data || typeof data !== 'object') return data;
    return this.dataClassification.redactPII(data, sensitiveFields);
  }
}
```

#### 2. `services/api-gateway/src/security/decorators/audit.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';

export const AUDIT_OPTIONS_KEY = 'auditOptions';

export interface AuditOptions {
  enabled?: boolean;
  resourceType?: string;
  includeRequest?: boolean;
  includeResponse?: boolean;
  sensitiveFields?: string[];
}

export const Audit = (options: AuditOptions) =>
  SetMetadata(AUDIT_OPTIONS_KEY, options);

export const NoAudit = () => Audit({ enabled: false });

export const AuditResource = (type: string) => 
  Audit({ resourceType: type, includeRequest: true });
```

### Acceptance Criteria
- [ ] All requests logged automatically
- [ ] Success and error paths logged
- [ ] Sensitive data redacted
- [ ] Request/response optionally included
- [ ] Duration tracked
- [ ] Configurable via decorator

---

## Phase 3 Package Dependencies

```json
{
  "dependencies": {
    "@aws-sdk/client-kms": "^3.450.0",
    "@aws-sdk/client-kinesis": "^3.450.0",
    "@aws-sdk/client-cloudwatch-logs": "^3.450.0",
    "@nestjs/jwt": "^10.2.0",
    "argon2": "^0.31.0",
    "ioredis": "^5.3.0",
    "uuid": "^9.0.0"
  }
}
```

## Environment Variables

```bash
# Phase 3 Environment Variables
AWS_REGION=us-east-1
KMS_MASTER_KEY_ID=alias/aivo-data-key
REDIS_URL=redis://localhost:6379
ACCESS_TOKEN_TTL=900
REFRESH_TOKEN_TTL=604800
JWT_SECRET=your-jwt-secret
JWT_ISSUER=aivo.edu
JWT_AUDIENCE=aivo.edu
AUDIT_KINESIS_STREAM=aivo-audit-logs
AUDIT_LOG_GROUP=/aivo/audit-logs
HASH_MEMORY_COST=65536
HASH_TIME_COST=3
HASH_PARALLELISM=4
```
