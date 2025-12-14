-- ============================================================================
-- AI Usage Tracking & Virtual Brain Schema
-- Migration: 0004_ai_usage_and_brain.sql
--
-- Purpose:
--   1. Per-tenant AI usage tracking (tokens, costs)
--   2. Virtual Brain skill mastery storage
--   3. Learner activity events for brain updates
--
-- Multi-tenancy:
--   All tables are scoped by tenant_id for data isolation
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- TABLE: ai_usage
--
-- Per-tenant daily token usage aggregation.
-- Used for cost tracking and quota enforcement.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenant isolation
    tenant_id UUID NOT NULL,
    
    -- Aggregation dimensions
    date DATE NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    agent_type TEXT NOT NULL,
    
    -- Usage metrics
    tokens_input BIGINT NOT NULL DEFAULT 0,
    tokens_output BIGINT NOT NULL DEFAULT 0,
    estimated_cost_cents INTEGER NOT NULL DEFAULT 0,
    call_count INTEGER NOT NULL DEFAULT 0,
    
    -- Audit timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Unique constraint for upsert aggregation
    CONSTRAINT uq_ai_usage_daily_aggregate 
        UNIQUE (tenant_id, date, provider, model, agent_type)
);

COMMENT ON TABLE ai_usage IS 
'Daily aggregated AI token usage per tenant/provider/model/agent.

Used for:
- Cost tracking and billing
- Quota enforcement
- Usage dashboards

Aggregation: Upsert on (tenant_id, date, provider, model, agent_type)';

COMMENT ON COLUMN ai_usage.tokens_input IS 'Total input tokens consumed';
COMMENT ON COLUMN ai_usage.tokens_output IS 'Total output tokens generated';
COMMENT ON COLUMN ai_usage.estimated_cost_cents IS 'Estimated cost in cents (USD)';
COMMENT ON COLUMN ai_usage.call_count IS 'Number of API calls';

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_tenant_date 
    ON ai_usage(tenant_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_date_provider 
    ON ai_usage(date, provider);

CREATE INDEX IF NOT EXISTS idx_ai_usage_tenant_agent 
    ON ai_usage(tenant_id, agent_type, date DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- TABLE: learner_skill_mastery
--
-- Virtual Brain skill graph storage.
-- Tracks mastery levels per skill per learner.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS learner_skill_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenant isolation
    tenant_id UUID NOT NULL,
    learner_id UUID NOT NULL,
    
    -- Skill identification
    skill_code TEXT NOT NULL,
    subject TEXT NOT NULL,
    
    -- Mastery metrics (0.0 to 1.0)
    mastery_level NUMERIC(5,4) NOT NULL DEFAULT 0.0,
    confidence NUMERIC(5,4) NOT NULL DEFAULT 0.0,
    
    -- Activity tracking
    attempt_count INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    
    -- Last activity
    last_activity_at TIMESTAMPTZ NULL,
    
    -- Audit timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Unique constraint per learner/skill
    CONSTRAINT uq_learner_skill_mastery 
        UNIQUE (tenant_id, learner_id, skill_code),
    
    -- Mastery level must be between 0 and 1
    CONSTRAINT chk_mastery_level_range 
        CHECK (mastery_level >= 0.0 AND mastery_level <= 1.0),
    
    CONSTRAINT chk_confidence_range 
        CHECK (confidence >= 0.0 AND confidence <= 1.0)
);

COMMENT ON TABLE learner_skill_mastery IS 
'Virtual Brain skill graph - tracks mastery per skill per learner.

Mastery Level:
- 0.0 = No exposure
- 0.0-0.3 = Novice
- 0.3-0.6 = Developing
- 0.6-0.8 = Proficient
- 0.8-1.0 = Mastered

Updated via /internal/ai/brain/update-from-events endpoint.';

COMMENT ON COLUMN learner_skill_mastery.mastery_level IS 'Current mastery (0.0 to 1.0)';
COMMENT ON COLUMN learner_skill_mastery.confidence IS 'Confidence in the mastery estimate (0.0 to 1.0)';
COMMENT ON COLUMN learner_skill_mastery.attempt_count IS 'Total attempts on this skill';
COMMENT ON COLUMN learner_skill_mastery.correct_count IS 'Total correct responses';

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_learner_skill_mastery_learner 
    ON learner_skill_mastery(tenant_id, learner_id);

CREATE INDEX IF NOT EXISTS idx_learner_skill_mastery_subject 
    ON learner_skill_mastery(tenant_id, learner_id, subject);

CREATE INDEX IF NOT EXISTS idx_learner_skill_mastery_low_mastery 
    ON learner_skill_mastery(tenant_id, learner_id, mastery_level) 
    WHERE mastery_level < 0.4;

-- ────────────────────────────────────────────────────────────────────────────
-- TABLE: learner_activity_events
--
-- Raw learning events for Virtual Brain updates.
-- Used by /internal/ai/brain/update-from-events endpoint.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS learner_activity_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenant isolation
    tenant_id UUID NOT NULL,
    learner_id UUID NOT NULL,
    
    -- Event context
    session_id UUID NULL,
    skill_code TEXT NOT NULL,
    subject TEXT NOT NULL,
    
    -- Event data
    event_type TEXT NOT NULL,
    is_correct BOOLEAN NULL,
    time_spent_ms INTEGER NULL,
    difficulty_level INTEGER NULL,
    
    -- Metadata
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Event type validation
    CONSTRAINT chk_event_type 
        CHECK (event_type IN ('ATTEMPT', 'CORRECT', 'INCORRECT', 'SKIP', 'HINT_USED', 'REVIEW'))
);

