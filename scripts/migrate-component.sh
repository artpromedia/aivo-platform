#!/bin/bash
# Component Migration Script for AIVO Platform
# Usage: ./migrate-component.sh ComponentName legacy-path new-path

set -e

COMPONENT_NAME=$1
LEGACY_PATH=$2
NEW_PATH=$3

if [ -z "$COMPONENT_NAME" ] || [ -z "$LEGACY_PATH" ] || [ -z "$NEW_PATH" ]; then
    echo "Usage: ./migrate-component.sh ComponentName legacy-path new-path"
    echo "Example: ./migrate-component.sh GamePicker apps/web-learner/app/(learning)/games packages/ui/src/components/GamePicker"
    exit 1
fi

echo "Migrating $COMPONENT_NAME..."
echo "From: $LEGACY_PATH"
echo "To: $NEW_PATH"

# Create target directory
mkdir -p "$NEW_PATH"

# Copy component files
if [ -d "$LEGACY_PATH" ]; then
    cp -r "$LEGACY_PATH"/* "$NEW_PATH/" 2>/dev/null || true
elif [ -f "$LEGACY_PATH" ]; then
    cp "$LEGACY_PATH" "$NEW_PATH/"
else
    echo "Warning: Source path not found: $LEGACY_PATH"
fi

# Find and update imports in copied files
echo "Updating imports..."
find "$NEW_PATH" -type f \( -name "*.tsx" -o -name "*.ts" \) | while read file; do
    # Add 'use client' directive if not present
    if ! grep -q "'use client'" "$file"; then
        if grep -qE "useState|useEffect|useRef|useCallback" "$file"; then
            sed -i '1s/^/'"'"'use client'"'"';\n\n/' "$file" 2>/dev/null || true
        fi
    fi

    # Update path aliases
    sed -i 's|@/components|@aivo/ui/components|g' "$file" 2>/dev/null || true
    sed -i 's|@/hooks|@aivo/ui/hooks|g' "$file" 2>/dev/null || true
    sed -i 's|@/utils|@aivo/ui/utils|g' "$file" 2>/dev/null || true

    # Update relative imports to package imports where applicable
    sed -i "s|from '\.\./\.\./\.\./lib/|from '@aivo/ui/utils/|g" "$file" 2>/dev/null || true

    echo "  Updated: $file"
done

echo "Migration complete for $COMPONENT_NAME"
echo "Please review the files in: $NEW_PATH"
echo ""
echo "Next steps:"
echo "1. Update component types in $NEW_PATH/types.ts"
echo "2. Create Storybook story in $NEW_PATH/$COMPONENT_NAME.stories.tsx"
echo "3. Add tests in $NEW_PATH/$COMPONENT_NAME.test.tsx"
echo "4. Export from packages/ui/src/components/index.ts"
