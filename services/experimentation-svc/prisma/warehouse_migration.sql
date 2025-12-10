-- ═══════════════════════════════════════════════════════════════════════════════
-- EXPERIMENTATION WAREHOUSE TABLES
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- Fact tables for experiment exposures and outcomes in the analytics warehouse.
-- These tables enable experiment analysis alongside session and learning data.
--

-- ────────────────────────────────────────────────────────────────────────────────
-- DIMENSION: EXPERIMENTS
-- ────────────────────────────────────────────────────────────────────────────────
-- 
-- SCD Type 1 (no history) dimension for experiment metadata.
--

CREATE TABLE IF NOT EXISTS dim_experiment (
  experiment_key SERIAL PRIMARY KEY,
  experiment_id UUID NOT NULL,
  experiment_name VARCHAR(64) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  scope VARCHAR(20) NOT NULL, -- 'TENANT' or 'LEARNER'
  status VARCHAR(20) NOT NULL, -- 'DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED'
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  
  UNIQUE(experiment_id)
);

CREATE INDEX IF NOT EXISTS idx_dim_experiment_name ON dim_experiment(experiment_name);
CREATE INDEX IF NOT EXISTS idx_dim_experiment_status ON dim_experiment(status);

-- ────────────────────────────────────────────────────────────────────────────────
-- DIMENSION: EXPERIMENT VARIANTS
-- ────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dim_experiment_variant (
  variant_key SERIAL PRIMARY KEY,
  variant_id UUID NOT NULL,
  experiment_key INTEGER NOT NULL REFERENCES dim_experiment(experiment_key),
  variant_name VARCHAR(64) NOT NULL,
  allocation NUMERIC(4,3) NOT NULL,
  config_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL,
  
  UNIQUE(variant_id)
);

CREATE INDEX IF NOT EXISTS idx_dim_variant_experiment ON dim_experiment_variant(experiment_key);

-- ────────────────────────────────────────────────────────────────────────────────
-- FACT: EXPERIMENT EXPOSURES
-- ────────────────────────────────────────────────────────────────────────────────
-- 
-- Tracks when subjects were exposed to experimental variants.
-- One row per exposure event (can have multiple per subject for same experiment).
--

