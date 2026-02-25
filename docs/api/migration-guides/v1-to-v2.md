# Migration Guide: API v1 → v2

> **Status:** Template — This guide will be completed when API v2 is released.

## Overview

This guide covers the breaking changes introduced in API v2 and provides step-by-step instructions for migrating from v1.

## Timeline

| Milestone              | Date         |
|------------------------|-------------|
| v2 Release             | TBD         |
| v1 Deprecated          | TBD         |
| v1 Sunset              | TBD (18 months after deprecation) |

## Breaking Changes

### 1. Endpoint URL Changes

All public API endpoints move from `/public/v1/` to `/public/v2/`:

```diff
- GET /public/v1/learners/:learnerId/progress
+ GET /public/v2/learners/:learnerId/progress
```

### 2. Response Envelope (Planned)

v2 will wrap all success responses in a standard envelope:

```json
{
  "data": { ... },
  "meta": {
    "apiVersion": "v2",
    "requestId": "req_abc123"
  }
}
```

### 3. Pagination Changes (Planned)

v2 will adopt cursor-based pagination for list endpoints:

```diff
- GET /public/v1/learners/:id/sessions?page=2&pageSize=20
+ GET /public/v2/learners/:id/sessions?cursor=abc123&limit=20
```

## Step-by-Step Migration

### Step 1: Update Base URL

Replace all `/v1/` references in your API client configuration with `/v2/`.

### Step 2: Update Response Parsing

Wrap existing response parsing to extract from the `data` field.

### Step 3: Update Pagination Logic

Switch from offset-based to cursor-based pagination. The response will include `meta.nextCursor` for subsequent pages.

### Step 4: Test in Sandbox

Use the sandbox environment (`sandbox.api.aivo.dev/v2`) to validate your integration before switching production traffic.

### Step 5: Monitor Deprecation Headers

After migrating, verify that your requests no longer receive `API-Deprecation: true` headers.

## Support

- **Migration support:** devs@aivolearning.com
- **Developer community:** https://community.aivolearning.com
- **Status page:** https://status.aivolearning.com
