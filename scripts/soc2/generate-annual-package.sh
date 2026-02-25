#!/usr/bin/env bash
#
# generate-annual-package.sh
#
# Generates an auditor-ready annual SOC 2 Type II evidence package.
# This script calls the compliance-evidence-svc API to build a ZIP
# containing all evidence collected during the specified year, organized
# by trust service category and control ID.
#
# Usage:
#   ./scripts/soc2/generate-annual-package.sh [YEAR]
#
# Environment variables:
#   COMPLIANCE_EVIDENCE_SVC_URL  - Base URL (default: http://localhost:3092)
#   SOC2_SERVICE_TOKEN           - Auth token for API access
#   OUTPUT_DIR                   - Where to save the ZIP (default: ./soc2-packages)
#
# Examples:
#   ./scripts/soc2/generate-annual-package.sh 2025
#   COMPLIANCE_EVIDENCE_SVC_URL=https://compliance.internal.aivo.ai ./scripts/soc2/generate-annual-package.sh
#

set -euo pipefail

# --- Configuration ---

YEAR="${1:-$(date -u +%Y)}"
PERIOD_START="${YEAR}-01-01T00:00:00Z"
PERIOD_END="${YEAR}-12-31T23:59:59Z"
PACKAGE_NAME="SOC2-Annual-${YEAR}"

SVC_URL="${COMPLIANCE_EVIDENCE_SVC_URL:-http://localhost:3092}"
TOKEN="${SOC2_SERVICE_TOKEN:-}"
OUTPUT_DIR="${OUTPUT_DIR:-./soc2-packages}"

# --- Helpers ---

log() { echo "[$(date -u +%H:%M:%S)] $*"; }
die() { echo "ERROR: $*" >&2; exit 1; }

auth_header() {
  if [ -n "$TOKEN" ]; then
    echo "Authorization: Bearer $TOKEN"
  else
    echo "X-No-Auth: true"
  fi
}

# --- Preflight checks ---

command -v curl >/dev/null 2>&1 || die "curl is required"
command -v jq   >/dev/null 2>&1 || die "jq is required"

log "=== SOC 2 Type II Annual Evidence Package Generator ==="
log "Year:         $YEAR"
log "Period:       $PERIOD_START → $PERIOD_END"
log "Service URL:  $SVC_URL"
log "Output dir:   $OUTPUT_DIR"
log ""

# --- Health check ---

log "Checking service health..."
HEALTH=$(curl -sf "${SVC_URL}/health" 2>&1) || die "Service unreachable at ${SVC_URL}/health"
log "Service healthy: $HEALTH"
echo ""

# --- Pre-collection: check current evidence freshness ---

log "Checking current evidence freshness..."
SUMMARY=$(curl -sf \
  -H "$(auth_header)" \
  "${SVC_URL}/api/controls/summary" 2>&1) || die "Failed to fetch control summary"

TOTAL=$(echo "$SUMMARY" | jq '.totalControls // 0')
HEALTHY=$(echo "$SUMMARY" | jq '.healthyControls // 0')
STALE=$(echo "$SUMMARY" | jq '.staleControls // 0')
MISSING=$(echo "$SUMMARY" | jq '.missingControls // 0')
HEALTH_PCT=$(echo "$SUMMARY" | jq '.overallHealthPct // 0')

log "Controls: $TOTAL total, $HEALTHY healthy, $STALE stale, $MISSING missing ($HEALTH_PCT%)"

if [ "$MISSING" -gt 0 ]; then
  log ""
  log "WARNING: $MISSING controls have no evidence. Consider running collectors first:"
  log "  curl -X POST ${SVC_URL}/api/collectors/trigger-all"
  log ""
  read -r -p "Continue anyway? [y/N] " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    log "Aborted."
    exit 0
  fi
fi

# --- Generate package ---

log ""
log "Requesting annual evidence package..."

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${SVC_URL}/api/packages" \
  -H "Content-Type: application/json" \
  -H "$(auth_header)" \
  -d "{
    \"name\": \"${PACKAGE_NAME}\",
    \"periodStart\": \"${PERIOD_START}\",
    \"periodEnd\": \"${PERIOD_END}\",
    \"categories\": []
  }")

HTTP_STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_STATUS" -ge 400 ]; then
  die "Failed to create package (HTTP $HTTP_STATUS): $BODY"
fi

PACKAGE_ID=$(echo "$BODY" | jq -r '.id')
PACKAGE_STATUS=$(echo "$BODY" | jq -r '.status')
EVIDENCE_COUNT=$(echo "$BODY" | jq -r '.evidenceCount // 0')

