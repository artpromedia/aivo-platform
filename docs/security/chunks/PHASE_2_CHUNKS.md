# Phase 2: Authentication & Authorization Guards - Detailed Chunks

## Chunk 2.1: Authentication Guard

**Time Estimate:** 4-6 hours  
**Priority:** P0 - Critical  
**Dependencies:** Phase 1

### Files to Create

#### 1. `services/api-gateway/src/security/guards/authentication.guard.ts`

```typescript
import { 
  Injectable, 
  CanActivate, 
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { TokenService } from '../services/token.service';
import { AuditLogService } from '../services/audit-log.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private tokenService: TokenService,
    private auditLog: AuditLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check for @Public() decorator
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      await this.logAuthFailure(request, 'missing_token');
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const payload = await this.tokenService.verifyAccessToken(token);
      
      // Attach user to request
      (request as any).user = payload;
      (request as any).userId = payload.sub;
      (request as any).tenantId = payload.tenantId;

      return true;
    } catch (error) {
      await this.logAuthFailure(request, 'invalid_token', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) return null;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }

  private async logAuthFailure(
    request: Request,
    reason: string,
    error?: any
  ): Promise<void> {
    await this.auditLog.logAuthentication('failed', {
      id: 'anonymous',
      type: 'anonymous',
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    }, {
      status: 'failure',
      errorCode: reason,
      errorMessage: error?.message,
    });
  }
}
```

#### 2. `services/api-gateway/src/security/decorators/public.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### Acceptance Criteria
- [ ] JWT tokens validated correctly
- [ ] Public routes bypass authentication
- [ ] User payload attached to request
- [ ] Failed auth attempts logged
- [ ] Token expiration handled
- [ ] Blacklisted tokens rejected

---

## Chunk 2.2: Authorization Guard (RBAC/ABAC)

**Time Estimate:** 6-8 hours  
**Priority:** P0 - Critical  
**Dependencies:** Chunk 2.1

### Files to Create

#### 1. `services/api-gateway/src/security/guards/authorization.guard.ts`

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuditLogService } from '../services/audit-log.service';
import { 
  PERMISSIONS_KEY, 
  ROLES_KEY,
  RESOURCE_KEY,
} from '../decorators/permissions.decorator';

interface User {
  sub: string;
  roles: string[];
  permissions: string[];
  tenantId: string;
}

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private auditLog: AuditLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    // If no permissions/roles required, allow
    if (!requiredPermissions?.length && !requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user as User;

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    // Check roles (any role matches)
    if (requiredRoles?.length) {
      const hasRole = requiredRoles.some(role => 
        user.roles.includes(role)
      );
      if (!hasRole) {
        await this.logDenied(request, user, 'insufficient_role');
        throw new ForbiddenException('Insufficient role');
      }
    }

    // Check permissions (all permissions required)
    if (requiredPermissions?.length) {
      const hasPermissions = requiredPermissions.every(perm =>
        user.permissions.includes(perm)
      );
      if (!hasPermissions) {
        await this.logDenied(request, user, 'insufficient_permissions');
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    // Log successful authorization
    await this.auditLog.log({
      eventType: 'authorization.access_granted',
      eventCategory: 'authorization',
      severity: 'low',
      actor: { id: user.sub, type: 'user' },
      action: { 
        name: 'access_granted',
        method: request.method,
        path: request.path,
      },
      result: { status: 'success' },
    });

    return true;
  }

  private async logDenied(
    request: Request, 
    user: User, 
    reason: string
  ): Promise<void> {
    await this.auditLog.log({
      eventType: 'authorization.access_denied',
      eventCategory: 'authorization',
      severity: 'medium',
      actor: { id: user.sub, type: 'user' },
      action: {
        name: 'access_denied',
        method: request.method,
        path: request.path,
      },
      result: { status: 'failure', errorCode: reason },
    });
  }
}
```

#### 2. `services/api-gateway/src/security/decorators/permissions.decorator.ts`

```typescript
import { SetMetadata, applyDecorators } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const ROLES_KEY = 'roles';
export const RESOURCE_KEY = 'resource';

// Require specific permissions
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

// Require any of the specified roles
export const RequireRoles = (...roles: string[]) =>
  SetMetadata(ROLES_KEY, roles);

// Specify resource type for ABAC
export const Resource = (type: string) =>
  SetMetadata(RESOURCE_KEY, type);

// Common permission combinations
export const AdminOnly = () => RequireRoles('admin', 'super_admin');
export const TeacherOrAdmin = () => RequireRoles('teacher', 'admin', 'super_admin');
export const ParentOrAdmin = () => RequireRoles('parent', 'guardian', 'admin');

// Usage examples:
// @RequirePermissions('students:read', 'students:write')
// @RequireRoles('teacher', 'admin')
// @AdminOnly()
```

### Acceptance Criteria
- [ ] Role-based access control implemented
- [ ] Permission-based access control implemented
- [ ] Multiple roles/permissions combinable
- [ ] Access denied events logged
- [ ] Access granted events logged
- [ ] Decorators easy to use

---

## Chunk 2.3: Rate Limit Guard

**Time Estimate:** 3-4 hours  
**Priority:** P0 - Critical  
**Dependencies:** Phase 1

### Files to Create

#### 1. `services/api-gateway/src/security/guards/rate-limit.guard.ts`

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { RATE_LIMIT_KEY } from '../decorators/rate-limit.decorator';

interface RateLimitConfig {
  points: number;      // Number of requests allowed
  duration: number;    // Time window in seconds
  blockDuration?: number; // Block duration when exceeded
}

const DEFAULT_LIMIT: RateLimitConfig = {
  points: 100,
  duration: 60,
  blockDuration: 60,
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRedis() private redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.getAllAndOverride<RateLimitConfig>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()]
    ) || DEFAULT_LIMIT;

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    
    const key = this.getKey(request);
    const result = await this.consume(key, config);

    // Set rate limit headers
    response.setHeader('X-RateLimit-Limit', config.points);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining));
    response.setHeader('X-RateLimit-Reset', result.resetTime);

    if (result.blocked) {
      response.setHeader('Retry-After', result.retryAfter);
      throw new HttpException({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Too many requests',
        retryAfter: result.retryAfter,
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }

  private getKey(request: Request): string {
    const user = (request as any).user;
    const identifier = user?.sub || request.ip;
    return `ratelimit:${request.path}:${identifier}`;
  }

  private async consume(
    key: string,
    config: RateLimitConfig
  ): Promise<{ remaining: number; blocked: boolean; resetTime: number; retryAfter: number }> {
    const now = Date.now();
    const windowStart = now - (config.duration * 1000);

    // Use Redis sorted set for sliding window
    const multi = this.redis.multi();
    multi.zremrangebyscore(key, 0, windowStart);
    multi.zadd(key, now.toString(), `${now}-${Math.random()}`);
    multi.zcard(key);
    multi.expire(key, config.duration);

    const results = await multi.exec();
    const count = results?.[2]?.[1] as number || 0;

    const remaining = config.points - count;
    const blocked = remaining < 0;
    const resetTime = Math.ceil((now + config.duration * 1000) / 1000);
    const retryAfter = blocked ? config.blockDuration || config.duration : 0;

    return { remaining, blocked, resetTime, retryAfter };
  }
}
```

#### 2. `services/api-gateway/src/security/decorators/rate-limit.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  points: number;
  duration: number;
  blockDuration?: number;
}

