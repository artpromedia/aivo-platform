-- RLHF Fine-Tuning Module Database Schema
-- Provides tables for fine-tuning job management and model versioning

-- ============================================================================
-- Fine-Tuning Jobs
-- ============================================================================

-- Track fine-tuning jobs submitted to providers
CREATE TABLE IF NOT EXISTS fine_tuning_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Provider info
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('openai', 'anthropic')),
    provider_job_id VARCHAR(200),
    base_model VARCHAR(100) NOT NULL,
    fine_tuned_model VARCHAR(200),

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'validating', 'queued', 'running', 'succeeded', 'failed', 'cancelled')),

    -- File references
    training_file_id VARCHAR(200),
    validation_file_id VARCHAR(200),

    -- Training data info
    training_example_count INTEGER NOT NULL DEFAULT 0,
    validation_example_count INTEGER NOT NULL DEFAULT 0,

    -- Configuration
    hyperparameters JSONB NOT NULL DEFAULT '{}',

    -- Results
    metrics JSONB,
    error TEXT,

    -- Metadata
    metadata JSONB NOT NULL DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fine_tuning_jobs_status ON fine_tuning_jobs(status);
CREATE INDEX IF NOT EXISTS idx_fine_tuning_jobs_provider ON fine_tuning_jobs(provider);
CREATE INDEX IF NOT EXISTS idx_fine_tuning_jobs_created ON fine_tuning_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fine_tuning_jobs_provider_job ON fine_tuning_jobs(provider_job_id) WHERE provider_job_id IS NOT NULL;

-- ============================================================================
-- Fine-Tuned Models
-- ============================================================================

-- Track deployed fine-tuned models
CREATE TABLE IF NOT EXISTS fine_tuned_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Provider info
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('openai', 'anthropic')),
    provider_model_id VARCHAR(200) NOT NULL,
    base_model VARCHAR(100) NOT NULL,

    -- Model identification
    display_name VARCHAR(200) NOT NULL,
    description TEXT,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'deprecated', 'deleted')),

    -- Source job
    job_id UUID NOT NULL REFERENCES fine_tuning_jobs(id),
    training_examples INTEGER NOT NULL,

    -- Performance metrics from training
    metrics JSONB,

    -- Deployment info
    deployed_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB NOT NULL DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fine_tuned_models_status ON fine_tuned_models(status);
