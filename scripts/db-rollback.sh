#!/bin/bash
set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo -e "${RED}Usage: ./db-rollback.sh <backup-file>${NC}"
    echo ""
    echo "Available backups:"
    ls -la backups/*.sql 2>/dev/null || echo "No backups found in ./backups/"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL environment variable is not set${NC}"
    exit 1
fi

echo -e "${YELLOW}WARNING: This will restore the database from: $BACKUP_FILE${NC}"
echo -e "${RED}All current data will be lost!${NC}"
echo ""
read -p "Are you sure you want to proceed? (yes/no): " CONFIRM

if [ "$CONFIRM" = "yes" ]; then
    echo -e "${YELLOW}Starting rollback...${NC}"
    
    # Create a backup of current state before rollback
    CURRENT_BACKUP="backups/pre-rollback-$(date +%Y%m%d-%H%M%S).sql"
    echo -e "${YELLOW}Creating backup of current state: $CURRENT_BACKUP${NC}"
    pg_dump "$DATABASE_URL" > "$CURRENT_BACKUP"
    
    # Perform the rollback
    echo -e "${YELLOW}Restoring from backup...${NC}"
    psql "$DATABASE_URL" < "$BACKUP_FILE"
    
    echo -e "${GREEN}Rollback completed successfully!${NC}"
    echo -e "${GREEN}Current state backup saved to: $CURRENT_BACKUP${NC}"
else
    echo -e "${YELLOW}Rollback cancelled${NC}"
    exit 0
fi
