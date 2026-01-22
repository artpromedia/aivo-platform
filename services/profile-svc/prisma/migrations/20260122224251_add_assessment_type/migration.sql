-- CreateEnum
CREATE TYPE "profile_origin" AS ENUM ('PARENT_REPORTED', 'TEACHER_REPORTED', 'JOINT', 'IMPORTED', 'SYSTEM_INFERRED');

-- CreateEnum
CREATE TYPE "accommodation_category" AS ENUM ('INSTRUCTIONAL', 'SENSORY', 'ASSESSMENT', 'ENVIRONMENTAL', 'COMMUNICATION', 'BEHAVIORAL', 'TECHNOLOGY', 'OTHER');

-- CreateEnum
CREATE TYPE "accommodation_source" AS ENUM ('IEP', 'PLAN_504', 'TEAM_DECISION', 'PARENT_PREFERENCE', 'LEARNER_PREFERENCE', 'TEACHER_OBSERVATION');

-- CreateEnum
CREATE TYPE "document_access_scope" AS ENUM ('PARENTS_AND_ASSIGNED_STAFF', 'STAFF_ONLY', 'DISTRICT_ADMIN_ONLY');

-- CreateEnum
CREATE TYPE "sensitivity_level" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "functioning_level" AS ENUM ('TYPICAL', 'MILD', 'MODERATE', 'SEVERE', 'PROFOUND');

-- CreateEnum
CREATE TYPE "assessment_type" AS ENUM ('STANDARD', 'STANDARD_WITH_ACCOMMODATIONS', 'MODIFIED', 'ALTERNATE');

-- CreateEnum
CREATE TYPE "assessment_mode" AS ENUM ('STANDARD', 'MODIFIED', 'SUPPORTED', 'OBSERVATIONAL', 'SENSORY_ADAPTED');

-- CreateEnum
CREATE TYPE "sensory_impairment_type" AS ENUM ('NONE', 'BLIND', 'LOW_VISION', 'DEAF', 'HARD_OF_HEARING', 'DEAFBLIND');

-- CreateEnum
CREATE TYPE "input_method" AS ENUM ('STANDARD', 'LARGE_TOUCH', 'SWITCH_SINGLE', 'SWITCH_DUAL', 'EYE_GAZE', 'VOICE_CONTROL', 'PARTNER_ASSISTED', 'HEAD_TRACKING');

-- CreateEnum
CREATE TYPE "communication_modality" AS ENUM ('VERBAL', 'WRITTEN', 'SIGN_LANGUAGE', 'PICTURE_SYMBOLS', 'AAC_DEVICE', 'GESTURES', 'COMBINATION');

