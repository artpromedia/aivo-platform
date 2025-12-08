-- Migration: Goals & Session Planning Data Model
-- Version: 20251208_001
-- Description: IEP-friendly, non-clinical model for teacher/therapist goals,
--              session planning, and progress tracking.
--
-- Design Philosophy:
-- - Goals represent high-level outcomes set by educators/therapists for learners
-- - Short-Term Objectives (STOs) break goals into measurable milestones
-- - Session Plans connect to goals and define concrete activities
-- - Progress Notes capture session outcomes and evidence
-- - All tables are multi-tenant with tenant_id for isolation
-- - skill_id links to Virtual Brain for alignment with mastery tracking
--
-- Integration Points:
-- - Virtual Brain: Goals/objectives can target specific skills
-- - Sessions: Session plans can be linked to session records
-- - Analytics: Progress notes feed into goal achievement dashboards

-- ══════════════════════════════════════════════════════════════════════════════
-- ENUMS
-- ══════════════════════════════════════════════════════════════════════════════

-- Domain enum for goal categorization
CREATE TYPE goal_domain AS ENUM (
  'ELA',       -- English Language Arts
  'MATH',      -- Mathematics
  'SCIENCE',   -- Science
  'SPEECH',    -- Speech & Language
  'SEL',       -- Social-Emotional Learning
  'OTHER'      -- Other domains
);

COMMENT ON TYPE goal_domain IS 'Academic/therapeutic domain for goal categorization. Aligns with skill domains.';

-- Goal status enum - lifecycle states
CREATE TYPE goal_status AS ENUM (
  'DRAFT',      -- Goal being drafted, not yet active
  'ACTIVE',     -- Goal is currently being worked on
  'ON_HOLD',    -- Goal temporarily paused
  'COMPLETED',  -- Goal achieved
  'ARCHIVED'    -- Goal no longer relevant, kept for history
);

COMMENT ON TYPE goal_status IS 'Lifecycle status of a goal.';

-- Objective status enum
CREATE TYPE objective_status AS ENUM (
  'NOT_STARTED',  -- Objective not yet begun
  'IN_PROGRESS',  -- Objective being worked on
  'MET',          -- Objective achieved
  'NOT_MET'       -- Objective not achieved within timeframe
);

COMMENT ON TYPE objective_status IS 'Status of a short-term objective.';

-- Session type for session plans (different from session_svc session_type)
CREATE TYPE session_plan_type AS ENUM (
  'LEARNING',   -- Academic learning session
  'THERAPY',    -- Therapy/intervention session
  'GROUP',      -- Group learning session
  'ASSESSMENT', -- Assessment/evaluation session
  'PRACTICE',   -- Practice/drill session
  'OTHER'       -- Other session types
);

COMMENT ON TYPE session_plan_type IS 'Type of planned session. Informs structure and activities.';

-- Session plan status enum
CREATE TYPE session_plan_status AS ENUM (
  'DRAFT',       -- Plan being created
  'PLANNED',     -- Plan finalized, not yet started
  'IN_PROGRESS', -- Session currently in progress
  'COMPLETED',   -- Session completed
  'CANCELLED'    -- Session cancelled
);

COMMENT ON TYPE session_plan_status IS 'Lifecycle status of a session plan.';

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLES
-- ══════════════════════════════════════════════════════════════════════════════

-- Goals table - high-level outcomes for learners
CREATE TABLE goals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL,
  learner_id          UUID NOT NULL,
  created_by_user_id  UUID NOT NULL,

  -- Goal definition
  title               TEXT NOT NULL,
  description         TEXT,
  domain              goal_domain NOT NULL,
  
  -- Skill alignment (optional - links to Virtual Brain)
  skill_id            UUID,

  -- Timeframe
  start_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  target_date         DATE,

  -- Status & progress
  status              goal_status NOT NULL DEFAULT 'DRAFT',
  progress_rating     SMALLINT CHECK (progress_rating >= 0 AND progress_rating <= 4),

  -- Extensibility
  metadata_json       JSONB DEFAULT '{}',

  -- Timestamps
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE goals IS 'Teacher/therapist-defined goals for learners. IEP-friendly but non-clinical.';
COMMENT ON COLUMN goals.skill_id IS 'Optional FK to skills table for Virtual Brain alignment.';
COMMENT ON COLUMN goals.progress_rating IS 'Overall progress: 0=Not Started, 1=Beginning, 2=Developing, 3=Approaching, 4=Met.';
COMMENT ON COLUMN goals.metadata_json IS 'Extensible metadata: standards tags, IEP references, etc.';

