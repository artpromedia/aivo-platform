#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# Ollama Model Initialization Script
# ══════════════════════════════════════════════════════════════════════════════
# This script ensures the required LLM model is pulled and ready for use.
# It runs after the Ollama container is healthy.
# ══════════════════════════════════════════════════════════════════════════════

set -e

OLLAMA_HOST="${OLLAMA_HOST:-ollama:11434}"
MODEL="${OLLAMA_MODEL:-llama3.2:3b}"
MAX_RETRIES=30
RETRY_INTERVAL=5

echo "═══════════════════════════════════════════════════════════════════"
echo " Ollama Model Initialization"
echo "═══════════════════════════════════════════════════════════════════"
echo " Host: $OLLAMA_HOST"
echo " Model: $MODEL"
echo "═══════════════════════════════════════════════════════════════════"

# Wait for Ollama to be ready
echo "[init-ollama] Waiting for Ollama to be ready..."
retries=0
until curl -sf "http://$OLLAMA_HOST/api/tags" > /dev/null 2>&1; do
  retries=$((retries + 1))
  if [ $retries -ge $MAX_RETRIES ]; then
    echo "[init-ollama] ERROR: Ollama did not become ready after $MAX_RETRIES retries"
    exit 1
  fi
  echo "[init-ollama] Ollama not ready yet, waiting ${RETRY_INTERVAL}s... (attempt $retries/$MAX_RETRIES)"
  sleep $RETRY_INTERVAL
done
echo "[init-ollama] Ollama is ready!"

# Check if model is already pulled
echo "[init-ollama] Checking if model '$MODEL' is already available..."
if curl -sf "http://$OLLAMA_HOST/api/tags" | grep -q "\"name\":\"$MODEL\""; then
  echo "[init-ollama] Model '$MODEL' is already available"
else
  echo "[init-ollama] Model '$MODEL' not found, pulling..."

  # Pull the model
  curl -sf -X POST "http://$OLLAMA_HOST/api/pull" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"$MODEL\"}" | while read -r line; do
      status=$(echo "$line" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || true)
      if [ -n "$status" ]; then
        echo "[init-ollama] $status"
      fi
    done

  echo "[init-ollama] Model '$MODEL' pulled successfully!"
fi

# Verify model is ready by running a simple test
echo "[init-ollama] Verifying model is loaded and responding..."
response=$(curl -sf -X POST "http://$OLLAMA_HOST/api/generate" \
  -H "Content-Type: application/json" \
  -d "{\"model\": \"$MODEL\", \"prompt\": \"Say 'ready'\", \"stream\": false}" 2>&1 || echo "error")

if echo "$response" | grep -q "error"; then
  echo "[init-ollama] WARNING: Model verification failed, but continuing..."
else
  echo "[init-ollama] Model is responding correctly!"
fi

echo "═══════════════════════════════════════════════════════════════════"
echo " Ollama initialization complete"
echo "═══════════════════════════════════════════════════════════════════"
exit 0
