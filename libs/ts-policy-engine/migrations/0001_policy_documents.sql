-- Migration: 0001_policy_documents
-- Description: Policy engine tables for global and tenant-specific configuration

-- ════════════════════════════════════════════════════════════════════════════════
-- POLICY DOCUMENTS TABLE
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS policy_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Scope: GLOBAL (platform-wide) or TENANT (per-tenant override)
    scope_type TEXT NOT NULL CHECK (scope_type IN ('GLOBAL', 'TENANT')),
    
    -- Tenant ID (required for TENANT scope, NULL for GLOBAL)
    tenant_id UUID NULL,
    
    -- Version number (auto-incremented per scope/tenant combination)
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Human-readable name for this policy version
    name TEXT NOT NULL,
    
    -- Only one active policy per scope/tenant combination
    is_active BOOLEAN NOT NULL DEFAULT false,
    
    -- The actual policy configuration (JSONB for flexibility)
    policy_json JSONB NOT NULL,
    
    -- Optional description of changes in this version
    description TEXT NULL,
    
    -- Who created this policy version
    created_by_user_id TEXT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT policy_documents_tenant_check 
        CHECK (
            (scope_type = 'GLOBAL' AND tenant_id IS NULL) OR
            (scope_type = 'TENANT' AND tenant_id IS NOT NULL)
        )
);

-- Unique constraint: only one active GLOBAL policy
CREATE UNIQUE INDEX IF NOT EXISTS idx_policy_documents_active_global 
    ON policy_documents(scope_type) 
    WHERE scope_type = 'GLOBAL' AND is_active = true;

-- Unique constraint: only one active TENANT policy per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_policy_documents_active_tenant 
    ON policy_documents(tenant_id) 
    WHERE scope_type = 'TENANT' AND is_active = true;

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_policy_documents_scope 
    ON policy_documents(scope_type, is_active);

CREATE INDEX IF NOT EXISTS idx_policy_documents_tenant 
    ON policy_documents(tenant_id, is_active) 
    WHERE tenant_id IS NOT NULL;

-- Index for version history queries
CREATE INDEX IF NOT EXISTS idx_policy_documents_version_history 
    ON policy_documents(scope_type, tenant_id, version DESC);

-- ════════════════════════════════════════════════════════════════════════════════
-- POLICY AUDIT LOG
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS policy_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference to the policy document
    policy_document_id UUID NOT NULL REFERENCES policy_documents(id) ON DELETE CASCADE,
    
    -- Action performed
    action TEXT NOT NULL CHECK (action IN ('CREATED', 'ACTIVATED', 'DEACTIVATED', 'UPDATED')),
    
    -- Who performed the action
    performed_by_user_id TEXT NULL,
    
    -- Previous values (for UPDATED actions)
    previous_values JSONB NULL,
    
    -- New values (for UPDATED actions)
    new_values JSONB NULL,
    
    -- Additional context
    reason TEXT NULL,
    
    -- When the action occurred
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_policy_audit_logs_document 
    ON policy_audit_logs(policy_document_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_policy_audit_logs_user 
    ON policy_audit_logs(performed_by_user_id, created_at DESC);

-- ════════════════════════════════════════════════════════════════════════════════
-- DEFAULT GLOBAL POLICY
-- ════════════════════════════════════════════════════════════════════════════════

-- Insert default global policy if none exists
INSERT INTO policy_documents (
    scope_type,
    tenant_id,
    version,
    name,
    is_active,
    policy_json,
    description,
    created_by_user_id
)
SELECT 
    'GLOBAL',
    NULL,
    1,
    'default_global_policy_v1',
    true,
    '{
        "safety": {
            "min_severity_for_incident": "MEDIUM",
            "blocked_content_action": "FALLBACK",
            "log_all_evaluations": false,
            "coppa_strict_mode": true,
            "additional_blocked_keywords": []
        },
        "ai": {
            "allowed_providers": ["OPENAI", "ANTHROPIC"],
            "allowed_models": ["gpt-4o", "gpt-4o-mini", "claude-3-5-sonnet-20241022"],
            "max_tokens_per_call": 4096,
            "max_latency_ms": 30000,
            "fallback_provider": null,
            "enable_caching": true,
            "cache_ttl_seconds": 300,
            "rate_limit_per_minute": 1000,
            "temperature_override": null
        },
        "retention": {
            "ai_call_logs_days": 365,
            "session_events_days": 365,
            "homework_uploads_days": 730,
            "consent_logs_days": 2555,
            "ai_incidents_days": 365,
            "dsr_exports_days": 30,
            "prefer_soft_delete": true
        },
        "features": {
            "ai_homework_helper_enabled": true,
            "ai_lesson_planning_enabled": true,
            "ai_assessment_builder_enabled": false,
            "ai_tutor_enabled": true,
            "baseline_assessments_enabled": true,
            "progress_tracking_enabled": true,
            "parent_portal_enabled": true
        }
    }'::jsonb,
    'Initial default global policy with standard settings',
    NULL
WHERE NOT EXISTS (
    SELECT 1 FROM policy_documents WHERE scope_type = 'GLOBAL' AND is_active = true
);

-- ════════════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ════════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE policy_documents IS 
'Stores versioned policy configurations for global platform defaults and tenant-specific overrides. Only one active policy per scope/tenant.';

COMMENT ON COLUMN policy_documents.scope_type IS 
'GLOBAL = platform-wide default, TENANT = per-tenant override';

COMMENT ON COLUMN policy_documents.policy_json IS 
'JSONB containing safety, ai, retention, and features configuration. GLOBAL documents must be complete; TENANT documents can be partial overrides.';

COMMENT ON TABLE policy_audit_logs IS 
'Audit trail for all policy changes. Used for compliance and debugging.';
