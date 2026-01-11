-- Self-Learning Module Database Schema
-- Provides tables for outcome tracking, prompt optimization, and learning signal processing

-- ============================================================================
-- Outcome Tracking Tables
-- ============================================================================

-- Track all AI-generated actions and recommendations
CREATE TABLE IF NOT EXISTS tracked_ai_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    agent_type VARCHAR(50) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    action_category VARCHAR(50) NOT NULL,

    -- Action details
    input_context JSONB NOT NULL DEFAULT '{}',
    recommendation JSONB NOT NULL,
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    reasoning TEXT,

    -- Execution tracking
    was_executed BOOLEAN DEFAULT FALSE,
    execution_result JSONB,
    execution_error TEXT,

    -- Feedback tracking
    feedback_received BOOLEAN DEFAULT FALSE,
    was_accepted BOOLEAN,
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    user_modification JSONB,
    feedback_text TEXT,

    -- Outcome tracking
    outcome_measured BOOLEAN DEFAULT FALSE,
    measured_impact JSONB,

    -- Metadata
    session_id UUID,
    prompt_template_id UUID,
    experiment_variant_id UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    feedback_at TIMESTAMPTZ,
    outcome_at TIMESTAMPTZ,

    -- Indexes for common queries
    CONSTRAINT valid_rating CHECK (user_rating IS NULL OR (user_rating >= 1 AND user_rating <= 5))
);

CREATE INDEX IF NOT EXISTS idx_tracked_actions_learner ON tracked_ai_actions(learner_id);
CREATE INDEX IF NOT EXISTS idx_tracked_actions_agent ON tracked_ai_actions(agent_type);
CREATE INDEX IF NOT EXISTS idx_tracked_actions_category ON tracked_ai_actions(action_category);
CREATE INDEX IF NOT EXISTS idx_tracked_actions_created ON tracked_ai_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracked_actions_feedback ON tracked_ai_actions(feedback_received, was_accepted);
CREATE INDEX IF NOT EXISTS idx_tracked_actions_prompt ON tracked_ai_actions(prompt_template_id) WHERE prompt_template_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tracked_actions_experiment ON tracked_ai_actions(experiment_variant_id) WHERE experiment_variant_id IS NOT NULL;

-- ============================================================================
-- Prompt Optimization Tables
-- ============================================================================

-- Prompt templates with versioning
CREATE TABLE IF NOT EXISTS prompt_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    agent_type VARCHAR(50),

    -- Template content
    template TEXT NOT NULL,
    variables JSONB NOT NULL DEFAULT '[]',

    -- Version tracking
    version INTEGER NOT NULL DEFAULT 1,
    parent_version_id UUID REFERENCES prompt_templates(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,

    -- Performance metrics (aggregated)
    total_uses INTEGER NOT NULL DEFAULT 0,
    success_rate DECIMAL(5,4),
    avg_rating DECIMAL(3,2),
    avg_latency_ms INTEGER,

    -- Metadata
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(name, version)
);

CREATE INDEX IF NOT EXISTS idx_prompt_templates_category ON prompt_templates(category);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_agent ON prompt_templates(agent_type) WHERE agent_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prompt_templates_active ON prompt_templates(is_active, is_default);

-- A/B test experiments for prompts
CREATE TABLE IF NOT EXISTS prompt_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,

    -- Experiment configuration
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled')),
    hypothesis TEXT,

    -- Targeting
    target_agent_type VARCHAR(50),
    target_category VARCHAR(100),
    traffic_percentage DECIMAL(5,2) NOT NULL DEFAULT 100.0,

    -- Variants stored as JSONB array
    variants JSONB NOT NULL DEFAULT '[]',

    -- Statistical configuration
    min_sample_size INTEGER NOT NULL DEFAULT 100,
    confidence_level DECIMAL(3,2) NOT NULL DEFAULT 0.95,

    -- Results
    winner_variant_id UUID,
    statistical_significance DECIMAL(5,4),

    -- Timing
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prompt_experiments_status ON prompt_experiments(status);
CREATE INDEX IF NOT EXISTS idx_prompt_experiments_agent ON prompt_experiments(target_agent_type) WHERE target_agent_type IS NOT NULL;

