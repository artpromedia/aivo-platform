-- AlterTable
ALTER TABLE "lti_user_mappings" ADD COLUMN     "is_new_user" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lms_role" "lti_user_role";

-- CreateTable
CREATE TABLE "lti_grade_syncs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "lti_launch_id" UUID NOT NULL,
    "user_mapping_id" UUID NOT NULL,
    "line_item_id" TEXT NOT NULL,
    "score_given" DECIMAL(10,4) NOT NULL,
    "score_maximum" DECIMAL(10,4) NOT NULL,
    "activity_progress" TEXT NOT NULL,
    "grading_progress" TEXT NOT NULL,
    "comment" TEXT,
    "status" "lti_grade_status" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMPTZ,
    "error_message" TEXT,
    "http_status" INTEGER,
    "scored_at" TIMESTAMPTZ NOT NULL,
    "synced_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "lti_grade_syncs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lti_grade_syncs_tenant_id_idx" ON "lti_grade_syncs"("tenant_id");

-- CreateIndex
CREATE INDEX "lti_grade_syncs_lti_launch_id_idx" ON "lti_grade_syncs"("lti_launch_id");

-- CreateIndex
CREATE INDEX "lti_grade_syncs_user_mapping_id_idx" ON "lti_grade_syncs"("user_mapping_id");

-- CreateIndex
CREATE INDEX "lti_grade_syncs_status_attempt_count_idx" ON "lti_grade_syncs"("status", "attempt_count");

-- CreateIndex
CREATE INDEX "lti_user_mappings_lms_email_idx" ON "lti_user_mappings"("lms_email");

-- AddForeignKey
ALTER TABLE "lti_user_mappings" ADD CONSTRAINT "lti_user_mappings_lti_tool_id_fkey" FOREIGN KEY ("lti_tool_id") REFERENCES "lti_tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lti_grade_syncs" ADD CONSTRAINT "lti_grade_syncs_user_mapping_id_fkey" FOREIGN KEY ("user_mapping_id") REFERENCES "lti_user_mappings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
