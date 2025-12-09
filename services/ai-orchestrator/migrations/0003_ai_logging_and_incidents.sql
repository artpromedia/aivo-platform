-- ============================================================================
-- AI Call Logging & Incident Management Schema
-- Migration: 0003_ai_logging_and_incidents.sql
-- 
-- Purpose:
--   Enhances AI call logging with comprehensive metadata and creates an
--   incident management system for safety/compliance events.
--
-- Retention Policy:
--   - ai_call_logs: Detailed records retained for 90 days, then archived/purged
--   - ai_incidents: Retained indefinitely for audit trail
--   - Prompt/response summaries must NOT contain raw PII; only redacted summaries
--
-- Multi-tenancy:
--   All tables are scoped by tenant_id for data isolation
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ────────────────────────────────────────────────────────────────────────────

-- Agent types in the AI orchestrator (must match existing constraint)
DO $$ BEGIN
    CREATE TYPE ai_agent_type AS ENUM (
        'BASELINE',
        'VIRTUAL_BRAIN',
        'LESSON_PLANNER',
        'TUTOR',
        'FOCUS',
        'HOMEWORK_HELPER',
        'PROGRESS',
        'SAFETY'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Safety classification levels from SafetyAgent
DO $$ BEGIN
    CREATE TYPE ai_safety_label AS ENUM (
        'SAFE',      -- No concerns detected
        'LOW',       -- Minor flags, auto-approved
        'MEDIUM',    -- Requires async review
        'HIGH'       -- Blocked, requires immediate review
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Incident severity levels
DO $$ BEGIN
    CREATE TYPE ai_incident_severity AS ENUM (
        'INFO',      -- Informational, no action needed
        'LOW',       -- Minor issue, routine review
        'MEDIUM',    -- Moderate concern, timely review needed
        'HIGH',      -- Serious issue, urgent review
        'CRITICAL'   -- Critical safety/compliance event, immediate action
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Incident categories
DO $$ BEGIN
    CREATE TYPE ai_incident_category AS ENUM (
        'SAFETY',      -- Content safety (harmful, inappropriate)
        'PRIVACY',     -- PII exposure, data leakage
        'COMPLIANCE',  -- Regulatory/policy violations (COPPA, FERPA)
        'PERFORMANCE', -- Model failures, high latency
        'COST'         -- Anomalous usage, budget alerts
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Incident workflow status
DO $$ BEGIN
    CREATE TYPE ai_incident_status AS ENUM (
        'OPEN',          -- New, unreviewed
        'INVESTIGATING', -- Under active review
        'RESOLVED',      -- Issue addressed
        'DISMISSED'      -- False positive or acceptable
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- TABLE: ai_call_logs (Enhanced)
-- 
-- Records every AI/LLM invocation across all agents.
-- Used for cost tracking, safety monitoring, and debugging.
--
-- IMPORTANT: prompt_summary and response_summary must be redacted.
--            Do NOT store raw user input or model output with PII.
-- ────────────────────────────────────────────────────────────────────────────

-- First, add new columns to existing ai_call_logs table
ALTER TABLE ai_call_logs
    ADD COLUMN IF NOT EXISTS user_id UUID NULL,
    ADD COLUMN IF NOT EXISTS learner_id UUID NULL,
    ADD COLUMN IF NOT EXISTS session_id UUID NULL,
    ADD COLUMN IF NOT EXISTS use_case TEXT NULL,
    ADD COLUMN IF NOT EXISTS prompt_summary TEXT NULL,
    ADD COLUMN IF NOT EXISTS response_summary TEXT NULL,
    ADD COLUMN IF NOT EXISTS safety_label TEXT NULL DEFAULT 'SAFE',
    ADD COLUMN IF NOT EXISTS safety_metadata_json JSONB NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS cost_cents_estimate INTEGER NULL DEFAULT 0;

-- Add constraint for safety_label if it doesn't exist
DO $$ BEGIN
    ALTER TABLE ai_call_logs 
        ADD CONSTRAINT ai_call_logs_safety_label_check 
        CHECK (safety_label IN ('SAFE', 'LOW', 'MEDIUM', 'HIGH'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add comments for documentation and retention policy
COMMENT ON TABLE ai_call_logs IS 
'Records every AI/LLM invocation for cost tracking, safety monitoring, and debugging.

RETENTION: 90 days for detailed records. Aggregated metrics retained longer.
PII POLICY: prompt_summary and response_summary must contain ONLY redacted summaries, 
            never raw user input or model output with PII.

Multi-tenant: All queries must filter by tenant_id.';

COMMENT ON COLUMN ai_call_logs.user_id IS 'ID of the user who triggered the call (parent, teacher). Nullable for system-initiated calls.';
COMMENT ON COLUMN ai_call_logs.learner_id IS 'ID of the learner context (if applicable). Nullable for non-learner calls.';
COMMENT ON COLUMN ai_call_logs.session_id IS 'Learning session ID (if within a session context).';
COMMENT ON COLUMN ai_call_logs.use_case IS 'Specific use case identifier (e.g., BASELINE_ITEM_GENERATION, HOMEWORK_STEP_SCAFFOLD)';
COMMENT ON COLUMN ai_call_logs.prompt_summary IS 'Short, REDACTED summary of the prompt. Max 500 chars. NO PII.';
COMMENT ON COLUMN ai_call_logs.response_summary IS 'Short, REDACTED summary of the response. Max 500 chars. NO PII.';
COMMENT ON COLUMN ai_call_logs.safety_label IS 'SafetyAgent classification: SAFE, LOW, MEDIUM, HIGH';
COMMENT ON COLUMN ai_call_logs.safety_metadata_json IS 'Detailed safety analysis: categories triggered, confidence scores, etc.';
COMMENT ON COLUMN ai_call_logs.cost_cents_estimate IS 'Estimated cost in cents (USD) based on token pricing';

-- ────────────────────────────────────────────────────────────────────────────
-- TABLE: ai_incidents
--
-- Represents safety, compliance, or operational incidents that require review.
-- Created automatically by rules or manually by platform admins.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenant isolation
    tenant_id UUID NOT NULL,
    
    -- Classification
    severity TEXT NOT NULL DEFAULT 'MEDIUM',
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN',
    
    -- Description
    title TEXT NOT NULL,
    description TEXT NULL,
    
    -- Temporal tracking (for aggregating related events)
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    occurrence_count INTEGER NOT NULL DEFAULT 1,
    
    -- Creation context
    created_by_system BOOLEAN NOT NULL DEFAULT TRUE,
    created_by_user_id UUID NULL,
    
    -- Assignment
    assigned_to_user_id UUID NULL,
    resolved_at TIMESTAMPTZ NULL,
    resolved_by_user_id UUID NULL,
    resolution_notes TEXT NULL,
    
    -- Flexible metadata
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Audit timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT ai_incidents_severity_check CHECK (severity IN ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    CONSTRAINT ai_incidents_category_check CHECK (category IN ('SAFETY', 'PRIVACY', 'COMPLIANCE', 'PERFORMANCE', 'COST')),
    CONSTRAINT ai_incidents_status_check CHECK (status IN ('OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'))
);

COMMENT ON TABLE ai_incidents IS 
'Safety, compliance, and operational incidents requiring platform admin review.

RETENTION: Indefinite (audit trail).
CREATION: Automatic via rules (SafetyAgent HIGH, cost anomalies) or manual by admins.

Multi-tenant: All queries must filter by tenant_id.
Workflow: OPEN → INVESTIGATING → RESOLVED/DISMISSED';

COMMENT ON COLUMN ai_incidents.severity IS 'Severity level: INFO (FYI), LOW, MEDIUM, HIGH, CRITICAL (immediate action)';
COMMENT ON COLUMN ai_incidents.category IS 'Incident category: SAFETY, PRIVACY, COMPLIANCE, PERFORMANCE, COST';
COMMENT ON COLUMN ai_incidents.first_seen_at IS 'When the first related event occurred';
COMMENT ON COLUMN ai_incidents.last_seen_at IS 'When the most recent related event occurred (for ongoing issues)';
COMMENT ON COLUMN ai_incidents.occurrence_count IS 'Number of related events (for aggregated incidents)';
COMMENT ON COLUMN ai_incidents.created_by_system IS 'TRUE if auto-created by rules, FALSE if manually opened';
COMMENT ON COLUMN ai_incidents.metadata_json IS 'Flexible context: model versions, thresholds, rule IDs, etc.';

-- ────────────────────────────────────────────────────────────────────────────
-- TABLE: ai_incident_ai_calls
--
-- Links incidents to the specific AI calls that contributed to them.
-- An incident may have multiple related calls (e.g., repeated violations).
-- A call may be linked to multiple incidents (different categories).
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_incident_ai_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    incident_id UUID NOT NULL,
    ai_call_log_id UUID NOT NULL,
    
    -- Context for why this call was linked
    link_reason TEXT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Foreign keys
    CONSTRAINT fk_ai_incident_ai_calls_incident 
        FOREIGN KEY (incident_id) 
        REFERENCES ai_incidents(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_ai_incident_ai_calls_call_log 
        FOREIGN KEY (ai_call_log_id) 
        REFERENCES ai_call_logs(id) 
        ON DELETE CASCADE,
    
    -- Prevent duplicate links
    CONSTRAINT uq_ai_incident_ai_calls_unique 
        UNIQUE (incident_id, ai_call_log_id)
);

COMMENT ON TABLE ai_incident_ai_calls IS 
'Links ai_incidents to related ai_call_logs (many-to-many).
Used to trace which AI calls contributed to an incident.';

COMMENT ON COLUMN ai_incident_ai_calls.link_reason IS 'Why this call was linked: TRIGGER (caused incident), RELATED (same pattern), CONTEXT (background)';

-- ────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────────────────────

-- ai_call_logs indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_ai_call_logs_tenant_created 
    ON ai_call_logs(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_call_logs_agent_created 
    ON ai_call_logs(agent_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_call_logs_safety_label 
    ON ai_call_logs(safety_label, created_at DESC) 
    WHERE safety_label IN ('MEDIUM', 'HIGH');

CREATE INDEX IF NOT EXISTS idx_ai_call_logs_learner 
    ON ai_call_logs(learner_id, created_at DESC) 
    WHERE learner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_call_logs_session 
    ON ai_call_logs(session_id) 
    WHERE session_id IS NOT NULL;

-- ai_incidents indexes for dashboard and workflow queries
CREATE INDEX IF NOT EXISTS idx_ai_incidents_tenant_severity_status 
    ON ai_incidents(tenant_id, severity, status);

CREATE INDEX IF NOT EXISTS idx_ai_incidents_category_status 
    ON ai_incidents(category, status);

CREATE INDEX IF NOT EXISTS idx_ai_incidents_assigned 
    ON ai_incidents(assigned_to_user_id, status) 
    WHERE assigned_to_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_incidents_open_critical 
    ON ai_incidents(tenant_id, created_at DESC) 
    WHERE status = 'OPEN' AND severity IN ('HIGH', 'CRITICAL');

CREATE INDEX IF NOT EXISTS idx_ai_incidents_last_seen 
    ON ai_incidents(last_seen_at DESC);

-- ai_incident_ai_calls indexes for efficient joins
CREATE INDEX IF NOT EXISTS idx_ai_incident_ai_calls_incident 
    ON ai_incident_ai_calls(incident_id);

CREATE INDEX IF NOT EXISTS idx_ai_incident_ai_calls_call_log 
    ON ai_incident_ai_calls(ai_call_log_id);

-- ────────────────────────────────────────────────────────────────────────────
-- TRIGGER: auto-update updated_at on ai_incidents
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_ai_incidents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_incidents_updated_at ON ai_incidents;
CREATE TRIGGER trg_ai_incidents_updated_at
    BEFORE UPDATE ON ai_incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_incidents_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- VIEWS: Useful aggregations for dashboards
-- ────────────────────────────────────────────────────────────────────────────

-- View: Open incidents by severity for dashboard widgets
CREATE OR REPLACE VIEW v_open_incidents_summary AS
SELECT 
    tenant_id,
    severity,
    category,
    COUNT(*) as incident_count,
    MIN(first_seen_at) as oldest_first_seen,
    MAX(last_seen_at) as latest_activity
FROM ai_incidents
WHERE status IN ('OPEN', 'INVESTIGATING')
GROUP BY tenant_id, severity, category;

COMMENT ON VIEW v_open_incidents_summary IS 
'Dashboard summary of open/investigating incidents by tenant, severity, and category.';

-- View: Daily AI call stats per tenant
CREATE OR REPLACE VIEW v_daily_ai_call_stats AS
SELECT 
    tenant_id,
    date_trunc('day', created_at)::date as call_date,
    agent_type,
    COUNT(*) as total_calls,
    SUM(tokens_prompt + tokens_completion) as total_tokens,
    SUM(COALESCE(cost_cents_estimate, 0)) as total_cost_cents,
    COUNT(*) FILTER (WHERE safety_label = 'HIGH') as high_safety_count,
    COUNT(*) FILTER (WHERE safety_label = 'MEDIUM') as medium_safety_count,
    AVG(latency_ms) as avg_latency_ms
FROM ai_call_logs
GROUP BY tenant_id, date_trunc('day', created_at)::date, agent_type;

COMMENT ON VIEW v_daily_ai_call_stats IS 
'Daily aggregated AI call statistics per tenant and agent type for cost/usage dashboards.';
