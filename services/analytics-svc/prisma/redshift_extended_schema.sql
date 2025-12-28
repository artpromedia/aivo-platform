-- ═══════════════════════════════════════════════════════════════════════════════
-- ANALYTICS WAREHOUSE SCHEMA - EXTENDED
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- Extended warehouse schema for comprehensive analytics
-- Includes fact tables for events, aggregations, and predictive analytics
-- 
-- AWS Redshift Optimized:
--   - DISTKEY on tenant_id for co-location
--   - SORTKEY on time columns for range scans
--   - Compression for storage efficiency
--

-- ════════════════════════════════════════════════════════════════════════════════
-- FACT: ANALYTICS EVENTS
-- ════════════════════════════════════════════════════════════════════════════════
-- 
-- Raw analytics events ingested from Kinesis
-- Append-only, immutable records
--

CREATE TABLE IF NOT EXISTS fact_analytics_events (
  event_id VARCHAR(36) PRIMARY KEY ENCODE ZSTD,
  
  -- Classification
  event_type VARCHAR(100) NOT NULL ENCODE ZSTD,
  event_category VARCHAR(50) NOT NULL ENCODE ZSTD,
  
  -- Dimensions
  tenant_id VARCHAR(36) NOT NULL ENCODE ZSTD,
  student_id VARCHAR(36) ENCODE ZSTD,
  class_id VARCHAR(36) ENCODE ZSTD,
  teacher_id VARCHAR(36) ENCODE ZSTD,
  session_id VARCHAR(36) ENCODE ZSTD,
  
  -- Content references
  lesson_id VARCHAR(36) ENCODE ZSTD,
  assessment_id VARCHAR(36) ENCODE ZSTD,
  question_id VARCHAR(36) ENCODE ZSTD,
  skill_id VARCHAR(36) ENCODE ZSTD,
  
  -- Event data (denormalized for query performance)
  score DECIMAL(5,2) ENCODE ZSTD,
  time_spent_seconds INTEGER ENCODE ZSTD,
  correct BOOLEAN ENCODE ZSTD,
  attempt_number SMALLINT ENCODE ZSTD,
  
  -- Full event data (for complex analysis)
  event_data SUPER ENCODE ZSTD,
  context SUPER ENCODE ZSTD,
  metadata SUPER ENCODE ZSTD,
  
  -- Timing
  event_timestamp TIMESTAMP NOT NULL ENCODE ZSTD,
  ingested_at TIMESTAMP DEFAULT GETDATE() ENCODE ZSTD,
  
  -- Partitioning
  date_key INTEGER NOT NULL ENCODE ZSTD
)
DISTSTYLE KEY
DISTKEY (tenant_id)
SORTKEY (tenant_id, event_timestamp);

-- ════════════════════════════════════════════════════════════════════════════════
-- FACT: SESSIONS
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fact_sessions (
  session_id VARCHAR(36) PRIMARY KEY ENCODE ZSTD,
  
  -- Dimensions
  tenant_id VARCHAR(36) NOT NULL ENCODE ZSTD,
  student_id VARCHAR(36) NOT NULL ENCODE ZSTD,
  class_id VARCHAR(36) ENCODE ZSTD,
  
  -- Session attributes
  session_type VARCHAR(50) ENCODE ZSTD,
  origin VARCHAR(50) ENCODE ZSTD,
  device_type VARCHAR(50) ENCODE ZSTD,
  platform VARCHAR(50) ENCODE ZSTD,
  app_version VARCHAR(50) ENCODE ZSTD,
  
  -- Timing
  started_at TIMESTAMP NOT NULL ENCODE ZSTD,
  ended_at TIMESTAMP ENCODE ZSTD,
  duration_minutes DECIMAL(10,2) ENCODE ZSTD,
  
  -- Activity summary
  page_views INTEGER DEFAULT 0 ENCODE ZSTD,
  interactions INTEGER DEFAULT 0 ENCODE ZSTD,
  lessons_started INTEGER DEFAULT 0 ENCODE ZSTD,
  lessons_completed INTEGER DEFAULT 0 ENCODE ZSTD,
  questions_answered INTEGER DEFAULT 0 ENCODE ZSTD,
  questions_correct INTEGER DEFAULT 0 ENCODE ZSTD,
  
  -- Engagement
  idle_time_minutes DECIMAL(10,2) ENCODE ZSTD,
  focus_breaks INTEGER DEFAULT 0 ENCODE ZSTD,
  
  -- Partitioning
  date_key INTEGER NOT NULL ENCODE ZSTD
)
DISTSTYLE KEY
DISTKEY (tenant_id)
SORTKEY (tenant_id, started_at);

