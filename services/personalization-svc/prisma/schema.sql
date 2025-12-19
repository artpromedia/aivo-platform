-- ═══════════════════════════════════════════════════════════════════════════════
-- PERSONALIZATION SERVICE SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- Tables for storing personalization signals and decision logs.
-- Signals are derived from analytics data and feed into Virtual Brain 
-- and Lesson Planner agents.
--

-- ───────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ───────────────────────────────────────────────────────────────────────────────

CREATE TYPE signal_type AS ENUM (
  'ENGAGEMENT',
  'DIFFICULTY', 
  'FOCUS',
  'HOMEWORK',
  'MODULE_UPTAKE',
  'PREFERENCE',
  'PROGRESSION',
  'RECOMMENDATION'
);

CREATE TYPE signal_source AS ENUM (
  'ANALYTICS_ETL',
  'ONLINE',
  'TEACHER_OVERRIDE',
  'PARENT_INPUT',
  'ASSESSMENT'
);

CREATE TYPE decision_type AS ENUM (
  'CONTENT_SELECTION',
  'DIFFICULTY_ADJUSTMENT',
  'FOCUS_INTERVENTION',
  'SESSION_LENGTH_ADJUSTMENT',
  'SUBJECT_ROTATION',
  'BREAK_RECOMMENDATION'
);

CREATE TYPE decision_outcome AS ENUM (
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'IGNORED',
  'EXPIRED'
);

-- ───────────────────────────────────────────────────────────────────────────────
-- PERSONALIZATION_SIGNALS TABLE
-- ───────────────────────────────────────────────────────────────────────────────
-- 
-- Core table for storing computed signals. One row per learner/date/signal_key.
-- Signals are upserted daily by the signal generation job.
--

CREATE TABLE IF NOT EXISTS personalization_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Multi-tenancy
  tenant_id UUID NOT NULL,
  
  -- Learner reference
  learner_id UUID NOT NULL,
  
  -- Date of signal (date-partitioned for efficient querying)
  date DATE NOT NULL,
  
  -- Signal classification
  signal_type signal_type NOT NULL,
  signal_key VARCHAR(64) NOT NULL,
  
  -- Signal value (typed JSONB for flexibility)
  -- Schema varies by signal_type:
  -- - NumericSignalValue: { value, threshold, direction }
  -- - DifficultySignalValue: { domain, currentMastery, targetMastery, ... }
  -- - FocusSignalValue: { breaksPerSession, avgBreakDuration, ... }
  -- - ModuleUptakeSignalValue: { moduleId, uptakeRate, ... }
  signal_value JSONB NOT NULL,
  
  -- Confidence score (0.0-1.0)
  -- Based on sample size and data quality
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Source of the signal
  source signal_source NOT NULL,
  
  -- Additional context (e.g., sample sizes, raw values)
  metadata JSONB,
  
  -- Expiration for signal validity
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: one signal per learner/date/key
  CONSTRAINT uq_learner_date_signal UNIQUE (learner_id, date, signal_key)
);

-- Indexes for common query patterns
CREATE INDEX idx_signals_tenant_learner ON personalization_signals(tenant_id, learner_id);
CREATE INDEX idx_signals_learner_date ON personalization_signals(learner_id, date DESC);
CREATE INDEX idx_signals_type ON personalization_signals(signal_type);
CREATE INDEX idx_signals_expires ON personalization_signals(expires_at);
CREATE INDEX idx_signals_date ON personalization_signals(date DESC);

-- RLS policy (multi-tenant)
ALTER TABLE personalization_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY signals_tenant_isolation ON personalization_signals
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- ───────────────────────────────────────────────────────────────────────────────
-- PERSONALIZATION_DECISION_LOGS TABLE
-- ───────────────────────────────────────────────────────────────────────────────
-- 
-- Audit log for decisions made by agents based on signals.
-- Used for transparency, debugging, and feedback loop analysis.
--

