-- Migration: Create Sessions and Session Events tables
-- Version: 20241208_001
-- Description: Unified session & event model for tracking all learner activity
--
-- Design Philosophy:
-- - Sessions represent coherent blocks of learner activity (learning, homework, etc.)
-- - Events are append-only records within sessions for full audit trail
-- - Denormalized tenant_id/learner_id on events for efficient queries
-- - JSONB metadata fields for extensibility without schema changes
--
-- Integration Points:
-- - Mobile Learner app: LEARNING, BASELINE, PRACTICE sessions
-- - Homework Helper: HOMEWORK sessions with step-by-step events
-- - Focus/Regulation engine: Focus events within any session type
-- - Virtual Brain: Consumes SKILL_MASTERY_UPDATED events
-- - Analytics: Aggregates all event types for dashboards

-- ══════════════════════════════════════════════════════════════════════════════
-- ENUMS
-- ══════════════════════════════════════════════════════════════════════════════

-- Session type enum - represents the primary purpose of the activity block
CREATE TYPE session_type AS ENUM (
  'LEARNING',     -- Today's Plan / daily practice
  'HOMEWORK',     -- Homework Helper sessions
  'BASELINE',     -- Baseline assessment sessions
  'PRACTICE',     -- Free practice / skill drill
  'SEL',          -- Social-emotional learning sessions
  'ASSESSMENT'    -- Other assessments (not baseline)
);

COMMENT ON TYPE session_type IS 'Primary purpose of a learning session. Extensible for future agent types.';

-- Session origin enum - where/how the session was initiated
CREATE TYPE session_origin AS ENUM (
  'MOBILE_LEARNER',   -- Learner using mobile app
  'WEB_LEARNER',      -- Learner using web app
  'TEACHER_LED',      -- Teacher-initiated classroom session
  'HOMEWORK_HELPER',  -- Triggered by Homework Helper agent
  'PARENT_APP',       -- Parent-initiated session
  'SYSTEM'            -- System-generated (e.g., scheduled practice)
);

COMMENT ON TYPE session_origin IS 'Origin of session initiation. Important for analytics segmentation.';

-- Event type enum - organized by category for easier querying
CREATE TYPE session_event_type AS ENUM (
  -- Session Lifecycle
  'SESSION_STARTED',
  'SESSION_PAUSED',
  'SESSION_RESUMED',
  'SESSION_ENDED',
  'SESSION_ABANDONED',

  -- Activity Events
  'ACTIVITY_STARTED',
  'ACTIVITY_COMPLETED',
  'ACTIVITY_SKIPPED',
  'ACTIVITY_RESPONSE_SUBMITTED',

  -- Homework Helper Events
  'HOMEWORK_CAPTURED',
  'HOMEWORK_PARSED',
  'HOMEWORK_STEP_STARTED',
  'HOMEWORK_STEP_COMPLETED',
  'HOMEWORK_HINT_REQUESTED',
  'HOMEWORK_SOLUTION_SHOWN',

  -- Focus & Regulation Events
  'FOCUS_LOSS_DETECTED',
  'FOCUS_BREAK_STARTED',
  'FOCUS_BREAK_ENDED',
  'FOCUS_INTERVENTION_SHOWN',
  'FOCUS_INTERVENTION_COMPLETED',

  -- Skill & Mastery Events
  'SKILL_MASTERY_UPDATED',
  'SKILL_UNLOCKED',

  -- Engagement Events
  'REWARD_EARNED',
  'STREAK_MILESTONE',
  'ACHIEVEMENT_UNLOCKED'
);

COMMENT ON TYPE session_event_type IS 'Discrete event types within sessions. Organized by category for analytics.';

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLES
-- ══════════════════════════════════════════════════════════════════════════════

-- Sessions table - top-level container for learner activity
CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  learner_id    UUID NOT NULL,
  session_type  session_type NOT NULL,
  origin        session_origin NOT NULL,

  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at      TIMESTAMPTZ NULL,  -- NULL until session completes
  duration_ms   INTEGER NULL,      -- Computed on completion for query efficiency

  -- Flexible metadata without schema changes. Examples:
  -- LEARNING: { "planId": "uuid", "targetSkills": ["SKL001"], "classroomId": "uuid" }
  -- HOMEWORK: { "homeworkSubject": "math", "grade": 5, "problemCount": 10 }
  -- BASELINE: { "baselineProfileId": "uuid", "baselineAttemptId": "uuid", "gradeBand": "K5" }
  metadata_json JSONB NULL,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Foreign key constraints to core tables
  -- Note: These assume learners and tenants tables exist in the same database
  -- If using separate databases, remove these constraints and enforce at app level
  -- CONSTRAINT fk_sessions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  -- CONSTRAINT fk_sessions_learner FOREIGN KEY (learner_id) REFERENCES learners(id),

  -- Ensure duration is positive when set
  CONSTRAINT chk_sessions_duration CHECK (duration_ms IS NULL OR duration_ms >= 0)
);

