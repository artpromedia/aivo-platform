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
│  │  Push   │───▶│  Lint   │───▶│  Test   │───▶│Coverage │───▶│   Build     │   │
│  │         │    │TypeCheck│    │         │    │ Check   │    │             │   │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └──────┬──────┘   │
│                                                                      │          │
│                                    ┌─────────────────────────────────┘          │
│                                    ▼                                            │
│  ┌─────────────┐    ┌─────────────────────────┐    ┌─────────────────────────┐ │
│  │  Security   │───▶│   Quality Gates         │───▶│  Docker Images          │ │
│  │   Scan      │    │   - Coverage ≥80%       │    │                         │ │
│  │  (Trivy)    │    │   - No Critical Vulns   │    └──────────┬──────────────┘ │
│  └─────────────┘    │   - Tests Pass          │               │                │
│                     └─────────────────────────┘               ▼                │
│  ┌─────────────┐    ┌─────────────────────────┐    ┌─────────────────────────┐ │
│  │ E2E Tests   │    │   Staging Deployment    │───▶│  Production Deployment  │ │
│  │ (Playwright)│───▶│    (auto on main)       │    │  (on release + approval)│ │
│  └─────────────┘    └─────────────────────────┘    └─────────────────────────┘ │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- GitHub repository access
- Hetzner server access (SSH)
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
│   ├── ci-unified.yml      # Main CI/CD pipeline (build, test, deploy to Hetzner)
│   ├── ci.yml              # Legacy CI workflow
│   └── build.yml           # Docker build workflow
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

| Job                 | Description                   | Trigger                 | Quality Gate |
| ------------------- | ----------------------------- | ----------------------- | ------------ |
| `changes`           | Detect file changes           | Always                  | —            |
| `install`           | Install dependencies          | Always                  | —            |
| `lint`              | ESLint + Prettier             | Always                  | ✅ Required  |
| `typecheck`         | TypeScript checking           | Always                  | ✅ Required  |
| `test`              | Unit tests (Node.js + Python) | Always (unless skipped) | ✅ Required  |
| `coverage`          | Code coverage tracking        | PR + main push          | ✅ ≥80%      |
| `integration`       | Integration test scenarios    | PR + main push          | ✅ Required  |
| `security`          | Security scanning + tests     | Non-draft PRs           | ✅ No CRIT   |
| `build`             | Build all packages            | After lint/test pass    | ✅ Required  |
| `e2e-web`           | Playwright E2E tests          | main branch             | ⚠️ ≥95% pass |
| `e2e-mobile`        | Patrol Flutter tests          | main branch             | ⚠️ ≥95% pass |
| `docker`            | Build Docker images           | main/release branches   | ✅ Required  |
| `deploy-staging`    | Deploy to Hetzner staging     | main branch             | Automatic    |
| `deploy-production` | Deploy to Hetzner production  | Release publication     | Manual       |

### Test Pipeline Stages

#### Stage 1: Fast Feedback (runs on every PR)

```yaml
Jobs (parallel):
  - Lint & TypeCheck (~2 min)
  - Unit Tests - Node.js (~5 min)
  - Unit Tests - Python (~4 min)
  - Security Scans (~3 min)

Gates: ✅ All linting passes
  ✅ All tests pass
  ✅ Coverage ≥80%
  ✅ No critical vulnerabilities
```

#### Stage 2: Integration Validation (runs on PR)

```yaml
Jobs (sequential after Stage 1):
  - Integration Tests (~8 min)
  - Build Verification (~6 min)

Gates: ✅ All integration scenarios pass
  ✅ Services build successfully
  ✅ Docker images build (if applicable)
```

#### Stage 3: E2E & Performance (runs on main branch)

```yaml
Jobs (parallel):
  - E2E Web Tests (~15 min)
  - E2E Mobile Tests (~12 min)
  - Performance Tests (~10 min)

Gates: ⚠️ E2E pass rate ≥95%
  ⚠️ Performance within SLA
  ⚠️ Accessibility checks pass
```

