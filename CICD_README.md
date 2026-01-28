# AIVO Platform - CI/CD & DevOps Configuration

## Overview

This document provides an overview of the CI/CD and DevOps configuration for the AIVO platform.

## CI/CD Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            AIVO CI/CD Pipeline                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────────┐   │
│  │  Push   │───▶│  Lint   │───▶│  Test   │───▶│  Build  │───▶│   Docker    │   │
│  │         │    │TypeCheck│    │         │    │         │    │   Images    │   │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └──────┬──────┘   │
│                                                                      │          │
│                                    ┌─────────────────────────────────┘          │
│                                    ▼                                            │
│  ┌─────────────┐    ┌─────────────────────────┐    ┌─────────────────────────┐ │
│  │  Security   │    │   Staging Deployment    │───▶│  Production Deployment  │ │
│  │    Scan     │    │    (auto on main)       │    │  (on release + approval)│ │
│  └─────────────┘    └─────────────────────────┘    └─────────────────────────┘ │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- GitHub repository access
- GCP project access (for GCR and GKE)
- Required secrets configured in GitHub

### Configure GitHub Environments

1. Go to **Settings** → **Environments**
2. Create `staging` environment
3. Create `production` environment with required reviewers
4. Add secrets (see [ENVIRONMENTS.md](.github/ENVIRONMENTS.md))

### Trigger Deployment

**Staging (automatic on main):**

```bash
git push origin main
```

**Production (on release):**

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
# Create release in GitHub UI
```

**Manual deployment:**

```bash
gh workflow run ci-unified.yml -f deploy_environment=staging
```

## Repository Structure

```
.github/
├── workflows/
│   ├── ci-unified.yml      # Main CI/CD pipeline
│   ├── ci.yml              # Legacy CI workflow
│   ├── build.yml           # Docker build workflow
│   ├── deploy-staging.yml  # Staging deployment
│   └── deploy-production.yml # Production deployment
├── ENVIRONMENTS.md         # Environment configuration docs
└── CODEOWNERS             # Code ownership rules

docker/
├── Dockerfile.service     # Multi-stage service Dockerfile
├── Dockerfile.webapp      # Multi-stage webapp Dockerfile
└── docker-compose.yml     # Local development

infra/
├── helm/
│   └── aivo-service/      # Generic Helm chart for services
│       ├── Chart.yaml
│       ├── values.yaml
│       ├── values-staging.yaml
│       ├── values-production.yaml
│       └── templates/
├── k8s/
│   ├── base/              # Base Kustomize configuration
│   ├── overlays/
│   │   ├── staging/       # Staging overlay
│   │   └── production/    # Production overlay
│   └── deployments/       # Service deployment manifests
├── monitoring/
│   ├── prometheus/
│   │   ├── prometheus-rules.yaml
│   │   └── alertmanager-config.yaml
│   └── grafana/
│       └── dashboards/
│           └── aivo-services-overview.json
└── terraform/             # Infrastructure as Code

docs/
└── DEPLOYMENT_RUNBOOK.md  # Deployment procedures
```

## Workflows

### CI/CD Pipeline (`ci-unified.yml`)

The main pipeline includes:

| Job                 | Description              | Trigger                 |
| ------------------- | ------------------------ | ----------------------- |
| `changes`           | Detect file changes      | Always                  |
| `install`           | Install dependencies     | Always                  |
| `lint`              | ESLint + Prettier        | Always                  |
| `typecheck`         | TypeScript checking      | Always                  |
| `test`              | Unit + integration tests | Always (unless skipped) |
| `build`             | Build all packages       | After lint/test pass    |
| `security`          | Security scanning        | Non-draft PRs           |
| `docker`            | Build Docker images      | main/release branches   |
| `deploy-staging`    | Deploy to staging        | main branch             |
| `deploy-production` | Deploy to production     | Release publication     |

### Triggers

| Event             | Workflow                 |
| ----------------- | ------------------------ |
| Push to `main`    | Full CI + Staging deploy |
| Push to `develop` | Full CI (no deploy)      |
| Pull Request      | CI without deployment    |
| Release published | Production deployment    |
| Manual dispatch   | Configurable             |

## Kubernetes Deployment

### Using Kustomize (Current)

```bash
# Deploy to staging
cd infra/k8s/overlays/staging
kustomize build . | kubectl apply -f -

# Deploy to production
cd infra/k8s/overlays/production
kustomize build . | kubectl apply -f -
```

### Using Helm (Alternative)

```bash
# Deploy service to staging
helm install auth-svc ./infra/helm/aivo-service \
  -f ./infra/helm/aivo-service/values-staging.yaml \
  --set serviceName=auth-svc \
  --set image.tag=main-abc1234 \
  -n aivo-staging

# Deploy service to production
helm install auth-svc ./infra/helm/aivo-service \
  -f ./infra/helm/aivo-service/values-production.yaml \
  --set serviceName=auth-svc \
  --set image.tag=v1.0.0 \
  -n aivo-prod
```

## Monitoring & Alerting

### Prometheus Alerts

Key alert categories:

- **Service Availability**: Up/down status, restart rate
- **Error Rate**: 5xx errors, client errors
- **Latency**: P95/P99 response times
- **Resources**: CPU, memory usage
- **Database**: Connection pool, slow queries
- **Critical Services**: Auth, billing special alerts

### Grafana Dashboards

| Dashboard                | Purpose                 |
| ------------------------ | ----------------------- |
| `aivo-services-overview` | Overall platform health |
| `aivo-billing-svc`       | Billing service metrics |
| `aivo-auth-svc`          | Authentication metrics  |
| `aivo-database`          | Database performance    |

### Alert Routing

| Severity | Channel                     | Response Time |
| -------- | --------------------------- | ------------- |
| Critical | PagerDuty + Slack           | 15 min        |
| Warning  | Slack #aivo-alerts-warnings | 2 hours       |
| Info     | Slack only                  | Best effort   |

## Security

### Image Scanning

All Docker images are scanned with Trivy:

- On build (SARIF results uploaded to GitHub)
- Blocking on CRITICAL vulnerabilities in production

### Dependency Scanning

- npm audit on every build
- OSV Scanner for vulnerability database
- Automated PRs for security updates (Dependabot)

### Secrets Management

- GitHub Secrets for CI/CD
- GCP Secret Manager for runtime secrets
- External Secrets Operator for K8s integration

## Rollback

### Quick Rollback

```bash
# Via kubectl
kubectl rollout undo deployment/<service> -n aivo-prod

# Via GitHub Actions
gh workflow run deploy-production.yml -f version=v1.0.0 -f skip_approval=true
```

See [DEPLOYMENT_RUNBOOK.md](docs/DEPLOYMENT_RUNBOOK.md) for detailed procedures.

## Local Development

```bash
# Start infrastructure
docker-compose up -d postgres redis nats

# Install dependencies
pnpm install

# Generate Prisma clients
./scripts/prisma-generate-all.sh

# Start development
pnpm run dev
```

## Related Documentation

- [ENVIRONMENTS.md](.github/ENVIRONMENTS.md) - Environment configuration
- [DEPLOYMENT_RUNBOOK.md](docs/DEPLOYMENT_RUNBOOK.md) - Deployment procedures
- [CONTRIBUTING.md](docs/CONTRIBUTING.md) - Development guidelines
- [SECURITY.md](SECURITY.md) - Security policies
