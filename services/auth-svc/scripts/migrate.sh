#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# AIVO Auth Service - Database Migration Script
# ══════════════════════════════════════════════════════════════════════════════
#
# Usage: ./scripts/migrate.sh [dev|deploy|reset|status|create|diff]
#
# Commands:
#   dev     - Run development migration (creates migration if schema changed)
#   deploy  - Run production migration (applies pending migrations)
#   reset   - Reset database (DESTRUCTIVE - dev only)
#   status  - Show migration status
#   create  - Create a new migration without applying
#   diff    - Show SQL diff between schema and database
#
# ══════════════════════════════════════════════════════════════════════════════

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

print_header() {
    echo -e "${BLUE}══════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  AIVO Auth Service - Database Migration${NC}"
    echo -e "${BLUE}══════════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

check_env() {
    if [ -z "$DATABASE_URL" ]; then
        if [ -f ".env" ]; then
            export $(grep -v '^#' .env | xargs)
        fi
    fi
    
    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL is not set"
        echo "Please set DATABASE_URL in your environment or .env file"
        exit 1
    fi
}

case "$1" in
    dev)
        print_header
        check_env
        print_info "Running development migration..."
        echo ""
        
        if [ -n "$2" ]; then
            npx prisma migrate dev --name "$2"
        else
            npx prisma migrate dev
        fi
        
        echo ""
        print_success "Development migration completed"
        print_info "Generating Prisma client..."
        npx prisma generate
        ;;
        
    deploy)
        print_header
        check_env
        print_info "Running production migration..."
        echo ""
        
        # Check migration status first
        npx prisma migrate status
        
        echo ""
        print_warning "This will apply pending migrations to the database"
        read -p "Continue? (y/N) " confirm
        
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            npx prisma migrate deploy
            echo ""
            print_success "Production migration completed"
        else
            print_info "Migration cancelled"
        fi
        ;;
        
    reset)
        print_header
        check_env
        
        if [ "$NODE_ENV" = "production" ]; then
            print_error "Cannot reset production database!"
            exit 1
        fi
        
        print_warning "This will DESTROY all data in the database!"
        print_warning "Database: $DATABASE_URL"
        echo ""
        read -p "Are you absolutely sure? Type 'RESET' to confirm: " confirm
        
        if [ "$confirm" = "RESET" ]; then
            npx prisma migrate reset --force
            echo ""
            print_success "Database reset completed"
        else
            print_info "Reset cancelled"
        fi
        ;;
        
    status)
        print_header
        check_env
        print_info "Checking migration status..."
        echo ""
        npx prisma migrate status
        ;;
        
    create)
        print_header
        check_env
        
        if [ -z "$2" ]; then
            print_error "Migration name required"
            echo "Usage: $0 create <migration_name>"
            echo "Example: $0 create add_user_mfa_settings"
            exit 1
        fi
        
        print_info "Creating migration: $2"
        echo ""
        npx prisma migrate dev --name "$2" --create-only
        echo ""
        print_success "Migration created (not applied)"
        print_info "Review the migration SQL in prisma/migrations/"
        print_info "Run '$0 dev' to apply the migration"
        ;;
        
    diff)
        print_header
        check_env
        print_info "Generating schema diff..."
        echo ""
        npx prisma migrate diff \
            --from-schema-datamodel prisma/schema.prisma \
            --to-schema-datasource prisma/schema.prisma \
            --script
        ;;
        
    generate)
        print_header
        print_info "Generating Prisma client..."
        npx prisma generate
        print_success "Prisma client generated"
        ;;
        
    studio)
        print_header
        check_env
        print_info "Opening Prisma Studio..."
        npx prisma studio
        ;;
        
    seed)
        print_header
        check_env
        print_info "Running database seed..."
        npx prisma db seed
        print_success "Database seeded"
        ;;
        
    *)
        echo "Usage: $0 {dev|deploy|reset|status|create|diff|generate|studio|seed}"
        echo ""
        echo "Commands:"
        echo "  dev [name]  - Run development migration (optionally with name)"
        echo "  deploy      - Run production migration"
        echo "  reset       - Reset database (DESTRUCTIVE)"
        echo "  status      - Show migration status"
        echo "  create name - Create migration without applying"
        echo "  diff        - Show SQL diff"
        echo "  generate    - Generate Prisma client"
        echo "  studio      - Open Prisma Studio"
        echo "  seed        - Run database seed"
        exit 1
        ;;
esac
