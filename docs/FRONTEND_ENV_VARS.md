# AIVO Frontend Environment Variables

> Complete mapping of every frontend env var to the backend service it connects to.

## Quick Reference

| Backend Service | Port | Apps That Connect |
|---|---|---|
| **auth-svc** | 4001 | web-district, web-platform-admin, web-author, web-parent |
| **tenant-svc** | 4002 / 3010 | web-district, web-platform-admin, web-parent |
| **ai-orchestrator** | 4010 | web-platform-admin |
| **model-registry** | 4011 / 4015 | web-platform-admin |
| **entitlements-svc** | 4012 | web-district |
| **research-svc** | 4020 / 3400 | web-creator, web-platform-admin |
| **learner-model-svc** | 4025 | web-author, web-platform-admin |
| **notify-svc** | 4040 | web-marketing |
| **content-authoring-svc** | 4060 | web-author, web-district |
| **marketplace-svc** | 4070 | web-creator, web-district, web-platform-admin |
| **analytics-svc** | 4080 | web-district |
| **billing-svc** | 4005 | web-parent, web-district |
| **api-gateway** | 4000 | web-learner, web-teacher, web-parent, web-district |
| **WebSocket server** | 3003 | web-teacher, web-author, web-creator, web-parent |

---

## Per-App Env Var Details

### web-learner (`apps/web-learner`)

| Variable | Type | Default | Backend Service |
|---|---|---|---|
| — | — | — | Minimal env vars; uses api-gateway via `@aivo/auth-web` |

---

### web-teacher (`apps/web-teacher`)

| Variable | Type | Default | Backend Service |
|---|---|---|---|
| `NEXT_PUBLIC_WS_URL` | Client | `http://localhost:3003` | WebSocket server |
| `NEXT_PUBLIC_ANALYTICS_URL` | Client | `http://localhost:8090` | Analytics micro-frontend |
| `NEXT_PUBLIC_GAMIFICATION_URL` | Client | `http://localhost:8091` | Gamification service |
| `NEXT_PUBLIC_ACCESSIBILITY_SVC_URL` | Client | `http://localhost:8092` | Accessibility service |
| `NEXT_PUBLIC_PD_API_URL` | Client | `http://localhost:8097` | Professional development API |
| `NEXT_PUBLIC_MARKETPLACE_API_URL` | Client | `http://localhost:8096` | Marketplace (teacher view) |
| `NEXT_PUBLIC_API_URL` | Client | `http://localhost:4000` | API gateway |
| `ANALYZE` | Build | `false` | — (webpack bundle analyzer) |

---

### web-district (`apps/web-district`)

| Variable | Type | Default | Backend Service |
|---|---|---|---|
| `AUTH_SERVICE_URL` | Server | `http://localhost:4001` | auth-svc |
| `TENANT_SERVICE_URL` | Server | `http://localhost:3010` | tenant-svc |
| `NEXT_PUBLIC_API_URL` | Client | `http://localhost:4000` | API gateway |
| `NEXT_PUBLIC_ANALYTICS_API_URL` | Client | `http://localhost:4080` | analytics-svc |
| `NEXT_PUBLIC_AUTHORING_URL` | Client | `http://localhost:4060` | content-authoring-svc |
| `NEXT_PUBLIC_BILLING_URL` | Client | — | billing-svc |
| `NEXT_PUBLIC_MARKETPLACE_API_URL` | Client | `http://localhost:4070/api/v1` | marketplace-svc |
| `NEXT_PUBLIC_ENTITLEMENTS_URL` | Client | `http://localhost:4012` | entitlements-svc |
| `NEXT_PUBLIC_SIS_API_URL` | Client | — | SIS integration |
| `NEXT_PUBLIC_WS_URL` | Client | `http://localhost:3003` | WebSocket server |

---

### web-platform-admin (`apps/web-platform-admin`)

| Variable | Type | Default | Backend Service |
|---|---|---|---|
| `AUTH_SERVICE_URL` | Server | `http://localhost:4001` | auth-svc |
| `TENANT_SERVICE_URL` | Server | `http://localhost:4002` | tenant-svc |
| `AI_ORCHESTRATOR_URL` | Server | `http://localhost:4010` | ai-orchestrator |
| `MODEL_REGISTRY_URL` | Server | `http://localhost:4011` | model-registry |
| `NEXTAUTH_SECRET` | Server | (required) | next-auth signing key |
| `NEXTAUTH_URL` | Server | `http://localhost:3000` | next-auth callback URL |
| `LEARNER_MODEL_URL` | Server | `http://localhost:4025` | learner-model-svc |
| `LEGAL_HOLD_SVC_URL` | Server | `http://localhost:4061` | legal-holds-svc |
| `NEXT_PUBLIC_RESEARCH_URL` | Client | `http://localhost:3400` | research-svc |
| `NEXT_PUBLIC_MARKETPLACE_API_URL` | Client | `http://localhost:4070/api/v1` | marketplace-svc |
| `NEXT_PUBLIC_COMPLIANCE_URL` | Client | — | compliance dashboard |
| `NEXT_PUBLIC_FINOPS_URL` | Client | `http://localhost:4060` | billing FinOps |

---

### web-author (`apps/web-author`)

