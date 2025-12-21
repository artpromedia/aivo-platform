-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'PERMANENT_FAILURE');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'SANDBOX_ADMIN', 'SALES_DEMO', 'SUPPORT');

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactRole" TEXT,
    "status" "PartnerStatus" NOT NULL DEFAULT 'PENDING',
    "tier" TEXT NOT NULL DEFAULT 'free',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvalNotes" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_applications" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "integrationType" TEXT[],
    "useCase" TEXT NOT NULL,
    "expectedVolume" TEXT,
    "timeline" TEXT,
    "reviewNotes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sandbox_tenants" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tenantCode" TEXT NOT NULL,
    "webhookSecret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sandbox_tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sandbox_api_keys" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "scopes" TEXT[],
    "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sandbox_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sandbox_webhook_endpoints" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "eventTypes" TEXT[],
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sandbox_webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sandbox_webhook_deliveries" (
    "id" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sandbox_webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sandbox_synthetic_learners" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "metadataJson" JSONB,

    CONSTRAINT "sandbox_synthetic_learners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sandbox_synthetic_teachers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'teacher',

    CONSTRAINT "sandbox_synthetic_teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sandbox_synthetic_classes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "teacherId" TEXT,

    CONSTRAINT "sandbox_synthetic_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sandbox_synthetic_enrollments" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'student',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sandbox_synthetic_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sandbox_synthetic_learner_progress" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "skillDomain" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "masteryLevel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "lastPracticed" TIMESTAMP(3),
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sandbox_synthetic_learner_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sandbox_synthetic_sessions" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL,
    "skillDomain" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "questionsAttempted" INTEGER NOT NULL DEFAULT 0,
    "questionsCorrect" INTEGER NOT NULL DEFAULT 0,
    "accuracyPct" INTEGER,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "eventsJson" JSONB,

    CONSTRAINT "sandbox_synthetic_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sandbox_api_usage_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sandbox_api_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sandbox_admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "password_hash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'SANDBOX_ADMIN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" TEXT,
    "allowed_ips" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "last_login_at" TIMESTAMP(3),
    "password_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "password_reset_token" TEXT,
    "password_reset_expiry" TIMESTAMP(3),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "sandbox_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_login_attempts" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT,
    "email" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "fail_reason" TEXT,
    "mfa_used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "admin_email" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resource_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_password_history" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_password_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partners_contactEmail_key" ON "partners"("contactEmail");

-- CreateIndex
CREATE INDEX "partners_status_idx" ON "partners"("status");

-- CreateIndex
CREATE INDEX "partners_contactEmail_idx" ON "partners"("contactEmail");

-- CreateIndex
CREATE INDEX "partner_applications_partnerId_idx" ON "partner_applications"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "sandbox_tenants_tenantCode_key" ON "sandbox_tenants"("tenantCode");

-- CreateIndex
CREATE INDEX "sandbox_tenants_partnerId_idx" ON "sandbox_tenants"("partnerId");

-- CreateIndex
CREATE INDEX "sandbox_tenants_tenantCode_idx" ON "sandbox_tenants"("tenantCode");

-- CreateIndex
CREATE UNIQUE INDEX "sandbox_api_keys_keyHash_key" ON "sandbox_api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "sandbox_api_keys_tenantId_idx" ON "sandbox_api_keys"("tenantId");

-- CreateIndex
CREATE INDEX "sandbox_api_keys_keyHash_idx" ON "sandbox_api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "sandbox_api_keys_status_idx" ON "sandbox_api_keys"("status");

-- CreateIndex
CREATE INDEX "sandbox_webhook_endpoints_tenantId_idx" ON "sandbox_webhook_endpoints"("tenantId");

-- CreateIndex
CREATE INDEX "sandbox_webhook_deliveries_endpointId_idx" ON "sandbox_webhook_deliveries"("endpointId");

-- CreateIndex
CREATE INDEX "sandbox_webhook_deliveries_status_idx" ON "sandbox_webhook_deliveries"("status");

-- CreateIndex
CREATE INDEX "sandbox_synthetic_learners_tenantId_idx" ON "sandbox_synthetic_learners"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "sandbox_synthetic_learners_tenantId_externalId_key" ON "sandbox_synthetic_learners"("tenantId", "externalId");

-- CreateIndex
CREATE INDEX "sandbox_synthetic_teachers_tenantId_idx" ON "sandbox_synthetic_teachers"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "sandbox_synthetic_teachers_tenantId_externalId_key" ON "sandbox_synthetic_teachers"("tenantId", "externalId");

-- CreateIndex
CREATE INDEX "sandbox_synthetic_classes_tenantId_idx" ON "sandbox_synthetic_classes"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "sandbox_synthetic_classes_tenantId_externalId_key" ON "sandbox_synthetic_classes"("tenantId", "externalId");

-- CreateIndex
CREATE INDEX "sandbox_synthetic_enrollments_learnerId_idx" ON "sandbox_synthetic_enrollments"("learnerId");

-- CreateIndex
CREATE INDEX "sandbox_synthetic_enrollments_classId_idx" ON "sandbox_synthetic_enrollments"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "sandbox_synthetic_enrollments_learnerId_classId_key" ON "sandbox_synthetic_enrollments"("learnerId", "classId");

