#!/usr/bin/env bash
# generate-keys.sh — Generate RS256 JWT key pair for local development
# Usage: bash services/auth-svc/scripts/generate-keys.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEY_DIR="$SCRIPT_DIR/../.keys"

mkdir -p "$KEY_DIR"

echo "Generating RS256 key pair in $KEY_DIR ..."

# Generate 2048-bit RSA private key
openssl genrsa -out "$KEY_DIR/private.pem" 2048

# Extract public key
openssl rsa -in "$KEY_DIR/private.pem" -pubout -out "$KEY_DIR/public.pem"

# Restrict permissions (owner read-only)
chmod 400 "$KEY_DIR/private.pem"
chmod 444 "$KEY_DIR/public.pem"

echo ""
echo "Keys generated:"
echo "  Private: $KEY_DIR/private.pem"
echo "  Public:  $KEY_DIR/public.pem"
echo ""
echo "Add these to your .env:"
echo "  JWT_PRIVATE_KEY_PATH=.keys/private.pem"
echo "  JWT_PUBLIC_KEY_PATH=.keys/public.pem"
