# Integration Service (@aivo/integration-svc)

The Integration Service provides **Public APIs** and **Webhook capabilities** for external partner integrations with the Aivo platform.

## Overview

This service enables:
- **Public REST APIs** for partners to access learner data, sessions, and analytics
- **Webhook delivery** to notify partners of platform events in real-time
- **API Key authentication** with scoped permissions and rate limiting
- **Secure webhook signing** using HMAC-SHA256

## Features

### Public APIs

| Endpoint | Method | Scope Required | Description |
|----------|--------|---------------|-------------|
| `/public/learners/:id/progress` | GET | `READ_LEARNER_PROGRESS` | Get learner mastery and engagement data |
| `/public/learners/:id/sessions` | GET | `READ_SESSION_DATA` | Get session history and metadata |
| `/public/events/external-learning` | POST | `WRITE_EXTERNAL_EVENTS` | Push external learning events |

### Webhook Events

| Event Type | Description | Payload |
|------------|-------------|---------|
| `SESSION_COMPLETED` | A learning session was completed | Session ID, duration, learner ID |
| `BASELINE_COMPLETED` | Baseline assessment finished | Learner ID, results |
| `RECOMMENDATION_CREATED` | New learning recommendation | Recommendation details |
| `MASTERY_MILESTONE` | Learner reached a mastery milestone | Skill, level, learner ID |
| `GOAL_COMPLETED` | Learning goal was achieved | Goal details |
| `CONTENT_ASSIGNED` | Content was assigned to learner | Assignment details |

### Admin APIs

Partners manage their integrations through admin APIs:

- `POST /admin/api-keys` - Create new API key
- `GET /admin/api-keys` - List API keys
- `DELETE /admin/api-keys/:id` - Revoke API key
- `POST /admin/webhooks` - Create webhook endpoint
- `GET /admin/webhooks` - List webhook endpoints
- `PUT /admin/webhooks/:id` - Update webhook endpoint
- `DELETE /admin/webhooks/:id` - Delete webhook endpoint
- `GET /admin/webhooks/:id/deliveries` - View delivery history

## Authentication

### API Key Authentication

All public API requests require an API key in the `X-Aivo-Api-Key` header:

```bash
curl -X GET "https://api.aivolearning.com/public/learners/learner-123/progress" \
  -H "X-Aivo-Api-Key: aivo_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

API keys are:
- Scoped to specific permissions
- Rate-limited (default: 1000 requests/hour)
- Hashed using SHA-256 (only prefix stored for display)

### Webhook Signature Verification

All webhook payloads are signed using HMAC-SHA256. Verify signatures to ensure authenticity:

```typescript
import crypto from 'crypto';

function verifyWebhook(payload: string, signature: string, timestamp: string, secret: string): boolean {
  // Check timestamp freshness (< 5 minutes)
  const timestampMs = parseInt(timestamp, 10);
  if (Date.now() - timestampMs > 5 * 60 * 1000) {
    return false;
  }

  // Verify signature
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', '')),
    Buffer.from(expectedSignature)
  );
}

// In your webhook handler:
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-aivo-signature'];
  const timestamp = req.headers['x-aivo-timestamp'];
  
  if (!verifyWebhook(JSON.stringify(req.body), signature, timestamp, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook...
});
```

## Webhook Delivery

### Retry Logic

Failed webhook deliveries are retried with exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 1 second |
| 3 | 2 seconds |
| 4 | 4 seconds |
| 5 | 8 seconds |
| 6+ | Marked as PERMANENT_FAILURE |

### Delivery Statuses

- `PENDING` - Queued for delivery
- `SUCCESS` - Successfully delivered (2xx response)
- `FAILED` - Delivery failed, will retry
- `PERMANENT_FAILURE` - All retries exhausted

## Getting Started

### Prerequisites

- Node.js 20.x
- PostgreSQL 15+
- pnpm

### Installation

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Start development server
pnpm dev
```

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://aivo:aivo@localhost:5434/integration_svc"

# Server
PORT=3009
NODE_ENV=development

# Webhook
WEBHOOK_TIMEOUT_MS=30000
WEBHOOK_MAX_RETRIES=5
WEBHOOK_WORKER_INTERVAL_MS=60000
```

## API Reference

### Get Learner Progress

```http
GET /public/learners/:learnerId/progress
```

**Response:**

```json
{
  "learnerId": "learner-123",
  "tenantId": "tenant-456",
  "overallMastery": 0.75,
  "skillMastery": {
    "algebra": 0.82,
    "geometry": 0.68
  },
  "totalSessions": 45,
  "totalTimeMinutes": 1350,
  "lastActiveAt": "2024-06-01T10:30:00Z"
}
```

### Create Webhook Endpoint

```http
POST /admin/webhooks
```

**Request:**

```json
{
  "url": "https://partner.com/webhook",
  "eventTypes": ["SESSION_COMPLETED", "MASTERY_MILESTONE"],
  "description": "Production webhook endpoint"
}
```

**Response:**

```json
{
  "id": "webhook-789",
  "url": "https://partner.com/webhook",
  "secret": "whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "eventTypes": ["SESSION_COMPLETED", "MASTERY_MILESTONE"],
  "isEnabled": true,
  "createdAt": "2024-06-01T12:00:00Z"
}
```

### Push External Learning Event

```http
POST /public/events/external-learning
```

**Request:**

```json
{
  "learnerId": "learner-123",
  "sourceSystem": "khan-academy",
  "eventType": "content_completed",
  "contentId": "algebra-101",
  "contentTitle": "Introduction to Algebra",
  "durationSeconds": 1800,
  "score": 0.85,
  "occurredAt": "2024-06-01T09:00:00Z",
  "metadata": {
    "exerciseCount": 10,
    "hintsUsed": 2
  }
}
```

## Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    External Partners                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│   │  API Keys   │    │  Webhooks   │    │  External   │   │
│   │  (inbound)  │    │  (outbound) │    │   Events    │   │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘   │
│          │                  │                   │          │
├──────────┼──────────────────┼───────────────────┼──────────┤
│          │                  │                   │          │
│   ┌──────▼──────────────────▼───────────────────▼──────┐   │
│   │               Integration Service                   │   │
│   │                                                     │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│   │  │  API Key    │  │  Webhook    │  │   Event     │ │   │
│   │  │  Validator  │  │  Dispatcher │  │   Handler   │ │   │
│   │  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│   │                                                     │   │
│   │  ┌─────────────────────────────────────────────┐   │   │
│   │  │              PostgreSQL Database            │   │   │
│   │  │  (api_keys, webhooks, delivery_attempts)    │   │   │
│   │  └─────────────────────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                     Aivo Core Services                      │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│   │ Session  │  │ Baseline │  │  Learner │  │  Goal    │   │
│   │   Svc    │  │   Svc    │  │Model Svc │  │   Svc    │   │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Security Considerations

1. **API Keys** are hashed using SHA-256 before storage
2. **Webhook secrets** are generated using cryptographically secure randomness
3. **Signature verification** uses timing-safe comparison to prevent timing attacks
4. **Rate limiting** prevents API abuse (configurable per key)
5. **Timestamp validation** prevents replay attacks on webhooks
6. **Tenant isolation** ensures partners can only access their own data

## License

Proprietary - Aivo Inc.