-- Prompt optimization suggestions from LLM
CREATE TABLE IF NOT EXISTS prompt_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES prompt_templates(id) ON DELETE CASCADE,

    -- Suggestion details
    suggestion_type VARCHAR(50) NOT NULL,
    original_text TEXT NOT NULL,
    suggested_text TEXT NOT NULL,
    reasoning TEXT NOT NULL,

    -- Scoring
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    expected_improvement DECIMAL(5,4),

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'rejected', 'testing')),
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMPTZ,

    -- If accepted and tested
    test_experiment_id UUID REFERENCES prompt_experiments(id),
    actual_improvement DECIMAL(5,4),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prompt_suggestions_template ON prompt_suggestions(template_id);
CREATE INDEX IF NOT EXISTS idx_prompt_suggestions_status ON prompt_suggestions(status);

-- ============================================================================
-- Learning Signal Processing Tables
-- ============================================================================

-- Individual learning signals
CREATE TABLE IF NOT EXISTS learning_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Signal identification
    signal_type VARCHAR(50) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    source_id VARCHAR(200) NOT NULL,

    -- Context
    learner_id UUID REFERENCES learners(id) ON DELETE SET NULL,
    agent_type VARCHAR(50) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    context JSONB NOT NULL DEFAULT '{}',

    -- Signal value
    signal_value DECIMAL(5,4) NOT NULL CHECK (signal_value >= -1 AND signal_value <= 1),
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),

    -- Processing status
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    aggregate_id UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_signals_type ON learning_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_learning_signals_agent ON learning_signals(agent_type);
CREATE INDEX IF NOT EXISTS idx_learning_signals_learner ON learning_signals(learner_id) WHERE learner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_learning_signals_processed ON learning_signals(processed, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_signals_created ON learning_signals(created_at DESC);

-- Aggregated learning data
CREATE TABLE IF NOT EXISTS learning_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Aggregation dimensions
    agent_type VARCHAR(50) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    signal_type VARCHAR(50) NOT NULL,
    time_bucket TIMESTAMPTZ NOT NULL,

    -- Aggregated metrics
    signal_count INTEGER NOT NULL DEFAULT 0,
    sum_value DECIMAL(10,4) NOT NULL DEFAULT 0,
    sum_squared DECIMAL(10,4) NOT NULL DEFAULT 0,
    min_value DECIMAL(5,4),
    max_value DECIMAL(5,4),
    avg_confidence DECIMAL(3,2),

    -- Computed stats (updated on aggregation)
    mean_value DECIMAL(5,4),
    std_deviation DECIMAL(5,4),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(agent_type, action_type, signal_type, time_bucket)
);

CREATE INDEX IF NOT EXISTS idx_learning_aggregates_bucket ON learning_aggregates(time_bucket DESC);
CREATE INDEX IF NOT EXISTS idx_learning_aggregates_agent ON learning_aggregates(agent_type, action_type);

-- Detected learning patterns
CREATE TABLE IF NOT EXISTS learning_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Pattern identification
    pattern_type VARCHAR(50) NOT NULL,
    agent_type VARCHAR(50) NOT NULL,
    action_type VARCHAR(100) NOT NULL,

    -- Pattern description
    description TEXT NOT NULL,
    pattern_data JSONB NOT NULL DEFAULT '{}',

    -- Statistics
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    support_count INTEGER NOT NULL,

    -- Recommendations
    recommendations JSONB NOT NULL DEFAULT '[]',

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    validated BOOLEAN NOT NULL DEFAULT FALSE,
    validated_at TIMESTAMPTZ,
    validated_by VARCHAR(100),

    -- Timing
    first_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_patterns_type ON learning_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_learning_patterns_agent ON learning_patterns(agent_type, action_type);
CREATE INDEX IF NOT EXISTS idx_learning_patterns_active ON learning_patterns(is_active, confidence DESC);

