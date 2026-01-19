#!/bin/bash
set -e

echo "Optimizing images..."

# Ensure sharp is installed
if ! pnpm list sharp --depth=0 2>/dev/null | grep -q sharp; then
  echo "Installing sharp..."
  pnpm add -D sharp
fi

# Run the image optimization script
node scripts/optimize-images.mjs

echo "Images optimized successfully"
