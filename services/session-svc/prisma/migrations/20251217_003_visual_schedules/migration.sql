-- ND-1.3: Visual Schedules System
-- Creates tables for visual schedules, templates, and preferences

-- ══════════════════════════════════════════════════════════════════════════════
-- ENUMS
-- ══════════════════════════════════════════════════════════════════════════════

-- Schedule type enum
CREATE TYPE "schedule_type" AS ENUM (
  'DAILY',
  'SESSION',
  'ACTIVITY',
  'CUSTOM'
);

-- Schedule display style enum
CREATE TYPE "schedule_display_style" AS ENUM (
  'VERTICAL_LIST',
  'HORIZONTAL_STRIP',
  'GRID',
  'FIRST_THEN',
  'NOW_NEXT_LATER'
);

-- ══════════════════════════════════════════════════════════════════════════════
-- VISUAL SCHEDULES TABLE
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE "visual_schedules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "learner_id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  
  -- Schedule info
  "date" DATE NOT NULL,
  "type" "schedule_type" NOT NULL DEFAULT 'DAILY',
  
  -- Items stored as JSONB array
  -- Each item: { id, title, type, status, scheduledTime, estimatedDuration, 
  --              activityId, icon, color, image, isFlexible, notes, symbolUrl, subItems }
  "items" JSONB NOT NULL,
  
  -- Customization
  "display_style" "schedule_display_style" NOT NULL DEFAULT 'VERTICAL_LIST',
  "show_times" BOOLEAN NOT NULL DEFAULT true,
  "show_duration" BOOLEAN NOT NULL DEFAULT true,
  "show_images" BOOLEAN NOT NULL DEFAULT true,
  "use_symbols" BOOLEAN NOT NULL DEFAULT false,
  
  -- Progress tracking
  "current_item_index" INTEGER NOT NULL DEFAULT 0,
  "completed_count" INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  "generated_by" TEXT,
  "is_template" BOOLEAN NOT NULL DEFAULT false,
  "template_id" UUID,
  
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT "visual_schedules_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one schedule per learner per date per type
CREATE UNIQUE INDEX "visual_schedules_learner_date_type_key" 
  ON "visual_schedules" ("learner_id", "date", "type");

-- Index for tenant queries
CREATE INDEX "idx_visual_schedules_tenant" 
  ON "visual_schedules" ("tenant_id");

-- Index for learner+date queries (most common lookup pattern)
CREATE INDEX "idx_visual_schedules_learner_date" 
  ON "visual_schedules" ("learner_id", "date");

-- ══════════════════════════════════════════════════════════════════════════════
-- SCHEDULE TEMPLATES TABLE
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE "schedule_templates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  
  -- Template info
  "name" TEXT NOT NULL,
  "description" TEXT,
  
  -- Template items (times are relative minutes from session start)
  "items" JSONB NOT NULL,
  
  -- Targeting
  "target_age_min" INTEGER,
  "target_age_max" INTEGER,
  "day_of_week" INTEGER[] NOT NULL DEFAULT '{}',
  
  -- Display settings
  "display_style" "schedule_display_style" NOT NULL DEFAULT 'VERTICAL_LIST',
  "show_times" BOOLEAN NOT NULL DEFAULT true,
  
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_by" UUID NOT NULL,
  
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT "schedule_templates_pkey" PRIMARY KEY ("id")
);

-- Index for tenant queries
CREATE INDEX "idx_schedule_templates_tenant" 
  ON "schedule_templates" ("tenant_id");

-- Index for finding default templates
CREATE INDEX "idx_schedule_templates_default" 
  ON "schedule_templates" ("tenant_id", "is_default") 
  WHERE "is_default" = true;

-- ══════════════════════════════════════════════════════════════════════════════
-- SCHEDULE PREFERENCES TABLE
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE "schedule_preferences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "learner_id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  
  -- Display preferences
  "preferred_style" "schedule_display_style" NOT NULL DEFAULT 'VERTICAL_LIST',
  "show_times" BOOLEAN NOT NULL DEFAULT true,
  "show_duration" BOOLEAN NOT NULL DEFAULT true,
  "show_images" BOOLEAN NOT NULL DEFAULT true,
  "use_symbols" BOOLEAN NOT NULL DEFAULT false,
  
  -- Timing preferences
  "show_countdown_to_next" BOOLEAN NOT NULL DEFAULT true,
  "warn_before_transition" BOOLEAN NOT NULL DEFAULT true,
  "transition_warning_minutes" INTEGER NOT NULL DEFAULT 2,
  
  -- Visual preferences
  "icon_size" TEXT NOT NULL DEFAULT 'medium',
  "color_coding" BOOLEAN NOT NULL DEFAULT true,
  "high_contrast" BOOLEAN NOT NULL DEFAULT false,
  
  -- Audio preferences
  "announce_items" BOOLEAN NOT NULL DEFAULT false,
  "play_chime_on_change" BOOLEAN NOT NULL DEFAULT true,
  
  -- Completion preferences
  "celebrate_completion" BOOLEAN NOT NULL DEFAULT true,
  "show_progress_bar" BOOLEAN NOT NULL DEFAULT true,
  
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT "schedule_preferences_pkey" PRIMARY KEY ("id")
);

-- One preferences record per learner
CREATE UNIQUE INDEX "schedule_preferences_learner_id_key" 
  ON "schedule_preferences" ("learner_id");

-- Index for tenant queries
CREATE INDEX "idx_schedule_preferences_tenant" 
  ON "schedule_preferences" ("tenant_id");

-- ══════════════════════════════════════════════════════════════════════════════
-- TRIGGER FOR UPDATED_AT
-- ══════════════════════════════════════════════════════════════════════════════

-- Function to auto-update updated_at (if not already exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_visual_schedules_updated_at
  BEFORE UPDATE ON "visual_schedules"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_templates_updated_at
  BEFORE UPDATE ON "schedule_templates"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_preferences_updated_at
  BEFORE UPDATE ON "schedule_preferences"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ══════════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE "visual_schedules" IS 'Visual schedules for neurodiverse learners - ND-1.3';
COMMENT ON TABLE "schedule_templates" IS 'Reusable schedule templates for teachers/parents';
COMMENT ON TABLE "schedule_preferences" IS 'Learner preferences for schedule display and behavior';

COMMENT ON COLUMN "visual_schedules"."items" IS 'JSON array of ScheduleItem objects with id, title, type, status, etc.';
COMMENT ON COLUMN "visual_schedules"."use_symbols" IS 'Whether to use AAC symbols instead of text';
COMMENT ON COLUMN "visual_schedules"."generated_by" IS 'Who created: system, teacher, parent, or user UUID';

COMMENT ON COLUMN "schedule_templates"."day_of_week" IS 'Days this template applies: 0=Sunday through 6=Saturday. Empty = all days';
COMMENT ON COLUMN "schedule_templates"."items" IS 'Template items with relative times in minutes from session start';

COMMENT ON COLUMN "schedule_preferences"."use_symbols" IS 'AAC mode for non-verbal learners';
COMMENT ON COLUMN "schedule_preferences"."icon_size" IS 'Icon size preference: small, medium, or large';