-- Goal Objectives table - short-term objectives (STOs) within goals
CREATE TABLE goal_objectives (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id             UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,

  -- Objective definition
  description         TEXT NOT NULL,
  success_criteria    TEXT,

  -- Status & progress
  status              objective_status NOT NULL DEFAULT 'NOT_STARTED',
  progress_rating     SMALLINT CHECK (progress_rating >= 0 AND progress_rating <= 4),

  -- Ordering within goal
  order_index         INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE goal_objectives IS 'Short-term objectives (STOs) that break goals into measurable milestones.';
COMMENT ON COLUMN goal_objectives.success_criteria IS 'Measurable criteria for determining when objective is met.';
COMMENT ON COLUMN goal_objectives.order_index IS 'Order of objectives within a goal (0-indexed).';

-- Session Plans table - planned activities for sessions
CREATE TABLE session_plans (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL,
  learner_id            UUID NOT NULL,
  created_by_user_id    UUID NOT NULL,

  -- Plan identification
  session_template_name TEXT,
  
  -- Scheduling
  scheduled_for         TIMESTAMPTZ,
  estimated_duration_minutes INTEGER,

  -- Classification
  session_type          session_plan_type NOT NULL DEFAULT 'LEARNING',
  status                session_plan_status NOT NULL DEFAULT 'DRAFT',

  -- Link to actual session (populated when session starts)
  session_id            UUID,

  -- Extensibility
  metadata_json         JSONB DEFAULT '{}',

  -- Timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE session_plans IS 'Planned sessions with activities aligned to goals and skills.';
COMMENT ON COLUMN session_plans.session_template_name IS 'Optional template name for reusable session patterns.';
COMMENT ON COLUMN session_plans.session_id IS 'FK to sessions table (session-svc) when plan is executed.';
COMMENT ON COLUMN session_plans.metadata_json IS 'Extensible: classroomId, location, groupMembers, etc.';

-- Session Plan Items table - individual activities within a plan
CREATE TABLE session_plan_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_plan_id       UUID NOT NULL REFERENCES session_plans(id) ON DELETE CASCADE,

  -- Ordering
  order_index           INTEGER NOT NULL DEFAULT 0,

  -- Goal/Skill alignment (all optional - at least one recommended)
  goal_id               UUID REFERENCES goals(id) ON DELETE SET NULL,
  goal_objective_id     UUID REFERENCES goal_objectives(id) ON DELETE SET NULL,
  skill_id              UUID,

  -- Activity definition
  activity_type         TEXT NOT NULL,
  activity_description  TEXT,
  estimated_duration_minutes INTEGER,

  -- AI/content metadata
  ai_metadata_json      JSONB DEFAULT '{}',

  -- Timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE session_plan_items IS 'Individual activities within a session plan.';
COMMENT ON COLUMN session_plan_items.activity_type IS 'Type: reading_passage, math_manipulatives, speech_drill, etc.';
COMMENT ON COLUMN session_plan_items.ai_metadata_json IS 'AI-generated content refs: learning_object_id, prompt templates, etc.';

-- Progress Notes table - session outcomes and evidence
CREATE TABLE progress_notes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL,
  learner_id            UUID NOT NULL,
  created_by_user_id    UUID NOT NULL,

  -- Session linkage (optional - notes can exist without session)
  session_id            UUID,
  session_plan_id       UUID REFERENCES session_plans(id) ON DELETE SET NULL,

  -- Goal/Objective linkage (optional)
  goal_id               UUID REFERENCES goals(id) ON DELETE SET NULL,
  goal_objective_id     UUID REFERENCES goal_objectives(id) ON DELETE SET NULL,

  -- Note content
  note_text             TEXT NOT NULL,
  rating                SMALLINT CHECK (rating >= 0 AND rating <= 4),
  
  -- Evidence
  evidence_uri          TEXT,

  -- Timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE progress_notes IS 'Progress notes capturing session outcomes and evidence.';
COMMENT ON COLUMN progress_notes.session_id IS 'FK to sessions table (session-svc) if note relates to a specific session.';
COMMENT ON COLUMN progress_notes.rating IS 'Performance rating: 0=Not Attempted, 1=Emerging, 2=Developing, 3=Proficient, 4=Advanced.';
COMMENT ON COLUMN progress_notes.evidence_uri IS 'URL to work sample, recording, or other evidence.';

-- ══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════════════════════════════════════

-- Goals indexes
CREATE INDEX idx_goals_tenant_learner_status ON goals(tenant_id, learner_id, status);
CREATE INDEX idx_goals_tenant_status ON goals(tenant_id, status);
CREATE INDEX idx_goals_learner_id ON goals(learner_id);
CREATE INDEX idx_goals_skill_id ON goals(skill_id) WHERE skill_id IS NOT NULL;
CREATE INDEX idx_goals_created_by ON goals(created_by_user_id);

-- Goal objectives indexes
CREATE INDEX idx_goal_objectives_goal_id ON goal_objectives(goal_id);
CREATE INDEX idx_goal_objectives_status ON goal_objectives(goal_id, status);

-- Session plans indexes
CREATE INDEX idx_session_plans_tenant_learner_status ON session_plans(tenant_id, learner_id, status);
CREATE INDEX idx_session_plans_tenant_scheduled ON session_plans(tenant_id, scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX idx_session_plans_session_id ON session_plans(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_session_plans_created_by ON session_plans(created_by_user_id);

-- Session plan items indexes
CREATE INDEX idx_session_plan_items_plan_id ON session_plan_items(session_plan_id);
CREATE INDEX idx_session_plan_items_goal_id ON session_plan_items(goal_id) WHERE goal_id IS NOT NULL;
CREATE INDEX idx_session_plan_items_skill_id ON session_plan_items(skill_id) WHERE skill_id IS NOT NULL;

-- Progress notes indexes
CREATE INDEX idx_progress_notes_tenant_learner_created ON progress_notes(tenant_id, learner_id, created_at DESC);
CREATE INDEX idx_progress_notes_session ON progress_notes(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_progress_notes_goal ON progress_notes(goal_id) WHERE goal_id IS NOT NULL;
CREATE INDEX idx_progress_notes_session_plan ON progress_notes(session_plan_id) WHERE session_plan_id IS NOT NULL;
CREATE INDEX idx_progress_notes_created_by ON progress_notes(created_by_user_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ══════════════════════════════════════════════════════════════════════════════

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
CREATE TRIGGER goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER goal_objectives_updated_at
  BEFORE UPDATE ON goal_objectives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER session_plans_updated_at
  BEFORE UPDATE ON session_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER session_plan_items_updated_at
  BEFORE UPDATE ON session_plan_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER progress_notes_updated_at
  BEFORE UPDATE ON progress_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ══════════════════════════════════════════════════════════════════════════════
-- COMMENTS ON RELATIONSHIPS
-- ══════════════════════════════════════════════════════════════════════════════

COMMENT ON INDEX idx_goals_skill_id IS 'Enables efficient lookup of goals by skill for Virtual Brain integration.';
COMMENT ON INDEX idx_session_plans_session_id IS 'Links session plans to executed sessions in session-svc.';
COMMENT ON INDEX idx_progress_notes_tenant_learner_created IS 'Optimized for "recent progress notes for learner" queries.';