-- ════════════════════════════════════════════════════════════════════════════════
-- FACT: SKILL MASTERY SNAPSHOTS
-- ════════════════════════════════════════════════════════════════════════════════
-- 
-- Daily snapshots of student skill mastery levels
-- Enables historical mastery tracking and growth analysis
--

CREATE TABLE IF NOT EXISTS fact_skill_mastery_snapshots (
  snapshot_id BIGINT IDENTITY(1,1) PRIMARY KEY,
  
  -- Dimensions
  date_key INTEGER NOT NULL ENCODE ZSTD,
  tenant_id VARCHAR(36) NOT NULL ENCODE ZSTD,
  student_id VARCHAR(36) NOT NULL ENCODE ZSTD,
  class_id VARCHAR(36) ENCODE ZSTD,
  skill_id VARCHAR(36) NOT NULL ENCODE ZSTD,
  
  -- Mastery metrics
  mastery_level DECIMAL(5,4) NOT NULL ENCODE ZSTD,  -- 0.0000 to 1.0000
  mastery_level_previous DECIMAL(5,4) ENCODE ZSTD,
  mastery_change DECIMAL(5,4) ENCODE ZSTD,
  
  -- Practice metrics
  total_attempts INTEGER DEFAULT 0 ENCODE ZSTD,
  correct_attempts INTEGER DEFAULT 0 ENCODE ZSTD,
  hints_used INTEGER DEFAULT 0 ENCODE ZSTD,
  time_spent_minutes DECIMAL(10,2) ENCODE ZSTD,
  
  -- Mastery indicators
  is_mastered BOOLEAN DEFAULT FALSE ENCODE ZSTD,
  mastered_at TIMESTAMP ENCODE ZSTD,
  days_to_mastery INTEGER ENCODE ZSTD,
  
  -- Snapshot timing
  snapshot_timestamp TIMESTAMP DEFAULT GETDATE() ENCODE ZSTD,
  
  UNIQUE (date_key, tenant_id, student_id, skill_id)
)
DISTSTYLE KEY
DISTKEY (tenant_id)
SORTKEY (tenant_id, date_key, student_id);

-- ════════════════════════════════════════════════════════════════════════════════
-- FACT: ASSESSMENT RESULTS
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fact_assessment_results (
  result_id VARCHAR(36) PRIMARY KEY ENCODE ZSTD,
  
  -- Dimensions
  tenant_id VARCHAR(36) NOT NULL ENCODE ZSTD,
  student_id VARCHAR(36) NOT NULL ENCODE ZSTD,
  class_id VARCHAR(36) ENCODE ZSTD,
  assessment_id VARCHAR(36) NOT NULL ENCODE ZSTD,
  attempt_id VARCHAR(36) NOT NULL ENCODE ZSTD,
  
  -- Assessment attributes
  assessment_type VARCHAR(50) ENCODE ZSTD,
  is_baseline BOOLEAN DEFAULT FALSE ENCODE ZSTD,
  attempt_number SMALLINT DEFAULT 1 ENCODE ZSTD,
  
  -- Results
  score DECIMAL(7,2) NOT NULL ENCODE ZSTD,
  max_score DECIMAL(7,2) NOT NULL ENCODE ZSTD,
  percentage_score DECIMAL(5,2) ENCODE ZSTD,
  passed BOOLEAN ENCODE ZSTD,
  passing_threshold DECIMAL(5,2) ENCODE ZSTD,
  
  -- Question breakdown
  questions_total INTEGER ENCODE ZSTD,
  questions_answered INTEGER ENCODE ZSTD,
  questions_correct INTEGER ENCODE ZSTD,
  questions_skipped INTEGER ENCODE ZSTD,
  
  -- Time metrics
  started_at TIMESTAMP NOT NULL ENCODE ZSTD,
  submitted_at TIMESTAMP ENCODE ZSTD,
  time_spent_minutes DECIMAL(10,2) ENCODE ZSTD,
  time_limit_minutes INTEGER ENCODE ZSTD,
  
  -- Skill results (denormalized JSON)
  skill_results SUPER ENCODE ZSTD,
  
  -- Partitioning
  date_key INTEGER NOT NULL ENCODE ZSTD
)
DISTSTYLE KEY
DISTKEY (tenant_id)
SORTKEY (tenant_id, submitted_at);

