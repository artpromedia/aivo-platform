-- CreateEnum
CREATE TYPE "lti_platform_type" AS ENUM ('CANVAS', 'SCHOOLOGY', 'GOOGLE_CLASSROOM', 'BLACKBOARD', 'BRIGHTSPACE', 'MOODLE', 'GENERIC');

-- CreateEnum
CREATE TYPE "lti_user_role" AS ENUM ('INSTRUCTOR', 'LEARNER', 'TEACHING_ASSISTANT', 'CONTENT_DEVELOPER', 'ADMINISTRATOR', 'MENTOR');

-- CreateEnum
CREATE TYPE "lti_launch_status" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "lti_grade_status" AS ENUM ('PENDING', 'SENT', 'FAILED', 'NOT_APPLICABLE');

-- CreateTable
CREATE TABLE "lti_tools" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "platform_type" "lti_platform_type" NOT NULL,
    "platform_name" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "deployment_id" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "auth_login_url" TEXT NOT NULL,
    "auth_token_url" TEXT NOT NULL,
    "jwks_url" TEXT NOT NULL,
    "tool_private_key_ref" TEXT NOT NULL,
    "tool_public_key_id" TEXT,
    "line_items_url" TEXT,
    "memberships_url" TEXT,
    "deep_linking_url" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "lti_tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lti_links" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "lti_tool_id" UUID NOT NULL,
    "lms_context_id" TEXT,
    "lms_resource_link_id" TEXT,
    "classroom_id" UUID,
    "lo_version_id" UUID,
    "activity_template_id" UUID,
    "subject" TEXT,
    "grade_band" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "max_points" DECIMAL(10,2),
    "grading_enabled" BOOLEAN NOT NULL DEFAULT false,
    "line_item_id" TEXT,
    "config_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by_user_id" UUID NOT NULL,

    CONSTRAINT "lti_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lti_launches" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "lti_tool_id" UUID NOT NULL,
    "lti_link_id" UUID,
    "lms_user_id" TEXT NOT NULL,
    "lms_user_email" TEXT,
    "lms_user_name" TEXT,
    "user_role" "lti_user_role" NOT NULL,
    "aivo_user_id" UUID,
    "aivo_learner_id" UUID,
    "lms_context_id" TEXT,
    "lms_context_title" TEXT,
    "lms_resource_link_id" TEXT,
    "status" "lti_launch_status" NOT NULL DEFAULT 'PENDING',
    "nonce" TEXT NOT NULL,
    "state" TEXT,
    "aivo_session_id" UUID,
    "grade_status" "lti_grade_status" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "score_given" DECIMAL(10,4),
    "score_maximum" DECIMAL(10,4),
    "grade_sent_at" TIMESTAMPTZ,
    "grade_error" TEXT,
    "launch_params_json" JSONB NOT NULL,
    "launched_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "lti_launches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lti_nonces" (
    "id" UUID NOT NULL,
    "lti_tool_id" UUID NOT NULL,
    "nonce" TEXT NOT NULL,
    "used_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "lti_nonces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lti_user_mappings" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "lti_tool_id" UUID NOT NULL,
    "lms_user_id" TEXT NOT NULL,
    "aivo_user_id" UUID NOT NULL,
    "lms_email" TEXT,
    "lms_name" TEXT,
    "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "lti_user_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lti_tools_tenant_id_idx" ON "lti_tools"("tenant_id");

-- CreateIndex
CREATE INDEX "lti_tools_issuer_client_id_idx" ON "lti_tools"("issuer", "client_id");

-- CreateIndex
CREATE UNIQUE INDEX "lti_tools_tenant_id_issuer_client_id_deployment_id_key" ON "lti_tools"("tenant_id", "issuer", "client_id", "deployment_id");

-- CreateIndex
CREATE INDEX "lti_links_tenant_id_idx" ON "lti_links"("tenant_id");

-- CreateIndex
CREATE INDEX "lti_links_lti_tool_id_idx" ON "lti_links"("lti_tool_id");

-- CreateIndex
CREATE INDEX "lti_links_lms_context_id_lms_resource_link_id_idx" ON "lti_links"("lms_context_id", "lms_resource_link_id");

-- CreateIndex
CREATE UNIQUE INDEX "lti_launches_nonce_key" ON "lti_launches"("nonce");

-- CreateIndex
CREATE INDEX "lti_launches_tenant_id_idx" ON "lti_launches"("tenant_id");

-- CreateIndex
CREATE INDEX "lti_launches_lti_tool_id_idx" ON "lti_launches"("lti_tool_id");

-- CreateIndex
CREATE INDEX "lti_launches_lti_link_id_idx" ON "lti_launches"("lti_link_id");

-- CreateIndex
CREATE INDEX "lti_launches_lms_user_id_idx" ON "lti_launches"("lms_user_id");

-- CreateIndex
CREATE INDEX "lti_launches_aivo_user_id_idx" ON "lti_launches"("aivo_user_id");

-- CreateIndex
CREATE INDEX "lti_launches_aivo_session_id_idx" ON "lti_launches"("aivo_session_id");

-- CreateIndex
CREATE INDEX "lti_launches_status_expires_at_idx" ON "lti_launches"("status", "expires_at");

-- CreateIndex
CREATE INDEX "lti_nonces_expires_at_idx" ON "lti_nonces"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "lti_nonces_lti_tool_id_nonce_key" ON "lti_nonces"("lti_tool_id", "nonce");

-- CreateIndex
CREATE INDEX "lti_user_mappings_tenant_id_idx" ON "lti_user_mappings"("tenant_id");

-- CreateIndex
CREATE INDEX "lti_user_mappings_aivo_user_id_idx" ON "lti_user_mappings"("aivo_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "lti_user_mappings_lti_tool_id_lms_user_id_key" ON "lti_user_mappings"("lti_tool_id", "lms_user_id");

-- AddForeignKey
ALTER TABLE "lti_links" ADD CONSTRAINT "lti_links_lti_tool_id_fkey" FOREIGN KEY ("lti_tool_id") REFERENCES "lti_tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lti_launches" ADD CONSTRAINT "lti_launches_lti_tool_id_fkey" FOREIGN KEY ("lti_tool_id") REFERENCES "lti_tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lti_launches" ADD CONSTRAINT "lti_launches_lti_link_id_fkey" FOREIGN KEY ("lti_link_id") REFERENCES "lti_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lti_nonces" ADD CONSTRAINT "lti_nonces_lti_tool_id_fkey" FOREIGN KEY ("lti_tool_id") REFERENCES "lti_tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
