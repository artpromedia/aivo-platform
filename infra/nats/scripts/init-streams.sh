#!/bin/bash
# =============================================================================
# AIVO JetStream Streams Initialization Script
# =============================================================================
#
# This script creates the JetStream streams for event streaming.
# Run this after the NATS cluster is up:
#   docker exec -it aivo-nats-box /bin/bash /scripts/init-streams.sh
#
# Or use: docker-compose run --rm nats-box /bin/bash /scripts/init-streams.sh

set -e

NATS_URL="${NATS_URL:-nats://nats1:4222}"

echo "==> Connecting to NATS at $NATS_URL"
echo "==> Initializing AIVO JetStream streams..."

# Wait for NATS to be ready
echo "==> Waiting for NATS cluster..."
until nats server check connection --server="$NATS_URL" 2>/dev/null; do
  echo "    Waiting for NATS..."
  sleep 2
done
echo "    NATS is ready!"

# =============================================================================
# LEARNING EVENTS STREAM
# =============================================================================
# Captures all learning-related events: session lifecycle, activity completion,
# skill mastery, engagement metrics.
#
# Subjects:
#   learning.session.*     - Session lifecycle events
#   learning.activity.*    - Activity events (started, completed, skipped)
#   learning.skill.*       - Skill mastery events
#   learning.engagement.*  - Engagement/interaction events
# =============================================================================
echo "==> Creating LEARNING stream..."
nats stream add LEARNING \
  --server="$NATS_URL" \
  --subjects="learning.>" \
  --storage=file \
  --replicas=3 \
  --retention=limits \
  --max-age=30d \
  --max-bytes=10GB \
  --max-msg-size=1MB \
  --discard=old \
  --dupe-window=2m \
  --no-deny-delete \
  --no-deny-purge \
  --defaults \
  2>/dev/null || nats stream update LEARNING --server="$NATS_URL" --force --defaults

# =============================================================================
# FOCUS EVENTS STREAM
# =============================================================================
# Captures focus/attention telemetry from learner devices.
# High-volume stream with shorter retention.
#
# Subjects:
#   focus.ping         - Raw focus pings from clients
#   focus.sample       - Processed focus samples
#   focus.loss.*       - Focus loss events by reason
#   focus.session.*    - Focus session summaries
# =============================================================================
echo "==> Creating FOCUS stream..."
nats stream add FOCUS \
  --server="$NATS_URL" \
  --subjects="focus.>" \
  --storage=file \
  --replicas=3 \
  --retention=limits \
  --max-age=7d \
  --max-bytes=20GB \
  --max-msg-size=64KB \
  --discard=old \
  --dupe-window=30s \
  --no-deny-delete \
  --no-deny-purge \
  --defaults \
  2>/dev/null || nats stream update FOCUS --server="$NATS_URL" --force --defaults

# =============================================================================
# HOMEWORK EVENTS STREAM
# =============================================================================
# Captures homework helper events: sessions, questions, hints, solutions.
#
# Subjects:
#   homework.session.*   - Homework session lifecycle
#   homework.question.*  - Question events
#   homework.hint.*      - Hint requests/deliveries
#   homework.solution.*  - Solution attempts/completions
# =============================================================================
echo "==> Creating HOMEWORK stream..."
nats stream add HOMEWORK \
  --server="$NATS_URL" \
  --subjects="homework.>" \
  --storage=file \
  --replicas=3 \
  --retention=limits \
  --max-age=90d \
  --max-bytes=5GB \
  --max-msg-size=512KB \
  --discard=old \
  --dupe-window=2m \
  --no-deny-delete \
  --no-deny-purge \
  --defaults \
  2>/dev/null || nats stream update HOMEWORK --server="$NATS_URL" --force --defaults

