# Tutor Service Integration Guide

## Architecture Overview

The tutor service (`tutor-svc`) is a Fastify-based Node.js microservice that orchestrates AI-powered tutoring sessions. It integrates with several platform services:

```
┌─────────────┐    ┌─────────────┐    ┌──────────────────┐
│ web-learner  │    │ mobile-     │    │ web-parent       │
│ (Next.js)    │    │ learner     │    │ (Next.js)        │
│              │    │ (Flutter)   │    │                  │
└──────┬───────┘    └──────┬──────┘    └────────┬─────────┘
       │                   │                    │
       └───────────┬───────┘                    │
                   ▼                            │
            ┌──────────────┐                    │
            │ Kong Gateway │ ◄──────────────────┘
            │ (JWT + Rate  │
            │  Limiting)   │
            └──────┬───────┘
                   │
      ┌────────────┼────────────────┐
      ▼            ▼                ▼
┌──────────┐ ┌──────────┐   ┌──────────────┐
│tutor-svc │ │realtime- │   │ parent-svc   │
│ :4025    │ │svc :4030 │   │ :3010        │
└─────┬────┘ └──────────┘   └──────────────┘
      │
      ├──► ai-orchestrator-svc :4005  (LLM routing)
      ├──► learner-model-svc :4015    (learner profiles)
      ├──► billing-svc :3150          (entitlement checks)
      ├──► Piper TTS :5100            (speech synthesis)
      ├──► Redis :6379/9              (TTS audio cache)
      ├──► NATS :4222                 (event bus)
      ├──► PostgreSQL                 (session/message storage)
      └──► S3 / MinIO                 (audio file storage)
```

## Session Lifecycle Sequence

```
Client          Kong         tutor-svc      ai-orchestrator    learner-model    billing-svc
  │               │              │                │                 │               │
  │ POST /sessions│              │                │                 │               │
  │──────────────►│─────────────►│                │                 │               │
  │               │              │ checkEntitlement│                 │               │
  │               │              │────────────────────────────────────────────────► │
  │               │              │◄────────────────────────────────────────────────│
  │               │              │                │                 │               │
  │               │              │ fetchProfile   │                 │               │
  │               │              │────────────────────────────────►│               │
  │               │              │◄────────────────────────────────│               │
  │               │              │                │                 │               │
  │               │              │ generateGreeting│                │               │
  │               │              │───────────────►│                │               │
  │               │              │◄───────────────│                │               │
  │               │              │                │                 │               │
  │  201 Created  │              │                │                 │               │
  │◄──────────────│◄─────────────│                │                 │               │
  │               │              │                │                 │               │
  │ WS connect    │  realtime-svc│                │                 │               │
  │─────────────────────────────►│                │                 │               │
  │               │              │                │                 │               │
  │ message       │              │                │                 │               │
  │─────────────────────────────►│ chat           │                 │               │
  │               │              │───────────────►│                │               │
  │  stream chunks│              │◄─ streaming ──│                │               │
  │◄─────────────────────────────│                │                 │               │
  │               │              │                │                 │               │
  │ POST /end     │              │                │                 │               │
  │──────────────►│─────────────►│                │                 │               │
  │               │              │──► NATS: session.ended           │               │
  │               │              │──► NATS: notification            │               │
  │  200 OK       │              │                │                 │               │
  │◄──────────────│◄─────────────│                │                 │               │
```

## Service Dependencies

### ai-orchestrator-svc

**Purpose**: Routes LLM requests to the appropriate model provider.

**Config**: `AI_ORCHESTRATOR_URL` (default: `http://localhost:4005`)

**Endpoint used**: `POST /api/v1/ai/chat`

The tutor-svc sends:
- `agentType`: e.g. `TUTOR_MATH_PREMIUM`
- `systemPrompt`: from persona template (includes safety rules)
- `messages`: conversation history
- `context`: session metadata + learner profile

**Failure mode**: If the AI orchestrator is unavailable during session creation, the tutor falls back to a template greeting. During messaging, the error is returned to the client.

### learner-model-svc

**Purpose**: Provides learner profile data (grade band, learning style, mastery levels, accessibility needs).

**Config**: `LEARNER_MODEL_URL` (default: `http://localhost:4015`)

**Endpoint used**: `GET /virtual-brains/:learnerId`

**Failure mode**: Non-blocking. Returns `null` and the session proceeds without personalization. The AI still functions correctly but without learner-specific context.

### billing-svc

**Purpose**: Validates that the tenant has an active AI tutor subscription.

**Config**: `BILLING_SVC_URL` (default: `http://localhost:3150`)

**Endpoint used**: `GET /api/v1/billing/entitlements/:tenantId/features/aiTutor`

**Failure mode**: In development, defaults to "allowed" (fail-open). In production, defaults to "denied" (fail-closed) to prevent unauthorized access.

### Piper TTS

**Purpose**: Self-hosted text-to-speech engine for voice output with viseme data.

**Config**: `TTS_SERVICE_URL` (default: `http://localhost:5100`)

**Failure mode**: Falls back to text-only mode. Audio URLs and visemes are omitted from the response.

### NATS JetStream

