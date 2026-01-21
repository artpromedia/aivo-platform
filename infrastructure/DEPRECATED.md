# ⚠️ DEPRECATED - AWS Infrastructure

**This directory contains AWS-specific Terraform configurations that are NO LONGER USED.**

## Current Infrastructure

The AIVO platform has been migrated to **Google Cloud Platform (GCP)**.

**Active Infrastructure Location:** [`/infra/terraform/`](../infra/terraform/)

## GCP Infrastructure Components

- **GKE** - Google Kubernetes Engine
- **Cloud SQL** - Managed PostgreSQL
- **Cloud Memorystore** - Managed Redis
- **GCR** - Google Container Registry
- **Cloud Monitoring** - Observability & Alerting
- **Secret Manager** - Secrets Management

## Why This Directory Exists

This directory is kept for:

1. Historical reference
2. Potential multi-cloud support in the future
3. Migration documentation

## DO NOT USE

Do not use these AWS configurations. All deployments go through:

- `.github/workflows/deploy-staging.yml` (GCP)
- `.github/workflows/deploy-production.yml` (GCP)
- `.github/workflows/infrastructure.yml` (GCP Terraform)
