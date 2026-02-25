# AIVO API Versioning Policy

> Effective: 2026-02-24 | Last Updated: 2026-02-24

This document defines the versioning strategy for all AIVO Platform APIs,
covering public partner APIs, internal inter-service APIs, and the deprecation
lifecycle that enterprise integrators can rely on.

---

## 1. Public API Versioning

### 1.1 URL Path Versioning

All public-facing APIs are versioned via **URL path prefix**:

```
https://api.aivolearning.com/public/v1/learners
https://api.aivolearning.com/public/v2/learners
```

The version segment (`v1`, `v2`, …) is **mandatory** for every public request.
Requests without a version segment return `400 Bad Request`.

### 1.2 Version Lifecycle

Every API version passes through four stages:

| Stage          | Duration       | Description                                      |
| -------------- | -------------- | ------------------------------------------------ |
| **Current**    | Ongoing        | Active development; all new features land here.  |
| **Supported**  | 12 months      | Bug-fixes and security patches only.             |
| **Deprecated** | 6 months       | Read-only; sunset warning in every response.     |
| **Sunset**     | Permanent      | Returns `410 Gone` with migration guide link.    |

### 1.3 Deprecation Timeline

```
 v1 Current ──► v2 Released
                │
                ├─ v1 enters "Supported" (12 months)
                │
                ├─ v1 enters "Deprecated" (6 months)
                │
                └─ v1 is Sunset (returns 410 Gone)
                   Total: 18 months minimum
```

- **Enterprise customers on active contracts** receive a minimum of **24 months**
  notice before any version is sunset.
- Deprecation timelines are communicated via email, the developer portal, and
  response headers on every API call.

### 1.4 Deprecation Headers

Every API response includes version metadata:

```http
API-Version: v1
API-Current-Version: v2
```

When a version is **deprecated**, additional headers are present:

```http
API-Deprecation: true
API-Sunset: 2027-06-01
API-Successor: v2
Deprecation: 2027-06-01
Sunset: Sun, 01 Jun 2027 00:00:00 GMT
Link: <https://docs.aivolearning.com/api/migration/v1-to-v2>; rel="deprecation"
```

Clients **SHOULD** monitor the `API-Deprecation` and `Sunset` headers
programmatically and alert their operations teams.

---

## 2. Breaking Change Definition

### 2.1 Changes That ARE Breaking (require a new version)

| Category                         | Example                                             |
| -------------------------------- | --------------------------------------------------- |
| Removing a response field        | Dropping `learner.gradeLevel` from the response     |
| Changing a field type            | `masteryScore: number` → `masteryScore: string`     |
| Removing an endpoint             | Deleting `GET /public/v1/sessions`                  |
| Changing error code semantics    | `403` now returned where `401` was returned before  |
| Adding a **required** parameter  | New mandatory `tenantId` query parameter            |
| Renaming a field                 | `firstName` → `givenName`                           |
| Changing enum value meanings     | `"ACTIVE"` now means something different            |

### 2.2 Changes That Are NOT Breaking (safe in-place)

| Category                           | Example                                          |
| ---------------------------------- | ------------------------------------------------ |
| Adding **optional** response fields | New `learner.avatarUrl` field                   |
| Adding **optional** request params  | New `?includeArchived=true` filter              |
| Adding new endpoints                | `GET /public/v1/analytics/summary`              |
| Adding new enum values              | New status `"PAUSED"` (clients must handle unknown values) |
| Performance improvements            | Faster query, same data shape                   |
| Adding new webhooks event types     | New `learner.badge.earned` event                |
| Documentation-only changes          | Clarifying existing behaviour                   |

---

## 3. Internal API Versioning

### 3.1 Header-Based Versioning

Inter-service (internal) APIs use **header-based versioning** via the
`Accept-Version` header rather than URL path segments:

```http
GET /learners/abc123/progress HTTP/1.1
Host: learner-model-svc:4003
Accept-Version: 2024-01-15
Authorization: Bearer <service-token>
```

### 3.2 Calendar Versioning

Internal API versions use **calendar dates** (`YYYY-MM-DD`) rather than major
version numbers. This makes it clear when a version was introduced and avoids
confusion with public API version numbers.

### 3.3 Default Behaviour

When no `Accept-Version` header is present, the **latest** version is used.
This is safe because all callers are internal services under our control and
are deployed together.

---

## 4. OpenAPI Specification

Each public API version has its own OpenAPI 3.1 specification file:

```
apps/web-dev-portal/public/openapi/
  aivo-public-api-v1.yaml
  aivo-public-api-v2.yaml    (when v2 ships)
```

Specs include version metadata extensions:

```yaml
info:
  x-api-version: v1
  x-api-status: current        # current | supported | deprecated | sunset
  x-deprecation-date: null     # ISO date or null
  x-sunset-date: null          # ISO date or null
  x-successor-version: null    # "v2" or null
```

---

## 5. SDK & Client Guidance

See [SDK_GUIDELINES.md](./SDK_GUIDELINES.md) for comprehensive guidance on:

- Version pinning in HTTP clients
- Programmatic deprecation header monitoring
- Migration helper patterns
- Language-specific code examples

---

## 6. Changelog & Migration Guides

### Changelogs

Structured changelogs live in `docs/api/changelogs/`:

```
docs/api/changelogs/
  v1.md     ← Current version changelog
  v2.md     ← Created when v2 ships
```

### Migration Guides

Step-by-step migration guides live in `docs/api/migration-guides/`:

```
docs/api/migration-guides/
  v1-to-v2.md   ← Created when v2 ships
```

Each migration guide includes:
- Summary of breaking changes
- Before/after code examples
- Field mapping tables
- Recommended migration timeline

---

## 7. Governance

### Who Can Create a New API Version?

New public API versions require approval from:
1. **Engineering Lead** — technical feasibility
2. **Product** — customer impact assessment
3. **Developer Relations** — documentation & SDK updates ready

### Version Numbering

- Public APIs: `v1`, `v2`, `v3` (integer, monotonically increasing)
- Internal APIs: `YYYY-MM-DD` (calendar date of introduction)
- SDKs: Follow SemVer (`1.0.0`, `2.0.0`)

### Communication Plan

When a new version is released:

1. **T-0**: New version goes live; predecessor enters "Supported"
2. **T+1 day**: Blog post, developer newsletter, portal banner
3. **T+1 week**: Migration guide published
4. **T+3 months**: Usage analytics review; direct outreach to high-traffic partners still on old version
5. **T+12 months**: Predecessor enters "Deprecated"; email notification
6. **T+18 months**: Predecessor sunset; 410 Gone responses

---

## Appendix: Response Header Summary

| Header               | When Present  | Example Value                                              |
| -------------------- | ------------- | ---------------------------------------------------------- |
| `API-Version`        | Always        | `v1`                                                       |
| `API-Current-Version`| Always        | `v2`                                                       |
| `API-Deprecation`    | Deprecated    | `true`                                                     |
| `API-Sunset`         | Deprecated    | `2027-06-01`                                               |
| `API-Successor`      | Deprecated    | `v2`                                                       |
| `Deprecation`        | Deprecated    | `2027-06-01`                                               |
| `Sunset`             | Deprecated    | `Sun, 01 Jun 2027 00:00:00 GMT`                            |
| `Link`               | Deprecated    | `<https://docs.aivolearning.com/api/migration/v1-to-v2>; rel="deprecation"` |
