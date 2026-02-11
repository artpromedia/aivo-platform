DO $$ BEGIN CREATE TYPE "SkillCategory" AS ENUM ('PERSONAL_HYGIENE', 'EATING_SKILLS', 'DRESSING', 'SAFETY_AWARENESS', 'SOCIAL_SKILLS', 'DAILY_ROUTINES', 'COMMUNITY_SKILLS', 'HOME_SKILLS', 'COMMUNICATION', 'MONEY_SKILLS', '@@map("skill_category")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "DifficultyLevel" AS ENUM ('FOUNDATIONAL', 'EMERGING', 'DEVELOPING', 'PROFICIENT', 'INDEPENDENT', '@@map("difficulty_level")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "ContentType" AS ENUM ('VIDEO', 'ANIMATION', 'IMAGE_SEQUENCE', 'SYMBOL_CARDS', 'AUDIO', 'TEXT', 'INTERACTIVE', '@@map("content_type")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "ProgressStatus" AS ENUM ('NOT_INTRODUCED', 'INTRODUCED', 'PROMPTED', 'PARTIAL', 'INDEPENDENT', 'GENERALIZED', '@@map("progress_status")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "PromptLevel" AS ENUM ('FULL_PHYSICAL', 'PARTIAL_PHYSICAL', 'MODELING', 'GESTURAL', 'VERBAL', 'VISUAL', 'INDEPENDENT', '@@map("prompt_level")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "SafetyScenarioType" AS ENUM ('ROAD_CROSSING', 'STRANGER_AWARENESS', 'EMERGENCY_RESPONSE', 'FIRE_SAFETY', 'WATER_SAFETY', 'ONLINE_SAFETY', 'BODY_SAFETY', 'HOME_SAFETY', '@@map("safety_scenario_type")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "DecisionOutcome" AS ENUM ('SAFE', 'UNSAFE', 'PARTIALLY_SAFE', '@@map("decision_outcome")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "life_skills" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "code" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "SkillCategory" NOT NULL,
    "difficulty_level" "DifficultyLevel" NOT NULL DEFAULT 'FOUNDATIONAL'::"DifficultyLevel",
    "prerequisite_ids" UUID[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "min_age_months" INTEGER,
    "max_age_months" INTEGER,
    "icon_url" TEXT,
    "cover_image_url" TEXT,
    "theme_color" TEXT,
    "estimated_minutes" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "is_system_skill" BOOLEAN NOT NULL DEFAULT TRUE,
    "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TaskAnalysis" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "skill_id" UUID NOT NULL UNIQUE,
    "total_steps" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "teaching_tips" TEXT,
    "materials_needed" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "setup_notes" TEXT,
    "reinforcement_ideas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "generalization_contexts" JSONB
);

CREATE TABLE IF NOT EXISTS "SkillStep" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "task_analysis_id" UUID NOT NULL,
    "step_number" INTEGER NOT NULL,
    "instruction" TEXT NOT NULL,
    "detailed_prompt" TEXT,
    "primary_content" "ContentType" NOT NULL DEFAULT 'IMAGE_SEQUENCE'::"ContentType",
    "image_url" TEXT,
    "video_url" TEXT,
    "animation_url" TEXT,
    "symbol_url" TEXT,
    "audio_url" TEXT,
    "ai_prompt_template" TEXT,
    "common_errors" JSONB
);

CREATE TABLE IF NOT EXISTS "safety_scenarios" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "code" TEXT NOT NULL UNIQUE,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "scenario_type" "SafetyScenarioType" NOT NULL,
    "min_age_months" INTEGER,
    "max_age_months" INTEGER,
    "difficulty_level" "DifficultyLevel" NOT NULL DEFAULT 'FOUNDATIONAL'::"DifficultyLevel",
    "scene_image_url" TEXT,
    "scene_video_url" TEXT,
    "scene_audio_url" TEXT,
    "scene_description" TEXT NOT NULL,
    "decision_prompt" TEXT NOT NULL,
    "ai_coaching_template" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "is_system_scenario" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "safety_choices" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "scenario_id" UUID NOT NULL,
    "choice_text" TEXT NOT NULL,
    "choice_image_url" TEXT,
    "choice_symbol_url" TEXT,
    "outcome" "DecisionOutcome" NOT NULL,
    "feedback_text" TEXT NOT NULL,
    "feedback_video_url" TEXT,
    "explanation" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "learner_skill_progress" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "status" "ProgressStatus" NOT NULL DEFAULT 'NOT_INTRODUCED'::"ProgressStatus",
    "steps_completed" INTEGER NOT NULL DEFAULT 0,
    "total_steps" INTEGER NOT NULL,
    "mastery_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "current_prompt_level" "PromptLevel" NOT NULL DEFAULT 'FULL_PHYSICAL'::"PromptLevel",
    "contexts_achieved" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "total_sessions" INTEGER NOT NULL DEFAULT 0,
    "total_minutes" INTEGER NOT NULL DEFAULT 0,
    "last_session_at" TIMESTAMPTZ,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "longest_streak" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "achieved_at" TIMESTAMPTZ,
    "generalized_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "step_progress" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "learner_progress_id" UUID NOT NULL,
    "step_id" UUID NOT NULL,
    "is_acquired" BOOLEAN NOT NULL DEFAULT FALSE,
    "acquisition_date" TIMESTAMPTZ,
    "last_prompt_level" "PromptLevel" NOT NULL DEFAULT 'FULL_PHYSICAL'::"PromptLevel",
    "total_attempts" INTEGER NOT NULL DEFAULT 0,
    "successful_attempts" INTEGER NOT NULL DEFAULT 0,
    "teacher_notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "skill_sessions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "learner_progress_id" UUID NOT NULL,
    "context" TEXT,
    "facilitator" TEXT,
    "facilitator_role" TEXT,
    "started_at" TIMESTAMPTZ NOT NULL,
    "ended_at" TIMESTAMPTZ,
    "duration_minutes" INTEGER,
    "steps_attempted" INTEGER NOT NULL DEFAULT 0,
    "steps_completed" INTEGER NOT NULL DEFAULT 0,
    "overall_prompt_level" "PromptLevel",
    "learner_mood" TEXT,
    "engagement_level" INTEGER,
    "ai_guidance_used" BOOLEAN NOT NULL DEFAULT FALSE,
    "ai_interaction_count" INTEGER NOT NULL DEFAULT 0,
    "session_notes" TEXT,
    "next_session_focus" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "step_attempts" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "step_number" INTEGER NOT NULL,
    "was_successful" BOOLEAN NOT NULL,
    "prompt_level" "PromptLevel" NOT NULL,
    "attempted_at" TIMESTAMPTZ NOT NULL,
    "duration_seconds" INTEGER,
    "error_type" TEXT,
    "error_notes" TEXT,
    "ai_prompt_given" TEXT,
    "ai_response_used" BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS "safety_attempts" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "scenario_id" UUID NOT NULL,
    "choice_id" UUID NOT NULL,
    "outcome" "DecisionOutcome" NOT NULL,
    "response_time_ms" INTEGER,
    "ai_guidance_given" TEXT,
    "ai_follow_up" TEXT,
    "attempted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "context" TEXT
);

CREATE TABLE IF NOT EXISTS "life_skill_goals" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "target_status" "ProgressStatus" NOT NULL DEFAULT 'INDEPENDENT'::"ProgressStatus",
    "target_prompt_level" "PromptLevel",
    "target_contexts" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "start_date" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "target_date" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "is_achieved" BOOLEAN NOT NULL DEFAULT FALSE,
    "achieved_at" TIMESTAMPTZ,
    "celebration_shown" BOOLEAN NOT NULL DEFAULT FALSE,
    "motivation_notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "goal_milestones" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "goal_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "target_date" TEXT,
    "is_complete" BOOLEAN NOT NULL DEFAULT FALSE,
    "completed_at" TIMESTAMPTZ,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ai_coaching_logs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "skill_id" UUID,
    "scenario_id" UUID,
    "session_id" UUID,
    "interaction_type" TEXT NOT NULL,
    "user_input" TEXT,
    "ai_response" TEXT NOT NULL,
    "was_helpful" BOOLEAN,
    "learner_reaction" TEXT,
    "response_time_ms" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "learner_skill_progress_learnerId_skillId_key" ON "learner_skill_progress" ("learnerId", "skillId");

CREATE UNIQUE INDEX IF NOT EXISTS "step_progress_learnerProgressId_stepId_key" ON "step_progress" ("learnerProgressId", "stepId");