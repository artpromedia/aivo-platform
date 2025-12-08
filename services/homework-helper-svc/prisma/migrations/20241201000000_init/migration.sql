-- CreateEnum
CREATE TYPE "subject" AS ENUM ('ELA', 'MATH', 'SCIENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "grade_band" AS ENUM ('K5', 'G6_8', 'G9_12');

-- CreateEnum
CREATE TYPE "source_type" AS ENUM ('IMAGE', 'TEXT', 'PDF');

-- CreateEnum
CREATE TYPE "submission_status" AS ENUM ('RECEIVED', 'PARSED', 'SCAFFOLDED', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "homework_submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "session_id" UUID,
    "subject" "subject" NOT NULL,
    "grade_band" "grade_band" NOT NULL,
    "source_type" "source_type" NOT NULL,
    "source_url" TEXT,
    "raw_text" TEXT NOT NULL,
    "status" "submission_status" NOT NULL DEFAULT 'RECEIVED',
    "step_count" INTEGER NOT NULL DEFAULT 0,
    "steps_completed" INTEGER NOT NULL DEFAULT 0,
    "ai_correlation_id" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homework_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homework_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "submission_id" UUID NOT NULL,
    "step_order" INTEGER NOT NULL,
    "prompt_text" TEXT NOT NULL,
    "hint_text" TEXT,
    "expected_concept" TEXT,
    "is_started" BOOLEAN NOT NULL DEFAULT false,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "hint_revealed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homework_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homework_step_responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "step_id" UUID NOT NULL,
    "response_text" TEXT NOT NULL,
    "ai_feedback" TEXT,
    "is_correct" BOOLEAN,
    "ai_correlation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homework_step_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "homework_submissions_tenant_id_learner_id_idx" ON "homework_submissions"("tenant_id", "learner_id");

-- CreateIndex
CREATE INDEX "homework_submissions_session_id_idx" ON "homework_submissions"("session_id");

-- CreateIndex
CREATE INDEX "homework_submissions_status_idx" ON "homework_submissions"("status");

-- CreateIndex
CREATE INDEX "homework_steps_submission_id_idx" ON "homework_steps"("submission_id");

-- CreateIndex
CREATE UNIQUE INDEX "homework_steps_submission_id_step_order_key" ON "homework_steps"("submission_id", "step_order");

-- CreateIndex
CREATE INDEX "homework_step_responses_step_id_idx" ON "homework_step_responses"("step_id");

-- AddForeignKey
ALTER TABLE "homework_steps" ADD CONSTRAINT "homework_steps_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "homework_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework_step_responses" ADD CONSTRAINT "homework_step_responses_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "homework_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
