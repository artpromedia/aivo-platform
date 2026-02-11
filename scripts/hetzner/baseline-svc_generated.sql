DO $$ BEGIN CREATE TYPE "BaselineDomain" AS ENUM ('ELA', 'MATH', 'SCIENCE', 'SPEECH', 'SEL', '@@map("baseline_domain")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "GradeBand" AS ENUM ('K5', 'G6_8', 'G9_12', '@@map("grade_band")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "BaselineStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'RETEST_ALLOWED', 'FINAL_ACCEPTED', '@@map("baseline_status")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "RetestReasonType" AS ENUM ('DISTRACTED', 'ANXIETY', 'TECHNICAL_ISSUE', 'OTHER', '@@map("retest_reason_type")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "IepDocumentStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'COMPARISON_READY', 'APPROVED', 'REJECTED', 'ERROR', '@@map("iep_document_status")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "IepComparisonDecision" AS ENUM ('PENDING', 'AGREE_WITH_SYSTEM', 'PREFER_EXISTING', 'MERGE_BOTH', 'REQUEST_REVIEW', '@@map("iep_comparison_decision")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "ParentAssessmentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', '@@map("parent_assessment_status")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "AssessmentType" AS ENUM ('STANDARD', 'STANDARD_WITH_ACCOMMODATIONS', 'MODIFIED', 'ALTERNATE', '@@map("assessment_type")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "baseline_profiles" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "learnerId" UUID NOT NULL,
    "grade_band" "GradeBand" NOT NULL,
    "status" "BaselineStatus" NOT NULL DEFAULT 'NOT_STARTED'::"BaselineStatus",
    "attempt_count" SMALLINT NOT NULL DEFAULT 0,
    "final_attempt_id" UUID UNIQUE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "baseline_attempts" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "baseline_profile_id" UUID NOT NULL,
    "attempt_number" SMALLINT NOT NULL,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "domain_scores_json" JSONB,
    "overall_estimate_json" JSONB,
    "retest_reason_type" "RetestReasonType",
    "retest_reason_notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "baseline_items" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "baseline_attempt_id" UUID NOT NULL,
    "sequence_index" SMALLINT NOT NULL,
    "domain" "BaselineDomain" NOT NULL,
    "grade_band" "GradeBand" NOT NULL,
    "prompt_json" JSONB NOT NULL,
    "correct_answer_json" JSONB NOT NULL,
    "ai_metadata_json" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "baseline_responses" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "baseline_item_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "response_json" JSONB NOT NULL,
    "is_correct" BOOLEAN,
    "score" DECIMAL,
    "latency_ms" INTEGER,
    "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "baseline_skill_estimates" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "baseline_attempt_id" UUID NOT NULL,
    "skill_code" TEXT NOT NULL,
    "domain" "BaselineDomain" NOT NULL,
    "estimated_level" DECIMAL NOT NULL,
    "confidence" DECIMAL NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "parent_assessments" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "baseline_profile_id" UUID NOT NULL UNIQUE,
    "parent_user_id" UUID NOT NULL,
    "parent_email" TEXT,
    "status" "ParentAssessmentStatus" NOT NULL DEFAULT 'PENDING'::"ParentAssessmentStatus",
    "assessment_type" "AssessmentType" NOT NULL DEFAULT 'STANDARD'::"AssessmentType",
    "support_level" DOUBLE PRECISION,
    "has_existing_iep" BOOLEAN NOT NULL DEFAULT FALSE,
    "has_existing_504" BOOLEAN NOT NULL DEFAULT FALSE,
    "disability_categories_json" JSONB,
    "current_services_json" JSONB,
    "assistive_technology_json" JSONB,
    "recommendations_json" JSONB,
    "responses_json" JSONB,
    "learning_style_notes" TEXT,
    "strengths_notes" TEXT,
    "challenges_notes" TEXT,
    "behavior_notes" TEXT,
    "enrolled_by_role" TEXT NOT NULL,
    "invited_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "baseline_iep_documents" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "baseline_profile_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "s3_key" TEXT NOT NULL,
    "status" "IepDocumentStatus" NOT NULL DEFAULT 'PENDING'::"IepDocumentStatus",
    "processing_error" TEXT,
    "extracted_text_json" JSONB,
    "extracted_goals_json" JSONB,
    "extracted_accommodations_json" JSONB,
    "extracted_services_json" JSONB,
    "extracted_metadata_json" JSONB,
    "uploaded_by_user_id" UUID NOT NULL,
    "uploaded_by_role" TEXT NOT NULL,
    "upload_notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "iep_comparisons" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "iep_document_id" UUID NOT NULL,
    "baseline_attempt_id" UUID NOT NULL,
    "summary_json" JSONB NOT NULL,
    "domain_comparisons_json" JSONB NOT NULL,
    "goal_alignment_json" JSONB NOT NULL,
    "discrepancies_json" JSONB,
    "recommendations_json" JSONB,
    "overall_match_score" DECIMAL NOT NULL,
    "confidence_level" DECIMAL NOT NULL,
    "decision" "IepComparisonDecision" NOT NULL DEFAULT 'PENDING'::"IepComparisonDecision",
    "decision_by_user_id" UUID,
    "decision_by_role" TEXT,
    "decision_notes" TEXT,
    "decision_at" TIMESTAMPTZ,
    "new_iep_generated" BOOLEAN NOT NULL DEFAULT FALSE,
    "generated_iep_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "baseline_profiles_tenantId_learnerId_key" ON "baseline_profiles" ("tenantId", "learnerId");

CREATE UNIQUE INDEX IF NOT EXISTS "baseline_attempts_baselineProfileId_attemptNumber_key" ON "baseline_attempts" ("baselineProfileId", "attemptNumber");

CREATE UNIQUE INDEX IF NOT EXISTS "baseline_items_baselineAttemptId_sequenceIndex_key" ON "baseline_items" ("baselineAttemptId", "sequenceIndex");

CREATE UNIQUE INDEX IF NOT EXISTS "baseline_responses_baselineItemId_learnerId_key" ON "baseline_responses" ("baselineItemId", "learnerId");

CREATE UNIQUE INDEX IF NOT EXISTS "baseline_skill_estimates_baselineAttemptId_skillCode_key" ON "baseline_skill_estimates" ("baselineAttemptId", "skillCode");

CREATE UNIQUE INDEX IF NOT EXISTS "iep_comparisons_iepDocumentId_baselineAttemptId_key" ON "iep_comparisons" ("iepDocumentId", "baselineAttemptId");