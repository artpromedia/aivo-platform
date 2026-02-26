# Tutor Service Runbook

Operational guide for deploying, monitoring, and troubleshooting tutor-svc.

---

## Deployment

### Prerequisites

- PostgreSQL database provisioned with connection string
- Redis instance available
- NATS server running (optional — degrades gracefully)
- Piper TTS engine deployed (optional — text-only fallback)
- S3/MinIO bucket created for audio storage
- AI orchestrator service running
- JWT public key available

### Docker Deployment

tutor-svc is defined in `docker/docker-compose.yml`:

```bash
# Start tutor-svc with all dependencies
docker compose up -d tutor-svc

# Check health
curl http://localhost:4025/health
```

### Database Migrations

```bash
# Run migrations (production)
cd services/tutor-svc
npx prisma migrate deploy

# Seed persona data
npx tsx prisma/seed.ts
```

### Feature Flag Rollout Plan

Use these phases to gradually enable tutoring:

**Phase 1: Internal Testing**
```env
FEATURE_TUTOR_ENABLED=true
FEATURE_TUTOR_SUBJECTS_MATH=true
# All other subjects: false (default)
```

**Phase 2: Math Beta (10% of users)**
- Set `TUTOR_SUBJECTS_MATH` rolloutPercentage to 10% in feature-flags config
- Monitor error rates and latency

**Phase 3: Math GA + Second Subject**
```env
FEATURE_TUTOR_SUBJECTS_MATH=true
FEATURE_TUTOR_SUBJECTS_ELA=true
FEATURE_TUTOR_VOICE_ENABLED=true
```

**Phase 4: Full Launch**
```env
FEATURE_TUTOR_ENABLED=true
FEATURE_TUTOR_VOICE_ENABLED=true
FEATURE_TUTOR_SUBJECTS_MATH=true
FEATURE_TUTOR_SUBJECTS_ELA=true
FEATURE_TUTOR_SUBJECTS_SCIENCE=true
FEATURE_TUTOR_SUBJECTS_HISTORY=true
FEATURE_TUTOR_SUBJECTS_CODING=true
```

---

## Health Checks

### Endpoints

| Endpoint | Expected | Description |
|----------|----------|-------------|
| `GET /health` | `200 { status: "ok" }` | Basic liveness |
| `GET /health/ready` | `200` | Readiness (DB connected) |

### Docker Health Check

```yaml
healthcheck:
  test: ["CMD", "wget", "--spider", "-q", "http://localhost:4025/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

---

## Monitoring

### Key Metrics

| Metric | Alert Threshold | Description |
|--------|----------------|-------------|
| Session creation latency | > 5s p95 | Time to create session + AI greeting |
| Message response latency | > 10s p95 | Time for AI to respond |
| TTS synthesis latency | > 3s p95 | Time to generate audio |
| Error rate (5xx) | > 1% | Server errors |
| Active sessions | > 1000 concurrent | Capacity planning |
| NATS publish failures | > 10/min | Event pipeline health |

### Log Patterns

```
# Session creation
[tutor-svc] POST /api/v1/tutor/sessions 201 - 2340ms

# AI orchestrator failure (fallback greeting used)
[tutor-svc] AI opening message failed, using fallback: Error: AI orchestrator returned 503

# Entitlement denied
[tutor-svc] POST /api/v1/tutor/sessions 403 - 120ms

# Feature flag blocked
[tutor-svc] POST /api/v1/tutor/sessions 503 - 5ms

# NATS connection failure
[tutor-analytics] NATS connection failed, events disabled: Error: ...

