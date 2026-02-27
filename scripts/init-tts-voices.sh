#!/usr/bin/env bash
# =============================================================================
# init-tts-voices.sh
#
# Downloads Piper TTS voice models needed for the tutor service.
# Run this once before starting the tts-engine service locally.
#
# Models are downloaded from HuggingFace and placed in the tts-engine
# models directory for the Docker volume to mount.
# =============================================================================
set -euo pipefail

MODELS_DIR="${1:-services/tts-engine/app/models}"
BASE_URL="https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0"

# Voice models used by tutor personas (see prisma/seed.ts)
VOICES=(
  "en/en_US/amy/medium/en_US-amy-medium"
  "en/en_US/lessac/medium/en_US-lessac-medium"
  "en/en_US/ryan/medium/en_US-ryan-medium"
  "es/es_MX/claude/high/es_MX-claude-high"
)

mkdir -p "$MODELS_DIR"

echo "Downloading Piper TTS voice models to $MODELS_DIR..."
echo ""

for voice_path in "${VOICES[@]}"; do
  filename=$(basename "$voice_path")

  if [[ -f "$MODELS_DIR/${filename}.onnx" && -f "$MODELS_DIR/${filename}.onnx.json" ]]; then
    echo "  [skip] ${filename} (already exists)"
    continue
  fi

  echo "  [download] ${filename}..."
  curl -sL "${BASE_URL}/${voice_path}.onnx" -o "$MODELS_DIR/${filename}.onnx"
  curl -sL "${BASE_URL}/${voice_path}.onnx.json" -o "$MODELS_DIR/${filename}.onnx.json"
  echo "  [done] ${filename}"
done

echo ""
echo "All voice models ready in $MODELS_DIR"
echo "Models downloaded: ${#VOICES[@]}"
