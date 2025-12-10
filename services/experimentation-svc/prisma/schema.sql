-- ═══════════════════════════════════════════════════════════════════════════════
-- EXPERIMENTATION SERVICE SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- Tables for managing A/B experiments, variant assignments, and exposure tracking.
-- Supports tenant-level and learner-level experiments with deterministic hashing.
--

-- ───────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ───────────────────────────────────────────────────────────────────────────────

CREATE TYPE experiment_scope AS ENUM (
  'TENANT',   -- All learners in a tenant get same variant
  'LEARNER'   -- Each learner individually assigned
);

CREATE TYPE experiment_status AS ENUM (
  'DRAFT',      -- Not yet running
  'RUNNING',    -- Actively assigning and tracking
  'PAUSED',     -- Temporarily stopped
  'COMPLETED'   -- Finished, no new assignments
);

CREATE TYPE assignment_reason AS ENUM (
  'HASH_ALLOCATION',        -- Normal deterministic assignment
  'TENANT_OPT_OUT',         -- Tenant disabled experimentation
  'EXPERIMENT_NOT_RUNNING', -- Experiment not in RUNNING status
  'EXPERIMENT_NOT_FOUND',   -- Experiment doesn't exist
  'FORCED_VARIANT'          -- Override for testing
);

-- ───────────────────────────────────────────────────────────────────────────────
-- EXPERIMENTS TABLE
-- ───────────────────────────────────────────────────────────────────────────────
-- 
-- Core table for experiment definitions.
-- Each experiment has a unique key used in hash-based assignment.
--

CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Unique key for this experiment (used in hash)
  -- Examples: 'focus_session_length', 'recommendation_algorithm_v2'
  key VARCHAR(64) NOT NULL UNIQUE,
  
  -- Human-readable name
  name VARCHAR(255) NOT NULL,
  
  -- Description of what we're testing
  description TEXT,
  
  -- Assignment scope
  scope experiment_scope NOT NULL,
  
  -- Current status
  status experiment_status NOT NULL DEFAULT 'DRAFT',
  
  -- Experiment-level configuration (e.g., targeting rules)
  config_json JSONB NOT NULL DEFAULT '{}',
  
  -- Time bounds (optional)
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  
  -- Audit
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_experiments_key ON experiments(key);
CREATE INDEX idx_experiments_status ON experiments(status);
CREATE INDEX idx_experiments_scope ON experiments(scope);

-- ───────────────────────────────────────────────────────────────────────────────
-- EXPERIMENT_VARIANTS TABLE
-- ───────────────────────────────────────────────────────────────────────────────
-- 
-- Variants for each experiment with allocation percentages.
-- Allocations must sum to 1.0 across all variants in an experiment.
--

CREATE TABLE IF NOT EXISTS experiment_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Parent experiment
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  
  -- Unique key within experiment (e.g., 'control', 'treatment_a')
  key VARCHAR(64) NOT NULL,
  
  -- Allocation percentage (0.0 to 1.0)
  -- Sum of allocations for all variants in an experiment must equal 1.0
  allocation DECIMAL(4,3) NOT NULL CHECK (allocation >= 0 AND allocation <= 1),
  
  -- Variant-specific configuration
  -- Contains the actual treatment parameters
  -- Example: { "sessionMinutes": 45, "breakMinutes": 10 }
  config_json JSONB NOT NULL DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique variant key per experiment
  CONSTRAINT uq_experiment_variant_key UNIQUE (experiment_id, key)
);

-- Indexes
CREATE INDEX idx_variants_experiment ON experiment_variants(experiment_id);

-- ───────────────────────────────────────────────────────────────────────────────
-- EXPERIMENT_ASSIGNMENTS TABLE
-- ───────────────────────────────────────────────────────────────────────────────
-- 
-- Cached assignments for audit and debugging.
-- Assignment is deterministic via hashing, so this table is optional
-- but useful for:
-- - Audit trail of who was assigned to what
-- - Quick lookups without re-hashing
-- - Override tracking
--

CREATE TABLE IF NOT EXISTS experiment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Experiment reference
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  
  -- Subject identity
  tenant_id UUID NOT NULL,
  learner_id UUID, -- NULL for TENANT-scoped experiments
  
  -- Assigned variant
  variant_key VARCHAR(64) NOT NULL,
  
  -- How the assignment was determined
  reason assignment_reason NOT NULL,
  
  -- When assigned
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique assignment per subject per experiment
  -- Use COALESCE to handle NULL learner_id
  CONSTRAINT uq_experiment_assignment UNIQUE (
    experiment_id, 
    tenant_id, 
    COALESCE(learner_id, '00000000-0000-0000-0000-000000000000')
  )
);

-- Indexes
CREATE INDEX idx_assignments_experiment ON experiment_assignments(experiment_id);
CREATE INDEX idx_assignments_tenant ON experiment_assignments(tenant_id);
CREATE INDEX idx_assignments_learner ON experiment_assignments(learner_id) WHERE learner_id IS NOT NULL;
CREATE INDEX idx_assignments_variant ON experiment_assignments(variant_key);
CREATE INDEX idx_assignments_assigned_at ON experiment_assignments(assigned_at);

-- ───────────────────────────────────────────────────────────────────────────────
-- EXPERIMENT_EXPOSURES TABLE
-- ───────────────────────────────────────────────────────────────────────────────
-- 
-- Tracks when users actually SEE the experimental treatment.
-- Important distinction from assignment:
-- - Assignment: user is allocated to a variant
-- - Exposure: user actually sees/experiences the variant
-- 
-- This enables accurate experiment analysis by only including
-- users who were actually exposed to the treatment.
--

