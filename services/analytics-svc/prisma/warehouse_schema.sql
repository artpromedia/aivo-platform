-- ═══════════════════════════════════════════════════════════════════════════════
-- ANALYTICS WAREHOUSE SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- Star schema for the Aivo analytics warehouse.
-- Separate from OLTP - optimized for analytical queries.
-- 
-- Naming conventions:
--   dim_*      = Dimension tables (SCD Type 2 unless noted)
--   fact_*     = Fact tables (immutable event records)
--   agg_*      = Pre-aggregated summary tables
--   v_*        = Views for common queries
--

-- ════════════════════════════════════════════════════════════════════════════════
-- DIMENSION: TIME
-- ════════════════════════════════════════════════════════════════════════════════
-- 
-- Pre-populated date dimension for efficient time-based joins and grouping.
-- date_key format: YYYYMMDD (e.g., 20250615)
-- Covers 10 years: 2020-01-01 through 2029-12-31
--

CREATE TABLE IF NOT EXISTS dim_time (
  date_key INTEGER PRIMARY KEY,         -- YYYYMMDD format
  full_date DATE NOT NULL UNIQUE,
  
  -- Day attributes
  day_of_week SMALLINT NOT NULL,        -- 0=Sunday, 6=Saturday
  day_of_week_name VARCHAR(10) NOT NULL,-- 'Sunday', 'Monday', etc.
  day_of_month SMALLINT NOT NULL,       -- 1-31
  day_of_year SMALLINT NOT NULL,        -- 1-366
  is_weekend BOOLEAN NOT NULL,
  is_weekday BOOLEAN NOT NULL,
  
  -- Week attributes
  week_of_year SMALLINT NOT NULL,       -- 1-53 (ISO week)
  iso_week_start DATE NOT NULL,         -- Monday of ISO week
  iso_week_end DATE NOT NULL,           -- Sunday of ISO week
  
  -- Month attributes
  month_of_year SMALLINT NOT NULL,      -- 1-12
  month_name VARCHAR(10) NOT NULL,      -- 'January', etc.
  month_name_short VARCHAR(3) NOT NULL, -- 'Jan', etc.
  month_start DATE NOT NULL,
  month_end DATE NOT NULL,
  days_in_month SMALLINT NOT NULL,
  
  -- Quarter attributes
  quarter SMALLINT NOT NULL,            -- 1-4
  quarter_name VARCHAR(2) NOT NULL,     -- 'Q1', 'Q2', etc.
  quarter_start DATE NOT NULL,
  quarter_end DATE NOT NULL,
  
  -- Year attributes
  year INTEGER NOT NULL,
  year_start DATE NOT NULL,
  year_end DATE NOT NULL,
  is_leap_year BOOLEAN NOT NULL,
  
  -- Academic calendar (US K-12)
  academic_year VARCHAR(9) NOT NULL,    -- '2024-2025' (Aug-Jul)
  academic_semester SMALLINT NOT NULL,  -- 1=Fall, 2=Spring
  is_summer_break BOOLEAN NOT NULL,     -- July (simplified)
  
  -- School calendar flags (tenant-configurable overrides in dim_tenant_calendar)
  is_us_federal_holiday BOOLEAN NOT NULL DEFAULT FALSE,
  us_holiday_name VARCHAR(50),
  
  -- Fiscal year (assuming calendar year aligned)
  fiscal_year INTEGER NOT NULL,
  fiscal_quarter SMALLINT NOT NULL,
  fiscal_month SMALLINT NOT NULL
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_dim_time_year_month ON dim_time(year, month_of_year);
CREATE INDEX IF NOT EXISTS idx_dim_time_academic ON dim_time(academic_year, academic_semester);
CREATE INDEX IF NOT EXISTS idx_dim_time_week ON dim_time(year, week_of_year);

-- ════════════════════════════════════════════════════════════════════════════════
-- DIMENSION: CONTENT
-- ════════════════════════════════════════════════════════════════════════════════
-- 
-- SCD Type 2 for learning content (activities, modules, assessments).
-- Tracks content versioning and changes over time.
--

CREATE TABLE IF NOT EXISTS dim_content (
  content_key SERIAL PRIMARY KEY,
  content_id UUID NOT NULL,              -- Business key
  content_version_id UUID,               -- Optional: specific version
  
  -- Content metadata
  title VARCHAR(500) NOT NULL,
  content_type VARCHAR(50) NOT NULL,     -- 'activity', 'module', 'assessment', 'lesson'
  subject VARCHAR(100),
  grade_band VARCHAR(20),                -- 'K5', 'G6_8', 'G9_12'
  
  -- Curriculum alignment
  skill_id UUID,
  skill_code VARCHAR(100),
  standard_codes TEXT[],                 -- Array of standard codes (CCSS, etc.)
  
  -- Content attributes
  difficulty_level VARCHAR(20),          -- 'easy', 'medium', 'hard', 'adaptive'
  estimated_duration_minutes INTEGER,
  question_count INTEGER,
  is_ai_generated BOOLEAN DEFAULT FALSE,
  
  -- Ownership
  created_by_tenant_id UUID,
  is_marketplace BOOLEAN DEFAULT FALSE,
  
  -- SCD Type 2 versioning
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Track source changes
  source_updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dim_content_current ON dim_content(content_id) WHERE is_current = TRUE;
CREATE INDEX IF NOT EXISTS idx_dim_content_type ON dim_content(content_type);
CREATE INDEX IF NOT EXISTS idx_dim_content_subject ON dim_content(subject);
CREATE INDEX IF NOT EXISTS idx_dim_content_skill ON dim_content(skill_id);

-- ════════════════════════════════════════════════════════════════════════════════
-- FACT: ACTIVITY EVENTS
-- ════════════════════════════════════════════════════════════════════════════════
-- 
-- Granular learner activity events (responses, completions, hints).
-- One row per learner action within a session.
--

CREATE TABLE IF NOT EXISTS fact_activity_event (
  event_key BIGSERIAL PRIMARY KEY,
  event_id UUID NOT NULL UNIQUE,         -- Deduplication key
  
  -- Dimension keys
  date_key INTEGER NOT NULL REFERENCES dim_time(date_key),
  tenant_key INTEGER NOT NULL REFERENCES dim_tenant(tenant_key),
  learner_key INTEGER NOT NULL REFERENCES dim_learner(learner_key),
  content_key INTEGER REFERENCES dim_content(content_key),
  session_key INTEGER REFERENCES fact_sessions(session_key),
  
  -- Event details
  event_type VARCHAR(50) NOT NULL,       -- 'response', 'hint_used', 'completed', 'skipped'
  
  -- Response details (nullable for non-response events)
  question_id UUID,
  is_correct BOOLEAN,
  response_time_ms INTEGER,
  attempt_number SMALLINT,
  
  -- Mastery signals
  pre_mastery_score NUMERIC(5,4),
  post_mastery_score NUMERIC(5,4),
  mastery_delta NUMERIC(5,4),
  
  -- AI involvement
  ai_hint_provided BOOLEAN DEFAULT FALSE,
  ai_explanation_provided BOOLEAN DEFAULT FALSE,
  
  -- Timing
  occurred_at TIMESTAMPTZ NOT NULL,
  
  -- Metadata
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_fact_activity_date ON fact_activity_event(date_key);
CREATE INDEX IF NOT EXISTS idx_fact_activity_tenant_date ON fact_activity_event(tenant_key, date_key);
CREATE INDEX IF NOT EXISTS idx_fact_activity_learner ON fact_activity_event(learner_key, date_key);
CREATE INDEX IF NOT EXISTS idx_fact_activity_content ON fact_activity_event(content_key);
CREATE INDEX IF NOT EXISTS idx_fact_activity_type ON fact_activity_event(event_type);
CREATE INDEX IF NOT EXISTS idx_fact_activity_occurred ON fact_activity_event(occurred_at);

-- ════════════════════════════════════════════════════════════════════════════════
-- FACT: AI USAGE
-- ════════════════════════════════════════════════════════════════════════════════
-- 
-- Tracks AI model invocations, tokens, costs, and latency.
-- Used for cost allocation, performance monitoring, and optimization.
--

CREATE TABLE IF NOT EXISTS fact_ai_usage (
  usage_key BIGSERIAL PRIMARY KEY,
  call_id UUID NOT NULL UNIQUE,          -- From ai_call_logs
  
  -- Dimension keys
  date_key INTEGER NOT NULL REFERENCES dim_time(date_key),
  tenant_key INTEGER NOT NULL REFERENCES dim_tenant(tenant_key),
  learner_key INTEGER REFERENCES dim_learner(learner_key),
  session_key INTEGER REFERENCES fact_sessions(session_key),
  
  -- AI context
  agent_type VARCHAR(50) NOT NULL,       -- 'homework-helper', 'tutor', 'explainer', etc.
  model_name VARCHAR(100) NOT NULL,      -- 'gpt-4o', 'claude-3-sonnet', etc.
  provider VARCHAR(50) NOT NULL,         -- 'openai', 'anthropic', 'azure'
  
  -- Usage metrics
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  
  -- Cost (in USD microdollars = $0.000001)
  cost_microdollars INTEGER NOT NULL,
  
  -- Performance
  latency_ms INTEGER NOT NULL,
  was_cached BOOLEAN DEFAULT FALSE,
  cache_hit_rate NUMERIC(5,4),
  
  -- Quality signals
  was_filtered BOOLEAN DEFAULT FALSE,    -- Safety filter triggered
  user_rating SMALLINT,                  -- 1-5 if rated
  feedback_type VARCHAR(20),             -- 'helpful', 'not_helpful', 'inappropriate'
  
  -- Timing
  called_at TIMESTAMPTZ NOT NULL,
  
  -- Feature area
  feature_area VARCHAR(50),              -- 'homework_help', 'lesson_generation', etc.
  
  -- Additional context
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_fact_ai_date ON fact_ai_usage(date_key);
CREATE INDEX IF NOT EXISTS idx_fact_ai_tenant_date ON fact_ai_usage(tenant_key, date_key);
CREATE INDEX IF NOT EXISTS idx_fact_ai_model ON fact_ai_usage(model_name);
CREATE INDEX IF NOT EXISTS idx_fact_ai_agent ON fact_ai_usage(agent_type);
CREATE INDEX IF NOT EXISTS idx_fact_ai_called ON fact_ai_usage(called_at);

-- ════════════════════════════════════════════════════════════════════════════════
-- FACT: BILLING
-- ════════════════════════════════════════════════════════════════════════════════
-- 
-- Billing and revenue tracking by tenant.
-- Used for financial reporting and subscription analytics.
--

CREATE TABLE IF NOT EXISTS fact_billing (
  billing_key BIGSERIAL PRIMARY KEY,
  invoice_id UUID NOT NULL UNIQUE,
  
  -- Dimension keys
  date_key INTEGER NOT NULL REFERENCES dim_time(date_key),
  tenant_key INTEGER NOT NULL REFERENCES dim_tenant(tenant_key),
  
  -- Billing period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Subscription details
  subscription_tier VARCHAR(50) NOT NULL, -- 'free', 'basic', 'premium', 'enterprise'
  billing_frequency VARCHAR(20) NOT NULL, -- 'monthly', 'annual'
  seat_count INTEGER,
  
  -- Amounts (in cents USD)
  base_amount_cents INTEGER NOT NULL,
  discount_amount_cents INTEGER DEFAULT 0,
  tax_amount_cents INTEGER DEFAULT 0,
  total_amount_cents INTEGER NOT NULL,
  
  -- Payment status
  payment_status VARCHAR(20) NOT NULL,   -- 'pending', 'paid', 'failed', 'refunded'
  payment_method VARCHAR(50),            -- 'credit_card', 'ach', 'po'
  
  -- Usage-based charges (if applicable)
  ai_overage_cents INTEGER DEFAULT 0,
  storage_overage_cents INTEGER DEFAULT 0,
  
  -- Dates
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  
  -- Source
  stripe_invoice_id VARCHAR(100),
  
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_fact_billing_date ON fact_billing(date_key);
CREATE INDEX IF NOT EXISTS idx_fact_billing_tenant ON fact_billing(tenant_key, date_key);
CREATE INDEX IF NOT EXISTS idx_fact_billing_status ON fact_billing(payment_status);
CREATE INDEX IF NOT EXISTS idx_fact_billing_tier ON fact_billing(subscription_tier);

-- ════════════════════════════════════════════════════════════════════════════════
-- AGGREGATED: DAILY PLATFORM METRICS
-- ════════════════════════════════════════════════════════════════════════════════
-- 
-- Pre-computed daily platform-wide metrics for executive dashboards.
--

CREATE TABLE IF NOT EXISTS agg_platform_metrics_daily (
  metric_key SERIAL PRIMARY KEY,
  date_key INTEGER NOT NULL UNIQUE REFERENCES dim_time(date_key),
  
  -- Platform usage
  active_tenants INTEGER NOT NULL DEFAULT 0,
  active_learners INTEGER NOT NULL DEFAULT 0,
  active_teachers INTEGER NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  total_session_minutes INTEGER NOT NULL DEFAULT 0,
  
  -- Learning metrics
  activities_completed INTEGER NOT NULL DEFAULT 0,
  avg_correct_rate NUMERIC(5,4),
  mastery_gains_count INTEGER DEFAULT 0,
  
  -- AI metrics
  ai_calls_count INTEGER NOT NULL DEFAULT 0,
  ai_tokens_total INTEGER NOT NULL DEFAULT 0,
  ai_cost_cents INTEGER NOT NULL DEFAULT 0,
  avg_ai_latency_ms NUMERIC(10,2),
  
  -- Revenue (daily invoiced)
  revenue_cents INTEGER DEFAULT 0,
  new_subscriptions INTEGER DEFAULT 0,
  churned_subscriptions INTEGER DEFAULT 0,
  
  -- Computed at
  computed_at TIMESTAMPTZ NOT NULL
);

-- ════════════════════════════════════════════════════════════════════════════════
-- ETL JOB TRACKING
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS etl_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(100) NOT NULL,
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_date DATE,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'RUNNING',  -- RUNNING, SUCCESS, FAILED, SKIPPED
  
  -- Metrics
  rows_processed INTEGER DEFAULT 0,
  rows_inserted INTEGER DEFAULT 0,
  rows_updated INTEGER DEFAULT 0,
  rows_deleted INTEGER DEFAULT 0,
  duration_ms INTEGER,
  
  -- Error handling
  error_message TEXT,
  error_stack TEXT,
  
  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Unique constraint for idempotency
  UNIQUE(job_name, target_date)
);

CREATE INDEX IF NOT EXISTS idx_etl_job_runs_status ON etl_job_runs(job_name, status);
CREATE INDEX IF NOT EXISTS idx_etl_job_runs_date ON etl_job_runs(run_date DESC);

-- ════════════════════════════════════════════════════════════════════════════════
-- RESEARCH EXPORT AUDIT
-- ════════════════════════════════════════════════════════════════════════════════
-- 
-- Audit log for all research data exports (FERPA/COPPA compliance).
-- Records who exported what data, when, and for what purpose.
--

CREATE TABLE IF NOT EXISTS research_export_audit (
  id SERIAL PRIMARY KEY,
  export_id UUID NOT NULL UNIQUE,
  
  -- Who requested
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  
  -- When
  requested_at TIMESTAMPTZ NOT NULL,
  
  -- What
  purpose TEXT NOT NULL,
  data_types TEXT[] NOT NULL,
  tenant_ids_requested UUID[] NOT NULL,
  date_range_from DATE NOT NULL,
  date_range_to DATE NOT NULL,
  row_count INTEGER NOT NULL,
  
  -- Compliance
  k_anonymity_passed BOOLEAN NOT NULL,
  irb_approval_number VARCHAR(100),
  
  -- Request metadata
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_research_audit_user ON research_export_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_research_audit_date ON research_export_audit(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_research_audit_passed ON research_export_audit(k_anonymity_passed);

-- ════════════════════════════════════════════════════════════════════════════════
-- VIEWS
-- ════════════════════════════════════════════════════════════════════════════════

-- Daily learner engagement view
CREATE OR REPLACE VIEW v_daily_learner_engagement AS
SELECT 
  t.full_date,
  ten.tenant_name,
  COUNT(DISTINCT s.learner_key) as active_learners,
  COUNT(s.session_key) as sessions,
  SUM(s.duration_seconds) / 60.0 as total_minutes,
  AVG(s.activities_completed) as avg_activities,
  AVG(CASE WHEN s.total_responses > 0 
      THEN s.correct_responses::DECIMAL / s.total_responses 
      ELSE NULL END) as avg_correct_rate
FROM dim_time t
JOIN fact_sessions s ON t.date_key = s.date_key
JOIN dim_tenant ten ON s.tenant_key = ten.tenant_key AND ten.is_current = TRUE
GROUP BY t.full_date, ten.tenant_name;

-- AI usage summary view
CREATE OR REPLACE VIEW v_ai_usage_summary AS
SELECT 
  t.full_date,
  ai.agent_type,
  ai.model_name,
  COUNT(*) as calls,
  SUM(ai.total_tokens) as tokens,
  SUM(ai.cost_microdollars) / 1000000.0 as cost_usd,
  AVG(ai.latency_ms) as avg_latency_ms,
  AVG(CASE WHEN ai.was_cached THEN 1 ELSE 0 END) as cache_hit_rate
FROM dim_time t
JOIN fact_ai_usage ai ON t.date_key = ai.date_key
GROUP BY t.full_date, ai.agent_type, ai.model_name;

-- Revenue by tier view
CREATE OR REPLACE VIEW v_revenue_by_tier AS
SELECT 
  t.full_date,
  b.subscription_tier,
  COUNT(DISTINCT b.tenant_key) as tenants,
  SUM(b.total_amount_cents) / 100.0 as revenue_usd,
  AVG(b.seat_count) as avg_seats
FROM dim_time t
JOIN fact_billing b ON t.date_key = b.date_key
WHERE b.payment_status = 'paid'
GROUP BY t.full_date, b.subscription_tier;
