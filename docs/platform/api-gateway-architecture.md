# API Gateway Architecture: Kong + Apollo Router

## Overview

This document describes the API edge architecture for the AIVO platform, introducing
Kong Gateway as the edge proxy and Apollo Router as the GraphQL supergraph layer.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                               Client Apps                                    │
│  (mobile-learner, mobile-parent, web-author, web-teacher, web-district, etc.)│
└───────────────────────────────────┬──────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            Kong Gateway (Edge)                               │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Plugins:                                                              │  │
│  │  • rate-limiting        - Route-based rate limits (by plan tier)       │  │
│  │  • jwt                  - JWT validation                               │  │
│  │  • dash_context         - Injects X-Tenant-ID, X-User-ID, X-Roles      │  │
│  │  • learner_scope        - Validates learner data access                │  │
│  │  • consent_gate         - Blocks requests lacking required consent     │  │
│  │  • correlation-id       - X-Request-ID propagation                     │  │
│  │  • prometheus           - Metrics export                               │  │
│  │  • request-transformer  - Header transformations                       │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────┬──────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  REST Routes  │         │  Apollo Router  │         │  WebSocket Gw   │
│  /api/v1/*    │         │  /graphql       │         │  /ws            │
└───────┬───────┘         └────────┬────────┘         └────────┬────────┘
        │                          │                           │
        │                          ▼                           │
        │           ┌──────────────────────────┐               │
        │           │  Federated Supergraph    │               │
        │           │  ┌────────────────────┐  │               │
        │           │  │  @rbac directive   │  │               │
        │           │  │  @auth directive   │  │               │
        │           │  └────────────────────┘  │               │
        │           └────────────┬─────────────┘               │
        │                        │                             │
        └────────────────────────┼─────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────────┐
        │                        │                            │
        ▼                        ▼                            ▼
┌───────────────┐    ┌───────────────────┐    ┌───────────────────┐
│   auth-svc    │    │  learner-model    │    │   consent-svc     │
│   (subgraph)  │    │     -svc          │    │   (subgraph)      │
└───────────────┘    │   (subgraph)      │    └───────────────────┘
                     └───────────────────┘
                              ...
                     ┌───────────────────┐
                     │    29 services    │
                     │    (subgraphs)    │
                     └───────────────────┘
```

## Key Design Decisions

### 1. Kong as Edge Gateway (Port 8000/8443)

Kong provides:

- **TLS termination** - SSL certificates handled at edge
- **Rate limiting** - Tiered by route and tenant plan (FREE, PRO, ENTERPRISE)
- **JWT validation** - Verify token before hitting services
- **Custom plugins** - dash_context, learner_scope, consent_gate
- **Health checks** - Active/passive upstream health monitoring
- **Metrics** - Prometheus-compatible metrics export

### 2. Apollo Router as GraphQL Federation Layer

Apollo Router provides:

- **Supergraph composition** - Combines subgraphs from all services
- **Query planning** - Optimizes multi-service queries
- **@rbac directive** - Field-level role checks
- **@auth directive** - Authentication requirements per field
- **Query complexity limiting** - Prevents expensive queries

### 3. Custom Kong Plugins

#### dash_context

Extracts JWT claims and injects headers for downstream services:

```
X-Tenant-ID: <tenant_id from JWT>
X-User-ID: <sub from JWT>
X-Roles: <comma-separated roles from JWT>
X-Request-ID: <correlation ID>
```

#### learner_scope

For routes accessing learner data (e.g., `/learners/:learnerId/*`):

- Validates caller has relationship to learner (parent, teacher, therapist)
- Calls authorization service to verify scope
- Returns 403 if access denied

#### consent_gate

For routes requiring consent (e.g., AI Tutor, Analytics):

- Checks consent-svc for required consent type
- Returns 451 (Unavailable for Legal Reasons) if consent not granted
- Caches consent status with short TTL (5 minutes)

### 4. Route-Based Rate Limiting

| Route Pattern      | FREE Tier | PRO Tier | ENTERPRISE |
| ------------------ | --------- | -------- | ---------- |
| /api/v1/auth/\*    | 100/min   | 100/min  | 100/min    |
| /api/v1/content/\* | 50/min    | 200/min  | 1000/min   |
| /api/v1/ai/\*      | 10/min    | 100/min  | 500/min    |
| /graphql           | 100/min   | 500/min  | 2000/min   |

### 5. Request Correlation ID Flow

```
Client → Kong (generates X-Request-ID if missing)
       → Apollo Router (propagates X-Request-ID)
       → Service A (logs with request_id)
       → Service B (logs with request_id)
       → Response (includes X-Request-ID header)
```

### 6. AI Provider Failover

Kong routes AI requests (`/api/v1/ai/*`) with upstream failover:

1. Primary: ai-orchestrator-svc
2. Fallback: ai-orchestrator-svc-fallback (different provider backend)

Health checks trigger failover after 2 consecutive failures.

## File Structure

```
infra/
├── kong/
│   ├── docker-compose.yml      # Local dev Kong setup
│   ├── kong.yml                # Declarative Kong config
│   └── plugins/
│       ├── dash_context/
│       │   ├── handler.lua
│       │   └── schema.lua
│       ├── learner_scope/
│       │   ├── handler.lua
│       │   └── schema.lua
│       └── consent_gate/
│           ├── handler.lua
│           └── schema.lua
├── apollo/
│   ├── router.yaml             # Apollo Router config
│   ├── supergraph.graphql      # Composed supergraph schema
│   └── rhai/
│       └── rbac.rhai           # RBAC coprocessor logic
└── k8s/
    ├── kong/
    │   └── helm-values.yaml
    └── apollo/
        └── helm-values.yaml
```

## Environment Variables

### Kong

```env
KONG_DATABASE=off
KONG_DECLARATIVE_CONFIG=/kong/kong.yml
KONG_PROXY_LISTEN=0.0.0.0:8000, 0.0.0.0:8443 ssl
KONG_ADMIN_LISTEN=127.0.0.1:8001
KONG_PLUGINS=bundled,dash_context,learner_scope,consent_gate
```

### Apollo Router

```env
APOLLO_ROUTER_SUPERGRAPH_PATH=/apollo/supergraph.graphql
APOLLO_ROUTER_CONFIG_PATH=/apollo/router.yaml
APOLLO_GRAPH_REF=aivo@production
```

## Security Considerations

1. **JWT verification** happens at Kong before requests reach services
2. **Tenant isolation** enforced via X-Tenant-ID header from dash_context
3. **Role-based access** checked at both Kong (route level) and Apollo (@rbac directive)
4. **Consent verification** blocks sensitive operations without proper consent
5. **Rate limiting** prevents abuse and DoS attacks
6. **Request tracing** via correlation IDs for audit and debugging

## Migration Strategy

### Phase 1: Kong Deployment (Week 1)

- Deploy Kong with JWT + rate limiting
- Route all traffic through Kong
- No breaking changes to services

### Phase 2: Custom Plugins (Week 2)

- Deploy dash_context plugin
- Services start using X-Tenant-ID header
- Deprecate per-service JWT parsing

### Phase 3: Apollo Router (Week 3)

- Deploy Apollo Router behind Kong
- Add GraphQL subgraphs to priority services
- REST endpoints continue working

### Phase 4: Full Federation (Week 4+)

- Add subgraphs to remaining services
- Deploy consent_gate and learner_scope plugins
- Full @rbac directive coverage
