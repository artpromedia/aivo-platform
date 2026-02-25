# SDK Guidelines

> Guidance for first-party and community SDK authors integrating with the AIVO Public API.

---

## Table of Contents

1. [Version Pinning](#version-pinning)
2. [Base URL Construction](#base-url-construction)
3. [Authentication](#authentication)
4. [Deprecation Header Handling](#deprecation-header-handling)
5. [Error Handling](#error-handling)
6. [Pagination](#pagination)
7. [Rate Limiting](#rate-limiting)
8. [Retry & Back-off](#retry--back-off)
9. [Logging & Observability](#logging--observability)
10. [Testing](#testing)
11. [Release Cadence](#release-cadence)

---

## Version Pinning

Every SDK **must** default to a specific API version and expose a configuration knob to override it.

```typescript
// TypeScript SDK example
const client = new AivoClient({
  apiKey: 'aivo_sk_live_xxx',
  apiVersion: 'v1',           // default; explicit is better than implicit
  environment: 'production',  // or 'sandbox'
});
```

```python
# Python SDK example
client = AivoClient(
    api_key="aivo_sk_live_xxx",
    api_version="v1",
    environment="production",
)
```

### Rules

| Rule | Detail |
|------|--------|
| SDK releases **pin** a default version | e.g. `aivo-sdk@3.0.0` defaults to API `v1` |
| Users **can** override the version | `apiVersion` constructor option |
| A major SDK bump **may** change the default | Always called out in SDK release notes |
| SDKs **must not** silently upgrade versions | Changing the pinned version is a breaking SDK change |

---

## Base URL Construction

```
{baseUrl}/public/{apiVersion}/{resource}
```

| Environment | `baseUrl`                     |
|-------------|-------------------------------|
| Production  | `https://api.aivo.dev`        |
| Sandbox     | `https://sandbox.api.aivo.dev` |

SDKs should accept a `baseUrl` override for on-premises / Hetzner deployments:

```typescript
const client = new AivoClient({
  apiKey: 'aivo_sk_live_xxx',
  baseUrl: 'https://api.district.example.com',
});
```

---

## Authentication

All requests use the `X-Api-Key` header:

```http
GET /public/v1/learners/abc/progress HTTP/1.1
Host: api.aivo.dev
X-Api-Key: aivo_sk_live_xxx
```

SDKs should:
- Accept the API key in the constructor (never hard-coded).
- Support reading from an environment variable (`AIVO_API_KEY`) as fallback.
- **Never** log the full API key. Mask all but the prefix in debug output: `aivo_sk_live_****`.

---

## Deprecation Header Handling

SDKs **must** inspect every response for deprecation indicators and surface them to the developer.

### Headers to Check

| Header              | Meaning                                                   |
|---------------------|-----------------------------------------------------------|
| `API-Deprecation`   | `"true"` when the version is deprecated                   |
| `API-Sunset`        | ISO date when the version will stop working               |
| `API-Successor`     | The version to migrate to (e.g. `"v2"`)                   |
| `API-Latest`        | Set when a newer (non-deprecated) version is available    |

### Implementation Pattern

```typescript
// After each response
function checkDeprecation(headers: Headers): void {
  if (headers.get('API-Deprecation') === 'true') {
    const sunset = headers.get('API-Sunset') ?? 'unknown';
    const successor = headers.get('API-Successor') ?? 'unknown';
    console.warn(
      `[aivo-sdk] API ${headers.get('API-Version')} is deprecated. ` +
      `Sunset: ${sunset}. Please migrate to ${successor}. ` +
      `Guide: https://docs.aivolearning.com/api/migration`
    );
  } else if (headers.get('API-Latest')) {
    // Informational: a newer version exists but current is still supported
    console.info(
      `[aivo-sdk] A newer API version ${headers.get('API-Latest')} is available.`
    );
  }
}
```

### Recommendation

- Emit a **warning** on every deprecated response (throttle to once per minute to avoid log spam).
- Emit an **info** message when `API-Latest` indicates a newer version exists (once per session).
- Provide a callback hook (`onDeprecation`) so applications can route alerts to their own monitoring.

```typescript
const client = new AivoClient({
  apiKey: '...',
  onDeprecation: ({ version, sunset, successor }) => {
    sentry.captureMessage(`API ${version} deprecated, sunset ${sunset}`);
  },
});
```

---

## Error Handling

### Standard Error Shape

All AIVO API errors return:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable description"
}
```

SDKs should:
1. Parse the `error` code and expose it as a typed constant/enum.
2. Throw/raise a typed exception with the code, message, HTTP status, and request ID.
3. Handle `410 Gone` (sunset) specially — include the migration guide URL.

```typescript
class AivoApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'AivoApiError';
  }
}

// 410 subclass
class ApiVersionSunsetError extends AivoApiError {
  constructor(
    public readonly successor: string,
    public readonly migrationGuide: string,
    message: string,
  ) {
    super(410, 'API_VERSION_SUNSET', message);
    this.name = 'ApiVersionSunsetError';
  }
}
```

---

## Pagination

v1 uses offset-based pagination:

```typescript
const sessions = await client.learners.sessions('learner-id', {
  page: 1,
  pageSize: 20,
});
// sessions.pagination.hasMore → true/false
```

SDKs should provide an **auto-paginating iterator** for convenience:

```typescript
for await (const session of client.learners.sessionsIter('learner-id')) {
  console.log(session.sessionId);
}
```

---

## Rate Limiting

When the API returns `429 Too Many Requests`, SDKs should:

1. Read the `Retry-After` header (seconds).
2. Wait the specified duration before retrying.
3. Expose rate-limit metadata from response headers:
   - `X-RateLimit-Limit`
   - `X-RateLimit-Remaining`
   - `X-RateLimit-Reset`

```typescript
class RateLimitError extends AivoApiError {
  constructor(
    public readonly retryAfterSeconds: number,
    message: string,
  ) {
    super(429, 'RATE_LIMITED', message);
  }
}
```

---

## Retry & Back-off

SDKs should automatically retry on transient errors:

| Status Code | Retry? | Strategy |
|-------------|--------|----------|
| 429         | Yes    | Respect `Retry-After` |
| 500         | Yes    | Exponential back-off |
| 502, 503    | Yes    | Exponential back-off |
| 504         | Yes    | Exponential back-off |
| 400, 401, 403, 404 | No | Client error — do not retry |
| 410         | No     | Sunset — version is gone |

### Defaults

| Setting           | Default |
|-------------------|---------|
| Max retries       | 3       |
| Initial delay     | 500 ms  |
| Max delay         | 30 s    |
| Back-off factor   | 2       |
| Jitter            | ± 20%   |

```typescript
const client = new AivoClient({
  apiKey: '...',
  maxRetries: 3,        // configurable
  retryDelay: 500,      // ms
});
```

---

## Logging & Observability

SDKs should:
- Use structured logging (JSON).
- Log request method, path, status code, and latency at `debug` level.
- Log errors at `warn` or `error` level.
- **Never** log request/response bodies by default (may contain PII).
- Provide a `debug` mode that logs full request/response for development.

```typescript
const client = new AivoClient({
  apiKey: '...',
  logLevel: 'info', // 'debug' | 'info' | 'warn' | 'error' | 'none'
});
```

---

## Testing

### Sandbox Environment

All SDKs should use the sandbox by default in test suites:

```typescript
const testClient = new AivoClient({
  apiKey: process.env.AIVO_SANDBOX_KEY!,
  environment: 'sandbox',
});
```

### Mock Mode

SDKs should support a mock/stub mode for unit tests that doesn't make real HTTP calls:

```typescript
const mockClient = AivoClient.mock({
  'GET /public/v1/learners/:id/progress': {
    status: 200,
    body: { learnerId: 'test', subjects: [] },
  },
});
```

---

## Release Cadence

| Event | SDK Action |
|-------|------------|
| New API endpoint added (non-breaking) | Minor SDK release |
| New API version released | Major SDK release with new default version |
| API version deprecated | SDK emits deprecation warnings |
| API version sunset | SDK removes support in next major release |

### Versioning Scheme

SDKs follow [SemVer](https://semver.org/):
- **Major**: Default API version changes, or breaking SDK interface changes.
- **Minor**: New endpoints, new optional parameters.
- **Patch**: Bug fixes, dependency updates.

---

## Language-Specific Notes

### TypeScript / JavaScript

- Ship ESM and CJS builds.
- Export TypeScript types for all request/response shapes.
- Use `fetch` (or a configurable HTTP client) — avoid heavy dependencies.

### Python

- Support Python 3.9+.
- Use `httpx` as the default HTTP client (async-first).
- Provide both sync and async client interfaces.
- Type hints on all public methods.

### Dart / Flutter

- Publish to pub.dev.
- Use `dio` or `http` package.
- Provide typed model classes generated from OpenAPI spec.

---

## Checklist for SDK Authors

- [ ] Constructor accepts `apiKey`, `apiVersion`, `environment`, `baseUrl`
- [ ] Default API version is pinned and documented
- [ ] `X-Api-Key` header set on all requests
- [ ] Deprecation headers inspected and surfaced
- [ ] `onDeprecation` callback hook available
- [ ] `410 Gone` throws a typed `ApiVersionSunsetError`
- [ ] Rate-limit `429` handled with `Retry-After`
- [ ] Transient errors retried with exponential back-off
- [ ] Auto-paginating iterators for list endpoints
- [ ] Structured logging with PII redaction
- [ ] Sandbox mode for testing
- [ ] Mock mode for unit tests
- [ ] SemVer releases tied to API version changes