CREATE TABLE IF NOT EXISTS personalization_decision_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Multi-tenancy
  tenant_id UUID NOT NULL,
  
  -- Learner reference
  learner_id UUID NOT NULL,
  
  -- Decision context
  session_id UUID,
  
  -- What type of decision was made
  decision_type decision_type NOT NULL,
  
  -- Which agent made the decision
  agent_name VARCHAR(64) NOT NULL,
  agent_version VARCHAR(32),
  
  -- Input signals that influenced the decision
  -- Array of signal_key values
  input_signal_keys VARCHAR(64)[] NOT NULL,
  
  -- Full input context (signals + other inputs)
  input_context JSONB NOT NULL,
  
  -- The decision output
  output_decision JSONB NOT NULL,
  
  -- Human-readable explanation
  reasoning TEXT NOT NULL,
  
  -- Decision outcome tracking
  outcome decision_outcome NOT NULL DEFAULT 'PENDING',
  outcome_recorded_at TIMESTAMPTZ,
  
  -- Optional feedback from learner/teacher
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  feedback_comment TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_decisions_tenant_learner ON personalization_decision_logs(tenant_id, learner_id);
CREATE INDEX idx_decisions_session ON personalization_decision_logs(session_id);
CREATE INDEX idx_decisions_type ON personalization_decision_logs(decision_type);
CREATE INDEX idx_decisions_agent ON personalization_decision_logs(agent_name);
CREATE INDEX idx_decisions_outcome ON personalization_decision_logs(outcome);
CREATE INDEX idx_decisions_created ON personalization_decision_logs(created_at DESC);

-- RLS policy
ALTER TABLE personalization_decision_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY decisions_tenant_isolation ON personalization_decision_logs
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- ───────────────────────────────────────────────────────────────────────────────
-- RECOMMENDATION_FEEDBACK TABLE
-- ───────────────────────────────────────────────────────────────────────────────
-- 
-- Tracks acceptance/rejection of recommendations for feedback loop.
-- Aggregated to compute acceptance rates by type, which become signals.
--

CREATE TABLE IF NOT EXISTS recommendation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Multi-tenancy
  tenant_id UUID NOT NULL,
  
  -- Learner reference
  learner_id UUID NOT NULL,
  
  -- Recommendation details
  recommendation_id UUID NOT NULL,
  recommendation_type VARCHAR(64) NOT NULL,
  
  -- What was recommended
  recommended_item_type VARCHAR(32) NOT NULL, -- 'content', 'activity', 'break', etc.
  recommended_item_id UUID,
  
  -- Outcome
  was_accepted BOOLEAN NOT NULL,
  was_explicitly_rejected BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Context
  session_id UUID,
  context_signals JSONB,
  
  -- Timing
  recommended_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  response_time_ms INTEGER,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rec_feedback_tenant_learner ON recommendation_feedback(tenant_id, learner_id);
CREATE INDEX idx_rec_feedback_type ON recommendation_feedback(recommendation_type);
CREATE INDEX idx_rec_feedback_accepted ON recommendation_feedback(was_accepted);
CREATE INDEX idx_rec_feedback_date ON recommendation_feedback(recommended_at DESC);

-- RLS policy
ALTER TABLE recommendation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY rec_feedback_tenant_isolation ON recommendation_feedback
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- ───────────────────────────────────────────────────────────────────────────────
-- THRESHOLD_OVERRIDES TABLE
-- ───────────────────────────────────────────────────────────────────────────────
-- 
-- Per-tenant or per-learner threshold customizations.
-- Allows districts/schools/teachers to tune signal generation.
--

