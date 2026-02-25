#!/usr/bin/env bash
# =============================================================================
# AIVO Platform — Disaster Recovery Restore Script
# =============================================================================
# Downloads an encrypted offsite backup, verifies its integrity, and restores
# PostgreSQL databases (optionally a single DB).
#
# Usage:
#   ./restore.sh <backup-id>                          # Restore ALL databases
#   ./restore.sh <backup-id> --database aivo_auth     # Restore one database
#   ./restore.sh <backup-id> --dry-run                # Verify only, no restore
#   ./restore.sh <backup-id> --include-redis          # Also restore Redis RDB
#
# Required env vars:
#   BACKUP_BUCKET, BACKUP_ENCRYPTION_KEY, PGPASSWORD
# =============================================================================
set -euo pipefail

# ─── Argument parsing ─────────────────────────────────────────────────────
BACKUP_ID="${1:?Usage: ./restore.sh <backup-id> [--database <db>] [--dry-run] [--include-redis]}"
TARGET_DB=""
DRY_RUN=false
INCLUDE_REDIS=false

shift
while [[ $# -gt 0 ]]; do
  case $1 in
    --database)  TARGET_DB="$2"; shift 2 ;;
    --dry-run)   DRY_RUN=true; shift ;;
    --include-redis) INCLUDE_REDIS=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

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
RESTORE_DIR="/tmp/restore-${BACKUP_ID}"

# ─── Banner ───────────────────────────────────────────────────────────────
echo "======================================================================"
echo "            AIVO DISASTER RECOVERY RESTORE"
echo "======================================================================"
echo "  Backup ID:     ${BACKUP_ID}"
echo "  Target DB:     ${TARGET_DB:-ALL}"
echo "  Include Redis: ${INCLUDE_REDIS}"
echo "  Dry Run:       ${DRY_RUN}"
echo "  Source:        s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/daily/"
echo "======================================================================"

# ─── Dry-run shortcut ────────────────────────────────────────────────────
if [ "${DRY_RUN}" = true ]; then
  echo ""
  echo "[DRY RUN] Would download and verify backup ${BACKUP_ID}"
  echo "[DRY RUN] Would restore ${TARGET_DB:-all databases}"

  # Still download + verify checksum so operators can validate the backup
  mkdir -p "${RESTORE_DIR}"
  ARCHIVE_NAME="aivo-backup-${BACKUP_ID}.tar.gz.enc"

  echo "[$(date)] Downloading backup for verification..."
  aws s3 cp "s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/daily/${ARCHIVE_NAME}" "${RESTORE_DIR}/"
  aws s3 cp "s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/daily/${ARCHIVE_NAME}.sha256" "${RESTORE_DIR}/"

  echo "[$(date)] Verifying checksum..."
  cd "${RESTORE_DIR}"
  if sha256sum -c "${ARCHIVE_NAME}.sha256"; then
    echo "[DRY RUN] Checksum PASSED"
  else
    echo "[DRY RUN] Checksum FAILED — backup may be corrupt!"
    rm -rf "${RESTORE_DIR}"
    exit 1
  fi

  # Decrypt to verify key is correct
  echo "[$(date)] Verifying decryption..."
  openssl enc -aes-256-cbc -d -salt -pbkdf2 -iter 100000 \
    -in "${ARCHIVE_NAME}" \
    -out backup.tar.gz \
    -pass "pass:${BACKUP_ENCRYPTION_KEY}"

  echo "[DRY RUN] Decryption PASSED"

  # List contents
  echo ""
  echo "Archive contents:"
  tar -tzf backup.tar.gz
  echo ""

  rm -rf "${RESTORE_DIR}"
  echo "[DRY RUN] Verification complete — backup is valid."
  exit 0
fi

# ─── Safety confirmation ─────────────────────────────────────────────────
echo ""
echo "WARNING: This will OVERWRITE ${TARGET_DB:-ALL} database(s)."
read -p "Type 'yes' to continue: " CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

# ─── Download ─────────────────────────────────────────────────────────────
mkdir -p "${RESTORE_DIR}"
ARCHIVE_NAME="aivo-backup-${BACKUP_ID}.tar.gz.enc"

echo "[$(date)] Downloading backup..."
aws s3 cp "s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/daily/${ARCHIVE_NAME}" "${RESTORE_DIR}/"
aws s3 cp "s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/daily/${ARCHIVE_NAME}.sha256" "${RESTORE_DIR}/"