-- Training examples for model fine-tuning
CREATE TABLE IF NOT EXISTS training_examples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source tracking
    source_signal_ids UUID[] NOT NULL,
    source_action_id UUID REFERENCES tracked_ai_actions(id) ON DELETE SET NULL,

    -- Training data
    input_text TEXT NOT NULL,
    output_text TEXT NOT NULL,
    system_prompt TEXT,

    -- Classification
    example_type VARCHAR(50) NOT NULL,
    agent_type VARCHAR(50) NOT NULL,
    task_category VARCHAR(100),

    -- Quality metrics
    quality_score DECIMAL(3,2) NOT NULL CHECK (quality_score >= 0 AND quality_score <= 1),
    human_validated BOOLEAN NOT NULL DEFAULT FALSE,
    validation_notes TEXT,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'exported')),

    -- Export tracking
    export_batch_id UUID,
    exported_at TIMESTAMPTZ,
    export_format VARCHAR(50),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_examples_status ON training_examples(status);
CREATE INDEX IF NOT EXISTS idx_training_examples_agent ON training_examples(agent_type);
CREATE INDEX IF NOT EXISTS idx_training_examples_quality ON training_examples(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_training_examples_source ON training_examples(source_action_id) WHERE source_action_id IS NOT NULL;

-- Training export batches
CREATE TABLE IF NOT EXISTS training_export_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Export details
    format VARCHAR(50) NOT NULL,
    example_count INTEGER NOT NULL,
    file_path TEXT,
    file_size_bytes BIGINT,
    checksum VARCHAR(64),

    -- Filters used
    min_quality_score DECIMAL(3,2),
    agent_types VARCHAR(50)[],
    date_range_start TIMESTAMPTZ,
    date_range_end TIMESTAMPTZ,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'created'
        CHECK (status IN ('created', 'processing', 'completed', 'failed', 'uploaded')),
    error_message TEXT,

    -- Upload tracking (if sent to fine-tuning service)
    uploaded_to VARCHAR(100),
    uploaded_at TIMESTAMPTZ,
    fine_tune_job_id VARCHAR(200),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_training_batches_status ON training_export_batches(status);
CREATE INDEX IF NOT EXISTS idx_training_batches_created ON training_export_batches(created_at DESC);

-- ============================================================================
-- Views for Analytics
-- ============================================================================

-- Action effectiveness summary view
CREATE OR REPLACE VIEW v_action_effectiveness AS
SELECT
    agent_type,
    action_type,
    action_category,
    DATE_TRUNC('day', created_at) as day,
    COUNT(*) as total_actions,
    COUNT(*) FILTER (WHERE feedback_received) as feedback_count,
    COUNT(*) FILTER (WHERE was_accepted) as accepted_count,
    AVG(user_rating) as avg_rating,
    AVG(confidence) as avg_confidence,
    COUNT(*) FILTER (WHERE was_executed) as executed_count,
    COUNT(*) FILTER (WHERE outcome_measured) as measured_count
FROM tracked_ai_actions
GROUP BY agent_type, action_type, action_category, DATE_TRUNC('day', created_at);

-- Experiment performance summary view
CREATE OR REPLACE VIEW v_experiment_performance AS
SELECT
    e.id as experiment_id,
    e.name as experiment_name,
    e.status,
    e.started_at,
    v->>'id' as variant_id,
    v->>'name' as variant_name,
    v->>'isControl' as is_control,
    COUNT(a.id) as sample_size,
    AVG(CASE WHEN a.was_accepted THEN 1.0 ELSE 0.0 END) as acceptance_rate,
    AVG(a.user_rating) as avg_rating,
    AVG(a.confidence) as avg_confidence
FROM prompt_experiments e
CROSS JOIN LATERAL jsonb_array_elements(e.variants) as v
LEFT JOIN tracked_ai_actions a ON a.experiment_variant_id = (v->>'id')::uuid
GROUP BY e.id, e.name, e.status, e.started_at, v->>'id', v->>'name', v->>'isControl';

-- Learning signal trends view
CREATE OR REPLACE VIEW v_learning_signal_trends AS
SELECT
    agent_type,
    action_type,
    signal_type,
    time_bucket,
    signal_count,
    mean_value,
    std_deviation,
    LAG(mean_value) OVER (
        PARTITION BY agent_type, action_type, signal_type
        ORDER BY time_bucket
    ) as prev_mean,
    mean_value - LAG(mean_value) OVER (
        PARTITION BY agent_type, action_type, signal_type
        ORDER BY time_bucket
    ) as trend
FROM learning_aggregates
ORDER BY time_bucket DESC;

-- ============================================================================
-- Functions for Self-Learning Operations
-- ============================================================================

-- Function to calculate action effectiveness score
CREATE OR REPLACE FUNCTION calculate_effectiveness_score(
    p_agent_type VARCHAR(50),
    p_action_type VARCHAR(100),
    p_days INTEGER DEFAULT 30
) RETURNS TABLE (
    effectiveness_score DECIMAL(5,4),
    sample_size INTEGER,
    acceptance_rate DECIMAL(5,4),
    avg_rating DECIMAL(3,2),
    execution_success_rate DECIMAL(5,4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (
            COALESCE(AVG(CASE WHEN was_accepted THEN 1.0 ELSE 0.0 END), 0) * 0.4 +
            COALESCE(AVG(user_rating) / 5.0, 0) * 0.3 +
            COALESCE(AVG(CASE WHEN was_executed AND execution_error IS NULL THEN 1.0 ELSE 0.0 END), 0) * 0.3
        )::DECIMAL(5,4) as effectiveness_score,
        COUNT(*)::INTEGER as sample_size,
        AVG(CASE WHEN was_accepted THEN 1.0 ELSE 0.0 END)::DECIMAL(5,4) as acceptance_rate,
        AVG(user_rating)::DECIMAL(3,2) as avg_rating,
        AVG(CASE WHEN was_executed AND execution_error IS NULL THEN 1.0 ELSE 0.0 END)::DECIMAL(5,4) as execution_success_rate
    FROM tracked_ai_actions
    WHERE agent_type = p_agent_type
      AND action_type = p_action_type
      AND created_at > NOW() - (p_days || ' days')::INTERVAL
      AND feedback_received = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get top performing prompts
CREATE OR REPLACE FUNCTION get_top_prompts(
    p_category VARCHAR(100) DEFAULT NULL,
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    template_id UUID,
    template_name VARCHAR(200),
    category VARCHAR(100),
    success_rate DECIMAL(5,4),
    avg_rating DECIMAL(3,2),
    total_uses INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pt.id,
        pt.name,
        pt.category,
        pt.success_rate,
        pt.avg_rating,
        pt.total_uses
    FROM prompt_templates pt
    WHERE pt.is_active = TRUE
      AND pt.total_uses >= 10
      AND (p_category IS NULL OR pt.category = p_category)
    ORDER BY pt.success_rate DESC NULLS LAST, pt.avg_rating DESC NULLS LAST
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to detect anomalies in learning signals
CREATE OR REPLACE FUNCTION detect_signal_anomalies(
    p_agent_type VARCHAR(50),
    p_lookback_hours INTEGER DEFAULT 24,
    p_std_threshold DECIMAL DEFAULT 2.0
) RETURNS TABLE (
    signal_type VARCHAR(50),
    action_type VARCHAR(100),
    current_mean DECIMAL(5,4),
    historical_mean DECIMAL(5,4),
    historical_std DECIMAL(5,4),
    z_score DECIMAL(5,2),
    is_anomaly BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH recent_data AS (
        SELECT
            la.signal_type,
            la.action_type,
            la.mean_value as current_mean
        FROM learning_aggregates la
        WHERE la.agent_type = p_agent_type
          AND la.time_bucket > NOW() - (p_lookback_hours || ' hours')::INTERVAL
    ),
    historical_stats AS (
        SELECT
            la.signal_type,
            la.action_type,
            AVG(la.mean_value) as hist_mean,
            STDDEV(la.mean_value) as hist_std
        FROM learning_aggregates la
        WHERE la.agent_type = p_agent_type
          AND la.time_bucket <= NOW() - (p_lookback_hours || ' hours')::INTERVAL
          AND la.time_bucket > NOW() - INTERVAL '30 days'
        GROUP BY la.signal_type, la.action_type
    )
    SELECT
        r.signal_type,
        r.action_type,
        r.current_mean,
        h.hist_mean,
        h.hist_std,
        CASE
            WHEN h.hist_std > 0 THEN ((r.current_mean - h.hist_mean) / h.hist_std)::DECIMAL(5,2)
            ELSE 0
        END as z_score,
        CASE
            WHEN h.hist_std > 0 THEN ABS((r.current_mean - h.hist_mean) / h.hist_std) > p_std_threshold
            ELSE FALSE
        END as is_anomaly
    FROM recent_data r
    JOIN historical_stats h ON r.signal_type = h.signal_type AND r.action_type = h.action_type;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers for Automatic Updates
-- ============================================================================

-- Trigger to update prompt template stats on action completion
CREATE OR REPLACE FUNCTION update_prompt_template_stats() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.prompt_template_id IS NOT NULL AND NEW.feedback_received = TRUE THEN
        UPDATE prompt_templates
        SET
            total_uses = total_uses + 1,
            success_rate = (
                SELECT AVG(CASE WHEN was_accepted THEN 1.0 ELSE 0.0 END)
                FROM tracked_ai_actions
                WHERE prompt_template_id = NEW.prompt_template_id
                  AND feedback_received = TRUE
            ),
            avg_rating = (
                SELECT AVG(user_rating)
                FROM tracked_ai_actions
                WHERE prompt_template_id = NEW.prompt_template_id
                  AND user_rating IS NOT NULL
            ),
            updated_at = NOW()
        WHERE id = NEW.prompt_template_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_prompt_stats
AFTER INSERT OR UPDATE OF feedback_received, was_accepted, user_rating
ON tracked_ai_actions
FOR EACH ROW
EXECUTE FUNCTION update_prompt_template_stats();

-- Trigger to auto-compute aggregate statistics
CREATE OR REPLACE FUNCTION compute_aggregate_stats() RETURNS TRIGGER AS $$
BEGIN
    NEW.mean_value := NEW.sum_value / NULLIF(NEW.signal_count, 0);
    NEW.std_deviation := SQRT(
        (NEW.sum_squared / NULLIF(NEW.signal_count, 0)) -
        (NEW.mean_value * NEW.mean_value)
    );
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compute_aggregate_stats
BEFORE INSERT OR UPDATE OF signal_count, sum_value, sum_squared
ON learning_aggregates
FOR EACH ROW
EXECUTE FUNCTION compute_aggregate_stats();

-- ============================================================================
-- Initial Data
-- ============================================================================

-- Insert default prompt templates for common agent types
INSERT INTO prompt_templates (name, category, agent_type, template, variables, is_default)
VALUES
    ('learning_path_recommendation', 'recommendations', 'learning_path',
     'Based on the learner profile: {{learner_profile}}

Current progress: {{current_progress}}
Learning goals: {{goals}}

Recommend the next learning steps that would be most effective.',
     '["learner_profile", "current_progress", "goals"]'::jsonb, TRUE),

    ('content_suggestion', 'recommendations', 'content_curator',
     'Given the following context:
Learner interests: {{interests}}
Skill level: {{skill_level}}
Recent activity: {{recent_activity}}

Suggest relevant learning content that matches their needs.',
     '["interests", "skill_level", "recent_activity"]'::jsonb, TRUE),

    ('study_plan_generation', 'planning', 'study_planner',
     'Create a study plan for:
Subject: {{subject}}
Available time: {{available_time}}
Deadline: {{deadline}}
Current knowledge: {{current_knowledge}}

Generate an optimized study schedule.',
     '["subject", "available_time", "deadline", "current_knowledge"]'::jsonb, TRUE),

    ('feedback_generation', 'feedback', 'feedback_generator',
     'Provide constructive feedback for:
Task type: {{task_type}}
Submission: {{submission}}
Rubric: {{rubric}}
Previous attempts: {{previous_attempts}}

Generate helpful, encouraging feedback.',
     '["task_type", "submission", "rubric", "previous_attempts"]'::jsonb, TRUE)
ON CONFLICT (name, version) DO NOTHING;

COMMENT ON TABLE tracked_ai_actions IS 'Tracks all AI-generated actions for effectiveness measurement';
COMMENT ON TABLE prompt_templates IS 'Versioned prompt templates with performance metrics';
COMMENT ON TABLE prompt_experiments IS 'A/B test experiments for prompt optimization';
COMMENT ON TABLE learning_signals IS 'Individual learning signals from various sources';
COMMENT ON TABLE learning_aggregates IS 'Time-bucketed aggregations of learning signals';
COMMENT ON TABLE learning_patterns IS 'Detected patterns from learning signal analysis';
COMMENT ON TABLE training_examples IS 'Curated examples for model fine-tuning';
