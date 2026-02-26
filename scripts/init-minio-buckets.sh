#!/usr/bin/env bash
# =============================================================================
# init-minio-buckets.sh
#
# Creates the required MinIO buckets for local development.
# Requires the MinIO client (mc) to be installed, or uses curl as fallback.
#
# Run this after `docker compose up minio` is healthy.
# =============================================================================
set -euo pipefail

MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://localhost:9000}"
MINIO_ACCESS_KEY="${MINIO_ROOT_USER:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_ROOT_PASSWORD:-minioadmin}"
BUCKET_NAME="${AUDIO_S3_BUCKET:-aivo-tutor-audio}"

echo "Initializing MinIO buckets..."
echo "  Endpoint: $MINIO_ENDPOINT"
echo "  Bucket:   $BUCKET_NAME"
echo ""

# Try using mc (MinIO client) first
if command -v mc &> /dev/null; then
  mc alias set local "$MINIO_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" --api S3v4 2>/dev/null || true

  if mc ls local/"$BUCKET_NAME" &> /dev/null; then
    echo "  [skip] Bucket '$BUCKET_NAME' already exists"
  else
    mc mb "local/$BUCKET_NAME"
    echo "  [created] Bucket '$BUCKET_NAME'"
  fi

  # Set public read policy for audio files
  mc anonymous set download "local/$BUCKET_NAME/tutor-audio/"
  echo "  [policy] Set public read on tutor-audio/ prefix"
else
  # Fallback: use curl with S3 API
  echo "  mc not found, using curl..."

  # Check if bucket exists
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    -u "${MINIO_ACCESS_KEY}:${MINIO_SECRET_KEY}" \
    "${MINIO_ENDPOINT}/${BUCKET_NAME}/" 2>/dev/null || echo "000")

  if [[ "$status" == "200" ]]; then
    echo "  [skip] Bucket '$BUCKET_NAME' already exists"
  else
    curl -s -X PUT \
      -u "${MINIO_ACCESS_KEY}:${MINIO_SECRET_KEY}" \
      "${MINIO_ENDPOINT}/${BUCKET_NAME}/" > /dev/null

    echo "  [created] Bucket '$BUCKET_NAME'"
  fi

  # Set bucket policy for public read on tutor-audio prefix
  POLICY=$(cat <<'POLICY_JSON'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::BUCKET/tutor-audio/*"]
    }
  ]
}
POLICY_JSON
)
  POLICY="${POLICY//BUCKET/$BUCKET_NAME}"

  curl -s -X PUT \
    -u "${MINIO_ACCESS_KEY}:${MINIO_SECRET_KEY}" \
    -d "$POLICY" \
    "${MINIO_ENDPOINT}/${BUCKET_NAME}/?policy" > /dev/null 2>&1 || true

  echo "  [policy] Set public read on tutor-audio/ prefix"
fi

echo ""
echo "MinIO initialization complete."