# Also grab the manifest for reference
aws s3 cp "s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/daily/manifest-${BACKUP_ID}.json" \
  "${RESTORE_DIR}/" 2>/dev/null || true

# ─── Verify checksum ─────────────────────────────────────────────────────
echo "[$(date)] Verifying SHA-256 checksum..."
cd "${RESTORE_DIR}"
sha256sum -c "${ARCHIVE_NAME}.sha256"
echo "  Checksum OK"

# ─── Decrypt ──────────────────────────────────────────────────────────────
echo "[$(date)] Decrypting..."
openssl enc -aes-256-cbc -d -salt -pbkdf2 -iter 100000 \
  -in "${ARCHIVE_NAME}" \
  -out backup.tar.gz \
  -pass "pass:${BACKUP_ENCRYPTION_KEY}"

# ─── Extract ──────────────────────────────────────────────────────────────
echo "[$(date)] Extracting archive..."
tar -xzf backup.tar.gz

# ─── Restore PostgreSQL ──────────────────────────────────────────────────
if [ -n "${TARGET_DB}" ]; then
  # --- Single database ---
  echo "[$(date)] Restoring single database: ${TARGET_DB}"
  DUMP_FILE="${TARGET_DB}.dump"
  if [ ! -f "${DUMP_FILE}" ]; then
    echo "ERROR: ${DUMP_FILE} not found in backup"
    echo "Available dumps:"
    ls -1 *.dump 2>/dev/null || echo "  (none)"
    rm -rf "${RESTORE_DIR}"
    exit 1
  fi

  # Ensure database exists
  psql -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" \
    -c "CREATE DATABASE ${TARGET_DB};" postgres 2>/dev/null || true

  pg_restore -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" \
    --dbname="${TARGET_DB}" --clean --if-exists --no-owner \
    "${DUMP_FILE}"

  echo "  ${TARGET_DB} restored successfully"
else
  # --- Full restore ---
  echo "[$(date)] Restoring ALL databases..."

  # Restore globals (roles, tablespaces) first
  if [ -f globals.sql ]; then
    echo "  Restoring cluster globals..."
    psql -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" \
      -f globals.sql postgres 2>/dev/null || true
  fi

  RESTORED=0
  FAILED=0
  for DUMP_FILE in *.dump; do
    [ -f "${DUMP_FILE}" ] || continue
    DB_NAME="${DUMP_FILE%.dump}"
    echo "  Restoring ${DB_NAME}..."

    # Create database if it doesn't exist
    psql -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" \
      -c "CREATE DATABASE ${DB_NAME};" postgres 2>/dev/null || true

    if pg_restore -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" \
      --dbname="${DB_NAME}" --clean --if-exists --no-owner \
      "${DUMP_FILE}" 2>/dev/null; then
      RESTORED=$((RESTORED + 1))
    else
      echo "  WARNING: Partial restore for ${DB_NAME}"
      FAILED=$((FAILED + 1))
    fi
  done

  echo "  Databases restored: ${RESTORED}, warnings: ${FAILED}"
fi

# ─── Restore Redis (optional) ────────────────────────────────────────────
if [ "${INCLUDE_REDIS}" = true ] && [ -f redis.rdb ]; then
  echo "[$(date)] Restoring Redis..."
  echo "  NOTE: Manual step required — copy redis.rdb to Redis data directory"
  echo "  and restart the Redis server. Path: ${RESTORE_DIR}/redis.rdb"
  # We leave the file in place for the operator
  echo "  Skipping auto-restore for safety."
fi

# ─── Cleanup ──────────────────────────────────────────────────────────────
if [ "${INCLUDE_REDIS}" = false ] || [ ! -f redis.rdb ]; then
  rm -rf "${RESTORE_DIR}"
fi

echo ""
echo "[$(date)] Restore complete!"
echo ""
echo "POST-RESTORE CHECKLIST:"
echo "  1. Run database migrations:  pnpm run db:migrate:deploy"
echo "  2. Verify service health:    kubectl get pods -n aivo-prod"
echo "  3. Restart affected services: kubectl rollout restart deployment/<svc> -n aivo-prod"
echo "  4. Run smoke tests:          pnpm test:smoke"
echo "  5. Notify team via #ops-incidents Slack channel"
