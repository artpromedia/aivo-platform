-- Critical Gaps Migration
-- Implements: GDPR Data Deletion, Per-Learner Consent, Real-time Dashboard,
--             Screen Time Enforcement, BrainMemory, Tool Execution Audit

-- ════════════════════════════════════════════════════════════════════════════════
-- CONSENT TEMPLATES (Per-Learner Consent)
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS consent_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    consents TEXT[] NOT NULL DEFAULT '{}',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consent_templates_tenant ON consent_templates(tenant_id);

-- Insert default consent templates
INSERT INTO consent_templates (name, description, consents, is_default) VALUES
('Essential Only', 'Only required consents for platform usage', ARRAY['DATA_PROCESSING'], TRUE),
('Standard', 'Standard learning experience with AI features', ARRAY['DATA_PROCESSING', 'BASELINE_ASSESSMENT', 'AI_TUTOR', 'AI_PERSONALIZATION'], FALSE),
('Full Experience', 'All features including research and data sharing', ARRAY['DATA_PROCESSING', 'BASELINE_ASSESSMENT', 'AI_TUTOR', 'AI_PERSONALIZATION', 'VOICE_RECORDING', 'RESEARCH', 'THIRD_PARTY_SHARING'], FALSE);

-- ════════════════════════════════════════════════════════════════════════════════
-- SCREEN TIME POLICIES
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS screen_time_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    scope VARCHAR(50) NOT NULL CHECK (scope IN ('tenant', 'school', 'class', 'learner')),
    scope_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    daily_limit_minutes INTEGER NOT NULL DEFAULT 120,
    session_limit_minutes INTEGER NOT NULL DEFAULT 45,
    break_after_minutes INTEGER NOT NULL DEFAULT 25,
    break_duration_minutes INTEGER NOT NULL DEFAULT 5,
    schedule JSONB NOT NULL DEFAULT '{}',
    enforcement_level VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (enforcement_level IN ('soft', 'medium', 'strict')),
    warning_thresholds INTEGER[] NOT NULL DEFAULT ARRAY[75, 90, 95],
    exempt_activities TEXT[] NOT NULL DEFAULT '{}',
    created_by UUID NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_screen_time_policies_tenant ON screen_time_policies(tenant_id);
CREATE INDEX idx_screen_time_policies_scope ON screen_time_policies(scope, scope_id);
CREATE INDEX idx_screen_time_policies_active ON screen_time_policies(tenant_id, is_active) WHERE is_active = TRUE;

-- ════════════════════════════════════════════════════════════════════════════════
-- SCREEN TIME EVENTS
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS screen_time_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    learner_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    duration_minutes INTEGER,
    policy_id UUID REFERENCES screen_time_policies(id),
    details JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_screen_time_events_learner ON screen_time_events(tenant_id, learner_id, created_at DESC);
CREATE INDEX idx_screen_time_events_type ON screen_time_events(event_type, created_at DESC);

-- ════════════════════════════════════════════════════════════════════════════════
-- SCREEN TIME OVERRIDES (Parent Overrides)
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS screen_time_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    learner_id UUID NOT NULL,
    parent_id UUID NOT NULL,
    override_type VARCHAR(50) NOT NULL CHECK (override_type IN ('ADD_TIME', 'EXTEND_SESSION', 'BYPASS_LIMIT', 'SKIP_BREAK')),
    additional_minutes INTEGER,
    bypass_until TIMESTAMPTZ,
    reason TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_minutes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_screen_time_overrides_learner ON screen_time_overrides(tenant_id, learner_id, expires_at);

-- ════════════════════════════════════════════════════════════════════════════════
-- EPISODIC MEMORIES (BrainMemory)
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS episodic_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    learner_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    context JSONB NOT NULL DEFAULT '{}',
    emotional_valence DECIMAL(3,2) NOT NULL DEFAULT 0 CHECK (emotional_valence >= -1 AND emotional_valence <= 1),
    importance INTEGER NOT NULL DEFAULT 50 CHECK (importance >= 0 AND importance <= 100),
    retrieval_count INTEGER NOT NULL DEFAULT 0,
    last_retrieved_at TIMESTAMPTZ,
    is_consolidated BOOLEAN NOT NULL DEFAULT FALSE,
    consolidated_at TIMESTAMPTZ,
    associations UUID[] NOT NULL DEFAULT '{}',
    embedding VECTOR(1536), -- For semantic search with pgvector
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_episodic_memories_learner ON episodic_memories(tenant_id, learner_id, timestamp DESC);
CREATE INDEX idx_episodic_memories_importance ON episodic_memories(learner_id, importance DESC) WHERE is_consolidated = FALSE;
CREATE INDEX idx_episodic_memories_event_type ON episodic_memories(learner_id, event_type, timestamp DESC);
CREATE INDEX idx_episodic_memories_context ON episodic_memories USING GIN (context);

-- ════════════════════════════════════════════════════════════════════════════════
-- SEMANTIC FACTS (BrainMemory)
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS semantic_facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    learner_id UUID NOT NULL,
    category VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    predicate VARCHAR(255) NOT NULL,
    object TEXT NOT NULL,
    confidence INTEGER NOT NULL DEFAULT 70 CHECK (confidence >= 0 AND confidence <= 100),
    source VARCHAR(50) NOT NULL,
    last_verified_at TIMESTAMPTZ,
    verification_count INTEGER NOT NULL DEFAULT 0,
    contradictions UUID[] NOT NULL DEFAULT '{}',
    supporting_episodes UUID[] NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_semantic_facts_learner ON semantic_facts(tenant_id, learner_id);