-- ════════════════════════════════════════════════════════════════════════════════
-- AGGREGATION: DAILY STUDENT METRICS
-- ════════════════════════════════════════════════════════════════════════════════
-- 
-- Pre-computed daily aggregates per student
-- Materialized nightly by ETL pipeline
--

CREATE TABLE IF NOT EXISTS agg_daily_student_metrics (
  metric_id BIGINT IDENTITY(1,1) PRIMARY KEY,
  
  -- Dimensions
  date_key INTEGER NOT NULL ENCODE ZSTD,
  tenant_id VARCHAR(36) NOT NULL ENCODE ZSTD,
  student_id VARCHAR(36) NOT NULL ENCODE ZSTD,
  class_id VARCHAR(36) ENCODE ZSTD,
  
  -- Session metrics
  session_count INTEGER DEFAULT 0 ENCODE ZSTD,
  total_time_minutes DECIMAL(10,2) DEFAULT 0 ENCODE ZSTD,
  active_time_minutes DECIMAL(10,2) DEFAULT 0 ENCODE ZSTD,
  
  -- Learning metrics
  lessons_started INTEGER DEFAULT 0 ENCODE ZSTD,
  lessons_completed INTEGER DEFAULT 0 ENCODE ZSTD,
  lesson_completion_rate DECIMAL(5,4) ENCODE ZSTD,
  average_lesson_score DECIMAL(5,2) ENCODE ZSTD,
  
  -- Question metrics
  questions_answered INTEGER DEFAULT 0 ENCODE ZSTD,
  questions_correct INTEGER DEFAULT 0 ENCODE ZSTD,
  accuracy DECIMAL(5,4) ENCODE ZSTD,
  
  -- Mastery metrics
  skills_practiced INTEGER DEFAULT 0 ENCODE ZSTD,
  skills_mastered INTEGER DEFAULT 0 ENCODE ZSTD,
  average_mastery_level DECIMAL(5,4) ENCODE ZSTD,
  mastery_growth DECIMAL(5,4) ENCODE ZSTD,
  
  -- Assessment metrics
  assessments_taken INTEGER DEFAULT 0 ENCODE ZSTD,
  assessments_passed INTEGER DEFAULT 0 ENCODE ZSTD,
  average_assessment_score DECIMAL(5,2) ENCODE ZSTD,
  
  -- Engagement metrics
  page_views INTEGER DEFAULT 0 ENCODE ZSTD,
  interactions INTEGER DEFAULT 0 ENCODE ZSTD,
  videos_watched INTEGER DEFAULT 0 ENCODE ZSTD,
  video_time_minutes DECIMAL(10,2) ENCODE ZSTD,
  
  -- Streaks
  login_streak_days INTEGER DEFAULT 0 ENCODE ZSTD,
  practice_streak_days INTEGER DEFAULT 0 ENCODE ZSTD,
  
  -- Gamification
  badges_earned INTEGER DEFAULT 0 ENCODE ZSTD,
  points_earned INTEGER DEFAULT 0 ENCODE ZSTD,
  
  -- Hints and scaffolding
  hints_used INTEGER DEFAULT 0 ENCODE ZSTD,
  scaffolding_shown INTEGER DEFAULT 0 ENCODE ZSTD,
  
  -- Computed at aggregation time
  computed_at TIMESTAMP DEFAULT GETDATE() ENCODE ZSTD,
  
  UNIQUE (date_key, tenant_id, student_id, class_id)
)
DISTSTYLE KEY
DISTKEY (tenant_id)
SORTKEY (tenant_id, date_key, student_id);

