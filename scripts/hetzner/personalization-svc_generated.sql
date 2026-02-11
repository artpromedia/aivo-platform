DO $$ BEGIN CREATE TYPE "SignalType" AS ENUM ('ENGAGEMENT', 'DIFFICULTY', 'FOCUS', 'HOMEWORK', 'MODULE_UPTAKE', 'PREFERENCE', 'PROGRESSION', 'RECOMMENDATION', '@@map("signal_type")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "SignalSource" AS ENUM ('ANALYTICS_ETL', 'ONLINE', 'TEACHER_OVERRIDE', 'PARENT_INPUT', 'ASSESSMENT', '@@map("signal_source")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "DecisionType" AS ENUM ('CONTENT_SELECTION', 'DIFFICULTY_ADJUSTMENT', 'FOCUS_INTERVENTION', 'SESSION_LENGTH_ADJUSTMENT', 'SUBJECT_ROTATION', 'BREAK_RECOMMENDATION', '@@map("decision_type")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "DecisionOutcome" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'IGNORED', 'EXPIRED', '@@map("decision_outcome")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "MotorAbilityLevel" AS ENUM ('TYPICAL', 'MILD_DIFFICULTY', 'MODERATE_DIFFICULTY', 'SIGNIFICANT_DIFFICULTY', 'REQUIRES_FULL_SUPPORT', '@@map("motor_ability_level")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "HapticIntensity" AS ENUM ('none', 'light', 'normal', 'strong', '@@map("haptic_intensity")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "KeyboardType" AS ENUM ('standard', 'large', 'split', 'one_handed', '@@map("keyboard_type")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "DwellIndicatorStyle" AS ENUM ('circle', 'shrink', 'fill', '@@map("dwell_indicator_style")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "SwitchAccessMode" AS ENUM ('auto_scan', 'manual', 'step_scan', '@@map("switch_access_mode")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "TremorFilterAlgorithm" AS ENUM ('moving_average', 'kalman', 'exponential', '@@map("tremor_filter_algorithm")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "personalization_signals" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "date" TEXT NOT NULL,
    "signal_type" "SignalType" NOT NULL,
    "signal_key" VARCHAR(64) NOT NULL,
    "signal_value" JSONB NOT NULL,
    "confidence" DECIMAL NOT NULL,
    "source" "SignalSource" NOT NULL,
    "metadata" JSONB,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "personalization_decision_logs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "session_id" UUID,
    "decision_type" "DecisionType" NOT NULL,
    "agent_name" VARCHAR(64) NOT NULL,
    "agent_version" VARCHAR(32),
    "input_signal_keys" VARCHAR(64)[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "input_context" JSONB NOT NULL,
    "output_decision" JSONB NOT NULL,
    "reasoning" TEXT NOT NULL,
    "outcome" "DecisionOutcome" NOT NULL DEFAULT 'PENDING'::"DecisionOutcome",
    "outcome_recorded_at" TIMESTAMPTZ,
    "feedback_rating" INTEGER,
    "feedback_comment" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "recommendation_feedback" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "recommendation_id" UUID NOT NULL,
    "recommendation_type" VARCHAR(64) NOT NULL,
    "recommended_item_type" VARCHAR(32) NOT NULL,
    "recommended_item_id" UUID,
    "was_accepted" BOOLEAN NOT NULL,
    "was_explicitly_rejected" BOOLEAN NOT NULL DEFAULT FALSE,
    "session_id" UUID,
    "context_signals" JSONB,
    "recommended_at" TIMESTAMPTZ NOT NULL,
    "responded_at" TIMESTAMPTZ,
    "response_time_ms" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "threshold_overrides" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID,
    "threshold_key" VARCHAR(64) NOT NULL,
    "threshold_value" DECIMAL NOT NULL,
    "reason" TEXT,
    "set_by_user_id" UUID NOT NULL,
    "effective_from" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_until" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "motor_profiles" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "learner_id" UUID NOT NULL UNIQUE,
    "tenant_id" UUID NOT NULL,
    "fine_motor_level" "MotorAbilityLevel" NOT NULL DEFAULT 'TYPICAL'::"MotorAbilityLevel",
    "gross_motor_level" "MotorAbilityLevel" NOT NULL DEFAULT 'TYPICAL'::"MotorAbilityLevel",
    "has_tremor" BOOLEAN NOT NULL DEFAULT FALSE,
    "tremor_severity" SMALLINT,
    "has_limited_range" BOOLEAN NOT NULL DEFAULT FALSE,
    "limited_range_side" VARCHAR(10),
    "has_fatigue" BOOLEAN NOT NULL DEFAULT FALSE,
    "fatigue_threshold_minutes" SMALLINT,
    "enlarged_touch_targets" BOOLEAN NOT NULL DEFAULT FALSE,
    "touch_target_multiplier" DECIMAL NOT NULL DEFAULT 1.0,
    "touch_hold_duration" SMALLINT NOT NULL DEFAULT 0,
    "accidental_touch_filter" BOOLEAN NOT NULL DEFAULT FALSE,
    "edge_ignore_margin" SMALLINT NOT NULL DEFAULT 0,
    "simplified_gestures" BOOLEAN NOT NULL DEFAULT FALSE,
    "allow_single_finger_gestures" BOOLEAN NOT NULL DEFAULT TRUE,
    "disable_multi_touch" BOOLEAN NOT NULL DEFAULT FALSE,
    "disable_pinch_zoom" BOOLEAN NOT NULL DEFAULT FALSE,
    "disable_swipe" BOOLEAN NOT NULL DEFAULT FALSE,
    "swipe_distance_multiplier" DECIMAL NOT NULL DEFAULT 1.0,
    "drag_assist_enabled" BOOLEAN NOT NULL DEFAULT FALSE,
    "drag_snap_to_grid" BOOLEAN NOT NULL DEFAULT FALSE,
    "drag_grid_size" SMALLINT NOT NULL DEFAULT 20,
    "drag_auto_complete" BOOLEAN NOT NULL DEFAULT FALSE,
    "drag_auto_complete_threshold" SMALLINT NOT NULL DEFAULT 30,
    "extended_response_time" BOOLEAN NOT NULL DEFAULT FALSE,
    "response_time_multiplier" DECIMAL NOT NULL DEFAULT 1.0,
    "disable_timed_elements" BOOLEAN NOT NULL DEFAULT FALSE,
    "auto_advance_delay" SMALLINT NOT NULL DEFAULT 0,
    "voice_input_enabled" BOOLEAN NOT NULL DEFAULT FALSE,
    "voice_input_for_text" BOOLEAN NOT NULL DEFAULT TRUE,
    "voice_input_for_navigation" BOOLEAN NOT NULL DEFAULT FALSE,
    "dwell_selection_enabled" BOOLEAN NOT NULL DEFAULT FALSE,
    "dwell_time_ms" SMALLINT NOT NULL DEFAULT 1000,
    "dwell_indicator_style" "DwellIndicatorStyle" NOT NULL DEFAULT 'circle'::"DwellIndicatorStyle",
    "switch_access_enabled" BOOLEAN NOT NULL DEFAULT FALSE,
    "switch_access_mode" "SwitchAccessMode" NOT NULL DEFAULT 'auto_scan'::"SwitchAccessMode",
    "switch_scan_speed" SMALLINT NOT NULL DEFAULT 1500,
    "prefer_typing" BOOLEAN NOT NULL DEFAULT FALSE,
    "prefer_voice_input" BOOLEAN NOT NULL DEFAULT FALSE,
    "prefer_multiple_choice" BOOLEAN NOT NULL DEFAULT FALSE,
    "show_word_prediction" BOOLEAN NOT NULL DEFAULT TRUE,
    "enlarged_keyboard" BOOLEAN NOT NULL DEFAULT FALSE,
    "keyboard_type" "KeyboardType" NOT NULL DEFAULT 'standard'::"KeyboardType",
    "enhanced_touch_feedback" BOOLEAN NOT NULL DEFAULT FALSE,
    "haptic_feedback_intensity" "HapticIntensity" NOT NULL DEFAULT 'normal'::"HapticIntensity",
    "show_touch_ripples" BOOLEAN NOT NULL DEFAULT TRUE,
    "highlight_focused_element" BOOLEAN NOT NULL DEFAULT TRUE,
    "tremor_filter_enabled" BOOLEAN NOT NULL DEFAULT FALSE,
    "tremor_filter_strength" SMALLINT NOT NULL DEFAULT 50,
    "tremor_filter_algorithm" "TremorFilterAlgorithm" NOT NULL DEFAULT 'moving_average'::"TremorFilterAlgorithm",
    "auto_break_reminders" BOOLEAN NOT NULL DEFAULT FALSE,
    "break_reminder_interval_minutes" SMALLINT NOT NULL DEFAULT 15,
    "reduce_requirements_on_fatigue" BOOLEAN NOT NULL DEFAULT FALSE,
    "custom_gestures" JSONB,
    "assessed_by" VARCHAR(20),
    "assessed_at" TIMESTAMPTZ,
    "accommodation_notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "motor_interaction_logs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "learner_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "session_id" UUID,
    "interaction_type" VARCHAR(20) NOT NULL,
    "target_element" VARCHAR(255),
    "attempt_count" SMALLINT NOT NULL DEFAULT 1,
    "success_on_attempt" SMALLINT,
    "total_time_ms" INTEGER,
    "target_hit_accuracy" DECIMAL,
    "drag_path_smoothness" DECIMAL,
    "accommodations_active" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "successful" BOOLEAN NOT NULL,
    "used_alternative" BOOLEAN NOT NULL DEFAULT FALSE,
    "alternative_method" VARCHAR(50),
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "personalization_signals_learnerId_date_signalKey_key" ON "personalization_signals" ("learnerId", "date", "signalKey");