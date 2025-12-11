# Network Resilience Patterns

This document describes the network resilience patterns implemented in Aivo to handle challenging school network environments.

## Overview

School networks present unique challenges:

- **Captive portals** - Networks requiring authentication before internet access
- **Content filters** - Blocking or delaying requests
- **High latency** - Shared bandwidth with many users
- **Intermittent connectivity** - Temporary disconnections
- **Proxy servers** - Corporate proxies that may modify requests

Our network resilience patterns address these challenges through:

1. Resilient HTTP clients with configurable timeouts
2. Circuit breakers to prevent cascading failures
3. Graceful degradation when services are unavailable
4. Telemetry for monitoring and alerting

## Flutter Client (`@aivo/flutter-common`)

### Resilient HTTP Client

Located in `libs/flutter-common/lib/network/resilient_http_client.dart`

```dart
import 'package:flutter_common/network/network.dart';

// Create a client
final client = ResilientHttpClient(
  baseUrl: 'https://api.aivo.app',
  tenantId: 'tenant-123',
);

// Make requests with automatic retry
final response = await client.get(
  '/lessons/123',
  config: RequestConfig.standard,
);

// AI operations get longer timeouts
final aiResponse = await client.post(
  '/ai/generate',
  body: {'prompt': 'Explain photosynthesis'},
  config: RequestConfig.aiOperation, // 45s timeout
);
```

#### Timeout Configuration

| Config        | Timeout | Use Case                        |
| ------------- | ------- | ------------------------------- |
| `quick`       | 5s      | Health checks, simple GETs      |
| `standard`    | 10s     | Most API calls                  |
| `heavy`       | 30s     | Content downloads, bulk uploads |
| `aiOperation` | 45s     | LLM calls                       |

#### Retry Configuration

```dart
const RetryConfig.standard = RetryConfig(
  maxAttempts: 3,
  initialDelay: Duration(milliseconds: 500),
  maxDelay: Duration(seconds: 30),
  backoffMultiplier: 2.0,
  jitterFactor: 0.2,
);
```

### Circuit Breaker

Located in `libs/flutter-common/lib/network/circuit_breaker.dart`

```dart
import 'package:flutter_common/network/network.dart';

// Get the AI service circuit breaker
final aiBreaker = CircuitBreakerRegistry.instance.aiService;

try {
  final result = await aiBreaker.execute(() async {
    return await client.post('/ai/generate', body: data);
  });
  // Use result
} on CircuitBreakerOpenException {
  // Service is down, use fallback
  return AIFallbackResponses.explanation;
}
```

#### Circuit Breaker States

1. **Closed** - Normal operation, requests pass through
2. **Open** - Service is failing, requests are blocked
3. **Half-Open** - Testing if service has recovered

#### Configuration

| Config      | Failure Threshold | Reset Timeout |
| ----------- | ----------------- | ------------- |
| `standard`  | 5 failures        | 30s           |
| `aiService` | 3 failures        | 60s           |
| `critical`  | 3 failures        | 15s           |

### Graceful Degradation

Located in `libs/flutter-common/lib/network/graceful_degradation.dart`

```dart
import 'package:flutter_common/network/network.dart';

// Initialize on app start
await GracefulDegradationService.instance.initialize();

// Check feature availability
if (GracefulDegradationService.instance.isFeatureAvailable(Features.aiAssistant)) {
  // Use AI feature
} else {
  // Show offline alternative
}

// Execute with fallback
final hint = await GracefulDegradationService.instance.executeWithFallback(
  feature: Features.aiAssistant,
  primary: () async => await aiClient.getHint(question),
  fallback: () => AIFallbackResponses.hint,
);
```

#### Degradation Levels

| Level      | Description                | UI Impact         |
| ---------- | -------------------------- | ----------------- |
| `none`     | Full functionality         | Normal            |
| `minor`    | Some features slower       | Info banner       |
| `moderate` | AI unavailable             | Warning banner    |
| `severe`   | Limited to offline content | Error banner      |
| `critical` | App nearly unusable        | Full-screen error |

### Network Status Widget

Located in `libs/flutter-common/lib/network/network_status_widget.dart`

```dart
import 'package:flutter_common/network/network.dart';

// Add to app bar
AppBar(
  actions: [
    NetworkStatusIndicator(
      showLabel: true,
      onTap: () => showNetworkDetails(context),
    ),
  ],
);

// Add banner when degraded
Scaffold(
  body: Column(
    children: [
      NetworkBanner(),
      // Rest of content
    ],
  ),
);
```

## TypeScript Backend (`@aivo/ts-resilience`)

### Circuit Breaker

Located in `libs/ts-resilience/src/circuit-breaker.ts`

```typescript
import { createCircuitBreaker, CircuitConfigs } from '@aivo/ts-resilience';

// Create circuit breaker for AI calls
const aiBreaker = createCircuitBreaker(
  async (prompt: string) => {
    return await aiClient.generate(prompt);
  },
  {
    name: 'ai-generate',
    ...CircuitConfigs.aiService,
    fallback: () => ({ text: 'AI is temporarily unavailable' }),
  }
);

// Use it
const result = await aiBreaker.fire('Explain this concept');
```