-- ════════════════════════════════════════════════════════════════════════════════
-- AGGREGATION: DAILY CLASS METRICS
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agg_daily_class_metrics (
  metric_id BIGINT IDENTITY(1,1) PRIMARY KEY,
  
  -- Dimensions
  date_key INTEGER NOT NULL ENCODE ZSTD,
  tenant_id VARCHAR(36) NOT NULL ENCODE ZSTD,
  class_id VARCHAR(36) NOT NULL ENCODE ZSTD,
  teacher_id VARCHAR(36) ENCODE ZSTD,
  
  -- Enrollment
  enrolled_students INTEGER DEFAULT 0 ENCODE ZSTD,
  active_students INTEGER DEFAULT 0 ENCODE ZSTD,
  participation_rate DECIMAL(5,4) ENCODE ZSTD,
  
  -- Session metrics
  total_sessions INTEGER DEFAULT 0 ENCODE ZSTD,
  total_time_minutes DECIMAL(12,2) DEFAULT 0 ENCODE ZSTD,
  average_session_minutes DECIMAL(10,2) ENCODE ZSTD,
  
  -- Learning metrics
  total_lessons_completed INTEGER DEFAULT 0 ENCODE ZSTD,
  average_completion_rate DECIMAL(5,4) ENCODE ZSTD,
  average_lesson_score DECIMAL(5,2) ENCODE ZSTD,
  
  -- Question metrics
  total_questions_answered INTEGER DEFAULT 0 ENCODE ZSTD,
  average_accuracy DECIMAL(5,4) ENCODE ZSTD,
  
  -- Mastery metrics
  average_mastery_level DECIMAL(5,4) ENCODE ZSTD,
  students_at_mastery INTEGER DEFAULT 0 ENCODE ZSTD,
  students_struggling INTEGER DEFAULT 0 ENCODE ZSTD,
  
  -- Assessment metrics
  total_assessments_taken INTEGER DEFAULT 0 ENCODE ZSTD,
  average_assessment_score DECIMAL(5,2) ENCODE ZSTD,
  assessment_pass_rate DECIMAL(5,4) ENCODE ZSTD,
  
  -- At-risk indicators
  at_risk_students INTEGER DEFAULT 0 ENCODE ZSTD,
  inactive_students INTEGER DEFAULT 0 ENCODE ZSTD,
  
  -- Score distribution
  students_0_50 INTEGER DEFAULT 0 ENCODE ZSTD,
  students_50_70 INTEGER DEFAULT 0 ENCODE ZSTD,
  students_70_90 INTEGER DEFAULT 0 ENCODE ZSTD,
  students_90_100 INTEGER DEFAULT 0 ENCODE ZSTD,
  
  -- Computed at aggregation time
  computed_at TIMESTAMP DEFAULT GETDATE() ENCODE ZSTD,
  
  UNIQUE (date_key, tenant_id, class_id)
)
DISTSTYLE KEY
DISTKEY (tenant_id)
SORTKEY (tenant_id, date_key, class_id);

-- ════════════════════════════════════════════════════════════════════════════════
-- AGGREGATION: SKILL PERFORMANCE
-- ════════════════════════════════════════════════════════════════════════════════
-- 
-- Aggregated skill performance at class level
-- Helps identify struggling skills and inform instruction
--

CREATE TABLE IF NOT EXISTS agg_skill_performance (
  metric_id BIGINT IDENTITY(1,1) PRIMARY KEY,
  
  -- Dimensions
  date_key INTEGER NOT NULL ENCODE ZSTD,
  tenant_id VARCHAR(36) NOT NULL ENCODE ZSTD,
  class_id VARCHAR(36) NOT NULL ENCODE ZSTD,
  skill_id VARCHAR(36) NOT NULL ENCODE ZSTD,
  
  -- Skill metadata (denormalized)
  skill_code VARCHAR(100) ENCODE ZSTD,
  skill_name VARCHAR(500) ENCODE ZSTD,
  subject VARCHAR(100) ENCODE ZSTD,
  grade_band VARCHAR(20) ENCODE ZSTD,
  
  -- Coverage
  students_exposed INTEGER DEFAULT 0 ENCODE ZSTD,
  students_practiced INTEGER DEFAULT 0 ENCODE ZSTD,
  students_mastered INTEGER DEFAULT 0 ENCODE ZSTD,
  
  -- Performance
  average_mastery_level DECIMAL(5,4) ENCODE ZSTD,
  mastery_rate DECIMAL(5,4) ENCODE ZSTD,
  average_accuracy DECIMAL(5,4) ENCODE ZSTD,
  
  -- Difficulty indicators
  average_attempts_to_mastery DECIMAL(10,2) ENCODE ZSTD,
  average_time_to_mastery_hours DECIMAL(10,2) ENCODE ZSTD,
  error_rate DECIMAL(5,4) ENCODE ZSTD,
  hint_usage_rate DECIMAL(5,4) ENCODE ZSTD,
  
  -- Trends
  mastery_growth_7d DECIMAL(5,4) ENCODE ZSTD,
  mastery_growth_30d DECIMAL(5,4) ENCODE ZSTD,
  
  -- Computed at aggregation time
  computed_at TIMESTAMP DEFAULT GETDATE() ENCODE ZSTD,
  
  UNIQUE (date_key, tenant_id, class_id, skill_id)
)
DISTSTYLE KEY
DISTKEY (tenant_id)
SORTKEY (tenant_id, date_key, class_id, skill_id);

-- ════════════════════════════════════════════════════════════════════════════════
-- AT-RISK STUDENT TRACKING
-- ════════════════════════════════════════════════════════════════════════════════
-- 
-- Daily computed at-risk indicators per student
-- Used for early intervention identification
--

