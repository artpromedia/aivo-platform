#!/bin/bash
set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Running database migrations...${NC}"

# Check required environment variables
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL environment variable is not set${NC}"
    exit 1
fi

# Create backups directory if it doesn't exist
mkdir -p backups

# Generate backup filename with timestamp
BACKUP_FILE="backups/pre-migration-$(date +%Y%m%d-%H%M%S).sql"

# Check if pg_dump is available
if command -v pg_dump &> /dev/null; then
    echo -e "${YELLOW}Creating backup before migration...${NC}"
    pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
    echo -e "${GREEN}Backup created: $BACKUP_FILE${NC}"
else
    echo -e "${YELLOW}Warning: pg_dump not found, skipping backup${NC}"
fi

# Run Supabase migrations
echo -e "${YELLOW}Running Supabase migrations...${NC}"
if command -v npx &> /dev/null; then
    npx supabase db push
else
    echo -e "${RED}Error: npx not found${NC}"
    exit 1
fi

# Verify migrations
echo -e "${YELLOW}Verifying migrations...${NC}"
npx supabase db diff

echo -e "${GREEN}Migrations completed successfully!${NC}"