CREATE TABLE IF NOT EXISTS threshold_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Scope of override
  tenant_id UUID NOT NULL,
  learner_id UUID, -- NULL means tenant-wide
  
  -- Which threshold
  threshold_key VARCHAR(64) NOT NULL,
  
  -- Override value
  threshold_value DECIMAL(10,4) NOT NULL,
  
  -- Reason for override
  reason TEXT,
  
  -- Who set it
  set_by_user_id UUID NOT NULL,
  
  -- Validity period
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_until TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint
  CONSTRAINT uq_threshold_scope UNIQUE (tenant_id, COALESCE(learner_id, '00000000-0000-0000-0000-000000000000'), threshold_key)
);

-- Indexes
CREATE INDEX idx_threshold_tenant ON threshold_overrides(tenant_id);
CREATE INDEX idx_threshold_learner ON threshold_overrides(learner_id) WHERE learner_id IS NOT NULL;
CREATE INDEX idx_threshold_key ON threshold_overrides(threshold_key);
CREATE INDEX idx_threshold_effective ON threshold_overrides(effective_from, effective_until);

-- RLS policy
ALTER TABLE threshold_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY threshold_tenant_isolation ON threshold_overrides
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- ───────────────────────────────────────────────────────────────────────────────
-- VIEWS
-- ───────────────────────────────────────────────────────────────────────────────

-- Active (non-expired) signals for a learner
CREATE OR REPLACE VIEW v_active_signals AS
SELECT 
  id,
  tenant_id,
  learner_id,
  date,
  signal_type,
  signal_key,
  signal_value,
  confidence,
  source,
  metadata,
  expires_at,
  created_at,
  updated_at
FROM personalization_signals
WHERE expires_at > NOW();

-- Recommendation acceptance rates by type (last 30 days)
CREATE OR REPLACE VIEW v_recommendation_acceptance_rates AS
SELECT
  tenant_id,
  learner_id,
  recommendation_type,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE was_accepted) as accepted_count,
  COUNT(*) FILTER (WHERE was_explicitly_rejected) as rejected_count,
  ROUND(
    COUNT(*) FILTER (WHERE was_accepted)::DECIMAL / NULLIF(COUNT(*), 0) * 100, 
    2
  ) as acceptance_rate_pct
FROM recommendation_feedback
WHERE recommended_at >= NOW() - INTERVAL '30 days'
GROUP BY tenant_id, learner_id, recommendation_type;

-- Decision outcome summary
CREATE OR REPLACE VIEW v_decision_outcomes AS
SELECT
  tenant_id,
  agent_name,
  decision_type,
  DATE_TRUNC('day', created_at) as decision_date,
  COUNT(*) as total_decisions,
  COUNT(*) FILTER (WHERE outcome = 'ACCEPTED') as accepted,
  COUNT(*) FILTER (WHERE outcome = 'DECLINED') as declined,
  COUNT(*) FILTER (WHERE outcome = 'IGNORED') as ignored,
  AVG(feedback_rating) FILTER (WHERE feedback_rating IS NOT NULL) as avg_rating
FROM personalization_decision_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY tenant_id, agent_name, decision_type, DATE_TRUNC('day', created_at);

-- ───────────────────────────────────────────────────────────────────────────────
-- FUNCTIONS
-- ───────────────────────────────────────────────────────────────────────────────

