DO $$ BEGIN CREATE TYPE "FocusState" AS ENUM ('FOCUSED', 'DISTRACTED', 'DISENGAGED', 'ON_BREAK', 'AWAY', '@@map("focus_state")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "InterventionType" AS ENUM ('NONE', 'GENTLE_NUDGE', 'BREAK_SUGGESTION', 'REGULATION_BREAK', 'CONTENT_SWITCH', 'DIFFICULTY_ADJUST', '@@map("intervention_type")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "FocusLossReason" AS ENUM ('EXTENDED_IDLE', 'RAPID_SWITCHING', 'APP_BACKGROUNDED', 'MOOD_DECLINE', 'ERROR_FRUSTRATION', 'TIME_LIMIT', '@@map("focus_loss_reason")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "learner_focus_states" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL UNIQUE,
    "current_state" "FocusState" NOT NULL DEFAULT 'FOCUSED'::"FocusState",
    "session_id" UUID,
    "focus_score" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "consecutive_focused_pings" INTEGER NOT NULL DEFAULT 0,
    "consecutive_distracted_pings" INTEGER NOT NULL DEFAULT 0,
    "last_break_at" TIMESTAMPTZ,
    "breaks_taken_today" INTEGER NOT NULL DEFAULT 0,
    "last_ping_at" TIMESTAMPTZ NOT NULL,
    "last_interaction_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "focus_ping_logs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "focus_score" DOUBLE PRECISION NOT NULL,
    "is_on_task" BOOLEAN NOT NULL,
    "activity_id" UUID,
    "focus_loss_detected" BOOLEAN NOT NULL DEFAULT FALSE,
    "loss_reasons" "FocusLossReason"[] NOT NULL,
    "idle_time_ms" INTEGER,
    "interaction_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "FocusIntervention" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "intervention_type" "InterventionType" NOT NULL,
    "trigger_reasons" "FocusLossReason"[] NOT NULL,
    "triggered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "was_accepted" BOOLEAN,
    "focus_score_before" DOUBLE PRECISION,
    "focus_score_after" DOUBLE PRECISION,
    "regulation_activity_id" TEXT,
    "regulation_duration_ms" INTEGER,
    "metadataJson" JSONB
);

CREATE TABLE IF NOT EXISTS "break_sessions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "break_type" TEXT NOT NULL,
    "suggested_activity_id" TEXT,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ,
    "duration_ms" INTEGER,
    "pre_focus_score" DOUBLE PRECISION,
    "post_focus_score" DOUBLE PRECISION,
    "was_effective" BOOLEAN,
    "activity_completed" BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS "daily_focus_summaries" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "date" TEXT NOT NULL,
    "total_sessions_count" INTEGER NOT NULL DEFAULT 0,
    "total_session_duration_ms" BIGINT NOT NULL DEFAULT 0,
    "avg_focus_score" DOUBLE PRECISION,
    "focused_time_ms" BIGINT NOT NULL DEFAULT 0,
    "distracted_time_ms" BIGINT NOT NULL DEFAULT 0,
    "intervention_count" INTEGER NOT NULL DEFAULT 0,
    "breaks_count" INTEGER NOT NULL DEFAULT 0,
    "regulation_activities_count" INTEGER NOT NULL DEFAULT 0,
    "total_pings" INTEGER NOT NULL DEFAULT 0,
    "focus_loss_events" INTEGER NOT NULL DEFAULT 0,
    "focus_ratio" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "GameSession" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "game_id" TEXT NOT NULL,
    "game_title" TEXT NOT NULL,
    "game_category" TEXT NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ,
    "duration_seconds" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT FALSE,
    "score" INTEGER,
    "max_score" INTEGER,
    "returned_to_focus" BOOLEAN,
    "helpfulness_rating" INTEGER,
    "pre_focus_score" DOUBLE PRECISION,
    "post_focus_score" DOUBLE PRECISION,
    "metadataJson" JSONB
);

CREATE TABLE IF NOT EXISTS "learner_game_preferences" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL UNIQUE,
    "favorite_categories" TEXT[] NOT NULL,
    "completed_game_ids" TEXT[] NOT NULL,
    "total_games_played" INTEGER NOT NULL DEFAULT 0,
    "total_games_completed" INTEGER NOT NULL DEFAULT 0,
    "average_helpfulness" DOUBLE PRECISION,
    "last_played_game_id" TEXT,
    "last_played_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "reward_ledgers" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "total_xp" INTEGER NOT NULL DEFAULT 0,
    "total_coins" INTEGER NOT NULL DEFAULT 0,
    "current_level" INTEGER NOT NULL DEFAULT 1,
    "xp_to_next_level" INTEGER NOT NULL DEFAULT 100,
    "weekly_xp" INTEGER NOT NULL DEFAULT 0,
    "monthly_xp" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "reward_transactions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "xp_amount" INTEGER NOT NULL DEFAULT 0,
    "coin_amount" INTEGER NOT NULL DEFAULT 0,
    "source_id" TEXT,
    "source_type" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AchievementDefinition" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL UNIQUE,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "category" TEXT NOT NULL,
    "requirement" JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS "learner_achievements" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "achievement_code" TEXT NOT NULL,
    "current_progress" INTEGER NOT NULL DEFAULT 0,
    "target_progress" INTEGER NOT NULL,
    "progress_percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_completed" BOOLEAN NOT NULL DEFAULT FALSE,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "learner_streaks" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "current_daily_streak" INTEGER NOT NULL DEFAULT 0,
    "longest_daily_streak" INTEGER NOT NULL DEFAULT 0,
    "last_activity_date" TEXT,
    "games_played_today" INTEGER NOT NULL DEFAULT 0,
    "games_completed_today" INTEGER NOT NULL DEFAULT 0,
    "perfect_games_today" INTEGER NOT NULL DEFAULT 0,
    "week_start_date" TEXT,
    "games_this_week" INTEGER NOT NULL DEFAULT 0,
    "breaks_this_week" INTEGER NOT NULL DEFAULT 0,
    "consecutive_focus_days" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "daily_focus_summaries_tenantId_learnerId_date_key" ON "daily_focus_summaries" ("tenantId", "learnerId", "date");

CREATE UNIQUE INDEX IF NOT EXISTS "reward_ledgers_tenantId_learnerId_key" ON "reward_ledgers" ("tenantId", "learnerId");

CREATE UNIQUE INDEX IF NOT EXISTS "learner_achievements_tenantId_learnerId_achievementCode_key" ON "learner_achievements" ("tenantId", "learnerId", "achievementCode");

CREATE UNIQUE INDEX IF NOT EXISTS "learner_streaks_tenantId_learnerId_key" ON "learner_streaks" ("tenantId", "learnerId");