#### Stage 4: Deployment (runs on main/release)

```yaml
Staging Deployment:
  - Automatic on main branch
  - Post-deployment smoke tests
  - Rollback on failure

Production Deployment:
  - Manual approval required
  - Release tag trigger
  - Blue/green deployment
  - Automated rollback capability
```

### Triggers

| Event             | Workflow                 | Tests Executed                        |
| ----------------- | ------------------------ | ------------------------------------- |
| Push to `main`    | Full CI + Staging deploy | Unit, Integration, E2E, Security      |
| Push to `develop` | Full CI (no deploy)      | Unit, Integration, Security           |
| Pull Request      | CI without deployment    | Unit, Integration, Security, Coverage |
| Release published | Production deployment    | All tests + smoke tests               |
| Manual dispatch   | Configurable             | User-defined                          |
| Nightly           | Comprehensive suite      | All tests + Performance               |

## Coverage Requirements

### Coverage Thresholds

All code coverage tracked via **Codecov** with automated enforcement:

| Service Type      | Minimum Coverage | Enforcement Level |
| ----------------- | ---------------- | ----------------- |
| Critical Services | ≥90%             | ❌ CI Fails       |
| Standard Services | ≥75%             | ❌ CI Fails       |
| Utility Packages  | ≥85%             | ❌ CI Fails       |
| Overall Platform  | ≥80%             | ⚠️ Warning        |

**Critical Services:**

- `auth-svc` - Authentication and authorization
- `billing-svc` - Billing and subscription management
- `payments-svc` - Payment processing
- `profile-svc` - Learner profiles and PII
- `assessment-svc` - Assessment delivery
- `grading-engine` - AI-powered grading
- `ai-orchestrator` - AI coordination
- `legal-hold-svc` - Legal compliance

### Coverage Workflows

**`.github/workflows/coverage.yml`** runs on every PR and main push:

```yaml
Jobs:
  node-coverage: # Node.js/TypeScript services
    - Install dependencies
    - Generate Prisma clients
    - Run tests with coverage
    - Upload to Codecov
    - Check thresholds (scripts/check-coverage.js)

  python-coverage: # Python services
    - Setup Python environment
    - Install dependencies
    - Run pytest with coverage
    - Upload to Codecov
    - Check thresholds
```

### Quality Gates

Deployments blocked if:

- ❌ Any critical service below coverage threshold
- ❌ Critical vulnerabilities detected
- ❌ Security tests fail
- ❌ E2E test pass rate <95%
- ❌ Build failures

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
- K8s Secrets for runtime configuration
- External Secrets Operator for K8s integration

## Rollback

### Quick Rollback

```bash
# Via kubectl
kubectl rollout undo deployment/<service> -n aivo-prod

# Via GitHub Actions
gh workflow run ci-unified.yml -f deploy_environment=production
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

- [TEST_STRATEGY.md](./TEST_STRATEGY.md) - Comprehensive test strategy
- [TEST_RUNBOOK.md](./TEST_RUNBOOK.md) - Practical testing guide
- [TESTING_GUIDELINES.md](./docs/TESTING_GUIDELINES.md) - Testing best practices
- [QA_COMPREHENSIVE_AUDIT_REPORT_2026.md](./QA_COMPREHENSIVE_AUDIT_REPORT_2026.md) - QA audit results
- [ENVIRONMENTS.md](.github/ENVIRONMENTS.md) - Environment configuration
- [DEPLOYMENT_RUNBOOK.md](docs/DEPLOYMENT_RUNBOOK.md) - Deployment procedures
- [CONTRIBUTING.md](docs/CONTRIBUTING.md) - Development guidelines
- [SECURITY.md](SECURITY.md) - Security policies
- [COMPLIANCE_TEST_REPORT_TEMPLATE.md](./COMPLIANCE_TEST_REPORT_TEMPLATE.md) - Compliance testing