COMMENT ON TABLE learner_activity_events IS 
'Raw learning events for Virtual Brain processing.

Events are aggregated by /internal/ai/brain/update-from-events.

Retention: Consider partitioning by date for cleanup after processing.';

-- Indexes for efficient aggregation queries
CREATE INDEX IF NOT EXISTS idx_learner_activity_events_learner_time 
    ON learner_activity_events(tenant_id, learner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_learner_activity_events_skill 
    ON learner_activity_events(tenant_id, learner_id, skill_code, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_learner_activity_events_session 
    ON learner_activity_events(session_id) 
    WHERE session_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- TABLE: learner_recommendations
--
-- Structured recommendations generated by Virtual Brain.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS learner_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenant isolation
    tenant_id UUID NOT NULL,
    learner_id UUID NOT NULL,
    
    -- Recommendation type
    recommendation_type TEXT NOT NULL,
    subject TEXT NOT NULL,
    skill_code TEXT NULL,
    
    -- Recommendation values
    from_value NUMERIC(10,4) NULL,
    to_value NUMERIC(10,4) NULL,
    confidence NUMERIC(5,4) NOT NULL DEFAULT 0.5,
    reason TEXT NOT NULL,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'PENDING',
    applied_at TIMESTAMPTZ NULL,
    dismissed_at TIMESTAMPTZ NULL,
    dismissed_by_user_id UUID NULL,
    
    -- Metadata
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Audit timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Recommendation type validation
    CONSTRAINT chk_recommendation_type 
        CHECK (recommendation_type IN ('DIFFICULTY_CHANGE', 'FOCUS_INTERVENTION', 'SKILL_REVIEW', 'MASTERY_ADVANCE')),
    
    -- Status validation
    CONSTRAINT chk_recommendation_status 
        CHECK (status IN ('PENDING', 'APPLIED', 'DISMISSED', 'EXPIRED'))
);

COMMENT ON TABLE learner_recommendations IS 
'Structured recommendations from Virtual Brain.

Types:
- DIFFICULTY_CHANGE: Adjust content difficulty
- FOCUS_INTERVENTION: Recommend focus/attention support
- SKILL_REVIEW: Suggest reviewing a skill
- MASTERY_ADVANCE: Ready for advancement

Status Flow: PENDING → APPLIED/DISMISSED/EXPIRED';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_learner_recommendations_learner 
    ON learner_recommendations(tenant_id, learner_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_learner_recommendations_pending 
    ON learner_recommendations(tenant_id, learner_id) 
    WHERE status = 'PENDING';

-- ────────────────────────────────────────────────────────────────────────────
-- VIEWS: Dashboard aggregations
-- ────────────────────────────────────────────────────────────────────────────

-- View: Daily cost summary by tenant
CREATE OR REPLACE VIEW v_daily_usage_by_tenant AS
SELECT 
    tenant_id,
    date,
    SUM(tokens_input + tokens_output) as total_tokens,
    SUM(estimated_cost_cents) as total_cost_cents,
    SUM(call_count) as total_calls,
    COUNT(DISTINCT provider) as providers_used,
    COUNT(DISTINCT agent_type) as agents_used
FROM ai_usage
GROUP BY tenant_id, date
ORDER BY date DESC, tenant_id;

COMMENT ON VIEW v_daily_usage_by_tenant IS 
'Daily AI usage summary per tenant for billing and dashboards.';

-- View: Learner mastery overview
CREATE OR REPLACE VIEW v_learner_mastery_overview AS
SELECT 
    tenant_id,
    learner_id,
    subject,
    COUNT(*) as skill_count,
    AVG(mastery_level) as avg_mastery,
    MIN(mastery_level) as min_mastery,
    MAX(mastery_level) as max_mastery,
    SUM(attempt_count) as total_attempts,
    COUNT(*) FILTER (WHERE mastery_level >= 0.8) as mastered_skills,
    COUNT(*) FILTER (WHERE mastery_level < 0.4) as struggling_skills
FROM learner_skill_mastery
GROUP BY tenant_id, learner_id, subject;

COMMENT ON VIEW v_learner_mastery_overview IS 
'Aggregated mastery overview per learner per subject.';

-- ────────────────────────────────────────────────────────────────────────────
-- TRIGGERS: Auto-update timestamps
-- ────────────────────────────────────────────────────────────────────────────

-- ai_usage
CREATE OR REPLACE FUNCTION update_ai_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_usage_updated_at ON ai_usage;
CREATE TRIGGER trg_ai_usage_updated_at
    BEFORE UPDATE ON ai_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_usage_updated_at();

-- learner_skill_mastery
CREATE OR REPLACE FUNCTION update_learner_skill_mastery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_learner_skill_mastery_updated_at ON learner_skill_mastery;
CREATE TRIGGER trg_learner_skill_mastery_updated_at
    BEFORE UPDATE ON learner_skill_mastery
    FOR EACH ROW
    EXECUTE FUNCTION update_learner_skill_mastery_updated_at();

-- learner_recommendations
CREATE OR REPLACE FUNCTION update_learner_recommendations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_learner_recommendations_updated_at ON learner_recommendations;
CREATE TRIGGER trg_learner_recommendations_updated_at
    BEFORE UPDATE ON learner_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION update_learner_recommendations_updated_at();