**Purpose**: Event bus for analytics and notification pipelines.

**Config**: `NATS_URL` (default: `nats://localhost:4222`), `NATS_ENABLED` (default: `true`)

**Events published**:
- `aivo.tutor.session.started` — session creation
- `aivo.tutor.session.ended` — session completion
- `aivo.tutor.message.sent` — each message (learner or assistant)
- `aivo.tutor.notification.*` — push notification triggers

**Failure mode**: Non-blocking. Events are dropped silently if NATS is unavailable. Analytics data is still persisted to PostgreSQL.

### Redis

**Purpose**: Caches TTS audio to avoid redundant synthesis calls.

**Config**: `REDIS_URL` (default: `redis://localhost:6379/9`)

**Failure mode**: Cache misses result in fresh TTS calls. No data loss.

### S3 / MinIO

**Purpose**: Stores generated audio files for playback.

**Config**: `AUDIO_S3_BUCKET`, `AUDIO_S3_ENDPOINT`, `AUDIO_S3_REGION`, `AUDIO_S3_ACCESS_KEY`, `AUDIO_S3_SECRET_KEY`, `AUDIO_CDN_BASE`

## Client Integration

### Web (Next.js)

The `web-learner` app connects to tutor-svc through Next.js API rewrites (production) or local route handlers (development).

**Production proxy** (in `next.config.js`):
```js
{
  source: '/api/tutor/:path*',
  destination: `${TUTOR_SVC_URL}/api/v1/tutor/:path*`,
}
```

**Feature flags**: Import from `@aivo/feature-flags`:
```tsx
import { useFeatureFlag, isTutorSubjectEnabled, ParityFeature } from '@aivo/feature-flags';

const tutorEnabled = useFeatureFlag(ParityFeature.TUTOR_ENABLED);
```

### Mobile (Flutter)

The `mobile-learner` app calls the tutor API directly (or via API gateway).

**Feature flags**: Import from `flutter_common`:
```dart
import 'package:flutter_common/features/feature_flags.dart';

if (!ParityFeature.tutorEnabled.isEnabled) {
  // show "coming soon" UI
}
```

### Parent Dashboard

The `web-parent` app accesses tutor analytics through the same proxy:
```js
{
  source: '/api/tutor/:path*',
  destination: `${TUTOR_SVC_URL}/api/v1/tutor/:path*`,
}
```

## Kong Gateway Configuration

The tutor-svc is fronted by Kong with these plugins:

| Plugin | Config | Purpose |
|--------|--------|---------|
| JWT | Consumer-based | Authenticate all requests |
| ACL | Group: `ai-tutor` | Consent gate |
| Rate Limiting | 200 req/min | Prevent abuse |
| Request Size | 100KB | Limit payload size |

## Database

tutor-svc uses its own PostgreSQL database (`aivo_tutor`) managed by Prisma ORM.

**Key tables**:
- `TutorPersona` — persona definitions (seeded)
- `TutorSession` — session records
- `TutorMessage` — message history
- `TutorSessionAnalytics` — usage metrics per session

**Migrations**: `npx prisma migrate deploy` (production) or `npx prisma db push` (development)

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `4025` | HTTP listen port |
| `DATABASE_URL` | Yes (prod) | `postgresql://localhost:5432/aivo_tutor` | PostgreSQL connection |
| `JWT_PUBLIC_KEY` | Yes (prod) | `test-jwt-key` | JWT verification key |
| `AI_ORCHESTRATOR_URL` | No | `http://localhost:4005` | AI orchestrator |
| `LEARNER_MODEL_URL` | No | `http://localhost:4015` | Learner model service |
| `BILLING_SVC_URL` | No | `http://localhost:3150` | Billing service |
| `TTS_SERVICE_URL` | No | `http://localhost:5100` | Piper TTS engine |
| `TTS_ENABLED` | No | `true` | Enable/disable TTS |
| `REDIS_URL` | No | `redis://localhost:6379/9` | Redis cache |
| `NATS_URL` | No | `nats://localhost:4222` | NATS event bus |
| `NATS_ENABLED` | No | `true` | Enable/disable NATS |
| `FEATURE_TUTOR_ENABLED` | No | `true` | Master tutor toggle |
| `FEATURE_TUTOR_VOICE_ENABLED` | No | `true` | Voice feature toggle |
| `FEATURE_TUTOR_SUBJECTS_MATH` | No | `true` | Math subject toggle |
| `FEATURE_TUTOR_SUBJECTS_ELA` | No | `true` | ELA subject toggle |
| `FEATURE_TUTOR_SUBJECTS_SCIENCE` | No | `true` | Science subject toggle |
| `FEATURE_TUTOR_SUBJECTS_HISTORY` | No | `true` | History subject toggle |
| `FEATURE_TUTOR_SUBJECTS_CODING` | No | `true` | Coding subject toggle |
| `AUDIO_S3_BUCKET` | No | `aivo-tutor-audio` | S3 bucket for audio |
| `AUDIO_S3_ENDPOINT` | No | `` | S3/MinIO endpoint |
| `AUDIO_CDN_BASE` | No | `` | CDN base URL for audio |
