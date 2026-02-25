#!/usr/bin/env bash
# =============================================================================
# Vault — Automatic Secret Rotation Policies
# =============================================================================
# Configures the Vault database secrets engine for automatic credential
# rotation of PostgreSQL databases. Dynamic credentials have a 24h TTL
# and are automatically revoked after 48h max.
#
# Prerequisites:
#   - Vault CLI installed and authenticated
#   - VAULT_DB_PASSWORD env var set (Vault's admin password for Postgres)
#   - PostgreSQL reachable from Vault pods
#
# Usage:
#   export VAULT_ADDR=https://vault.vault.svc.cluster.local:8200
#   export VAULT_TOKEN=<root-or-admin-token>
#   export VAULT_DB_PASSWORD=<vault-postgres-admin-password>
#   ./rotation-policies.sh
# =============================================================================
set -euo pipefail

echo "=== Configuring Vault Database Credential Rotation ==="

# ─── Enable database secrets engine ───────────────────────────────────────
vault secrets enable database 2>/dev/null \
  || echo "Database secrets engine already enabled"

# ─── Configure PostgreSQL connection ──────────────────────────────────────
echo "Configuring PostgreSQL connection..."
vault write database/config/aivo-postgres \
  plugin_name=postgresql-database-plugin \
  allowed_roles="aivo-*" \
  connection_url="postgresql://{{username}}:{{password}}@postgres:5432/postgres?sslmode=require" \
  username="vault_admin" \
  password="${VAULT_DB_PASSWORD}"

# ─── Create rotation roles for each database ─────────────────────────────
DATABASES=(auth session content assessment analytics billing tenant)

for db in "${DATABASES[@]}"; do
  echo "Creating rotation role: aivo-${db}"
  vault write "database/roles/aivo-${db}" \
    db_name=aivo-postgres \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
      GRANT ALL PRIVILEGES ON DATABASE aivo_${db} TO \"{{name}}\";" \
    revocation_statements="REVOKE ALL PRIVILEGES ON DATABASE aivo_${db} FROM \"{{name}}\"; \
      DROP ROLE IF EXISTS \"{{name}}\";" \
    default_ttl="24h" \
    max_ttl="48h"
done

echo ""
echo "Database credential rotation configured for ${#DATABASES[@]} databases"
echo ""

# ─── Configure Kubernetes Auth Method ─────────────────────────────────────
echo "Configuring Kubernetes auth method..."
vault auth enable kubernetes 2>/dev/null \
  || echo "Kubernetes auth method already enabled"

vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc.cluster.local:443"

# Policy for ESO to read secrets
echo "Creating ESO read policy..."
vault policy write external-secrets-read - <<EOF
# Allow ESO to read all AIVO secrets
path "secret/data/aivo/*" {
  capabilities = ["read"]
}
path "database/creds/aivo-*" {
  capabilities = ["read"]
}
EOF

# Role for the ESO service account
vault write auth/kubernetes/role/external-secrets \
  bound_service_account_names=external-secrets \
  bound_service_account_namespaces=external-secrets \
  policies=external-secrets-read \
  ttl=1h

echo ""
echo "=== Rotation policy setup complete ==="
echo ""
echo "To generate dynamic credentials manually:"
echo "  vault read database/creds/aivo-auth"
echo "  vault read database/creds/aivo-session"
echo "  etc."