-- CreateIndex
CREATE INDEX "sandbox_synthetic_learner_progress_learnerId_idx" ON "sandbox_synthetic_learner_progress"("learnerId");

-- CreateIndex
CREATE UNIQUE INDEX "sandbox_synthetic_learner_progress_learnerId_skillId_key" ON "sandbox_synthetic_learner_progress"("learnerId", "skillId");

-- CreateIndex
CREATE INDEX "sandbox_synthetic_sessions_learnerId_idx" ON "sandbox_synthetic_sessions"("learnerId");

-- CreateIndex
CREATE INDEX "sandbox_synthetic_sessions_startedAt_idx" ON "sandbox_synthetic_sessions"("startedAt");

-- CreateIndex
CREATE INDEX "sandbox_api_usage_logs_tenantId_idx" ON "sandbox_api_usage_logs"("tenantId");

-- CreateIndex
CREATE INDEX "sandbox_api_usage_logs_apiKeyId_idx" ON "sandbox_api_usage_logs"("apiKeyId");

-- CreateIndex
CREATE INDEX "sandbox_api_usage_logs_createdAt_idx" ON "sandbox_api_usage_logs"("createdAt");

-- CreateIndex
CREATE INDEX "sandbox_api_usage_logs_endpoint_idx" ON "sandbox_api_usage_logs"("endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "sandbox_admins_email_key" ON "sandbox_admins"("email");

-- CreateIndex
CREATE INDEX "sandbox_admins_email_idx" ON "sandbox_admins"("email");

-- CreateIndex
CREATE INDEX "sandbox_admins_role_idx" ON "sandbox_admins"("role");

-- CreateIndex
CREATE INDEX "sandbox_admins_is_active_idx" ON "sandbox_admins"("is_active");

-- CreateIndex
CREATE INDEX "sandbox_admins_password_reset_token_idx" ON "sandbox_admins"("password_reset_token");

-- CreateIndex
CREATE UNIQUE INDEX "admin_sessions_token_key" ON "admin_sessions"("token");

-- CreateIndex
CREATE INDEX "admin_sessions_admin_id_idx" ON "admin_sessions"("admin_id");

-- CreateIndex
CREATE INDEX "admin_sessions_token_idx" ON "admin_sessions"("token");

-- CreateIndex
CREATE INDEX "admin_sessions_expires_at_idx" ON "admin_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "admin_login_attempts_admin_id_created_at_idx" ON "admin_login_attempts"("admin_id", "created_at");

-- CreateIndex
CREATE INDEX "admin_login_attempts_ip_address_created_at_idx" ON "admin_login_attempts"("ip_address", "created_at");

-- CreateIndex
CREATE INDEX "admin_login_attempts_email_created_at_idx" ON "admin_login_attempts"("email", "created_at");

-- CreateIndex
CREATE INDEX "admin_audit_logs_admin_id_created_at_idx" ON "admin_audit_logs"("admin_id", "created_at");

-- CreateIndex
CREATE INDEX "admin_audit_logs_action_idx" ON "admin_audit_logs"("action");

-- CreateIndex
CREATE INDEX "admin_audit_logs_resource_resource_id_idx" ON "admin_audit_logs"("resource", "resource_id");

-- CreateIndex
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "admin_password_history_admin_id_created_at_idx" ON "admin_password_history"("admin_id", "created_at");

-- AddForeignKey
ALTER TABLE "partner_applications" ADD CONSTRAINT "partner_applications_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sandbox_tenants" ADD CONSTRAINT "sandbox_tenants_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sandbox_api_keys" ADD CONSTRAINT "sandbox_api_keys_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "sandbox_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sandbox_webhook_endpoints" ADD CONSTRAINT "sandbox_webhook_endpoints_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "sandbox_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sandbox_webhook_deliveries" ADD CONSTRAINT "sandbox_webhook_deliveries_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "sandbox_webhook_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sandbox_synthetic_learners" ADD CONSTRAINT "sandbox_synthetic_learners_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "sandbox_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sandbox_synthetic_teachers" ADD CONSTRAINT "sandbox_synthetic_teachers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "sandbox_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sandbox_synthetic_classes" ADD CONSTRAINT "sandbox_synthetic_classes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "sandbox_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sandbox_synthetic_classes" ADD CONSTRAINT "sandbox_synthetic_classes_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "sandbox_synthetic_teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sandbox_synthetic_enrollments" ADD CONSTRAINT "sandbox_synthetic_enrollments_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "sandbox_synthetic_learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sandbox_synthetic_enrollments" ADD CONSTRAINT "sandbox_synthetic_enrollments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "sandbox_synthetic_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sandbox_synthetic_learner_progress" ADD CONSTRAINT "sandbox_synthetic_learner_progress_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "sandbox_synthetic_learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sandbox_synthetic_sessions" ADD CONSTRAINT "sandbox_synthetic_sessions_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "sandbox_synthetic_learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sandbox_api_usage_logs" ADD CONSTRAINT "sandbox_api_usage_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "sandbox_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sandbox_api_usage_logs" ADD CONSTRAINT "sandbox_api_usage_logs_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "sandbox_api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "sandbox_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_login_attempts" ADD CONSTRAINT "admin_login_attempts_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "sandbox_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "sandbox_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_password_history" ADD CONSTRAINT "admin_password_history_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "sandbox_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