export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

// Presets
export const StrictRateLimit = () => RateLimit({ points: 10, duration: 60 });
export const AuthRateLimit = () => RateLimit({ points: 5, duration: 60, blockDuration: 300 });
export const ApiRateLimit = () => RateLimit({ points: 100, duration: 60 });
```

### Acceptance Criteria
- [ ] Sliding window rate limiting implemented
- [ ] Per-user and per-IP limiting
- [ ] Rate limit headers in response
- [ ] Configurable via decorator
- [ ] Redis-based for distributed systems
- [ ] Retry-After header on limit exceeded

---

## Chunk 2.4: IP Whitelist Guard

**Time Estimate:** 2-3 hours  
**Priority:** P1 - High  
**Dependencies:** None

### Files to Create

#### 1. `services/api-gateway/src/security/guards/ip-whitelist.guard.ts`

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { IP_WHITELIST_KEY } from '../decorators/ip-whitelist.decorator';

@Injectable()
export class IpWhitelistGuard implements CanActivate {
  private globalWhitelist: string[];

  constructor(
    private reflector: Reflector,
    private config: ConfigService,
  ) {
    this.globalWhitelist = this.config.get<string>('IP_WHITELIST', '')
      .split(',')
      .filter(Boolean);
  }

  canActivate(context: ExecutionContext): boolean {
    const requiresWhitelist = this.reflector.getAllAndOverride<boolean>(
      IP_WHITELIST_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiresWhitelist) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = this.getClientIp(request);

    if (!this.isWhitelisted(clientIp)) {
      throw new ForbiddenException('Access denied from this IP address');
    }

    return true;
  }

  private getClientIp(request: Request): string {
    // Check for proxy headers
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) 
        ? forwardedFor[0] 
        : forwardedFor.split(',')[0];
      return ips.trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    return request.ip || request.socket.remoteAddress || '';
  }

  private isWhitelisted(ip: string): boolean {
    return this.globalWhitelist.some(allowed => {
      // Support CIDR notation
      if (allowed.includes('/')) {
        return this.isInCidr(ip, allowed);
      }
      return ip === allowed;
    });
  }

  private isInCidr(ip: string, cidr: string): boolean {
    const [range, bits] = cidr.split('/');
    const mask = ~(2 ** (32 - parseInt(bits)) - 1);
    const ipNum = this.ipToNumber(ip);
    const rangeNum = this.ipToNumber(range);
    return (ipNum & mask) === (rangeNum & mask);
  }

  private ipToNumber(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }
}
```

