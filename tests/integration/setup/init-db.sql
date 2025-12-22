-- Integration Test Database Initialization
--
-- Creates the necessary databases and extensions for integration testing.
-- This script runs when the PostgreSQL container starts.

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create schemas for multi-tenant isolation
CREATE SCHEMA IF NOT EXISTS tenant_a;
CREATE SCHEMA IF NOT EXISTS tenant_b;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA public TO aivo_test;
GRANT ALL PRIVILEGES ON SCHEMA tenant_a TO aivo_test;
GRANT ALL PRIVILEGES ON SCHEMA tenant_b TO aivo_test;

-- Create test helper functions
CREATE OR REPLACE FUNCTION truncate_all_tables()
RETURNS void AS $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename != '_prisma_migrations'
    LOOP
        EXECUTE 'TRUNCATE TABLE "' || table_name || '" CASCADE';
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to reset sequences
CREATE OR REPLACE FUNCTION reset_all_sequences()
RETURNS void AS $$
DECLARE
    seq_name text;
BEGIN
    FOR seq_name IN
        SELECT sequence_name FROM information_schema.sequences
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE 'ALTER SEQUENCE "' || seq_name || '" RESTART WITH 1';
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'Integration test database initialized successfully';
END $$;
