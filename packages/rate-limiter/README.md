# @aivo/rate-limiter

A comprehensive, production-ready rate limiting and throttling library for Node.js applications. Built with TypeScript, supporting multiple algorithms, distributed systems via Redis, and excellent NestJS integration.

## Features

- 🚀 **Multiple Algorithms**: Sliding window, token bucket, fixed window, leaky bucket, and adaptive rate limiting
- 🌐 **Distributed**: Redis-backed for cluster/multi-instance deployments
- 📊 **Tiered Limits**: Different limits for free, basic, professional, and enterprise users
- 🎯 **Granular Control**: Rate limit by user, IP, API key, tenant, or endpoint
- 🔧 **Flexible**: Works with Express, NestJS, and any Node.js framework
- 📈 **Standard Headers**: Full support for `X-RateLimit-*` and `Retry-After` headers
- 🔌 **Circuit Breaker**: Built-in circuit breaker pattern for resilience
- ⚡ **Priority Queue**: Queue high-priority requests when rate limited
- 📅 **Quota Management**: Daily, weekly, and monthly quotas

## Installation

```bash
pnpm add @aivo/rate-limiter
# or
npm install @aivo/rate-limiter
# or
yarn add @aivo/rate-limiter
```

For Redis support:
```bash
pnpm add ioredis
```

## Quick Start

### Basic Usage

```typescript
import { RateLimiter, MemoryStore } from '@aivo/rate-limiter';

const rateLimiter = new RateLimiter({
  store: new MemoryStore(),
  defaultAlgorithm: 'sliding-window',
});

// Check rate limit
const result = await rateLimiter.check({
  userId: 'user-123',
  endpoint: '/api/users',
  method: 'GET',
});

if (!result.allowed) {
  console.log(`Rate limited. Retry after ${result.retryAfter} seconds`);
}
```

### With Redis (Distributed)

```typescript
import Redis from 'ioredis';
import { RateLimiter, RedisStore } from '@aivo/rate-limiter';

const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

const rateLimiter = new RateLimiter({
  store: new RedisStore(redis),
  defaultAlgorithm: 'sliding-window',
});
```

### Express Middleware

```typescript
import express from 'express';
import { RateLimiter, createRateLimitMiddleware, MemoryStore } from '@aivo/rate-limiter';

const app = express();

const rateLimiter = new RateLimiter({
  store: new MemoryStore(),
});

app.use(createRateLimitMiddleware({
  rateLimiter,
  setHeaders: true,
}));

app.get('/api/data', (req, res) => {
  res.json({ message: 'Success!' });
});
```

### NestJS Integration

```typescript
import { Module } from '@nestjs/common';
import { RateLimitModule, RateLimitGuard } from '@aivo/rate-limiter';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    RateLimitModule.forRoot({
      defaultAlgorithm: 'sliding-window',
      debug: true,
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule {}
```

With decorators:

```typescript
import { Controller, Get, Post } from '@nestjs/common';
import { RateLimit, Throttle, SkipRateLimit } from '@aivo/rate-limiter';

@Controller('api')
export class ApiController {
  @Get('data')
  @Throttle(100, 60) // 100 requests per 60 seconds
  getData() {
    return { data: 'Hello!' };
  }

  @Post('sensitive')
  @RateLimit({
    limit: 10,
    windowSeconds: 60,
    algorithm: 'token-bucket',
    scope: ['user', 'ip'],
  })
  sensitiveOperation() {
    return { success: true };
  }

  @Get('health')
  @SkipRateLimit()
  healthCheck() {
    return { status: 'ok' };
  }
}
```

## Algorithms

### Sliding Window

Best for most use cases. Provides smooth rate limiting without boundary issues.

```typescript
const rateLimiter = new RateLimiter({
  defaultAlgorithm: 'sliding-window',
});
```

### Token Bucket

Excellent for APIs that need to handle bursts while maintaining average rate.

```typescript
const rateLimiter = new RateLimiter({
  defaultAlgorithm: 'token-bucket',
});
```

