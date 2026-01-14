# GitHub Actions Configuration

## Known Warnings (False Positives)

The following warnings appear in the workflow files but are **expected and can be ignored**:

### Context Access Warnings

These warnings indicate that certain secrets or variables might not be configured yet. They are expected until the GitHub repository is fully configured with the necessary secrets and variables:

**Required Secrets:**

- `AWS_ROLE_ARN_DEV` - AWS IAM role for development environment
- `AWS_ROLE_ARN_STAGING` - AWS IAM role for staging environment
- `AWS_ROLE_ARN_PROD` - AWS IAM role for production environment
- `SLACK_WEBHOOK_URL` - Slack webhook for deployment notifications
- `PAGERDUTY_ROUTING_KEY` - PagerDuty routing key for critical alerts

**Required Variables:**

- `AWS_REGION` - AWS region for deployments (e.g., `us-east-1`)

### Environment Name Validation

The warnings about environment names `development`, `production`, and `staging` are **false positives**. These are valid GitHub environment names and the warnings can be ignored. The environments need to be created in the repository settings before the workflows can use them.

## Setup Instructions

To resolve these warnings, configure the following in your GitHub repository:

1. **Add Repository Secrets** (Settings → Secrets and variables → Actions → Secrets):
   - Click "New repository secret"
   - Add each of the required secrets listed above

2. **Add Repository Variables** (Settings → Secrets and variables → Actions → Variables):
   - Click "New repository variable"
   - Add `AWS_REGION` with your preferred region

3. **Create Environments** (Settings → Environments):
   - Create `development` environment
   - Create `staging` environment
   - Create `production` environment (with protection rules recommended)

Once configured, the workflows will have access to all required secrets and the warnings will no longer appear during workflow runs.
