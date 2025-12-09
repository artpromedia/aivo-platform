-- Migration: 0002_retention_enhancements
-- Description: Enhanced retention policies with more data types and tenant configuration

-- ════════════════════════════════════════════════════════════════════════════════
-- UPDATE RESOURCE TYPES
-- ════════════════════════════════════════════════════════════════════════════════

-- Drop and recreate check constraint with more resource types
ALTER TABLE retention_policies DROP CONSTRAINT IF EXISTS retention_policies_resource_type_check;
ALTER TABLE retention_policies ADD CONSTRAINT retention_policies_resource_type_check 
    CHECK (resource_type IN (
        'SESSION_EVENTS',
        'AI_CALL_LOGS',
        'AI_INCIDENTS',
        'HOMEWORK_UPLOADS',
        'BASELINE_ATTEMPTS',
        'PROGRESS_NOTES',
        'DSR_ARTIFACTS',
        'CONSENT_LOGS',
        'AUDIT_LOGS'
    ));

-- Add enabled flag for policies
ALTER TABLE retention_policies ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT true;

-- Add policy description
ALTER TABLE retention_policies ADD COLUMN IF NOT EXISTS description TEXT NULL;

-- Add action type (what to do when retention expires)
ALTER TABLE retention_policies ADD COLUMN IF NOT EXISTS action_type TEXT NOT NULL DEFAULT 'DELETE'
    CHECK (action_type IN ('DELETE', 'ANONYMIZE', 'ARCHIVE'));

-- Add unique constraint per tenant/resource combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_retention_policies_unique 
    ON retention_policies(COALESCE(tenant_id, ''), resource_type);

-- ════════════════════════════════════════════════════════════════════════════════
-- RETENTION JOB RUNS TABLE
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS retention_job_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES retention_policies(id) ON DELETE CASCADE,
    tenant_id TEXT NULL,
    resource_type TEXT NOT NULL,
    
    -- Job execution
    status TEXT NOT NULL CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')) DEFAULT 'RUNNING',
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ NULL,
    
    -- Results
    records_processed INTEGER NOT NULL DEFAULT 0,
    records_deleted INTEGER NOT NULL DEFAULT 0,
    records_anonymized INTEGER NOT NULL DEFAULT 0,
    records_archived INTEGER NOT NULL DEFAULT 0,
    records_failed INTEGER NOT NULL DEFAULT 0,
    
    -- Error tracking
    error_message TEXT NULL,
    
    -- Metadata
    dry_run BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_retention_job_runs_policy 
    ON retention_job_runs(policy_id);

CREATE INDEX IF NOT EXISTS idx_retention_job_runs_started 
    ON retention_job_runs(started_at);

-- ════════════════════════════════════════════════════════════════════════════════
-- SEED UPDATED DEFAULT POLICIES
-- ════════════════════════════════════════════════════════════════════════════════

-- Update existing policies to new resource type names
UPDATE retention_policies SET resource_type = 'SESSION_EVENTS' WHERE resource_type = 'EVENT';
UPDATE retention_policies SET resource_type = 'AI_INCIDENTS' WHERE resource_type = 'AI_INCIDENT';
UPDATE retention_policies SET resource_type = 'HOMEWORK_UPLOADS' WHERE resource_type = 'HOMEWORK_UPLOAD';

-- Insert new default policies if they don't exist
INSERT INTO retention_policies (tenant_id, resource_type, retention_days, action_type, description, config_json)
VALUES
    (NULL, 'AI_CALL_LOGS', 365, 'ANONYMIZE', 'AI call logs anonymized after 1 year', '{}'::jsonb),
    (NULL, 'BASELINE_ATTEMPTS', 2555, 'ARCHIVE', 'Baseline assessments archived after 7 years', '{}'::jsonb),
    (NULL, 'PROGRESS_NOTES', 730, 'DELETE', 'Progress notes deleted after 2 years', '{}'::jsonb),
    (NULL, 'DSR_ARTIFACTS', 30, 'DELETE', 'DSR export files deleted after 30 days', '{}'::jsonb),
    (NULL, 'CONSENT_LOGS', 2555, 'ARCHIVE', 'Consent logs archived after 7 years (compliance)', '{}'::jsonb),
    (NULL, 'AUDIT_LOGS', 2555, 'ARCHIVE', 'Audit logs archived after 7 years', '{}'::jsonb)
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ════════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE retention_policies IS 
'Configurable data retention policies per tenant or globally. Tenant-specific policies override global defaults.';

COMMENT ON COLUMN retention_policies.action_type IS 
'What action to take when data exceeds retention: DELETE removes data, ANONYMIZE removes PII but keeps aggregates, ARCHIVE moves to cold storage.';

COMMENT ON TABLE retention_job_runs IS 
'Audit log of retention job executions. Tracks what was processed/deleted for compliance reporting.';
