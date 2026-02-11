# ⚠️ DEPRECATED - Legacy Infrastructure

**This directory contains legacy infrastructure configurations that are NO LONGER USED for core infrastructure.**

## Current Infrastructure

The AIVO platform runs on **Hetzner dedicated servers** with **K3s** (lightweight Kubernetes).

**Active Infrastructure Locations:**

- [`/infra/k8s/`](../infra/k8s/) — Kubernetes manifests and overlays
- [`/infra/helm/`](../infra/helm/) — Helm chart templates

## Hetzner Infrastructure Components

- **K3s** — Lightweight Kubernetes on Hetzner
- **PostgreSQL** — Self-managed PostgreSQL
- **Redis** — Self-managed Redis
- **GHCR** — GitHub Container Registry (ghcr.io/artpromedia)
- **Prometheus/Grafana** — Observability & Alerting
- **K8s Secrets** — Secrets Management

## What's Still Here

- `helm/` — Kong and service Helm charts (active)
- `kong/` — API Gateway configuration (active)
- `learner-ns-operator/` — Namespace operator (active)

## Deployments

All deployments go through:

- `.github/workflows/ci-unified.yml` — CI/CD + deploy via SSH to Hetzner
- `.github/workflows/production-validation-deploy.yml` — Production validation deploy
