-- ══════════════════════════════════════════════════════════════════════════════
-- ND-2.2: Predictability Enforcement in Sessions
-- Migration: Add predictability preferences, routines, and session structure
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── ENUMS ────────────────────────────────────────────────────────────────────

-- Routine types for predictable session structure
CREATE TYPE "routine_type" AS ENUM (
  'WELCOME',        -- Start of session
  'CHECKIN',        -- Emotional check-in
  'TRANSITION',     -- Between activities
  'BREAK',          -- Break routine
  'RETURN',         -- Return from break
  'GOODBYE',        -- End of session
  'CELEBRATION',    -- After achievement
  'CALMING'         -- When overwhelmed
);

-- Predictability event types for logging
CREATE TYPE "predictability_event_type" AS ENUM (
  'SESSION_START',
  'SESSION_END',
  'ACTIVITY_CHANGE',
  'UNEXPECTED_CHANGE',
  'ROUTINE_COMPLETED',
  'ROUTINE_SKIPPED',
  'BREAK_TAKEN',
  'CHANGE_EXPLAINED',
  'LEARNER_ANXIOUS',
  'PREDICTABILITY_RESTORED'
);

-- ─── TABLES ───────────────────────────────────────────────────────────────────

-- Predictability preferences per learner
CREATE TABLE "predictability_preferences" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "learner_id" UUID NOT NULL UNIQUE,
  "tenant_id" UUID NOT NULL,
  
  -- Core predictability settings
  "requires_predictable_flow" BOOLEAN NOT NULL DEFAULT false,
  "predictability_level" TEXT NOT NULL DEFAULT 'moderate', -- minimal, moderate, high, strict
  
  -- Session structure preferences
  "always_show_session_outline" BOOLEAN NOT NULL DEFAULT true,
  "show_estimated_durations" BOOLEAN NOT NULL DEFAULT true,
  "show_progress_indicator" BOOLEAN NOT NULL DEFAULT true,
  "announce_activity_changes" BOOLEAN NOT NULL DEFAULT true,
  
  -- Routine preferences
  "prefer_consistent_order" BOOLEAN NOT NULL DEFAULT true,
  "prefer_familiar_content" BOOLEAN NOT NULL DEFAULT false,
  "prefer_same_time_of_day" BOOLEAN NOT NULL DEFAULT false,
  "typical_session_time" TEXT, -- "09:00" preferred start time
  
  -- Transition preferences (links to transition system)
  "transition_warning_minutes" INTEGER NOT NULL DEFAULT 2,
  "require_transition_acknowledgment" BOOLEAN NOT NULL DEFAULT true,
  "show_first_then_board" BOOLEAN NOT NULL DEFAULT true,
  
  -- Surprise handling
  "allow_surprise_rewards" BOOLEAN NOT NULL DEFAULT false,
  "allow_dynamic_content" BOOLEAN NOT NULL DEFAULT false,
  "warn_before_new_content" BOOLEAN NOT NULL DEFAULT true,
  
  -- Change tolerance
  "max_unexpected_changes" INTEGER NOT NULL DEFAULT 1,
  "require_change_explanation" BOOLEAN NOT NULL DEFAULT true,
  
  -- Routine elements to include
  "include_welcome_routine" BOOLEAN NOT NULL DEFAULT true,
  "include_check_in_routine" BOOLEAN NOT NULL DEFAULT true,
  "include_goodbye_routine" BOOLEAN NOT NULL DEFAULT true,
  "include_break_routines" BOOLEAN NOT NULL DEFAULT true,
  
  -- Comfort elements
  "show_familiar_character" BOOLEAN NOT NULL DEFAULT true,
  "character_name" TEXT,
  "character_avatar_url" TEXT,
  
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_predictability_preferences_tenant" ON "predictability_preferences"("tenant_id");

-- Session routines (welcome, goodbye, breaks, etc.)
CREATE TABLE "session_routines" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  
  -- Routine info
  "name" TEXT NOT NULL,
  "type" routine_type NOT NULL,
  "description" TEXT,
  
  -- Routine steps (JSON array)
  -- [{ id, type, title, instruction, durationSeconds, mediaUrl, isSkippable, requiresInteraction }]
  "steps" JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Duration
  "total_duration_seconds" INTEGER NOT NULL DEFAULT 0,
  
  -- Targeting
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "target_age_min" INTEGER,
  "target_age_max" INTEGER,
  
  -- Customization
  "is_customizable" BOOLEAN NOT NULL DEFAULT true,
  
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_session_routines_tenant" ON "session_routines"("tenant_id");
CREATE INDEX "idx_session_routines_type" ON "session_routines"("type");
CREATE INDEX "idx_session_routines_default" ON "session_routines"("tenant_id", "type", "is_default") WHERE "is_default" = true;