# =============================================================================
# RECOMMENDATION EVENTS STREAM
# =============================================================================
# Captures personalization/recommendation events for analytics & explainability.
#
# Subjects:
#   recommendation.created  - New recommendation generated
#   recommendation.served   - Recommendation shown to user
#   recommendation.clicked  - User clicked/selected recommendation
#   recommendation.dismissed- User dismissed recommendation
#   recommendation.feedback - Explicit feedback on recommendation
# =============================================================================
echo "==> Creating RECOMMENDATION stream..."
nats stream add RECOMMENDATION \
  --server="$NATS_URL" \
  --subjects="recommendation.>" \
  --storage=file \
  --replicas=3 \
  --retention=limits \
  --max-age=90d \
  --max-bytes=5GB \
  --max-msg-size=256KB \
  --discard=old \
  --dupe-window=2m \
  --no-deny-delete \
  --no-deny-purge \
  --defaults \
  2>/dev/null || nats stream update RECOMMENDATION --server="$NATS_URL" --force --defaults

# =============================================================================
# DEAD LETTER QUEUE STREAM
# =============================================================================
# Captures failed events that couldn't be processed by consumers.
# Used for debugging, replay, and manual intervention.
#
# Subjects:
#   dlq.learning.*      - Failed learning events
#   dlq.focus.*         - Failed focus events
#   dlq.homework.*      - Failed homework events
#   dlq.recommendation.*- Failed recommendation events
# =============================================================================
echo "==> Creating DLQ stream..."
nats stream add DLQ \
  --server="$NATS_URL" \
  --subjects="dlq.>" \
  --storage=file \
  --replicas=3 \
  --retention=limits \
  --max-age=30d \
  --max-bytes=2GB \
  --max-msg-size=1MB \
  --discard=old \
  --dupe-window=2m \
  --no-deny-delete \
  --no-deny-purge \
  --defaults \
  2>/dev/null || nats stream update DLQ --server="$NATS_URL" --force --defaults

# =============================================================================
# Create Durable Consumers
# =============================================================================

echo "==> Creating consumers..."

# Indexing consumer - writes all events to Postgres
nats consumer add LEARNING indexer \
  --server="$NATS_URL" \
  --filter="" \
  --ack=explicit \
  --deliver=all \
  --max-deliver=5 \
  --max-pending=1000 \
  --replay=instant \
  --defaults \
  2>/dev/null || true

nats consumer add FOCUS indexer \
  --server="$NATS_URL" \
  --filter="" \
  --ack=explicit \
  --deliver=all \
  --max-deliver=5 \
  --max-pending=1000 \
  --replay=instant \
  --defaults \
  2>/dev/null || true

nats consumer add HOMEWORK indexer \
  --server="$NATS_URL" \
  --filter="" \
  --ack=explicit \
  --deliver=all \
  --max-deliver=5 \
  --max-pending=1000 \
  --replay=instant \
  --defaults \
  2>/dev/null || true

nats consumer add RECOMMENDATION indexer \
  --server="$NATS_URL" \
  --filter="" \
  --ack=explicit \
  --deliver=all \
  --max-deliver=5 \
  --max-pending=1000 \
  --replay=instant \
  --defaults \
  2>/dev/null || true

# Analytics aggregation consumer
nats consumer add LEARNING analytics \
  --server="$NATS_URL" \
  --filter="" \
  --ack=explicit \
  --deliver=all \
  --max-deliver=3 \
  --max-pending=500 \
  --replay=instant \
  --defaults \
  2>/dev/null || true

nats consumer add FOCUS analytics \
  --server="$NATS_URL" \
  --filter="" \
  --ack=explicit \
  --deliver=all \
  --max-deliver=3 \
  --max-pending=500 \
  --replay=instant \
  --defaults \
  2>/dev/null || true

echo ""
echo "==> Stream initialization complete!"
echo ""
echo "Streams:"
nats stream list --server="$NATS_URL"
echo ""
echo "Use 'nats stream info <STREAM>' to see details"
echo "Use 'nats consumer info <STREAM> <CONSUMER>' to see consumer details"
