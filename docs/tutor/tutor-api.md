# Tutor Service API Reference

Base URL: `/api/v1/tutor`

All endpoints require a valid JWT bearer token. The token must include `tenantId` (or `tenant_id`) and `sub` (user ID) claims.

---

## Sessions

### POST /sessions

Create a new tutoring session.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `learnerId` | `string (uuid)` | Yes | UUID of the learner |
| `personaSlug` | `string` | Yes | Persona identifier (e.g. `nova-math`) |
| `subject` | `enum` | Yes | `MATH`, `ELA`, `SCIENCE`, `HISTORY`, or `CODING` |
| `topic` | `string` | No | Optional topic focus (max 255 chars) |
| `locale` | `string` | No | BCP-47 locale code (default: `en-US`) |

**Pre-flight Checks**

1. Feature flag `FEATURE_TUTOR_ENABLED` must be active (HTTP 503 if disabled)
2. Subject-specific feature flag must be active (HTTP 503 if disabled)
3. Tenant entitlement check via billing-svc (HTTP 403 if no subscription)
4. Persona slug must exist and match the requested subject (HTTP 404 / 400)

**Response (201)**

```json
{
  "id": "uuid",
  "learnerId": "uuid",
  "personaId": "uuid",
  "status": "ACTIVE",
  "subject": "MATH",
  "topic": "fractions",
  "locale": "en-US",
  "startedAt": "2026-02-26T10:00:00.000Z",
  "persona": {
    "id": "uuid",
    "slug": "nova-math",
    "name": "Nova",
    "subject": "MATH",
    "avatarRivAsset": "/assets/avatars/nova.riv",
    "avatarStaticImage": "/assets/avatars/nova.png"
  },
  "localeInfo": {
    "languageName": "English",
    "nativeLanguageName": "English",
    "isRTL": false,
    "voiceAvailable": true,
    "voiceId": "en-us-ryan-medium",
    "voiceFallbackUsed": false,
    "resolvedVoiceLocale": "en-US"
  },
  "openingMessage": {
    "content": "Hi there! I'm Nova, your math tutor...",
    "emotionTag": "cheerful",
    "avatarState": "talking"
  }
}
```

**Error Responses**

| Code | Body | Cause |
|------|------|-------|
| 401 | `{ "error": "Tenant ID required" }` | Missing or invalid JWT |
| 403 | `{ "error": "Tutor add-on required", "reason": "..." }` | No active subscription |
| 404 | `{ "error": "Persona not found: slug" }` | Invalid persona slug |
| 400 | `{ "error": "Persona is for MATH, not ELA" }` | Subject mismatch |
| 503 | `{ "error": "AI tutoring is not yet available", "code": "TUTOR_NOT_ENABLED" }` | Feature flag off |
| 503 | `{ "error": "MATH tutoring is not yet available", "code": "TUTOR_SUBJECT_NOT_ENABLED" }` | Subject flag off |

---

### GET /sessions

List sessions for the current tenant.

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `learnerId` | `uuid` | JWT `sub` | Filter by learner |
| `status` | `enum` | all | `ACTIVE`, `PAUSED`, `COMPLETED`, `EXPIRED`, `ERROR` |
| `limit` | `int` | 20 | Page size (1-50) |
| `offset` | `int` | 0 | Pagination offset |

**Response (200)**

```json
{
  "sessions": [
    {
      "id": "uuid",
      "learnerId": "uuid",
      "personaId": "uuid",
      "status": "COMPLETED",
      "subject": "MATH",
      "topic": "fractions",
      "locale": "en-US",
      "startedAt": "2026-02-26T10:00:00.000Z",
      "endedAt": "2026-02-26T10:25:00.000Z",
      "persona": { "id": "...", "slug": "nova-math", "name": "Nova", "subject": "MATH", "avatarRivAsset": "...", "avatarStaticImage": "..." }
    }
  ],
  "total": 42
}
```

---

### GET /sessions/:sessionId

Get a specific session with the last 50 messages.

**Response (200)**

```json
{
  "id": "uuid",
  "learnerId": "uuid",
  "personaId": "uuid",
  "status": "ACTIVE",
  "subject": "MATH",
  "topic": "fractions",
  "locale": "en-US",
  "startedAt": "...",
  "endedAt": null,
  "totalMessages": 12,
  "totalDurationMs": 600000,
  "totalTokensUsed": 3400,
  "persona": { "..." : "..." },
  "messages": [
    {
      "id": "uuid",
      "role": "ASSISTANT",
      "content": "Hi there! ...",
      "emotionTag": "cheerful",
      "avatarState": "talking",
      "createdAt": "2026-02-26T10:00:01.000Z"
    }
  ]
}
```