-- Session structure templates
CREATE TABLE "session_structure_templates" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  
  -- Template info
  "name" TEXT NOT NULL,
  "description" TEXT,
  
  -- Structure definition (JSON)
  -- { welcome: { routineId, required }, checkin: {...}, mainContent: {...}, breaks: {...}, goodbye: {...} }
  "structure" JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Timing
  "target_duration_minutes" INTEGER NOT NULL DEFAULT 15,
  "flexibility_percent" INTEGER NOT NULL DEFAULT 20, -- How much time can vary
  
  -- Targeting
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_session_structure_templates_tenant" ON "session_structure_templates"("tenant_id");

-- Predictability event log
CREATE TABLE "session_predictability_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" UUID NOT NULL,
  "learner_id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  
  -- What happened
  "event_type" predictability_event_type NOT NULL,
  
  -- Details (JSON)
  -- { expectedActivity, actualActivity, reason, learnerResponse, etc. }
  "details" JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Was predictability maintained?
  "predictability_maintained" BOOLEAN NOT NULL DEFAULT true,
  "unexpected_change_count" INTEGER NOT NULL DEFAULT 0,
  
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_session_predictability_logs_session" ON "session_predictability_logs"("session_id");
CREATE INDEX "idx_session_predictability_logs_learner" ON "session_predictability_logs"("learner_id");
CREATE INDEX "idx_session_predictability_logs_tenant_time" ON "session_predictability_logs"("tenant_id", "timestamp" DESC);

-- Session plans (cached predictable session structure)
CREATE TABLE "session_plans" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" UUID NOT NULL UNIQUE,
  "learner_id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  
  -- Plan data (full predictable session plan as JSON)
  "plan_data" JSONB NOT NULL,
  
  -- Current state
  "current_phase" TEXT NOT NULL DEFAULT 'welcome', -- welcome, checkin, main, break, goodbye
  "current_activity_index" INTEGER NOT NULL DEFAULT -1,
  "unexpected_changes_count" INTEGER NOT NULL DEFAULT 0,
  
  -- Timing
  "estimated_total_minutes" INTEGER NOT NULL DEFAULT 0,
  "started_at" TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ,
  
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_session_plans_learner" ON "session_plans"("learner_id");
CREATE INDEX "idx_session_plans_tenant" ON "session_plans"("tenant_id");

-- ─── TRIGGER FOR updated_at ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_predictability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_predictability_preferences_updated_at
  BEFORE UPDATE ON "predictability_preferences"
  FOR EACH ROW EXECUTE FUNCTION update_predictability_updated_at();

CREATE TRIGGER trg_session_routines_updated_at
  BEFORE UPDATE ON "session_routines"
  FOR EACH ROW EXECUTE FUNCTION update_predictability_updated_at();

CREATE TRIGGER trg_session_structure_templates_updated_at
  BEFORE UPDATE ON "session_structure_templates"
  FOR EACH ROW EXECUTE FUNCTION update_predictability_updated_at();

CREATE TRIGGER trg_session_plans_updated_at
  BEFORE UPDATE ON "session_plans"
  FOR EACH ROW EXECUTE FUNCTION update_predictability_updated_at();

-- ─── COMMENTS ─────────────────────────────────────────────────────────────────

COMMENT ON TABLE "predictability_preferences" IS 'ND-2.2: Learner preferences for predictable session flow';
COMMENT ON TABLE "session_routines" IS 'ND-2.2: Reusable session routines (welcome, goodbye, breaks, etc.)';
COMMENT ON TABLE "session_structure_templates" IS 'ND-2.2: Templates for structured session flow';
COMMENT ON TABLE "session_predictability_logs" IS 'ND-2.2: Audit log for predictability events during sessions';
COMMENT ON TABLE "session_plans" IS 'ND-2.2: Cached predictable session plans for active sessions';