### Retry with Backoff

Located in `libs/ts-resilience/src/retry.ts`

```typescript
import { retry, RetryConfigs } from '@aivo/ts-resilience';

const data = await retry(
  async () => {
    const response = await fetch('https://api.example.com/data');
    return response.json();
  },
  {
    ...RetryConfigs.standard,
    onRetry: (attempt, error, delay) => {
      console.log(`Retry ${attempt} after ${delay}ms: ${error.message}`);
    },
  }
);
```

### Request Timeout Middleware

Located in `libs/ts-resilience/src/timeout.ts`

```typescript
import { requestTimeout, TimeoutConfigs } from '@aivo/ts-resilience';
import express from 'express';

const app = express();

// Global timeout
app.use(requestTimeout({ timeoutMs: 10_000 }));

// Per-route timeout
app.post('/ai/generate', requestTimeout(TimeoutConfigs.aiOperation), async (req, res) => {
  // Handler
});
```

### Telemetry

Located in `libs/ts-resilience/src/telemetry.ts`

```typescript
import { telemetry } from '@aivo/ts-resilience';

// Record metrics
telemetry.recordRequestLatency('/api/users', 150);
telemetry.recordHttpError('timeout', '/api/ai');
telemetry.recordRetryAttempt();

// Get report
const report = telemetry.generateReport(['ai-service']);
console.log(report.summary.healthStatus); // 'healthy', 'degraded', etc.
```

## Telemetry & Metrics

### Key Metrics

| Metric                        | Type      | Description                  |
| ----------------------------- | --------- | ---------------------------- |
| `client_http_errors_total`    | Counter   | Total HTTP errors by type    |
| `sync_failures_total`         | Counter   | Total sync failures          |
| `sync_success_total`          | Counter   | Total successful syncs       |
| `circuit_breaker_opens_total` | Counter   | Circuit breaker open events  |
| `retry_attempts_total`        | Counter   | Total retry attempts         |
| `fallbacks_used_total`        | Counter   | Fallback responses used      |
| `request_latency_ms`          | Histogram | Request latency distribution |
| `active_requests`             | Gauge     | Currently active requests    |
| `pending_sync_items`          | Gauge     | Items waiting to sync        |
| `open_circuits`               | Gauge     | Number of open circuits      |

### Health Status

The health status is calculated from metrics:

- **Healthy**: < 10 errors, latency < 1s, no open circuits
- **Degraded**: 10-50 errors or latency 1-2s
- **Unhealthy**: > 50 errors or latency > 2s
- **Critical**: Any circuit breaker open

## Recommended Timeouts

### Client (Flutter)

| Operation        | Connect | Receive | Total |
| ---------------- | ------- | ------- | ----- |
| Health check     | 3s      | 5s      | 5s    |
| API call         | 5s      | 10s     | 10s   |
| Content download | 5s      | 30s     | 30s   |
| AI operation     | 5s      | 45s     | 45s   |

### Backend (Node.js)

| Operation       | Timeout | Circuit Opens After |
| --------------- | ------- | ------------------- |
| Database query  | 5s      | 3 failures          |
| External API    | 15s     | 5 failures          |
| AI/LLM call     | 45s     | 3 failures          |
| File processing | 60s     | 5 failures          |

## Testing Network Resilience

### Chaos Testing (Flutter)

```dart
// In integration tests
testWidgets('handles AI service timeout', (tester) async {
  // Configure mock to delay
  mockAiClient.setResponseDelay(Duration(seconds: 60));

  // Should show fallback after timeout
  await tester.pumpWidget(MyApp());
  await tester.tap(find.byKey(Key('get-hint-button')));
  await tester.pumpAndSettle(Duration(seconds: 50));

  expect(find.text(AIFallbackResponses.hint), findsOneWidget);
});
```

### Chaos Testing (Backend)

```typescript
import { createCircuitBreaker } from '@aivo/ts-resilience';

describe('Circuit Breaker', () => {
  it('opens after failures', async () => {
    const failingBreaker = createCircuitBreaker(
      async () => {
        throw new Error('Test failure');
      },
      { name: 'test', failureThreshold: 3 }
    );

    // Cause failures
    for (let i = 0; i < 3; i++) {
      await failingBreaker.fire().catch(() => {});
    }

    // Should be open
    expect(failingBreaker.opened).toBe(true);
  });
});
```

## Best Practices

1. **Always set timeouts** - Never make requests without timeout configuration
2. **Use circuit breakers for external calls** - AI, payment processors, third-party APIs
3. **Implement fallbacks** - Every degradable feature should have a fallback
4. **Monitor metrics** - Set up alerts for error rate and latency spikes
5. **Test failure scenarios** - Include network failure tests in CI/CD
6. **Log correlation IDs** - Every request should have a correlation ID for tracing
7. **Aggregate errors** - Don't spam users with individual error toasts
