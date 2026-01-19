-- CreateEnum
CREATE TYPE "onboarding_status" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "learner_onboarding_progress" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "current_step" VARCHAR(50) NOT NULL DEFAULT 'welcome',
    "status" "onboarding_status" NOT NULL DEFAULT 'NOT_STARTED',
    "data_json" JSONB,
    "accessibility_settings" JSONB,
    "sensory_profile" JSONB,
    "interests" JSONB,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "learner_onboarding_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "learner_onboarding_progress_tenant_id_learner_id_key" ON "learner_onboarding_progress"("tenant_id", "learner_id");

-- CreateIndex
CREATE INDEX "idx_onboarding_progress_status" ON "learner_onboarding_progress"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "idx_onboarding_progress_learner" ON "learner_onboarding_progress"("learner_id");

-- AddColumn to virtual_brains for onboarding reference
ALTER TABLE "virtual_brains" ADD COLUMN IF NOT EXISTS "onboarding_progress_id" UUID;

-- CreateIndex on virtual_brains for onboarding reference
CREATE INDEX IF NOT EXISTS "idx_virtual_brains_onboarding" ON "virtual_brains"("onboarding_progress_id");

-- Comment on table
COMMENT ON TABLE "learner_onboarding_progress" IS 'Tracks learner onboarding flow progress including accessibility settings, sensory profile, and interests collected during onboarding.';
