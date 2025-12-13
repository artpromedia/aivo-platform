# Tenant Service

Node/TypeScript service for multi-tenant management in the AIVO platform.

## Overview

The Tenant Service handles:
- Tenant CRUD operations and configuration
- **Subdomain-to-Tenant Resolution** - Maps hostnames to tenant contexts
- Custom domain verification and management
- Tenant branding configuration

## Subdomain-to-Tenant Resolver

The resolver enables districts to access AIVO via custom subdomains or their own domains:

| Access Pattern | Example | Resolution Source |
|----------------|---------|-------------------|
| Consumer | `app.aivo.ai` | Default tenant / JWT |
| District Subdomain | `springfield-schools.aivo.ai` | Subdomain lookup |
| Custom Domain | `learning.springfield.edu` | Domain mapping |

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Incoming Request                             │
│            Host: springfield-schools.aivo.ai                    │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Tenant Resolver Plugin                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 1. Check if custom domain (not *.aivo.ai)                 │  │
│  │ 2. Extract subdomain from base domain                     │  │
│  │ 3. Look up in Redis cache → DB fallback                   │  │
│  │ 4. Decorate request.tenantContext                         │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              Redis Cache (5-min TTL)                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ tenant:subdomain:springfield-schools → TenantResolution   │  │
│  │ tenant:domain:learning.example.edu → TenantResolution     │  │
│  │ tenant:id:uuid → Tenant                                   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Usage

#### 1. Register the Plugin

```typescript
import { tenantResolverPlugin } from './plugins/tenant-resolver.plugin';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

fastify.register(tenantResolverPlugin, {
  redis,
  prisma,
  baseDomain: 'aivo.ai',
  cacheTtlSeconds: 300,
  defaultTenantId: process.env.DEFAULT_TENANT_ID,
});
```

#### 2. Access Tenant Context in Routes

```typescript
fastify.get('/api/dashboard', async (request, reply) => {
  const { tenantId, tenant, source } = request.tenantContext;
  
  if (!tenantId) {
    return reply.code(404).send({ error: 'Tenant not found' });
  }
  
  // Use tenant context
  return {
    greeting: `Welcome to ${tenant.name}`,
    branding: tenant.branding,
  };
});
```

#### 3. Require Tenant Context

```typescript
import { requireTenantContext } from './plugins/tenant-resolver.plugin';

// Using preHandler hook
fastify.get('/api/protected', {
  preHandler: requireTenantContext,
}, async (request) => {
  // tenantContext guaranteed to exist
  const { tenantId } = request.tenantContext;
  return { tenantId };
});
```

### Custom Domain Verification

Districts can configure custom domains with DNS verification:

#### Step 1: Initiate Verification

```http
POST /admin/tenants/:tenantId/domains
Content-Type: application/json

{
  "domain": "learning.springfield.edu"
}
```

Response:
```json
{
  "tenantId": "uuid",
  "domain": "learning.springfield.edu",
  "verification": {
    "type": "TXT",
    "host": "_aivo-verify.learning.springfield.edu",
    "value": "_aivo-verification=abc123def456",
    "expiresAt": "2025-01-19T00:00:00.000Z"
  },
  "instructions": [
    "Add a TXT record to your DNS configuration:",
    "Host: _aivo-verify.learning.springfield.edu",
    "Value: _aivo-verification=abc123def456",
    ...
  ]
}
```

#### Step 2: Add DNS Record

District IT adds the TXT record to their DNS:

| Type | Host | Value |
|------|------|-------|
| TXT | `_aivo-verify.learning.springfield.edu` | `_aivo-verification=abc123def456` |

#### Step 3: Verify Domain

```http
POST /admin/tenants/:tenantId/domains/verify?domain=learning.springfield.edu
```

Response (success):
```json
{
  "tenantId": "uuid",
  "domain": "learning.springfield.edu",
  "result": {
    "verified": true
  }
}
```

### Admin API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/tenants/:tenantId/domains` | Get domain configuration |
| PUT | `/admin/tenants/:tenantId/subdomain` | Update subdomain |
| POST | `/admin/tenants/:tenantId/domains` | Add custom domain |
| POST | `/admin/tenants/:tenantId/domains/verify` | Verify domain |
| DELETE | `/admin/tenants/:tenantId/domains` | Remove custom domain |
| POST | `/admin/tenants/:tenantId/cache/invalidate` | Clear cache |

### Database Schema

The resolver uses these fields on the `Tenant` model:

```prisma
model Tenant {
  subdomain         String?   @unique
  customDomain      String?   @unique
  domainVerified    Boolean   @default(false)
  domainVerifiedAt  DateTime?
  region            String    @default("us-east-1")
  isActive          Boolean   @default(true)
  
  // Branding
  logoUrl           String?
  primaryColor      String?
  
  domainVerifications TenantDomainVerification[]
}

model TenantDomainVerification {
  tenantId           String
  domain             String
  verificationToken  String
  verificationType   DomainVerificationType  // TXT or CNAME
  verificationValue  String
  status             DomainVerificationStatus
  expiresAt          DateTime
  // ...
}
```

### Configuration

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `BASE_DOMAIN` | Base domain for subdomain extraction | `aivo.ai` |
| `REDIS_URL` | Redis connection string | - |
| `DEFAULT_TENANT_ID` | Tenant ID for consumer access | - |
| `CACHE_TTL_SECONDS` | Cache TTL in seconds | `300` |

### Cache Invalidation

Cache is automatically invalidated when:
- Subdomain is updated
- Custom domain is verified or removed
- Tenant is updated

Manual invalidation:
```http
POST /admin/tenants/:tenantId/cache/invalidate
```

### Testing

```bash
# Run all tests
pnpm test

# Run resolver tests only
pnpm test tenant-resolver
```

### Migration

Apply the migration to add domain resolution fields:

```bash
pnpm prisma migrate deploy
```

## Development

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma generate

# Run migrations
pnpm prisma migrate dev

# Start development server
pnpm dev
```
