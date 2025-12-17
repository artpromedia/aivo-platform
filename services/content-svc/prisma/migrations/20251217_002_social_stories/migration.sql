-- Migration: add-social-stories
-- ND-1.2: Social Stories Library & Content Service
-- Evidence-based visual narratives for neurodiverse learners

-- ══════════════════════════════════════════════════════════════════════════════
-- ENUMS
-- ══════════════════════════════════════════════════════════════════════════════

-- Social story category enum
CREATE TYPE "social_story_category" AS ENUM (
  'STARTING_LESSON',
  'ENDING_LESSON',
  'CHANGING_ACTIVITY',
  'UNEXPECTED_CHANGE',
  'TAKING_QUIZ',
  'TEST_TAKING',
  'RECEIVING_FEEDBACK',
  'ASKING_FOR_HELP',
  'ASKING_FOR_BREAK',
  'RAISING_HAND',
  'TALKING_TO_TEACHER',
  'FEELING_FRUSTRATED',
  'FEELING_OVERWHELMED',
  'FEELING_ANXIOUS',
  'CALMING_DOWN',
  'CELEBRATING_SUCCESS',
  'STAYING_ON_TASK',
  'IGNORING_DISTRACTIONS',
  'WAITING_TURN',
  'USING_DEVICE',
  'TECHNICAL_PROBLEM',
  'WORKING_WITH_PEERS',
  'SHARING_MATERIALS',
  'RESPECTFUL_DISAGREEMENT',
  'SENSORY_BREAK',
  'MOVEMENT_BREAK',
  'QUIET_SPACE',
  'FIRE_DRILL',
  'LOCKDOWN',
  'FEELING_UNSAFE',
  'CUSTOM'
);

-- Reading level enum
CREATE TYPE "social_story_reading_level" AS ENUM (
  'PRE_READER',
  'EARLY_READER',
  'DEVELOPING',
  'INTERMEDIATE'
);

-- Visual style enum
CREATE TYPE "social_story_visual_style" AS ENUM (
  'PHOTOGRAPHS',
  'REALISTIC_ART',
  'CARTOON',
  'SIMPLE_ICONS',
  'ABSTRACT'
);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLES
-- ══════════════════════════════════════════════════════════════════════════════

-- Main social stories table
CREATE TABLE "social_stories" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" "social_story_category" NOT NULL,
  "pages" JSONB NOT NULL DEFAULT '[]',
  "reading_level" "social_story_reading_level" NOT NULL DEFAULT 'DEVELOPING',
  "estimated_duration" INTEGER NOT NULL DEFAULT 60,
  "min_age" INTEGER,
  "max_age" INTEGER,
  "grade_bands" "learning_object_grade_band"[] DEFAULT '{}',
  "supports_personalization" BOOLEAN NOT NULL DEFAULT true,
  "personalization_tokens" TEXT[] DEFAULT '{}',
  "default_visual_style" "social_story_visual_style" NOT NULL DEFAULT 'CARTOON',
  "has_audio" BOOLEAN NOT NULL DEFAULT false,
  "has_video" BOOLEAN NOT NULL DEFAULT false,
  "accessibility_features" JSONB NOT NULL DEFAULT '{}',
  "translations" JSONB NOT NULL DEFAULT '{}',
  "is_built_in" BOOLEAN NOT NULL DEFAULT false,
  "source_template" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_approved" BOOLEAN NOT NULL DEFAULT false,
  "approved_by_user_id" UUID,
  "approved_at" TIMESTAMPTZ,
  "created_by_user_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "social_stories_pkey" PRIMARY KEY ("id")
);

-- Learner story preferences
CREATE TABLE "learner_story_preferences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "learner_id" UUID NOT NULL,
  "preferred_visual_style" "social_story_visual_style" NOT NULL DEFAULT 'CARTOON',
  "preferred_reading_level" "social_story_reading_level" NOT NULL DEFAULT 'DEVELOPING',
  "enable_audio" BOOLEAN NOT NULL DEFAULT true,
  "enable_tts" BOOLEAN NOT NULL DEFAULT true,
  "tts_voice" TEXT,
  "tts_speed" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "auto_advance" BOOLEAN NOT NULL DEFAULT false,
  "page_display_time" INTEGER NOT NULL DEFAULT 10,
  "character_name" TEXT,
  "favorite_color" TEXT,
  "interests" TEXT[] DEFAULT '{}',
  "high_contrast" BOOLEAN NOT NULL DEFAULT false,
  "large_text" BOOLEAN NOT NULL DEFAULT false,
  "reduced_motion" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "learner_story_preferences_pkey" PRIMARY KEY ("id")
);