-- Function to get effective threshold (with override support)
CREATE OR REPLACE FUNCTION get_effective_threshold(
  p_tenant_id UUID,
  p_learner_id UUID,
  p_threshold_key VARCHAR(64),
  p_default_value DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
  v_override DECIMAL;
BEGIN
  -- Check learner-specific override first
  SELECT threshold_value INTO v_override
  FROM threshold_overrides
  WHERE tenant_id = p_tenant_id
    AND learner_id = p_learner_id
    AND threshold_key = p_threshold_key
    AND effective_from <= NOW()
    AND (effective_until IS NULL OR effective_until > NOW());
  
  IF v_override IS NOT NULL THEN
    RETURN v_override;
  END IF;
  
  -- Check tenant-wide override
  SELECT threshold_value INTO v_override
  FROM threshold_overrides
  WHERE tenant_id = p_tenant_id
    AND learner_id IS NULL
    AND threshold_key = p_threshold_key
    AND effective_from <= NOW()
    AND (effective_until IS NULL OR effective_until > NOW());
  
  IF v_override IS NOT NULL THEN
    RETURN v_override;
  END IF;
  
  -- Return default
  RETURN p_default_value;
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_signals_updated_at
  BEFORE UPDATE ON personalization_signals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_thresholds_updated_at
  BEFORE UPDATE ON threshold_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ───────────────────────────────────────────────────────────────────────────────
-- COMMENTS
-- ───────────────────────────────────────────────────────────────────────────────

COMMENT ON TABLE personalization_signals IS 'Derived signals about learner behavior patterns';
COMMENT ON TABLE personalization_decision_logs IS 'Audit trail of agent decisions based on signals';
COMMENT ON TABLE recommendation_feedback IS 'Tracks recommendation acceptance for feedback loop';
COMMENT ON TABLE threshold_overrides IS 'Per-tenant/learner threshold customizations';

COMMENT ON COLUMN personalization_signals.signal_value IS 'Typed JSONB - schema varies by signal_type';
COMMENT ON COLUMN personalization_signals.confidence IS 'Score 0-1 based on sample size and data quality';
COMMENT ON COLUMN personalization_decision_logs.reasoning IS 'Human-readable explanation of decision';

-- ═══════════════════════════════════════════════════════════════════════════════
-- MOTOR ACCOMMODATION SCHEMA - ND-3.3
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- Tables for motor profile management and interaction logging.
-- Supports learners with fine motor challenges, tremor, limited range of motion.
--

-- ───────────────────────────────────────────────────────────────────────────────
-- MOTOR ENUMS
-- ───────────────────────────────────────────────────────────────────────────────

CREATE TYPE motor_ability_level AS ENUM (
  'TYPICAL',
  'MILD_DIFFICULTY',
  'MODERATE_DIFFICULTY',
  'SIGNIFICANT_DIFFICULTY',
  'REQUIRES_FULL_SUPPORT'
);

CREATE TYPE haptic_intensity AS ENUM (
  'none',
  'light',
  'normal',
  'strong'
);

CREATE TYPE keyboard_type AS ENUM (
  'standard',
  'large',
  'split',
  'one_handed'
);

CREATE TYPE dwell_indicator_style AS ENUM (
  'circle',
  'shrink',
  'fill'
);

CREATE TYPE switch_access_mode AS ENUM (
  'auto_scan',
  'manual',
  'step_scan'
);

CREATE TYPE tremor_filter_algorithm AS ENUM (
  'moving_average',
  'kalman',
  'exponential'
);

-- ───────────────────────────────────────────────────────────────────────────────
-- MOTOR_PROFILES TABLE
-- ───────────────────────────────────────────────────────────────────────────────
--
-- Stores motor accommodation settings for learners with motor challenges.
-- One profile per learner, created on demand.
--

CREATE TABLE IF NOT EXISTS motor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id UUID NOT NULL UNIQUE,
  tenant_id UUID NOT NULL,
  
  -- Motor ability assessment
  fine_motor_level motor_ability_level NOT NULL DEFAULT 'TYPICAL',
  gross_motor_level motor_ability_level NOT NULL DEFAULT 'TYPICAL',
  
  -- Specific challenges
  has_tremor BOOLEAN NOT NULL DEFAULT FALSE,
  tremor_severity SMALLINT CHECK (tremor_severity >= 1 AND tremor_severity <= 10),
  has_limited_range BOOLEAN NOT NULL DEFAULT FALSE,
  limited_range_side VARCHAR(10) CHECK (limited_range_side IN ('left', 'right', 'both')),
  has_fatigue BOOLEAN NOT NULL DEFAULT FALSE,
  fatigue_threshold_minutes SMALLINT,
  
  -- Touch accommodations
  enlarged_touch_targets BOOLEAN NOT NULL DEFAULT FALSE,
  touch_target_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  touch_hold_duration SMALLINT NOT NULL DEFAULT 0,
  accidental_touch_filter BOOLEAN NOT NULL DEFAULT FALSE,
  edge_ignore_margin SMALLINT NOT NULL DEFAULT 0,
  
  -- Gesture accommodations
  simplified_gestures BOOLEAN NOT NULL DEFAULT FALSE,
  allow_single_finger_gestures BOOLEAN NOT NULL DEFAULT TRUE,
  disable_multi_touch BOOLEAN NOT NULL DEFAULT FALSE,
  disable_pinch_zoom BOOLEAN NOT NULL DEFAULT FALSE,
  disable_swipe BOOLEAN NOT NULL DEFAULT FALSE,
  swipe_distance_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  
  -- Drag & drop accommodations
  drag_assist_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  drag_snap_to_grid BOOLEAN NOT NULL DEFAULT FALSE,
  drag_grid_size SMALLINT NOT NULL DEFAULT 20,
  drag_auto_complete BOOLEAN NOT NULL DEFAULT FALSE,
  drag_auto_complete_threshold SMALLINT NOT NULL DEFAULT 30,
  
  -- Timing accommodations
  extended_response_time BOOLEAN NOT NULL DEFAULT FALSE,
  response_time_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  disable_timed_elements BOOLEAN NOT NULL DEFAULT FALSE,
  auto_advance_delay SMALLINT NOT NULL DEFAULT 0,
  
  -- Alternative input methods - Voice
  voice_input_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  voice_input_for_text BOOLEAN NOT NULL DEFAULT TRUE,
  voice_input_for_navigation BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Alternative input methods - Dwell selection
  dwell_selection_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  dwell_time_ms SMALLINT NOT NULL DEFAULT 1000,
  dwell_indicator_style dwell_indicator_style NOT NULL DEFAULT 'circle',
  
  -- Alternative input methods - Switch access
  switch_access_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  switch_access_mode switch_access_mode NOT NULL DEFAULT 'auto_scan',
  switch_scan_speed SMALLINT NOT NULL DEFAULT 1500,
  
  -- Handwriting alternatives
  prefer_typing BOOLEAN NOT NULL DEFAULT FALSE,
  prefer_voice_input BOOLEAN NOT NULL DEFAULT FALSE,
  prefer_multiple_choice BOOLEAN NOT NULL DEFAULT FALSE,
  show_word_prediction BOOLEAN NOT NULL DEFAULT TRUE,
  enlarged_keyboard BOOLEAN NOT NULL DEFAULT FALSE,
  keyboard_type keyboard_type NOT NULL DEFAULT 'standard',
  
  -- Visual feedback
  enhanced_touch_feedback BOOLEAN NOT NULL DEFAULT FALSE,
  haptic_feedback_intensity haptic_intensity NOT NULL DEFAULT 'normal',
  show_touch_ripples BOOLEAN NOT NULL DEFAULT TRUE,
  highlight_focused_element BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Tremor filtering
  tremor_filter_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  tremor_filter_strength SMALLINT NOT NULL DEFAULT 50 CHECK (tremor_filter_strength >= 0 AND tremor_filter_strength <= 100),
  tremor_filter_algorithm tremor_filter_algorithm NOT NULL DEFAULT 'moving_average',
  
  -- Fatigue management
  auto_break_reminders BOOLEAN NOT NULL DEFAULT FALSE,
  break_reminder_interval_minutes SMALLINT NOT NULL DEFAULT 15,
  reduce_requirements_on_fatigue BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Custom gestures
  custom_gestures JSONB,
  
  -- Metadata
  assessed_by VARCHAR(20) CHECK (assessed_by IN ('self', 'parent', 'therapist', 'ot')),
  assessed_at TIMESTAMPTZ,
  accommodation_notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for motor_profiles
CREATE INDEX idx_motor_profiles_tenant ON motor_profiles(tenant_id);
CREATE INDEX idx_motor_profiles_learner ON motor_profiles(learner_id);
CREATE INDEX idx_motor_profiles_fine_motor ON motor_profiles(fine_motor_level) WHERE fine_motor_level != 'TYPICAL';

-- ───────────────────────────────────────────────────────────────────────────────
-- MOTOR_INTERACTION_LOGS TABLE
-- ───────────────────────────────────────────────────────────────────────────────
--
-- Tracks motor interactions for analysis and accommodation optimization.
-- Used to suggest accommodation adjustments based on real usage patterns.
--

CREATE TABLE IF NOT EXISTS motor_interaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  session_id UUID,
  
  -- Interaction details
  interaction_type VARCHAR(20) NOT NULL CHECK (
    interaction_type IN ('tap', 'double_tap', 'long_press', 'drag', 'swipe', 'pinch', 'type', 'voice', 'dwell', 'switch')
  ),
  target_element VARCHAR(255),
  
  -- Performance metrics
  attempt_count SMALLINT NOT NULL DEFAULT 1,
  success_on_attempt SMALLINT,
  total_time_ms INTEGER,
  
  -- Accuracy metrics
  target_hit_accuracy DECIMAL(4,3) CHECK (target_hit_accuracy >= 0 AND target_hit_accuracy <= 1),
  drag_path_smoothness DECIMAL(4,3),
  
  -- Accommodations active during interaction
  accommodations_active TEXT[] NOT NULL DEFAULT '{}',
  
  -- Outcome
  successful BOOLEAN NOT NULL,
  used_alternative BOOLEAN NOT NULL DEFAULT FALSE,
  alternative_method VARCHAR(50),
  
  -- Timestamp
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for motor_interaction_logs
CREATE INDEX idx_motor_logs_learner ON motor_interaction_logs(learner_id);
CREATE INDEX idx_motor_logs_session ON motor_interaction_logs(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_motor_logs_type ON motor_interaction_logs(interaction_type);
CREATE INDEX idx_motor_logs_timestamp ON motor_interaction_logs(timestamp);
CREATE INDEX idx_motor_logs_failed ON motor_interaction_logs(learner_id, timestamp) 
  WHERE successful = FALSE;

-- Trigger for motor_profiles updated_at
CREATE TRIGGER trg_motor_profiles_updated_at
  BEFORE UPDATE ON motor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ───────────────────────────────────────────────────────────────────────────────
-- MOTOR SCHEMA COMMENTS
-- ───────────────────────────────────────────────────────────────────────────────

COMMENT ON TABLE motor_profiles IS 'Motor accommodation settings for learners with motor challenges - ND-3.3';
COMMENT ON TABLE motor_interaction_logs IS 'Motor interaction tracking for accommodation optimization';

COMMENT ON COLUMN motor_profiles.fine_motor_level IS 'Assessment of fine motor ability for touch interactions';
COMMENT ON COLUMN motor_profiles.touch_target_multiplier IS 'Multiplier for touch target sizes (1.0 = standard, 2.0 = double)';
COMMENT ON COLUMN motor_profiles.touch_hold_duration IS 'Required hold duration in ms (0 = standard tap)';
COMMENT ON COLUMN motor_profiles.dwell_time_ms IS 'Time to dwell before selection triggers';
COMMENT ON COLUMN motor_profiles.tremor_filter_strength IS 'Tremor filter intensity 0-100';
COMMENT ON COLUMN motor_profiles.assessed_by IS 'Who assessed the motor profile (self, parent, therapist, ot)';

COMMENT ON COLUMN motor_interaction_logs.target_hit_accuracy IS 'How close to center of target (0-1)';
COMMENT ON COLUMN motor_interaction_logs.drag_path_smoothness IS 'Smoothness metric for drag operations';
COMMENT ON COLUMN motor_interaction_logs.accommodations_active IS 'List of active accommodation IDs during interaction';