log "Package created: $PACKAGE_ID"
log "Status: $PACKAGE_STATUS  |  Evidence items: $EVIDENCE_COUNT"

# --- Poll until ready (if building) ---

MAX_WAIT=300  # 5 minutes
WAITED=0
POLL_INTERVAL=5

while [ "$PACKAGE_STATUS" = "building" ] && [ $WAITED -lt $MAX_WAIT ]; do
  sleep $POLL_INTERVAL
  WAITED=$((WAITED + POLL_INTERVAL))

  PKG_RESPONSE=$(curl -sf \
    -H "$(auth_header)" \
    "${SVC_URL}/api/packages/${PACKAGE_ID}" 2>&1) || continue

  PACKAGE_STATUS=$(echo "$PKG_RESPONSE" | jq -r '.status')
  EVIDENCE_COUNT=$(echo "$PKG_RESPONSE" | jq -r '.evidenceCount // 0')
  log "  Waiting... ($WAITED s) Status: $PACKAGE_STATUS, Evidence: $EVIDENCE_COUNT"
done

if [ "$PACKAGE_STATUS" = "building" ]; then
  die "Package did not finish building within ${MAX_WAIT}s"
fi

if [ "$PACKAGE_STATUS" = "failed" ]; then
  ERROR=$(echo "$PKG_RESPONSE" | jq -r '.error // "Unknown error"')
  die "Package build failed: $ERROR"
fi

# --- Download package ---

log ""
log "Downloading package..."

mkdir -p "$OUTPUT_DIR"
OUTPUT_FILE="${OUTPUT_DIR}/${PACKAGE_NAME}.zip"

# Get download URL (presigned S3 URL)
DOWNLOAD_RESPONSE=$(curl -sf \
  -H "$(auth_header)" \
  "${SVC_URL}/api/packages/${PACKAGE_ID}/download" 2>&1) || die "Failed to get download URL"

DOWNLOAD_URL=$(echo "$DOWNLOAD_RESPONSE" | jq -r '.url // empty')

if [ -z "$DOWNLOAD_URL" ]; then
  # Try direct download
  curl -sf \
    -H "$(auth_header)" \
    -o "$OUTPUT_FILE" \
    "${SVC_URL}/api/packages/${PACKAGE_ID}/download" || die "Failed to download package"
else
  curl -sf -o "$OUTPUT_FILE" "$DOWNLOAD_URL" || die "Failed to download from presigned URL"
fi

# --- Verify download ---

if [ ! -f "$OUTPUT_FILE" ]; then
  die "Download failed — file not found: $OUTPUT_FILE"
fi

FILE_SIZE=$(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE" 2>/dev/null || echo "unknown")

log "Downloaded: $OUTPUT_FILE ($FILE_SIZE bytes)"

# --- Generate manifest ---

MANIFEST_FILE="${OUTPUT_DIR}/${PACKAGE_NAME}-manifest.txt"
cat > "$MANIFEST_FILE" <<EOF
SOC 2 Type II Annual Evidence Package
======================================

Package Name:    ${PACKAGE_NAME}
Package ID:      ${PACKAGE_ID}
Generated:       $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Period:          ${PERIOD_START} to ${PERIOD_END}
Evidence Items:  ${EVIDENCE_COUNT}
File:            $(basename "$OUTPUT_FILE")
File Size:       ${FILE_SIZE} bytes

Control Summary at Generation Time:
  Total Controls:   ${TOTAL}
  Healthy:          ${HEALTHY}
  Stale:            ${STALE}
  Missing:          ${MISSING}
  Health %:         ${HEALTH_PCT}%

This package was generated by the AIVO Platform SOC 2
evidence automation system (compliance-evidence-svc).

Evidence is stored in S3 with Object Lock (Governance mode)
to ensure immutability for the retention period.

For questions, contact: compliance@aivo.ai
EOF

log "Manifest: $MANIFEST_FILE"

# --- Summary ---

log ""
log "=== Complete ==="
log ""
log "  Package:    ${OUTPUT_FILE}"
log "  Manifest:   ${MANIFEST_FILE}"
log "  Evidence:   ${EVIDENCE_COUNT} items"
log "  Period:     ${YEAR}"
log "  Health:     ${HEALTH_PCT}%"
log ""
log "Next steps:"
log "  1. Review the manifest for completeness"
log "  2. Verify ZIP contents: unzip -l ${OUTPUT_FILE}"
log "  3. Share with auditors via secure channel"
log ""
