-- CreateEnum
CREATE TYPE "generation_status" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'PARTIALLY_COMPLETED');

-- CreateTable
CREATE TABLE "curriculum_templates" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subject" "subject_area" NOT NULL,
    "grade_band" "grade_band" NOT NULL,
    "unit_blueprints" JSONB NOT NULL,
    "base_standards" TEXT[],
    "academic_year" TEXT NOT NULL DEFAULT '2025-2026',
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curriculum_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_generation_jobs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "target_standards" TEXT[],
    "state_code" TEXT,
    "academic_year" TEXT NOT NULL,
    "status" "generation_status" NOT NULL DEFAULT 'PENDING',
    "generated_curriculum_id" UUID,
    "lessons_generated" INTEGER NOT NULL DEFAULT 0,
    "lessons_total" INTEGER NOT NULL DEFAULT 0,
    "tokens_used" INTEGER NOT NULL DEFAULT 0,
    "estimated_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "llm_provider" TEXT,
    "llm_model" TEXT,
    "triggered_by" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curriculum_generation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "curriculum_templates_subject_grade_band_idx" ON "curriculum_templates"("subject", "grade_band");

-- CreateIndex
CREATE INDEX "curriculum_templates_is_active_idx" ON "curriculum_templates"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_templates_name_subject_grade_band_key" ON "curriculum_templates"("name", "subject", "grade_band");

-- CreateIndex
CREATE INDEX "curriculum_generation_jobs_tenant_id_idx" ON "curriculum_generation_jobs"("tenant_id");

-- CreateIndex
CREATE INDEX "curriculum_generation_jobs_status_idx" ON "curriculum_generation_jobs"("status");

-- CreateIndex
CREATE INDEX "curriculum_generation_jobs_template_id_idx" ON "curriculum_generation_jobs"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_generation_jobs_tenant_id_template_id_academic_ye_key" ON "curriculum_generation_jobs"("tenant_id", "template_id", "academic_year");

-- AddForeignKey
ALTER TABLE "curriculum_generation_jobs" ADD CONSTRAINT "curriculum_generation_jobs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "curriculum_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
