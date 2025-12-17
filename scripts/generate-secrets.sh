#!/bin/bash
# scripts/generate-secrets.sh
# Generate development secrets for AIVO platform

set -e

echo "🔐 AIVO Platform - Secrets Generation"
echo "======================================"

SECRETS_DIR="./config/secrets"
mkdir -p "$SECRETS_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check for openssl
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}❌ openssl is required but not installed.${NC}"
    exit 1
fi

# Generate secure random string
generate_secret() {
    local length=${1:-32}
    openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c "$length"
}

# Generate hex string
generate_hex() {
    local length=${1:-32}
    openssl rand -hex "$length"
}

# Generate JWT RS256 key pair
echo -e "${YELLOW}Generating JWT key pair...${NC}"

if [ -f "$SECRETS_DIR/jwt-private.pem" ]; then
    echo -e "${YELLOW}⚠ JWT keys already exist. Skipping...${NC}"
    echo "  To regenerate, delete existing keys first."
else
    openssl genrsa -out "$SECRETS_DIR/jwt-private.pem" 4096 2>/dev/null
    openssl rsa -in "$SECRETS_DIR/jwt-private.pem" -pubout -out "$SECRETS_DIR/jwt-public.pem" 2>/dev/null
    chmod 600 "$SECRETS_DIR/jwt-private.pem"
    chmod 644 "$SECRETS_DIR/jwt-public.pem"
    echo -e "${GREEN}✓ JWT keys generated${NC}"
fi

# Generate random secrets
echo -e "${YELLOW}Generating random secrets...${NC}"

# Generate key ID for JWT
JWT_KID=$(generate_hex 16)

# Create secrets file
cat > "$SECRETS_DIR/local.env" << EOF
# ===========================================
# Auto-generated secrets for local development
# Generated at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# DO NOT COMMIT THIS FILE
# ===========================================

# JWT Key ID
JWT_KEY_ID=${JWT_KID}

# Database passwords (per-service)
AUTH_DB_PASSWORD=$(generate_secret 32)
TENANT_DB_PASSWORD=$(generate_secret 32)
PROFILE_DB_PASSWORD=$(generate_secret 32)
CONTENT_DB_PASSWORD=$(generate_secret 32)
SESSION_DB_PASSWORD=$(generate_secret 32)
ASSESSMENT_DB_PASSWORD=$(generate_secret 32)
ENGAGEMENT_DB_PASSWORD=$(generate_secret 32)
ANALYTICS_DB_PASSWORD=$(generate_secret 32)
PERSONALIZATION_DB_PASSWORD=$(generate_secret 32)
BASELINE_DB_PASSWORD=$(generate_secret 32)
RETENTION_DB_PASSWORD=$(generate_secret 32)
MARKETPLACE_DB_PASSWORD=$(generate_secret 32)
NOTIFICATION_DB_PASSWORD=$(generate_secret 32)
BILLING_DB_PASSWORD=$(generate_secret 32)
COLLABORATION_DB_PASSWORD=$(generate_secret 32)
INTEGRATION_DB_PASSWORD=$(generate_secret 32)
RESEARCH_DB_PASSWORD=$(generate_secret 32)
GOAL_DB_PASSWORD=$(generate_secret 32)
FOCUS_DB_PASSWORD=$(generate_secret 32)

# Redis password
REDIS_PASSWORD=$(generate_secret 32)

# Session secret
SESSION_SECRET=$(generate_secret 64)

# Encryption keys
ENCRYPTION_KEY=$(generate_hex 32)
ENCRYPTION_IV=$(generate_hex 16)

# Webhook signing secrets
WEBHOOK_SECRET=$(generate_secret 32)
STRIPE_WEBHOOK_SECRET=whsec_$(generate_secret 24)

# API keys for external services (placeholders for development)
SENDGRID_API_KEY=SG.development_placeholder
STRIPE_SECRET_KEY=sk_test_development_placeholder
OPENAI_API_KEY=sk-dev-placeholder
ANTHROPIC_API_KEY=sk-ant-dev-placeholder

# MinIO credentials (local S3-compatible storage)
MINIO_ROOT_USER=aivo_minio_admin
MINIO_ROOT_PASSWORD=$(generate_secret 32)
STORAGE_ACCESS_KEY=aivo_minio
STORAGE_SECRET_KEY=$(generate_secret 32)

# Grafana admin
GRAFANA_ADMIN_PASSWORD=$(generate_secret 16)

# NATS credentials
NATS_USER=aivo
NATS_PASSWORD=$(generate_secret 32)

# Elasticsearch credentials
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=$(generate_secret 32)
EOF

chmod 600 "$SECRETS_DIR/local.env"
echo -e "${GREEN}✓ Secrets file generated${NC}"

# Create .gitignore in secrets directory if not exists
if [ ! -f "$SECRETS_DIR/.gitignore" ]; then
    cat > "$SECRETS_DIR/.gitignore" << EOF
# Ignore all files in this directory
*
# Except these
!.gitignore
!.gitkeep
!README.md
EOF
fi

echo ""
echo -e "${GREEN}✅ Secrets generation complete!${NC}"
echo ""
echo "Generated files:"
echo "  - $SECRETS_DIR/jwt-private.pem (RSA private key)"
echo "  - $SECRETS_DIR/jwt-public.pem (RSA public key)"
echo "  - $SECRETS_DIR/local.env (development secrets)"
echo ""
echo "JWT Key ID: $JWT_KID"
echo ""
echo "To use these secrets:"
echo "  1. Source the secrets file: source $SECRETS_DIR/local.env"
echo "  2. Or run: ./scripts/setup-local.sh"
echo ""
echo -e "${YELLOW}⚠️  Never commit these files to version control!${NC}"