### Acceptance Criteria
- [ ] IP whitelist enforced on decorated endpoints
- [ ] CIDR notation supported
- [ ] Proxy headers handled correctly
- [ ] Global and per-route whitelists
- [ ] Forbidden response on non-whitelisted IPs

---

## Chunk 2.5: Age Verification Guard

**Time Estimate:** 3-4 hours  
**Priority:** P0 - Critical  
**Dependencies:** Chunk 2.1

### Files to Create

#### 1. `services/api-gateway/src/security/guards/age-verification.guard.ts`

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { MIN_AGE_KEY } from '../decorators/age-verification.decorator';

const COPPA_AGE = 13;

@Injectable()
export class AgeVerificationGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const minAge = this.reflector.getAllAndOverride<number>(
      MIN_AGE_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (minAge === undefined) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const userId = (request as any).userId;

    if (!userId) {
      throw new ForbiddenException('Authentication required for age-restricted content');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { dateOfBirth: true },
    });

    if (!user?.dateOfBirth) {
      throw new ForbiddenException('Date of birth required for age-restricted content');
    }

    const age = this.calculateAge(user.dateOfBirth);

    if (age < minAge) {
      // Check for parental consent if under COPPA age
      if (age < COPPA_AGE) {
        const hasConsent = await this.checkParentalConsent(userId);
        if (!hasConsent) {
          throw new ForbiddenException('Parental consent required');
        }
      } else {
        throw new ForbiddenException(`Minimum age of ${minAge} required`);
      }
    }

    return true;
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  private async checkParentalConsent(userId: string): Promise<boolean> {
    const consent = await this.prisma.consent.findFirst({
      where: {
        userId,
        consentType: 'parental',
        status: 'active',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    return !!consent;
  }
}
```

#### 2. `services/api-gateway/src/security/decorators/age-verification.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';

export const MIN_AGE_KEY = 'minAge';

export const MinAge = (age: number) => SetMetadata(MIN_AGE_KEY, age);

// COPPA threshold
export const RequiresCOPPAConsent = () => MinAge(13);

// Adult content (if applicable)
export const AdultOnly = () => MinAge(18);
```

### Acceptance Criteria
- [ ] Age calculated correctly from DOB
- [ ] COPPA threshold (13) enforced
- [ ] Parental consent checked for minors
- [ ] Configurable age limits via decorator
- [ ] Missing DOB handled gracefully

---

## Chunk 2.6: Consent Guard

**Time Estimate:** 3-4 hours  
**Priority:** P0 - Critical  
**Dependencies:** Chunk 2.1, Chunk 5.1

### Files to Create

#### 1. `services/api-gateway/src/security/guards/consent.guard.ts`

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ConsentService } from '../services/consent.service';
import { REQUIRED_CONSENT_KEY, ConsentPurpose } from '../decorators/consent.decorator';

@Injectable()
export class ConsentGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private consentService: ConsentService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPurposes = this.reflector.getAllAndOverride<ConsentPurpose[]>(
      REQUIRED_CONSENT_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredPurposes?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const userId = (request as any).userId;

    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    const hasConsent = await this.consentService.hasValidConsent(
      userId,
      requiredPurposes
    );

    if (!hasConsent) {
      throw new ForbiddenException({
        message: 'Required consent not provided',
        requiredPurposes,
        consentUrl: '/consent/request',
      });
    }

    return true;
  }
}
```

#### 2. `services/api-gateway/src/security/decorators/consent.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';

export const REQUIRED_CONSENT_KEY = 'requiredConsent';

export type ConsentPurpose =
  | 'account_creation'
  | 'educational_services'
  | 'personalization'
  | 'analytics'
  | 'marketing'
  | 'third_party_sharing'
  | 'research'
  | 'ai_processing';

export const RequiresConsent = (...purposes: ConsentPurpose[]) =>
  SetMetadata(REQUIRED_CONSENT_KEY, purposes);

// Common combinations
export const RequiresEducationalConsent = () => 
  RequiresConsent('account_creation', 'educational_services');

export const RequiresAIConsent = () =>
  RequiresConsent('ai_processing', 'personalization');

export const RequiresMarketingConsent = () =>
  RequiresConsent('marketing');
```

### Acceptance Criteria
- [ ] Consent purposes verified
- [ ] Multiple purposes checked (all required)
- [ ] Expired consents rejected
- [ ] Helpful error message with consent URL
- [ ] Decorator easy to use

---

## Phase 2 Integration Checklist

After completing all Phase 2 chunks:

- [ ] All guards registered in SecurityModule
- [ ] Guard execution order is correct
- [ ] Decorators exported from index
- [ ] Unit tests for each guard
- [ ] Integration tests for auth flow
- [ ] Documentation updated

## Guard Execution Order

```
1. AuthenticationGuard (authenticate user)
2. RateLimitGuard (check rate limits)
3. IpWhitelistGuard (check IP restrictions)
4. AgeVerificationGuard (check age requirements)
5. ConsentGuard (check consent status)
6. AuthorizationGuard (check permissions)
```
