# Sandbox Service

Backend service for managing partner sandbox environments, synthetic data, and developer tooling.

## Features

- **Partner Registration** - Register and approve partner applications
- **Sandbox Tenants** - Isolated sandbox environments per partner
- **Synthetic Data** - Generate realistic test data (learners, classes, sessions)
- **API Keys** - Create and manage sandbox API keys
- **Webhook Testing** - Send test webhooks to partner endpoints
- **Usage Analytics** - Track API usage per partner

## Architecture

```
sandbox-svc/
├── src/
│   ├── index.ts          # Server entry point
│   ├── routes/
│   │   ├── partners.ts   # Partner registration & management
│   │   ├── tenants.ts    # Sandbox tenant operations
│   │   ├── public-api.ts # Sandbox API endpoints
│   │   ├── webhooks.ts   # Webhook testing
│   │   └── admin.ts      # Admin operations
│   └── data/
│       └── generator.ts  # Synthetic data generator
├── prisma/
│   └── schema.prisma     # Database schema
└── tests/                # Test files
```

## API Routes

### Partner Routes (`/api/partners`)
- `POST /register` - Submit partner application
- `GET /me` - Get authenticated partner details
- `GET /status/:email` - Check application status

### Tenant Routes (`/api/tenants`)
- `GET /:tenantCode` - Get tenant details
- `POST /:tenantCode/api-keys` - Create API key
- `GET /:tenantCode/api-keys` - List API keys
- `DELETE /:tenantCode/api-keys/:keyId` - Revoke API key
- `POST /:tenantCode/webhooks` - Create webhook endpoint
- `GET /:tenantCode/webhooks` - List webhooks
- `PATCH /:tenantCode/webhooks/:webhookId` - Update webhook
- `DELETE /:tenantCode/webhooks/:webhookId` - Delete webhook
- `GET /:tenantCode/webhooks/:webhookId/deliveries` - Get delivery history

### Public API Routes (`/api/public/v1`)
These mirror production APIs but serve sandbox data:
- `GET /learners` - List learners
- `GET /learners/:learnerId` - Get learner details
- `GET /learners/:learnerId/progress` - Get learner progress
- `GET /learners/:learnerId/sessions` - Get learner sessions
- `GET /sessions/:sessionId` - Get session details
- `GET /classes` - List classes
- `GET /classes/:classId` - Get class details
- `GET /classes/:classId/analytics` - Get class analytics

### Webhook Routes (`/api/webhooks`)
- `POST /test` - Send test webhook
- `GET /samples` - Get sample payloads
- `POST /verify` - Test signature verification

### Admin Routes (`/api/admin`)
- `GET /partners` - List all partners
- `GET /partners/:partnerId` - Get partner details
- `POST /partners/:partnerId/approve` - Approve partner
- `POST /partners/:partnerId/reject` - Reject partner
- `POST /partners/:partnerId/suspend` - Suspend partner
- `POST /tenants/:tenantCode/generate-data` - Generate synthetic data
- `POST /tenants/:tenantCode/reset` - Reset tenant data
- `GET /tenants/:tenantCode/usage` - Get usage analytics

## Database Schema

### Partner Models
- `Partner` - Partner organization
- `PartnerApplication` - Registration application

### Sandbox Models
- `SandboxTenant` - Isolated sandbox environment
- `SandboxApiKey` - API keys for sandbox access
- `SandboxWebhookEndpoint` - Webhook configurations
- `SandboxWebhookDelivery` - Delivery history

### Synthetic Data Models
- `SandboxSyntheticLearner` - Test learners
- `SandboxSyntheticTeacher` - Test teachers
- `SandboxSyntheticClass` - Test classes
- `SandboxSyntheticEnrollment` - Class enrollments
- `SandboxSyntheticSession` - Learning sessions
- `SandboxSyntheticLearnerProgress` - Progress records

## Development

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- pnpm 8+

### Setup

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your database URL

# Generate Prisma client
pnpm prisma generate

# Run migrations
pnpm prisma migrate dev

# Seed database (optional)
pnpm prisma db seed

# Start development server
pnpm dev
```

### Environment Variables

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/sandbox_db
PORT=3011
HOST=0.0.0.0
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:3010
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run in watch mode
pnpm test:watch
```

### API Key Format

Sandbox API keys follow the format:
```
aivo_sk_test_<32 bytes base64url>
```

Example: `aivo_sk_test_dGhpc2lzYXJlYWxseWxvbmdhcGlrZXl0aGF0aXNzZWN1cmU`

### Webhook Signatures

Webhooks are signed using HMAC-SHA256:
```
X-Aivo-Signature: t=<timestamp>,v1=<signature>
```

Verify with:
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const [timestampPart, signaturePart] = signature.split(',');
  const timestamp = timestampPart.split('=')[1];
  const providedSig = signaturePart.split('=')[1];
  
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
    
  return providedSig === expectedSig;
}
```

## Deployment

### Docker

```bash
docker build -t sandbox-svc .
docker run -p 3011:3011 --env-file .env sandbox-svc
```

### Kubernetes

See `infra/k8s/sandbox-svc/` for Kubernetes manifests.

## Related

- **web-dev-portal** - Frontend developer portal
- **integration-svc** - Production integration service
