# GitHub Actions Configuration

## Known Warnings (False Positives)

The following warnings appear in the workflow files but are **expected and can be ignored**:

### Context Access Warnings

These warnings indicate that certain secrets or variables might not be configured yet. They are expected until the GitHub repository is fully configured with the necessary secrets and variables:

**Required Secrets:**

- `STAGING_HOST` - Hetzner staging server hostname/IP
- `STAGING_USER` - SSH user for staging server
- `STAGING_SSH_KEY` - SSH private key for staging server
- `PRODUCTION_HOST` - Hetzner production server hostname/IP
- `PRODUCTION_USER` - SSH user for production server
- `PRODUCTION_SSH_KEY` - SSH private key for production server
- `PAGERDUTY_ROUTING_KEY` - PagerDuty routing key for critical alerts

### Environment Name Validation

The warnings about environment names `development`, `production`, and `staging` are **false positives**. These are valid GitHub environment names and the warnings can be ignored. The environments need to be created in the repository settings before the workflows can use them.

## Setup Instructions

To resolve these warnings, configure the following in your GitHub repository:

1. **Add Repository Secrets** (Settings → Secrets and variables → Actions → Secrets):
   - Click "New repository secret"
   - Add each of the required secrets listed above

2. **Create Environments** (Settings → Environments):
   - Create `development` environment
   - Create `staging` environment
   - Create `production` environment (with protection rules recommended)
   - Create `production-approval` environment (for production deployment gates)

Once configured, the workflows will have access to all required secrets and the warnings will no longer appear during workflow runs.

## Infrastructure

This platform deploys to **Hetzner** dedicated servers with the following architecture:

- **K3s**: Lightweight Kubernetes for container orchestration
- **PostgreSQL**: Self-managed databases on Hetzner
- **Redis**: Self-managed Redis for caching
- **GHCR**: GitHub Container Registry for Docker images
- **Prometheus + Grafana**: Observability and alerting