# TTS fallback
[tutor-tts] Piper TTS failed, using text-only fallback: Error: ...
```

---

## Troubleshooting

### Session creation returns 503 "AI tutoring is not yet available"

**Cause**: `FEATURE_TUTOR_ENABLED` is set to `false`.

**Fix**: Set `FEATURE_TUTOR_ENABLED=true` in the environment.

### Session creation returns 503 "MATH tutoring is not yet available"

**Cause**: Subject-specific feature flag is disabled.

**Fix**: Set `FEATURE_TUTOR_SUBJECTS_MATH=true` (or the relevant subject).

### Session creation returns 403 "Tutor add-on required"

**Cause**: The tenant's billing subscription does not include AI tutoring.

**Check**:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://billing-svc:3150/api/v1/billing/entitlements/$TENANT_ID/features/aiTutor
```

### AI responses are slow (> 10s)

**Possible causes**:
1. AI orchestrator overloaded — check orchestrator metrics
2. LLM provider rate limiting — check provider dashboard
3. Large conversation context — sessions with 50+ messages may be slow

**Mitigation**:
- Check `AI_STREAM_TIMEOUT_MS` (default 30s)
- Consider truncating conversation history for long sessions

### No voice/audio in sessions

**Check**:
1. Is `FEATURE_TUTOR_VOICE_ENABLED=true`?
2. Is `TTS_ENABLED=true`?
3. Is Piper TTS running? `curl http://piper-tts:5100/health`
4. Is Redis available? Audio caching depends on Redis
5. Is S3/MinIO accessible? Audio files are stored there

### NATS events not reaching analytics

**Check**:
1. Is `NATS_ENABLED=true`?
2. Is NATS reachable? `nats server check connection -s $NATS_URL`
3. Check tutor-svc logs for `[tutor-analytics] NATS connection failed`

**Note**: NATS failures are non-blocking. Sessions still work; only analytics events are lost.

### Database connection errors

**Check**:
```bash
# Test connection
npx prisma db execute --stdin <<< "SELECT 1"

# Check migrations are up to date
npx prisma migrate status
```

### Persona not found errors

**Cause**: Persona seed data hasn't been loaded.

**Fix**:
```bash
cd services/tutor-svc
npx tsx prisma/seed.ts
```

### Memory/CPU issues

The tutor-svc is a stateless Node.js service. Scale horizontally by adding more replicas.

**Resource recommendations**:
- Memory: 256MB min, 512MB recommended
- CPU: 0.25 vCPU min, 0.5 vCPU recommended
- Scale: 1 replica per 200 concurrent sessions

---

## Safety & Compliance

### COPPA Compliance

- No PII is collected from minors beyond what's needed for tutoring
- Session data is retained for 90 days, then purged
- AI training exclusion: conversation data is never used for model training
- All persona system prompts include mandatory safety rules

### Safety Rules (enforced in system prompts)

1. Never share or ask for personal information
2. Never generate violent, sexual, or age-inappropriate content
3. Never provide medical, legal, or psychological advice
4. Distress detection with trusted-adult referral message
5. Never complete homework — only guide and teach
6. Data never used for AI training
7. Decline requests to break character or bypass safety rules

### Content Moderation

If a safety concern is reported:
1. Check the session transcript: `GET /api/v1/tutor/analytics/transcript/:sessionId`
2. Review the persona's system prompt in `prisma/seed.ts`
3. The AI orchestrator has additional content filters

---

## Disaster Recovery

### Database Backup

Follow the platform-wide PostgreSQL backup strategy in `docs/DISASTER_RECOVERY_PLAN.md`.

The `aivo_tutor` database should be included in regular backup schedules.

### Service Recovery

tutor-svc is stateless — restart or redeploy to recover:

```bash
docker compose restart tutor-svc
```

Active WebSocket connections will be dropped. Clients auto-reconnect via the realtime-svc.

### Data Loss Scenarios

| Scenario | Impact | Recovery |
|----------|--------|----------|
| PostgreSQL failure | Session/message data lost | Restore from backup |
| Redis failure | TTS cache cold | Auto-recovers on restart |
| NATS failure | Analytics events lost | Non-recoverable (non-critical) |
| S3 failure | Audio playback unavailable | Text-only fallback active |
