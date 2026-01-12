-- Federated Prompt Learning Database Schema
-- Enables cross-tenant prompt optimization while preserving privacy

-- ============================================================================
-- Tenant Configuration
-- ============================================================================

-- Tenant federated learning configuration
CREATE TABLE IF NOT EXISTS tenant_federated_config (
    tenant_id UUID PRIMARY KEY,

    -- Participation settings
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    auto_participate BOOLEAN NOT NULL DEFAULT FALSE,

    -- Privacy preferences
    privacy_level VARCHAR(20) NOT NULL DEFAULT 'standard'
        CHECK (privacy_level IN ('standard', 'enhanced', 'maximum')),
    max_privacy_budget DECIMAL(10,4) NOT NULL DEFAULT 100.0,
    current_privacy_budget DECIMAL(10,4) NOT NULL DEFAULT 0,

    -- Data sharing preferences
    share_patterns BOOLEAN NOT NULL DEFAULT TRUE,
    share_effectiveness BOOLEAN NOT NULL DEFAULT TRUE,
    share_embeddings BOOLEAN NOT NULL DEFAULT FALSE,

    -- Model types enabled
    enabled_model_types VARCHAR(50)[] NOT NULL DEFAULT ARRAY['prompt_effectiveness', 'pattern_weights'],

    -- Requirements
    min_local_examples INTEGER NOT NULL DEFAULT 100,

    -- Update preferences
    auto_apply_updates BOOLEAN NOT NULL DEFAULT FALSE,
    require_approval BOOLEAN NOT NULL DEFAULT TRUE,

    -- Metadata
    tenant_type VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_fed_config_enabled ON tenant_federated_config(enabled, auto_participate);

-- ============================================================================
-- Federated Rounds
-- ============================================================================

-- Track federated learning rounds
CREATE TABLE IF NOT EXISTS federated_rounds (
    round_id UUID PRIMARY KEY,
    model_type VARCHAR(50) NOT NULL,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'initializing'
        CHECK (status IN ('initializing', 'collecting', 'aggregating', 'distributing', 'completed', 'failed')),

    -- Configuration
    config JSONB NOT NULL,

    -- Participants
    eligible_tenants UUID[] NOT NULL DEFAULT '{}',
    participating_tenants UUID[] NOT NULL DEFAULT '{}',

    -- Progress
    contribution_count INTEGER NOT NULL DEFAULT 0,
    distributed_count INTEGER NOT NULL DEFAULT 0,

    -- Errors
    errors JSONB NOT NULL DEFAULT '[]',

    -- Timestamps
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    collection_deadline TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_federated_rounds_status ON federated_rounds(status);
CREATE INDEX IF NOT EXISTS idx_federated_rounds_model ON federated_rounds(model_type);
CREATE INDEX IF NOT EXISTS idx_federated_rounds_started ON federated_rounds(started_at DESC);

-- ============================================================================
-- Contributions
-- ============================================================================

-- Track gradient contributions from tenants
CREATE TABLE IF NOT EXISTS federated_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES federated_rounds(round_id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,

    -- Contribution data (gradients stored as JSONB)
    gradients JSONB NOT NULL,
    sample_weight INTEGER NOT NULL,

    -- Privacy accounting
    noise_scale DECIMAL(10,6) NOT NULL,
    privacy_epsilon DECIMAL(10,6) NOT NULL,

    -- Local metrics (no raw data)
    local_metrics JSONB NOT NULL,

    -- Metadata
    computed_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(round_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_fed_contributions_round ON federated_contributions(round_id);
CREATE INDEX IF NOT EXISTS idx_fed_contributions_tenant ON federated_contributions(tenant_id);

-- ============================================================================
-- Aggregated Models
-- ============================================================================

-- Store aggregated federated models
CREATE TABLE IF NOT EXISTS federated_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES federated_rounds(round_id),
    model_type VARCHAR(50) NOT NULL,
    version INTEGER NOT NULL,

    -- Model weights
    weights JSONB NOT NULL,

    -- Aggregation info
    contributing_tenants INTEGER NOT NULL,
    total_samples INTEGER NOT NULL,

    -- Privacy guarantee
    privacy_epsilon DECIMAL(10,6) NOT NULL,

    -- Performance metrics
    metrics JSONB NOT NULL,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    deprecated_at TIMESTAMPTZ,

    -- Timestamps
    aggregated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_federated_models_type ON federated_models(model_type);
CREATE INDEX IF NOT EXISTS idx_federated_models_version ON federated_models(model_type, version DESC);
CREATE INDEX IF NOT EXISTS idx_federated_models_round ON federated_models(round_id);
CREATE INDEX IF NOT EXISTS idx_federated_models_active ON federated_models(is_active, model_type);

-- ============================================================================
-- Tenant Models
-- ============================================================================

-- Track per-tenant model state
CREATE TABLE IF NOT EXISTS tenant_models (
    tenant_id UUID NOT NULL,
    model_type VARCHAR(50) NOT NULL,
    weights JSONB NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,

    -- Source tracking
    source_round_id UUID REFERENCES federated_rounds(round_id),
    locally_trained BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timestamps
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (tenant_id, model_type)
);

CREATE INDEX IF NOT EXISTS idx_tenant_models_version ON tenant_models(model_type, version DESC);

-- ============================================================================
-- Pending Updates
-- ============================================================================

-- Store pending model updates awaiting approval
CREATE TABLE IF NOT EXISTS pending_model_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    model_type VARCHAR(50) NOT NULL,

    -- Update data
    weights JSONB NOT NULL,
    source_round_id UUID REFERENCES federated_rounds(round_id),

    -- Approval status
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(tenant_id, model_type, source_round_id)
);

CREATE INDEX IF NOT EXISTS idx_pending_updates_tenant ON pending_model_updates(tenant_id, status);

-- ============================================================================
-- Tenant Participation History
-- ============================================================================

-- Track tenant participation in rounds
CREATE TABLE IF NOT EXISTS tenant_participation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    round_id UUID NOT NULL REFERENCES federated_rounds(round_id),

    -- Participation info
    invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    contributed BOOLEAN NOT NULL DEFAULT FALSE,
    contribution_id UUID REFERENCES federated_contributions(id),

    -- Contribution details
    sample_weight INTEGER,
    privacy_epsilon_used DECIMAL(10,6),
    local_metrics JSONB,

    -- Update application
    update_applied BOOLEAN NOT NULL DEFAULT FALSE,
    update_applied_at TIMESTAMPTZ,

    -- Local improvement (if measured)
    local_improvement DECIMAL(10,6),

    UNIQUE(tenant_id, round_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_participation_tenant ON tenant_participation(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_participation_round ON tenant_participation(round_id);

-- ============================================================================
-- Privacy Budget Ledger
-- ============================================================================

-- Track privacy budget usage per tenant
CREATE TABLE IF NOT EXISTS privacy_budget_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    round_id UUID REFERENCES federated_rounds(round_id),

    -- Privacy spent
    epsilon_spent DECIMAL(10,6) NOT NULL,
    delta_spent DECIMAL(15,12) NOT NULL,

    -- Running totals (for quick lookups)
    cumulative_epsilon DECIMAL(10,4) NOT NULL,
    cumulative_delta DECIMAL(15,10) NOT NULL,

    -- Metadata
    activity_type VARCHAR(50) NOT NULL DEFAULT 'contribution',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_privacy_ledger_tenant ON privacy_budget_ledger(tenant_id);
CREATE INDEX IF NOT EXISTS idx_privacy_ledger_created ON privacy_budget_ledger(tenant_id, created_at DESC);

-- ============================================================================
-- Views
-- ============================================================================

-- Active eligible tenants view
CREATE OR REPLACE VIEW v_federated_eligible_tenants AS
SELECT
    tfc.tenant_id,
    tfc.privacy_level,
    tfc.max_privacy_budget,
    tfc.current_privacy_budget,
    tfc.max_privacy_budget - tfc.current_privacy_budget as remaining_budget,
    tfc.enabled_model_types,
    COUNT(DISTINCT ta.id) as available_samples
FROM tenant_federated_config tfc
LEFT JOIN tracked_ai_actions ta ON ta.tenant_id = tfc.tenant_id
    AND ta.feedback_received = true
    AND ta.created_at > NOW() - INTERVAL '90 days'
WHERE tfc.enabled = true
    AND tfc.auto_participate = true
GROUP BY tfc.tenant_id, tfc.privacy_level, tfc.max_privacy_budget,
         tfc.current_privacy_budget, tfc.enabled_model_types;

-- Round summary view
CREATE OR REPLACE VIEW v_federated_round_summary AS
SELECT
    fr.round_id,
    fr.model_type,
    fr.status,
    fr.config->>'privacyLevel' as privacy_level,
    ARRAY_LENGTH(fr.eligible_tenants, 1) as eligible_count,
    ARRAY_LENGTH(fr.participating_tenants, 1) as participant_count,
    fr.contribution_count,
    fr.distributed_count,
    CASE
        WHEN fr.status = 'completed' THEN
            fm.metrics->>'globalMeanEffectiveness'
        ELSE NULL
    END as final_effectiveness,
    fr.started_at,
    fr.completed_at,
    EXTRACT(EPOCH FROM (COALESCE(fr.completed_at, NOW()) - fr.started_at)) / 60 as duration_minutes
FROM federated_rounds fr
LEFT JOIN federated_models fm ON fm.round_id = fr.round_id;

-- Tenant federation stats view
CREATE OR REPLACE VIEW v_tenant_federation_stats AS
SELECT
    tfc.tenant_id,
    tfc.enabled,
    tfc.privacy_level,
    tfc.max_privacy_budget,
    tfc.current_privacy_budget,
    COUNT(tp.id) as total_participations,
    COUNT(tp.id) FILTER (WHERE tp.contributed) as contributions,
    AVG(tp.local_improvement) as avg_improvement,
    MAX(tp.joined_at) as last_participation
FROM tenant_federated_config tfc
LEFT JOIN tenant_participation tp ON tp.tenant_id = tfc.tenant_id
GROUP BY tfc.tenant_id, tfc.enabled, tfc.privacy_level,
         tfc.max_privacy_budget, tfc.current_privacy_budget;

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to check tenant eligibility
CREATE OR REPLACE FUNCTION check_tenant_eligibility(
    p_tenant_id UUID,
    p_model_type VARCHAR(50),
    p_required_epsilon DECIMAL
) RETURNS TABLE (
    eligible BOOLEAN,
    reason TEXT
) AS $$
DECLARE
    v_config RECORD;
    v_sample_count INTEGER;
BEGIN
    -- Get tenant config
    SELECT * INTO v_config
    FROM tenant_federated_config
    WHERE tenant_id = p_tenant_id;

    IF v_config IS NULL THEN
        RETURN QUERY SELECT false, 'Tenant not configured for federated learning';
        RETURN;
    END IF;

    IF NOT v_config.enabled THEN
        RETURN QUERY SELECT false, 'Federated learning not enabled';
        RETURN;
    END IF;

    IF NOT (p_model_type = ANY(v_config.enabled_model_types)) THEN
        RETURN QUERY SELECT false, 'Model type not enabled for tenant';
        RETURN;
    END IF;

    IF (v_config.max_privacy_budget - v_config.current_privacy_budget) < p_required_epsilon THEN
        RETURN QUERY SELECT false, 'Insufficient privacy budget';
        RETURN;
    END IF;

    -- Check sample count
    SELECT COUNT(*) INTO v_sample_count
    FROM tracked_ai_actions
    WHERE tenant_id = p_tenant_id
        AND feedback_received = true
        AND created_at > NOW() - INTERVAL '90 days';

    IF v_sample_count < v_config.min_local_examples THEN
        RETURN QUERY SELECT false, 'Insufficient local training data';
        RETURN;
    END IF;

    RETURN QUERY SELECT true, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to record privacy budget usage
CREATE OR REPLACE FUNCTION record_privacy_usage(
    p_tenant_id UUID,
    p_round_id UUID,
    p_epsilon DECIMAL,
    p_delta DECIMAL
) RETURNS VOID AS $$
DECLARE
    v_cumulative_epsilon DECIMAL;
    v_cumulative_delta DECIMAL;
BEGIN
    -- Get current cumulative values
    SELECT
        COALESCE(SUM(epsilon_spent), 0),
        COALESCE(SUM(delta_spent), 0)
    INTO v_cumulative_epsilon, v_cumulative_delta
    FROM privacy_budget_ledger
    WHERE tenant_id = p_tenant_id;

    -- Insert new record
    INSERT INTO privacy_budget_ledger (
        tenant_id, round_id, epsilon_spent, delta_spent,
        cumulative_epsilon, cumulative_delta
    )
    VALUES (
        p_tenant_id, p_round_id, p_epsilon, p_delta,
        v_cumulative_epsilon + p_epsilon, v_cumulative_delta + p_delta
    );

    -- Update tenant config
    UPDATE tenant_federated_config
    SET current_privacy_budget = v_cumulative_epsilon + p_epsilon
    WHERE tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get model improvement over rounds
CREATE OR REPLACE FUNCTION get_model_improvement(
    p_model_type VARCHAR(50),
    p_last_n_rounds INTEGER DEFAULT 10
) RETURNS TABLE (
    round_id UUID,
    version INTEGER,
    effectiveness DECIMAL,
    improvement DECIMAL,
    contributors INTEGER,
    aggregated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        fm.round_id,
        fm.version,
        (fm.metrics->>'globalMeanEffectiveness')::DECIMAL as effectiveness,
        (fm.metrics->>'globalMeanEffectiveness')::DECIMAL -
            LAG((fm.metrics->>'globalMeanEffectiveness')::DECIMAL) OVER (ORDER BY fm.version) as improvement,
        fm.contributing_tenants,
        fm.aggregated_at
    FROM federated_models fm
    WHERE fm.model_type = p_model_type
    ORDER BY fm.version DESC
    LIMIT p_last_n_rounds;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Trigger to update participation when contribution received
CREATE OR REPLACE FUNCTION update_participation_on_contribution() RETURNS TRIGGER AS $$
BEGIN
    UPDATE tenant_participation
    SET
        contributed = true,
        contribution_id = NEW.id,
        sample_weight = NEW.sample_weight,
        privacy_epsilon_used = NEW.privacy_epsilon,
        local_metrics = NEW.local_metrics
    WHERE tenant_id = NEW.tenant_id AND round_id = NEW.round_id;

    -- Also update round contribution count
    UPDATE federated_rounds
    SET contribution_count = contribution_count + 1
    WHERE round_id = NEW.round_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_participation
AFTER INSERT ON federated_contributions
FOR EACH ROW
EXECUTE FUNCTION update_participation_on_contribution();

-- Trigger to initialize participation records when tenants join
CREATE OR REPLACE FUNCTION initialize_tenant_participation() RETURNS TRIGGER AS $$
BEGIN
    -- Create participation records for eligible tenants
    IF NEW.status = 'collecting' AND OLD.status = 'initializing' THEN
        INSERT INTO tenant_participation (tenant_id, round_id)
        SELECT unnest(NEW.eligible_tenants), NEW.round_id
        ON CONFLICT (tenant_id, round_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_init_participation
AFTER UPDATE OF status ON federated_rounds
FOR EACH ROW
WHEN (NEW.status = 'collecting')
EXECUTE FUNCTION initialize_tenant_participation();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE tenant_federated_config IS 'Per-tenant federated learning configuration and privacy preferences';
COMMENT ON TABLE federated_rounds IS 'Federated learning round coordination and status tracking';
COMMENT ON TABLE federated_contributions IS 'Privacy-preserved gradient contributions from tenants';
COMMENT ON TABLE federated_models IS 'Aggregated models from federated learning rounds';
COMMENT ON TABLE tenant_models IS 'Per-tenant model state (local + federated)';
COMMENT ON TABLE privacy_budget_ledger IS 'Audit trail of privacy budget consumption per tenant';
