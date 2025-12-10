-- ══════════════════════════════════════════════════════════════════════════════
-- Analytics Warehouse Schema
-- 
-- Star schema for analytics with dimension and fact tables.
-- This migration creates the warehouse tables used by ETL jobs.
-- ══════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════
-- DIMENSION TABLES
-- ════════════════════════════════════════════════════════════════════════════

-- Tenant dimension (SCD Type 2)
CREATE TABLE IF NOT EXISTS dim_tenant (
  tenant_key SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  tenant_name VARCHAR(255) NOT NULL,
  tenant_type VARCHAR(50) NOT NULL,
  district_id UUID,
  state VARCHAR(50),
  country VARCHAR(50) NOT NULL DEFAULT 'US',
  timezone VARCHAR(100) NOT NULL DEFAULT 'America/New_York',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMPTZ,
  is_current BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_dim_tenant_tenant_id ON dim_tenant(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dim_tenant_current ON dim_tenant(tenant_id) WHERE is_current = true;

-- Learner dimension (SCD Type 2)
CREATE TABLE IF NOT EXISTS dim_learner (
  learner_key SERIAL PRIMARY KEY,
  learner_id UUID NOT NULL,
  tenant_key INTEGER NOT NULL REFERENCES dim_tenant(tenant_key),
  grade_band VARCHAR(20) NOT NULL,
  grade_level INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMPTZ,
  is_current BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_dim_learner_learner_id ON dim_learner(learner_id);
CREATE INDEX IF NOT EXISTS idx_dim_learner_current ON dim_learner(learner_id) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_dim_learner_tenant ON dim_learner(tenant_key);

-- User dimension (SCD Type 2)
CREATE TABLE IF NOT EXISTS dim_user (
  user_key SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_key INTEGER NOT NULL REFERENCES dim_tenant(tenant_key),
  role VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMPTZ,
  is_current BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_dim_user_user_id ON dim_user(user_id);
CREATE INDEX IF NOT EXISTS idx_dim_user_current ON dim_user(user_id) WHERE is_current = true;

-- Subject dimension (static)
CREATE TABLE IF NOT EXISTS dim_subject (
  subject_key SERIAL PRIMARY KEY,
  subject_code VARCHAR(20) NOT NULL UNIQUE,
  subject_name VARCHAR(100) NOT NULL,
  description TEXT
);

-- Skill dimension
CREATE TABLE IF NOT EXISTS dim_skill (
  skill_key SERIAL PRIMARY KEY,
  skill_id UUID NOT NULL UNIQUE,
  subject_key INTEGER NOT NULL REFERENCES dim_subject(subject_key),
  skill_code VARCHAR(100) NOT NULL,
  skill_name VARCHAR(255) NOT NULL,
  description TEXT,
  grade_band VARCHAR(20),
  parent_skill_id UUID,
  depth INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_dim_skill_subject ON dim_skill(subject_key);
CREATE INDEX IF NOT EXISTS idx_dim_skill_parent ON dim_skill(parent_skill_id);

-- Date dimension (pre-populated)
CREATE TABLE IF NOT EXISTS dim_date (
  date_key INTEGER PRIMARY KEY, -- YYYYMMDD format
  full_date DATE NOT NULL UNIQUE,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL,
  month INTEGER NOT NULL,
  week INTEGER NOT NULL,
  day_of_year INTEGER NOT NULL,
  day_of_month INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,
  day_name VARCHAR(20) NOT NULL,
  month_name VARCHAR(20) NOT NULL,
  is_weekend BOOLEAN NOT NULL,
  is_school_day BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_dim_date_full ON dim_date(full_date);
CREATE INDEX IF NOT EXISTS idx_dim_date_year_month ON dim_date(year, month);

-- ════════════════════════════════════════════════════════════════════════════
-- FACT TABLES
-- ════════════════════════════════════════════════════════════════════════════

-- Session facts
CREATE TABLE IF NOT EXISTS fact_sessions (
  session_key SERIAL PRIMARY KEY,
  session_id UUID NOT NULL UNIQUE,
  date_key INTEGER NOT NULL,
  tenant_key INTEGER NOT NULL REFERENCES dim_tenant(tenant_key),
  learner_key INTEGER NOT NULL REFERENCES dim_learner(learner_key),
  session_type VARCHAR(50) NOT NULL,
  origin VARCHAR(50) NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  activities_assigned INTEGER NOT NULL DEFAULT 0,
  activities_completed INTEGER NOT NULL DEFAULT 0,
  activities_skipped INTEGER NOT NULL DEFAULT 0,
  correct_responses INTEGER NOT NULL DEFAULT 0,
  incorrect_responses INTEGER NOT NULL DEFAULT 0,
  hints_used INTEGER NOT NULL DEFAULT 0,
  focus_breaks_count INTEGER NOT NULL DEFAULT 0,
  focus_interventions_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fact_sessions_date ON fact_sessions(date_key);
CREATE INDEX IF NOT EXISTS idx_fact_sessions_tenant_date ON fact_sessions(tenant_key, date_key);
CREATE INDEX IF NOT EXISTS idx_fact_sessions_learner_date ON fact_sessions(learner_key, date_key);

-- Focus event facts
CREATE TABLE IF NOT EXISTS fact_focus_events (
  focus_event_key SERIAL PRIMARY KEY,
  event_id UUID NOT NULL UNIQUE,
  session_key INTEGER REFERENCES fact_sessions(session_key),
  date_key INTEGER NOT NULL,
  tenant_key INTEGER NOT NULL REFERENCES dim_tenant(tenant_key),
  learner_key INTEGER NOT NULL REFERENCES dim_learner(learner_key),
  event_type VARCHAR(50) NOT NULL,
  event_time TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER,
  intervention_type VARCHAR(100),
  intervention_completed BOOLEAN,
  focus_score NUMERIC(5,2)
);

CREATE INDEX IF NOT EXISTS idx_fact_focus_events_date ON fact_focus_events(date_key);
CREATE INDEX IF NOT EXISTS idx_fact_focus_events_learner ON fact_focus_events(learner_key, date_key);
CREATE INDEX IF NOT EXISTS idx_fact_focus_events_session ON fact_focus_events(session_key);

-- Homework event facts
CREATE TABLE IF NOT EXISTS fact_homework_events (
  homework_event_key SERIAL PRIMARY KEY,
  submission_id UUID NOT NULL UNIQUE,
  session_key INTEGER REFERENCES fact_sessions(session_key),
  date_key INTEGER NOT NULL,
  tenant_key INTEGER NOT NULL REFERENCES dim_tenant(tenant_key),
  learner_key INTEGER NOT NULL REFERENCES dim_learner(learner_key),
  subject VARCHAR(20) NOT NULL,
  grade_band VARCHAR(20) NOT NULL,
  step_count INTEGER NOT NULL DEFAULT 0,
  steps_completed INTEGER NOT NULL DEFAULT 0,
  hints_revealed INTEGER NOT NULL DEFAULT 0,
  correct_responses INTEGER NOT NULL DEFAULT 0,
  total_responses INTEGER NOT NULL DEFAULT 0,
  completion_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fact_homework_events_date ON fact_homework_events(date_key);
CREATE INDEX IF NOT EXISTS idx_fact_homework_events_learner ON fact_homework_events(learner_key, date_key);
CREATE INDEX IF NOT EXISTS idx_fact_homework_events_subject ON fact_homework_events(subject, date_key);

-- Learning progress facts (daily snapshot)
CREATE TABLE IF NOT EXISTS fact_learning_progress (
  progress_key SERIAL PRIMARY KEY,
  date_key INTEGER NOT NULL,
  tenant_key INTEGER NOT NULL REFERENCES dim_tenant(tenant_key),
  learner_key INTEGER NOT NULL REFERENCES dim_learner(learner_key),
  subject_key INTEGER NOT NULL REFERENCES dim_subject(subject_key),
  total_skills INTEGER NOT NULL DEFAULT 0,
  mastered_skills INTEGER NOT NULL DEFAULT 0,
  in_progress_skills INTEGER NOT NULL DEFAULT 0,
  not_started_skills INTEGER NOT NULL DEFAULT 0,
  average_mastery NUMERIC(5,4) NOT NULL DEFAULT 0,
  skills_gained_today INTEGER NOT NULL DEFAULT 0,
  practice_minutes_today INTEGER NOT NULL DEFAULT 0,
  snapshot_at TIMESTAMPTZ NOT NULL,
  
  UNIQUE(date_key, learner_key, subject_key)
);

CREATE INDEX IF NOT EXISTS idx_fact_learning_progress_date ON fact_learning_progress(date_key);
CREATE INDEX IF NOT EXISTS idx_fact_learning_progress_learner ON fact_learning_progress(learner_key, date_key);
CREATE INDEX IF NOT EXISTS idx_fact_learning_progress_tenant ON fact_learning_progress(tenant_key, date_key);

-- Recommendation event facts
CREATE TABLE IF NOT EXISTS fact_recommendation_events (
  recommendation_event_key SERIAL PRIMARY KEY,
  recommendation_id UUID NOT NULL UNIQUE,
  date_key INTEGER NOT NULL,
  tenant_key INTEGER NOT NULL REFERENCES dim_tenant(tenant_key),
  learner_key INTEGER NOT NULL REFERENCES dim_learner(learner_key),
  skill_key INTEGER REFERENCES dim_skill(skill_key),
  recommendation_type VARCHAR(50) NOT NULL,
  source VARCHAR(50) NOT NULL,
  was_accepted BOOLEAN,
  was_declined BOOLEAN,
  response_time_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fact_recommendation_events_date ON fact_recommendation_events(date_key);
CREATE INDEX IF NOT EXISTS idx_fact_recommendation_events_learner ON fact_recommendation_events(learner_key, date_key);

-- ════════════════════════════════════════════════════════════════════════════
-- ETL JOB TRACKING
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS etl_job_runs (
  id UUID PRIMARY KEY,
  job_name VARCHAR(100) NOT NULL,
  run_date DATE NOT NULL,
  target_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'RUNNING',
  rows_processed INTEGER NOT NULL DEFAULT 0,
  rows_inserted INTEGER NOT NULL DEFAULT 0,
  rows_updated INTEGER NOT NULL DEFAULT 0,
  rows_deleted INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_etl_job_runs_job_date ON etl_job_runs(job_name, target_date);
CREATE INDEX IF NOT EXISTS idx_etl_job_runs_started ON etl_job_runs(started_at DESC);

-- ════════════════════════════════════════════════════════════════════════════
-- DATE DIMENSION POPULATION
-- ════════════════════════════════════════════════════════════════════════════

-- Generate dates from 2020-01-01 to 2030-12-31
INSERT INTO dim_date (
  date_key, full_date, year, quarter, month, week, 
  day_of_year, day_of_month, day_of_week, 
  day_name, month_name, is_weekend, is_school_day
)
SELECT 
  TO_CHAR(d, 'YYYYMMDD')::INTEGER as date_key,
  d as full_date,
  EXTRACT(YEAR FROM d)::INTEGER as year,
  EXTRACT(QUARTER FROM d)::INTEGER as quarter,
  EXTRACT(MONTH FROM d)::INTEGER as month,
  EXTRACT(WEEK FROM d)::INTEGER as week,
  EXTRACT(DOY FROM d)::INTEGER as day_of_year,
  EXTRACT(DAY FROM d)::INTEGER as day_of_month,
  EXTRACT(DOW FROM d)::INTEGER as day_of_week,
  TO_CHAR(d, 'Day') as day_name,
  TO_CHAR(d, 'Month') as month_name,
  EXTRACT(DOW FROM d) IN (0, 6) as is_weekend,
  EXTRACT(DOW FROM d) NOT IN (0, 6) as is_school_day
FROM generate_series('2020-01-01'::date, '2030-12-31'::date, '1 day'::interval) d
ON CONFLICT (date_key) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE dim_tenant IS 'Tenant dimension with SCD Type 2 tracking';
COMMENT ON TABLE dim_learner IS 'Learner dimension with SCD Type 2 tracking';
COMMENT ON TABLE dim_user IS 'User dimension for teachers/parents/admins with SCD Type 2';
COMMENT ON TABLE dim_subject IS 'Subject dimension (ELA, MATH, SCIENCE, etc.)';
COMMENT ON TABLE dim_skill IS 'Skill dimension from curriculum';
COMMENT ON TABLE dim_date IS 'Date dimension for time-based analysis';
COMMENT ON TABLE fact_sessions IS 'Session-level aggregated facts';
COMMENT ON TABLE fact_focus_events IS 'Individual focus events for analysis';
COMMENT ON TABLE fact_homework_events IS 'Homework submission aggregated facts';
COMMENT ON TABLE fact_learning_progress IS 'Daily snapshot of learner progress by subject';
COMMENT ON TABLE fact_recommendation_events IS 'AI recommendation tracking';
COMMENT ON TABLE etl_job_runs IS 'ETL job execution history for monitoring';
