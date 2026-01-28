# AIVO Platform - Environment Configuration

## Overview

This document outlines the GitHub Environments configuration required for CI/CD deployments.

## Environments

### 1. `development`

- **Purpose**: Feature branch testing and development builds
- **Auto-deploy**: No
- **Reviewers**: None
- **Branch protection**: None

### 2. `staging`

- **Purpose**: Pre-production testing, QA validation
- **Auto-deploy**: On push to `main` branch
- **Reviewers**: None (auto-deploys)
- **URL**: `https://staging.aivolearning.com`

### 3. `production`

- **Purpose**: Live production environment
- **Auto-deploy**: On release publication
- **Reviewers Required**: 2 approvers from `@artpromedia/platform-leads`
- **URL**: `https://app.aivolearning.com`
- **Wait timer**: 5 minutes (for rollback window)

---

## Required Secrets

### All Environments

| Secret Name        | Description                  | Required For  |
| ------------------ | ---------------------------- | ------------- |
| `PNPM_STORE_CACHE` | pnpm store cache key         | CI builds     |
| `TURBO_TOKEN`      | Turborepo remote cache token | Build caching |
| `TURBO_TEAM`       | Turborepo team name          | Build caching |

### Staging Environment

| Secret Name             | Description                        | Required For         |
| ----------------------- | ---------------------------------- | -------------------- |
| `GCP_SA_KEY`            | GCP Service Account JSON (staging) | GCR push, GKE deploy |
| `DATABASE_URL`          | PostgreSQL connection string       | Database migrations  |
| `REDIS_URL`             | Redis connection string            | Session/caching      |
| `NATS_URL`              | NATS messaging URL                 | Event messaging      |
| `JWT_SECRET`            | JWT signing secret                 | Auth service         |
| `ENCRYPTION_KEY`        | Data encryption key                | Sensitive data       |
| `OPENAI_API_KEY`        | OpenAI API key                     | AI orchestrator      |
| `ANTHROPIC_API_KEY`     | Anthropic API key                  | AI orchestrator      |
| `SENDGRID_API_KEY`      | SendGrid API key                   | Email notifications  |
| `STRIPE_SECRET_KEY`     | Stripe secret key                  | Billing service      |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing             | Payment webhooks     |

### Production Environment

All staging secrets plus:

| Secret Name         | Description                           | Required For         |
| ------------------- | ------------------------------------- | -------------------- |
| `GCP_PROD_SA_KEY`   | GCP Service Account JSON (production) | GCR push, GKE deploy |
| `PROD_DATABASE_URL` | Production PostgreSQL URL             | Database operations  |
| `PROD_REDIS_URL`    | Production Redis URL                  | Session/caching      |
| `SENTRY_DSN`        | Sentry error tracking DSN             | Error monitoring     |
| `DATADOG_API_KEY`   | Datadog API key                       | APM monitoring       |
| `PAGERDUTY_KEY`     | PagerDuty integration key             | Incident alerting    |
| `SLACK_WEBHOOK_URL` | Slack notification webhook            | Deploy notifications |

### Mobile Build Secrets

| Secret Name                   | Description                      | Required For       |
| ----------------------------- | -------------------------------- | ------------------ |
| `ANDROID_KEYSTORE_BASE64`     | Base64 encoded Android keystore  | Android signing    |
| `ANDROID_KEY_ALIAS`           | Android key alias                | Android signing    |
| `ANDROID_KEY_PASSWORD`        | Android key password             | Android signing    |
| `ANDROID_STORE_PASSWORD`      | Android store password           | Android signing    |
| `IOS_CERTIFICATE_BASE64`      | Base64 encoded iOS cert          | iOS signing        |
| `IOS_CERTIFICATE_PASSWORD`    | iOS certificate password         | iOS signing        |
| `IOS_PROVISIONING_PROFILE`    | Base64 iOS provisioning profile  | iOS distribution   |
| `APPLE_API_KEY`               | App Store Connect API key        | iOS deployment     |
| `GOOGLE_PLAY_SERVICE_ACCOUNT` | Google Play service account JSON | Android deployment |

---

## Environment Variables

### Staging

```env
NODE_ENV=staging
LOG_LEVEL=debug
OTEL_ENABLED=true
FEATURE_FLAGS_ENABLED=true
RATE_LIMIT_ENABLED=true
```

### Production

```env
NODE_ENV=production
LOG_LEVEL=info
OTEL_ENABLED=true
FEATURE_FLAGS_ENABLED=true
RATE_LIMIT_ENABLED=true
CACHE_TTL=3600
```

---

## Branch Protection Rules

### `main` Branch

- Require pull request before merging
- Require at least 1 approval
- Require status checks:
  - `CI / Verify (lint, test, build)`
  - `CI / Security (osv + trivy)`
- Require conversation resolution
- Require linear history
- Do not allow bypassing settings

### `release/*` Branches

- Same as `main`
- Require 2 approvals
- Require signed commits

---

## Deployment Flow

```
Feature Branch → PR → main → Staging (auto) → Release Tag → Production (manual approval)
```

### Staging Deployment

1. PR merged to `main`
2. CI runs (lint, test, build)
3. Docker images built and pushed to GCR
4. Auto-deploy to staging GKE cluster
5. Smoke tests run
6. Slack notification sent

### Production Deployment

1. Create release tag (`vX.Y.Z`)
2. Validate all images exist in GCR
3. Wait for 2 approvals
4. Deploy to production GKE cluster
5. Run canary deployment (10% → 50% → 100%)
6. Health checks validated
7. Slack/PagerDuty notifications

---

## Rollback Procedures

### Automatic Rollback

- Health check failures trigger automatic rollback
- Pod restart threshold: 3 failures in 5 minutes
- Memory/CPU threshold breaches

### Manual Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/<service-name> -n aivo-prod

# Rollback to specific revision
kubectl rollout undo deployment/<service-name> --to-revision=<N> -n aivo-prod

# Or via GitHub Actions
gh workflow run deploy-production.yml -f version=v1.2.3 -f skip_approval=true
```

---

## Monitoring URLs

| Service    | Staging                                       | Production                         |
| ---------- | --------------------------------------------- | ---------------------------------- |
| Grafana    | `https://grafana.staging.aivolearning.com`    | `https://grafana.aivolearning.com` |
| Prometheus | `https://prometheus.staging.aivolearning.com` | Internal only                      |
| Jaeger     | `https://jaeger.staging.aivolearning.com`     | Internal only                      |
| ArgoCD     | `https://argocd.staging.aivolearning.com`     | `https://argocd.aivolearning.com`  |