---

### PATCH /sessions/:sessionId

Update session locale mid-session. Inserts a SYSTEM message to switch the AI's response language.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `locale` | `string` | Yes | New BCP-47 locale code (2-10 chars) |

**Response (200)**

```json
{
  "id": "uuid",
  "locale": "es",
  "localeInfo": {
    "languageName": "Spanish",
    "nativeLanguageName": "Espanol",
    "isRTL": false,
    "voiceAvailable": true,
    "voiceId": "es-carlfm-medium",
    "voiceFallbackUsed": false,
    "resolvedVoiceLocale": "es"
  }
}
```

---

### POST /sessions/:sessionId/end

End an active or paused session. Calculates analytics and fires notification events.

**Response (200)**

```json
{
  "id": "uuid",
  "status": "COMPLETED",
  "endedAt": "2026-02-26T10:25:00.000Z"
}
```

---

## Personas

### GET /personas

List all active tutor personas.

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `subject` | `enum` | all | Filter by subject |

**Response (200)**

```json
{
  "personas": [
    {
      "id": "uuid",
      "slug": "nova-math",
      "name": "Nova",
      "subject": "MATH",
      "tagline": "Space explorer who makes math an adventure",
      "avatarRivAsset": "/assets/avatars/nova.riv",
      "avatarStaticImage": "/assets/avatars/nova.png",
      "isActive": true
    }
  ]
}
```

---

## Analytics (Parent Dashboard)

### GET /analytics/summary

Get aggregated tutor usage analytics for a parent's children.

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `learnerId` | `uuid` | No | Filter by child |
| `period` | `string` | `30d` | Time range: `7d`, `30d`, `90d` |

### GET /analytics/sessions

Get paginated session history for analytics.

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `learnerId` | `uuid` | all | Filter by child |
| `subject` | `enum` | all | Filter by subject |
| `limit` | `int` | 20 | Page size |
| `offset` | `int` | 0 | Offset |

### GET /analytics/transcript/:sessionId

Get the full message transcript for a completed session (parent review).

---

## Messages

### POST /sessions/:sessionId/messages

Send a learner message and receive the AI tutor's response.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | `string` | Yes | The learner's message text |

**Response (201)**

```json
{
  "userMessage": {
    "id": "uuid",
    "role": "USER",
    "content": "How do I add fractions?",
    "createdAt": "..."
  },
  "assistantMessage": {
    "id": "uuid",
    "role": "ASSISTANT",
    "content": "Great question! To add fractions...",
    "emotionTag": "encouraging",
    "avatarState": "talking",
    "tokensUsed": 245,
    "latencyMs": 1200,
    "createdAt": "..."
  }
}
```

---

## WebSocket (Real-time)

Connect to `ws://<realtime-svc>/tutor?sessionId=<id>&token=<jwt>` for streaming responses.

### Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `message` | `{ content: string }` | Send a learner message |

### Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `typing` | `{ isTyping: boolean }` | AI typing indicator |
| `stream` | `{ text: string, done: boolean }` | Streaming token chunks |
| `message` | `{ id, role, content, emotionTag, avatarState }` | Complete message |
| `audio` | `{ audioUrl: string, visemes: VisemeEvent[] }` | TTS audio with lip-sync |
| `avatar` | `{ state: string }` | Avatar animation state change |
| `error` | `{ message: string }` | Error notification |

---

## Feature Flags

The tutor service respects the following server-side feature flags (environment variables):

| Flag | Env Var | Default | Description |
|------|---------|---------|-------------|
| Tutor Master | `FEATURE_TUTOR_ENABLED` | `true` | Master toggle for all tutoring |
| Voice/TTS | `FEATURE_TUTOR_VOICE_ENABLED` | `true` | Enable TTS voice + lip-sync |
| Math Subject | `FEATURE_TUTOR_SUBJECTS_MATH` | `true` | Enable Math tutor (Nova) |
| ELA Subject | `FEATURE_TUTOR_SUBJECTS_ELA` | `true` | Enable ELA tutor (Sage) |
| Science Subject | `FEATURE_TUTOR_SUBJECTS_SCIENCE` | `true` | Enable Science tutor (Spark) |
| History Subject | `FEATURE_TUTOR_SUBJECTS_HISTORY` | `true` | Enable History tutor (Chrono) |
| Coding Subject | `FEATURE_TUTOR_SUBJECTS_CODING` | `true` | Enable Coding tutor (Pixel) |

Set any flag to `false` to disable: `FEATURE_TUTOR_SUBJECTS_HISTORY=false`

Client-side flags are managed via `@aivo/feature-flags` (web) and `flutter_common` (mobile) with the `ParityFeature` enum.
