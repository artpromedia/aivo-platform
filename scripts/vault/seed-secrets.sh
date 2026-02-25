#!/usr/bin/env bash
# =============================================================================
# Vault Secret Seeding Script
# =============================================================================
# Run once after Vault initialization, then manage via Vault UI/API.
#
# Prerequisites:
#   - Vault CLI installed and authenticated (VAULT_TOKEN set)
#   - KV v2 secrets engine enabled at 'secret/'
#   - JWT key pair generated at /tmp/jwt-private.pem and /tmp/jwt-public.pem
#   - Environment variables set for third-party secrets (Stripe, AI, SMTP, S3)
#
# Usage:
#   export VAULT_ADDR=https://vault.vault.svc.cluster.local:8200
#   export VAULT_TOKEN=<root-or-admin-token>
#   ./seed-secrets.sh
# =============================================================================
set -euo pipefail

VAULT_ADDR="${VAULT_ADDR:-https://vault.vault.svc.cluster.local:8200}"

echo "=== Seeding AIVO Platform Secrets ==="
echo "Vault: ${VAULT_ADDR}"
echo ""

# ─── Enable KV v2 if not already ─────────────────────────────────────────
vault secrets enable -path=secret kv-v2 2>/dev/null || echo "KV v2 already enabled at secret/"

# ─── JWT Keys ─────────────────────────────────────────────────────────────
echo "Seeding JWT keys..."
vault kv put secret/aivo/auth \
  jwt_private_key=@/tmp/jwt-private.pem \
  jwt_public_key=@/tmp/jwt-public.pem \
  jwt_expires_in="7d" \
  internal_api_key="$(openssl rand -hex 32)"

# ─── Database Credentials ─────────────────────────────────────────────────
echo "Seeding database credentials..."
vault kv put secret/aivo/database \
  auth_url="postgresql://aivo_auth:GENERATED@postgres:5432/aivo_auth" \
  session_url="postgresql://aivo_session:GENERATED@postgres:5432/aivo_session" \
  content_url="postgresql://aivo_content:GENERATED@postgres:5432/aivo_content" \
  assessment_url="postgresql://aivo_assessment:GENERATED@postgres:5432/aivo_assessment" \
  analytics_url="postgresql://aivo_analytics:GENERATED@postgres:5432/aivo_analytics" \
  billing_url="postgresql://aivo_billing:GENERATED@postgres:5432/aivo_billing" \
  tenant_url="postgresql://aivo_tenant:GENERATED@postgres:5432/aivo_tenant"

# ─── Redis ─────────────────────────────────────────────────────────────────
echo "Seeding Redis credentials..."
vault kv put secret/aivo/redis \
  url="redis://:REDIS_PASSWORD@redis:6379" \
  password="$(openssl rand -hex 32)"

# ─── NATS ──────────────────────────────────────────────────────────────────
echo "Seeding NATS credentials..."
vault kv put secret/aivo/nats \
  url="nats://nats:4222" \
  token="$(openssl rand -hex 32)"

# ─── Stripe ────────────────────────────────────────────────────────────────
echo "Seeding Stripe keys..."
vault kv put secret/aivo/stripe \
  secret_key="${STRIPE_SECRET_KEY}" \
  publishable_key="${STRIPE_PUBLISHABLE_KEY}" \
  webhook_secret="${STRIPE_WEBHOOK_SECRET}" \
  portal_config_id="${STRIPE_PORTAL_CONFIG_ID:-}"

# ─── AI Providers ──────────────────────────────────────────────────────────
echo "Seeding AI provider keys..."
vault kv put secret/aivo/ai-providers \
  openai_api_key="${OPENAI_API_KEY}" \
  anthropic_api_key="${ANTHROPIC_API_KEY}" \
  google_ai_key="${GOOGLE_AI_KEY:-}"

# ─── Email / SMTP ─────────────────────────────────────────────────────────
echo "Seeding email configuration..."
vault kv put secret/aivo/email \
  smtp_host="${SMTP_HOST:-smtp.sendgrid.net}" \
  smtp_port="${SMTP_PORT:-587}" \
  smtp_user="${SMTP_USER}" \
  smtp_password="${SMTP_PASSWORD}" \
  from_address="noreply@aivolearning.com"

# ─── S3 / Object Storage ──────────────────────────────────────────────────
echo "Seeding S3 credentials..."
vault kv put secret/aivo/storage \
  aws_access_key_id="${AWS_ACCESS_KEY_ID}" \
  aws_secret_access_key="${AWS_SECRET_ACCESS_KEY}" \
  s3_bucket="${S3_BUCKET:-aivo-content}" \
  s3_region="${S3_REGION:-us-east-1}"

# ─── Enable Audit Logging ─────────────────────────────────────────────────
echo "Enabling audit logging..."
vault audit enable file file_path=/vault/audit/vault-audit.log 2>/dev/null \
  || echo "File audit device already enabled"

echo ""
echo "=== Secret seeding complete ==="
echo ""
echo "Next steps:"
echo "  1. Replace 'GENERATED' placeholders in database URLs with real passwords"
echo "  2. Configure dynamic database credentials (see rotation-policies.sh)"
echo "  3. Set up Kubernetes auth method for ESO (see docs/security/secrets-management.md)"