CREATE TABLE IF NOT EXISTS experiment_exposures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Experiment reference
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  
  -- Subject identity
  tenant_id UUID NOT NULL,
  learner_id UUID,
  
  -- Which variant they were exposed to
  variant_key VARCHAR(64) NOT NULL,
  
  -- Where the exposure occurred
  -- Examples: 'focus_agent', 'session_start', 'recommendation_ui'
  feature_area VARCHAR(64) NOT NULL,
  
  -- Session context (if applicable)
  session_id UUID,
  
  -- Additional context
  metadata JSONB,
  
  -- When exposed
  exposed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for query patterns
CREATE INDEX idx_exposures_experiment ON experiment_exposures(experiment_id);
CREATE INDEX idx_exposures_tenant ON experiment_exposures(tenant_id);
CREATE INDEX idx_exposures_learner ON experiment_exposures(learner_id) WHERE learner_id IS NOT NULL;
CREATE INDEX idx_exposures_variant ON experiment_exposures(experiment_id, variant_key);
CREATE INDEX idx_exposures_feature_area ON experiment_exposures(feature_area);
CREATE INDEX idx_exposures_exposed_at ON experiment_exposures(exposed_at);
CREATE INDEX idx_exposures_session ON experiment_exposures(session_id) WHERE session_id IS NOT NULL;

-- ───────────────────────────────────────────────────────────────────────────────
-- VIEWS FOR ANALYTICS
-- ───────────────────────────────────────────────────────────────────────────────

-- Experiment summary with variant counts
CREATE OR REPLACE VIEW experiment_summary AS
SELECT 
  e.id,
  e.key,
  e.name,
  e.scope,
  e.status,
  e.start_at,
  e.end_at,
  COUNT(DISTINCT a.id) as total_assignments,
  COUNT(DISTINCT ex.id) as total_exposures,
  COUNT(DISTINCT a.tenant_id) as unique_tenants,
  COUNT(DISTINCT a.learner_id) FILTER (WHERE a.learner_id IS NOT NULL) as unique_learners
FROM experiments e
LEFT JOIN experiment_assignments a ON e.id = a.experiment_id
LEFT JOIN experiment_exposures ex ON e.id = ex.experiment_id
GROUP BY e.id, e.key, e.name, e.scope, e.status, e.start_at, e.end_at;

-- Variant distribution per experiment
CREATE OR REPLACE VIEW variant_distribution AS
SELECT 
  e.key as experiment_key,
  v.key as variant_key,
  v.allocation as expected_allocation,
  COUNT(a.id) as assignment_count,
  COUNT(a.id)::DECIMAL / NULLIF(SUM(COUNT(a.id)) OVER (PARTITION BY e.id), 0) as actual_allocation
FROM experiments e
JOIN experiment_variants v ON e.id = v.experiment_id
LEFT JOIN experiment_assignments a ON e.id = a.experiment_id AND v.key = a.variant_key
GROUP BY e.id, e.key, v.key, v.allocation;

-- ───────────────────────────────────────────────────────────────────────────────
-- TRIGGERS
-- ───────────────────────────────────────────────────────────────────────────────

-- Update timestamp on experiments
CREATE OR REPLACE FUNCTION update_experiments_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER experiments_updated_at
  BEFORE UPDATE ON experiments
  FOR EACH ROW
  EXECUTE FUNCTION update_experiments_timestamp();

-- ───────────────────────────────────────────────────────────────────────────────
-- EXAMPLE DATA (for development/testing)
-- ───────────────────────────────────────────────────────────────────────────────

-- Uncomment to insert example experiments:
/*
INSERT INTO experiments (key, name, description, scope, status) VALUES
('focus_session_length', 'Focus Session Length Test', 'Test longer vs shorter focus sessions', 'LEARNER', 'DRAFT'),
('recommendation_algorithm', 'Recommendation Algorithm A/B', 'Compare ML models for content recommendations', 'LEARNER', 'DRAFT'),
('onboarding_flow', 'Onboarding Flow Test', 'Test simplified vs comprehensive onboarding', 'TENANT', 'DRAFT');

-- Variants for focus_session_length
INSERT INTO experiment_variants (experiment_id, key, allocation, config_json)
SELECT id, 'control', 0.5, '{"sessionMinutes": 25, "breakMinutes": 5}'
FROM experiments WHERE key = 'focus_session_length';

INSERT INTO experiment_variants (experiment_id, key, allocation, config_json)
SELECT id, 'extended', 0.5, '{"sessionMinutes": 45, "breakMinutes": 10}'
FROM experiments WHERE key = 'focus_session_length';

-- Variants for recommendation_algorithm
INSERT INTO experiment_variants (experiment_id, key, allocation, config_json)
SELECT id, 'control', 0.34, '{"algorithm": "collaborative_filtering"}'
FROM experiments WHERE key = 'recommendation_algorithm';

INSERT INTO experiment_variants (experiment_id, key, allocation, config_json)
SELECT id, 'treatment_a', 0.33, '{"algorithm": "content_based"}'
FROM experiments WHERE key = 'recommendation_algorithm';

INSERT INTO experiment_variants (experiment_id, key, allocation, config_json)
SELECT id, 'treatment_b', 0.33, '{"algorithm": "hybrid"}'
FROM experiments WHERE key = 'recommendation_algorithm';
*/
