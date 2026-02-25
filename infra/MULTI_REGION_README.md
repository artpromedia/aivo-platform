# Multi-Region Infrastructure — PROVISIONED (Not Active)

> **STATUS**: Pre-built for future activation. The current MVP uses
> single-region deployment via `deploy-hetzner-production.yml`.
> **DO NOT** apply these Terraform configs or deploy these K8s manifests
> until the team is ready to go multi-region.

## What's Here

| File | Purpose | Status |
|------|---------|--------|
| `infra/terraform/multi-region/main.tf` | Hetzner K3s clusters in US-East (ash) + US-West (hil) | Provisioned |
| `infra/terraform/multi-region/variables.tf` | Variable definitions for multi-region | Provisioned |
| `infra/terraform/multi-region/cloudflare-glb.tf` | Cloudflare Global Load Balancer with 30s failover | Provisioned |
| `infra/terraform/multi-region/production.tfvars.example` | Example tfvars (never commit real values) | Provisioned |
| `infra/k8s/base/postgres/replication.yaml` | PostgreSQL streaming replication (primary ↔ standby) | Provisioned |
| `infra/k8s/base/nats/gateway.yaml` | NATS super-cluster with cross-region gateways | Provisioned |
| `.github/workflows/deploy-hetzner-multiregion.yml` | Multi-region deploy workflow (manual dispatch only) | Provisioned |
| `docs/runbooks/region-failover.md` | Failover/failback runbook | Provisioned |

## Current Active Deployment

The single-region production deployment is:

```
.github/workflows/deploy-hetzner-production.yml   ← ACTIVE
infra/terraform/main.tf                            ← ACTIVE
infra/k8s/overlays/hetzner/                        ← ACTIVE
```

## Activation Checklist

When ready to enable multi-region:

1. [ ] Fill in `infra/terraform/multi-region/production.tfvars` with real values
2. [ ] `cd infra/terraform/multi-region && terraform init && terraform plan`
3. [ ] Provision US-West K3s cluster
4. [ ] Set up PostgreSQL streaming replication between regions
5. [ ] Deploy NATS gateway to both clusters
6. [ ] Configure Cloudflare GLB health checks
7. [ ] Test failover with the runbook at `docs/runbooks/region-failover.md`
8. [ ] Switch from `deploy-hetzner-production.yml` to `deploy-hetzner-multiregion.yml`
9. [ ] Update PagerDuty alerts for multi-region monitoring

## Architecture

```
                    Cloudflare Global Load Balancer
                     (failover steering, 30s detection)
                    ┌─────────────┬─────────────┐
                    │             │             │
              ┌─────▼─────┐ ┌────▼──────┐
              │  US-East   │ │  US-West   │
              │  Ashburn   │ │ Hillsboro  │
              │  (PRIMARY) │ │(SECONDARY) │
              │            │ │            │
              │ 3× CP      │ │ 3× CP      │
              │ 4× Worker  │ │ 3× Worker  │
              │ 1× DB (RW) │ │ 1× DB (RO) │
              └─────┬──────┘ └─────┬──────┘
                    │              │
                    │   PG Stream  │
                    │◄────────────►│
                    │  NATS GW     │
                    │◄────────────►│
```