| Variable | Type | Default | Backend Service |
|---|---|---|---|
| `AUTH_SERVICE_URL` | Server | `http://localhost:4001` | auth-svc |
| `AUTH_PUBLIC_KEY` | Server | — | PEM public key for JWT verification |
| `AUTHORING_SVC_URL` | Server | `http://localhost:4060` | content-authoring-svc (proxy target) |
| `LEARNER_MODEL_SVC_URL` | Server | `http://localhost:4025` | learner-model-svc (proxy target) |
| `NEXT_PUBLIC_AUTHORING_SVC_URL` | Client | `/api/authoring` | proxied authoring API |
| `NEXT_PUBLIC_LEARNER_MODEL_SVC_URL` | Client | `/api/learner-model` | proxied learner model API |
| `NEXT_PUBLIC_WS_URL` | Client | `ws://localhost:3003` | WebSocket server |

---

### web-creator (`apps/web-creator`)

| Variable | Type | Default | Backend Service |
|---|---|---|---|
| `NEXT_PUBLIC_WS_URL` | Client | `ws://localhost:3001` | WebSocket server |
| `NEXT_PUBLIC_CONTENT_SERVICE_URL` | Client | — | content-svc |
| `NEXT_PUBLIC_RESEARCH_URL` | Client | `http://localhost:4020` | research-svc |
| `NEXT_PUBLIC_MARKETPLACE_API_URL` | Client | `http://localhost:4070/api/v1` | marketplace-svc |

---

### web-parent (`apps/web-parent`)

| Variable | Type | Default | Backend Service |
|---|---|---|---|
| `TENANT_SERVICE_URL` | Server | `http://localhost:3010` | tenant-svc |
| `AUTH_SVC_URL` | Server | `http://localhost:4001` | auth-svc |
| `NEXT_PUBLIC_MARKETING_API_URL` | Server | `http://localhost:3001/api` | marketing SSO callback |
| `NEXT_PUBLIC_API_URL` | Client | `http://localhost:4000` | API gateway |
| `NEXT_PUBLIC_WS_URL` | Client | `wss://api.aivo.com/ws` | WebSocket server |
| `NEXT_PUBLIC_ANALYTICS_URL` | Client | — | analytics-svc |
| `NEXT_PUBLIC_GAMIFICATION_URL` | Client | — | gamification-svc |
| `NEXT_PUBLIC_BILLING_URL` | Client | — | billing-svc |
| `NEXT_PUBLIC_FEATURE_FLAGS` | Client | — | feature flag config |
| `NEXT_PUBLIC_AUTH_URL` | Client | `http://localhost:4001` | auth-svc (login/register) |

---

### web-dev-portal (`apps/web-dev-portal`)

| Variable | Type | Default | Backend Service |
|---|---|---|---|
| — | — | — | No env vars required; serves static MDX docs |

---

### web-marketing (`apps/web-marketing`)

| Variable | Type | Default | Backend Service |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Client | `http://localhost:3004` | Parent app (auth callbacks) |
| `NEXT_PUBLIC_MARKETING_URL` | Client | `http://localhost:3001` | Self-reference |
| `NEXT_PUBLIC_API_URL` | Client | `http://localhost:4000` | API gateway |
| `NEXT_PUBLIC_AUTH_URL` | Client | `http://localhost:3004/api/auth` | Auth redirect |
| `NEXT_PUBLIC_AUTH_CALLBACK_URL` | Client | `http://localhost:3001/auth/callback` | SSO callback |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client | — | Stripe |
| `STRIPE_SECRET_KEY` | Server | — | Stripe (server-side) |
| `STRIPE_WEBHOOK_SECRET` | Server | — | Stripe webhooks |
| `STRIPE_PRICE_PRO_MONTHLY` | Server | — | Stripe price ID |
| `STRIPE_PRICE_PRO_ANNUAL` | Server | — | Stripe price ID |
| `STRIPE_PRICE_PREMIUM_MONTHLY` | Server | — | Stripe price ID |
| `STRIPE_PRICE_PREMIUM_ANNUAL` | Server | — | Stripe price ID |
| `NEXT_PUBLIC_GA_ID` | Client | — | Google Analytics |
| `NOTIFY_SVC_URL` | Server | `http://notify-svc:4040` | notify-svc (contact/demo/newsletter) |

---

### learner-app (`apps/learner-app`)

| Variable | Type | Default | Backend Service |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Client | `http://localhost:4000` | API gateway (required) |
| `NEXT_PUBLIC_APP_NAME` | Client | `AIVO Learner` | — |
| `NEXT_PUBLIC_APP_VERSION` | Client | `1.0.0` | — |
| `NEXT_PUBLIC_WS_URL` | Client | — | WebSocket server |
| `NEXT_PUBLIC_AI_URL` | Client | — | AI service |
| `NEXT_PUBLIC_ENABLE_MOCKS` | Client | `false` | — |
| `ANALYZE` | Build | `false` | — (webpack bundle analyzer) |
| `NEXT_PUBLIC_DISABLE_PWA` | Build | — | Disable PWA in dev |

---

## Staging Environment (Hetzner)

For the staging deployment at `95.216.245.40`, all backend services run in K3s. The internal service URLs use Kubernetes DNS names (e.g., `http://auth-svc:4001`). The Next.js apps run as containers with env vars injected via K3s deployment manifests.

| Server | IP | Role |
|---|---|---|
| app1 (staging) | 95.216.245.40 | K3s master, all services |
| db1 | 95.217.76.42 | PostgreSQL, Redis |
| app2 | 95.217.195.144 | K3s worker |
