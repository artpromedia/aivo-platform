# ==============================================================================
# AIVO Platform - Infrastructure Documentation
# ==============================================================================

## Overview

The AIVO platform runs on AWS using a modern cloud-native architecture with the following key components:

- **Container Orchestration**: Amazon EKS (Kubernetes 1.28)
- **Database**: Amazon RDS PostgreSQL 15
- **Caching**: Amazon ElastiCache Redis 7.1
- **CDN**: Amazon CloudFront
- **DNS**: Amazon Route 53
- **Security**: AWS WAF, KMS, Secrets Manager

## Architecture Diagram

```
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                         AWS Cloud                            │
                                    │                                                              │
┌────────────┐      ┌──────────┐    │   ┌──────────┐    ┌─────────────────────────────────────┐  │
│            │      │          │    │   │          │    │              VPC                     │  │
│   Users    │─────▶│CloudFront│────│──▶│   WAF    │───▶│                                     │  │
│            │      │          │    │   │          │    │  ┌────────────────────────────────┐ │  │
└────────────┘      └──────────┘    │   └──────────┘    │  │         Public Subnets         │ │  │
                                    │                   │  │  ┌──────────┐  ┌──────────┐   │ │  │
                                    │                   │  │  │   ALB    │  │   NAT    │   │ │  │
                                    │                   │  │  └────┬─────┘  └────┬─────┘   │ │  │
                                    │                   │  └───────│─────────────│─────────┘ │  │
                                    │                   │          │             │           │  │
                                    │                   │  ┌───────▼─────────────▼─────────┐ │  │
                                    │                   │  │        Private Subnets        │ │  │
                                    │                   │  │                               │ │  │
                                    │                   │  │  ┌─────────────────────────┐ │ │  │
                                    │                   │  │  │     EKS Cluster         │ │ │  │
                                    │                   │  │  │                         │ │ │  │
                                    │                   │  │  │  ┌─────┐ ┌─────┐ ┌───┐ │ │ │  │
                                    │                   │  │  │  │Auth │ │Cont │ │...│ │ │ │  │
                                    │                   │  │  │  │ Svc │ │ Svc │ │   │ │ │ │  │
                                    │                   │  │  │  └─────┘ └─────┘ └───┘ │ │ │  │
                                    │                   │  │  └─────────────────────────┘ │ │  │
                                    │                   │  └───────────────────────────────┘ │  │
                                    │                   │                                     │  │
                                    │                   │  ┌───────────────────────────────┐ │  │
                                    │                   │  │       Database Subnets        │ │  │
                                    │                   │  │  ┌─────────┐  ┌───────────┐  │ │  │
                                    │                   │  │  │   RDS   │  │ElastiCache│  │ │  │
                                    │                   │  │  │Postgres │  │  Redis    │  │ │  │
                                    │                   │  │  └─────────┘  └───────────┘  │ │  │
                                    │                   │  └───────────────────────────────┘ │  │
                                    │                   └─────────────────────────────────────┘  │
                                    │                                                              │
                                    │   ┌────────────┐  ┌────────────┐  ┌────────────────────┐   │
                                    │   │    S3      │  │   Secrets  │  │     CloudWatch     │   │
                                    │   │  Buckets   │  │  Manager   │  │  Logs & Metrics    │   │
                                    │   └────────────┘  └────────────┘  └────────────────────┘   │
                                    │                                                              │
                                    └─────────────────────────────────────────────────────────────┘
```

## Environments

| Environment | Purpose | Scale | Region |
|-------------|---------|-------|--------|
| Development | Testing & Development | Minimal | us-east-1 |
| Staging | Pre-production validation | Medium | us-east-1 |
| Production | Live production | Full | us-east-1 (DR: us-west-2) |

## Network Architecture

### VPC CIDR Allocations

| Environment | VPC CIDR | Private Subnets | Public Subnets | Database Subnets |
|-------------|----------|-----------------|----------------|------------------|
| Development | 10.10.0.0/16 | 10.10.1-3.0/24 | 10.10.101-103.0/24 | 10.10.201-203.0/24 |
| Staging | 10.20.0.0/16 | 10.20.1-3.0/24 | 10.20.101-103.0/24 | 10.20.201-203.0/24 |
| Production | 10.0.0.0/16 | 10.0.1-3.0/24 | 10.0.101-103.0/24 | 10.0.201-203.0/24 |

## Kubernetes Architecture

### Namespaces

