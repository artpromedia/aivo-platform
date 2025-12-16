# AIVO Platform - Terraform Infrastructure

Production-ready Google Cloud Platform infrastructure for the AIVO educational platform.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Module Reference](#module-reference)
- [Environment Configuration](#environment-configuration)
- [Operations Guide](#operations-guide)
- [Security](#security)
- [Cost Estimation](#cost-estimation)
- [Disaster Recovery](#disaster-recovery)
- [Troubleshooting](#troubleshooting)

## Overview

This Terraform configuration deploys the complete AIVO platform infrastructure on Google Cloud Platform. The infrastructure is designed for:

- **High Availability**: Regional GKE clusters, Cloud SQL with failover, Redis with HA
- **Security**: Private clusters, Workload Identity, Secret Manager, Cloud Armor
- **Scalability**: Autoscaling node pools, read replicas, CDN for static assets
- **Observability**: Cloud Monitoring dashboards, alerting, and log aggregation

### Components

| Component  | Service                 | Purpose                    |
| ---------- | ----------------------- | -------------------------- |
| Compute    | GKE                     | Container orchestration    |
| Database   | Cloud SQL PostgreSQL 15 | Primary data store         |
| Cache      | Memorystore Redis       | Caching and sessions       |
| Storage    | Cloud Storage           | Assets, backups, ML models |
| CDN        | Cloud CDN               | Static asset delivery      |
| Secrets    | Secret Manager          | Credential storage         |
| Monitoring | Cloud Monitoring        | Metrics and alerting       |

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Google Cloud Platform                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────┐     ┌────────────────────────────────────────────────┐  │
│  │   Cloud CDN    │────▶│              Cloud Load Balancer               │  │
│  └────────────────┘     └─────────────────────┬──────────────────────────┘  │
│          │                                    │                              │
│          ▼                                    ▼                              │
│  ┌────────────────┐     ┌────────────────────────────────────────────────┐  │
│  │ Cloud Storage  │     │                 GKE Cluster                    │  │
│  │   (Buckets)    │     │  ┌──────────┐ ┌──────────┐ ┌──────────┐       │  │
│  │                │     │  │ App Pool │ │ Sys Pool │ │ GPU Pool │       │  │
│  │ • content      │     │  │ (2-20)   │ │ (1-5)    │ │ (0-5)    │       │  │
│  │ • uploads      │     │  └──────────┘ └──────────┘ └──────────┘       │  │
│  │ • static       │     │                                                │  │
│  │ • backups      │     │  Workload Identity │ Network Policies          │  │
│  └────────────────┘     └────────────────────┼───────────────────────────┘  │
│                                              │                              │
│                         ┌────────────────────┼───────────────────────────┐  │
│                         │           Private Services VPC                 │  │
│                         │                    │                           │  │
│                         │    ┌───────────────┴───────────────┐          │  │
│                         │    ▼                               ▼          │  │
│                         │  ┌─────────────────┐  ┌─────────────────┐     │  │
│                         │  │   Cloud SQL     │  │   Memorystore   │     │  │
│                         │  │  PostgreSQL 15  │  │     Redis 7    │     │  │
│                         │  │                 │  │                 │     │  │
│                         │  │  • Primary      │  │  • Cache        │     │  │
│                         │  │  • Read Replica │  │  • Sessions     │     │  │
│                         │  └─────────────────┘  │  • Pub/Sub      │     │  │
│                         │                       └─────────────────┘     │  │
│                         └───────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────┐     ┌────────────────┐     ┌────────────────────────┐  │
│  │ Secret Manager │     │ Cloud Monitoring│     │        IAM             │  │
│  │  • JWT keys    │     │  • Dashboards  │     │  • Service Accounts    │  │
│  │  • API keys    │     │  • Alerts      │     │  • Workload Identity   │  │
│  │  • DB creds    │     │  • Uptime      │     │  • RBAC                │  │
│  └────────────────┘     └────────────────┘     └────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Required Tools

| Tool       | Minimum Version | Installation                                            |
| ---------- | --------------- | ------------------------------------------------------- |
| Terraform  | 1.5.0           | [terraform.io](https://terraform.io)                    |
| gcloud CLI | Latest          | [cloud.google.com](https://cloud.google.com/sdk)        |
| kubectl    | 1.27+           | `gcloud components install kubectl`                     |
| jq         | 1.6+            | [stedolan.github.io/jq](https://stedolan.github.io/jq/) |

### GCP Setup

1. **Create GCP Projects** (one per environment):
   - `aivo-dev-<random>`
   - `aivo-staging-<random>`
   - `aivo-production-<random>`

2. **Enable Billing**: Each project must have an active billing account.

3. **IAM Permissions**: The account running Terraform needs:
   - `roles/owner` (for initial setup), or
   - Specific roles: Compute Admin, Container Admin, Cloud SQL Admin, etc.

## Quick Start

### 1. Initialize a GCP Project

```bash
# Run the initialization script
./scripts/init-project.sh -p aivo-dev-12345 -e dev -r us-central1
```

This script will:

- Enable required GCP APIs
- Create the Terraform state bucket
- Create a Terraform deployer service account
- Set up Artifact Registry for container images

### 2. Configure Environment

```bash
cd environments/dev
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your values
vim terraform.tfvars
```

### 3. Deploy Infrastructure

```bash
# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Apply changes
terraform apply
```

Or use the helper script:

```bash
./scripts/apply.sh -e dev
```

### 4. Get GKE Credentials

```bash
# Use the output command
$(terraform output -raw gke_get_credentials_command)

# Verify connection
kubectl get nodes
```

## Module Reference

### Networking (`modules/networking`)

Creates VPC, subnets, Cloud NAT, and firewall rules.

| Variable              | Description                  | Default         |
| --------------------- | ---------------------------- | --------------- |
| `vpc_cidr_range`      | Main VPC CIDR                | `10.0.0.0/16`   |
| `pods_cidr_range`     | Secondary range for pods     | `10.100.0.0/14` |
| `services_cidr_range` | Secondary range for services | `10.104.0.0/20` |

### GKE (`modules/gke`)

Deploys a private GKE cluster with multiple node pools.

| Variable             | Description           | Default         |
| -------------------- | --------------------- | --------------- |
| `app_machine_type`   | App pool machine type | `e2-standard-4` |
| `app_pool_min_count` | Minimum app nodes     | `2`             |
| `app_pool_max_count` | Maximum app nodes     | `10`            |
| `enable_gpu_pool`    | Enable GPU node pool  | `false`         |

**Node Pools:**

- **Application**: General workloads
- **System**: Monitoring, logging, ingress
- **AI/GPU**: ML inference (production only)

### CloudSQL (`modules/cloudsql`)

Manages PostgreSQL databases with high availability.

| Variable              | Description            | Default            |
| --------------------- | ---------------------- | ------------------ |
| `db_tier`             | Database instance tier | `db-custom-4-8192` |
| `availability_type`   | `ZONAL` or `REGIONAL`  | `REGIONAL`         |
| `enable_read_replica` | Create read replicas   | `true`             |

**Databases Created:**

- One database per AIVO service (33 total)
- Per-service users with generated passwords
- Passwords stored in Secret Manager

### Redis (`modules/redis`)

Deploys Memorystore Redis instances.

| Variable                 | Description              | Default       |
| ------------------------ | ------------------------ | ------------- |
| `cache_memory_size_gb`   | Cache instance size      | `5`           |
| `session_memory_size_gb` | Session instance size    | `2`           |
| `tier`                   | `BASIC` or `STANDARD_HA` | `STANDARD_HA` |

### Storage (`modules/storage`)

Creates GCS buckets with lifecycle policies.

**Buckets:**

- `content-assets`: Educational content (CDN-backed)
- `user-uploads`: User-generated content
- `static-assets`: Web assets (CDN-backed)
- `backups`: Database and audit backups
- `ml-models`: ML model artifacts
- `research-data`: Anonymized research data

### IAM (`modules/iam`)

Configures service accounts with Workload Identity.

**Service Accounts:**

- `gke-nodes`: GKE node pool identity
- `application`: General application workloads
- Per-service accounts for fine-grained access
- `cicd`: CI/CD pipeline access
- `backup`: Backup operations

### Secrets (`modules/secrets`)

Manages application secrets in Secret Manager.

**Auto-Generated Secrets:**

- JWT signing key (64 bytes)
- Session encryption key (32 bytes)
- API signing key (32 bytes)
- LTI RSA key pair

**External Service Placeholders:**

- OpenAI API key
- Anthropic API key
- Stripe keys
- OAuth client secrets

### Monitoring (`modules/monitoring`)

Configures Cloud Monitoring and alerting.

**Alert Policies:**

- GKE: Pod crashes, high CPU/memory
- Cloud SQL: High CPU, disk, connections
- Redis: High memory usage
- Application: Error rate, uptime

**Log Sinks:**

- Audit logs → GCS
- Application errors → BigQuery

### CDN (`modules/cdn`)

Deploys Cloud CDN with Cloud Load Balancing.

**Features:**

- Managed SSL certificates
- HTTP→HTTPS redirect
- Cloud Armor WAF (production)
- Cache invalidation support

## Environment Configuration

### Development

```hcl
# Minimal resources, spot instances, no HA
app_pool_min_count  = 1
app_pool_max_count  = 3
db_tier             = "db-custom-2-4096"
availability_type   = "ZONAL"
tier               = "BASIC"  # Redis
```

### Staging

```hcl
# Mirrors production structure at smaller scale
app_pool_min_count  = 2
app_pool_max_count  = 5
db_tier             = "db-custom-4-8192"
availability_type   = "REGIONAL"
tier               = "STANDARD_HA"  # Redis
```

### Production

```hcl
# Full HA, no spot instances, larger resources
app_pool_min_count  = 3
app_pool_max_count  = 20
db_tier             = "db-custom-8-32768"
availability_type   = "REGIONAL"
enable_read_replica = true
read_replica_count  = 2
tier               = "STANDARD_HA"  # Redis
enable_cloud_armor  = true
```

## Operations Guide

### Scaling

**GKE Node Pools:**

```bash
# Update autoscaling limits
terraform apply -var="app_pool_max_count=30"
```

**Cloud SQL:**

```bash
# Upgrade tier (causes brief downtime)
terraform apply -var="db_tier=db-custom-16-65536"
```

### Secret Rotation

```bash
# Rotate all auto-generated secrets
./scripts/rotate-secrets.sh -e production

# Rotate specific secret
./scripts/rotate-secrets.sh -e production -s jwt
```

After rotation, restart affected deployments:

```bash
kubectl rollout restart deployment -n aivo
```

### Cache Invalidation

```bash
# Invalidate CDN cache
terraform apply -var="invalidate_cache=true"
```

### Database Maintenance

```bash
# Cloud SQL maintenance is automatic, but you can:
# 1. Choose maintenance window (terraform variable)
# 2. Check upcoming maintenance in console
```

## Security

### Network Security

- **Private GKE Cluster**: Master and nodes have private IPs only
- **Cloud NAT**: Outbound internet access without public IPs
- **Private Service Access**: Database/Redis access via private VPC
- **Network Policies**: Calico for pod-to-pod restrictions

### Identity Security

- **Workload Identity**: No service account keys
- **IAM Conditions**: Time-based and resource-based conditions
- **Least Privilege**: Per-service service accounts

### Data Security

- **Encryption at Rest**: Customer-managed keys (optional)
- **Encryption in Transit**: TLS everywhere
- **Secret Manager**: Automatic secret versioning

### Compliance

- **Audit Logging**: All API calls logged
- **Data Residency**: Regional resources only
- **COPPA Compliance**: See docs/safety/coppa.md

## Cost Estimation

### Monthly Estimates by Environment

| Component   | Dev       | Staging     | Production  |
| ----------- | --------- | ----------- | ----------- |
| GKE Cluster | ~$200     | ~$500       | ~$2,000     |
| Cloud SQL   | ~$100     | ~$250       | ~$1,500     |
| Memorystore | ~$50      | ~$100       | ~$500       |
| Storage     | ~$20      | ~$50        | ~$200       |
| CDN/LB      | ~$20      | ~$30        | ~$100       |
| Monitoring  | ~$50      | ~$100       | ~$300       |
| **Total**   | **~$440** | **~$1,030** | **~$4,600** |

_Estimates based on us-central1 pricing. Actual costs depend on usage._

### Cost Optimization

- **Dev**: Use spot instances, smaller tiers, ZONAL resources
- **Committed Use Discounts**: 1-3 year commitments for 20-50% savings
- **Autoscaling**: Scale down during off-peak hours
- **Storage Lifecycle**: Auto-transition to cheaper storage tiers

## Disaster Recovery

### RPO and RTO Targets

| Environment | RPO | RTO   |
| ----------- | --- | ----- |
| Development | 24h | 4h    |
| Staging     | 4h  | 2h    |
| Production  | 1h  | 30min |

### Backup Strategy

**Cloud SQL:**

- Automated daily backups (retained 30 days)
- Point-in-time recovery (7 days)
- Cross-region backup replication (production)

**Storage:**

- Object versioning enabled
- Cross-region replication for critical data

### Recovery Procedures

**Database Recovery:**

```bash
# Restore from backup
gcloud sql backups restore BACKUP_ID \
  --restore-instance=aivo-db-production \
  --backup-instance=aivo-db-production

# Point-in-time recovery
gcloud sql instances clone aivo-db-production aivo-db-recovered \
  --point-in-time="2024-01-15T10:00:00.000Z"
```

**Full Environment Recovery:**

```bash
# Re-initialize project
./scripts/init-project.sh -p aivo-production-12345 -e production

# Apply Terraform
./scripts/apply.sh -e production

# Restore database from backup
# Redeploy applications
```

## Troubleshooting

### Common Issues

**Terraform State Lock:**

```bash
# Force unlock (use with caution)
terraform force-unlock LOCK_ID
```

**GKE Authentication:**

```bash
# Refresh credentials
gcloud container clusters get-credentials aivo-gke-production \
  --region us-central1 \
  --project aivo-production-12345
```

**Cloud SQL Connection:**

```bash
# Test via Cloud SQL Proxy
cloud-sql-proxy --port 5432 aivo-production:us-central1:aivo-db-production

# Connect
psql -h 127.0.0.1 -U postgres -d aivo
```

**Quota Errors:**

```bash
# Check quotas
gcloud compute project-info describe --project=PROJECT_ID

# Request quota increase in console
```

### Getting Help

- **Internal**: #aivo-infrastructure Slack channel
- **GCP Support**: https://console.cloud.google.com/support

## Contributing

1. Create a feature branch
2. Make changes to modules
3. Test in dev environment
4. Submit PR with plan output
5. Peer review required for production changes
