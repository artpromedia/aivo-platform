#!/usr/bin/env bash
# =============================================================================
# AIVO Platform — Automated Backup System
# =============================================================================
# Runs as a K8s CronJob, backs up to S3-compatible storage
# (Hetzner Object Storage / AWS S3).
#
# Required env vars:
#   BACKUP_BUCKET, BACKUP_ENCRYPTION_KEY, PGPASSWORD
#
# Optional env vars (with defaults):
#   BACKUP_PREFIX, PG_HOST, PG_PORT, PG_USER, REDIS_URL, RETENTION_DAYS,
#   VAULT_ADDR, VAULT_TOKEN
# =============================================================================
set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────────
BACKUP_BUCKET="${BACKUP_BUCKET:?BACKUP_BUCKET required}"
BACKUP_PREFIX="${BACKUP_PREFIX:-aivo-backups}"
BACKUP_ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY required}"
PG_HOST="${PG_HOST:-postgres}"
PG_PORT="${PG_PORT:-5432}"
PG_USER="${PG_USER:-aivo}"
PGPASSWORD="${PGPASSWORD:?PGPASSWORD required}"
export PGPASSWORD

REDIS_URL="${REDIS_URL:-redis://redis:6379}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/tmp/backup-${DATE}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting AIVO backup — ID: ${DATE}"

# ─── PostgreSQL Backups ───────────────────────────────────────────────────

# All platform databases
DATABASES=(
  aivo_auth aivo_session aivo_content aivo_assessment aivo_analytics
  aivo_notification aivo_messaging aivo_billing aivo_payments aivo_consent
  aivo_profile aivo_personalization aivo_goal aivo_focus aivo_parent
  aivo_baseline aivo_life_skills aivo_ai_orchestrator aivo_tenant
  aivo_gamification aivo_curriculum aivo_compliance aivo_audit
  aivo_integration aivo_sandbox aivo_reports
)

echo "[$(date)] Backing up ${#DATABASES[@]} PostgreSQL databases..."

BACKED_UP=()
for DB in "${DATABASES[@]}"; do
  echo "  Dumping ${DB}..."
  if pg_dump -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" \
    --format=custom --compress=9 --no-owner --no-privileges \
    "${DB}" > "${BACKUP_DIR}/${DB}.dump" 2>/dev/null; then
    BACKED_UP+=("${DB}")
  else
    echo "  WARNING: ${DB} does not exist or failed to dump"
    rm -f "${BACKUP_DIR}/${DB}.dump"
  fi
done

# Full cluster dump (includes roles, tablespaces)
echo "  Dumping cluster globals..."
pg_dumpall -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" \
  --globals-only > "${BACKUP_DIR}/globals.sql"

# ─── Redis Backup ─────────────────────────────────────────────────────────

REDIS_OK=false
echo "[$(date)] Triggering Redis BGSAVE..."
if redis-cli -u "${REDIS_URL}" BGSAVE 2>/dev/null; then
  sleep 5
  if redis-cli -u "${REDIS_URL}" --rdb "${BACKUP_DIR}/redis.rdb" 2>/dev/null; then
    REDIS_OK=true
  fi
fi

if [ "${REDIS_OK}" = false ]; then
  echo "  WARNING: Redis backup failed — continuing without Redis snapshot"
fi

# ─── Vault Backup ─────────────────────────────────────────────────────────

VAULT_OK=false
if [ -n "${VAULT_ADDR:-}" ] && [ -n "${VAULT_TOKEN:-}" ]; then
  echo "[$(date)] Backing up Vault..."
  if vault operator raft snapshot save "${BACKUP_DIR}/vault-snapshot.snap" 2>/dev/null; then
    VAULT_OK=true
  else
    echo "  WARNING: Vault backup failed"
  fi
fi

# ─── Create Backup Archive ───────────────────────────────────────────────

echo "[$(date)] Creating encrypted archive..."
ARCHIVE_NAME="aivo-backup-${DATE}.tar.gz.enc"

# Create tarball
tar -czf "${BACKUP_DIR}/backup.tar.gz" -C "${BACKUP_DIR}" \
  --exclude="backup.tar.gz" --exclude="*.enc" .