CREATE INDEX IF NOT EXISTS idx_fine_tuned_models_provider ON fine_tuned_models(provider);
CREATE INDEX IF NOT EXISTS idx_fine_tuned_models_job ON fine_tuned_models(job_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fine_tuned_models_provider_id ON fine_tuned_models(provider_model_id);

-- ============================================================================
-- Model Usage Tracking
-- ============================================================================

-- Track usage of fine-tuned models for A/B testing
CREATE TABLE IF NOT EXISTS fine_tuned_model_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES fine_tuned_models(id),
    action_id UUID REFERENCES tracked_ai_actions(id),

    -- Request info
    request_type VARCHAR(50) NOT NULL,
    agent_type VARCHAR(50),

    -- Performance
    latency_ms INTEGER,
    tokens_used INTEGER,

    -- Outcome (if available)
    was_successful BOOLEAN,
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_usage_model ON fine_tuned_model_usage(model_id);
CREATE INDEX IF NOT EXISTS idx_model_usage_created ON fine_tuned_model_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_usage_action ON fine_tuned_model_usage(action_id) WHERE action_id IS NOT NULL;

-- ============================================================================
-- Model Comparison Experiments
-- ============================================================================

-- A/B test experiments comparing models
CREATE TABLE IF NOT EXISTS model_comparison_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,

    -- Configuration
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled')),

    -- Models being compared
    baseline_model VARCHAR(200) NOT NULL,
    challenger_model_id UUID REFERENCES fine_tuned_models(id),

    -- Traffic split
    challenger_traffic_percent DECIMAL(5,2) NOT NULL DEFAULT 50.0,

    -- Targeting
    target_agent_types VARCHAR(50)[],
    target_request_types VARCHAR(50)[],

    -- Sample size requirements
    min_samples_per_variant INTEGER NOT NULL DEFAULT 100,

    -- Results
    baseline_metrics JSONB,
    challenger_metrics JSONB,
    winner VARCHAR(20),
    statistical_significance DECIMAL(5,4),

    -- Timing
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_experiments_status ON model_comparison_experiments(status);
CREATE INDEX IF NOT EXISTS idx_model_experiments_challenger ON model_comparison_experiments(challenger_model_id);

-- ============================================================================
-- Views
-- ============================================================================

-- Job summary view
CREATE OR REPLACE VIEW v_fine_tuning_job_summary AS
SELECT
    j.id,
    j.provider,
    j.base_model,
    j.fine_tuned_model,
    j.status,
    j.training_example_count,
    j.validation_example_count,
    j.metrics,
    j.error,
    j.created_at,
    j.started_at,
    j.completed_at,
    EXTRACT(EPOCH FROM (COALESCE(j.completed_at, NOW()) - j.started_at)) / 60 as duration_minutes,
    m.id as deployed_model_id,
    m.display_name as deployed_model_name
FROM fine_tuning_jobs j
LEFT JOIN fine_tuned_models m ON m.job_id = j.id AND m.status = 'active';

-- Model performance view
CREATE OR REPLACE VIEW v_model_performance AS
SELECT
    m.id as model_id,
    m.display_name,
    m.provider,
    m.base_model,
    m.status,
    COUNT(u.id) as total_uses,
    AVG(u.latency_ms) as avg_latency_ms,
    SUM(u.tokens_used) as total_tokens,
    AVG(CASE WHEN u.was_successful THEN 1.0 ELSE 0.0 END) as success_rate,
    AVG(u.user_rating) as avg_rating,
    m.deployed_at,
    MAX(u.created_at) as last_used_at
FROM fine_tuned_models m
LEFT JOIN fine_tuned_model_usage u ON u.model_id = m.id
GROUP BY m.id, m.display_name, m.provider, m.base_model, m.status, m.deployed_at;

-- Active experiments view
CREATE OR REPLACE VIEW v_active_model_experiments AS
SELECT
    e.id,
    e.name,
    e.status,
    e.baseline_model,
    m.display_name as challenger_model_name,
    e.challenger_traffic_percent,
    (
        SELECT COUNT(*)
        FROM fine_tuned_model_usage u
        WHERE u.model_id = e.challenger_model_id
          AND u.created_at >= e.started_at
    ) as challenger_samples,
    e.started_at,
    EXTRACT(DAY FROM (NOW() - e.started_at)) as days_running
FROM model_comparison_experiments e
JOIN fine_tuned_models m ON m.id = e.challenger_model_id
WHERE e.status = 'running';

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to calculate model effectiveness
CREATE OR REPLACE FUNCTION calculate_model_effectiveness(p_model_id UUID)
RETURNS TABLE (
    total_uses INTEGER,
    success_rate DECIMAL(5,4),
    avg_rating DECIMAL(3,2),
    avg_latency_ms INTEGER,
    effectiveness_score DECIMAL(5,4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_uses,
        AVG(CASE WHEN was_successful THEN 1.0 ELSE 0.0 END)::DECIMAL(5,4) as success_rate,
        AVG(user_rating)::DECIMAL(3,2) as avg_rating,
        AVG(latency_ms)::INTEGER as avg_latency_ms,
        (
            COALESCE(AVG(CASE WHEN was_successful THEN 1.0 ELSE 0.0 END), 0) * 0.5 +
            COALESCE(AVG(user_rating) / 5.0, 0) * 0.3 +
            CASE
                WHEN AVG(latency_ms) IS NULL THEN 0.2
                WHEN AVG(latency_ms) < 500 THEN 0.2
                WHEN AVG(latency_ms) < 1000 THEN 0.15
                WHEN AVG(latency_ms) < 2000 THEN 0.1
                ELSE 0.05
            END
        )::DECIMAL(5,4) as effectiveness_score
    FROM fine_tuned_model_usage
    WHERE model_id = p_model_id;
END;
$$ LANGUAGE plpgsql;

-- Function to select model for request (with traffic routing)
CREATE OR REPLACE FUNCTION select_model_for_request(
    p_agent_type VARCHAR(50),
    p_request_type VARCHAR(50)
) RETURNS TABLE (
    model_id UUID,
    model_name VARCHAR(200),
    is_challenger BOOLEAN
) AS $$
DECLARE
    v_experiment RECORD;
    v_random DECIMAL;
BEGIN
    -- Check for active experiment
    SELECT e.*, m.provider_model_id, m.display_name
    INTO v_experiment
    FROM model_comparison_experiments e
    JOIN fine_tuned_models m ON m.id = e.challenger_model_id
    WHERE e.status = 'running'
      AND (e.target_agent_types IS NULL OR p_agent_type = ANY(e.target_agent_types))
      AND (e.target_request_types IS NULL OR p_request_type = ANY(e.target_request_types))
    ORDER BY e.started_at DESC
    LIMIT 1;

    IF v_experiment IS NOT NULL THEN
        -- Use traffic split to decide
        v_random := random() * 100;

        IF v_random < v_experiment.challenger_traffic_percent THEN
            -- Use challenger model
            RETURN QUERY
            SELECT
                v_experiment.challenger_model_id,
                v_experiment.display_name,
                true;
        ELSE
            -- Use baseline (return null model_id to indicate use baseline)
            RETURN QUERY
            SELECT
                NULL::UUID,
                v_experiment.baseline_model::VARCHAR(200),
                false;
        END IF;
    ELSE
        -- No experiment, return active fine-tuned model if available
        RETURN QUERY
        SELECT
            m.id,
            m.display_name,
            false
        FROM fine_tuned_models m
        WHERE m.status = 'active'
        ORDER BY m.deployed_at DESC
        LIMIT 1;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Trigger to update model usage stats
CREATE OR REPLACE FUNCTION update_model_usage_stats() RETURNS TRIGGER AS $$
BEGIN
    -- Could update aggregate stats in redis or a summary table
    -- For now, just ensure the model exists
    IF NEW.model_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM fine_tuned_models WHERE id = NEW.model_id) THEN
            RAISE EXCEPTION 'Model % does not exist', NEW.model_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_model_usage
BEFORE INSERT ON fine_tuned_model_usage
FOR EACH ROW
EXECUTE FUNCTION update_model_usage_stats();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE fine_tuning_jobs IS 'Tracks fine-tuning jobs submitted to ML providers';
COMMENT ON TABLE fine_tuned_models IS 'Registry of deployed fine-tuned models';
COMMENT ON TABLE fine_tuned_model_usage IS 'Usage tracking for fine-tuned models';
COMMENT ON TABLE model_comparison_experiments IS 'A/B test experiments comparing base vs fine-tuned models';