-- Social story views for analytics
CREATE TABLE "social_story_views" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "story_id" UUID NOT NULL,
  "learner_id" UUID NOT NULL,
  "session_id" UUID,
  "trigger_type" TEXT NOT NULL,
  "trigger_context" JSONB NOT NULL DEFAULT '{}',
  "pages_viewed" INTEGER NOT NULL DEFAULT 0,
  "total_pages" INTEGER NOT NULL,
  "completed_at" TIMESTAMPTZ,
  "duration_seconds" INTEGER,
  "replay_count" INTEGER NOT NULL DEFAULT 0,
  "audio_played" BOOLEAN NOT NULL DEFAULT false,
  "interactions" JSONB NOT NULL DEFAULT '[]',
  "pre_emotional_state" TEXT,
  "post_emotional_state" TEXT,
  "helpfulness_rating" INTEGER,
  "viewed_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "social_story_views_pkey" PRIMARY KEY ("id")
);

-- Story assignments from teachers/parents
CREATE TABLE "social_story_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "story_id" UUID NOT NULL,
  "learner_id" UUID NOT NULL,
  "assigned_by_user_id" UUID NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "is_required" BOOLEAN NOT NULL DEFAULT false,
  "show_before" TEXT[] DEFAULT '{}',
  "show_after" TEXT[] DEFAULT '{}',
  "scheduled_times" JSONB NOT NULL DEFAULT '[]',
  "max_daily_views" INTEGER,
  "min_hours_between" DOUBLE PRECISION,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "expires_at" TIMESTAMPTZ,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "social_story_assignments_pkey" PRIMARY KEY ("id")
);

-- ══════════════════════════════════════════════════════════════════════════════
-- UNIQUE CONSTRAINTS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE UNIQUE INDEX "social_stories_slug_key" ON "social_stories"("slug");
CREATE UNIQUE INDEX "social_stories_tenant_id_slug_key" ON "social_stories"("tenant_id", "slug");
CREATE UNIQUE INDEX "learner_story_preferences_learner_id_key" ON "learner_story_preferences"("learner_id");
CREATE UNIQUE INDEX "social_story_assignments_story_id_learner_id_key" ON "social_story_assignments"("story_id", "learner_id");

-- ══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════════════════════════════════════

-- Social stories indexes
CREATE INDEX "social_stories_tenant_category_active_idx" ON "social_stories"("tenant_id", "category", "is_active");
CREATE INDEX "social_stories_tenant_active_reading_level_idx" ON "social_stories"("tenant_id", "is_active", "reading_level");
CREATE INDEX "social_stories_category_builtin_active_idx" ON "social_stories"("category", "is_built_in", "is_active");

-- Story views indexes
CREATE INDEX "social_story_views_learner_viewed_at_idx" ON "social_story_views"("learner_id", "viewed_at" DESC);
CREATE INDEX "social_story_views_story_viewed_at_idx" ON "social_story_views"("story_id", "viewed_at" DESC);
CREATE INDEX "social_story_views_learner_story_idx" ON "social_story_views"("learner_id", "story_id");

-- Assignments indexes
CREATE INDEX "social_story_assignments_learner_active_idx" ON "social_story_assignments"("learner_id", "is_active");
CREATE INDEX "social_story_assignments_learner_active_priority_idx" ON "social_story_assignments"("learner_id", "is_active", "priority" DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- FOREIGN KEYS
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE "social_story_views" 
  ADD CONSTRAINT "social_story_views_story_id_fkey" 
  FOREIGN KEY ("story_id") REFERENCES "social_stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "social_story_assignments" 
  ADD CONSTRAINT "social_story_assignments_story_id_fkey" 
  FOREIGN KEY ("story_id") REFERENCES "social_stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ══════════════════════════════════════════════════════════════════════════════
-- TRIGGERS FOR updated_at
-- ══════════════════════════════════════════════════════════════════════════════

-- Function to update timestamp (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_social_stories_updated_at
  BEFORE UPDATE ON "social_stories"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learner_story_preferences_updated_at
  BEFORE UPDATE ON "learner_story_preferences"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_story_assignments_updated_at
  BEFORE UPDATE ON "social_story_assignments"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ══════════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE "social_stories" IS 'Evidence-based visual narratives for neurodiverse learners following Carol Gray''s Social Stories framework';
COMMENT ON TABLE "learner_story_preferences" IS 'Individual learner preferences for social story presentation and accessibility';
COMMENT ON TABLE "social_story_views" IS 'Analytics tracking for social story engagement and effectiveness';
COMMENT ON TABLE "social_story_assignments" IS 'Teacher/parent assigned stories for specific learners with scheduling';