# Encrypt with AES-256-CBC (PBKDF2, 100 000 iterations)
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
  -in "${BACKUP_DIR}/backup.tar.gz" \
  -out "${BACKUP_DIR}/${ARCHIVE_NAME}" \
  -pass "pass:${BACKUP_ENCRYPTION_KEY}"

# Generate SHA-256 checksum
sha256sum "${BACKUP_DIR}/${ARCHIVE_NAME}" > "${BACKUP_DIR}/${ARCHIVE_NAME}.sha256"

# ─── Upload to Offsite Storage ───────────────────────────────────────────

echo "[$(date)] Uploading to ${BACKUP_BUCKET}/${BACKUP_PREFIX}/daily/..."

# Upload encrypted archive
aws s3 cp "${BACKUP_DIR}/${ARCHIVE_NAME}" \
  "s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/daily/${ARCHIVE_NAME}" \
  --storage-class STANDARD_IA

# Upload checksum
aws s3 cp "${BACKUP_DIR}/${ARCHIVE_NAME}.sha256" \
  "s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/daily/${ARCHIVE_NAME}.sha256"

# Upload manifest
ARCHIVE_SIZE=$(stat -c%s "${BACKUP_DIR}/${ARCHIVE_NAME}" 2>/dev/null || stat -f%z "${BACKUP_DIR}/${ARCHIVE_NAME}")
CHECKSUM=$(awk '{print $1}' "${BACKUP_DIR}/${ARCHIVE_NAME}.sha256")

cat > "${BACKUP_DIR}/manifest.json" << EOF
{
  "backupId": "${DATE}",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "databases": $(printf '%s\n' "${BACKED_UP[@]}" | jq -R . | jq -s .),
  "databaseCount": ${#BACKED_UP[@]},
  "includesRedis": ${REDIS_OK},
  "includesVault": ${VAULT_OK},
  "archiveSize": ${ARCHIVE_SIZE},
  "checksum": "${CHECKSUM}",
  "encryptionMethod": "AES-256-CBC-PBKDF2",
  "retentionDays": ${RETENTION_DAYS}
}
EOF

aws s3 cp "${BACKUP_DIR}/manifest.json" \
  "s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/daily/manifest-${DATE}.json"

# ─── Retention Policy ────────────────────────────────────────────────────

echo "[$(date)] Applying retention policy (${RETENTION_DAYS} days)..."
CUTOFF=$(date -d "-${RETENTION_DAYS} days" +%Y%m%d 2>/dev/null || date -v-${RETENTION_DAYS}d +%Y%m%d)

aws s3 ls "s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/daily/" | \
  grep "aivo-backup-" | \
  awk '{print $4}' | \
  while read -r file; do
    FILE_DATE=$(echo "${file}" | grep -oP '\d{8}' || echo "99999999")
    if [ "${FILE_DATE}" -lt "${CUTOFF}" ]; then
      echo "  Deleting old backup: ${file}"
      aws s3 rm "s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/daily/${file}"
    fi
  done

# Clean up expired manifests and checksums too
aws s3 ls "s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/daily/" | \
  grep -E "manifest-|\.sha256" | \
  awk '{print $4}' | \
  while read -r file; do
    FILE_DATE=$(echo "${file}" | grep -oP '\d{8}' || echo "99999999")
    if [ "${FILE_DATE}" -lt "${CUTOFF}" ]; then
      echo "  Deleting old metadata: ${file}"
      aws s3 rm "s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/daily/${file}"
    fi
  done

# ─── Cleanup ─────────────────────────────────────────────────────────────

rm -rf "${BACKUP_DIR}"

echo "[$(date)] Backup complete: ${ARCHIVE_NAME}"
echo "  Databases backed up: ${#BACKED_UP[@]}/${#DATABASES[@]}"
echo "  Redis snapshot: ${REDIS_OK}"
echo "  Vault snapshot: ${VAULT_OK}"
echo "  Archive size: ${ARCHIVE_SIZE} bytes"
echo "  Checksum: ${CHECKSUM}"
