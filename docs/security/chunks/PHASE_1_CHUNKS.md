# Phase 1: Core Security Infrastructure - Detailed Chunks

## Chunk 1.1: Security Module Setup

**Time Estimate:** 2-4 hours  
**Priority:** P0 - Critical  
**Dependencies:** None

### Files to Create

#### 1. `services/api-gateway/src/security/security.module.ts`

```typescript
// Main security module - see full implementation in prompt
// Key components:
// - ThrottlerModule configuration
// - Global guards registration
// - Global interceptors registration  
// - Global filters registration
// - Service exports
```

### Acceptance Criteria
- [ ] ThrottlerModule configured with Redis storage
- [ ] All guards registered as APP_GUARD
- [ ] All interceptors registered as APP_INTERCEPTOR
- [ ] All filters registered as APP_FILTER
- [ ] Middleware chain configured in correct order
- [ ] All services exported for use by other modules

### Testing Checklist
- [ ] Module compiles without errors
- [ ] All dependencies resolve correctly
- [ ] Middleware order is correct (correlation → security → sanitizer → csrf)

---

## Chunk 1.2: Security Middleware (Helmet)

**Time Estimate:** 3-4 hours  
**Priority:** P0 - Critical  
**Dependencies:** Chunk 1.1

### Files to Create

#### 1. `services/api-gateway/src/security/middleware/security.middleware.ts`

**Implementation Focus:**
- Helmet integration with comprehensive CSP
- HSTS with preload
- XSS protection headers
- Permissions-Policy (Feature-Policy)
- Cache control headers
- Remove X-Powered-By

### Key Configuration Points

```typescript
// CSP Sources to configure:
const cspConfig = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'", "cdn.aivo.edu", "googletagmanager.com"],
  styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
  imgSrc: ["'self'", "data:", "blob:", "cdn.aivo.edu", "amazonaws.com"],
  fontSrc: ["'self'", "fonts.gstatic.com"],
  connectSrc: ["'self'", "api.${domain}", "wss://api.${domain}"],
  frameSrc: ["'self'", "youtube.com", "vimeo.com"],
};

// Permissions-Policy directives:
const permissionsPolicy = [
  'accelerometer=()',
  'camera=()',
  'geolocation=()',
  'microphone=()',
  'payment=()',
  'interest-cohort=()', // Disable FLoC
];
```

### Acceptance Criteria
- [ ] Helmet middleware applied to all routes
- [ ] CSP configured with report-only in development
- [ ] HSTS enabled with 1-year max-age and preload
- [ ] All required headers set
- [ ] X-Powered-By removed
- [ ] Cache-Control set to no-store

### Testing Checklist
- [ ] Security headers present in response
- [ ] CSP violations logged (not blocking in dev)
- [ ] HSTS header correct format
- [ ] No sensitive server info leaked

---

## Chunk 1.3: Correlation ID Middleware

**Time Estimate:** 1-2 hours  
**Priority:** P0 - Critical  
**Dependencies:** None

### Files to Create

#### 1. `services/api-gateway/src/security/middleware/correlation-id.middleware.ts`

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

const CORRELATION_ID_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Get existing or generate new correlation ID
    const correlationId = req.headers[CORRELATION_ID_HEADER] as string || uuidv4();
    
    // Set on request for downstream use
    req.headers[CORRELATION_ID_HEADER] = correlationId;
    (req as any).correlationId = correlationId;
    
    // Set on response for client
    res.setHeader(CORRELATION_ID_HEADER, correlationId);
    
    next();
  }
}
```

### Acceptance Criteria
- [ ] Correlation ID generated if not present
- [ ] Existing correlation ID preserved
- [ ] ID available on request object
- [ ] ID returned in response header
- [ ] UUID v4 format used

---

## Chunk 1.4: Request Sanitizer Middleware

**Time Estimate:** 2-3 hours  
**Priority:** P0 - Critical  
**Dependencies:** Chunk 1.3

### Files to Create

#### 1. `services/api-gateway/src/security/middleware/request-sanitizer.middleware.ts`

**Implementation Focus:**
- XSS sanitization using DOMPurify or similar
- SQL injection pattern detection
- Path traversal prevention (../, ..\)
- Null byte injection prevention
- Request body size validation
- Content-Type validation

```typescript
// Dangerous patterns to detect:
const dangerousPatterns = [
  /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,  // SQL injection
  /((\%3C)|<)((\%2F)|\/)*[a-z0-9\%]+((\%3E)|>)/i,  // XSS tags
  /\.\.[\\/]/,  // Path traversal
  /\x00/,  // Null bytes
  /javascript:/i,  // JS protocol
  /vbscript:/i,  // VBS protocol
];
```

### Acceptance Criteria
- [ ] XSS payloads sanitized from input
- [ ] SQL injection patterns detected and logged
- [ ] Path traversal attempts blocked
- [ ] Null bytes removed
- [ ] Large payloads rejected (configurable limit)
- [ ] Content-Type validated for POST/PUT

### Testing Checklist
- [ ] Common XSS payloads sanitized
- [ ] SQL injection patterns detected
- [ ] Path traversal blocked
- [ ] Legitimate requests pass through

---

## Chunk 1.5: CSRF Middleware

**Time Estimate:** 2-3 hours  
**Priority:** P0 - Critical  
**Dependencies:** Chunk 1.3

### Files to Create

#### 1. `services/api-gateway/src/security/middleware/csrf.middleware.ts`

```typescript
import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const CSRF_TOKEN_HEADER = 'x-csrf-token';
const CSRF_COOKIE_NAME = '_csrf';
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  constructor(private config: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Skip for safe methods
    if (SAFE_METHODS.includes(req.method)) {
      // Generate token for forms
      this.setToken(req, res);
      return next();
    }

    // Validate token for unsafe methods
    const headerToken = req.headers[CSRF_TOKEN_HEADER] as string;
    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];

    if (!headerToken || !cookieToken || !this.validateTokens(headerToken, cookieToken)) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    next();
  }

  private setToken(req: Request, res: Response): void {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: 3600000, // 1 hour
    });
    (req as any).csrfToken = token;
  }

  private validateTokens(headerToken: string, cookieToken: string): boolean {
    return crypto.timingSafeEqual(
      Buffer.from(headerToken),
      Buffer.from(cookieToken)
    );
  }
}
```

### Acceptance Criteria
- [ ] CSRF token generated for GET requests
- [ ] Token set in HttpOnly cookie
- [ ] Token required in header for POST/PUT/DELETE
- [ ] Timing-safe comparison used
- [ ] SameSite=Strict cookie attribute
- [ ] API endpoints can be exempted via decorator

### Configuration Options
```typescript
interface CsrfConfig {
  enabled: boolean;
  cookieName: string;
  headerName: string;
  maxAge: number;
  exemptPaths: string[];
}
```

---

## Phase 1 Integration Checklist

After completing all Phase 1 chunks:

- [ ] Security module imports all middleware
- [ ] Middleware applied in correct order
- [ ] All environment variables documented
- [ ] README updated with security headers info
- [ ] Security headers tested with securityheaders.com
- [ ] No TypeScript errors
- [ ] All tests passing

## Environment Variables Required

```bash
# Phase 1 Environment Variables
NODE_ENV=development|production
APP_DOMAIN=aivo.edu
REDIS_URL=redis://localhost:6379
```

## Package Dependencies

```json
{
  "dependencies": {
    "helmet": "^7.1.0",
    "@nestjs/throttler": "^5.0.0",
    "uuid": "^9.0.0",
    "isomorphic-dompurify": "^2.0.0"
  }
}
```