COMMENT ON TABLE sessions IS 'Top-level container for coherent blocks of learner activity. Primary unit for analytics.';
COMMENT ON COLUMN sessions.duration_ms IS 'Computed on completion: ended_at - started_at. Stored for query efficiency.';
COMMENT ON COLUMN sessions.metadata_json IS 'Session-type-specific context. Schema varies by session_type.';

-- Session events table - discrete occurrences within a session
CREATE TABLE session_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL,      -- Denormalized for efficient queries
  learner_id    UUID NOT NULL,      -- Denormalized for efficient queries
  event_type    session_event_type NOT NULL,
  event_time    TIMESTAMPTZ NOT NULL,  -- Actual time of occurrence

  -- Event-specific metadata. Schema depends on event_type. Examples:
  -- ACTIVITY_COMPLETED: { "activityId": "uuid", "skillCode": "SKL001", "score": 0.85, "durationMs": 45000 }
  -- HOMEWORK_STEP_COMPLETED: { "stepIndex": 2, "correct": true, "hintUsed": false }
  -- FOCUS_LOSS_DETECTED: { "focusScore": 0.3, "idleSeconds": 45, "trigger": "gaze_away" }
  -- SKILL_MASTERY_UPDATED: { "skillCode": "SKL001", "previousMastery": 0.6, "newMastery": 0.72 }
  metadata_json JSONB NULL,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE session_events IS 'Append-only event log within sessions. Forms audit trail for all learning activity.';
COMMENT ON COLUMN session_events.tenant_id IS 'Denormalized from session for efficient multi-tenant queries.';
COMMENT ON COLUMN session_events.learner_id IS 'Denormalized from session for efficient learner-centric queries.';
COMMENT ON COLUMN session_events.event_time IS 'Actual occurrence time (may differ from created_at for batch inserts).';

-- ══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════════════════════════════════════

-- Sessions indexes
CREATE INDEX idx_sessions_learner_recent ON sessions (tenant_id, learner_id, started_at DESC);
COMMENT ON INDEX idx_sessions_learner_recent IS 'Primary lookup: recent sessions for a learner.';

CREATE INDEX idx_sessions_type_recent ON sessions (tenant_id, session_type, started_at DESC);
COMMENT ON INDEX idx_sessions_type_recent IS 'Filter sessions by type for analytics dashboards.';

CREATE INDEX idx_sessions_incomplete ON sessions (tenant_id, learner_id, ended_at) WHERE ended_at IS NULL;
COMMENT ON INDEX idx_sessions_incomplete IS 'Find incomplete sessions for resume functionality.';

-- Session events indexes
CREATE INDEX idx_events_session_timeline ON session_events (session_id, event_time ASC);
COMMENT ON INDEX idx_events_session_timeline IS 'Event timeline within a session (session detail view).';

CREATE INDEX idx_events_learner_history ON session_events (tenant_id, learner_id, event_time DESC);
COMMENT ON INDEX idx_events_learner_history IS 'Learner event history for analytics and Virtual Brain.';

CREATE INDEX idx_events_type_recent ON session_events (tenant_id, event_type, event_time DESC);
COMMENT ON INDEX idx_events_type_recent IS 'Filter events by type for specific analytics queries.';

-- GIN index for JSONB metadata queries (optional but useful for analytics)
CREATE INDEX idx_sessions_metadata ON sessions USING GIN (metadata_json) WHERE metadata_json IS NOT NULL;
CREATE INDEX idx_events_metadata ON session_events USING GIN (metadata_json) WHERE metadata_json IS NOT NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ══════════════════════════════════════════════════════════════════════════════

-- Auto-update updated_at on sessions
CREATE OR REPLACE FUNCTION update_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_sessions_updated_at();

-- Auto-compute duration_ms when ended_at is set
CREATE OR REPLACE FUNCTION compute_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
    NEW.duration_ms = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at)) * 1000;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sessions_compute_duration
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION compute_session_duration();