-- CreateEnum
CREATE TYPE "aac_system_type" AS ENUM ('NONE', 'PECS', 'PROLOQUO2GO', 'LAMP', 'TOUCHCHAT', 'SNAP_CORE', 'BOARDMAKER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "font_preference" AS ENUM ('SYSTEM_DEFAULT', 'DYSLEXIA_FRIENDLY', 'SANS_SERIF', 'SERIF', 'MONOSPACE');

-- CreateEnum
CREATE TYPE "text_size_preference" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE');

-- CreateEnum
CREATE TYPE "check_frequency" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ai_disabled_reason" AS ENUM ('IEP_ACCOMMODATION', 'PLAN_504', 'PARENT_REQUEST', 'TEACHER_DECISION', 'ADMIN_POLICY', 'ASSESSMENT_MODE', 'BEHAVIORAL', 'OTHER');

-- CreateTable
CREATE TABLE "learner_profiles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "profile_version" INTEGER NOT NULL DEFAULT 1,
    "summary" TEXT,
    "learning_style_json" JSONB NOT NULL DEFAULT '{}',
    "sensory_profile_json" JSONB NOT NULL DEFAULT '{}',
    "communication_preferences_json" JSONB NOT NULL DEFAULT '{}',
    "interaction_constraints_json" JSONB NOT NULL DEFAULT '{}',
    "ui_accessibility_json" JSONB NOT NULL DEFAULT '{}',
    "origin" "profile_origin" NOT NULL DEFAULT 'PARENT_REPORTED',
    "created_by_user_id" UUID NOT NULL,
    "updated_by_user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "learner_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learner_accommodations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "profile_id" UUID,
    "category" "accommodation_category" NOT NULL,
    "description" TEXT NOT NULL,
    "applies_to_domains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" "accommodation_source" NOT NULL DEFAULT 'PARENT_PREFERENCE',
    "is_critical" BOOLEAN NOT NULL DEFAULT false,
    "effective_from" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" UUID NOT NULL,
    "updated_by_user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "learner_accommodations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learner_goal_links" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "profile_id" UUID,
    "goal_id" UUID NOT NULL,
    "notes" TEXT,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "learner_goal_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iep_document_refs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "file_url" TEXT NOT NULL,
    "description" TEXT,
    "access_scope" "document_access_scope" NOT NULL DEFAULT 'PARENTS_AND_ASSIGNED_STAFF',
    "file_name" TEXT,
    "file_size_bytes" INTEGER,
    "mime_type" TEXT,
    "uploaded_by_user_id" UUID NOT NULL,
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_user_id" UUID,

    CONSTRAINT "iep_document_refs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_change_logs" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "changed_fields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "previous_values_json" JSONB,
    "changed_by_user_id" UUID NOT NULL,
    "changed_by_role" TEXT NOT NULL,
    "changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learner_ai_settings" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "ai_enabled" BOOLEAN NOT NULL DEFAULT true,
    "disabled_reason" "ai_disabled_reason",
    "disabled_reason_text" TEXT,
    "disabled_at" TIMESTAMPTZ,
    "disabled_by_user_id" UUID,
    "disabled_by_role" TEXT,
    "tutor_enabled" BOOLEAN NOT NULL DEFAULT true,
    "homework_helper_enabled" BOOLEAN NOT NULL DEFAULT true,
    "hints_enabled" BOOLEAN NOT NULL DEFAULT true,
    "focus_mode_enabled" BOOLEAN NOT NULL DEFAULT true,
    "recommendations_enabled" BOOLEAN NOT NULL DEFAULT true,
    "temporary_disable_until" TIMESTAMPTZ,
    "temporary_disable_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "updated_by_user_id" UUID,

    CONSTRAINT "learner_ai_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learner_ai_settings_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "previous_enabled" BOOLEAN NOT NULL,
    "new_enabled" BOOLEAN NOT NULL,
    "reason" TEXT,
    "changed_by_user_id" UUID NOT NULL,
    "changed_by_role" TEXT NOT NULL,
    "changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "learner_ai_settings_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learner_functioning_profiles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "functioning_level" "functioning_level" NOT NULL DEFAULT 'TYPICAL',
    "assessment_type" "assessment_type" NOT NULL DEFAULT 'STANDARD',
    "selected_assessment_type" "assessment_type",
    "assessment_type_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "recommended_assessment_mode" "assessment_mode" NOT NULL DEFAULT 'STANDARD',
    "selected_assessment_mode" "assessment_mode",
    "assessment_mode_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "cognitive_indicators_json" JSONB NOT NULL DEFAULT '{}',
    "daily_living_skills_json" JSONB NOT NULL DEFAULT '{}',
    "support_needs_json" JSONB NOT NULL DEFAULT '{}',
    "has_iep_documentation" BOOLEAN NOT NULL DEFAULT false,
    "iep_functioning_level" "functioning_level",
    "professional_notes" TEXT,
    "parent_assessment_score" DOUBLE PRECISION,
    "confidence_score" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "updated_by_user_id" UUID,

    CONSTRAINT "learner_functioning_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learner_sensory_profiles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "sensory_impairment_type" "sensory_impairment_type" NOT NULL DEFAULT 'NONE',
    "vision_profile_json" JSONB NOT NULL DEFAULT '{}',
    "hearing_profile_json" JSONB NOT NULL DEFAULT '{}',
    "primary_communication" "communication_modality" NOT NULL DEFAULT 'VERBAL',
    "secondary_communication" "communication_modality",
    "aac_system_type" "aac_system_type" NOT NULL DEFAULT 'NONE',
    "aac_settings_json" JSONB NOT NULL DEFAULT '{}',
    "preferred_input_method" "input_method" NOT NULL DEFAULT 'STANDARD',
    "alternative_input_method" "input_method",
    "input_settings_json" JSONB NOT NULL DEFAULT '{}',
    "content_transformations_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "updated_by_user_id" UUID,

    CONSTRAINT "learner_sensory_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_mode_decisions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "input_factors_json" JSONB NOT NULL,
    "algorithm_recommendation" "assessment_mode" NOT NULL,
    "recommendation_confidence" DOUBLE PRECISION NOT NULL,
    "reasoning_explanation" TEXT NOT NULL,
    "final_selected_mode" "assessment_mode" NOT NULL,
    "overridden_by_user_id" UUID,
    "override_reason" TEXT,
    "decided_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_mode_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "learner_profiles_tenant_id_learner_id_idx" ON "learner_profiles"("tenant_id", "learner_id");

-- CreateIndex
CREATE UNIQUE INDEX "learner_profiles_tenant_id_learner_id_key" ON "learner_profiles"("tenant_id", "learner_id");

-- CreateIndex
CREATE INDEX "learner_accommodations_tenant_id_learner_id_idx" ON "learner_accommodations"("tenant_id", "learner_id");

-- CreateIndex
CREATE INDEX "learner_accommodations_tenant_id_learner_id_is_active_idx" ON "learner_accommodations"("tenant_id", "learner_id", "is_active");

-- CreateIndex
CREATE INDEX "learner_accommodations_profile_id_idx" ON "learner_accommodations"("profile_id");

-- CreateIndex
CREATE INDEX "learner_accommodations_category_idx" ON "learner_accommodations"("category");

-- CreateIndex
CREATE INDEX "learner_accommodations_source_idx" ON "learner_accommodations"("source");

-- CreateIndex
CREATE INDEX "learner_accommodations_is_active_effective_from_effective_t_idx" ON "learner_accommodations"("is_active", "effective_from", "effective_to");

-- CreateIndex
CREATE INDEX "learner_accommodations_tenant_id_is_critical_is_active_idx" ON "learner_accommodations"("tenant_id", "is_critical", "is_active");

-- CreateIndex
CREATE INDEX "learner_goal_links_tenant_id_learner_id_idx" ON "learner_goal_links"("tenant_id", "learner_id");

-- CreateIndex
CREATE INDEX "learner_goal_links_goal_id_idx" ON "learner_goal_links"("goal_id");

-- CreateIndex
CREATE UNIQUE INDEX "learner_goal_links_tenant_id_learner_id_goal_id_key" ON "learner_goal_links"("tenant_id", "learner_id", "goal_id");

-- CreateIndex
CREATE INDEX "iep_document_refs_tenant_id_learner_id_idx" ON "iep_document_refs"("tenant_id", "learner_id");

-- CreateIndex
CREATE INDEX "iep_document_refs_tenant_id_learner_id_is_deleted_idx" ON "iep_document_refs"("tenant_id", "learner_id", "is_deleted");

-- CreateIndex
CREATE INDEX "iep_document_refs_access_scope_idx" ON "iep_document_refs"("access_scope");

-- CreateIndex
CREATE INDEX "profile_change_logs_profile_id_idx" ON "profile_change_logs"("profile_id");

-- CreateIndex
CREATE INDEX "profile_change_logs_tenant_id_learner_id_idx" ON "profile_change_logs"("tenant_id", "learner_id");

-- CreateIndex
CREATE INDEX "profile_change_logs_changed_at_idx" ON "profile_change_logs"("changed_at");

-- CreateIndex
CREATE INDEX "learner_ai_settings_tenant_id_learner_id_idx" ON "learner_ai_settings"("tenant_id", "learner_id");

-- CreateIndex
CREATE INDEX "learner_ai_settings_tenant_id_ai_enabled_idx" ON "learner_ai_settings"("tenant_id", "ai_enabled");

-- CreateIndex
CREATE INDEX "learner_ai_settings_temporary_disable_until_idx" ON "learner_ai_settings"("temporary_disable_until");

-- CreateIndex
CREATE UNIQUE INDEX "learner_ai_settings_tenant_id_learner_id_key" ON "learner_ai_settings"("tenant_id", "learner_id");

-- CreateIndex
CREATE INDEX "learner_ai_settings_logs_tenant_id_learner_id_idx" ON "learner_ai_settings_logs"("tenant_id", "learner_id");

-- CreateIndex
CREATE INDEX "learner_ai_settings_logs_changed_at_idx" ON "learner_ai_settings_logs"("changed_at");

-- CreateIndex
CREATE INDEX "learner_functioning_profiles_tenant_id_learner_id_idx" ON "learner_functioning_profiles"("tenant_id", "learner_id");

-- CreateIndex
CREATE INDEX "learner_functioning_profiles_functioning_level_idx" ON "learner_functioning_profiles"("functioning_level");

-- CreateIndex
CREATE INDEX "learner_functioning_profiles_recommended_assessment_mode_idx" ON "learner_functioning_profiles"("recommended_assessment_mode");

-- CreateIndex
CREATE UNIQUE INDEX "learner_functioning_profiles_tenant_id_learner_id_key" ON "learner_functioning_profiles"("tenant_id", "learner_id");

-- CreateIndex
CREATE INDEX "learner_sensory_profiles_tenant_id_learner_id_idx" ON "learner_sensory_profiles"("tenant_id", "learner_id");

-- CreateIndex
CREATE INDEX "learner_sensory_profiles_sensory_impairment_type_idx" ON "learner_sensory_profiles"("sensory_impairment_type");

-- CreateIndex
CREATE INDEX "learner_sensory_profiles_primary_communication_idx" ON "learner_sensory_profiles"("primary_communication");

-- CreateIndex
CREATE INDEX "learner_sensory_profiles_preferred_input_method_idx" ON "learner_sensory_profiles"("preferred_input_method");

-- CreateIndex
CREATE UNIQUE INDEX "learner_sensory_profiles_tenant_id_learner_id_key" ON "learner_sensory_profiles"("tenant_id", "learner_id");

-- CreateIndex
CREATE INDEX "assessment_mode_decisions_tenant_id_learner_id_idx" ON "assessment_mode_decisions"("tenant_id", "learner_id");

-- CreateIndex
CREATE INDEX "assessment_mode_decisions_algorithm_recommendation_idx" ON "assessment_mode_decisions"("algorithm_recommendation");

-- CreateIndex
CREATE INDEX "assessment_mode_decisions_decided_at_idx" ON "assessment_mode_decisions"("decided_at");

-- AddForeignKey
ALTER TABLE "learner_accommodations" ADD CONSTRAINT "learner_accommodations_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "learner_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learner_goal_links" ADD CONSTRAINT "learner_goal_links_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "learner_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_change_logs" ADD CONSTRAINT "profile_change_logs_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "learner_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