### Fixed Window

Simple and memory-efficient, but can allow bursts at window boundaries.

```typescript
const rateLimiter = new RateLimiter({
  defaultAlgorithm: 'fixed-window',
});
```

### Leaky Bucket

Provides very smooth output rate, ideal for preventing sudden spikes.

```typescript
const rateLimiter = new RateLimiter({
  defaultAlgorithm: 'leaky-bucket',
});
```

### Adaptive

Dynamically adjusts limits based on server load, error rates, and response times.

```typescript
const rateLimiter = new RateLimiter({
  defaultAlgorithm: 'adaptive',
});

// Check with adaptive options
const result = await rateLimiter.check({
  userId: 'user-123',
  endpoint: '/api/data',
}, {
  serverLoad: 0.75,
  errorRate: 0.02,
  avgResponseTime: 150,
});
```

## Rate Limit Tiers

Define different limits for different user tiers:

```typescript
import { RateLimiter, defaultTiers } from '@aivo/rate-limiter';

const rateLimiter = new RateLimiter({
  tiers: {
    free: {
      name: 'free',
      limits: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
        burstLimit: 10,
        concurrentRequests: 5,
      },
      priority: 1,
    },
    professional: {
      name: 'professional',
      limits: {
        requestsPerMinute: 1000,
        requestsPerHour: 50000,
        requestsPerDay: 500000,
        burstLimit: 100,
        concurrentRequests: 25,
      },
      priority: 3,
    },
  },
});

// Use with tier
const result = await rateLimiter.check({
  userId: 'user-123',
  tier: 'professional',
  endpoint: '/api/data',
});
```

## Custom Rules

Define endpoint-specific rules:

```typescript
const rateLimiter = new RateLimiter({
  rules: [
    {
      id: 'auth-login',
      match: { path: '/api/*/auth/login', method: 'POST' },
      limits: { limit: 5, windowSeconds: 60 },
      algorithm: 'sliding-window',
      priority: 100,
      scope: ['ip'],
      action: {
        type: 'reject',
        statusCode: 429,
        message: 'Too many login attempts.',
      },
    },
    {
      id: 'ai-generate',
      match: { path: '/api/*/ai/*', method: 'POST' },
      limits: { limit: 20, windowSeconds: 60 },
      algorithm: 'leaky-bucket',
      priority: 85,
      scope: ['user', 'tenant'],
    },
  ],
});
```

## Circuit Breaker

Prevent cascading failures:

```typescript
import { CircuitBreaker } from '@aivo/rate-limiter';

const breaker = new CircuitBreaker({
  name: 'external-api',
  failureThreshold: 5,
  resetTimeout: 30000,
  onOpen: () => console.log('Circuit opened!'),
  onClose: () => console.log('Circuit closed!'),
});

try {
  const result = await breaker.execute(async () => {
    return await callExternalAPI();
  });
} catch (error) {
  if (error instanceof CircuitBreakerOpenError) {
    // Circuit is open, use fallback
    return getCachedData();
  }
  throw error;
}
```

## Priority Queue

Queue requests when rate limited:

```typescript
import { PriorityQueue } from '@aivo/rate-limiter';

const queue = new PriorityQueue({
  name: 'rate-limit-queue',
  maxSize: 1000,
  processInterval: 100,
});

// Enqueue a request
await queue.enqueue({
  id: 'req-123',
  priority: 3, // Higher = processed first
  data: { userId: '123', action: 'generate' },
});

// Process queue
queue.startProcessing(async (item) => {
  await processRequest(item.data);
});
```

## Quota Management

Track daily, weekly, and monthly quotas:

