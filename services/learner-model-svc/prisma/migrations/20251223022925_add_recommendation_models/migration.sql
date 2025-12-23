-- CreateEnum
CREATE TYPE "skill_domain" AS ENUM ('ELA', 'MATH', 'SCIENCE', 'SPEECH', 'SEL');

-- CreateEnum
CREATE TYPE "grade_band" AS ENUM ('K5', 'G6_8', 'G9_12');

-- CreateEnum
CREATE TYPE "learning_object_type" AS ENUM ('LESSON', 'EXERCISE', 'GAME', 'VIDEO', 'READING', 'ASSESSMENT');

-- CreateEnum
CREATE TYPE "engagement_state" AS ENUM ('FLOW', 'ENGAGED', 'BORED', 'FRUSTRATED', 'DISENGAGED');

-- CreateTable
CREATE TABLE "skills" (
    "id" UUID NOT NULL,
    "skill_code" TEXT NOT NULL,
    "domain" "skill_domain" NOT NULL,
    "grade_band" "grade_band" NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_prerequisites" (
    "id" UUID NOT NULL,
    "prerequisite_skill_id" UUID NOT NULL,
    "dependent_skill_id" UUID NOT NULL,

    CONSTRAINT "skill_prerequisites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learner_skill_states" (
    "id" UUID NOT NULL,
    "virtual_brain_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "mastery_level" DECIMAL(6,3) NOT NULL,
    "confidence" DECIMAL(5,3) NOT NULL,
    "last_assessed_at" TIMESTAMPTZ NOT NULL,
    "practice_count" INTEGER NOT NULL DEFAULT 0,
    "correct_streak" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "learner_skill_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "virtual_brains" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "baseline_profile_id" UUID,
    "baseline_attempt_id" UUID,
    "grade_band" "grade_band" NOT NULL,
    "initialization_json" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "virtual_brains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_objects" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "skill_code" TEXT NOT NULL,
    "domain" "skill_domain" NOT NULL,
    "grade_band" "grade_band" NOT NULL,
    "difficulty_level" SMALLINT NOT NULL,
    "object_type" "learning_object_type" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "estimated_minutes" SMALLINT NOT NULL,
    "content_url" TEXT,
    "metadata_json" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "learning_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bkt_skill_states" (
    "id" UUID NOT NULL,
    "virtual_brain_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "p_learn" DECIMAL(6,5) NOT NULL,
    "p_transit" DECIMAL(6,5) NOT NULL,
    "p_guess" DECIMAL(6,5) NOT NULL,
    "p_slip" DECIMAL(6,5) NOT NULL,
    "p_know" DECIMAL(6,5) NOT NULL,
    "pfa_successes" INTEGER NOT NULL DEFAULT 0,
    "pfa_failures" INTEGER NOT NULL DEFAULT 0,
    "pfa_beta" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "pfa_gamma" DECIMAL(8,4) NOT NULL DEFAULT 0.1,
    "pfa_rho" DECIMAL(8,4) NOT NULL DEFAULT -0.1,
    "learning_velocity" DECIMAL(6,4) NOT NULL DEFAULT 0,
    "last_practice_at" TIMESTAMPTZ,
    "parameters_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "bkt_skill_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_outcomes" (
    "id" UUID NOT NULL,
    "bkt_skill_state_id" UUID NOT NULL,
    "learning_object_id" UUID,
    "is_correct" BOOLEAN NOT NULL,
    "response_time_ms" INTEGER,
    "hints_used" INTEGER NOT NULL DEFAULT 0,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "difficulty_level" SMALLINT,
    "prior_p_know" DECIMAL(6,5) NOT NULL,
    "posterior_p_know" DECIMAL(6,5) NOT NULL,
    "context_json" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learner_engagements" (
    "id" UUID NOT NULL,
    "virtual_brain_id" UUID NOT NULL,
    "session_id" UUID,
    "frustration_score" DECIMAL(4,3) NOT NULL,
    "boredom_score" DECIMAL(4,3) NOT NULL,
    "engagement_score" DECIMAL(4,3) NOT NULL,
    "flow_score" DECIMAL(4,3) NOT NULL,
    "state" "engagement_state" NOT NULL,
    "confidence" DECIMAL(4,3) NOT NULL,
    "baseline_response_time_ms" INTEGER,
    "response_time_variance_ms" INTEGER,
    "activities_completed" INTEGER NOT NULL DEFAULT 0,
    "session_duration_ms" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learner_engagements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "neurodiverse_profiles" (
    "id" UUID NOT NULL,
    "virtual_brain_id" UUID NOT NULL,
    "has_adhd" BOOLEAN NOT NULL DEFAULT false,
    "has_dyslexia" BOOLEAN NOT NULL DEFAULT false,
    "has_dyscalculia" BOOLEAN NOT NULL DEFAULT false,
    "has_asd" BOOLEAN NOT NULL DEFAULT false,
    "has_processing_delay" BOOLEAN NOT NULL DEFAULT false,
    "mastery_threshold" DECIMAL(4,3) NOT NULL DEFAULT 0.95,
    "slip_rate_multiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.0,
    "response_time_multiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.0,
    "max_session_minutes" INTEGER NOT NULL DEFAULT 45,
    "break_frequency_minutes" INTEGER NOT NULL DEFAULT 15,
    "preferred_interleaving" BOOLEAN NOT NULL DEFAULT true,
    "iep_goals_json" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "neurodiverse_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_sessions" (
    "id" UUID NOT NULL,
    "virtual_brain_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL,
    "ended_at" TIMESTAMPTZ,
    "activities_planned" INTEGER NOT NULL DEFAULT 0,
    "activities_completed" INTEGER NOT NULL DEFAULT 0,
    "correct_responses" INTEGER NOT NULL DEFAULT 0,
    "total_responses" INTEGER NOT NULL DEFAULT 0,
    "avg_engagement_score" DECIMAL(4,3),
    "frustration_events" INTEGER NOT NULL DEFAULT 0,
    "breaks_taken" INTEGER NOT NULL DEFAULT 0,
    "session_plan_json" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "learning_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skills_skill_code_key" ON "skills"("skill_code");

-- CreateIndex
CREATE INDEX "skills_domain_grade_band_idx" ON "skills"("domain", "grade_band");

-- CreateIndex
CREATE INDEX "skill_prerequisites_dependent_skill_id_idx" ON "skill_prerequisites"("dependent_skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_prerequisites_prerequisite_skill_id_dependent_skill_i_key" ON "skill_prerequisites"("prerequisite_skill_id", "dependent_skill_id");

-- CreateIndex
CREATE INDEX "learner_skill_states_virtual_brain_id_mastery_level_idx" ON "learner_skill_states"("virtual_brain_id", "mastery_level");

-- CreateIndex
CREATE UNIQUE INDEX "learner_skill_states_virtual_brain_id_skill_id_key" ON "learner_skill_states"("virtual_brain_id", "skill_id");

-- CreateIndex
CREATE INDEX "virtual_brains_tenant_id_learner_id_idx" ON "virtual_brains"("tenant_id", "learner_id");

-- CreateIndex
CREATE UNIQUE INDEX "virtual_brains_tenant_id_learner_id_key" ON "virtual_brains"("tenant_id", "learner_id");

-- CreateIndex
CREATE INDEX "learning_objects_skill_code_difficulty_level_idx" ON "learning_objects"("skill_code", "difficulty_level");

-- CreateIndex
CREATE INDEX "learning_objects_domain_grade_band_difficulty_level_idx" ON "learning_objects"("domain", "grade_band", "difficulty_level");

-- CreateIndex
CREATE INDEX "bkt_skill_states_virtual_brain_id_idx" ON "bkt_skill_states"("virtual_brain_id");

-- CreateIndex
CREATE UNIQUE INDEX "bkt_skill_states_virtual_brain_id_skill_id_key" ON "bkt_skill_states"("virtual_brain_id", "skill_id");

-- CreateIndex
CREATE INDEX "practice_outcomes_bkt_skill_state_id_created_at_idx" ON "practice_outcomes"("bkt_skill_state_id", "created_at");

-- CreateIndex
CREATE INDEX "learner_engagements_virtual_brain_id_created_at_idx" ON "learner_engagements"("virtual_brain_id", "created_at");

-- CreateIndex
CREATE INDEX "learner_engagements_virtual_brain_id_session_id_idx" ON "learner_engagements"("virtual_brain_id", "session_id");

-- CreateIndex
CREATE UNIQUE INDEX "neurodiverse_profiles_virtual_brain_id_key" ON "neurodiverse_profiles"("virtual_brain_id");

-- CreateIndex
CREATE INDEX "learning_sessions_virtual_brain_id_started_at_idx" ON "learning_sessions"("virtual_brain_id", "started_at");

-- AddForeignKey
ALTER TABLE "skill_prerequisites" ADD CONSTRAINT "skill_prerequisites_prerequisite_skill_id_fkey" FOREIGN KEY ("prerequisite_skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_prerequisites" ADD CONSTRAINT "skill_prerequisites_dependent_skill_id_fkey" FOREIGN KEY ("dependent_skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learner_skill_states" ADD CONSTRAINT "learner_skill_states_virtual_brain_id_fkey" FOREIGN KEY ("virtual_brain_id") REFERENCES "virtual_brains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learner_skill_states" ADD CONSTRAINT "learner_skill_states_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bkt_skill_states" ADD CONSTRAINT "bkt_skill_states_virtual_brain_id_fkey" FOREIGN KEY ("virtual_brain_id") REFERENCES "virtual_brains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_outcomes" ADD CONSTRAINT "practice_outcomes_bkt_skill_state_id_fkey" FOREIGN KEY ("bkt_skill_state_id") REFERENCES "bkt_skill_states"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learner_engagements" ADD CONSTRAINT "learner_engagements_virtual_brain_id_fkey" FOREIGN KEY ("virtual_brain_id") REFERENCES "virtual_brains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "neurodiverse_profiles" ADD CONSTRAINT "neurodiverse_profiles_virtual_brain_id_fkey" FOREIGN KEY ("virtual_brain_id") REFERENCES "virtual_brains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_sessions_virtual_brain_id_fkey" FOREIGN KEY ("virtual_brain_id") REFERENCES "virtual_brains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
