#!/usr/bin/env bash
# Download Piper voice models for AIVO tutor personas
#
# Voice models are ~50-80MB each (ONNX format).
# Download only the languages you need to save disk space.
#
# Usage: ./download_voices.sh [models_dir]
#
# Full voice catalog: https://github.com/rhasspy/piper/blob/master/VOICES.md

set -euo pipefail

MODELS_DIR="${1:-/app/models}"
PIPER_BASE_URL="https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0"

mkdir -p "$MODELS_DIR"

download_voice() {
    local voice="$1"
    local lang="${voice%%_*}"  # Extract language prefix
    local model_url="${PIPER_BASE_URL}/${lang}/${voice}/${voice}.onnx"
    local config_url="${PIPER_BASE_URL}/${lang}/${voice}/${voice}.onnx.json"

    if [ -f "${MODELS_DIR}/${voice}.onnx" ]; then
        echo "Already exists: ${voice}"
        return
    fi

    echo "Downloading: ${voice}..."
    curl -L -o "${MODELS_DIR}/${voice}.onnx" "$model_url" || {
        echo "Failed to download: ${voice}.onnx"
        return 1
    }
    curl -L -o "${MODELS_DIR}/${voice}.onnx.json" "$config_url" || {
        echo "Failed to download: ${voice}.onnx.json"
        return 1
    }
    echo "Downloaded: ${voice}"
}

echo "Downloading Piper voice models for AIVO tutors..."
echo "   Target directory: ${MODELS_DIR}"
echo ""

# -- English (US) -- Primary --
download_voice "en_US-amy-medium"        # Nova (Math), Spark (Science)
download_voice "en_US-lessac-medium"     # Sage (ELA), Chrono (History)
download_voice "en_US-ryan-medium"       # Pixel (Coding)

# -- Spanish (Mexico) --
download_voice "es_MX-claude-high"

# -- French --
download_voice "fr_FR-siwis-medium"

# -- Portuguese (Brazil) --
download_voice "pt_BR-edresson-low"

# -- Arabic --
download_voice "ar_JO-kareem-medium"

# -- Swahili --
download_voice "sw_CD-lanfrica-medium"

echo ""
echo "Voice model download complete!"
echo "   Models in: ${MODELS_DIR}"
ls -lh "${MODELS_DIR}"/*.onnx 2>/dev/null || echo "   (no models found)"
