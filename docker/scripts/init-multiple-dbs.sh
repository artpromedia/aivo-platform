#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# PostgreSQL Multi-Database Initialization Script
# ══════════════════════════════════════════════════════════════════════════════
# This script runs during the Postgres container initialization to create
# all required databases for AIVO services.
# ══════════════════════════════════════════════════════════════════════════════

set -e
set -u

# Function to create a database if it doesn't exist
function create_database() {
    local database=$1
    echo "Creating database: $database"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
        SELECT 'CREATE DATABASE $database'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$database')\gexec
        GRANT ALL PRIVILEGES ON DATABASE $database TO $POSTGRES_USER;
EOSQL
    echo "Database $database created successfully."
}

# Function to install extensions in a database
function install_extensions() {
    local database=$1
    echo "Installing extensions in database: $database"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$database" <<-EOSQL
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        CREATE EXTENSION IF NOT EXISTS "pgcrypto";
        CREATE EXTENSION IF NOT EXISTS "pg_trgm";
EOSQL
}

echo "══════════════════════════════════════════════════════════════════════════════"
echo " AIVO Platform - PostgreSQL Database Initialization"
echo "══════════════════════════════════════════════════════════════════════════════"

# ══════════════════════════════════════════════════════════════════════════════
# Core Platform Databases
# ══════════════════════════════════════════════════════════════════════════════

# Tier 0 - Core Infrastructure
create_database "aivo_auth"
create_database "aivo_tenant"
create_database "aivo_profile"

# Tier 1 - Content & Learning
create_database "aivo_content"
create_database "aivo_content_authoring"
create_database "aivo_assessment"
create_database "aivo_session"

# Tier 2 - Learning Experience
create_database "aivo_engagement"
create_database "aivo_personalization"
create_database "aivo_learner_model"
create_database "aivo_goal"
create_database "aivo_homework_helper"

# Tier 3 - AI & Orchestration
create_database "aivo_ai_orchestrator"
create_database "aivo_sandbox"

# Tier 4 - Analytics & Reporting
create_database "aivo_analytics"
create_database "aivo_baseline"
create_database "aivo_reports"
create_database "aivo_research"

# Tier 5 - Teacher & Planning
create_database "aivo_teacher_planning"
create_database "aivo_focus"

# Tier 6 - Platform Services
create_database "aivo_billing"
create_database "aivo_payments"
create_database "aivo_messaging"
create_database "aivo_notify"
create_database "aivo_collaboration"

# Tier 7 - Integration & Compliance
create_database "aivo_consent"
create_database "aivo_dsr"
create_database "aivo_retention"
create_database "aivo_integration"
create_database "aivo_lti"
create_database "aivo_sis_sync"

# Tier 8 - Specialized Services
create_database "aivo_marketplace"
create_database "aivo_experimentation"
create_database "aivo_device_mgmt"
create_database "aivo_embedded_tools"

# ══════════════════════════════════════════════════════════════════════════════
# Test Databases (for isolated testing)
# ══════════════════════════════════════════════════════════════════════════════

if [ "${CREATE_TEST_DBS:-false}" = "true" ]; then
    echo ""
    echo "Creating test databases..."
    
    create_database "aivo_auth_test"
    create_database "aivo_tenant_test"
    create_database "aivo_profile_test"
    create_database "aivo_content_test"
    create_database "aivo_assessment_test"
    create_database "aivo_session_test"
    create_database "aivo_ai_orchestrator_test"
    create_database "aivo_analytics_test"
fi

# ══════════════════════════════════════════════════════════════════════════════
# Install Extensions
# ══════════════════════════════════════════════════════════════════════════════

echo ""
echo "Installing PostgreSQL extensions..."

# List of all databases that need extensions
DATABASES=(
    "aivo_auth"
    "aivo_tenant"
    "aivo_profile"
    "aivo_content"
    "aivo_content_authoring"
    "aivo_assessment"
    "aivo_session"
    "aivo_engagement"
    "aivo_personalization"
    "aivo_learner_model"
    "aivo_goal"
    "aivo_homework_helper"
    "aivo_ai_orchestrator"
    "aivo_sandbox"
    "aivo_analytics"
    "aivo_baseline"
    "aivo_reports"
    "aivo_research"
    "aivo_teacher_planning"
    "aivo_focus"
    "aivo_billing"
    "aivo_payments"
    "aivo_messaging"
    "aivo_notify"
    "aivo_collaboration"
    "aivo_consent"
    "aivo_dsr"
    "aivo_retention"
    "aivo_integration"
    "aivo_lti"
    "aivo_sis_sync"
    "aivo_marketplace"
    "aivo_experimentation"
    "aivo_device_mgmt"
    "aivo_embedded_tools"
)

for db in "${DATABASES[@]}"; do
    install_extensions "$db"
done

echo ""
echo "══════════════════════════════════════════════════════════════════════════════"
echo " ✅ Database initialization complete!"
echo " Created ${#DATABASES[@]} databases with extensions."
echo "══════════════════════════════════════════════════════════════════════════════"
