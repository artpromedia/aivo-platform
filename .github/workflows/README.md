# GitHub Actions Configuration

## Known Warnings (False Positives)

The following warnings appear in the workflow files but are **expected and can be ignored**:

### Context Access Warnings

These warnings indicate that certain secrets or variables might not be configured yet. They are expected until the GitHub repository is fully configured with the necessary secrets and variables:

**Required Secrets (GCP):**

- `GCP_SA_KEY` - GCP Service Account JSON key for non-production environments
- `GCP_PROD_SA_KEY` - GCP Service Account JSON key for production environment
- `SLACK_WEBHOOK_URL` - Slack webhook for deployment notifications
- `PAGERDUTY_ROUTING_KEY` - PagerDuty routing key for critical alerts

**Required Variables:**

- `PROJECT_ID` - GCP project ID (default: `aivo-platform`)
- `GCP_REGION` - GCP region for deployments (default: `us-central1`)

### Environment Name Validation

The warnings about environment names `development`, `production`, and `staging` are **false positives**. These are valid GitHub environment names and the warnings can be ignored. The environments need to be created in the repository settings before the workflows can use them.

## Setup Instructions

To resolve these warnings, configure the following in your GitHub repository:

1. **Add Repository Secrets** (Settings → Secrets and variables → Actions → Secrets):
   - Click "New repository secret"
   - Add each of the required secrets listed above

2. **Add Repository Variables** (Settings → Secrets and variables → Actions → Variables):
   - Click "New repository variable"
   - Add `GCP_REGION` with your preferred region (default: `us-central1`)

3. **Create Environments** (Settings → Environments):
   - Create `development` environment
   - Create `staging` environment
   - Create `production` environment (with protection rules recommended)
   - Create `production-approval` environment (for production deployment gates)

Once configured, the workflows will have access to all required secrets and the warnings will no longer appear during workflow runs.

## GCP Infrastructure

This platform deploys to Google Cloud Platform (GCP) with the following architecture:

- **GKE**: Google Kubernetes Engine for container orchestration
- **Cloud SQL**: Managed PostgreSQL databases
- **Cloud Memorystore**: Managed Redis for caching
- **GCR**: Google Container Registry for Docker images
- **Cloud Monitoring**: Observability and alerting
- **Secret Manager**: Secure secrets management