CREATE INDEX idx_semantic_facts_subject ON semantic_facts(learner_id, subject, predicate);
CREATE INDEX idx_semantic_facts_category ON semantic_facts(learner_id, category);
CREATE UNIQUE INDEX idx_semantic_facts_unique ON semantic_facts(tenant_id, learner_id, subject, predicate);

-- ════════════════════════════════════════════════════════════════════════════════
-- TOOL EXECUTION AUDIT
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tool_execution_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(100) NOT NULL,
    tool_id VARCHAR(100) NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    learner_id UUID,
    session_id UUID,
    agent_id VARCHAR(100) NOT NULL,
    autonomy_level VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('EXECUTED', 'DENIED', 'RATE_LIMITED', 'TIMEOUT', 'ERROR')),
    reason TEXT,
    result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tool_audit_tenant ON tool_execution_audit(tenant_id, created_at DESC);
CREATE INDEX idx_tool_audit_user ON tool_execution_audit(user_id, created_at DESC);
CREATE INDEX idx_tool_audit_tool ON tool_execution_audit(tool_id, created_at DESC);
CREATE INDEX idx_tool_audit_action ON tool_execution_audit(action, created_at DESC);

-- ════════════════════════════════════════════════════════════════════════════════
-- LEARNER MONITORING SESSIONS (RealTimeProactiveAgent)
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS learner_monitoring_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    learner_id UUID NOT NULL,
    session_id UUID NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    patterns JSONB NOT NULL DEFAULT '[]',
    intervention_count INTEGER NOT NULL DEFAULT 0,
    avg_focus_score DECIMAL(5,2),
    alerts_count INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_monitoring_sessions_learner ON learner_monitoring_sessions(tenant_id, learner_id, started_at DESC);
CREATE INDEX idx_monitoring_sessions_session ON learner_monitoring_sessions(session_id);

-- ════════════════════════════════════════════════════════════════════════════════
-- GOAL PLANS (GoalPlannerAgent)
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS goal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    learner_id UUID NOT NULL,
    created_by UUID NOT NULL,
    plan_type VARCHAR(50) NOT NULL,
    plan_horizon_days INTEGER NOT NULL,
    goals JSONB NOT NULL DEFAULT '[]',
    weekly_schedule JSONB NOT NULL DEFAULT '{}',
    expected_outcomes JSONB NOT NULL DEFAULT '[]',
    adaptation_triggers JSONB NOT NULL DEFAULT '[]',
    rationale TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_goal_plans_learner ON goal_plans(tenant_id, learner_id, created_at DESC);
CREATE INDEX idx_goal_plans_status ON goal_plans(learner_id, status) WHERE status = 'ACTIVE';

-- ════════════════════════════════════════════════════════════════════════════════
-- DSR DELETION JOBS (GDPR Orchestrator)
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS dsr_deletion_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dsr_request_id UUID NOT NULL REFERENCES dsr_requests(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    learner_id UUID NOT NULL,
    parent_id UUID NOT NULL,
    mode VARCHAR(10) NOT NULL CHECK (mode IN ('SOFT', 'HARD')),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED')),
    steps JSONB NOT NULL DEFAULT '[]',
    total_records_deleted INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dsr_deletion_jobs_request ON dsr_deletion_jobs(dsr_request_id);
CREATE INDEX idx_dsr_deletion_jobs_status ON dsr_deletion_jobs(status, created_at);

-- ════════════════════════════════════════════════════════════════════════════════
-- ADD TRIGGER FOR UPDATED_AT
-- ════════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['consent_templates', 'screen_time_policies', 'semantic_facts', 'goal_plans']
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%s_updated_at ON %s;
            CREATE TRIGGER update_%s_updated_at
            BEFORE UPDATE ON %s
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END $$;

-- ════════════════════════════════════════════════════════════════════════════════
-- COMMENTS FOR DOCUMENTATION
-- ════════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE consent_templates IS 'Pre-defined consent bundles for quick parent setup';
COMMENT ON TABLE screen_time_policies IS 'Configurable screen time limits at tenant/school/class/learner levels';
COMMENT ON TABLE screen_time_events IS 'Event log for screen time tracking and enforcement';
COMMENT ON TABLE screen_time_overrides IS 'Parent-granted temporary overrides to screen time limits';
COMMENT ON TABLE episodic_memories IS 'Event-based memories for the BrainMemory system (what happened)';
COMMENT ON TABLE semantic_facts IS 'Fact-based knowledge for the BrainMemory system (what is known)';
COMMENT ON TABLE tool_execution_audit IS 'Audit log for all AI agent tool executions';
COMMENT ON TABLE learner_monitoring_sessions IS 'Session data from the RealTimeProactiveAgent';
COMMENT ON TABLE goal_plans IS 'AI-generated goal plans from the GoalPlannerAgent';
COMMENT ON TABLE dsr_deletion_jobs IS 'Orchestrated deletion jobs for GDPR compliance';