CREATE TABLE IF NOT EXISTS analytics_at_risk_students (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  
  -- Dimensions
  date_key INTEGER NOT NULL ENCODE ZSTD,
  tenant_id VARCHAR(36) NOT NULL ENCODE ZSTD,
  student_id VARCHAR(36) NOT NULL ENCODE ZSTD,
  class_id VARCHAR(36) ENCODE ZSTD,
  
  -- Risk classification
  risk_level VARCHAR(20) NOT NULL ENCODE ZSTD,  -- 'low', 'medium', 'high', 'critical'
  risk_score DECIMAL(5,2) NOT NULL ENCODE ZSTD,  -- 0-100
  
  -- Risk factors (JSON for flexibility)
  risk_factors SUPER ENCODE ZSTD,
  
  -- Individual factor scores
  inactivity_score DECIMAL(5,2) ENCODE ZSTD,
  performance_score DECIMAL(5,2) ENCODE ZSTD,
  completion_score DECIMAL(5,2) ENCODE ZSTD,
  mastery_score DECIMAL(5,2) ENCODE ZSTD,
  engagement_score DECIMAL(5,2) ENCODE ZSTD,
  
  -- Key indicators
  days_inactive INTEGER ENCODE ZSTD,
  average_score DECIMAL(5,2) ENCODE ZSTD,
  completion_rate DECIMAL(5,4) ENCODE ZSTD,
  average_mastery DECIMAL(5,4) ENCODE ZSTD,
  
  -- Trend
  risk_trend VARCHAR(20) ENCODE ZSTD,  -- 'improving', 'stable', 'declining'
  risk_score_change_7d DECIMAL(5,2) ENCODE ZSTD,
  
  -- Recommendations (computed by ML model)
  recommendations SUPER ENCODE ZSTD,
  
  -- Intervention tracking
  intervention_needed BOOLEAN DEFAULT FALSE ENCODE ZSTD,
  intervention_type VARCHAR(100) ENCODE ZSTD,
  
  -- Computed at aggregation time
  computed_at TIMESTAMP DEFAULT GETDATE() ENCODE ZSTD,
  
  UNIQUE (date_key, tenant_id, student_id, class_id)
)
DISTSTYLE KEY
DISTKEY (tenant_id)
SORTKEY (tenant_id, date_key, risk_score DESC);

-- ════════════════════════════════════════════════════════════════════════════════
-- VIEWS
-- ════════════════════════════════════════════════════════════════════════════════

-- Recent events (last 7 days) for real-time dashboards
CREATE OR REPLACE VIEW v_recent_events AS
SELECT *
FROM fact_analytics_events
WHERE event_timestamp >= DATEADD(day, -7, GETDATE());

-- Active at-risk students (current)
CREATE OR REPLACE VIEW v_current_at_risk_students AS
SELECT *
FROM analytics_at_risk_students
WHERE date_key = (SELECT MAX(date_key) FROM analytics_at_risk_students)
  AND risk_level IN ('high', 'critical');

-- Student progress summary (latest metrics)
CREATE OR REPLACE VIEW v_student_progress_summary AS
SELECT 
  s.tenant_id,
  s.student_id,
  s.class_id,
  s.date_key,
  s.total_time_minutes,
  s.lessons_completed,
  s.lesson_completion_rate,
  s.average_lesson_score,
  s.accuracy,
  s.average_mastery_level,
  s.mastery_growth,
  s.login_streak_days,
  r.risk_level,
  r.risk_score
FROM agg_daily_student_metrics s
LEFT JOIN analytics_at_risk_students r 
  ON s.tenant_id = r.tenant_id 
  AND s.student_id = r.student_id 
  AND s.class_id = r.class_id
  AND s.date_key = r.date_key
WHERE s.date_key = (SELECT MAX(date_key) FROM agg_daily_student_metrics);

-- Class overview (latest metrics)
CREATE OR REPLACE VIEW v_class_overview AS
SELECT *
FROM agg_daily_class_metrics
WHERE date_key = (SELECT MAX(date_key) FROM agg_daily_class_metrics);

-- ════════════════════════════════════════════════════════════════════════════════
-- GRANTS
-- ════════════════════════════════════════════════════════════════════════════════

-- Read-only access for analytics service
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO analytics_readonly;

-- Write access for ETL pipeline
GRANT ALL ON ALL TABLES IN SCHEMA public TO analytics_etl;
GRANT ALL ON ALL TABLES IN SCHEMA analytics TO analytics_etl;