CREATE TABLE IF NOT EXISTS fact_experiment_exposures (
  exposure_key SERIAL PRIMARY KEY,
  exposure_id UUID NOT NULL UNIQUE,
  
  -- Dimension keys
  date_key INTEGER NOT NULL,
  tenant_key INTEGER NOT NULL REFERENCES dim_tenant(tenant_key),
  learner_key INTEGER REFERENCES dim_learner(learner_key), -- NULL for TENANT scope
  experiment_key INTEGER NOT NULL REFERENCES dim_experiment(experiment_key),
  variant_key INTEGER NOT NULL REFERENCES dim_experiment_variant(variant_key),
  session_key INTEGER REFERENCES fact_sessions(session_key),
  
  -- Exposure context
  feature_area VARCHAR(64) NOT NULL,
  
  -- Timing
  exposed_at TIMESTAMPTZ NOT NULL,
  
  -- Additional context
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_fact_exposures_date ON fact_experiment_exposures(date_key);
CREATE INDEX IF NOT EXISTS idx_fact_exposures_experiment ON fact_experiment_exposures(experiment_key);
CREATE INDEX IF NOT EXISTS idx_fact_exposures_variant ON fact_experiment_exposures(variant_key);
CREATE INDEX IF NOT EXISTS idx_fact_exposures_tenant_date ON fact_experiment_exposures(tenant_key, date_key);
CREATE INDEX IF NOT EXISTS idx_fact_exposures_learner_date ON fact_experiment_exposures(learner_key, date_key);
CREATE INDEX IF NOT EXISTS idx_fact_exposures_feature ON fact_experiment_exposures(feature_area);

-- ────────────────────────────────────────────────────────────────────────────────
-- FACT: EXPERIMENT ASSIGNMENTS (SNAPSHOT)
-- ────────────────────────────────────────────────────────────────────────────────
-- 
-- Daily snapshot of experiment assignments for analysis.
-- Useful for cohort analysis and tracking assignment stability.
--

CREATE TABLE IF NOT EXISTS fact_experiment_assignments (
  assignment_key SERIAL PRIMARY KEY,
  
  -- Dimension keys
  date_key INTEGER NOT NULL,
  tenant_key INTEGER NOT NULL REFERENCES dim_tenant(tenant_key),
  learner_key INTEGER REFERENCES dim_learner(learner_key),
  experiment_key INTEGER NOT NULL REFERENCES dim_experiment(experiment_key),
  variant_key INTEGER NOT NULL REFERENCES dim_experiment_variant(variant_key),
  
  -- Assignment details
  assignment_reason VARCHAR(50) NOT NULL,
  first_assigned_at TIMESTAMPTZ NOT NULL,
  last_updated_at TIMESTAMPTZ NOT NULL,
  
  UNIQUE(date_key, tenant_key, COALESCE(learner_key, -1), experiment_key)
);

CREATE INDEX IF NOT EXISTS idx_fact_assignments_experiment ON fact_experiment_assignments(experiment_key);
CREATE INDEX IF NOT EXISTS idx_fact_assignments_date ON fact_experiment_assignments(date_key);

-- ────────────────────────────────────────────────────────────────────────────────
-- AGGREGATED: EXPERIMENT METRICS
-- ────────────────────────────────────────────────────────────────────────────────
-- 
-- Pre-aggregated metrics for experiment dashboards.
-- Updated by ETL process.
--

CREATE TABLE IF NOT EXISTS agg_experiment_metrics_daily (
  metric_key SERIAL PRIMARY KEY,
  date_key INTEGER NOT NULL,
  experiment_key INTEGER NOT NULL REFERENCES dim_experiment(experiment_key),
  variant_key INTEGER NOT NULL REFERENCES dim_experiment_variant(variant_key),
  
  -- Exposure metrics
  total_exposures INTEGER NOT NULL DEFAULT 0,
  unique_tenants INTEGER NOT NULL DEFAULT 0,
  unique_learners INTEGER NOT NULL DEFAULT 0,
  
  -- Session metrics (for exposed users only)
  sessions_count INTEGER NOT NULL DEFAULT 0,
  avg_session_duration_seconds NUMERIC(10,2),
  total_activities_completed INTEGER NOT NULL DEFAULT 0,
  avg_correct_rate NUMERIC(5,4),
  
  -- Focus metrics (for exposed users only)
  avg_focus_breaks_per_session NUMERIC(6,2),
  avg_focus_interventions_per_session NUMERIC(6,2),
  
  -- Computed at
  computed_at TIMESTAMPTZ NOT NULL,
  
  UNIQUE(date_key, experiment_key, variant_key)
);

CREATE INDEX IF NOT EXISTS idx_agg_metrics_experiment ON agg_experiment_metrics_daily(experiment_key);
CREATE INDEX IF NOT EXISTS idx_agg_metrics_date ON agg_experiment_metrics_daily(date_key);

-- ────────────────────────────────────────────────────────────────────────────────
-- VIEWS FOR ANALYSIS
-- ────────────────────────────────────────────────────────────────────────────────

-- Experiment overview
CREATE OR REPLACE VIEW v_experiment_overview AS
SELECT 
  e.experiment_name,
  e.display_name,
  e.scope,
  e.status,
  e.start_date,
  e.end_date,
  COUNT(DISTINCT f.exposure_id) as total_exposures,
  COUNT(DISTINCT f.tenant_key) as unique_tenants,
  COUNT(DISTINCT f.learner_key) FILTER (WHERE f.learner_key IS NOT NULL) as unique_learners,
  MIN(f.exposed_at) as first_exposure,
  MAX(f.exposed_at) as last_exposure
FROM dim_experiment e
LEFT JOIN fact_experiment_exposures f ON e.experiment_key = f.experiment_key
GROUP BY e.experiment_key, e.experiment_name, e.display_name, e.scope, e.status, e.start_date, e.end_date;

-- Variant comparison
CREATE OR REPLACE VIEW v_variant_comparison AS
SELECT 
  e.experiment_name,
  v.variant_name,
  v.allocation as expected_allocation,
  COUNT(f.exposure_id) as exposure_count,
  COUNT(DISTINCT COALESCE(f.learner_key, f.tenant_key)) as unique_subjects,
  COUNT(f.exposure_id)::DECIMAL / NULLIF(SUM(COUNT(f.exposure_id)) OVER (PARTITION BY e.experiment_key), 0) as actual_allocation
FROM dim_experiment e
JOIN dim_experiment_variant v ON e.experiment_key = v.experiment_key
LEFT JOIN fact_experiment_exposures f ON v.variant_key = f.variant_key
GROUP BY e.experiment_key, e.experiment_name, v.variant_key, v.variant_name, v.allocation;

-- Daily experiment metrics view
CREATE OR REPLACE VIEW v_experiment_metrics_daily AS
SELECT 
  d.full_date,
  e.experiment_name,
  v.variant_name,
  m.total_exposures,
  m.unique_tenants,
  m.unique_learners,
  m.sessions_count,
  m.avg_session_duration_seconds,
  m.avg_correct_rate,
  m.avg_focus_breaks_per_session
FROM agg_experiment_metrics_daily m
JOIN dim_date d ON m.date_key = d.date_key
JOIN dim_experiment e ON m.experiment_key = e.experiment_key
JOIN dim_experiment_variant v ON m.variant_key = v.variant_key;