- `aivo`: Main application services
- `monitoring`: Prometheus, Grafana, Loki
- `external-secrets`: External Secrets Operator
- `cert-manager`: Certificate management
- `karpenter`: Node autoscaling
- `velero`: Backup and disaster recovery

### Node Groups

| Name | Instance Types | Capacity Type | Purpose |
|------|----------------|---------------|---------|
| general | m6i.large, m6i.xlarge | On-Demand | Core services |
| spot | m6i.large, m5.large | Spot | Non-critical workloads |
| memory | r6i.large, r6i.xlarge | On-Demand | Memory-intensive services |

## Terraform Structure

```
infrastructure/terraform/
├── environments/
│   ├── development/
│   │   ├── main.tf
│   │   └── variables.tf
│   ├── staging/
│   │   ├── main.tf
│   │   └── variables.tf
│   └── production/
│       ├── main.tf
│       └── variables.tf
└── modules/
    ├── eks/
    ├── elasticache/
    ├── waf/
    └── cost-monitoring/
```

## Helm Charts

```
infrastructure/helm/
├── cluster-addons/          # Cluster-wide addons
├── monitoring/              # Prometheus rules, Grafana dashboards
├── security/                # Network policies, pod security
└── services/
    └── auth-svc/            # Template for all services
        ├── Chart.yaml
        ├── values.yaml
        ├── values-dev.yaml
        ├── values-staging.yaml
        ├── values-prod.yaml
        └── templates/
```

## Deployment Pipeline

1. **Build Phase**
   - Run tests (unit, integration)
   - Build Docker images
   - Security scanning (Trivy)
   - Push to ECR

2. **Deploy Phase**
   - Deploy to target environment
   - Run database migrations
   - Execute smoke tests
   - Canary/Blue-green deployment

3. **Verify Phase**
   - Health checks
   - Performance validation
   - Rollback on failure

## Security Controls

### Network Security
- Private subnets for all services
- NAT Gateway for outbound traffic
- Security groups with least-privilege access
- Network policies for pod-to-pod communication

### Data Security
- Encryption at rest (KMS)
- Encryption in transit (TLS 1.2+)
- Secrets managed via AWS Secrets Manager
- External Secrets Operator for Kubernetes

### Application Security
- WAF with managed rules
- Rate limiting
- DDoS protection via CloudFront
- Pod security policies via Kyverno

## Monitoring & Observability

### Metrics
- Prometheus for metrics collection
- Grafana for visualization
- CloudWatch for AWS service metrics

### Logging
- Loki for log aggregation
- Promtail for log collection
- CloudWatch Logs for AWS services

### Alerting
- PagerDuty integration
- Slack notifications
- Email escalation

## Disaster Recovery

### RTO/RPO Targets

| Tier | RTO | RPO |
|------|-----|-----|
| Critical Services | 4 hours | 1 hour |
| Standard Services | 8 hours | 4 hours |
| Non-Critical | 24 hours | 24 hours |

### Backup Strategy
- Database: Automated snapshots every 4 hours
- Kubernetes: Velero backups every 6 hours
- Configuration: S3 cross-region replication

## Cost Management

### Budget Alerts
- 50% forecasted: Warning
- 80% forecasted: Alert
- 90% actual: Critical

### Cost Optimization
- Spot instances for non-critical workloads
- Karpenter for right-sizing
- Reserved instances for baseline capacity
- S3 lifecycle policies

## Getting Started

1. **Prerequisites**
   - AWS CLI configured
   - Terraform >= 1.5
   - kubectl
   - Helm v3

2. **Initialize Terraform**
   ```bash
   cd infrastructure/terraform/environments/development
   terraform init
   terraform plan
   terraform apply
   ```

3. **Configure kubectl**
   ```bash
   aws eks update-kubeconfig --name aivo-development-eks --region us-east-1
   ```

4. **Deploy Cluster Addons**
   ```bash
   helm upgrade --install cluster-addons infrastructure/helm/cluster-addons \
     -n kube-system \
     -f infrastructure/helm/cluster-addons/values.yaml
   ```

5. **Deploy Services**
   ```bash
   helm upgrade --install auth-svc infrastructure/helm/services/auth-svc \
     -n aivo \
     -f infrastructure/helm/services/auth-svc/values-dev.yaml
   ```

## Support

For infrastructure support:
- Slack: #platform-infrastructure
- PagerDuty: Platform On-Call
- Email: platform@aivo.edu
