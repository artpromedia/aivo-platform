#!/usr/bin/env bash
# =============================================================================
# AIVO Platform — Create Web App K8s Secrets
# =============================================================================
# Generates NEXTAUTH_SECRET for each web app and applies them to K8s.
# Run once per namespace/environment before the first deployment.
#
# Usage:
#   ./create-web-secrets.sh staging       # → aivo-staging namespace
#   ./create-web-secrets.sh production    # → aivo-prod namespace
#   ./create-web-secrets.sh staging --dry-run  # Preview without applying
# =============================================================================

set -euo pipefail

ENV="${1:-staging}"
DRY_RUN="${2:-}"

case "$ENV" in
  staging)
    NAMESPACE="aivo-staging"
    ;;
  production|prod)
    NAMESPACE="aivo-prod"
    ;;
  *)
    echo "❌ Unknown environment: $ENV"
    echo "Usage: $0 <staging|production> [--dry-run]"
    exit 1
    ;;
esac

echo "═══════════════════════════════════════════════════"
echo "  AIVO — Create Web App Secrets"
echo "  Environment: $ENV"
echo "  Namespace:   $NAMESPACE"
echo "═══════════════════════════════════════════════════"
echo ""

# Web apps that use NextAuth (have NEXTAUTH_SECRET in their K8s deployment)
APPS_WITH_AUTH=(
  web-learner
  web-teacher
  web-parent
  web-district
  web-platform-admin
  web-author
  web-creator
)

# Ensure namespace exists
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f - 2>/dev/null

CREATED=0
SKIPPED=0

for app in "${APPS_WITH_AUTH[@]}"; do
  SECRET_NAME="${app}-secrets"

  # Check if secret already exists
  if kubectl -n "$NAMESPACE" get secret "$SECRET_NAME" &>/dev/null; then
    echo "  ⏭  ${SECRET_NAME} already exists — skipping"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Generate a strong random secret (64 chars, base64-safe)
  NEXTAUTH_SECRET=$(openssl rand -base64 48 | tr -d '\n')

  if [ "$DRY_RUN" = "--dry-run" ]; then
    echo "  🔍 Would create: ${SECRET_NAME} (nextauth-secret=<generated>)"
  else
    kubectl -n "$NAMESPACE" create secret generic "$SECRET_NAME" \
      --from-literal="nextauth-secret=${NEXTAUTH_SECRET}"
    echo "  ✅ Created: ${SECRET_NAME}"
  fi

  CREATED=$((CREATED + 1))
done

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Done: ${CREATED} created, ${SKIPPED} skipped"
echo "═══════════════════════════════════════════════════"

# ── Additional secrets reminder ──
echo ""
echo "📋 Additional secrets you may need to create manually:"
echo ""
echo "  # Stripe publishable key (web-parent)"
echo "  kubectl -n $NAMESPACE create secret generic web-parent-stripe \\"
echo "    --from-literal=stripe-publishable-key=pk_live_YOUR_KEY"
echo ""
echo "  # Google Analytics ID (web-marketing)"
echo "  kubectl -n $NAMESPACE create secret generic web-marketing-analytics \\"
echo "    --from-literal=analytics-id=G-YOUR_ID"
echo ""
echo "  # GHCR pull secret (if not already created by CI/CD)"
echo "  kubectl -n $NAMESPACE create secret docker-registry ghcr-pull-secret \\"
echo "    --docker-server=ghcr.io \\"
echo "    --docker-username=YOUR_GITHUB_USER \\"
echo "    --docker-password=YOUR_GHCR_PAT"
