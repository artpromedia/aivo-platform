# Aivo Platform - Observability Guide

This document describes the enterprise-grade, SLO-driven observability system for the Aivo platform.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Service Integration](#service-integration)
5. [SLO Definitions](#slo-definitions)
6. [Dashboards](#dashboards)
7. [Alerting](#alerting)
8. [Debugging Guide](#debugging-guide)
9. [Best Practices](#best-practices)

---

## Overview

The Aivo observability system provides comprehensive monitoring across the three pillars:

- **Metrics**: Prometheus-based metrics with standardized naming and labels
- **Traces**: OpenTelemetry-based distributed tracing with Jaeger
- **Logs**: Structured JSON logging with Pino, aggregated in Loki

### Key Principles

1. **SLO-Driven**: All alerting is based on error budget burn rates, not arbitrary thresholds
2. **Tenant-Aware**: Every metric, trace, and log includes `tenantId` for multi-tenant debugging
3. **Request Correlation**: All requests can be traced end-to-end using `requestId`
4. **Zero-Config**: Services get automatic HTTP instrumentation via Fastify plugin

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Aivo Services                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ ai-orch    │  │ session-svc │  │ auth-svc    │  │ focus-svc   │    │
│  │ :4000      │  │ :4002       │  │ :4001       │  │ :4003       │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│         │                │                │                │            │
│         └────────────────┴────────────────┴────────────────┘            │
│                          │                                              │
│              @aivo/observability (Fastify Plugin)                       │
│                          │                                              │
│         ┌────────────────┼────────────────┐                            │
│         ▼                ▼                ▼                            │
│    ┌─────────┐     ┌──────────┐    ┌──────────┐                        │
│    │ Metrics │     │  Traces  │    │   Logs   │                        │
│    │(prom-cli)│    │(OTLP/Jaeg)│   │(Pino/Loki)│                       │
│    └────┬────┘     └────┬─────┘    └────┬─────┘                        │
└─────────┼───────────────┼───────────────┼──────────────────────────────┘
          │               │               │
          ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │Prometheus│    │  Jaeger  │    │   Loki   │
    │  :9090   │    │  :16686  │    │  :3100   │
    └────┬─────┘    └──────────┘    └────┬─────┘
         │                               │
         └───────────────┬───────────────┘
                         ▼
                   ┌──────────┐
                   │ Grafana  │
                   │  :3000   │
                   └──────────┘
```

---

## Quick Start

### 1. Start the Observability Stack

```bash
# From the repo root
docker compose -f docker-compose.observability.yml up -d
```

### 2. Access the UIs

| Service      | URL                       | Credentials    |
|--------------|---------------------------|----------------|
| Grafana      | http://localhost:3000     | admin / admin  |
| Prometheus   | http://localhost:9090     | -              |
| Jaeger       | http://localhost:16686    | -              |
| Alertmanager | http://localhost:9093     | -              |

### 3. Verify Services are Scraping

1. Open Prometheus: http://localhost:9090/targets
2. Verify all Aivo services show as "UP"

---

## Service Integration

### Installing the Package

```bash
pnpm add @aivo/observability
```

### Basic Setup (Fastify)

```typescript
import Fastify from 'fastify';
import { initObservability, observabilityPlugin } from '@aivo/observability';

// Initialize observability (typically in main.ts)
const obs = initObservability({
  serviceName: 'my-service',
  environment: process.env.NODE_ENV ?? 'development',
  version: process.env.APP_VERSION ?? '0.0.0',
});

const app = Fastify();

// Register the plugin for automatic HTTP instrumentation
await app.register(observabilityPlugin, {
  tracer: obs.tracer,
  logger: obs.logger,
  metrics: obs.metrics,
});

// Your routes automatically get metrics, traces, and structured logs!
app.get('/health', async () => ({ status: 'ok' }));

await app.listen({ port: 4000 });
```

### Manual Instrumentation

```typescript
// Tracing a function
const result = await obs.tracer.withSpan(
  'generateRecommendations',
  {
    'tenant.id': tenantId,
    'learner.id': learnerId,
  },
  async (span) => {
    // Your code here
    span.setAttribute('recommendations.count', results.length);
    return results;
  }
);

// Recording AI call metrics
obs.metrics.ai.calls.inc({
  agent_type: 'tutor',
  provider: 'openai',
  status: 'success',
});

obs.metrics.ai.duration.observe(
  { agent_type: 'tutor', provider: 'openai' },
  durationMs / 1000
);

obs.metrics.ai.tokens.inc(
  { agent_type: 'tutor', type: 'input' },
  inputTokens
);

// Structured logging
obs.logger.info({
  msg: 'Recommendation generated',
  tenantId,
  learnerId,
  recommendationType: 'next_activity',
  confidence: 0.85,
});
```

---

## SLO Definitions

The platform tracks the following SLOs:

### Authentication API

| SLO                  | Target | Window | Description                          |
|----------------------|--------|--------|--------------------------------------|
| auth_api_latency_p99 | 95%    | 30d    | p99 latency ≤ 200ms                  |
| auth_api_availability| 99.9%  | 30d    | Error rate ≤ 0.1%                    |

### AI Tutor

| SLO                      | Target | Window | Description                      |
|--------------------------|--------|--------|----------------------------------|
| ai_tutor_latency_p99     | 95%    | 30d    | p99 latency ≤ 5000ms             |
| ai_tutor_latency_median  | 99%    | 30d    | p50 latency ≤ 2000ms             |
| ai_tutor_error_rate      | 99%    | 30d    | Error rate ≤ 1%                  |

### Gateway

| SLO                   | Target | Window | Description                         |
|-----------------------|--------|--------|-------------------------------------|
| gateway_availability  | 99.9%  | 30d    | Error rate ≤ 0.1%                   |

### Events Pipeline (NATS)

| SLO                       | Target | Window | Description                     |
|---------------------------|--------|--------|---------------------------------|
| events_processing_latency | 99%    | 30d    | p99 latency ≤ 1000ms            |

### Error Budget Calculation

Error budget remaining = `1 - (actual_error_rate / allowed_error_rate)`

For a 99.9% availability SLO (0.1% error budget):
- If actual error rate is 0.05%, you have 50% budget remaining
- If actual error rate is 0.1%, you have 0% budget remaining
- If actual error rate is 0.2%, you are 100% over budget

---

## Dashboards

### Gateway Health Dashboard

**Path**: Grafana → Aivo → Gateway Health

Monitors:
- Request rate and error rate by service
- Latency percentiles (p50, p95, p99)
- SLO burn rate tracking
- Top endpoints by traffic
- Status code distribution

### AI Latency & Cost Dashboard

**Path**: Grafana → Aivo → AI Latency & Cost

Monitors:
- AI call latency by agent type and provider
- Token usage and estimated cost
- Provider health and failover events
- Safety event tracking (blocks, flags)
- Agent performance comparison table

### Session & Focus Dashboard

**Path**: Grafana → Aivo → Session & Focus

Monitors:
- Active sessions and session start rate
- Completion vs abandonment rates
- Focus intervention types and outcomes
- Session duration percentiles
- Per-tenant session metrics

### Recommendation Outcomes Dashboard

**Path**: Grafana → Aivo → Recommendation Outcomes

Monitors:
- Overall acceptance rate
- Acceptance by recommendation type
- Recommendation outcome distribution
- Latency and request rate
- Content-level performance analysis

---

## Alerting

### Alert Severities

| Severity | Response Time | Notification |
|----------|---------------|--------------|
| critical | 15 minutes    | PagerDuty page |
| warning  | 1 hour        | Slack #aivo-alerts |
| info     | Next business day | Email digest |

### SLO Burn Rate Alerts

Alerts fire based on Multi-Window Multi-Burn-Rate (MWMBR) methodology:

| Alert Level | 1h Burn Rate | 6h Burn Rate | Time to Exhaustion |
|-------------|--------------|--------------|-------------------|
| Critical    | 14.4x        | 6x           | ~2 days           |
| Warning     | 6x           | 1x           | ~5 days           |

### Key Alerts

1. **SLO Burn Rate Alerts**
   - `AuthApiLatencySLOBurnRateCritical`
   - `AiTutorLatencySLOBurnRateWarning`
   - `GatewayAvailabilitySLOBurnRateCritical`

2. **Service Health**
   - `ServiceHighErrorRate` (>5% for 5m)
   - `ServiceCriticalErrorRate` (>10% for 2m)
   - `ServiceDown` (no metrics for 5m)

3. **AI-Specific**
   - `AiProviderHighFailoverRate`
   - `AiProviderErrors`
   - `AiSafetyBlocksHigh`

4. **Infrastructure**
   - `EventPipelineDLQDepth`
   - `DatabaseConnectionPoolExhausted`
   - `DatabaseSlowQueries`

---

## Debugging Guide

### Finding a Request by ID

1. **Get the requestId** from:
   - API response headers (`X-Request-Id`)
   - Client-side error logs
   - User support ticket

2. **Search logs in Grafana**:
   ```logql
   {service=~".+"} |= "requestId" | json | requestId = "abc123"
   ```

3. **Find the trace**:
   - In Grafana, the `traceId` will link to Jaeger
   - Or search Jaeger directly for the service

### Debugging by Tenant

```logql
# All logs for a tenant
{service=~".+"} | json | tenantId = "tenant-xyz"

# Errors only
{service=~".+"} | json | tenantId = "tenant-xyz" | level = "error"

# Specific service
{service="ai-orchestrator"} | json | tenantId = "tenant-xyz"
```

### Debugging AI Calls

```promql
# Error rate by agent type
sum(rate(aivo_ai_calls_total{status="error"}[5m])) by (agent_type)
/ sum(rate(aivo_ai_calls_total[5m])) by (agent_type)

# p99 latency by provider
histogram_quantile(0.99, 
  sum(rate(aivo_ai_call_duration_seconds_bucket[5m])) 
  by (le, provider)
)

# Token usage
sum(increase(aivo_ai_tokens_total[1h])) by (agent_type, type)
```

### Common Issues

| Symptom | Likely Cause | Investigation |
|---------|--------------|---------------|
| High p99 latency | Slow AI provider | Check AI dashboard provider latency |
| Session abandonment spike | Focus issues or bugs | Check Focus dashboard, recent deployments |
| Error budget burning fast | Service errors | Check Gateway dashboard error rates |
| Missing traces | OTLP endpoint down | Check Jaeger health, service OTLP config |

---

## Best Practices

### 1. Always Include Context

```typescript
// Good - includes tenant and user context
logger.info({
  msg: 'Activity completed',
  tenantId,
  userId,
  activityId,
  durationMs,
});

// Bad - missing context
logger.info('Activity completed');
```

### 2. Use Semantic Attribute Names

```typescript
// Good - follows OTEL semantic conventions
span.setAttribute('user.id', userId);
span.setAttribute('tenant.id', tenantId);

// Bad - inconsistent naming
span.setAttribute('uid', userId);
span.setAttribute('tenant', tenantId);
```

### 3. Record Business Metrics

```typescript
// Track business outcomes, not just technical metrics
metrics.recommendations.inc({
  recommendation_type: 'next_activity',
  outcome: 'accepted',
  tenant_id: tenantId,
});
```

### 4. Handle Errors Properly

```typescript
try {
  await riskyOperation();
} catch (error) {
  // Log with full context
  logger.error({
    msg: 'Operation failed',
    err: error,
    tenantId,
    requestId,
    operation: 'riskyOperation',
  });
  
  // Record metric
  metrics.http.errors.inc({
    route: '/api/operation',
    error_type: error.name,
  });
  
  // Don't swallow - re-throw or handle appropriately
  throw error;
}
```

### 5. Use Appropriate Log Levels

| Level | Use For |
|-------|---------|
| trace | Very detailed debugging (rarely enabled) |
| debug | Development debugging |
| info  | Normal operation events |
| warn  | Unexpected but handled situations |
| error | Errors requiring attention |
| fatal | Unrecoverable errors (app shutdown) |

---

## Appendix: Metric Reference

### HTTP Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `aivo_http_requests_total` | Counter | service, method, route, status_code | Total HTTP requests |
| `aivo_http_request_duration_seconds` | Histogram | service, method, route, status_code | Request duration |
| `aivo_http_request_size_bytes` | Histogram | service, method, route | Request body size |
| `aivo_http_response_size_bytes` | Histogram | service, method, route | Response body size |

### AI Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `aivo_ai_calls_total` | Counter | agent_type, provider, status | Total AI API calls |
| `aivo_ai_call_duration_seconds` | Histogram | agent_type, provider | AI call latency |
| `aivo_ai_tokens_total` | Counter | agent_type, type (input/output) | Token usage |
| `aivo_ai_cost_dollars_total` | Counter | agent_type, provider | Estimated cost |
| `aivo_ai_safety_events_total` | Counter | category, action, agent_type | Safety moderation events |
| `aivo_ai_provider_failovers_total` | Counter | from_provider, to_provider | Provider failovers |

### Session Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `aivo_sessions_active` | Gauge | tenant_id, session_type | Active sessions |
| `aivo_sessions_total` | Counter | tenant_id, session_type, status | Session lifecycle events |
| `aivo_session_duration_seconds` | Histogram | tenant_id, session_type | Session duration |

### Focus Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `aivo_focus_interventions_total` | Counter | intervention_type, outcome, trigger | Focus interventions |

### Recommendation Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `aivo_recommendations_total` | Counter | recommendation_type, source, outcome | Recommendations served |
| `aivo_recommendation_latency_seconds` | Histogram | recommendation_type | Generation latency |

---

## Support

For observability-related questions:
- Slack: #platform-observability
- On-call: Check PagerDuty schedule
- Documentation: This file + Grafana dashboard annotations
