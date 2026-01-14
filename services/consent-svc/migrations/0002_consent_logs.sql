-- Migration: 0002_consent_logs
-- Description: Enhanced consent logging with full audit trail for COPPA/FERPA compliance
-- Adds consent_logs table for immutable consent event records

-- ================================================================================
-- TYPES
-- ================================================================================

-- Define consent type enum to avoid duplication
DO $$ BEGIN
    CREATE TYPE consent_type_enum AS ENUM (
        'BASELINE_ASSESSMENT',
        'DATA_PROCESSING',
        'RESEARCH',
        'AI_TUTOR',
        'MARKETING',
        'THIRD_PARTY_SHARING'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Define consent source enum to avoid duplication
DO $$ BEGIN
    CREATE TYPE consent_source AS ENUM (
        'MOBILE_PARENT',
        'WEB_PARENT',
        'DISTRICT_PORTAL',
        'API',
        'SYSTEM'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ================================================================================
-- CONSENT LOGS TABLE
-- ================================================================================

CREATE TABLE IF NOT EXISTS consent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    learner_id TEXT NOT NULL,
    parent_user_id TEXT NOT NULL,

    -- Type of consent action
    consent_type consent_type_enum NOT NULL,

    -- Status of consent action (immutable record per action)
    status TEXT NOT NULL CHECK (status IN ('GRANTED', 'REVOKED')),

    -- Where the consent was provided
    source consent_source NOT NULL,
    
    -- Version of the consent text shown to user
    consent_text_version TEXT NOT NULL,
    
    -- Privacy-compliant audit metadata
    ip_address TEXT NULL,
    user_agent TEXT NULL,
    
    -- Additional context (e.g., form fields, checkboxes checked)
    metadata_json JSONB NULL,
    
    -- Immutable timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_consent_logs_tenant_learner 
    ON consent_logs(tenant_id, learner_id);
    
CREATE INDEX IF NOT EXISTS idx_consent_logs_tenant_parent 
    ON consent_logs(tenant_id, parent_user_id);
    
CREATE INDEX IF NOT EXISTS idx_consent_logs_type_status 
    ON consent_logs(consent_type, status);
    
CREATE INDEX IF NOT EXISTS idx_consent_logs_created 
    ON consent_logs(created_at);

-- ================================================================================
-- UPDATE consents TABLE
-- ================================================================================

-- Add new consent types to existing table (using enum defined above)
ALTER TABLE consents DROP CONSTRAINT IF EXISTS consents_consent_type_check;
-- Note: This alter changes type to use the enum - requires migration strategy in production
ALTER TABLE consents ALTER COLUMN consent_type TYPE consent_type_enum USING consent_type::consent_type_enum;

-- Add consent text version tracking
ALTER TABLE consents ADD COLUMN IF NOT EXISTS consent_text_version TEXT NULL;

-- Add source tracking (using enum defined above)
ALTER TABLE consents ADD COLUMN IF NOT EXISTS source consent_source NULL;

-- ================================================================================
-- COMMENTS FOR DOCUMENTATION
-- ================================================================================

COMMENT ON TABLE consent_logs IS 
'Immutable audit log of all consent actions (grants and revocations). Each row represents a single consent event for COPPA/FERPA compliance.';

COMMENT ON COLUMN consent_logs.consent_text_version IS 
'Identifier for the specific version of consent text shown to the user. References external consent text storage.';

COMMENT ON COLUMN consent_logs.ip_address IS 
'IP address at time of consent action. Stored for audit purposes; may be anonymized after retention period.';

COMMENT ON COLUMN consent_logs.source IS 
'The application or portal where consent was collected.';