```typescript
import { QuotaManager } from '@aivo/rate-limiter';

const quotaManager = new QuotaManager({
  quotas: {
    'ai-requests': { daily: 100, monthly: 2000 },
    'file-uploads': { daily: 50, weekly: 200, monthly: 500 },
  },
});

// Check quota
const result = await quotaManager.check('user:123', 'ai-requests');
if (!result.allowed) {
  console.log(`Quota exceeded. Resets at ${new Date(result.reset.daily)}`);
}

// Consume quota
await quotaManager.consume('user:123', 'ai-requests', 1);

// Get usage
const usage = await quotaManager.getUsage('user:123', 'ai-requests');
console.log(`Used ${usage.daily.used} of ${usage.daily.limit} today`);
```

## Bypass Mechanisms

Allow certain requests to bypass rate limiting:

```typescript
const rateLimiter = new RateLimiter({
  bypassIPs: ['10.0.0.1', '192.168.1.1'],
  bypassApiKeys: ['admin-key-123'],
});

// Or dynamically
rateLimiter.addBypassIP('10.0.0.100');
rateLimiter.addBypassApiKey('service-account-key');

// Internal requests bypass automatically
const result = await rateLimiter.check({
  userId: 'service',
  isInternal: true,
});
// result.allowed === true (always)
```

## Gateway Integration

For API Gateway deployments:

```typescript
import { Module } from '@nestjs/common';
import { GatewayRateLimitModule, GatewayRateLimitGuard } from '@aivo/rate-limiter';
import { APP_GUARD } from '@nestjs/core';
import Redis from 'ioredis';

@Module({
  imports: [
    GatewayRateLimitModule.forRoot({
      redis: new Redis(),
      debug: true,
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5,
      },
      priorityQueue: {
        enabled: true,
        maxSize: 10000,
      },
      quotaManager: {
        enabled: true,
        quotas: {
          'ai-requests': { daily: 100, monthly: 2000 },
        },
      },
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: GatewayRateLimitGuard,
    },
  ],
})
export class GatewayModule {}
```

## Admin API

Manage rate limits dynamically:

```typescript
import { RateLimitAdminController } from '@aivo/rate-limiter';

@Module({
  controllers: [RateLimitAdminController],
})
export class AdminModule {}
```

Endpoints:
- `GET /admin/rate-limits/rules` - Get all rules
- `POST /admin/rate-limits/rules` - Add a rule
- `PUT /admin/rate-limits/rules/:id` - Update a rule
- `DELETE /admin/rate-limits/rules/:id` - Delete a rule
- `POST /admin/rate-limits/bypass/ip` - Add bypass IP
- `POST /admin/rate-limits/reset` - Reset rate limit for a key

## Headers

The middleware automatically sets standard rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
X-RateLimit-Policy: api-default
Retry-After: 30 (only when rate limited)
```

## Testing

For testing, use the MemoryStore:

```typescript
import { RateLimiter, MemoryStore } from '@aivo/rate-limiter';

describe('MyService', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      store: new MemoryStore(),
    });
  });

  it('should rate limit after exceeding threshold', async () => {
    for (let i = 0; i < 10; i++) {
      await rateLimiter.consume({ userId: 'test', endpoint: '/api/test' });
    }

    const result = await rateLimiter.check({ userId: 'test', endpoint: '/api/test' });
    expect(result.allowed).toBe(false);
  });
});
```

## Configuration

### RateLimiter Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `store` | `RateLimitStore` | `MemoryStore` | Storage backend |
| `defaultAlgorithm` | `AlgorithmType` | `'sliding-window'` | Default algorithm |
| `tiers` | `Record<string, RateLimitTier>` | `defaultTiers` | Tier configurations |
| `rules` | `RateLimitRule[]` | `defaultRules` | Rate limit rules |
| `defaultLimits` | `{ limit, windowSeconds }` | `{ 100, 60 }` | Default limits |
| `keyPrefix` | `string` | `'rl:'` | Redis key prefix |
| `bypassIPs` | `string[]` | `[]` | IPs that bypass limiting |
| `bypassApiKeys` | `string[]` | `[]` | API keys that bypass limiting |
| `failOpen` | `boolean` | `true` | Allow requests if store fails |
| `debug` | `boolean` | `false` | Enable debug logging |

## License

MIT
