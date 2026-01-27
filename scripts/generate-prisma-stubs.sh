#!/bin/bash
# Generate Prisma client stubs for all services that need them

for svc in /home/user/aivo-platform/services/*/; do
  svc_name=$(basename "$svc")
  schema_file="$svc/prisma/schema.prisma"
  stub_dir="$svc/generated/prisma-client"

  # Skip if no schema file exists
  if [ ! -f "$schema_file" ]; then
    continue
  fi

  # Skip if stub already exists and has both files
  if [ -f "$stub_dir/index.js" ] && [ -f "$stub_dir/index.d.ts" ]; then
    continue
  fi

  echo "Processing $svc_name..."
  mkdir -p "$stub_dir"

  # Extract enum names and values from schema
  enums=$(grep -A 20 "^enum " "$schema_file" | awk '
    /^enum / { enum_name=$2; in_enum=1; values=""; next }
    in_enum && /^}/ {
      print enum_name ":" values;
      in_enum=0;
      next
    }
    in_enum && /^  [A-Z_]+/ {
      gsub(/^  /, "");
      gsub(/\/\/.*/, "");
      gsub(/[[:space:]]/, "");
      if (values != "") values = values ",";
      values = values $1
    }
  ')

  # Generate index.js
  cat > "$stub_dir/index.js" << 'EOF'
// Stub Prisma client for build - re-exports from @prisma/client
// This file is auto-generated when prisma generate cannot run
export { PrismaClient, Prisma } from '@prisma/client';

EOF

  # Generate index.d.ts
  cat > "$stub_dir/index.d.ts" << 'EOF'
// Stub Prisma client types for build - re-exports from @prisma/client
// This file is auto-generated when prisma generate cannot run
export { PrismaClient, Prisma } from '@prisma/client';

EOF

  # Add enums to both files
  echo "$enums" | while IFS=':' read -r enum_name values; do
    if [ -n "$enum_name" ] && [ -n "$values" ]; then
      # For index.js - create the enum object
      js_values=$(echo "$values" | sed "s/\([A-Z_]*\)/'\1': '\1'/g" | sed 's/,/, /g')
      echo "export const $enum_name = { $js_values };" >> "$stub_dir/index.js"

      # For index.d.ts - create type and const
      ts_type=$(echo "$values" | sed "s/\([A-Z_]*\)/'\1'/g" | sed 's/,/ | /g')
      ts_const=$(echo "$values" | sed "s/\([A-Z_]*\)/\1: '\1'/g" | sed 's/,/; /g')
      echo "export type $enum_name = $ts_type;" >> "$stub_dir/index.d.ts"
      echo "export declare const $enum_name: { $ts_const; };" >> "$stub_dir/index.d.ts"
    fi
  done

  echo "  Created stub for $svc_name"
done

echo "Done generating Prisma stubs"
